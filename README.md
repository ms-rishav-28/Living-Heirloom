# Living Heirloom

A writing companion for letters that wait. Living Heirloom interviews you — five
gentle questions — then drafts a letter from your answers in three voices, using a
language model **you run on your own machine**. Letters can be kept in your browser,
heard aloud, or sealed with an opening date and delivered by email when that day
arrives. No accounts. No subscription. Private by default.

## Quick start (development)

Requirements: Node 20+ (developed on Node 24) and an OpenAI-compatible model server
(Ollama, LM Studio, vLLM, …) for drafting.

```sh
npm install
copy .env.example .env       # then set at least OPENAI_BASE_URL / MODEL
npm run dev:all              # frontend on :8080, API on :3001 (proxied at /api)
```

Without a model server the app still runs; the drafting step shows an honest
"writer is offline" screen with instructions.

## Running the full product

```sh
npm run build                # builds the frontend into dist/
npm run start                # one process serves the app + API on :3001
```

Feature configuration (all in `.env`, see `.env.example` for every option):

- **Drafting** — `OPENAI_BASE_URL`, `MODEL`, optional `OPENAI_API_KEY`.
- **Delivery** (sealed letters emailed on their unlock date) — requires
  `LH_ENCRYPTION_KEY` (generate:
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
  Letters bound for delivery are stored in SQLite **encrypted at rest**
  (AES-256-GCM); recipients get a private tokenized view link. With SMTP unset,
  delivery writes `.eml` files to `server/data/outbox/` — useful in development.
- **Voice** — letters read aloud. Works out of the box via the local Kokoro engine
  (Apache-2.0, CPU, ~92 MB model downloaded on first use). Optional: Chatterbox
  sidecar for cloned-voice reading (MIT), or ElevenLabs with your own API key.
  Details and licensing: [docs/voice.md](docs/voice.md).

## Docker

```sh
copy .env.example .env       # configure first
docker compose up --build    # app on :3001, data in the heirloom-data volume
```

An optional Chatterbox sidecar service is sketched in `docker-compose.yml`
(commented out; GPU recommended).

## Verifying an instance

```sh
npm run smoke                # health, capsule lifecycle, voice, SPA serving
```

## Architecture

Full details — API contract, security model, delivery, and voice — live in
[docs/architecture.md](docs/architecture.md).

```
React SPA (Vite, dist/) ──/api──▶ Express (server/)
                                   ├─ generate.ts   → your OpenAI-compatible model
                                   ├─ capsules.ts   → SQLite (WAL) + AES-256-GCM at rest
                                   ├─ delivery/     → node-cron + nodemailer (or .eml outbox)
                                   └─ voice/        → kokoro-js | Chatterbox sidecar | ElevenLabs
```

- Letters kept only locally never leave the browser (localStorage).
- Delivery-bound letters are the only server-stored data: content and recipient
  fields encrypted at rest, access via hashed one-time tokens, no user accounts.
- Design system: paper/ink/sealing-wax, Fraunces + Newsreader + Inter (self-hosted).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | frontend only (Vite, :8080) |
| `npm run dev:server` | API only (tsx watch, :3001) |
| `npm run dev:all` | both |
| `npm run build` | production frontend build |
| `npm run start` | serve app + API from one process (production) |
| `npm run smoke` | smoke-test a running server |
| `npm run lint` | ESLint |

## Voice engine licensing

| Engine | License | Notes |
|---|---|---|
| Kokoro-82M via kokoro-js | Apache 2.0 | default, local, preset voices |
| Chatterbox (Resemble AI) | MIT | optional sidecar, voice cloning |
| ElevenLabs | Proprietary API | optional, bring your own key |
