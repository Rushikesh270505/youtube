from __future__ import annotations

import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import server
import voice_service


class VoiceServiceTests(unittest.TestCase):
  def setUp(self) -> None:
    self.temp_dir = tempfile.TemporaryDirectory()
    self.original_assignments_root = voice_service.VOICE_ASSIGNMENTS_ROOT
    self.original_assignments_path = voice_service.VOICE_ASSIGNMENTS_PATH
    voice_service.VOICE_ASSIGNMENTS_ROOT = Path(self.temp_dir.name)
    voice_service.VOICE_ASSIGNMENTS_PATH = voice_service.VOICE_ASSIGNMENTS_ROOT / "voice_assignments.json"
    voice_service._LOCAL_VOICE_CATALOG_CACHE = []
    voice_service._LOCAL_VOICE_CATALOG_CACHE_AT = 0
    voice_service._SAY_VOICE_CACHE = None

  def tearDown(self) -> None:
    voice_service.VOICE_ASSIGNMENTS_ROOT = self.original_assignments_root
    voice_service.VOICE_ASSIGNMENTS_PATH = self.original_assignments_path
    voice_service._LOCAL_VOICE_CATALOG_CACHE = []
    voice_service._LOCAL_VOICE_CATALOG_CACHE_AT = 0
    voice_service._SAY_VOICE_CACHE = None
    self.temp_dir.cleanup()

  @staticmethod
  def sample_catalog() -> list[dict[str, str]]:
    return [
      {
        "voice_name": "Samantha (English (US))",
        "display_name": "Samantha",
        "locale": "en_US",
        "accent_label": "English (US)",
        "gender": "Female",
      },
      {
        "voice_name": "Daniel (English (UK))",
        "display_name": "Daniel",
        "locale": "en_GB",
        "accent_label": "English (UK)",
        "gender": "Male",
      },
      {
        "voice_name": "Aman (English (India))",
        "display_name": "Aman",
        "locale": "en_IN",
        "accent_label": "English (India)",
        "gender": "Male",
      },
    ]

  def test_local_voice_catalog_filters_to_english_human_voices(self) -> None:
    completed = subprocess.CompletedProcess(
      args=["osascript"],
      returncode=0,
      stdout="\n".join(
        [
          "Samantha (English (US))\ten_US\tVoiceGenderFemale",
          "Daniel (English (UK))\ten_GB\tVoiceGenderMale",
          "Albert\ten_US\tVoiceGenderNeuter",
          "Amelie\tfr_CA\tVoiceGenderFemale",
          "Samantha (English (US))\ten_US\tVoiceGenderFemale",
        ]
      ),
      stderr="",
    )
    with patch("voice_service.subprocess.run", return_value=completed), patch(
      "voice_service.available_say_voices",
      return_value={"Samantha (English (US))", "Daniel (English (UK))", "Albert", "Amelie"},
    ):
      catalog = voice_service.list_local_voice_catalog(force_refresh=True)

    self.assertEqual([voice["voice_name"] for voice in catalog], ["Samantha (English (US))", "Daniel (English (UK))"])
    self.assertTrue(all(voice["locale"].startswith("en_") for voice in catalog))
    self.assertEqual({voice["gender"] for voice in catalog}, {"Female", "Male"})

  @patch("voice_service.list_local_voice_catalog")
  def test_voice_assignments_persist_and_allow_duplicate_reuse(self, catalog_mock) -> None:
    catalog_mock.return_value = self.sample_catalog()

    initial = voice_service.get_voice_assignments()
    self.assertTrue(voice_service.VOICE_ASSIGNMENTS_PATH.exists())
    self.assertEqual(set(initial["roles"]), {"analyst_1", "analyst_2", "host"})

    updated = voice_service.update_voice_assignment("analyst_1", "Daniel (English (UK))")
    updated = voice_service.update_voice_assignment("analyst_2", "Daniel (English (UK))")

    reloaded = voice_service.get_voice_assignments()
    self.assertEqual(updated["roles"]["analyst_1"], "Daniel (English (UK))")
    self.assertEqual(updated["roles"]["analyst_2"], "Daniel (English (UK))")
    self.assertEqual(reloaded["roles"]["analyst_1"], "Daniel (English (UK))")
    self.assertEqual(reloaded["roles"]["analyst_2"], "Daniel (English (UK))")
    self.assertGreaterEqual(reloaded["version"], 2)

  @patch("voice_service.list_local_voice_catalog")
  def test_voice_assignment_rejects_unknown_voice(self, catalog_mock) -> None:
    catalog_mock.return_value = self.sample_catalog()
    with self.assertRaises(ValueError):
      voice_service.update_voice_assignment("host", "Unknown Voice")

  @patch("voice_service.audio_duration_ms", return_value=900)
  @patch("voice_service.materialize_clip_asset")
  @patch("voice_service.cleanup_audio_cache")
  @patch("voice_service.shutil.which", return_value="/usr/bin/say")
  @patch("voice_service.available_say_voices")
  @patch("voice_service.get_voice_assignments")
  def test_render_commentary_uses_assigned_host_voice_for_lead_alerts(
    self,
    assignments_mock,
    available_voices_mock,
    _which_mock,
    _cleanup_mock,
    materialize_mock,
    _duration_mock,
  ) -> None:
    assignments_mock.return_value = {
      "version": 3,
      "updated_at": "2026-03-26T12:00:00Z",
      "roles": {
        "analyst_1": "Daniel (English (UK))",
        "analyst_2": "Samantha (English (US))",
        "host": "Aman (English (India))",
      },
    }
    available_voices_mock.return_value = {"Daniel (English (UK))", "Samantha (English (US))", "Aman (English (India))"}
    fake_audio = Path(self.temp_dir.name) / "01-host.wav"
    fake_audio.write_bytes(b"RIFFdemo")
    materialize_mock.side_effect = lambda _pack, runtime, _text, _session_dir, _clip_id: {
      "audio_path": fake_audio,
      "runtime": runtime,
      "metadata": {},
    }

    response = voice_service.render_commentary_response(
      {
        "mode": "live_event",
        "coin": {"pair": "ETH / USDT"},
        "displayed_interval": "15m",
        "event": {
          "type": "lead_pattern_change",
          "lead_pattern_name": "Descending Triangle",
          "lead_interval": "4h",
        },
      }
    )

    self.assertTrue(response["audio_enabled"])
    self.assertEqual(response["sequence"][0]["speaker_id"], "host")
    self.assertEqual(response["sequence"][0]["speaker_label"], "Aman (English (India))")
    self.assertTrue(any(item["id"] == "host" for item in response["voice_status"]))

  def test_plan_commentary_sequence_supports_subscribe_cta(self) -> None:
    sequence = voice_service.plan_commentary_sequence(
      {
        "mode": "subscribe_cta",
        "event": {
          "trigger": "idle_gap",
          "line": "Join the crew, hit subscribe, and keep this live chart energy rolling.",
        },
      }
    )

    self.assertEqual(len(sequence), 1)
    self.assertEqual(sequence[0]["speaker_id"], "host")
    self.assertEqual(sequence[0]["stage"], "subscribe_cta")
    self.assertEqual(sequence[0]["text"], "Join the crew, hit subscribe, and keep this live chart energy rolling.")
    self.assertEqual(sequence[0]["meta"]["trigger"], "idle_gap")

  def test_voice_catalog_endpoint_returns_grouped_catalog(self) -> None:
    payload = {
      "voices": self.sample_catalog(),
      "voices_by_gender": {
        "Female": [self.sample_catalog()[0]],
        "Male": self.sample_catalog()[1:],
      },
      "assignments": {
        "version": 2,
        "updated_at": "2026-03-26T12:00:00Z",
        "roles": {
          "analyst_1": "Daniel (English (UK))",
          "analyst_2": "Samantha (English (US))",
          "host": "Aman (English (India))",
        },
      },
    }
    with patch.object(server.voice_service, "voice_catalog_payload", return_value=payload):
      client = TestClient(server.app)
      response = client.get("/api/voice-catalog")

    self.assertEqual(response.status_code, 200)
    body = response.json()
    self.assertEqual(body["assignments"]["roles"]["host"], "Aman (English (India))")
    self.assertEqual(len(body["voices_by_gender"]["Female"]), 1)

  def test_voice_assignment_endpoint_updates_role(self) -> None:
    updated = {
      "version": 4,
      "updated_at": "2026-03-26T12:00:00Z",
      "roles": {
        "analyst_1": "Daniel (English (UK))",
        "analyst_2": "Samantha (English (US))",
        "host": "Aman (English (India))",
      },
    }
    with patch.object(server.voice_service, "update_voice_assignment", return_value=updated):
      client = TestClient(server.app)
      response = client.post(
        "/api/voice-assignments",
        json={"role": "host", "voice_name": "Aman (English (India))"},
      )

    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.json()["roles"]["host"], "Aman (English (India))")


if __name__ == "__main__":
  unittest.main()
