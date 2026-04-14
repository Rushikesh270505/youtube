#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
TRAINING_ROOT = BASE_DIR / "voice_assets" / "training_workspace"

PACKS = [
  {
    "pack_id": "high_energy_host",
    "display_name": "Alnilam",
    "role": "Analyst 1",
    "voice_goal": "Confident, sharp, slightly aggressive trader mindset",
  },
  {
    "pack_id": "neutral_analyst",
    "display_name": "Zephyr",
    "role": "Analyst 2",
    "voice_goal": "Calm, logical, data-driven strategist",
  },
  {
    "pack_id": "calm_educator",
    "display_name": "Achird",
    "role": "Narrator",
    "voice_goal": "Professional, warm, authoritative host",
  },
]

SAMPLE_LINES = [
  "Look at this. Price is testing a live support zone again.",
  "This pattern still looks constructive, but we need confirmation.",
  "Volume is improving here, and that changes the read a little.",
  "I am not fully convinced yet. The reaction still needs follow-through.",
  "Across the higher timeframes, the structure remains stable.",
  "This move may be leaning bullish, but let us see what happens next.",
  "Resistance is sitting just above the current impulse leg.",
  "The market is rotating, and momentum is not fully one-sided.",
  "A reclaim above this level could open the door to continuation.",
  "Failure to hold this zone may bring pressure back into the chart.",
  "Current headlines are keeping risk sentiment active across crypto.",
  "This stream is for educational purposes only, so always do your own research.",
]


def write_text(path: Path, content: str) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(content, encoding="utf-8")


def setup_pack(pack: dict) -> None:
  pack_root = TRAINING_ROOT / pack["pack_id"]
  raw_dir = pack_root / "raw_samples"
  processed_dir = pack_root / "processed_samples"
  manifests_dir = pack_root / "manifests"

  raw_dir.mkdir(parents=True, exist_ok=True)
  processed_dir.mkdir(parents=True, exist_ok=True)
  manifests_dir.mkdir(parents=True, exist_ok=True)

  manifest = {
    "pack_id": pack["pack_id"],
    "display_name": pack["display_name"],
    "role": pack["role"],
    "voice_goal": pack["voice_goal"],
    "target_runtime": "piper",
    "expected_output_model": f"voice_assets/{pack['pack_id']}/{pack['pack_id']}.onnx",
    "notes": [
      "Record clean mono WAV clips at 22050 Hz or higher.",
      "Keep room noise low and maintain consistent mic distance.",
      "Name raw clips sequentially, for example 001.wav, 002.wav.",
      "Use the prompts file as the transcript source for initial dataset collection.",
    ],
  }
  write_text(manifests_dir / "pack_manifest.json", json.dumps(manifest, indent=2))

  prompts = "\n".join(f"{index + 1:02d}|{line}" for index, line in enumerate(SAMPLE_LINES))
  write_text(pack_root / "prompts.txt", prompts + "\n")

  readme = "\n".join(
    [
      f"{pack['display_name']} local voice training workspace",
      "",
      f"Role: {pack['role']}",
      f"Target sound: {pack['voice_goal']}",
      "",
      "How to use:",
      "1. Record one clean WAV file per prompt into raw_samples/.",
      "2. Keep filenames aligned to prompts.txt numbering.",
      "3. Normalize / trim clips into processed_samples/.",
      "4. Export metadata.csv or Piper-compatible training manifests from this folder.",
      "5. Train or fine-tune your local model and place the final .onnx file into voice_assets/<pack_id>/.",
    ]
  )
  write_text(pack_root / "README.txt", readme + "\n")


def main() -> None:
  for pack in PACKS:
    setup_pack(pack)
  print(f"Training workspace ready at {TRAINING_ROOT}")


if __name__ == "__main__":
  main()
