import type { TTSProvider, Voice } from '../provider';

/**
 * Adapter for the optional Chatterbox sidecar (resemble-ai/chatterbox, MIT) —
 * the "letters in your own voice" engine. The sidecar is a separate Python
 * process (see server/voice/sidecar/) reached via CHATTERBOX_URL; when that
 * env var is unset the factory returns null and the provider does not exist.
 *
 * Locked sidecar shape: POST /synthesize {text, voice_id} -> WAV bytes.
 * Our bundled sidecar additionally serves GET /voices (default + cloned
 * voices); if a sidecar lacks that endpoint we fall back to the one voice
 * every sidecar has, "default".
 */

const FALLBACK_VOICES: Voice[] = [{ id: 'default', label: 'Chatterbox default voice', lang: 'en' }];

export function createChatterboxProvider(): TTSProvider | null {
  const raw = process.env.CHATTERBOX_URL?.trim();
  if (!raw) return null;
  const baseUrl = raw.replace(/\/+$/, '');

  async function voices(): Promise<Voice[]> {
    let resp: Response;
    try {
      resp = await fetch(`${baseUrl}/voices`);
    } catch {
      throw new Error(
        'Chatterbox sidecar is unreachable. Check CHATTERBOX_URL and that the sidecar is running.',
      );
    }
    if (!resp.ok) return FALLBACK_VOICES;
    const data = (await resp.json().catch(() => null)) as { voices?: unknown } | null;
    if (!data || !Array.isArray(data.voices)) return FALLBACK_VOICES;
    const list = data.voices
      .filter((v): v is { id: string; label?: unknown; lang?: unknown } => {
        return typeof v === 'object' && v !== null && typeof (v as { id?: unknown }).id === 'string';
      })
      .map((v) => ({
        id: v.id,
        label: typeof v.label === 'string' ? v.label : v.id,
        lang: typeof v.lang === 'string' ? v.lang : 'en',
      }));
    return list.length > 0 ? list : FALLBACK_VOICES;
  }

  async function synthesize(
    text: string,
    voiceId?: string,
  ): Promise<{ audio: Buffer; mime: string }> {
    let resp: Response;
    try {
      resp = await fetch(`${baseUrl}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id: voiceId ?? 'default' }),
      });
    } catch {
      throw new Error(
        'Chatterbox sidecar is unreachable. Check CHATTERBOX_URL and that the sidecar is running.',
      );
    }
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      throw new Error(
        `Chatterbox synthesis failed with status ${resp.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`,
      );
    }
    const mime = resp.headers.get('content-type')?.split(';')[0] || 'audio/wav';
    return { audio: Buffer.from(await resp.arrayBuffer()), mime };
  }

  return { name: 'chatterbox', voices, synthesize };
}
