import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * sha256-keyed audio cache under server/data/audio/ (gitignored).
 *
 * File name: sha256 over the (provider, voice, text) triple plus an extension
 * derived from the mime type. The provider name is part of the key so the same
 * text and voice id never collide across engines; the extension lets a cache
 * hit be served with the correct Content-Type without a metadata sidecar file.
 */

const voiceDir = path.dirname(fileURLToPath(import.meta.url));
export const audioCacheDir = path.join(voiceDir, '..', 'data', 'audio');
mkdirSync(audioCacheDir, { recursive: true });

const EXTENSIONS: ReadonlyArray<readonly [mime: string, ext: string]> = [
  ['audio/wav', 'wav'],
  ['audio/mpeg', 'mp3'],
];

export function cacheKey(provider: string, text: string, voiceId: string): string {
  const material = JSON.stringify([provider, voiceId, text]);
  return createHash('sha256').update(material, 'utf8').digest('hex');
}

export async function readCachedAudio(
  key: string,
): Promise<{ audio: Buffer; mime: string } | undefined> {
  for (const [mime, ext] of EXTENSIONS) {
    try {
      const audio = await readFile(path.join(audioCacheDir, `${key}.${ext}`));
      return { audio, mime };
    } catch {
      // Not cached under this extension; try the next known one.
    }
  }
  return undefined;
}

export async function writeCachedAudio(key: string, audio: Buffer, mime: string): Promise<void> {
  const ext = EXTENSIONS.find(([m]) => m === mime)?.[1];
  // Unknown container: serve the response without caching rather than storing
  // bytes we could not identify again on a later read.
  if (!ext) return;
  await writeFile(path.join(audioCacheDir, `${key}.${ext}`), audio);
}
