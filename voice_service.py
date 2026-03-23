from __future__ import annotations

import contextlib
import hashlib
import html
import json
import re
import shutil
import subprocess
import tempfile
import time
import uuid
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional


BASE_DIR = Path(__file__).resolve().parent
VOICE_MANIFEST_PATH = BASE_DIR / "voice_packs" / "hosts.json"
AUDIO_CACHE_ROOT = Path(tempfile.gettempdir()) / "crypto_overlay_voice_cache"
SESSION_ROOT = AUDIO_CACHE_ROOT / "sessions"
CLIP_CACHE_ROOT = AUDIO_CACHE_ROOT / "clip_cache"
DEFAULT_VOICE_PACK_IDS = ["neutral_analyst", "high_energy_host", "calm_educator"]
INTERMISSION_SUMMARY_MIN_MS = 5000
INTERMISSION_SUMMARY_MAX_MS = 7000
INTERMISSION_NEWS_MIN_MS = 6000
INTERMISSION_NEWS_MAX_MS = 8000
DEFAULT_CLIP_PAUSE_MS = 220

SESSION_ROOT.mkdir(parents=True, exist_ok=True)
CLIP_CACHE_ROOT.mkdir(parents=True, exist_ok=True)

_SAY_VOICE_CACHE: Optional[set[str]] = None

ROLE_FALLBACK_VOICE_MAP = {
  "neutral_analyst": ["Aman (English (India))", "Daniel (English (UK))", "Eddy (English (US))", "Albert", "Grandpa (English (US))"],
  "high_energy_host": ["Eddy (English (US))", "Daniel (English (UK))", "Fred", "Albert", "Aman (English (India))"],
  "calm_educator": ["Flo (English (US))", "Grandma (English (US))", "Karen", "Moira", "Tara"],
}


@dataclass
class VoicePack:
  id: str
  display_name: str
  role: str
  podcast_role: str
  engine: str
  model_path: str
  speaker_id: Optional[int]
  speed: float
  gain: float
  pause_ms: int
  subtitle_color: str
  optional: bool
  fallback_system_voice: str
  say_rate: int


def strip_html(value: str) -> str:
  text = re.sub(r"<[^>]+>", " ", value or "")
  return html.unescape(re.sub(r"\s+", " ", text)).strip()


def clamp(value: float, minimum: float, maximum: float) -> float:
  return max(minimum, min(maximum, value))


def load_voice_manifest() -> Dict[str, Any]:
  if not VOICE_MANIFEST_PATH.exists():
    return {"default_voice_pack_ids": DEFAULT_VOICE_PACK_IDS, "voices": []}
  return json.loads(VOICE_MANIFEST_PATH.read_text(encoding="utf-8"))


def load_voice_packs() -> Dict[str, VoicePack]:
  manifest = load_voice_manifest()
  voices = {}
  for entry in manifest.get("voices", []):
    pack = VoicePack(
      id=entry["id"],
      display_name=entry.get("display_name", entry["id"]),
      role=entry.get("role", entry["id"]),
      podcast_role=entry.get("podcast_role", ""),
      engine=entry.get("engine", "piper"),
      model_path=entry.get("model_path", ""),
      speaker_id=entry.get("speaker_id"),
      speed=float(entry.get("speed", 1.0)),
      gain=float(entry.get("gain", 1.0)),
      pause_ms=int(entry.get("pause_ms", 220)),
      subtitle_color=entry.get("subtitle_color", "#ffd58b"),
      optional=bool(entry.get("optional", False)),
      fallback_system_voice=entry.get("fallback_system_voice", ""),
      say_rate=int(entry.get("say_rate", 190)),
    )
    voices[pack.id] = pack
  return voices


