import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { outboxDir } from '../db';

/**
 * Outbound mail. When SMTP env vars are set, sends through nodemailer SMTP.
 * When SMTP is unset, writes a .eml file to server/data/outbox/ — this is the
 * documented dev fallback, not an error.
 */

export interface DeliveryEmail {
  capsuleId: string;
  recipientEmail: string;
  viewToken: string;
}

function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

function fromAddress(): string {
  return process.env.SMTP_FROM || process.env.SMTP_USER || 'Living Heirloom <no-reply@localhost>';
}

/** Email copy is fixed by the product brief — do not edit. */
function buildMessage({ capsuleId, recipientEmail, viewToken }: DeliveryEmail): {
  from: string;
  to: string;
  subject: string;
  text: string;
} {
  const link = `${appBaseUrl()}/letter/${capsuleId}?k=${viewToken}`;
  return {
    from: fromAddress(),
    to: recipientEmail,
    subject: 'A letter has been waiting for you',
    text:
      `Someone wrote you a letter with Living Heirloom and asked for it to reach you today. Read it here: ${link}\n` +
      `This link is private — treat it like the letter itself.`,
  };
}

async function sendViaSmtp(email: DeliveryEmail): Promise<void> {
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const options: SMTPTransport.Options = {
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    ...(process.env.SMTP_USER
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
      : {}),
  };
  const transporter = nodemailer.createTransport(options);
  await transporter.sendMail(buildMessage(email));
}

async function writeToOutbox(email: DeliveryEmail): Promise<void> {
  const transporter = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'unix',
  });
  const info = await transporter.sendMail(buildMessage(email));
  const raw = Buffer.isBuffer(info.message)
    ? info.message
    : Buffer.from(String(info.message), 'utf8');

  mkdirSync(outboxDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(outboxDir, `${stamp}-${email.capsuleId}.eml`);
  writeFileSync(filePath, raw);
  console.log(`[mailer] SMTP not configured — wrote ${filePath} (dev fallback)`);
}

/** Send a delivery email; throws on failure so the scheduler can record it. */
export async function sendDeliveryEmail(email: DeliveryEmail): Promise<void> {
  if (smtpConfigured()) {
    await sendViaSmtp(email);
  } else {
    await writeToOutbox(email);
  }
}
