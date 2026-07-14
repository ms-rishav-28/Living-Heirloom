import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { createChatterboxProvider } from './adapters/chatterbox';
import { createElevenLabsProvider } from './adapters/elevenlabs';
import { createKokoroProvider, kokoroModuleLoads } from './adapters/kokoro';
import { cacheKey, readCachedAudio, writeCachedAudio } from './cache';
import { VoiceNotFoundError } from './provider';
import type { TTSProvider } from './provider';

/**
 * Voice routes (API contract v1, locked):
 *
 * GET  /api/voice/voices      -> 200 {provider, voices:[{id,label,lang}]}
 *                             -> 200 {provider:"none", voices:[]} if unconfigured
 * POST /api/voice/synthesize  body {text<=6000, voiceId?}
 *                             -> 200 audio stream (audio/wav or audio/mpeg)
 *                             -> 503 {error} if no provider available
 *
 * Provider selection (resolved once, on first request): explicit TTS_PROVIDER
 * env -> else kokoro if the kokoro-js runtime loads -> else none.
 */

export const voiceRouter: Router = Router();

const NO_PROVIDER = {
  error: 'No text-to-speech provider is configured on this server.',
} as const;

const synthesizeSchema = z.object({
  text: z.string().min(1).max(6000),
  voiceId: z.string().trim().min(1).max(200).optional(),
});

let providerPromise: Promise<TTSProvider | null> | undefined;

async function selectProvider(): Promise<TTSProvider | null> {
  const requested = (process.env.TTS_PROVIDER ?? '').trim().toLowerCase();

  if (requested === 'none') return null;

  if (requested === 'kokoro' || requested === '') {
    if (await kokoroModuleLoads()) return createKokoroProvider();
    console.warn(
      requested === 'kokoro'
        ? '[voice] TTS_PROVIDER=kokoro but the kokoro-js runtime failed to load; voice is disabled.'
        : '[voice] kokoro-js runtime failed to load and no other TTS_PROVIDER is set; voice is disabled.',
    );
    return null;
  }

  if (requested === 'elevenlabs') {
    const provider = createElevenLabsProvider();
    if (!provider) {
      console.warn('[voice] TTS_PROVIDER=elevenlabs but ELEVENLABS_API_KEY is not set; voice is disabled.');
    }
    return provider;
  }

  if (requested === 'chatterbox') {
    const provider = createChatterboxProvider();
    if (!provider) {
      console.warn('[voice] TTS_PROVIDER=chatterbox but CHATTERBOX_URL is not set; voice is disabled.');
    }
    return provider;
  }

  console.warn(`[voice] Unknown TTS_PROVIDER "${requested}"; voice is disabled.`);
  return null;
}

function getProvider(): Promise<TTSProvider | null> {
  providerPromise ??= selectProvider();
  return providerPromise;
}

voiceRouter.get('/api/voice/voices', async (_req: Request, res: Response) => {
  try {
    const provider = await getProvider();
    if (!provider) return res.json({ provider: 'none', voices: [] });
    res.json({ provider: provider.name, voices: await provider.voices() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list voices' });
  }
});

voiceRouter.post('/api/voice/synthesize', async (req: Request, res: Response) => {
  try {
    const provider = await getProvider();
    if (!provider) return res.status(503).json(NO_PROVIDER);

    const parsed = synthesizeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', issues: parsed.error.issues });
    }
    const { text, voiceId } = parsed.data;

    const key = cacheKey(provider.name, text, voiceId ?? '');
    const cached = await readCachedAudio(key);
    if (cached) {
      console.log(`[voice] cache hit ${key.slice(0, 12)} (${provider.name})`);
      res.setHeader('X-Voice-Cache', 'hit');
      return res.type(cached.mime).send(cached.audio);
    }

    const startedAt = Date.now();
    const { audio, mime } = await provider.synthesize(text, voiceId);
    console.log(
      `[voice] cache miss ${key.slice(0, 12)}: synthesized ${audio.length} bytes via ${provider.name} in ${Date.now() - startedAt} ms`,
    );
    await writeCachedAudio(key, audio, mime);
    res.setHeader('X-Voice-Cache', 'miss');
    res.type(mime).send(audio);
  } catch (err) {
    if (err instanceof VoiceNotFoundError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : 'Synthesis failed' });
  }
});