def available_say_voices() -> set[str]:
  global _SAY_VOICE_CACHE
  if _SAY_VOICE_CACHE is not None:
    return _SAY_VOICE_CACHE

  voices: set[str] = set()
  say_binary = shutil.which("say")
  if not say_binary:
    _SAY_VOICE_CACHE = voices
    return voices

  result = subprocess.run(
    [say_binary, "-v", "?"],
    check=False,
    capture_output=True,
    text=True,
  )
  for line in result.stdout.splitlines():
    match = re.match(r"^(.+?)\s+[a-z]{2}_[A-Z]{2}\s+#", line)
    if match:
      voices.add(match.group(1).strip())

  _SAY_VOICE_CACHE = voices
  return voices


def pick_system_fallback_voice(pack: VoicePack) -> Optional[str]:
  say_voices = available_say_voices()
  if pack.fallback_system_voice and pack.fallback_system_voice in say_voices:
    return pack.fallback_system_voice

  for candidate in ROLE_FALLBACK_VOICE_MAP.get(pack.id, []):
    if candidate in say_voices:
      return candidate

  return next(iter(sorted(say_voices)), None)


def resolve_voice_runtime(pack: VoicePack) -> Dict[str, Any]:
  piper_binary = shutil.which("piper")
  model_path = (BASE_DIR / pack.model_path).resolve() if pack.model_path else None
  if pack.engine == "piper" and piper_binary and model_path and model_path.exists():
    return {
      "available": True,
      "engine": "piper",
      "status": "ready",
      "pack": pack,
      "binary": piper_binary,
      "model_path": model_path,
    }

  say_voice = pick_system_fallback_voice(pack)
  if say_voice:
    return {
      "available": True,
      "engine": "say",
      "status": "fallback",
      "pack": pack,
      "binary": shutil.which("say"),
      "say_voice": say_voice,
    }

  return {
    "available": False,
    "engine": "none",
    "status": "missing",
    "pack": pack,
    "reason": "Missing Piper model and no local system-voice fallback",
  }


def active_voice_label(pack: VoicePack, runtime: Dict[str, Any]) -> str:
  if runtime.get("engine") == "say" and runtime.get("say_voice"):
    return str(runtime["say_voice"])
  return pack.display_name


def list_voice_statuses() -> Dict[str, Any]:
  manifest = load_voice_manifest()
  voices = load_voice_packs()
  statuses = []
  for voice_id in manifest.get("default_voice_pack_ids", DEFAULT_VOICE_PACK_IDS):
    pack = voices.get(voice_id)
    if not pack:
      continue
    runtime = resolve_voice_runtime(pack)
    statuses.append(
      {
        "id": pack.id,
        "display_name": pack.display_name,
        "active_voice_label": active_voice_label(pack, runtime),
        "role": pack.role,
        "podcast_role": pack.podcast_role,
        "subtitle_color": pack.subtitle_color,
        "available": runtime["available"],
        "engine": runtime["engine"],
        "status": runtime["status"],
        "optional": pack.optional,
      }
    )

  cast_ready = all(status["available"] or status["optional"] for status in statuses) and bool(statuses)
  return {
    "default_voice_pack_ids": manifest.get("default_voice_pack_ids", DEFAULT_VOICE_PACK_IDS),
    "voices": statuses,
    "cast_ready": cast_ready,
  }


def cleanup_audio_cache(max_age_seconds: int = 6 * 60 * 60) -> None:
  cutoff = time.time() - max_age_seconds
  for root in (SESSION_ROOT, CLIP_CACHE_ROOT):
    if not root.exists():
      continue
    for entry in root.iterdir():
      with contextlib.suppress(FileNotFoundError):
        if entry.stat().st_mtime >= cutoff:
          continue
        if entry.is_dir():
          shutil.rmtree(entry, ignore_errors=True)
        else:
          entry.unlink(missing_ok=True)


def hash_clip_key(pack: VoicePack, runtime: Dict[str, Any], text: str) -> str:
  key = "|".join(
    [
      pack.id,
      runtime["engine"],
      str(runtime.get("model_path", "")),
      runtime.get("say_voice", ""),
      text,
      str(pack.speed),
      str(pack.say_rate),
      str(pack.pause_ms),
    ]
  )
  return hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]


