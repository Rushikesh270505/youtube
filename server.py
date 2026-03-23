from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import podcast_voice_engine
import voice_service


BASE_DIR = Path(__file__).resolve().parent
app = FastAPI(title="Crypto Live Stream Overlay")


class CommentaryRenderRequest(BaseModel):
  mode: str
  coin: Dict[str, Any] = Field(default_factory=dict)
  displayed_interval: Optional[str] = None
  lead_interval: Optional[str] = None
  summary: Dict[str, Any] = Field(default_factory=dict)
  news_items: List[Dict[str, Any]] = Field(default_factory=list)
  event: Dict[str, Any] = Field(default_factory=dict)
  voice_pack_ids: List[str] = Field(default_factory=list)


class PodcastRenderRequest(BaseModel):
  mode: str = "intermission_full"
  coin: Dict[str, Any] = Field(default_factory=dict)
  displayed_interval: Optional[str] = None
  lead_interval: Optional[str] = None
  live_context: Dict[str, Any] = Field(default_factory=dict)
  timeframes: Any = Field(default_factory=dict)
  timeframe_analyses: Any = Field(default_factory=dict)
  news_items: List[Dict[str, Any]] = Field(default_factory=list)
  news: List[Dict[str, Any]] = Field(default_factory=list)
  event: Dict[str, Any] = Field(default_factory=dict)
  voice_pack_ids: List[str] = Field(default_factory=list)
  model_id: Optional[str] = None
  output_format: Optional[str] = None
  low_latency: bool = False


@app.get("/api/health")
def health() -> Dict[str, Any]:
  voice_catalog = voice_service.list_voice_statuses()
  return {
    "ok": True,
    "service": "crypto-live-stream-overlay",
    "voice": {
      "cast_ready": voice_catalog["cast_ready"],
      "voices": voice_catalog["voices"],
    },
  }


@app.get("/api/voices")
def voices() -> Dict[str, Any]:
  return voice_service.list_voice_statuses()


@app.get("/api/podcast/config")
def podcast_config() -> Dict[str, Any]:
  return podcast_voice_engine.get_podcast_voice_status()


@app.post("/api/commentary/render")
def render_commentary(request: CommentaryRenderRequest) -> Dict[str, Any]:
  try:
    return voice_service.render_commentary_response(request.model_dump())
  except ValueError as error:
    raise HTTPException(status_code=400, detail=str(error)) from error
  except Exception as error:
    raise HTTPException(status_code=500, detail=f"Commentary render failed: {error}") from error


@app.post("/api/podcast/render")
def render_podcast(request: PodcastRenderRequest) -> Dict[str, Any]:
  try:
    podcast_voice_engine.cleanup_podcast_cache()
    return podcast_voice_engine.render_podcast_response(request.model_dump())
  except ValueError as error:
    raise HTTPException(status_code=400, detail=str(error)) from error
  except Exception as error:
    raise HTTPException(status_code=500, detail=f"Podcast render failed: {error}") from error


@app.get("/api/audio/{session_id}/{clip_id}.wav")
def commentary_audio(session_id: str, clip_id: str) -> FileResponse:
  audio_path = voice_service.audio_file_path(session_id, clip_id)
  if not audio_path.exists():
    raise HTTPException(status_code=404, detail="Audio clip not found")
  return FileResponse(audio_path, media_type="audio/wav")


@app.get("/api/podcast/audio/{session_id}/{filename}")
def podcast_audio(session_id: str, filename: str) -> FileResponse:
  audio_path = podcast_voice_engine.podcast_audio_file_path(session_id, filename)
  if not audio_path.exists():
    raise HTTPException(status_code=404, detail="Podcast audio not found")
  media_type = "audio/wav" if audio_path.suffix.lower() == ".wav" else "application/octet-stream"
  return FileResponse(audio_path, media_type=media_type)


app.mount("/", StaticFiles(directory=str(BASE_DIR), html=True), name="static")


if __name__ == "__main__":
  uvicorn.run("server:app", host="127.0.0.1", port=4173, reload=False)
