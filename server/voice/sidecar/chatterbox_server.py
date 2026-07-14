"""Minimal FastAPI sidecar around Resemble AI's Chatterbox TTS (MIT license).

This is the optional "letters in your own voice" engine for Living Heirloom.
It is NOT started by the Node server; run it yourself on a machine with a
GPU (CPU works, but generation is much slower), then point the app at it:

    pip install -r requirements.txt
    uvicorn chatterbox_server:app --host 127.0.0.1 --port 8123

    # in the Living Heirloom server environment:
    TTS_PROVIDER=chatterbox
    CHATTERBOX_URL=http://127.0.0.1:8123

Endpoints (the /synthesize shape is locked by the API contract):
    POST /synthesize {text, voice_id}          -> WAV bytes
    POST /clone      multipart: sample, name?  -> {"voice_id": ...}
    GET  /voices                               -> {"voices": [{id,label,lang}]}
"""

from __future__ import annotations

import io
import re
import uuid
from pathlib import Path
from typing import Optional

import torch
import torchaudio
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from chatterbox.tts import ChatterboxTTS

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
VOICES_DIR = Path(__file__).parent / "voices"
VOICES_DIR.mkdir(exist_ok=True)

# Chatterbox is tuned for utterance-length inputs, so long letters are split
# into sentence groups of at most this many characters and concatenated.
MAX_CHUNK_CHARS = 400

app = FastAPI(title="Living Heirloom Chatterbox sidecar")

_model: Optional[ChatterboxTTS] = None


def get_model() -> ChatterboxTTS:
    global _model
    if _model is None:
        _model = ChatterboxTTS.from_pretrained(device=DEVICE)
    return _model


def chunk_text(text: str) -> list[str]:
    sentences = re.split(r"(?<=[.!?…])\s+", text.strip())
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if not sentence:
            continue
        if current and len(current) + 1 + len(sentence) > MAX_CHUNK_CHARS:
            chunks.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
        # A single sentence longer than the limit is passed through as-is;
        # Chatterbox will do its best with it.
    if current:
        chunks.append(current)
    return chunks or [text.strip()]


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=6000)
    voice_id: Optional[str] = None


@app.get("/voices")
def voices() -> dict:
    out = [{"id": "default", "label": "Chatterbox default voice", "lang": "en"}]
    for f in sorted(VOICES_DIR.glob("*.wav")):
        out.append({"id": f.stem, "label": f"Cloned voice: {f.stem}", "lang": "en"})
    return {"voices": out}


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest) -> Response:
    model = get_model()

    kwargs = {}
    if req.voice_id and req.voice_id != "default":
        ref = VOICES_DIR / f"{req.voice_id}.wav"
        if not ref.exists():
            raise HTTPException(status_code=404, detail=f"Unknown voice_id: {req.voice_id}")
        kwargs["audio_prompt_path"] = str(ref)

    pieces = []
    for chunk in chunk_text(req.text):
        with torch.inference_mode():
            pieces.append(model.generate(chunk, **kwargs))
    wav = torch.cat(pieces, dim=-1)

    buf = io.BytesIO()
    torchaudio.save(buf, wav.cpu(), model.sr, format="wav")
    return Response(content=buf.getvalue(), media_type="audio/wav")


@app.post("/clone")
async def clone(sample: UploadFile = File(...), name: Optional[str] = Form(None)) -> dict:
    """Register a reference recording (~5-10 s of clean speech, WAV preferred).

    The sample is stored under voices/<voice_id>.wav and can then be used as
    the voice_id in /synthesize.
    """
    raw = await sample.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty upload.")

    try:
        waveform, sample_rate = torchaudio.load(io.BytesIO(raw))
    except Exception as exc:  # torchaudio raises backend-specific errors
        raise HTTPException(
            status_code=400,
            detail="Could not decode the audio sample. Upload a short WAV recording.",
        ) from exc

    voice_id = re.sub(r"[^a-zA-Z0-9_-]", "", name or "") or uuid.uuid4().hex[:8]
    dest = VOICES_DIR / f"{voice_id}.wav"
    torchaudio.save(str(dest), waveform, sample_rate, format="wav")
    return {"voice_id": voice_id}