def audio_duration_ms(audio_path: Path) -> int:
  with contextlib.closing(wave.open(str(audio_path), "rb")) as wav_file:
    frame_rate = wav_file.getframerate() or 22050
    frame_count = wav_file.getnframes() or 1
    return int((frame_count / frame_rate) * 1000)


def synthesize_with_say(pack: VoicePack, runtime: Dict[str, Any], text: str, output_path: Path) -> None:
  say_binary = runtime.get("binary") or shutil.which("say")
  say_voice = runtime.get("say_voice") or pack.fallback_system_voice
  afconvert_binary = shutil.which("afconvert")
  if not say_binary or not say_voice or not afconvert_binary:
    raise RuntimeError("macOS say fallback is not available")

  intermediate_path = output_path.with_suffix(".aiff")
  subprocess.run(
    [
      say_binary,
      "-v",
      say_voice,
      "-r",
      str(pack.say_rate),
      "-o",
      str(intermediate_path),
      text,
    ],
    check=True,
    capture_output=True,
    text=True,
  )
  subprocess.run(
    [
      afconvert_binary,
      "-f",
      "WAVE",
      "-d",
      "LEI16@22050",
      str(intermediate_path),
      str(output_path),
    ],
    check=True,
    capture_output=True,
    text=True,
  )
  intermediate_path.unlink(missing_ok=True)


def synthesize_with_piper(pack: VoicePack, runtime: Dict[str, Any], text: str, output_path: Path) -> None:
  piper_binary = runtime.get("binary") or shutil.which("piper")
  model_path = runtime.get("model_path")
  if not piper_binary or not model_path:
    raise RuntimeError("Piper is not available for this pack")

  command = [
    piper_binary,
    "--model",
    str(model_path),
    "--output_file",
    str(output_path),
  ]
  if pack.speaker_id is not None:
    command.extend(["--speaker", str(pack.speaker_id)])
  if pack.speed > 0:
    command.extend(["--length_scale", str(1 / pack.speed)])

  subprocess.run(
    command,
    input=text.encode("utf-8"),
    check=True,
    capture_output=True,
  )


def ensure_clip_audio(pack: VoicePack, runtime: Dict[str, Any], text: str, session_dir: Path, clip_id: str) -> Path:
  cache_key = hash_clip_key(pack, runtime, text)
  cache_path = CLIP_CACHE_ROOT / f"{cache_key}.wav"
  if not cache_path.exists():
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    if runtime["engine"] == "piper":
      synthesize_with_piper(pack, runtime, text, cache_path)
    else:
      synthesize_with_say(pack, runtime, text, cache_path)

  session_dir.mkdir(parents=True, exist_ok=True)
  session_path = session_dir / f"{clip_id}.wav"
  shutil.copy2(cache_path, session_path)
  return session_path


def estimate_duration_ms(text: str) -> int:
  words = max(1, len(text.split()))
  return int(clamp(words * 320 + 900, 1400, 6500))


def select_voice_packs(requested_ids: Optional[List[str]] = None) -> List[VoicePack]:
  manifest = load_voice_manifest()
  voices = load_voice_packs()
  voice_ids = requested_ids or manifest.get("default_voice_pack_ids", DEFAULT_VOICE_PACK_IDS)
  return [voices[voice_id] for voice_id in voice_ids if voice_id in voices]


def format_pattern_names(patterns: List[Dict[str, Any]]) -> str:
  names = [pattern.get("name", "a live read") for pattern in patterns[:3]]
  if not names:
    return "mixed live reads"
  if len(names) == 1:
    return names[0]
  if len(names) == 2:
    return f"{names[0]} and {names[1]}"
  return f"{names[0]}, {names[1]}, and {names[2]}"


def shorten_summary(summary: str, maximum: int = 88) -> str:
  cleaned = strip_html(summary)
  if len(cleaned) <= maximum:
    return cleaned
  return f"{cleaned[: maximum - 3].rstrip()}..."


