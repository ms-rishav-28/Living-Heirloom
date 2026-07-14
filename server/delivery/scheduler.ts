import cron from 'node-cron';
import { decryptField, encryptionAvailable } from '../crypto';
import { getDueCapsules, markDelivered, recordDeliveryFailure } from '../db';
import { sendDeliveryEmail } from './mailer';

/**
 * Delivery scheduler: every minute, find capsules that are due
 * (deliver=1, not yet delivered, unlock_at <= now, fewer than MAX_ATTEMPTS
 * failed attempts) and send their letters. Failures are recorded on the row
 * and retried on the next tick; after MAX_ATTEMPTS the capsule is left alone
 * with its last delivery_error intact.
 */

const MAX_ATTEMPTS = 5;

let ticking = false;

export async function runDeliveryTick(): Promise<void> {
  if (!encryptionAvailable()) return;
  if (ticking) return; // don't overlap slow ticks
  ticking = true;
  try {
    const due = getDueCapsules(new Date().toISOString(), MAX_ATTEMPTS);
    for (const row of due) {
      try {
        if (!row.recipient_email_enc) throw new Error('Capsule has no recipient email');
        if (!row.view_token_enc) throw new Error('Capsule has no stored view token');
        await sendDeliveryEmail({
          capsuleId: row.id,
          recipientEmail: decryptField(row.recipient_email_enc),
          viewToken: decryptField(row.view_token_enc),
        });
        markDelivered(row.id, new Date().toISOString());
        console.log(`[delivery] capsule ${row.id} delivered`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown delivery error';
        recordDeliveryFailure(row.id, message);
        const attempt = row.delivery_attempts + 1;
        console.error(
          `[delivery] capsule ${row.id} failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${message}`
        );
      }
    }
  } finally {
    ticking = false;
  }
}

export function startDeliveryScheduler(): void {
  if (!encryptionAvailable()) {
    console.warn('[delivery] scheduler idle — LH_ENCRYPTION_KEY is not configured');
    return;
  }
  cron.schedule('* * * * *', () => {
    void runDeliveryTick();
  });
  // Catch anything that came due while the server was down.
  void runDeliveryTick();
  console.log('[delivery] scheduler started (every minute)');
}
