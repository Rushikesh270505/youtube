from __future__ import annotations

import shutil
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
TARGET_ROOT = REPO_ROOT / "app-resources"
STATIC_FILES = [
  "index.html",
  "app.js",
  "styles.css",
  "strategy-lab.html",
  "strategy-lab.js",
  "strategy-lab.css",
  "detectors.mjs",
  "intermission-utils.mjs",
  "voice-settings.html",
  "voice-settings.js",
]
STATIC_DIRS = [
  "assets",
  "voice_packs",
  "bgm",
]
IGNORE_PATTERNS = shutil.ignore_patterns("__pycache__", ".DS_Store")


def reset_target_root() -> None:
  if TARGET_ROOT.exists():
    shutil.rmtree(TARGET_ROOT)
  TARGET_ROOT.mkdir(parents=True, exist_ok=True)


def copy_file(relative_path: str) -> None:
  source = REPO_ROOT / relative_path
  if not source.exists():
    raise FileNotFoundError(f"Missing required app resource: {source}")
  destination = TARGET_ROOT / relative_path
  destination.parent.mkdir(parents=True, exist_ok=True)
  shutil.copy2(source, destination)


def copy_directory(relative_path: str) -> None:
  source = REPO_ROOT / relative_path
  if not source.exists():
    raise FileNotFoundError(f"Missing required app resource directory: {source}")
  destination = TARGET_ROOT / relative_path
  shutil.copytree(source, destination, dirs_exist_ok=True, ignore=IGNORE_PATTERNS)


def main() -> None:
  reset_target_root()
  for relative_path in STATIC_FILES:
    copy_file(relative_path)
  for relative_path in STATIC_DIRS:
    copy_directory(relative_path)
  print(f"Prepared app resources at {TARGET_ROOT}")


if __name__ == "__main__":
  main()