def spoken_timeframe_label(interval: str) -> str:
  interval_map = {
    "1m": "1 minute",
    "5m": "5 minutes",
    "15m": "15 minutes",
    "30m": "30 minutes",
    "1h": "1 hour",
    "4h": "4 hours",
    "1d": "1 day",
    "1D": "1 day",
  }
  return interval_map.get(str(interval), str(interval))


def pick_voice_pack_by_role(voice_packs: List[VoicePack], role: str, fallback_index: int = 0) -> VoicePack:
  for pack in voice_packs:
    if pack.podcast_role == role:
      return pack
  return voice_packs[fallback_index]


def build_summary_clips(payload: Dict[str, Any], voice_packs: List[VoicePack]) -> List[Dict[str, Any]]:
  coin_pair = payload.get("coin", {}).get("spoken_name") or payload.get("coin", {}).get("pair", "This market")
  summary = payload.get("summary") or {}
  bias_phrase = summary.get("bias_phrase") or summary.get("biasPhrase") or "mixed / neutral"
  pattern_text = format_pattern_names(summary.get("top_patterns") or summary.get("topPatterns") or [])
  displayed_interval = spoken_timeframe_label(payload.get("displayed_interval") or "live")
  narrator_pack = pick_voice_pack_by_role(voice_packs, "narrator", min(2, len(voice_packs) - 1))
  analyst_one_pack = pick_voice_pack_by_role(voice_packs, "analyst_1", 1 if len(voice_packs) > 1 else 0)
  analyst_two_pack = pick_voice_pack_by_role(voice_packs, "analyst_2", 0)

  return [
    {
      "speaker_id": narrator_pack.id,
      "speaker_label": narrator_pack.display_name,
      "text": f"{coin_pair} just completed its six-timeframe read... On the displayed {displayed_interval} chart, the market currently seems {bias_phrase}.",
      "stage": "summary",
      "subtitle_color": narrator_pack.subtitle_color,
    },
    {
      "speaker_id": analyst_one_pack.id,
      "speaker_label": analyst_one_pack.display_name,
      "text": f"The strongest pattern pressure is coming from {pattern_text}... The tape looks active, but this is still a live read.",
      "stage": "summary",
      "subtitle_color": analyst_one_pack.subtitle_color,
    },
    {
      "speaker_id": analyst_two_pack.id,
      "speaker_label": analyst_two_pack.display_name,
      "text": "I still want one more clean reaction before leaning too hard. Smaller windows can shift quickly, so the structure can still adjust.",
      "stage": "summary",
      "subtitle_color": analyst_two_pack.subtitle_color,
    },
    {
      "speaker_id": narrator_pack.id,
      "speaker_label": narrator_pack.display_name,
      "text": "This is not financial advice... it is a live read. Let's see what happens next.",
      "stage": "summary",
      "subtitle_color": narrator_pack.subtitle_color,
    },
  ]


def build_news_takeaway(item: Dict[str, Any]) -> str:
  summary = shorten_summary(item.get("summary", ""), 78)
  if summary:
    return summary
  return "The headline is on the tape, and the reaction still needs context."


def build_news_clips(payload: Dict[str, Any], voice_packs: List[VoicePack]) -> List[Dict[str, Any]]:
  news_items = payload.get("news_items") or []
  narrator_pack = pick_voice_pack_by_role(voice_packs, "narrator", min(2, len(voice_packs) - 1))
  clips = []
  for index, item in enumerate(news_items[:3]):
    source = item.get("source", "Crypto desk")
    headline = shorten_summary(item.get("title", "Fresh headline"), 92)
    takeaway = build_news_takeaway(item)
    clips.append(
      {
        "speaker_id": narrator_pack.id,
        "speaker_label": narrator_pack.display_name,
        "text": f"Headline {index + 1}... {source} is watching {headline}. {takeaway}",
        "stage": "news",
        "subtitle_color": narrator_pack.subtitle_color,
        "meta": {"news_index": index},
      }
    )

  if clips:
    return clips

  fallback_pack = narrator_pack
  return [
    {
      "speaker_id": fallback_pack.id,
      "speaker_label": fallback_pack.display_name,
      "text": "The headline feed is still refreshing, so we are carrying the latest chart read forward into the next rotation.",
      "stage": "news",
      "subtitle_color": fallback_pack.subtitle_color,
      "meta": {"news_index": 0},
    }
  ]


