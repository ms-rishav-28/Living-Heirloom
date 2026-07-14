/**
 * Provider-agnostic TTS layer (Agent Brief 02, locked design).
 *
 * Every engine (kokoro, elevenlabs, chatterbox) is exposed through this one
 * interface; the router never talks to an engine directly.
 */

export interface Voice {
  id: string;
  label: string;
  lang: string;
}

export interface TTSProvider {
  name: string;
  voices(): Promise<Voice[]>;
  synthesize(text: string, voiceId?: string): Promise<{ audio: Buffer; mime: string }>;
}

/** Thrown by adapters when the requested voice id does not exist (mapped to 400). */
export class VoiceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceNotFoundError';
  }
}
