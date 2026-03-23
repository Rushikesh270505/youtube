from __future__ import annotations

import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import server
import voice_service


class VoiceServiceTests(unittest.TestCase):
  def test_summary_commentary_stays_cautious(self) -> None:
    clips = voice_service.plan_commentary_sequence(
      {
        "mode": "intermission_summary",
        "coin": {"pair": "BTC / USDT"},
        "displayed_interval": "1h",
        "summary": {
          "bias_phrase": "mildly bearish",
          "top_patterns": [
            {"name": "Descending Triangle"},
            {"name": "Dead Cat Bounce"},
            {"name": "Stair Step Down"},
          ],
        },
        "voice_pack_ids": ["neutral_analyst", "high_energy_host", "calm_educator"],
      }
    )
    combined_text = " ".join(clip["text"] for clip in clips)
    self.assertEqual(len(clips), 4)
    self.assertEqual(clips[0]["speaker_id"], "calm_educator")
    self.assertIn("currently seems", combined_text)
    self.assertNotRegex(combined_text.lower(), r"\bconfirmed\b|\bdefinitely\b|\bwill\b")

  def test_news_commentary_uses_source_and_headline(self) -> None:
    clips = voice_service.plan_commentary_sequence(
      {
        "mode": "intermission_news",
        "news_items": [
          {
            "source": "CoinDesk",
            "title": "Bitcoin options signal extreme fear",
            "summary": "Investors remain defensive while downside protection keeps getting bid.",
          }
        ],
        "voice_pack_ids": ["neutral_analyst", "high_energy_host", "calm_educator"],
      }
    )
    self.assertEqual(clips[0]["stage"], "news")
    self.assertIn("CoinDesk", clips[0]["text"])
    self.assertIn("Bitcoin options signal extreme fear", clips[0]["text"])

  def test_live_commentary_stays_non_committal(self) -> None:
    clips = voice_service.plan_commentary_sequence(
      {
        "mode": "live_event",
        "coin": {"pair": "ETH / USDT"},
        "displayed_interval": "15m",
        "event": {
          "type": "lead_pattern_change",
          "lead_pattern_name": "Descending Triangle",
          "lead_interval": "4h",
        },
        "voice_pack_ids": ["neutral_analyst", "high_energy_host", "calm_educator"],
      }
    )
    self.assertEqual(len(clips), 1)
    self.assertIn("still a live read", clips[0]["text"])
    self.assertNotRegex(clips[0]["text"].lower(), r"\bconfirmed\b|\bdefinitely\b|\bwill\b")

  @patch("voice_service.available_say_voices", return_value={"Karen", "Flo (English (US))", "Tara"})
  @patch("voice_service.shutil.which")
  def test_runtime_prefers_local_say_fallback_when_piper_is_missing(self, which_mock, _say_voices) -> None:
    which_mock.side_effect = lambda command: "/usr/bin/say" if command == "say" else None
    pack = voice_service.load_voice_packs()["neutral_analyst"]
    runtime = voice_service.resolve_voice_runtime(pack)
    self.assertTrue(runtime["available"])
    self.assertEqual(runtime["engine"], "say")

  def test_render_endpoint_returns_ordered_sequence(self) -> None:
    with patch.object(
      server.voice_service,
      "render_commentary_response",
      return_value={
        "session_id": "demo123",
        "audio_enabled": False,
        "service_mode": "subtitle_only",
        "sequence": [
          {
            "speaker_id": "neutral_analyst",
            "speaker_label": "Axiom",
            "text": "BTC / USDT just completed its six-timeframe read.",
            "duration_ms": 1800,
            "pause_ms": 240,
            "audio_url": "",
            "stage": "summary",
            "subtitle_color": "#8ed8ff",
          }
        ],
        "total_duration_ms": 2040,
      },
    ):
      client = TestClient(server.app)
      response = client.post(
        "/api/commentary/render",
        json={
          "mode": "intermission_summary",
          "coin": {"pair": "BTC / USDT"},
          "voice_pack_ids": ["neutral_analyst", "high_energy_host", "calm_educator"],
        },
      )

    self.assertEqual(response.status_code, 200)
    payload = response.json()
    self.assertEqual(payload["session_id"], "demo123")
    self.assertEqual(payload["sequence"][0]["speaker_label"], "Axiom")

  def test_voices_endpoint_exposes_three_host_slots(self) -> None:
    with patch.object(
      server.voice_service,
      "list_voice_statuses",
      return_value={
        "default_voice_pack_ids": ["neutral_analyst", "high_energy_host", "calm_educator"],
        "cast_ready": True,
        "voices": [
          {"id": "neutral_analyst", "available": True},
          {"id": "high_energy_host", "available": True},
          {"id": "calm_educator", "available": True},
        ],
      },
    ):
      client = TestClient(server.app)
      response = client.get("/api/voices")

    self.assertEqual(response.status_code, 200)
    payload = response.json()
    self.assertEqual(payload["default_voice_pack_ids"][0], "neutral_analyst")
    self.assertEqual(len(payload["voices"]), 3)


if __name__ == "__main__":
  unittest.main()