def build_live_event_clips(payload: Dict[str, Any], voice_packs: List[VoicePack]) -> List[Dict[str, Any]]:
  event = payload.get("event") or {}
  event_type = event.get("type", "chart_pattern_change")
  coin_pair = payload.get("coin", {}).get("spoken_name") or payload.get("coin", {}).get("pair", "This market")
  displayed_interval = spoken_timeframe_label(payload.get("displayed_interval") or "live")

  if event_type == "warmup_intro":
    pack = voice_packs[1]
    text = (
      f"Voice desk is live. We are opening on {coin_pair} with the displayed {displayed_interval} chart. "
      f"Right now the market seems to be shaping like {event.get('pattern_name', 'a developing live structure')}. Let's keep watching."
    )
  elif event_type == "ambient_update":
    pack = voice_packs[0]
    confidence = event.get("confidence", 0)
    confidence_copy = f" with around {confidence} percent detector confidence" if confidence else ""
    text = (
      f"We are still tracking {coin_pair} on the displayed {displayed_interval} chart. "
      f"Price currently seems to be shaping like {event.get('pattern_name', 'a developing live structure')}{confidence_copy}, "
      "but the live read can still adjust."
    )
  elif event_type == "timeframe_switch":
    pack = voice_packs[1]
    text = (
      f"We are rotating into the {displayed_interval} chart on {coin_pair}. "
      f"Let's see whether this window still respects {event.get('pattern_name', 'the current structure')}."
    )
  elif event_type == "lead_pattern_change":
    pack = voice_packs[2]
    text = (
      f"Across the higher-timeframe scan, the lead read now looks like {event.get('lead_pattern_name', 'a fresh structure')} "
      f"on {spoken_timeframe_label(event.get('lead_interval', displayed_interval))}. That is still a live read, not a confirmation."
    )
  elif event_type == "exact_mtf_change":
    pack = voice_packs[2]
    text = (
      f"Exact multi-timeframe agreement just shifted to {event.get('confirmed_count', 0)} matching window"
      f"{'' if event.get('confirmed_count', 0) == 1 else 's'}. The structure is still live, so let's see whether it holds."
    )
  else:
    pack = voice_packs[0]
    text = (
      f"On the displayed {displayed_interval} chart, price currently seems to be shaping like "
      f"{event.get('pattern_name', 'a fresh live pattern')} with about {event.get('confidence', 0)} percent detector confidence."
    )

  return [
    {
      "speaker_id": pack.id,
      "speaker_label": pack.display_name,
      "text": text,
      "stage": "live",
      "subtitle_color": pack.subtitle_color,
      "meta": {"event_type": event_type},
    }
  ]


