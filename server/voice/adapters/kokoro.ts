import type { KokoroTTS } from 'kokoro-js';
import type { TTSProvider, Voice } from '../provider';
import { VoiceNotFoundError } from '../provider';

/**
 * Local-first default engine: Kokoro-82M running in-process through the
 * kokoro-js ONNX port (Apache-2.0). No Python, no GPU, no cloud account.
 *
 * The model (~92 MB at the default q8 quantization) is downloaded from
 * Hugging Face on first use and cached by transformers.js under
 * node_modules/@huggingface/transformers/.cache/; after that it runs offline.
 *
 * kokoro-js's generate() tokenizes with truncation (~510 phoneme tokens), so a
 * full letter would be silently cut off. We instead run its sentence-splitting
 * stream() and concatenate the per-sentence audio into one WAV.
 */

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const DEFAULT_VOICE = 'af_heart';

const DTYPES = ['fp32', 'fp16', 'q8', 'q4', 'q4f16'] as const;
type KokoroDtype = (typeof DTYPES)[number];

type KokoroModule = typeof import('kokoro-js');

let modulePromise: Promise<KokoroModule> | undefined;
let ttsPromise: Promise<KokoroTTS> | undefined;

function loadModule(): Promise<KokoroModule> {
  modulePromise ??= import('kokoro-js');
  return modulePromise;
}

/** True when the kokoro-js runtime (incl. its native onnxruntime binding) imports cleanly. */
export async function kokoroModuleLoads(): Promise<boolean> {
  try {
    await loadModule();
    return true;
  } catch (err) {
    console.warn(
      `[voice] kokoro-js failed to load: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

function resolveDtype(): KokoroDtype {
  const raw = (process.env.KOKORO_DTYPE ?? '').trim() as KokoroDtype;
  return DTYPES.includes(raw) ? raw : 'q8';
}

function loadTts(): Promise<KokoroTTS> {
  if (!ttsPromise) {
    ttsPromise = (async () => {
      const mod = await loadModule();
      const dtype = resolveDtype();
      const startedAt = Date.now();
      const tts = await mod.KokoroTTS.from_pretrained(MODEL_ID, { dtype, device: 'cpu' });
      console.log(`[voice] kokoro model ready in ${Date.now() - startedAt} ms (dtype=${dtype})`);
      return tts;
    })();
    // Allow a retry on the next request instead of caching the failure forever.
    ttsPromise.catch(() => {
      ttsPromise = undefined;
    });
  }
  return ttsPromise;
}

async function voices(): Promise<Voice[]> {
  const tts = await loadTts();
  return Object.entries(tts.voices).map(([id, meta]) => ({
    id,
    label: `${meta.name} (${meta.gender})`,
    lang: meta.language,
  }));
}

function encodeWavPcm16(chunks: Float32Array[], sampleRate: number): Buffer {
  const totalSamples = chunks.reduce((n, c) => n + c.length, 0);
  const data = Buffer.alloc(totalSamples * 2);
  let offset = 0;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      const sample = Math.max(-1, Math.min(1, chunk[i]));
      data.writeInt16LE(Math.round(sample * 32767), offset);
      offset += 2;
    }
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

async function synthesize(
  text: string,
  voiceId?: string,
): Promise<{ audio: Buffer; mime: string }> {
  const requested = voiceId ?? DEFAULT_VOICE;
  const [mod, tts] = await Promise.all([loadModule(), loadTts()]);

  if (!(requested in tts.voices)) {
    throw new VoiceNotFoundError(
      `Unknown voice id "${requested}". GET /api/voice/voices lists the available voices.`,
    );
  }
  const voice = requested as keyof KokoroTTS['voices'];

  const splitter = new mod.TextSplitterStream();
  splitter.push(text);
  splitter.close();

  const chunks: Float32Array[] = [];
  let sampleRate = 24000;
  for await (const { audio } of tts.stream(splitter, { voice })) {
    chunks.push(audio.audio);
    sampleRate = audio.sampling_rate;
  }
  if (chunks.length === 0) {
    throw new Error('Kokoro produced no audio for this text.');
  }
  return { audio: encodeWavPcm16(chunks, sampleRate), mime: 'audio/wav' };
}

export function createKokoroProvider(): TTSProvider {
  return { name: 'kokoro', voices, synthesize };
}
