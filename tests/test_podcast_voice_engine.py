from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import podcast_voice_engine
import voice_service


class PodcastVoiceEngineTests(unittest.TestCase):
  @staticmethod
  def assignments() -> dict:
    return {
      "version": 2,
      "updated_at": "2026-03-26T12:00:00Z",
      "roles": {
        "analyst_1": "Daniel (English (UK))",
        "analyst_2": "Samantha (English (US))",
        "host": "Aman (English (India))",
      },
    }

  def build_payload(self) -> dict:
    return {
      "coin": {"pair": "BTC / USDT", "symbol": "BTC"},
      "timeframes": {
        "1m": {"pattern_name": "Micro Flag", "direction": "Bullish", "confidence": 76, "support": "67,800", "resistance": "68,020", "breakout_probability": 0.58, "reasoning": "impulse is still holding"},
        "5m": {"pattern_name": "Bull Flag Echo", "direction": "Bullish", "confidence": 81, "support": "67,650", "resistance": "68,120", "breakout_probability": 0.62, "reasoning": "pullback looks controlled"},
        "15m": {"pattern_name": "Ascending Triangle", "direction": "Bullish", "confidence": 84, "support": "67,400", "resistance": "68,200", "breakout_probability": 0.67, "reasoning": "pressure is building under resistance"},
        "30m": {"pattern_name": "Cup and Handle", "direction": "Bullish", "confidence": 79, "support": "66,900", "resistance": "68,450", "breakout_probability": 0.61, "reasoning": "the handle is staying tight"},
        "1h": {"pattern_name": "Ascending Channel", "direction": "Bullish", "confidence": 75, "support": "65,800", "resistance": "69,100", "breakout_probability": 0.56, "reasoning": "higher lows are still intact"},
        "4h": {"pattern_name": "Rounded Bottom", "direction": "Bullish", "confidence": 73, "support": "62,400", "resistance": "70,500", "breakout_probability": 0.54, "reasoning": "macro recovery still looks constructive"},
      },
      "news_items": [
        {"source": "CoinDesk", "title": "Bitcoin ETF inflows rebound", "summary": "Institutional demand appears to be stabilizing."},
        {"source": "Cointelegraph", "title": "Ethereum staking hits new milestone", "summary": "Long-term network participation remains elevated."},
      ],
    }

  def role_templates(self) -> list[voice_service.VoicePack]:
    assignments = self.assignments()
    return [voice_service.build_role_template(role_id, assignments) for role_id in voice_service.VOICE_ROLE_ORDER]

  @patch("podcast_voice_engine.voice_service.shutil.which", return_value="/usr/bin/say")
  @patch("podcast_voice_engine.voice_service.available_say_voices")
  @patch("podcast_voice_engine.voice_service.get_voice_assignments")
  def test_resolve_cast_maps_host_assignment_to_narrator_slot(
    self,
    assignments_mock,
    available_voices_mock,
    _which_mock,
  ) -> None:
    assignments_mock.return_value = self.assignments()
    available_voices_mock.return_value = {"Daniel (English (UK))", "Samantha (English (US))", "Aman (English (India))"}

    cast = podcast_voice_engine.resolve_cast()

    self.assertEqual(cast["host"].voice_pack_id, "host")
    self.assertEqual(cast["narrator"].voice_pack_id, "host")
    self.assertEqual(cast["narrator"].name, "Aman (English (India))")

  @patch("podcast_voice_engine.voice_service.shutil.which", return_value="/usr/bin/say")
  @patch("podcast_voice_engine.voice_service.available_say_voices")
  @patch("podcast_voice_engine.voice_service.get_voice_assignments")
  def test_script_structure_contains_summary_then_news_sequence_with_host_voice(
    self,
    assignments_mock,
    available_voices_mock,
    _which_mock,
  ) -> None:
    assignments_mock.return_value = self.assignments()
    available_voices_mock.return_value = {"Daniel (English (UK))", "Samantha (English (US))", "Aman (English (India))"}

    package = podcast_voice_engine.build_podcast_script(self.build_payload())
    turns = package["turns"]
    summary_turns = [turn for turn in turns if turn["stage"] == "summary"]
    news_turns = [turn for turn in turns if turn["stage"] == "news"]

    self.assertGreaterEqual(len(summary_turns), 6)
    self.assertTrue(all(turn["speaker_id"] == "narrator" for turn in news_turns))
    self.assertEqual(summary_turns[0]["speaker_name"], "Aman (English (India))")
    self.assertIn("[Aman (English (India))]:", package["script_text"])

  @patch("podcast_voice_engine.voice_service.shutil.which", return_value="/usr/bin/say")
  @patch("podcast_voice_engine.voice_service.available_say_voices")
  @patch("podcast_voice_engine.voice_service.get_voice_assignments")
  def test_live_brief_uses_host_for_high_level_lead_alerts(
    self,
    assignments_mock,
    available_voices_mock,
    _which_mock,
  ) -> None:
    assignments_mock.return_value = self.assignments()
    available_voices_mock.return_value = {"Daniel (English (UK))", "Samantha (English (US))", "Aman (English (India))"}

    package = podcast_voice_engine.build_podcast_script(
      {
        "mode": "live_brief",
        "coin": {"pair": "ETH / USDT", "symbol": "ETH"},
        "displayed_interval": "15m",
        "lead_interval": "1h",
        "event": {
          "type": "lead_pattern_change",
          "lead_pattern_name": "Descending Triangle",
          "confidence": 82,
        },
        "live_context": {
          "direction": "Bearish",
          "support": "2,050",
          "resistance": "2,110",
          "rationale": "lower highs are pressing into support",
          "lead_pattern_name": "Descending Triangle",
          "lead_direction": "Bearish",
          "lead_confidence": 86,
        },
      }
    )

    self.assertEqual(len(package["turns"]), 3)
    self.assertEqual(package["turns"][-1]["speaker_id"], "narrator")
    self.assertEqual(package["turns"][-1]["speaker_name"], "Aman (English (India))")

  @patch("podcast_voice_engine.voice_service.shutil.which", return_value="/usr/bin/say")
  @patch("podcast_voice_engine.voice_service.available_say_voices")
  @patch("podcast_voice_engine.voice_service.get_voice_assignments")
  def test_subscribe_cta_mode_uses_narrator_and_keeps_requested_line(
    self,
    assignments_mock,
    available_voices_mock,
    _which_mock,
  ) -> None:
    assignments_mock.return_value = self.assignments()
    available_voices_mock.return_value = {"Daniel (English (UK))", "Samantha (English (US))", "Aman (English (India))"}

    package = podcast_voice_engine.build_podcast_script(
      {
        "mode": "subscribe_cta",
        "coin": {"pair": "BTC / USDT", "symbol": "BTC"},
        "event": {
          "trigger": "next_coin_handoff",
          "line": "Hit like, hit subscribe, and stay locked in for the next setup.",
        },
      }
    )

    self.assertEqual(len(package["turns"]), 1)
    self.assertEqual(package["turns"][0]["speaker_id"], "narrator")
    self.assertEqual(package["turns"][0]["stage"], "subscribe_cta")
    self.assertEqual(package["turns"][0]["plain_text"], "Hit like, hit subscribe, and stay locked in for the next setup.")
    self.assertIn("Hit like, hit subscribe", package["script_text"])

  @patch("podcast_voice_engine.build_podcast_script")
  @patch("podcast_voice_engine.get_podcast_voice_status")
  def test_render_returns_script_only_when_local_voice_assignments_are_missing(self, status_mock, build_script_mock) -> None:
    build_script_mock.return_value = {
      "mode": "intermission_full",
      "turns": [
        {
          "speaker_id": "narrator",
          "speaker_name": "Aman (English (India))",
          "voice_pack_id": "host",
          "subtitle_color": "#ffd58b",
          "plain_text": "BTC / USDT still looks mixed.",
          "text": "BTC / USDT still looks mixed.",
          "stage": "summary",
        },
        {
          "speaker_id": "analyst_1",
          "speaker_name": "Daniel (English (UK))",
          "voice_pack_id": "analyst_1",
          "subtitle_color": "#6ee7ff",
          "plain_text": "I still want follow-through.",
          "text": "I still want follow-through.",
          "stage": "summary",
        },
      ],
      "script_text": "[Aman]: BTC / USDT still looks mixed.",
    }
    status_mock.return_value = {
      "provider": "local_voice_packs",
      "ready": False,
      "cast_ready": False,
      "speakers": [
        {"id": "analyst_1", "ready": False},
        {"id": "analyst_2", "ready": False},
        {"id": "host", "ready": False},
      ],
    }

    response = podcast_voice_engine.render_podcast_response(self.build_payload())

    self.assertFalse(response["ready"])
    self.assertFalse(response["audio_enabled"])
    self.assertFalse(response["missing"]["cast_ready"])
    self.assertEqual(response["script"][0]["voice_pack_id"], "host")

  @patch("podcast_voice_engine.voice_service.materialize_clip_audio")
  @patch("podcast_voice_engine.voice_service.audio_duration_ms", return_value=900)
  @patch("podcast_voice_engine.voice_service.resolve_voice_runtime")
  @patch("podcast_voice_engine.voice_service.select_role_templates")
  @patch("podcast_voice_engine.get_podcast_voice_status")
  @patch("podcast_voice_engine.build_podcast_script")
  def test_render_can_merge_mock_local_audio(
    self,
    build_script_mock,
    status_mock,
    select_templates_mock,
    runtime_mock,
    _duration_mock,
    materialize_mock,
  ) -> None:
    build_script_mock.return_value = {
      "mode": "intermission_full",
      "turns": [
        {
          "speaker_id": "narrator",
          "speaker_name": "Aman (English (India))",
          "voice_pack_id": "host",
          "subtitle_color": "#ffd58b",
          "plain_text": "BTC / USDT still looks mixed.",
          "text": "BTC / USDT still looks mixed.",
          "stage": "summary",
        },
        {
          "speaker_id": "analyst_1",
          "speaker_name": "Daniel (English (UK))",
          "voice_pack_id": "analyst_1",
          "subtitle_color": "#6ee7ff",
          "plain_text": "I still want follow-through.",
          "text": "I still want follow-through.",
          "stage": "summary",
        },
      ],
      "script_text": "[Aman]: BTC / USDT still looks mixed.",
    }
    status_mock.return_value = {
      "provider": "local_voice_packs",
      "ready": True,
      "cast_ready": True,
      "assignments": self.assignments(),
      "speakers": [
        {"id": "analyst_1", "ready": True},
        {"id": "analyst_2", "ready": True},
        {"id": "host", "ready": True},
      ],
    }
    select_templates_mock.return_value = self.role_templates()

    def runtime_for(pack: voice_service.VoicePack) -> dict:
      return {
        "available": True,
        "engine": "say",
        "configured_engine": "say",
        "status": "ready",
        "pack": pack,
        "say_voice": pack.fallback_system_voice,
        "fallback_active": False,
      }

    runtime_mock.side_effect = runtime_for

    def create_fake_wav(_pack, runtime, _text, session_dir, clip_id):
      path = Path(session_dir) / f"{clip_id}.wav"
      path.parent.mkdir(parents=True, exist_ok=True)
      with podcast_voice_engine.wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(22050)
        wav_file.writeframes(b"\x00\x00" * 2205)
      return path, runtime

    materialize_mock.side_effect = create_fake_wav

    response = podcast_voice_engine.render_podcast_response(self.build_payload())

    self.assertTrue(response["ready"])
    self.assertTrue(response["audio_enabled"])
    self.assertTrue(response["merged_audio_url"].endswith("podcast-full.wav"))
    merged_path = podcast_voice_engine.podcast_audio_file_path(
      response["merged_audio_url"].split("/")[-2],
      response["merged_audio_url"].split("/")[-1],
    )
    self.assertTrue(merged_path.exists())
    self.assertGreater(merged_path.stat().st_size, 44)


if __name__ == "__main__":
  unittest.main()
