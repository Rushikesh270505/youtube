from __future__ import annotations

import asyncio
import base64
import audioop
import contextlib
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
import wave
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
  from google import genai
  from google.genai import types as genai_types
except ImportError:  # pragma: no cover - exercised via runtime fallback in tests
  genai = None
  genai_types = None

import runtime_paths

APP_RESOURCE_DIR = runtime_paths.app_resource_dir()
VOICE_MANIFEST_PATH = APP_RESOURCE_DIR / "voice_packs" / "hosts.json"
AUDIO_CACHE_ROOT = Path(tempfile.gettempdir()) / "crypto_overlay_voice_cache"
SESSION_ROOT = AUDIO_CACHE_ROOT / "sessions"
CLIP_CACHE_ROOT = AUDIO_CACHE_ROOT / "clip_cache"
VOICE_ASSIGNMENTS_ROOT = Path.home() / "Library" / "Application Support" / "crypto-live-stream-overlay"
VOICE_ASSIGNMENTS_PATH = VOICE_ASSIGNMENTS_ROOT / "voice_assignments.json"
DEFAULT_VOICE_PACK_IDS = ["neutral_analyst", "high_energy_host", "calm_educator"]
INTERMISSION_SUMMARY_MIN_MS = 30000
INTERMISSION_SUMMARY_MAX_MS = 50000
INTERMISSION_NEWS_MIN_MS = 9000
INTERMISSION_NEWS_MAX_MS = 20000
DEFAULT_CLIP_PAUSE_MS = 220
DEFAULT_GEMINI_LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
DEFAULT_GEMINI_TTS_MODEL = DEFAULT_GEMINI_LIVE_MODEL
DEFAULT_WAV_SAMPLE_RATE = 22050
GEMINI_TTS_RESPONSE_RATE = 24000
GEMINI_LIVE_SYNTH_TIMEOUT_SECONDS = 90
VOICE_RENDER_CACHE_VERSION = "gemini_live_native_audio_v2"
LOCAL_VOICE_CATALOG_CACHE_SECONDS = 60
VOICE_ROLE_ORDER = ("analyst_1", "analyst_2", "host")
VOICE_ROLE_TITLES = {
  "analyst_1": "Analyst 1",
  "analyst_2": "Analyst 2",
  "host": "Host",
}
VOICE_ROLE_TEMPLATE_DEFAULTS = {
  "analyst_1": {
    "role": "Analyst 1",
    "podcast_role": "analyst_1",
    "pause_ms": 220,
    "subtitle_color": "#6ee7ff",
    "say_rate": 196,
  },
  "analyst_2": {
    "role": "Analyst 2",
    "podcast_role": "analyst_2",
    "pause_ms": 260,
    "subtitle_color": "#ffffff",
    "say_rate": 184,
  },
  "host": {
    "role": "Host",
    "podcast_role": "narrator",
    "pause_ms": 320,
    "subtitle_color": "#ffd58b",
    "say_rate": 188,
  },
}
ENGLISH_LOCALE_LABELS = {
  "en_AU": "English (Australia)",
  "en_GB": "English (UK)",
  "en_IE": "English (Ireland)",
  "en_IN": "English (India)",
  "en_NZ": "English (New Zealand)",
  "en_US": "English (US)",
  "en_ZA": "English (South Africa)",
}

SESSION_ROOT.mkdir(parents=True, exist_ok=True)
CLIP_CACHE_ROOT.mkdir(parents=True, exist_ok=True)
VOICE_ASSIGNMENTS_ROOT.mkdir(parents=True, exist_ok=True)

_SAY_VOICE_CACHE: Optional[set[str]] = None
_GEMINI_CLIENT: Any = None
_GEMINI_CLIENT_KEY: str = ""
_GEMINI_LIVE_POOL: Any = None
_GEMINI_LIVE_POOL_KEY: str = ""
_LOCAL_VOICE_CATALOG_CACHE: List[Dict[str, str]] = []
_LOCAL_VOICE_CATALOG_CACHE_AT: float = 0.0
_VOICE_ASSIGNMENTS_LOCK = threading.Lock()

ROLE_FALLBACK_VOICE_MAP = {
  "neutral_analyst": ["Aman (English (India))", "Daniel (English (UK))", "Eddy (English (US))", "Albert", "Grandpa (English (US))"],
  "high_energy_host": ["Eddy (English (US))", "Daniel (English (UK))", "Fred", "Albert", "Aman (English (India))"],
  "calm_educator": ["Flo (English (US))", "Grandma (English (US))", "Karen", "Moira", "Tara"],
  "analyst_1": ["Daniel (English (UK))", "Aman (English (India))", "Rishi (English (India))", "Fred", "Samantha (English (US))"],
  "analyst_2": ["Samantha (English (US))", "Tessa (English (South Africa))", "Moira (English (Ireland))", "Karen", "Tara (English (India))"],
  "host": ["Aman (English (India))", "Daniel (English (UK))", "Tessa (English (South Africa))", "Samantha (English (US))", "Moira (English (Ireland))"],
}
SUBSCRIBE_CTA_LINES = [
  "Smack that like and subscribe button if you want more live reads like this.",
  "Hit like, hit subscribe, and stay locked in for the next setup.",
  "If this live desk is helping, smash subscribe and ride with the channel.",
  "Don\u2019t miss the next rotation, smack that like and subscribe button right now.",
  "Join the crew, hit subscribe, and keep this live chart energy rolling.",
  "Tap that subscribe button and show some love if you want more live market breakdowns.",
]


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
  google_voice_name: str
  google_model_id: str


@dataclass
class GeminiLiveSessionEntry:
  context_manager: Any
  session: Any
  lock: Any
  last_used_at: float


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
      google_voice_name=entry.get("google_voice_name", entry.get("display_name", entry["id"])),
      google_model_id=entry.get("google_model_id", DEFAULT_GEMINI_TTS_MODEL),
    )
    voices[pack.id] = pack
  return voices


def role_title(role_id: str) -> str:
  return VOICE_ROLE_TITLES.get(role_id, role_id.replace("_", " ").title())


def normalize_voice_gender(raw_gender: str) -> str:
  gender = str(raw_gender or "").strip()
  if gender.endswith("Female"):
    return "Female"
  if gender.endswith("Male"):
    return "Male"
  if gender.endswith("Neuter"):
    return "Neuter"
  return gender or "Unknown"


