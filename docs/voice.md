# Voice — hearing a letter aloud

Living Heirloom can read letters aloud. The voice layer is provider-based and
**local-first**: the default engine runs on your own machine with no cloud account,
matching the rest of the product.

## What works out of the box

With no configuration, the server tries **Kokoro-82M** through the
[`kokoro-js`](https://www.npmjs.com/package/kokoro-js) ONNX runtime (Apache-2.0):

- Runs in-process in Node — no Python, no GPU required.
- On the first synthesis the model (~92 MB, q8 quantization) is downloaded from
  Hugging Face (`onnx-community/Kokoro-82M-v1.0-ONNX`) and cached locally; after
  that it works offline.
- Preset voices only (50+ across several languages) — Kokoro cannot clone a voice.
- Synthesized audio is cached in `server/data/audio/`, so replaying a letter is
  instant.
- Model loading and synthesis run in a dedicated worker thread
  (`server/voice/adapters/kokoro.worker.mjs`), not on the API server's main
  thread. A full letter can take a minute or more on CPU; without the worker
  that would freeze every other request — health checks, capsule reads, the
  delivery scheduler's cron tick — for the whole duration. Each synthesis
  request has a 4-minute timeout, and the worker is respawned automatically if
  it crashes.

The frontend shows a **Listen** button wherever a letter appears (the recipient's
letter page, the library's read dialog, the draft preview). If no provider is
available the button simply never renders.

## Environment variables

```
TTS_PROVIDER=kokoro | chatterbox | elevenlabs | none   # default: kokoro if loadable, else none
KOKORO_DTYPE=q8                                        # fp32 | fp16 | q8 | q4 | q4f16
ELEVENLABS_API_KEY=...                                 # required for elevenlabs
CHATTERBOX_URL=http://localhost:8004                   # required for chatterbox
```

## Letters in your own voice — Chatterbox sidecar (optional)

[Chatterbox](https://github.com/resemble-ai/chatterbox) (Resemble AI, **MIT license —
commercial use OK**) does zero-shot voice cloning from a few seconds of reference
audio. It is a Python model and is shipped here as an optional sidecar:

```
cd server/voice/sidecar
python -m venv .venv && .venv\Scripts\activate    # Windows
pip install -r requirements.txt                    # installs torch — large download
python chatterbox_server.py                        # serves /synthesize and /clone
```

Then set `TTS_PROVIDER=chatterbox` and `CHATTERBOX_URL=http://localhost:8004`.

Honest hardware expectation: Chatterbox is comfortable on a CUDA GPU; on CPU it runs
but generation is slow (expect well over real-time). We have not benchmarked it on
this machine — treat any speed numbers you read elsewhere as unverified here.

## ElevenLabs (optional, bring your own key)

Set `TTS_PROVIDER=elevenlabs` and `ELEVENLABS_API_KEY`. The adapter uses ElevenLabs'
REST API for voice listing and synthesis. Notes: the free tier is limited and voice
cloning requires a paid plan; the key is read from the environment and never logged.

Two optional overrides, rarely needed: `ELEVENLABS_BASE_URL` (default
`https://api.elevenlabs.io`) and `ELEVENLABS_MODEL_ID` (default
`eleven_multilingual_v2`).

## Licensing

| Engine | License | Cloning | Where it runs |
|---|---|---|---|
| Kokoro-82M (`kokoro-js`) | Apache 2.0 | No | In-process, CPU |
| Chatterbox | MIT | Yes | Python sidecar, GPU preferred |
| ElevenLabs | Proprietary (paid API) | Yes (paid tiers) | ElevenLabs cloud |

If you ship this product commercially, Kokoro and Chatterbox impose no licensing
fees. ElevenLabs is governed by their terms and pricing.
