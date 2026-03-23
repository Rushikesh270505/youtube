from __future__ import annotations

import unittest
from pathlib import Path
from unittest.mock import patch

import podcast_voice_engine


class PodcastVoiceEngineTests(unittest.TestCase):
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

  def test_live_brief_mode_generates_short_two_host_exchange(self) -> None:
    package = podcast_voice_engine.build_podcast_script(
      {
        "mode": "live_brief",
        "coin": {"pair": "ETH / USDT", "symbol": "ETH"},
        "displayed_interval": "15m",
        "lead_interval": "1h",
        "event": {
          "type": "chart_pattern_change",
          "pattern_name": "Descending Triangle",
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
    turns = package["turns"]

    self.assertEqual(len(turns), 3)
    self.assertTrue(all(turn["stage"] == "live" for turn in turns))
    self.assertIn("ETH / USDT", package["script_text"])
    self.assertRegex(package["script_text"], r"currently (seems|leans)")
    self.assertIn("2,050", package["script_text"])

  def test_script_structure_contains_summary_then_news_sequence(self) -> None:
    package = podcast_voice_engine.build_podcast_script(self.build_payload())
    turns = package["turns"]
    timeframe_turns = [turn for turn in turns if turn["stage"] == "timeframe"]
    summary_turns = [turn for turn in turns if turn["stage"] == "summary"]
    news_turns = [turn for turn in turns if turn["stage"] == "news"]

    self.assertEqual(len(timeframe_turns), 0)
    self.assertEqual(len(summary_turns), 4)
    self.assertEqual(len(news_turns), 2)
    self.assertEqual(summary_turns[0]["speaker_id"], "narrator")
    self.assertTrue(all(turn["speaker_id"] == "narrator" for turn in news_turns))
    self.assertIn("[Flo (English (US))]:", package["script_text"])
    self.assertRegex(turns[0]["text"], r"\.\.\.|\. ")

  @patch("podcast_voice_engine.get_podcast_voice_status")
  def test_render_returns_script_only_when_local_voice_packs_are_missing(self, status_mock) -> None:
    status_mock.return_value = {
      "provider": "local_voice_packs",
      "ready": False,
      "cast_ready": False,
      "speakers": [
        {"id": "analyst_1", "ready": False},
        {"id": "analyst_2", "ready": False},
        {"id": "narrator", "ready": False},
      ],
    }
    response = podcast_voice_engine.render_podcast_response(self.build_payload())
    self.assertFalse(response["ready"])
    self.assertFalse(response["audio_enabled"])
    self.assertFalse(response["missing"]["cast_ready"])
    self.assertGreaterEqual(len(response["transcript"]), 6)

  @patch("podcast_voice_engine.voice_service.ensure_clip_audio")
  @patch("podcast_voice_engine.voice_service.audio_duration_ms", return_value=900)
  @patch("podcast_voice_engine.get_podcast_voice_status")
  @patch("podcast_voice_engine.voice_service.resolve_voice_runtime")
  def test_render_can_merge_mock_local_audio(self, runtime_mock, status_mock, _duration_mock, ensure_mock) -> None:
    status_mock.return_value = {
      "provider": "local_voice_packs",
      "ready": True,
      "cast_ready": True,
      "speakers": [
        {"id": "analyst_1", "ready": True},
        {"id": "analyst_2", "ready": True},
        {"id": "narrator", "ready": True},
      ],
    }
    runtime_mock.return_value = {"available": True, "engine": "say"}

    def create_fake_wav(_pack, _runtime, _text, session_dir, clip_id):
      path = Path(session_dir) / f"{clip_id}.wav"
      path.parent.mkdir(parents=True, exist_ok=True)
      with podcast_voice_engine.wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(22050)
        wav_file.writeframes(b"\x00\x00" * 2205)
      return path

    ensure_mock.side_effect = create_fake_wav

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
