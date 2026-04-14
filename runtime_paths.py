from __future__ import annotations

import os
import sys
from pathlib import Path


SOURCE_ROOT = Path(__file__).resolve().parent
APP_RESOURCE_ENV = "CRYPTO_LIVE_APP_RESOURCES"


def _valid_path(value: str) -> Path | None:
  candidate = Path(value).expanduser().resolve()
  return candidate if candidate.exists() else None


def app_resource_dir() -> Path:
  override = os.environ.get(APP_RESOURCE_ENV, "").strip()
  if override:
    candidate = _valid_path(override)
    if candidate is not None:
      return candidate

  meipass = getattr(sys, "_MEIPASS", "")
  if meipass:
    candidate = _valid_path(meipass)
    if candidate is not None:
      return candidate

  return SOURCE_ROOT


def app_resource_path(*parts: str) -> Path:
  return app_resource_dir().joinpath(*parts)
