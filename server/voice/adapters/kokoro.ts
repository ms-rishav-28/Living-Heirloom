import { Worker } from 'node:worker_threads';
import type { TTSProvider, Voice } from '../provider';
import { VoiceNotFoundError } from '../provider';

/**
 * Local-first default engine: Kokoro-82M through the kokoro-js ONNX port
 * (Apache-2.0). No Python, no GPU, no cloud account.
 *
 * All model loading and inference run in a dedicated worker thread
 * (kokoro.worker.mjs): CPU synthesis of a full letter can take minutes, and
 * on the main thread it would freeze every API request and the delivery
 * scheduler for that whole time.
 *
 * The model (~92 MB at the default q8 quantization) is downloaded from
 * Hugging Face on first use and cached by transformers.js; after that it
 * runs offline.
 */

const DEFAULT_VOICE = 'af_heart';
const REQUEST_TIMEOUT_MS = 240_000;

let modulePromise: Promise<unknown> | undefined;

/** True when the kokoro-js runtime (incl. its onnx backend) imports cleanly. */
export async function kokoroModuleLoads(): Promise<boolean> {
  try {
    modulePromise ??= import('kokoro-js');
    await modulePromise;
    return true;
  } catch (err) {
    console.warn(
      `[voice] kokoro-js failed to load: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

type WorkerReply =
  | { id: number; ok: true; voices?: Voice[]; wav?: ArrayBuffer }
  | { id: number; ok: false; error: string; code?: string };

interface PendingRequest {
  resolve: (reply: WorkerReply) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

let worker: Worker | undefined;
let nextRequestId = 1;
const pending = new Map<number, PendingRequest>();

function failAllPending(err: Error): void {
  for (const entry of pending.values()) {
    clearTimeout(entry.timer);
    entry.reject(err);
  }
  pending.clear();
  worker = undefined; // respawn on the next request
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./kokoro.worker.mjs', import.meta.url));
    // Never keep the server process alive just for the idle worker.
    worker.unref();
    worker.on('message', (reply: WorkerReply) => {
      const entry = pending.get(reply.id);
      if (!entry) return; // timed out earlier
      pending.delete(reply.id);
      clearTimeout(entry.timer);
      entry.resolve(reply);
    });
    worker.on('error', (err) =>
      failAllPending(err instanceof Error ? err : new Error(String(err))),
    );
    worker.on('exit', (code) => {
      if (code !== 0) failAllPending(new Error(`kokoro worker exited with code ${code}`));
    });
  }
  return worker;
}

function callWorker(message: Record<string, unknown>): Promise<WorkerReply> {
  const id = nextRequestId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('Kokoro timed out — the letter may be very long for this machine.'));
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    getWorker().postMessage({ ...message, id });
  });
}

async function voices(): Promise<Voice[]> {
  const reply = await callWorker({ op: 'voices' });
  if (!reply.ok) throw new Error(reply.error);
  return reply.voices ?? [];
}

async function synthesize(
  text: string,
  voiceId?: string,
): Promise<{ audio: Buffer; mime: string }> {
  const reply = await callWorker({
    op: 'synthesize',
    text,
    voiceId: voiceId ?? DEFAULT_VOICE,
  });
  if (!reply.ok) {
    if (reply.code === 'VOICE_NOT_FOUND') throw new VoiceNotFoundError(reply.error);
    throw new Error(reply.error);
  }
  if (!reply.wav) throw new Error('Kokoro worker returned no audio.');
  return { audio: Buffer.from(reply.wav), mime: 'audio/wav' };
}

export function createKokoroProvider(): TTSProvider {
  return { name: 'kokoro', voices, synthesize };
}
