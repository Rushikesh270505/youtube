from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import podcast_voice_engine
import runtime_paths
import voice_service


APP_RESOURCE_DIR = runtime_paths.app_resource_dir()
STATIC_DIR = APP_RESOURCE_DIR / "app-resources" if (APP_RESOURCE_DIR / "app-resources").exists() else APP_RESOURCE_DIR
BGM_PLAYLIST_DIR = STATIC_DIR / "bgm"
BGM_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a"}
SERVER_HOST = os.environ.get("CRYPTO_LIVE_HOST", "127.0.0.1")
SERVER_PORT = int(os.environ.get("CRYPTO_LIVE_PORT", "4173"))
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


class VoiceAssignmentUpdateRequest(BaseModel):
  role: str
  voice_name: str


def list_bgm_tracks() -> List[Path]:
  if not BGM_PLAYLIST_DIR.exists() or not BGM_PLAYLIST_DIR.is_dir():
    return []
  return sorted(
    [
      path for path in BGM_PLAYLIST_DIR.iterdir()
      if path.is_file() and path.suffix.lower() in BGM_AUDIO_EXTENSIONS
    ],
    key=lambda path: path.name.lower(),
  )


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


@app.get("/api/voice-catalog")
def voice_catalog() -> Dict[str, Any]:
  return voice_service.voice_catalog_payload()


@app.get("/api/voice-assignments")
def voice_assignments() -> Dict[str, Any]:
  return voice_service.get_voice_assignments()


@app.post("/api/voice-assignments")
def update_voice_assignment(request: VoiceAssignmentUpdateRequest) -> Dict[str, Any]:
  try:
    return voice_service.update_voice_assignment(request.role, request.voice_name)
  except ValueError as error:
    raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/api/bgm-playlist")
def bgm_playlist() -> Dict[str, Any]:
  tracks = list_bgm_tracks()
  return {
    "ok": True,
    "count": len(tracks),
    "tracks": [
      {
        "name": track.name,
        "url": f"/api/bgm/{track.name}",
      }
      for track in tracks
    ],
  }


@app.get("/api/bgm/{track_name:path}")
def bgm_audio(track_name: str) -> FileResponse:
  candidate = (BGM_PLAYLIST_DIR / track_name).resolve()
  try:
    candidate.relative_to(BGM_PLAYLIST_DIR.resolve())
  except ValueError as error:
    raise HTTPException(status_code=404, detail="BGM track not found") from error
  if not candidate.exists() or not candidate.is_file() or candidate.suffix.lower() not in BGM_AUDIO_EXTENSIONS:
    raise HTTPException(status_code=404, detail="BGM track not found")
  media_type = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
  }.get(candidate.suffix.lower(), "application/octet-stream")
  return FileResponse(candidate, media_type=media_type)


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


app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


if __name__ == "__main__":
  uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT, reload=False)
