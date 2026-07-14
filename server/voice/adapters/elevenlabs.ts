import type { TTSProvider, Voice } from '../provider';

/**
 * Thin adapter over the ElevenLabs REST API (proprietary, hosted, paid tiers).
 * Only available when ELEVENLABS_API_KEY is set; when it is unset the factory
 * returns null and the provider simply does not exist (not an error).
 *
 * The API key is sent only as the xi-api-key request header. It is never
 * logged and never included in error messages.
 */

const DEFAULT_BASE_URL = 'https://api.elevenlabs.io';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

interface ElevenLabsVoicesResponse {
  voices?: Array<{
    voice_id: string;
    name: string;
    labels?: Record<string, string | undefined>;
  }>;
}

export function createElevenLabsProvider(): TTSProvider | null {
  const maybeKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!maybeKey) return null;
  // Hoisted function declarations below can't see the guard's narrowing.
  const apiKey: string = maybeKey;

  const baseUrl = (process.env.ELEVENLABS_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID;

  async function voices(): Promise<Voice[]> {
    const resp = await fetch(`${baseUrl}/v1/voices`, { headers: { 'xi-api-key': apiKey } });
    if (!resp.ok) {
      throw new Error(`ElevenLabs voice list request failed with status ${resp.status}`);
    }
    const data = (await resp.json()) as ElevenLabsVoicesResponse;
    return (data.voices ?? []).map((v) => ({
      id: v.voice_id,
      label: v.name,
      // ElevenLabs voice labels only sometimes carry a language tag.
      lang: v.labels?.language ?? 'en',
    }));
  }

  async function synthesize(
    text: string,
    voiceId?: string,
  ): Promise<{ audio: Buffer; mime: string }> {
    let voice = voiceId;
    if (!voice) {
      const available = await voices();
      if (available.length === 0) {
        throw new Error('ElevenLabs returned no voices for this account.');
      }
      voice = available[0].id;
    }
    const resp = await fetch(`${baseUrl}/v1/text-to-speech/${encodeURIComponent(voice)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({ text, model_id: modelId }),
    });
    if (!resp.ok) {
      // The response body may carry diagnostic detail; it never contains the key.
      const detail = await resp.text().catch(() => '');
      throw new Error(
        `ElevenLabs synthesis failed with status ${resp.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`,
      );
    }
    const mime = resp.headers.get('content-type')?.split(';')[0] || 'audio/mpeg';
    return { audio: Buffer.from(await resp.arrayBuffer()), mime };
  }

  return { name: 'elevenlabs', voices, synthesize };
}