def locale_accent_label(locale: str) -> str:
  locale = str(locale or "").strip()
  if locale in ENGLISH_LOCALE_LABELS:
    return ENGLISH_LOCALE_LABELS[locale]
  if locale.startswith("en_"):
    region = locale.split("_", 1)[1].replace("_", " ")
    return f"English ({region})"
  return locale.replace("_", "-")


def split_voice_name(voice_name: str, locale: str) -> Tuple[str, str]:
  clean_name = str(voice_name or "").strip()
  suffix_match = re.match(r"^(.*?)\s+\((English \(.+\))\)$", clean_name)
  if suffix_match:
    return suffix_match.group(1).strip(), suffix_match.group(2).strip()
  return clean_name, locale_accent_label(locale)


def local_voice_catalog_script() -> str:
  return """
use framework "AppKit"
set outLines to {}
set theVoices to current application's NSSpeechSynthesizer's availableVoices()
repeat with v in (theVoices as list)
  set attrs to current application's NSSpeechSynthesizer's attributesForVoice:v
  set voiceName to (attrs's objectForKey:"VoiceName") as text
  set gender to (attrs's objectForKey:"VoiceGender") as text
  set locale to (attrs's objectForKey:"VoiceLocaleIdentifier") as text
  copy (voiceName & tab & locale & tab & gender) to end of outLines
end repeat
set AppleScript's text item delimiters to linefeed
return outLines as text
""".strip()


def read_local_voice_catalog_from_system() -> List[Dict[str, str]]:
  result = subprocess.run(
    ["osascript", "-e", local_voice_catalog_script()],
    check=True,
    capture_output=True,
    text=True,
  )
  say_voices = available_say_voices()
  seen: set[Tuple[str, str, str]] = set()
  voices: List[Dict[str, str]] = []
  for raw_line in result.stdout.splitlines():
    if not raw_line.strip():
      continue
    voice_name, locale, raw_gender = (raw_line.split("\t") + ["", "", ""])[:3]
    gender = normalize_voice_gender(raw_gender)
    voice_name = voice_name.strip()
    locale = locale.strip()
    if voice_name not in say_voices or not locale.startswith("en_") or gender not in {"Female", "Male"}:
      continue
    dedupe_key = (voice_name, locale, gender)
    if dedupe_key in seen:
      continue
    seen.add(dedupe_key)
    display_name, accent_label = split_voice_name(voice_name, locale)
    voices.append(
      {
        "voice_name": voice_name,
        "display_name": display_name,
        "locale": locale,
        "accent_label": accent_label,
        "gender": gender,
      }
    )
  return sorted(
    voices,
    key=lambda item: (
      0 if item["gender"] == "Female" else 1,
      item["display_name"].lower(),
      item["accent_label"].lower(),
      item["voice_name"].lower(),
    ),
  )


def list_local_voice_catalog(force_refresh: bool = False) -> List[Dict[str, str]]:
  global _LOCAL_VOICE_CATALOG_CACHE, _LOCAL_VOICE_CATALOG_CACHE_AT
  now = time.time()
  if not force_refresh and _LOCAL_VOICE_CATALOG_CACHE and now - _LOCAL_VOICE_CATALOG_CACHE_AT < LOCAL_VOICE_CATALOG_CACHE_SECONDS:
    return [voice.copy() for voice in _LOCAL_VOICE_CATALOG_CACHE]
  catalog = read_local_voice_catalog_from_system()
  _LOCAL_VOICE_CATALOG_CACHE = [voice.copy() for voice in catalog]
  _LOCAL_VOICE_CATALOG_CACHE_AT = now
  return catalog


def group_voice_catalog_by_gender(catalog: List[Dict[str, str]]) -> Dict[str, List[Dict[str, str]]]:
  grouped = {"Female": [], "Male": []}
  for voice in catalog:
    gender = voice.get("gender")
    if gender in grouped:
      grouped[gender].append(voice)
  return grouped


def default_role_assignments(catalog: Optional[List[Dict[str, str]]] = None) -> Dict[str, str]:
  voices = catalog if catalog is not None else list_local_voice_catalog()
  available_voice_names = {voice["voice_name"] for voice in voices}
  ordered_voice_names = [voice["voice_name"] for voice in voices]
  defaults: Dict[str, str] = {}
  for role_id in VOICE_ROLE_ORDER:
    chosen = next((candidate for candidate in ROLE_FALLBACK_VOICE_MAP.get(role_id, []) if candidate in available_voice_names), "")
    if not chosen and ordered_voice_names:
      chosen = ordered_voice_names[0]
    defaults[role_id] = chosen
  return defaults


