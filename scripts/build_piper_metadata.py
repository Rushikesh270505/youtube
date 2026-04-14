#!/usr/bin/env python3
from __future__ import annotations

import csv
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
TRAINING_ROOT = BASE_DIR / "voice_assets" / "training_workspace"
SUPPORTED_AUDIO_EXTENSIONS = (".wav", ".flac")


def load_prompts(prompts_path: Path) -> dict[str, str]:
  prompts: dict[str, str] = {}
  if not prompts_path.exists():
    return prompts
  for raw_line in prompts_path.read_text(encoding="utf-8").splitlines():
    line = raw_line.strip()
    if not line or "|" not in line:
      continue
    key, text = line.split("|", 1)
    prompts[key.strip()] = text.strip()
  return prompts


def find_audio_file(processed_dir: Path, key: str) -> Path | None:
  for extension in SUPPORTED_AUDIO_EXTENSIONS:
    candidate = processed_dir / f"{key}{extension}"
    if candidate.exists():
      return candidate
  return None


def build_pack_metadata(pack_dir: Path) -> tuple[Path, int, int]:
  prompts = load_prompts(pack_dir / "prompts.txt")
  processed_dir = pack_dir / "processed_samples"
  manifests_dir = pack_dir / "manifests"
  manifests_dir.mkdir(parents=True, exist_ok=True)
  metadata_path = manifests_dir / "metadata.csv"

  rows: list[tuple[str, str]] = []
  missing = 0
  for key, transcript in prompts.items():
    audio_path = find_audio_file(processed_dir, key)
    if audio_path is None:
      missing += 1
      continue
    rows.append((str(audio_path.relative_to(pack_dir)), transcript))

  with metadata_path.open("w", encoding="utf-8", newline="") as handle:
    writer = csv.writer(handle, delimiter="|")
    for relative_audio_path, transcript in rows:
      writer.writerow((relative_audio_path, transcript))

  return metadata_path, len(rows), missing


def main() -> None:
  if not TRAINING_ROOT.exists():
    raise SystemExit(f"Training workspace not found: {TRAINING_ROOT}")

  pack_dirs = sorted(path for path in TRAINING_ROOT.iterdir() if path.is_dir())
  if not pack_dirs:
    raise SystemExit("No training packs found.")

  for pack_dir in pack_dirs:
    metadata_path, written_rows, missing_rows = build_pack_metadata(pack_dir)
    print(f"{pack_dir.name}: wrote {written_rows} rows to {metadata_path} ({missing_rows} prompts still missing audio)")


if __name__ == "__main__":
  main()
