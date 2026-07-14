// Typed client for the locked API contract v1 (see docs/agents/README.md).
// Every function returns typed results and throws ApiError — raw fetch
// errors never reach components.

export class ApiError extends Error {
  /** HTTP status of the failed request; 0 when the server was unreachable. */
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface CreateCapsuleInput {
  title: string;
  recipientName?: string;
  recipientEmail?: string;
  content: string;
  tone: string;
  unlockAt?: string; // ISO date
  deliver: boolean;
}

export interface CreatedCapsule {
  id: string;
  ownerToken: string;
  viewToken: string;
}

export interface ServerCapsule {
  id: string;
  title: string;
  recipientName: string | null;
  recipientEmail: string | null;
  content: string;
  tone: string;
  createdAt: string;
  unlockAt: string | null;
  deliver: boolean;
  deliveredAt: string | null;
  deliveryError: string | null;
}

export type LetterResult =
  | { status: 'open'; title: string; content: string; writtenAt: string }
  | { status: 'sealed'; opensAt: string }
  | { status: 'missing' };

export interface Voice {
  id: string;
  label: string;
  lang: string;
}

export interface VoicesInfo {
  provider: string;
  voices: Voice[];
}

const BASE = '/api';

/** Contract limit for POST /api/voice/synthesize body text. */
const SYNTHESIZE_TEXT_LIMIT = 6000;

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${BASE}${path}`, init);
  } catch {
    throw new ApiError(0, 'The server is unreachable.');
  }
}

async function errorFrom(resp: Response): Promise<ApiError> {
  let message = `Request failed (${resp.status}).`;
  try {
    const body = await resp.json();
    if (body && typeof body.error === 'string') message = body.error;
  } catch {
    // Non-JSON error body — keep the generic message.
  }
  return new ApiError(resp.status, message);
}

async function parseJson<T>(resp: Response): Promise<T> {
  try {
    return (await resp.json()) as T;
  } catch {
    throw new ApiError(resp.status, 'The server returned an unreadable response.');
  }
}

export async function createCapsule(input: CreateCapsuleInput): Promise<CreatedCapsule> {
  const resp = await request('/capsules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (resp.status !== 201) throw await errorFrom(resp);
  return parseJson<CreatedCapsule>(resp);
}

export async function getServerCapsule(id: string, ownerToken: string): Promise<ServerCapsule> {
  const resp = await request(`/capsules/${encodeURIComponent(id)}`, {
    headers: { 'X-Owner-Token': ownerToken },
  });
  if (!resp.ok) throw await errorFrom(resp);
  const body = await parseJson<{ capsule: ServerCapsule }>(resp);
  return body.capsule;
}

export async function deleteServerCapsule(id: string, ownerToken: string): Promise<void> {
  const resp = await request(`/capsules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'X-Owner-Token': ownerToken },
  });
  if (resp.status !== 204) throw await errorFrom(resp);
}

/**
 * Fetch a letter by its private view link parts. The three recipient-facing
 * states are returned as data rather than thrown: 200 → open, 403 → sealed,
 * anything else (404, unconfigured server, bad token) → missing.
 */
export async function getLetter(id: string, viewToken: string): Promise<LetterResult> {
  const resp = await request(
    `/letters/${encodeURIComponent(id)}?k=${encodeURIComponent(viewToken)}`
  );
  if (resp.status === 200) {
    const body = await parseJson<{ title: string; content: string; writtenAt: string }>(resp);
    return { status: 'open', title: body.title, content: body.content, writtenAt: body.writtenAt };
  }
  if (resp.status === 403) {
    try {
      const body = await resp.json();
      if (body && typeof body.opensAt === 'string') {
        return { status: 'sealed', opensAt: body.opensAt };
      }
    } catch {
      // Fall through to missing.
    }
  }
  return { status: 'missing' };
}

export async function getVoices(): Promise<VoicesInfo> {
  const resp = await request('/voice/voices');
  if (!resp.ok) throw await errorFrom(resp);
  const body = await parseJson<VoicesInfo>(resp);
  if (!body || typeof body.provider !== 'string' || !Array.isArray(body.voices)) {
    throw new ApiError(resp.status, 'The server returned an unexpected response.');
  }
  return body;
}

export async function synthesize(text: string, voiceId?: string): Promise<Blob> {
  const clipped = text.slice(0, SYNTHESIZE_TEXT_LIMIT);
  const resp = await request('/voice/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(voiceId ? { text: clipped, voiceId } : { text: clipped }),
  });
  if (!resp.ok) throw await errorFrom(resp);
  try {
    return await resp.blob();
  } catch {
    throw new ApiError(0, 'The audio stream could not be read.');
  }
}