def current_timestamp_iso() -> str:
  return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_voice_assignments(raw_state: Optional[Dict[str, Any]] = None, catalog: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
  catalog = catalog if catalog is not None else list_local_voice_catalog()
  available_voice_names = {voice["voice_name"] for voice in catalog}
  defaults = default_role_assignments(catalog)
  raw_state = raw_state or {}
  raw_roles = raw_state.get("roles") if isinstance(raw_state, dict) else {}
  if not isinstance(raw_roles, dict):
    raw_roles = {}
  roles: Dict[str, str] = {}
  for role_id in VOICE_ROLE_ORDER:
    selected = str(raw_roles.get(role_id) or "").strip()
    roles[role_id] = selected if selected in available_voice_names else defaults.get(role_id, "")
  version = int(raw_state.get("version") or 1) if isinstance(raw_state, dict) else 1
  updated_at = str(raw_state.get("updated_at") or current_timestamp_iso()) if isinstance(raw_state, dict) else current_timestamp_iso()
  return {
    "version": max(1, version),
    "updated_at": updated_at,
    "roles": roles,
  }


def read_voice_assignments_file() -> Dict[str, Any]:
  if not VOICE_ASSIGNMENTS_PATH.exists():
    return {}
  with contextlib.suppress(OSError, json.JSONDecodeError):
    return json.loads(VOICE_ASSIGNMENTS_PATH.read_text(encoding="utf-8"))
  return {}


def write_voice_assignments_file(state: Dict[str, Any]) -> None:
  VOICE_ASSIGNMENTS_ROOT.mkdir(parents=True, exist_ok=True)
  VOICE_ASSIGNMENTS_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")


def get_voice_assignments(force_catalog_refresh: bool = False) -> Dict[str, Any]:
  catalog = list_local_voice_catalog(force_refresh=force_catalog_refresh)
  with _VOICE_ASSIGNMENTS_LOCK:
    raw_state = read_voice_assignments_file()
    normalized = normalize_voice_assignments(raw_state, catalog)
    if raw_state != normalized:
      write_voice_assignments_file(normalized)
    return normalized


def update_voice_assignment(role: str, voice_name: str) -> Dict[str, Any]:
  normalized_role = str(role or "").strip()
  normalized_voice_name = str(voice_name or "").strip()
  if normalized_role not in VOICE_ROLE_ORDER:
    raise ValueError(f"Unsupported voice role: {normalized_role}")
  catalog = list_local_voice_catalog()
  available_voice_names = {voice["voice_name"] for voice in catalog}
  if normalized_voice_name not in available_voice_names:
    raise ValueError(f"Unsupported local macOS voice: {normalized_voice_name}")
  with _VOICE_ASSIGNMENTS_LOCK:
    current = normalize_voice_assignments(read_voice_assignments_file(), catalog)
    if current["roles"].get(normalized_role) == normalized_voice_name:
      return current
    current["roles"][normalized_role] = normalized_voice_name
    current["version"] = int(current.get("version") or 1) + 1
    current["updated_at"] = current_timestamp_iso()
    write_voice_assignments_file(current)
    return current


def voice_assignment_for_role(role_id: str, assignments: Optional[Dict[str, Any]] = None) -> str:
  state = assignments if assignments is not None else get_voice_assignments()
  roles = state.get("roles") if isinstance(state, dict) else {}
  if isinstance(roles, dict):
    return str(roles.get(role_id) or "")
  return ""


def build_role_template(role_id: str, assignments: Optional[Dict[str, Any]] = None) -> VoicePack:
  if role_id not in VOICE_ROLE_TEMPLATE_DEFAULTS:
    raise ValueError(f"Unsupported voice role template: {role_id}")
  defaults = VOICE_ROLE_TEMPLATE_DEFAULTS[role_id]
  assigned_voice = voice_assignment_for_role(role_id, assignments)
  return VoicePack(
    id=role_id,
    display_name=role_title(role_id),
    role=defaults["role"],
    podcast_role=defaults["podcast_role"],
    engine="say",
    model_path="",
    speaker_id=None,
    speed=1.0,
    gain=1.0,
    pause_ms=int(defaults["pause_ms"]),
    subtitle_color=str(defaults["subtitle_color"]),
    optional=False,
    fallback_system_voice=assigned_voice,
    say_rate=int(defaults["say_rate"]),
    google_voice_name=assigned_voice,
    google_model_id="",
  )


def load_role_templates(assignments: Optional[Dict[str, Any]] = None) -> Dict[str, VoicePack]:
  state = assignments if assignments is not None else get_voice_assignments()
  return {role_id: build_role_template(role_id, state) for role_id in VOICE_ROLE_ORDER}


def select_role_templates(assignments: Optional[Dict[str, Any]] = None) -> List[VoicePack]:
  templates = load_role_templates(assignments)
  return [templates[role_id] for role_id in VOICE_ROLE_ORDER]


def voice_catalog_payload(force_refresh: bool = False) -> Dict[str, Any]:
  catalog = list_local_voice_catalog(force_refresh=force_refresh)
  assignments = get_voice_assignments(force_catalog_refresh=force_refresh)
  return {
    "voices": catalog,
    "voices_by_gender": group_voice_catalog_by_gender(catalog),
    "assignments": assignments,
    "filters": {
      "locale_prefix": "en_",
      "genders": ["Female", "Male"],
      "human_sounding_only": True,
    },
  }


def get_gemini_api_key() -> str:
  return (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()


def gemini_sdk_available() -> bool:
  return genai is not None and genai_types is not None


def get_gemini_client(api_key: Optional[str] = None) -> Any:
  global _GEMINI_CLIENT, _GEMINI_CLIENT_KEY
  resolved_key = (api_key or get_gemini_api_key()).strip()
  if not resolved_key or not gemini_sdk_available():
    return None
  if _GEMINI_CLIENT is None or _GEMINI_CLIENT_KEY != resolved_key:
    _GEMINI_CLIENT = genai.Client(api_key=resolved_key)
    _GEMINI_CLIENT_KEY = resolved_key
  return _GEMINI_CLIENT


def build_gemini_live_system_instruction(pack: VoicePack) -> str:
  role_styles = {
    "neutral_analyst": "Sound measured, sharp, and chart-focused.",
    "high_energy_host": "Sound urgent, energized, and fast-paced without shouting.",
    "calm_educator": "Sound steady, composed, and clear under pressure.",
  }
  style = role_styles.get(pack.id, "Sound broadcast-ready and confident.")
  return (
    f"You are {pack.display_name}, the {pack.role.lower()} voice on a crypto livestream. "
    f"{style} "
    "Read the supplied market script aloud in a natural broadcast voice. "
    "Stay faithful to the script wording and meaning. "
    "Do not paraphrase, summarize, skip words, or stop before the script is complete. "
    "Do not add acknowledgements, intros, filler, or follow-up questions. "
    "Preserve prices, percentages, indicators, timeframes, and pattern names accurately."
  )


def build_gemini_live_prompt(text: str) -> str:
  cleaned = strip_html(text)
  return (
    "Read this market commentary script verbatim and finish every word. "
    "Do not add or remove anything.\n"
    f"Script: {cleaned}"
  )


def normalize_live_transcript(transcript: str, fallback_text: str) -> str:
  fallback_clean = strip_html(fallback_text)
  cleaned = strip_html(transcript or "")
  cleaned = re.sub(r"</?speech>", " ", cleaned, flags=re.IGNORECASE)
  cleaned = re.sub(r"\s+", " ", cleaned).strip(" \"'")
  if not cleaned:
    return fallback_clean

  filler_patterns = [
    r"^(understood|got it|okay|ok|sure|right|all right|i see|i hear you|absolutely|certainly)[,!.:\s]+",
    r"^(here(?:'s| is))[,!.:\s]+",
  ]
  while True:
    original = cleaned
    for pattern in filler_patterns:
      cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip()
    if cleaned == original:
      break

  if not cleaned:
    return fallback_clean

  source_words = fallback_clean.split()
  transcript_words = cleaned.split()
  if len(transcript_words) < max(4, int(len(source_words) * 0.55)):
    return fallback_clean
  if not re.search(r"[.!?]$", cleaned) and len(transcript_words) < len(source_words):
    return fallback_clean

  return cleaned


class GeminiLiveSessionPool:
  def __init__(self, api_key: str):
    self.api_key = api_key
    self.client = genai.Client(api_key=api_key)
    self.loop = asyncio.new_event_loop()
    self.thread = threading.Thread(target=self._run_loop, name="gemini-live-pool", daemon=True)
    self.ready = threading.Event()
    self.closed = False
    self.sessions: Dict[Tuple[str, str, str], GeminiLiveSessionEntry] = {}
    self.thread.start()
    self.ready.wait(timeout=5)

  def _run_loop(self) -> None:
    asyncio.set_event_loop(self.loop)
    self.ready.set()
    self.loop.run_forever()

  def synthesize(self, pack: VoicePack, runtime: Dict[str, Any], text: str) -> Dict[str, Any]:
    if self.closed:
      raise RuntimeError("Gemini Live pool is closed")
    future = asyncio.run_coroutine_threadsafe(self._synthesize(pack, runtime, text), self.loop)
    return future.result(timeout=GEMINI_LIVE_SYNTH_TIMEOUT_SECONDS)

  async def _connect_session(self, pack: VoicePack, runtime: Dict[str, Any]) -> GeminiLiveSessionEntry:
    model_id = runtime.get("model_id") or pack.google_model_id or DEFAULT_GEMINI_LIVE_MODEL
    voice_name = runtime.get("voice_name") or pack.google_voice_name
    config = genai_types.LiveConnectConfig(
      response_modalities=["AUDIO"],
      system_instruction=genai_types.Content(parts=[genai_types.Part(text=build_gemini_live_system_instruction(pack))]),
      speech_config=genai_types.SpeechConfig(
        voice_config=genai_types.VoiceConfig(
          prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(voice_name=voice_name)
        )
      ),
      output_audio_transcription=genai_types.AudioTranscriptionConfig(),
      thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
      temperature=0.0,
      top_p=0.1,
      max_output_tokens=512,
    )
    context_manager = self.client.aio.live.connect(model=model_id, config=config)
    session = await context_manager.__aenter__()
    return GeminiLiveSessionEntry(
      context_manager=context_manager,
      session=session,
      lock=asyncio.Lock(),
      last_used_at=time.time(),
    )

  async def _close_entry(self, entry: GeminiLiveSessionEntry) -> None:
    with contextlib.suppress(Exception):
      await entry.context_manager.__aexit__(None, None, None)

  async def _get_session(self, pack: VoicePack, runtime: Dict[str, Any]) -> tuple[tuple[str, str, str], GeminiLiveSessionEntry]:
    key = (
      str(runtime.get("model_id") or pack.google_model_id or DEFAULT_GEMINI_LIVE_MODEL),
      str(runtime.get("voice_name") or pack.google_voice_name),
      pack.id,
    )
    entry = self.sessions.get(key)
    if entry is None:
      entry = await self._connect_session(pack, runtime)
      self.sessions[key] = entry
    entry.last_used_at = time.time()
    return key, entry

  async def _reset_session(self, key: tuple[str, str, str]) -> None:
    entry = self.sessions.pop(key, None)
    if entry is not None:
      await self._close_entry(entry)

  async def _synthesize_once(self, pack: VoicePack, runtime: Dict[str, Any], entry: GeminiLiveSessionEntry, text: str) -> Dict[str, Any]:
    prompt = build_gemini_live_prompt(text)
    await entry.session.send_client_content(
      turns=genai_types.Content(role="user", parts=[genai_types.Part(text=prompt)]),
      turn_complete=True,
    )

    pcm_chunks: List[bytes] = []
    transcript_chunks: List[str] = []

    async for message in entry.session.receive():
      server_content = getattr(message, "server_content", None)
      if not server_content:
        continue
      output_transcription = getattr(server_content, "output_transcription", None)
      transcript_text = getattr(output_transcription, "text", None) if output_transcription else None
      if transcript_text:
        transcript_chunks.append(str(transcript_text))

      model_turn = getattr(server_content, "model_turn", None)
      for part in getattr(model_turn, "parts", None) or []:
        inline_data = getattr(part, "inline_data", None)
        data = getattr(inline_data, "data", None) if inline_data else None
        if not data:
          continue
        if isinstance(data, str):
          pcm_chunks.append(base64.b64decode(data))
        else:
          pcm_chunks.append(bytes(data))

    pcm = b"".join(pcm_chunks)
    if not pcm:
      raise RuntimeError("Gemini Live returned no audio data")
    return {
      "pcm": pcm,
      "sample_rate": GEMINI_TTS_RESPONSE_RATE,
      "transcript": normalize_live_transcript("".join(transcript_chunks), text),
    }

  async def _synthesize(self, pack: VoicePack, runtime: Dict[str, Any], text: str) -> Dict[str, Any]:
    # Use a fresh Live session per clip to avoid conversational carry-over
    # between unrelated chart updates and podcast turns.
    entry = await self._connect_session(pack, runtime)
    try:
      return await self._synthesize_once(pack, runtime, entry, text)
    except Exception:
      await self._close_entry(entry)
      retry_entry = await self._connect_session(pack, runtime)
      try:
        return await self._synthesize_once(pack, runtime, retry_entry, text)
      finally:
        await self._close_entry(retry_entry)
    finally:
      with contextlib.suppress(Exception):
        await self._close_entry(entry)

  async def _close_all(self) -> None:
    entries = list(self.sessions.values())
    self.sessions.clear()
    for entry in entries:
      await self._close_entry(entry)

  def close(self) -> None:
    if self.closed:
      return
    self.closed = True
    if self.ready.is_set():
      with contextlib.suppress(Exception):
        asyncio.run_coroutine_threadsafe(self._close_all(), self.loop).result(timeout=8)
      self.loop.call_soon_threadsafe(self.loop.stop)
      self.thread.join(timeout=4)


def get_gemini_live_pool(api_key: Optional[str] = None) -> Any:
  global _GEMINI_LIVE_POOL, _GEMINI_LIVE_POOL_KEY
  resolved_key = (api_key or get_gemini_api_key()).strip()
  if not resolved_key or not gemini_sdk_available():
    return None
  if _GEMINI_LIVE_POOL is None or _GEMINI_LIVE_POOL_KEY != resolved_key:
    if _GEMINI_LIVE_POOL is not None:
      _GEMINI_LIVE_POOL.close()
    _GEMINI_LIVE_POOL = GeminiLiveSessionPool(resolved_key)
    _GEMINI_LIVE_POOL_KEY = resolved_key
  return _GEMINI_LIVE_POOL


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


def runtime_model_id(runtime: Dict[str, Any]) -> str:
  if runtime.get("engine") in {"gemini", "gemini_live"}:
    return str(runtime.get("model_id") or "")
  if runtime.get("engine") == "piper":
    model_path = runtime.get("model_path")
    return Path(model_path).name if model_path else "local_piper_model"
  if runtime.get("engine") == "say":
    return "macos-say"
  return ""


def service_mode_for_runtimes(runtimes: Dict[str, Dict[str, Any]]) -> str:
  active_engines = {runtime.get("engine") for runtime in runtimes.values() if runtime.get("available")}
  if not active_engines:
    return "subtitle_only"
  if active_engines == {"gemini_live"}:
    return "gemini_live"
  if active_engines == {"gemini"}:
    return "gemini"
  if active_engines == {"piper"}:
    return "piper"
  if active_engines == {"say"}:
    return "say_fallback"
  return "hybrid"


def provider_name_for_runtimes(runtimes: Dict[str, Dict[str, Any]]) -> str:
  active_engines = {runtime.get("engine") for runtime in runtimes.values() if runtime.get("available")}
  if not active_engines:
    return "subtitle_only"
  if active_engines == {"gemini_live"}:
    return "gemini_live_voice_packs"
  if active_engines == {"gemini"}:
    return "gemini_voice_packs"
  if active_engines == {"piper"}:
    return "piper_voice_packs"
  if active_engines == {"say"}:
    return "local_voice_packs"
  return "hybrid_voice_packs"


def primary_model_id_for_runtimes(runtimes: Dict[str, Dict[str, Any]], default: str = "") -> str:
  model_ids = {
    runtime_model_id(runtime)
    for runtime in runtimes.values()
    if runtime.get("available") and runtime_model_id(runtime)
  }
  if not model_ids:
    return default
  if len(model_ids) == 1:
    return next(iter(model_ids))
  return "mixed"


def system_voice_runtime_for_pack(pack: VoicePack, status: str = "ready", fallback_active: bool = False) -> Optional[Dict[str, Any]]:
  say_voice = pick_system_fallback_voice(pack)
  if not say_voice:
    return None
  return {
    "available": True,
    "engine": "say",
    "configured_engine": pack.engine,
    "status": status,
    "pack": pack,
    "binary": shutil.which("say"),
    "say_voice": say_voice,
    "fallback_active": fallback_active,
  }


def fallback_runtime_for_pack(pack: VoicePack, reason: str = "fallback") -> Optional[Dict[str, Any]]:
  return system_voice_runtime_for_pack(pack, status=reason, fallback_active=True)


def piper_runtime_for_pack(pack: VoicePack, configured_engine: str, status: str = "fallback") -> Optional[Dict[str, Any]]:
  piper_binary = shutil.which("piper")
  model_path = (APP_RESOURCE_DIR / pack.model_path).resolve() if pack.model_path else None
  if not piper_binary or not model_path or not model_path.exists():
    return None
  return {
    "available": True,
    "engine": "piper",
    "configured_engine": configured_engine,
    "status": status,
    "pack": pack,
    "binary": piper_binary,
    "model_path": model_path,
    "fallback_runtime": fallback_runtime_for_pack(pack),
    "fallback_active": configured_engine != "piper",
  }


def serialize_voice_runtime(pack: VoicePack, runtime: Dict[str, Any]) -> Dict[str, Any]:
  return {
    "id": pack.id,
    "display_name": pack.display_name,
    "active_voice_label": active_voice_label(pack, runtime),
    "assigned_voice_name": str(runtime.get("say_voice") or ""),
    "role": pack.role,
    "podcast_role": pack.podcast_role,
    "subtitle_color": pack.subtitle_color,
    "available": runtime.get("available", False),
    "engine": runtime.get("engine", "none"),
    "configured_engine": runtime.get("configured_engine", pack.engine),
    "status": runtime.get("status", "missing"),
    "optional": pack.optional,
    "fallback_active": runtime.get("fallback_active", False),
    "model_id": runtime_model_id(runtime),
    "google_voice_name": pack.google_voice_name,
  }


def resolve_voice_runtime(pack: VoicePack) -> Dict[str, Any]:
  configured_engine = pack.engine or "say"
  if configured_engine in {"gemini", "gemini_live"}:
    api_key = get_gemini_api_key()
    client = get_gemini_client(api_key)
    live_pool = get_gemini_live_pool(api_key)
    secondary_runtime = piper_runtime_for_pack(pack, configured_engine) or fallback_runtime_for_pack(pack)
    if pack.google_voice_name and api_key and client and live_pool:
      return {
        "available": True,
        "engine": "gemini_live",
        "configured_engine": configured_engine,
        "status": "ready",
        "pack": pack,
        "client": client,
        "live_pool": live_pool,
        "voice_name": pack.google_voice_name,
        "model_id": pack.google_model_id or DEFAULT_GEMINI_LIVE_MODEL,
        "fallback_runtime": secondary_runtime,
        "fallback_active": False,
      }
    if secondary_runtime:
      return secondary_runtime
  if configured_engine == "piper":
    piper_runtime = piper_runtime_for_pack(pack, configured_engine, "ready")
    if piper_runtime:
      return piper_runtime
  if configured_engine == "say":
    say_runtime = system_voice_runtime_for_pack(pack, status="ready", fallback_active=False)
    if say_runtime:
      return say_runtime

  fallback_runtime = fallback_runtime_for_pack(pack, "fallback")
  if fallback_runtime:
    return fallback_runtime

  return {
    "available": False,
    "engine": "none",
    "configured_engine": configured_engine,
    "status": "missing",
    "pack": pack,
    "fallback_active": False,
    "reason": "Missing preferred voice runtime and no local system-voice fallback",
  }


def active_voice_label(pack: VoicePack, runtime: Dict[str, Any]) -> str:
  if runtime.get("engine") == "say" and runtime.get("say_voice"):
    return str(runtime["say_voice"])
  return pack.display_name


def list_voice_statuses() -> Dict[str, Any]:
  assignments = get_voice_assignments()
  templates = load_role_templates(assignments)
  statuses = []
  runtimes: Dict[str, Dict[str, Any]] = {}
  for role_id in VOICE_ROLE_ORDER:
    pack = templates[role_id]
    runtime = resolve_voice_runtime(pack)
    runtimes[pack.id] = runtime
    statuses.append(serialize_voice_runtime(pack, runtime))

  cast_ready = all(status["available"] or status["optional"] for status in statuses) and bool(statuses)
  return {
    "role_ids": list(VOICE_ROLE_ORDER),
    "voices": statuses,
    "cast_ready": cast_ready,
    "provider": provider_name_for_runtimes(runtimes),
    "service_mode": service_mode_for_runtimes(runtimes),
    "model_id": primary_model_id_for_runtimes(runtimes),
    "assignments": assignments,
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
      VOICE_RENDER_CACHE_VERSION,
      pack.id,
      runtime["engine"],
      str(runtime.get("model_path", "")),
      runtime.get("say_voice", ""),
      runtime.get("voice_name", ""),
      runtime.get("model_id", ""),
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


def write_wave_file(filename: Path, pcm: bytes, channels: int = 1, rate: int = DEFAULT_WAV_SAMPLE_RATE, sample_width: int = 2) -> None:
  filename.parent.mkdir(parents=True, exist_ok=True)
  with wave.open(str(filename), "wb") as wav_file:
    wav_file.setnchannels(channels)
    wav_file.setsampwidth(sample_width)
    wav_file.setframerate(rate)
    wav_file.writeframes(pcm)


def resample_pcm(pcm: bytes, source_rate: int, target_rate: int, sample_width: int = 2, channels: int = 1) -> bytes:
  if source_rate == target_rate:
    return pcm
  converted, _ = audioop.ratecv(pcm, sample_width, channels, source_rate, target_rate, None)
  return converted


def extract_gemini_pcm(response: Any) -> bytes:
  candidates = getattr(response, "candidates", None) or []
  if not candidates:
    raise RuntimeError("Gemini TTS returned no candidates")
  parts = getattr(getattr(candidates[0], "content", None), "parts", None) or []
  if not parts:
    raise RuntimeError("Gemini TTS returned no content parts")
  inline_data = getattr(parts[0], "inline_data", None)
  data = getattr(inline_data, "data", None) if inline_data else None
  if not data:
    raise RuntimeError("Gemini TTS returned no audio data")
  if isinstance(data, str):
    return base64.b64decode(data)
  return bytes(data)


def synthesize_with_gemini_live(pack: VoicePack, runtime: Dict[str, Any], text: str, output_path: Path) -> Dict[str, Any]:
  live_pool = runtime.get("live_pool") or get_gemini_live_pool()
  if not live_pool:
    raise RuntimeError("Gemini Live runtime is not available for this pack")

  result = live_pool.synthesize(pack, runtime, text)
  pcm = result.get("pcm") or b""
  if not pcm:
    raise RuntimeError("Gemini Live returned no PCM audio")
  normalized_pcm = resample_pcm(pcm, int(result.get("sample_rate") or GEMINI_TTS_RESPONSE_RATE), DEFAULT_WAV_SAMPLE_RATE)
  write_wave_file(output_path, normalized_pcm, rate=DEFAULT_WAV_SAMPLE_RATE)
  return {
    "transcript": normalize_live_transcript(str(result.get("transcript") or ""), text),
  }


def synthesize_with_runtime(pack: VoicePack, runtime: Dict[str, Any], text: str, output_path: Path) -> Dict[str, Any]:
  if runtime["engine"] in {"gemini", "gemini_live"}:
    return synthesize_with_gemini_live(pack, runtime, text, output_path)
  if runtime["engine"] == "piper":
    synthesize_with_piper(pack, runtime, text, output_path)
    return {}
  synthesize_with_say(pack, runtime, text, output_path)
  return {}


def clip_metadata_path(cache_key: str) -> Path:
  return CLIP_CACHE_ROOT / f"{cache_key}.json"


def load_clip_metadata(path: Path) -> Dict[str, Any]:
  if not path.exists():
    return {}
  with contextlib.suppress(json.JSONDecodeError, OSError):
    return json.loads(path.read_text(encoding="utf-8"))
  return {}


def write_clip_metadata(path: Path, metadata: Dict[str, Any]) -> None:
  if not metadata:
    path.unlink(missing_ok=True)
    return
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(json.dumps(metadata), encoding="utf-8")


def materialize_clip_asset(pack: VoicePack, runtime: Dict[str, Any], text: str, session_dir: Path, clip_id: str) -> Dict[str, Any]:
  actual_runtime = runtime
  cache_key = hash_clip_key(pack, runtime, text)
  cache_path = CLIP_CACHE_ROOT / f"{cache_key}.wav"
  metadata_path = clip_metadata_path(cache_key)
  metadata = load_clip_metadata(metadata_path)

  if not cache_path.exists():
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    try:
      metadata = synthesize_with_runtime(pack, runtime, text, cache_path)
      write_clip_metadata(metadata_path, metadata)
    except Exception:
      fallback_runtime = runtime.get("fallback_runtime")
      if not fallback_runtime:
        raise
      actual_runtime = fallback_runtime
      cache_key = hash_clip_key(pack, actual_runtime, text)
      cache_path = CLIP_CACHE_ROOT / f"{cache_key}.wav"
      metadata_path = clip_metadata_path(cache_key)
      metadata = load_clip_metadata(metadata_path)
      if not cache_path.exists():
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        metadata = synthesize_with_runtime(pack, actual_runtime, text, cache_path)
        write_clip_metadata(metadata_path, metadata)

  session_dir.mkdir(parents=True, exist_ok=True)
  session_path = session_dir / f"{clip_id}.wav"
  shutil.copy2(cache_path, session_path)
  return {
    "audio_path": session_path,
    "runtime": actual_runtime,
    "metadata": metadata,
  }


def materialize_clip_audio(pack: VoicePack, runtime: Dict[str, Any], text: str, session_dir: Path, clip_id: str) -> Tuple[Path, Dict[str, Any]]:
  asset = materialize_clip_asset(pack, runtime, text, session_dir, clip_id)
  return asset["audio_path"], asset["runtime"]


def ensure_clip_audio(pack: VoicePack, runtime: Dict[str, Any], text: str, session_dir: Path, clip_id: str) -> Path:
  session_path, _ = materialize_clip_audio(pack, runtime, text, session_dir, clip_id)
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


def normalize_subscribe_cta_text(requested_text: Any, trigger: str = "idle_gap") -> str:
  normalized_requested = re.sub(r"\s+", " ", str(requested_text or "").strip()).replace("\u2019", "'")
  for line in SUBSCRIBE_CTA_LINES:
    normalized_line = re.sub(r"\s+", " ", line.strip()).replace("\u2019", "'")
    if normalized_requested and normalized_line == normalized_requested:
      return line
  if trigger == "next_coin_handoff":
    return SUBSCRIBE_CTA_LINES[1]
  return SUBSCRIBE_CTA_LINES[0]


def build_summary_clips(payload: Dict[str, Any], voice_packs: List[VoicePack]) -> List[Dict[str, Any]]:
  coin_pair = payload.get("coin", {}).get("spoken_name") or payload.get("coin", {}).get("pair", "This market")
  summary = payload.get("summary") or {}
  bias_phrase = summary.get("bias_phrase") or summary.get("biasPhrase") or "mixed / neutral"
  top_patterns = summary.get("top_patterns") or summary.get("topPatterns") or []
  pattern_text = format_pattern_names(top_patterns)
  displayed_interval = spoken_timeframe_label(payload.get("displayed_interval") or "live")
  contributing_intervals = int(summary.get("contributing_intervals") or summary.get("contributingIntervals") or 0)
  primary_pattern = top_patterns[0] if top_patterns else {}
  primary_pattern_name = primary_pattern.get("name", "the lead structure")
  primary_pattern_intervals = ", ".join(primary_pattern.get("intervals", [])[:3]) or "the higher windows"
  secondary_pattern_text = format_pattern_names(top_patterns[1:3])
  narrator_pack = pick_voice_pack_by_role(voice_packs, "narrator", min(2, len(voice_packs) - 1))
  analyst_one_pack = pick_voice_pack_by_role(voice_packs, "analyst_1", 1 if len(voice_packs) > 1 else 0)
  analyst_two_pack = pick_voice_pack_by_role(voice_packs, "analyst_2", 0)

  return [
    {
      "speaker_id": narrator_pack.id,
      "speaker_label": narrator_pack.display_name,
      "text": (
        f"Welcome back. Now we are going to start {coin_pair} analysis. "
        f"{coin_pair} just completed its six timeframe read. "
        f"On the displayed {displayed_interval} chart, the market currently seems {bias_phrase}. "
        f"{max(1, contributing_intervals)} windows are still shaping the tape."
      ),
      "stage": "summary",
      "subtitle_color": narrator_pack.subtitle_color,
    },
    {
      "speaker_id": analyst_one_pack.id,
      "speaker_label": analyst_one_pack.display_name,
      "text": (
        f"Strongest pressure is still {pattern_text or primary_pattern_name}. "
        f"The clearest lead is {primary_pattern_name} around {primary_pattern_intervals}. "
        "That cluster is still leading."
      ),
      "stage": "summary",
      "subtitle_color": analyst_one_pack.subtitle_color,
    },
    {
      "speaker_id": analyst_two_pack.id,
      "speaker_label": analyst_two_pack.display_name,
      "text": (
        "I still want one clean reaction before leaning too hard. "
        "If the smaller windows start disagreeing, this read can cool quickly."
      ),
      "stage": "summary",
      "subtitle_color": analyst_two_pack.subtitle_color,
    },
    {
      "speaker_id": narrator_pack.id,
      "speaker_label": narrator_pack.display_name,
      "text": (
        f"Secondary pressure is also coming from {secondary_pattern_text or 'the rest of the stack'}, "
        "so this is broader than one candle move. "
        "Price still has to prove it."
      ),
      "stage": "summary",
      "subtitle_color": narrator_pack.subtitle_color,
    },
    {
      "speaker_id": analyst_one_pack.id,
      "speaker_label": analyst_one_pack.display_name,
      "text": (
        "Practical takeaway is simple. "
        "Respect the active pattern cluster, stay patient around confirmation, and do not treat this read like a fixed outcome."
      ),
      "stage": "summary",
      "subtitle_color": analyst_one_pack.subtitle_color,
    },
    {
      "speaker_id": narrator_pack.id,
      "speaker_label": narrator_pack.display_name,
      "text": "This is a live educational read, not financial advice. Now let us rotate through a quick headline sweep.",
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
    clips.append(
      {
        "speaker_id": narrator_pack.id,
        "speaker_label": narrator_pack.display_name,
        "text": f"Headline {index + 1}. {source} reports {headline}.",
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
      "text": "The headline feed is still refreshing, so the next rotation is waiting on the news tape.",
      "stage": "news",
      "subtitle_color": fallback_pack.subtitle_color,
      "meta": {"news_index": 0},
    }
  ]


def build_subscribe_cta_clips(payload: Dict[str, Any], voice_packs: List[VoicePack]) -> List[Dict[str, Any]]:
  narrator_pack = pick_voice_pack_by_role(voice_packs, "narrator", min(2, len(voice_packs) - 1))
  event = payload.get("event") or {}
  trigger = str(event.get("trigger") or "idle_gap")
  return [
    {
      "speaker_id": narrator_pack.id,
      "speaker_label": narrator_pack.display_name,
      "text": normalize_subscribe_cta_text(event.get("line") or event.get("text"), trigger),
      "stage": "subscribe_cta",
      "subtitle_color": narrator_pack.subtitle_color,
      "meta": {"trigger": trigger, "event_type": "subscribe_cta"},
    }
  ]


def build_live_event_clips(payload: Dict[str, Any], voice_packs: List[VoicePack]) -> List[Dict[str, Any]]:
  event = payload.get("event") or {}
  event_type = event.get("type", "chart_pattern_change")
  coin_pair = payload.get("coin", {}).get("spoken_name") or payload.get("coin", {}).get("pair", "This market")
  displayed_interval = spoken_timeframe_label(payload.get("displayed_interval") or "live")
  follow_up_transition = bool(event.get("follow_up_transition"))
  pattern_name = event.get("pattern_name", "a fresh live pattern")
  confidence = event.get("confidence", 0)
  lead_pattern_name = event.get("lead_pattern_name", "a fresh structure")
  lead_interval = spoken_timeframe_label(event.get("lead_interval", displayed_interval))
  impulse_direction = str(event.get("impulse_direction", "Neutral")).lower()
  move_pct = event.get("candle_move_pct", 0)
  strength_label = str(event.get("strength_label", "strong"))
  sma_20 = str(event.get("sma_20") or "").strip()
  sma_bias = str(event.get("sma_bias") or "").strip()
  fib_focus_label = str(event.get("fib_focus_label") or "").strip()
  fib_focus_value = str(event.get("fib_focus_value") or "").strip()
  fib_copy = f" Fib {fib_focus_label} near {fib_focus_value}." if fib_focus_label and fib_focus_value else ""
  sma_copy = f" 20 SMA at {sma_20}, price {sma_bias}." if sma_20 and sma_bias else ""
  live_tail = sma_copy or fib_copy
  live_tail = f" {live_tail}" if live_tail else ""
  analyst_one_pack = pick_voice_pack_by_role(voice_packs, "analyst_1", 0)
  analyst_two_pack = pick_voice_pack_by_role(voice_packs, "analyst_2", min(1, len(voice_packs) - 1))
  narrator_pack = pick_voice_pack_by_role(voice_packs, "narrator", min(2, len(voice_packs) - 1))

  if event_type == "warmup_intro":
    pack = analyst_one_pack
    text = (
      f"Welcome to {coin_pair} analysis. "
      f"Let us see how the market shapes into {pattern_name} on the displayed {displayed_interval}.{live_tail}"
    )
  elif event_type == "impulse_candle":
    pack = analyst_one_pack if impulse_direction == "bullish" else analyst_two_pack
    side_copy = "Bulls are pushing" if impulse_direction == "bullish" else "Bears are pressing"
    text = (
      f"{strength_label.title()} {impulse_direction} impulse on {displayed_interval}. "
      f"{side_copy}, about {move_pct} percent.{live_tail}"
    )
  elif event_type == "ambient_update":
    pack = analyst_two_pack
    confidence_copy = f" at {confidence} percent confidence" if confidence else ""
    text = (
      f"{coin_pair} on {displayed_interval} still looks like {pattern_name}{confidence_copy}.{live_tail}"
    )
  elif event_type == "timeframe_switch":
    pack = analyst_one_pack
    text = (
      f"Rotating into {displayed_interval}. Watching whether price respects {pattern_name or 'the current structure'}.{live_tail}"
    )
  elif event_type == "lead_pattern_change":
    pack = narrator_pack
    if follow_up_transition:
      text = (
        f"Looks like there is more manipulation now. The higher-timeframe lead has changed to {lead_pattern_name} "
        f"on {lead_interval}.{live_tail}"
      )
    else:
      text = (
        f"Higher timeframe lead is now {lead_pattern_name} on {lead_interval}.{live_tail}"
      )
  elif event_type == "exact_mtf_change":
    pack = narrator_pack
    text = (
      f"Exact multi-timeframe agreement just shifted to {event.get('confirmed_count', 0)} matching window"
      f"{'' if event.get('confirmed_count', 0) == 1 else 's'}.{live_tail}"
    )
  else:
    pack = analyst_two_pack
    if follow_up_transition:
      text = (
        f"Looks like there is more manipulation now. The pattern has changed to {pattern_name} "
        f"on {displayed_interval}.{live_tail}"
      )
    else:
      text = (
        f"{displayed_interval} now reads {pattern_name}"
        f"{f', {confidence} percent confidence' if confidence else ''}.{live_tail}"
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
  voice_packs = select_role_templates()
  if len(voice_packs) < 3:
    raise ValueError("Three voice packs are required for commentary planning")

  mode = payload.get("mode")
  if mode == "intermission_summary":
    return build_summary_clips(payload, voice_packs)
  if mode == "intermission_news":
    return build_news_clips(payload, voice_packs)
  if mode == "subscribe_cta":
    return build_subscribe_cta_clips(payload, voice_packs)
  if mode == "live_event":
    return build_live_event_clips(payload, voice_packs)
  raise ValueError(f"Unsupported commentary mode: {mode}")


def build_response_without_audio(payload: Dict[str, Any], sequence: List[Dict[str, Any]], runtimes: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
  session_id = uuid.uuid4().hex[:12]
  rendered = []
  total_duration_ms = 0
  for index, clip in enumerate(sequence):
    speaker_runtime = runtimes.get(clip["speaker_id"], {})
    speaker_pack = speaker_runtime.get("pack")
    speaker_label = active_voice_label(speaker_pack, speaker_runtime) if speaker_pack else clip.get("speaker_label", "")
    duration_ms = estimate_duration_ms(clip["text"])
    pause_ms = int(getattr(speaker_runtime.get("pack"), "pause_ms", DEFAULT_CLIP_PAUSE_MS))
    total_duration_ms += duration_ms + pause_ms
    rendered.append(
      {
        **clip,
        "speaker_label": speaker_label,
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
    "provider": provider_name_for_runtimes(runtimes),
    "sequence": rendered,
    "total_duration_ms": total_duration_ms,
    "voice_status": [
      serialize_voice_runtime(runtime["pack"], runtime)
      for runtime in runtimes.values()
      if runtime.get("pack")
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
  runtimes = {pack.id: resolve_voice_runtime(pack) for pack in select_role_templates()}

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
    asset = materialize_clip_asset(pack, runtime, clip["text"], session_dir, clip_id)
    audio_path = asset["audio_path"]
    actual_runtime = asset["runtime"]
    rendered_text = asset["metadata"].get("transcript") or clip["text"]
    runtimes[clip["speaker_id"]] = actual_runtime
    speaker_label = active_voice_label(pack, actual_runtime)
    duration_ms = audio_duration_ms(audio_path)
    total_duration_ms += duration_ms + pack.pause_ms
    rendered.append(
      {
        **clip,
        "text": rendered_text,
        "clip_id": clip_id,
        "speaker_label": speaker_label,
        "duration_ms": duration_ms,
        "pause_ms": pack.pause_ms,
        "audio_url": f"/api/audio/{session_id}/{clip_id}.wav",
      }
    )

  service_mode = service_mode_for_runtimes(runtimes)

  return {
    "session_id": session_id,
    "audio_enabled": True,
    "service_mode": service_mode,
    "provider": provider_name_for_runtimes(runtimes),
    "sequence": rendered,
    "total_duration_ms": total_duration_ms,
    "voice_status": [
      serialize_voice_runtime(runtime["pack"], runtime)
      for runtime in runtimes.values()
      if runtime.get("pack")
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
