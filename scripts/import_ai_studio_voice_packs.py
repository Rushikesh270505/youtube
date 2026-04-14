#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = Path("/Users/rushikeshkatari/Desktop/new voice packs")
HOSTS_MANIFEST = REPO_ROOT / "voice_packs" / "hosts.json"
IMPORT_ROOT = REPO_ROOT / "voice_assets" / "imported_ai_studio"

PACK_MAP = [
  {
    "source_dir": "analyst-1",
    "pack_id": "high_energy_host",
    "display_name": "Daniel",
    "google_voice_name": "Zephyr",
    "google_model_id": "gemini-2.5-flash-native-audio-preview-12-2025",
    "fallback_system_voice": "Daniel (English (UK))",
    "role": "High-energy host",
    "podcast_role": "analyst_1",
    "speed": 1.08,
    "pause_ms": 220,
    "say_rate": 188,
  },
  {
    "source_dir": "analyst-2",
    "pack_id": "neutral_analyst",
    "display_name": "Daniel",
    "google_voice_name": "Zephyr",
    "google_model_id": "gemini-2.5-flash-native-audio-preview-12-2025",
    "fallback_system_voice": "Daniel (English (UK))",
    "role": "Neutral analyst",
    "podcast_role": "analyst_2",
    "speed": 1.0,
    "pause_ms": 260,
    "say_rate": 188,
  },
  {
    "source_dir": "host",
    "pack_id": "calm_educator",
    "display_name": "Daniel",
    "google_voice_name": "Zephyr",
    "google_model_id": "gemini-2.5-flash-native-audio-preview-12-2025",
    "fallback_system_voice": "Daniel (English (UK))",
    "role": "Calm educator",
    "podcast_role": "narrator",
    "speed": 0.94,
    "pause_ms": 300,
    "say_rate": 188,
  },
]


def first_project_dir(source_dir: Path) -> Path | None:
  candidates = [entry for entry in source_dir.iterdir() if entry.is_dir() and not entry.name.startswith(".")]
  return sorted(candidates)[0] if candidates else None


def build_import_manifest(mapping: dict, project_dir: Path) -> dict:
  metadata_path = project_dir / "metadata.json"
  metadata = {}
  if metadata_path.exists():
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
  return {
    "id": mapping["pack_id"],
    "display_name": mapping["display_name"],
    "source_type": "ai_studio_voice_library",
    "source_project_dir": str(project_dir),
    "source_metadata": metadata,
    "local_runtime": {
      "engine": "say",
      "google_voice_name": mapping["google_voice_name"],
      "google_model_id": mapping["google_model_id"],
      "fallback_system_voice": mapping["fallback_system_voice"],
      "conversion_note": "This project is currently configured to use the local macOS Daniel voice for low-latency playback. Gemini voice metadata is kept only as reference if you want to switch back later.",
    },
  }


def update_hosts_manifest() -> None:
  hosts = json.loads(HOSTS_MANIFEST.read_text(encoding="utf-8"))
  voices_by_id = {voice["id"]: voice for voice in hosts.get("voices", [])}

  IMPORT_ROOT.mkdir(parents=True, exist_ok=True)

  for mapping in PACK_MAP:
    source_dir = SOURCE_ROOT / mapping["source_dir"]
    project_dir = first_project_dir(source_dir)
    if not project_dir:
      continue

    imported_dir = IMPORT_ROOT / mapping["pack_id"]
    imported_dir.mkdir(parents=True, exist_ok=True)
    import_manifest = build_import_manifest(mapping, project_dir)
    (imported_dir / "import_manifest.json").write_text(
      json.dumps(import_manifest, indent=2),
      encoding="utf-8",
    )
    (imported_dir / "README.txt").write_text(
      "\n".join(
        [
          f"Imported from: {project_dir}",
          f"Display name: {mapping['display_name']}",
          f"Gemini voice: {mapping['google_voice_name']}",
          f"Fallback voice: {mapping['fallback_system_voice']}",
          "Status: Local macOS Daniel voice",
          "Gemini metadata is preserved as reference only. The active runtime stays on the local Daniel voice for low-latency commentary.",
        ]
      ),
      encoding="utf-8",
    )

    voice = voices_by_id.get(mapping["pack_id"])
    if not voice:
      continue
    voice["display_name"] = mapping["display_name"]
    voice["role"] = mapping["role"]
    voice["podcast_role"] = mapping["podcast_role"]
    voice["engine"] = "say"
    voice["model_path"] = ""
    voice["speaker_id"] = None
    voice["speed"] = mapping["speed"]
    voice["gain"] = 1.0
    voice["pause_ms"] = mapping["pause_ms"]
    voice["subtitle_color"] = "#ffffff"
    voice["optional"] = False
    voice["fallback_system_voice"] = mapping["fallback_system_voice"]
    voice["say_rate"] = mapping["say_rate"]
    voice["google_voice_name"] = mapping["google_voice_name"]
    voice["google_model_id"] = mapping["google_model_id"]

  HOSTS_MANIFEST.write_text(json.dumps(hosts, indent=2), encoding="utf-8")


if __name__ == "__main__":
  update_hosts_manifest()
  print(f"Imported AI Studio packs into {IMPORT_ROOT}")
