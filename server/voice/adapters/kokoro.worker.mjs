// Kokoro synthesis worker. Model loading and CPU-bound inference happen here,
// off the API server's event loop — a full letter can take minutes on CPU and
// must never stall health checks, capsule requests, or the delivery scheduler.
// Plain .mjs so the same file runs under tsx (dev), npm run start, and Docker.
import { parentPort } from 'node:worker_threads';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const DEFAULT_VOICE = 'af_heart';
const DTYPES = ['fp32', 'fp16', 'q8', 'q4', 'q4f16'];

let modulePromise;
let ttsPromise;

function loadModule() {
  modulePromise ??= import('kokoro-js');
  return modulePromise;
}

function resolveDtype() {
  const raw = (process.env.KOKORO_DTYPE ?? '').trim();
  return DTYPES.includes(raw) ? raw : 'q8';
}

function loadTts() {
  if (!ttsPromise) {
    ttsPromise = (async () => {
      const mod = await loadModule();
      const dtype = resolveDtype();
      const startedAt = Date.now();
      const tts = await mod.KokoroTTS.from_pretrained(MODEL_ID, { dtype, device: 'cpu' });
      console.log(
        `[voice] kokoro model ready in ${Date.now() - startedAt} ms (dtype=${dtype}, worker thread)`
      );
      return tts;
    })();
    // Allow a retry on the next request instead of caching the failure forever.
    ttsPromise.catch(() => {
      ttsPromise = undefined;
    });
  }
  return ttsPromise;
}

function encodeWavPcm16(chunks, sampleRate) {
  const totalSamples = chunks.reduce((n, c) => n + c.length, 0);
  const buf = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buf);
  const ascii = (offset, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  view.setUint32(40, totalSamples * 2, true);
  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      const sample = Math.max(-1, Math.min(1, chunk[i]));
      view.setInt16(offset, Math.round(sample * 32767), true);
      offset += 2;
    }
  }
  return buf;
}

parentPort.on('message', async (msg) => {
  const { id, op } = msg;
  try {
    if (op === 'voices') {
      const tts = await loadTts();
      const voices = Object.entries(tts.voices).map(([voiceId, meta]) => ({
        id: voiceId,
        label: `${meta.name} (${meta.gender})`,
        lang: meta.language,
      }));
      parentPort.postMessage({ id, ok: true, voices });
      return;
    }

    if (op === 'synthesize') {
      const [mod, tts] = await Promise.all([loadModule(), loadTts()]);
      const voice = msg.voiceId ?? DEFAULT_VOICE;
      if (!(voice in tts.voices)) {
        parentPort.postMessage({
          id,
          ok: false,
          code: 'VOICE_NOT_FOUND',
          error: `Unknown voice id "${voice}". GET /api/voice/voices lists the available voices.`,
        });
        return;
      }

      // generate() truncates at ~510 phoneme tokens; stream() sentence-splits,
      // so long letters synthesize in chunks that we concatenate into one WAV.
      const splitter = new mod.TextSplitterStream();
      splitter.push(msg.text);
      splitter.close();

      const chunks = [];
      let sampleRate = 24000;
      for await (const { audio } of tts.stream(splitter, { voice })) {
        chunks.push(audio.audio);
        sampleRate = audio.sampling_rate;
      }
      if (chunks.length === 0) throw new Error('Kokoro produced no audio for this text.');

      const wav = encodeWavPcm16(chunks, sampleRate);
      parentPort.postMessage({ id, ok: true, wav }, [wav]);
      return;
    }

    parentPort.postMessage({ id, ok: false, error: `Unknown op "${op}"` });
  } catch (err) {
    parentPort.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
