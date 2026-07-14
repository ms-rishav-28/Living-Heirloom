import { Router } from 'express';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  decryptField,
  encryptField,
  encryptionAvailable,
  generateToken,
  hashToken,
  tokenMatchesHash,
} from './crypto';
import { deleteCapsule, getCapsule, insertCapsule } from './db';
import type { CapsuleRow } from './db';

/**
 * Capsule + letter routes (API contract v1, locked):
 *
 * POST   /api/capsules            → 201 {id, ownerToken, viewToken}
 * GET    /api/capsules/:id        header X-Owner-Token → 200 {capsule} | 401/404
 * DELETE /api/capsules/:id        header X-Owner-Token → 204 | 401/404
 * GET    /api/letters/:id?k=...   → 200 {title, content, writtenAt}
 *                                 → 403 {opensAt} before unlockAt | 404
 */

export const capsulesRouter: Router = Router();

const NOT_CONFIGURED = { error: 'Delivery is not configured on this server.' } as const;

function requireEncryption(res: Response): boolean {
  if (!encryptionAvailable()) {
    res.status(503).json(NOT_CONFIGURED);
    return false;
  }
  return true;
}

const createCapsuleSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    recipientName: z.string().trim().min(1).max(200).optional(),
    recipientEmail: z.string().trim().email().max(320).optional(),
    content: z.string().min(1).max(50_000),
    tone: z.string().trim().min(1).max(40).default('warm'),
    unlockAt: z
      .string()
      .datetime({ offset: true })
      .optional(),
    deliver: z.boolean(),
  })
  .superRefine((body, ctx) => {
    if (body.deliver && !body.recipientEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipientEmail'],
        message: 'recipientEmail is required when deliver is true',
      });
    }
    if (body.deliver && !body.unlockAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['unlockAt'],
        message: 'unlockAt is required when deliver is true',
      });
    }
  });

const createLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again shortly.' },
});

capsulesRouter.post('/api/capsules', createLimiter, (req: Request, res: Response) => {
  if (!requireEncryption(res)) return;

  const parsed = createCapsuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', issues: parsed.error.issues });
  }
  const body = parsed.data;

  const id = randomUUID();
  const ownerToken = generateToken();
  const viewToken = generateToken();

  insertCapsule({
    id,
    ownerTokenHash: hashToken(ownerToken),
    viewTokenHash: hashToken(viewToken),
    title: body.title,
    recipientNameEnc: body.recipientName ? encryptField(body.recipientName) : null,
    recipientEmailEnc: body.recipientEmail ? encryptField(body.recipientEmail) : null,
    contentEnc: encryptField(body.content),
    tone: body.tone,
    createdAt: new Date().toISOString(),
    unlockAt: body.unlockAt ? new Date(body.unlockAt).toISOString() : null,
    deliver: body.deliver,
    viewTokenEnc: encryptField(viewToken),
  });

  res.status(201).json({ id, ownerToken, viewToken });
});

function authorizeOwner(req: Request, res: Response): CapsuleRow | undefined {
  const row = getCapsule(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return undefined;
  }
  const token = req.header('X-Owner-Token');
  if (!token || !tokenMatchesHash(token, row.owner_token_hash)) {
    res.status(401).json({ error: 'Unauthorized' });
    return undefined;
  }
  return row;
}

capsulesRouter.get('/api/capsules/:id', (req: Request, res: Response) => {
  if (!requireEncryption(res)) return;
  const row = authorizeOwner(req, res);
  if (!row) return;

  res.json({
    capsule: {
      id: row.id,
      title: row.title,
      recipientName: row.recipient_name_enc ? decryptField(row.recipient_name_enc) : null,
      recipientEmail: row.recipient_email_enc ? decryptField(row.recipient_email_enc) : null,
      content: decryptField(row.content_enc),
      tone: row.tone,
      createdAt: row.created_at,
      unlockAt: row.unlock_at,
      deliver: row.deliver === 1,
      deliveredAt: row.delivered_at,
      deliveryError: row.delivery_error,
    },
  });
});

capsulesRouter.delete('/api/capsules/:id', (req: Request, res: Response) => {
  if (!requireEncryption(res)) return;
  const row = authorizeOwner(req, res);
  if (!row) return;

  deleteCapsule(row.id);
  res.status(204).end();
});

capsulesRouter.get('/api/letters/:id', (req: Request, res: Response) => {
  if (!requireEncryption(res)) return;

  const row = getCapsule(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const key = typeof req.query.k === 'string' ? req.query.k : '';
  if (!key || !tokenMatchesHash(key, row.view_token_hash)) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (row.unlock_at && row.unlock_at > new Date().toISOString()) {
    return res.status(403).json({ opensAt: row.unlock_at });
  }

  res.json({
    title: row.title,
    content: decryptField(row.content_enc),
    writtenAt: row.created_at,
  });
});
