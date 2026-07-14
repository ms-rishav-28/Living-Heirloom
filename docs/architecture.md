# Living Heirloom — Architecture

Living Heirloom is local-first. Letters live in the writer's browser; exactly two
opt-in features touch the server: **delivery** (a sealed letter emailed on its unlock
date) and **voice** (letters read aloud). There are no user accounts anywhere.

```
React SPA (Vite, src/ → dist/) ──/api──▶ Express (server/)
                                          ├─ generate.ts   → any OpenAI-compatible model
                                          ├─ capsules.ts   → SQLite (WAL) + AES-256-GCM at rest
                                          ├─ delivery/     → node-cron + nodemailer (.eml outbox in dev)
                                          └─ voice/        → kokoro-js | Chatterbox sidecar | ElevenLabs
server/data/                              ← database, outbox, audio cache (gitignored)
```

In development the Vite dev server proxies `/api` to :3001. In production
(`npm run start`, `NODE_ENV=production`) the one Node process serves `dist/`
statically with an SPA fallback and the API together.

## API contract v1

```
GET  /api/health                          → 200 {ok:true}
POST /api/generate                        → {versions: string[]} — drafts from interview answers

POST /api/capsules
  body {title, recipientName?, recipientEmail?, content, tone, unlockAt?, deliver:boolean}
  → 201 {id, ownerToken, viewToken}       (raw tokens returned exactly once)
GET    /api/capsules/:id                  header X-Owner-Token → 200 {capsule} | 401 | 404
DELETE /api/capsules/:id                  header X-Owner-Token → 204 | 401 | 404
GET  /api/letters/:id?k=<viewToken>       → 200 {title, content, writtenAt}
                                          → 403 {opensAt} before unlockAt | 404

GET  /api/voice/voices                    → 200 {provider, voices:[{id,label,lang}]}
                                          → 200 {provider:"none", voices:[]} if unconfigured
POST /api/voice/synthesize                body {text<=6000, voiceId?}
                                          → 200 audio stream (audio/wav or audio/mpeg)
                                          → 503 {error} if no provider available
```

All capsule/letter endpoints answer `503 {error}` when `LH_ENCRYPTION_KEY` is unset —
delivery is a feature you switch on, not a requirement.

## Security model

- **No accounts.** A capsule returns two one-time tokens at creation: an owner token
  (manage/cancel) and a view token (the recipient's private link). Both are 32 random
  bytes, base64url, stored **hashed (sha256)**; the view token is additionally stored
  encrypted at rest so the mailer can build the delivery link.
- **Encryption at rest.** Letter content and recipient fields are AES-256-GCM
  encrypted per field (`base64(iv).base64(tag).base64(ciphertext)`), key from
  `LH_ENCRYPTION_KEY` (32-byte base64). Titles are plaintext by design (they appear
  in email subjects and owner listings).
- Rate limiting on capsule creation; zod validation on every body; unknown view
  tokens return 404 (not 401) so capsule existence is never revealed.

## Delivery

A node-cron tick every minute (plus a catch-up tick at startup) selects due capsules
(`deliver=1`, not yet delivered, `unlock_at <= now`, fewer than 5 attempts) and sends
via SMTP when `SMTP_HOST` is configured. Without SMTP, delivery writes `.eml` files
to `server/data/outbox/` — the documented development fallback. Failures record
`delivery_error` and retry on later ticks, up to 5 attempts.

## Voice

A single `TTSProvider` interface (`server/voice/provider.ts`) with three adapters;
selection order: explicit `TTS_PROVIDER` env → kokoro if its runtime loads → none.
Synthesized audio is cached by content hash in `server/data/audio/`. Engine details,
setup, and licensing: [voice.md](voice.md).

## Frontend layers

- `src/lib/capsules.ts` — the local letter store (localStorage), extended with
  optional `serverId`/`ownerToken`/`deliverTo` when a letter opted into delivery.
- `src/lib/api.ts` — the typed client for the contract above; components never see
  raw fetch errors.
- Design system: paper/ink/sealing-wax tokens in `src/index.css`; Fraunces
  (display), Newsreader (letter voice), Inter (interface), self-hosted via
  @fontsource latin subsets. Reduced-motion is honored globally.

## Environment variables

See `.env.example` — every variable is documented there with safe defaults.
