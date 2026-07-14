import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * SQLite storage. Lives at server/data/heirloom.db (gitignored), WAL mode,
 * schema managed through a PRAGMA user_version migration ladder.
 */

const serverDir = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = path.join(serverDir, 'data');
export const outboxDir = path.join(dataDir, 'outbox');
const dbPath = path.join(dataDir, 'heirloom.db');

mkdirSync(dataDir, { recursive: true });

export const db: Database.Database = new Database(dbPath);
db.pragma('journal_mode = WAL');

function migrate(): void {
  const version = db.pragma('user_version', { simple: true }) as number;
  if (version < 1) {
    db.exec(`
      CREATE TABLE capsules (
        id TEXT PRIMARY KEY,
        owner_token_hash TEXT NOT NULL,
        view_token_hash  TEXT NOT NULL,
        title TEXT NOT NULL,
        recipient_name_enc  TEXT,
        recipient_email_enc TEXT,
        content_enc TEXT NOT NULL,
        tone TEXT NOT NULL DEFAULT 'warm',
        created_at TEXT NOT NULL,
        unlock_at TEXT,
        deliver INTEGER NOT NULL DEFAULT 0,
        delivered_at TEXT,
        delivery_error TEXT,
        view_token_enc TEXT,
        delivery_attempts INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_capsules_due ON capsules (deliver, delivered_at, unlock_at);
    `);
    db.pragma('user_version = 1');
  }
}

migrate();

export interface CapsuleRow {
  id: string;
  owner_token_hash: string;
  view_token_hash: string;
  title: string;
  recipient_name_enc: string | null;
  recipient_email_enc: string | null;
  content_enc: string;
  tone: string;
  created_at: string;
  unlock_at: string | null;
  deliver: number;
  delivered_at: string | null;
  delivery_error: string | null;
  view_token_enc: string | null;
  delivery_attempts: number;
}

export interface NewCapsule {
  id: string;
  ownerTokenHash: string;
  viewTokenHash: string;
  title: string;
  recipientNameEnc: string | null;
  recipientEmailEnc: string | null;
  contentEnc: string;
  tone: string;
  createdAt: string;
  unlockAt: string | null;
  deliver: boolean;
  viewTokenEnc: string;
}

const insertStmt = db.prepare(`
  INSERT INTO capsules (
    id, owner_token_hash, view_token_hash, title,
    recipient_name_enc, recipient_email_enc, content_enc, tone,
    created_at, unlock_at, deliver, view_token_enc
  ) VALUES (
    @id, @ownerTokenHash, @viewTokenHash, @title,
    @recipientNameEnc, @recipientEmailEnc, @contentEnc, @tone,
    @createdAt, @unlockAt, @deliver, @viewTokenEnc
  )
`);

const selectStmt = db.prepare('SELECT * FROM capsules WHERE id = ?');
const deleteStmt = db.prepare('DELETE FROM capsules WHERE id = ?');

const selectDueStmt = db.prepare(`
  SELECT * FROM capsules
  WHERE deliver = 1
    AND delivered_at IS NULL
    AND delivery_attempts < @maxAttempts
    AND unlock_at IS NOT NULL
    AND unlock_at <= @now
`);

const markDeliveredStmt = db.prepare(`
  UPDATE capsules SET delivered_at = @deliveredAt, delivery_error = NULL WHERE id = @id
`);

const recordFailureStmt = db.prepare(`
  UPDATE capsules
  SET delivery_error = @error, delivery_attempts = delivery_attempts + 1
  WHERE id = @id
`);

export function insertCapsule(capsule: NewCapsule): void {
  insertStmt.run({ ...capsule, deliver: capsule.deliver ? 1 : 0 });
}

export function getCapsule(id: string): CapsuleRow | undefined {
  return selectStmt.get(id) as CapsuleRow | undefined;
}

export function deleteCapsule(id: string): boolean {
  return deleteStmt.run(id).changes > 0;
}

export function getDueCapsules(nowIso: string, maxAttempts: number): CapsuleRow[] {
  return selectDueStmt.all({ now: nowIso, maxAttempts }) as CapsuleRow[];
}

export function markDelivered(id: string, deliveredAtIso: string): void {
  markDeliveredStmt.run({ id, deliveredAt: deliveredAtIso });
}

export function recordDeliveryFailure(id: string, error: string): void {
  recordFailureStmt.run({ id, error });
}
