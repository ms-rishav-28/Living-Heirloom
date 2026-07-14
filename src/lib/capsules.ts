// Local capsule store. Letters live in the browser until the backend pass
// adds real persistence; this module is the single seam to swap later.

export interface Capsule {
  id: string;
  title: string;
  recipient: string;
  content: string;
  tone: string;
  createdAt: string; // ISO date
  unlockAt?: string; // ISO date — letter is "sealed" until then
  // Present only when the writer opted into delivery and the server accepted:
  serverId?: string; // server-side capsule id
  ownerToken?: string; // one-time owner token (manage/cancel; never shown again)
  deliverTo?: string; // recipient email the letter will be delivered to
}

const STORAGE_KEY = 'lh_capsules';
export const ANSWERS_KEY = 'tc_answers';

export function loadCapsules(): Capsule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCapsule(capsule: Capsule): void {
  const all = loadCapsules();
  const idx = all.findIndex((c) => c.id === capsule.id);
  if (idx >= 0) all[idx] = capsule;
  else all.unshift(capsule);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function deleteCapsule(id: string): void {
  const remaining = loadCapsules().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
}

export function isSealed(capsule: Capsule): boolean {
  return !!capsule.unlockAt && new Date(capsule.unlockAt).getTime() > Date.now();
}

export function loadAnswers(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(ANSWERS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function newCapsuleId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