def plan_commentary_sequence(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
  voice_packs = select_voice_packs(payload.get("voice_pack_ids"))
  if len(voice_packs) < 3:
    raise ValueError("Three voice packs are required for commentary planning")

  mode = payload.get("mode")
  if mode == "intermission_summary":
    return build_summary_clips(payload, voice_packs)
  if mode == "intermission_news":
    return build_news_clips(payload, voice_packs)
  if mode == "live_event":
    return build_live_event_clips(payload, voice_packs)
  raise ValueError(f"Unsupported commentary mode: {mode}")


def build_response_without_audio(payload: Dict[str, Any], sequence: List[Dict[str, Any]], runtimes: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
  session_id = uuid.uuid4().hex[:12]
  rendered = []
  total_duration_ms = 0
  for index, clip in enumerate(sequence):
    speaker_runtime = runtimes.get(clip["speaker_id"], {})
    duration_ms = estimate_duration_ms(clip["text"])
    pause_ms = int(getattr(speaker_runtime.get("pack"), "pause_ms", DEFAULT_CLIP_PAUSE_MS))
    total_duration_ms += duration_ms + pause_ms
    rendered.append(
      {
        **clip,
        "clip_id": f"{index + 1:02d}-{clip['speaker_id']}",
        "duration_ms": duration_ms,
        "pause_ms": pause_ms,
        "audio_url": "",
      }
    )
  return {
    "session_id": session_id,
    "audio_enabled": False,
    "service_mode": "subtitle_only",
    "sequence": rendered,
    "total_duration_ms": total_duration_ms,
    "voice_status": [
      {
        "id": voice_id,
        "available": runtime.get("available", False),
        "engine": runtime.get("engine", "none"),
        "status": runtime.get("status", "missing"),
        "active_voice_label": active_voice_label(runtime["pack"], runtime) if runtime.get("pack") else "",
      }
      for voice_id, runtime in runtimes.items()
    ],
    "timing": {
      "summary_min_ms": INTERMISSION_SUMMARY_MIN_MS,
      "summary_max_ms": INTERMISSION_SUMMARY_MAX_MS,
      "news_min_ms": INTERMISSION_NEWS_MIN_MS,
      "news_max_ms": INTERMISSION_NEWS_MAX_MS,
    },
  }


def render_commentary_response(payload: Dict[str, Any]) -> Dict[str, Any]:
  cleanup_audio_cache()
  sequence = plan_commentary_sequence(payload)
  runtimes = {pack.id: resolve_voice_runtime(pack) for pack in select_voice_packs(payload.get("voice_pack_ids"))}

  required_packs_ready = all(runtime.get("available", False) for runtime in runtimes.values())
  if not required_packs_ready:
    return build_response_without_audio(payload, sequence, runtimes)

  session_id = uuid.uuid4().hex[:12]
  session_dir = SESSION_ROOT / session_id
  service_modes = {runtime["engine"] for runtime in runtimes.values() if runtime.get("available")}
  rendered = []
  total_duration_ms = 0

  for index, clip in enumerate(sequence):
    runtime = runtimes[clip["speaker_id"]]
    pack = runtime["pack"]
    speaker_label = active_voice_label(pack, runtime)
    clip_id = f"{index + 1:02d}-{clip['speaker_id']}"
    audio_path = ensure_clip_audio(pack, runtime, clip["text"], session_dir, clip_id)
    duration_ms = audio_duration_ms(audio_path)
    total_duration_ms += duration_ms + pack.pause_ms
    rendered.append(
      {
        **clip,
        "clip_id": clip_id,
        "speaker_label": speaker_label,
        "duration_ms": duration_ms,
        "pause_ms": pack.pause_ms,
        "audio_url": f"/api/audio/{session_id}/{clip_id}.wav",
      }
    )

  if "piper" in service_modes:
    service_mode = "piper"
  elif "say" in service_modes:
    service_mode = "say_fallback"
  else:
    service_mode = "subtitle_only"

  return {
    "session_id": session_id,
    "audio_enabled": True,
    "service_mode": service_mode,
    "sequence": rendered,
    "total_duration_ms": total_duration_ms,
    "voice_status": [
      {
        "id": voice_id,
        "available": runtime.get("available", False),
        "engine": runtime.get("engine", "none"),
        "status": runtime.get("status", "missing"),
        "active_voice_label": active_voice_label(runtime["pack"], runtime) if runtime.get("pack") else "",
      }
      for voice_id, runtime in runtimes.items()
    ],
    "timing": {
      "summary_min_ms": INTERMISSION_SUMMARY_MIN_MS,
      "summary_max_ms": INTERMISSION_SUMMARY_MAX_MS,
      "news_min_ms": INTERMISSION_NEWS_MIN_MS,
      "news_max_ms": INTERMISSION_NEWS_MAX_MS,
    },
  }


def audio_file_path(session_id: str, clip_id: str) -> Path:
  safe_session = re.sub(r"[^a-zA-Z0-9_-]", "", session_id)
  safe_clip = re.sub(r"[^a-zA-Z0-9_-]", "", clip_id)
  return SESSION_ROOT / safe_session / f"{safe_clip}.wav"
