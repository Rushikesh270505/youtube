from __future__ import annotations

import contextlib
import html
import re
import tempfile
import time
import uuid
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import voice_service


PODCAST_CACHE_ROOT = Path(tempfile.gettempdir()) / "crypto_overlay_podcast_cache"
PODCAST_SESSION_ROOT = PODCAST_CACHE_ROOT / "sessions"
PODCAST_SESSION_ROOT.mkdir(parents=True, exist_ok=True)

DEFAULT_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h"]
DEFAULT_OUTPUT_FORMAT = "wav_22050"
DEFAULT_MODEL_ID = voice_service.DEFAULT_GEMINI_TTS_MODEL
SPEAKER_PAUSE_MS = {
  "analyst_1": 240,
  "analyst_2": 320,
  "narrator": 380,
}


@dataclass(frozen=True)
class PodcastSpeaker:
  id: str
  name: str
  role: str
  voice_pack_id: str
  subtitle_color: str
  runtime_engine: str


def clamp(value: float, minimum: float, maximum: float) -> float:
  return max(minimum, min(maximum, value))


def safe_float(value: Any, fallback: float = 0.0) -> float:
  try:
    return float(value)
  except (TypeError, ValueError):
    return fallback


def strip_tags(value: str) -> str:
  text = re.sub(r"<[^>]+>", " ", value or "")
  return html.unescape(re.sub(r"\s+", " ", text)).strip()


def seed_value(seed_key: str) -> int:
  return sum((index + 1) * ord(char) for index, char in enumerate(seed_key))


def pick_phrase(options: List[str], seed_key: str) -> str:
  if not options:
    return ""
  total = seed_value(seed_key)
  return options[total % len(options)]


def maybe_fill(seed_key: str, options: List[str], threshold: int = 55) -> str:
  total = seed_value(seed_key)
  return pick_phrase(options, seed_key) if total % 100 < threshold else ""


def break_tag(duration_ms: int) -> str:
  return f'<break time="{duration_ms}ms"/>'


def emphasis(text: str) -> str:
  return f'<emphasis level="moderate">{text}</emphasis>'


def dynamic_break(seed_key: str, short_ms: int = 260, medium_ms: int = 420, long_ms: int = 580) -> str:
  total = seed_value(seed_key)
  options = [" ", "... ", ". "]
  return options[total % len(options)]


def clean_reasoning(reasoning: str) -> str:
  cleaned = strip_tags(reasoning or "")
  if not cleaned:
    return "the structure is still developing."
  cleaned = cleaned[0].lower() + cleaned[1:] if len(cleaned) > 1 else cleaned.lower()
  if cleaned.endswith("."):
    return cleaned
  return f"{cleaned}."


def level_phrase(label: str, fallback: str) -> str:
  return label if label else fallback


def spoken_timeframe(interval: str) -> str:
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


def compare_with_previous(entry: Dict[str, Any], previous_entry: Optional[Dict[str, Any]]) -> str:
  if not previous_entry:
    return "This is the first read in the stack, so it sets the tone."
  previous_interval = spoken_timeframe(previous_entry["interval"])
  if previous_entry["direction"] == entry["direction"]:
    if entry["direction"] == "Bullish":
      return f"The bullish pressure from the {previous_interval} window is still carrying into this one."
    if entry["direction"] == "Bearish":
      return f"The downside pressure from the {previous_interval} window is still carrying into this one."
    return f"The mixed read from the {previous_interval} window is still hanging around here."
  return f"This is where the {previous_interval} read starts to shift, so I want to treat it with a bit more care."


def normalize_timeframe_entry(interval: str, raw: Dict[str, Any]) -> Dict[str, Any]:
  support = raw.get("support") or raw.get("support_level") or raw.get("key_support")
  resistance = raw.get("resistance") or raw.get("resistance_level") or raw.get("key_resistance")
  breakout_probability = safe_float(raw.get("breakout_probability") or raw.get("breakoutProbability"), 0.0)
  confidence = int(round(safe_float(raw.get("confidence"), 0)))
  direction = str(raw.get("direction") or raw.get("bias") or "Neutral").title()
  return {
    "interval": interval,
    "pattern_name": str(raw.get("pattern_name") or raw.get("pattern") or raw.get("patternName") or "Live structure"),
    "direction": direction if direction in {"Bullish", "Bearish", "Neutral"} else "Neutral",
    "confidence": confidence,
    "reasoning": str(raw.get("reasoning") or raw.get("rationale") or raw.get("analysis") or "Structure is still developing."),
    "support": str(support) if support not in (None, "") else "",
    "resistance": str(resistance) if resistance not in (None, "") else "",
    "breakout_probability": clamp(breakout_probability, 0, 1),
    "status": str(raw.get("status") or "active"),
  }


def collect_timeframe_entries(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
  raw_entries = payload.get("timeframes") or payload.get("timeframe_analyses") or {}
  if isinstance(raw_entries, list):
    normalized = []
    for item in raw_entries:
      interval = str(item.get("interval") or item.get("timeframe") or "")
      if not interval:
        continue
      normalized.append(normalize_timeframe_entry(interval, item))
    if normalized:
      return normalized

  entries = []
  for interval in DEFAULT_TIMEFRAMES:
    item = raw_entries.get(interval) if isinstance(raw_entries, dict) else None
    if item:
      entries.append(normalize_timeframe_entry(interval, item))
    else:
      entries.append(
        normalize_timeframe_entry(
          interval,
          {
            "pattern_name": "No clean pattern yet",
            "direction": "Neutral",
            "confidence": 0,
            "reasoning": "The market is still searching for cleaner structure here.",
            "status": "watching",
          },
        )
      )
  return entries


def describe_bias(entry: Dict[str, Any]) -> str:
  confidence = entry["confidence"]
  direction = entry["direction"].lower()
  if direction == "bullish":
    if confidence >= 85:
      return "leaning bullish"
    if confidence >= 70:
      return "mildly bullish"
    return "trying to turn higher"
  if direction == "bearish":
    if confidence >= 85:
      return "leaning bearish"
    if confidence >= 70:
      return "mildly bearish"
    return "softening lower"
  return "mixed for now"


def build_timeframe_turns(entry: Dict[str, Any], coin_pair: str, previous_entry: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
  interval = entry["interval"]
  spoken_interval = spoken_timeframe(interval)
  pattern_name = entry["pattern_name"]
  direction = entry["direction"]
  confidence = entry["confidence"]
  support = entry["support"] or "the local support band"
  resistance = entry["resistance"] or "the local resistance band"
  sma_20 = entry.get("sma_20") or ""
  sma_bias = entry.get("sma_bias") or ""
  fib_focus_label = entry.get("fib_focus_label") or ""
  fib_focus_value = entry.get("fib_focus_value") or ""
  breakout_pct = int(round(entry["breakout_probability"] * 100))
  bias = describe_bias(entry)
  first_fill = maybe_fill(
    f"{interval}:{pattern_name}:a1",
    ["Look at this", "Hold on", "Wait", "This is interesting", "Yeah, look here"],
    90,
  )
  second_fill = maybe_fill(
    f"{interval}:{pattern_name}:a2",
    ["Yeah exactly", "I hear that", "Maybe", "Right", "I get that"],
    72,
  )
  disagreement = maybe_fill(
    f"{interval}:{pattern_name}:a2d",
    ["I'm not fully convinced", "I want a cleaner close first", "I would still be careful here", "I need a little more proof"],
    78,
  )
  opening_observation = pick_phrase(
    [
      f"On the {spoken_interval}, {coin_pair} is reading like {emphasis(pattern_name)}",
      f"On this {spoken_interval} window, {coin_pair} keeps leaning into {emphasis(pattern_name)}",
      f"On the {spoken_interval}, the tape is starting to organize like {emphasis(pattern_name)}",
    ],
    f"{interval}:{pattern_name}:opening",
  )
  reaction_bridge = compare_with_previous(entry, previous_entry)
  pressure_line = pick_phrase(
    [
      f"Price is reacting between {support} and {resistance}",
      f"The key area still looks like {support} up into {resistance}",
      f"The active pocket is still sitting between {support} and {resistance}",
    ],
    f"{interval}:{pattern_name}:pressure",
  )
  indicator_line = (
    f"The 20 SMA is around {sma_20}, and price is still {sma_bias}."
    if sma_20 and sma_bias
    else "The moving average structure is still trying to settle."
  )
  fib_line = (
    f"The nearest Fibonacci level is {fib_focus_label} around {fib_focus_value}."
    if fib_focus_label and fib_focus_value
    else "The Fibonacci retracement map is still sitting inside the active pocket."
  )
  analyst_1_open = (
    f"{first_fill + dynamic_break(f'{interval}:{pattern_name}:open-break') if first_fill else ''}"
    f"{opening_observation}{dynamic_break(f'{interval}:{pattern_name}:open-break-2')}"
    f"with about {confidence} percent confidence, so right now it seems {bias}. {indicator_line}"
  )
  analyst_2_validate = (
    f"{second_fill + dynamic_break(f'{interval}:{pattern_name}:validate-break') if second_fill else ''}"
    f"{disagreement + dynamic_break(f'{interval}:{pattern_name}:validate-break-2') if disagreement else ''}"
    f"{pressure_line},{dynamic_break(f'{interval}:{pattern_name}:validate-break-3')}"
    f"and to me that matters because {clean_reasoning(entry['reasoning'])} {fib_line}"
  )
  if direction == "Bullish":
    adjustment_core = f"Fair point{dynamic_break(f'{interval}:{pattern_name}:adjust-break')}if this keeps holding above {support}, buyers can still lean on it"
  elif direction == "Bearish":
    adjustment_core = f"Fair point{dynamic_break(f'{interval}:{pattern_name}:adjust-break')}if this keeps slipping under {support}, sellers can still press it"
  else:
    adjustment_core = f"Fair point{dynamic_break(f'{interval}:{pattern_name}:adjust-break')}if price just keeps rotating between {support} and {resistance}, this can stay mixed"
  analyst_1_adjust = (
    f"{adjustment_core},{dynamic_break(f'{interval}:{pattern_name}:adjust-break-2')}"
    f"{reaction_bridge} I still want to see how it behaves near {resistance}."
  )
  analyst_2_conclusion = (
    f"My micro take on the {spoken_interval} is this{dynamic_break(f'{interval}:{pattern_name}:close-break', 360, 520, 640)}"
    f"the market currently seems {bias}, with breakout odds around {breakout_pct} percent,"
    f" so I would still watch the reaction before calling anything done."
  )
  return [
    {"speaker_id": "analyst_1", "timeframe": interval, "stage": "timeframe", "text": analyst_1_open},
    {"speaker_id": "analyst_2", "timeframe": interval, "stage": "timeframe", "text": analyst_2_validate},
    {"speaker_id": "analyst_1", "timeframe": interval, "stage": "timeframe", "text": analyst_1_adjust},
    {"speaker_id": "analyst_2", "timeframe": interval, "stage": "timeframe", "text": analyst_2_conclusion},
  ]


def aggregate_summary(entries: List[Dict[str, Any]]) -> Dict[str, Any]:
  weights = {"1m": 1, "5m": 2, "15m": 3, "30m": 4, "1h": 5, "4h": 6}
  score = {"Bullish": 0.0, "Bearish": 0.0, "Neutral": 0.0}
  supports = []
  resistances = []
  breakout_weighted = 0.0
  total_weight = 0.0
  for entry in entries:
    weight = weights.get(entry["interval"], 1) * max(entry["confidence"], 1) / 100
    score[entry["direction"]] += weight
    if entry["support"]:
      supports.append(entry["support"])
    if entry["resistance"]:
      resistances.append(entry["resistance"])
    breakout_weighted += entry["breakout_probability"] * weight
    total_weight += weight

  sorted_scores = sorted(score.items(), key=lambda item: item[1], reverse=True)
  leader, leader_score = sorted_scores[0]
  runner_score = sorted_scores[1][1] if len(sorted_scores) > 1 else 0
  if leader == "Neutral" or leader_score <= runner_score * 1.15:
    trend = "mixed to neutral"
  elif leader_score >= runner_score * 1.35:
    trend = f"strongly {leader.lower()}"
  else:
    trend = f"mildly {leader.lower()}"

  return {
    "overall_trend": trend,
    "key_support": supports[0] if supports else "the nearest support zone",
    "key_resistance": resistances[0] if resistances else "the nearest resistance zone",
    "key_sma_20": next((entry.get("sma_20") for entry in entries if entry.get("sma_20")), ""),
    "key_sma_bias": next((entry.get("sma_bias") for entry in entries if entry.get("sma_bias")), ""),
    "key_fib_label": next((entry.get("fib_focus_label") for entry in entries if entry.get("fib_focus_label")), ""),
    "key_fib_value": next((entry.get("fib_focus_value") for entry in entries if entry.get("fib_focus_value")), ""),
    "breakout_probability": int(round((breakout_weighted / total_weight) * 100)) if total_weight else 50,
  }


def build_summary_turn(entries: List[Dict[str, Any]], coin_pair: str) -> List[Dict[str, Any]]:
  summary = aggregate_summary(entries)
  intro = pick_phrase(
    [
      f"Quick wrap on {coin_pair}",
      f"Final read on {coin_pair}",
      f"Here is the broad picture on {coin_pair}",
    ],
    f"{coin_pair}:summary:intro",
  )
  sma_copy = (
    f"The 20 SMA is around {summary['key_sma_20']}, with price {summary['key_sma_bias']}. "
    if summary["key_sma_20"] and summary["key_sma_bias"]
    else ""
  )
  fib_copy = (
    f"Nearest Fibonacci focus is {summary['key_fib_label']} around {summary['key_fib_value']}. "
    if summary["key_fib_label"] and summary["key_fib_value"]
    else ""
  )
  text = (
    f"{intro}{dynamic_break(f'{coin_pair}:summary:break', 420, 580, 700)}"
    f"across the full stack, the market currently seems {summary['overall_trend']}. "
    f"Key support is around {summary['key_support']},{dynamic_break(f'{coin_pair}:summary:break-2')}key resistance is around {summary['key_resistance']}, "
    f"and the breakout probability looks near {summary['breakout_probability']} percent. "
    f"{sma_copy}{fib_copy}We still let price prove it."
  )
  return [{"speaker_id": "narrator", "stage": "summary", "text": text}]


def build_roundtable_summary_turns(entries: List[Dict[str, Any]], coin_pair: str) -> List[Dict[str, Any]]:
  summary = aggregate_summary(entries)
  top_entry = max(entries, key=lambda entry: entry.get("confidence", 0), default=None)
  top_pattern = top_entry["pattern_name"] if top_entry else "the active structure"
  top_interval = spoken_timeframe(top_entry["interval"]) if top_entry else "the live stack"
  contributing_windows = max(1, int(summary.get("contributing_intervals") or 0))
  support = summary.get("key_support") or "the current support pocket"
  resistance = summary.get("key_resistance") or "the current resistance pocket"
  interval_support = ", ".join(top_entry.get("intervals", [])[:3]) if top_entry else ""
  interval_copy = interval_support or "the higher windows"
  secondary_patterns = ", ".join(
    entry.get("pattern_name", "")
    for entry in entries[1:3]
    if entry.get("pattern_name")
  )
  secondary_copy = secondary_patterns or "the rest of the stack"
  level_copy = []
  if summary["key_sma_20"]:
    level_copy.append(f"The 20 SMA is tracking near {summary['key_sma_20']}.")
  if summary["key_fib_label"] and summary["key_fib_value"]:
    level_copy.append(f"Closest Fibonacci focus is {summary['key_fib_label']} around {summary['key_fib_value']}.")
  if not level_copy:
    level_copy.append(f"First technical checkpoints are still support near {support} and resistance near {resistance}.")
  narrator_open = (
    f"Welcome back. Now we are going to start {coin_pair} analysis. "
    f"Final read on {coin_pair}. "
    f"Across the six-timeframe stack, the market still looks {summary['overall_trend']}. "
    f"{contributing_windows} windows are participating, with support near {support} and resistance near {resistance}."
  )
  analyst_1 = (
    f"The clearest pressure is still {top_pattern} on the {top_interval}, with backup from {interval_copy}. "
    "That lead is still steering the tape."
  )
  analyst_2 = (
    "I still want one clean reaction first. "
    f"If price loses {support}, the smaller windows can cool this read quickly."
  )
  narrator_levels = " ".join(level_copy)
  analyst_close = (
    f"Secondary pressure from {secondary_copy} keeps this read alive, "
    f"so let {resistance} prove or fail before leaning too hard."
  )
  narrator_close = (
    f"Board read stays {summary['overall_trend']}, with breakout odds near {summary['breakout_probability']} percent. "
    "Next is a quick three-headline sweep before the next coin."
  )
  return [
    {"speaker_id": "narrator", "stage": "summary", "text": narrator_open},
    {"speaker_id": "analyst_1", "stage": "summary", "text": analyst_1},
    {"speaker_id": "analyst_2", "stage": "summary", "text": analyst_2},
    {"speaker_id": "narrator", "stage": "summary", "text": narrator_levels},
    {"speaker_id": "analyst_1", "stage": "summary", "text": analyst_close},
    {"speaker_id": "narrator", "stage": "summary", "text": narrator_close},
  ]


def normalize_news_item(item: Dict[str, Any]) -> Dict[str, str]:
  return {
    "title": str(item.get("title") or "Fresh crypto headline"),
    "source": str(item.get("source") or item.get("publisher") or "Crypto desk"),
    "summary": str(item.get("summary") or item.get("takeaway") or "The market is still digesting the headline."),
  }


def build_news_turns(news_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
  turns = []
  for index, item in enumerate(news_items[:3]):
    news = normalize_news_item(item)
    narrator = (
      f"Headline {index + 1}. "
      f"{news['source']} reports {emphasis(news['title'])}."
    )
    turns.extend(
      [
        {"speaker_id": "narrator", "stage": "news", "news_index": index, "text": narrator},
      ]
    )
  return turns


def build_subscribe_cta_turn(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
  event = payload.get("event") or {}
  trigger = str(event.get("trigger") or "idle_gap")
  return [
    {
      "speaker_id": "narrator",
      "stage": "subscribe_cta",
      "text": voice_service.normalize_subscribe_cta_text(event.get("line") or event.get("text"), trigger),
      "event_type": "subscribe_cta",
      "trigger": trigger,
    }
  ]


def build_live_brief_turns(payload: Dict[str, Any], coin_pair: str) -> List[Dict[str, Any]]:
  event = payload.get("event") or {}
  live_context = payload.get("live_context") or {}
  displayed_interval_raw = str(payload.get("displayed_interval") or "live")
  lead_interval_raw = str(payload.get("lead_interval") or displayed_interval_raw)
  displayed_interval = spoken_timeframe(displayed_interval_raw)
  lead_interval = spoken_timeframe(lead_interval_raw)
  pattern_name = str(live_context.get("pattern_name") or event.get("pattern_name") or event.get("lead_pattern_name") or "a live structure")
  confidence = int(round(safe_float(live_context.get("confidence") or event.get("confidence"), 0)))
  event_type = str(event.get("type") or "live_update")
  direction = str(live_context.get("direction") or "Neutral")
  support = live_context.get("support") or "the local support band"
  resistance = live_context.get("resistance") or "the local resistance band"
  rationale = clean_reasoning(live_context.get("rationale") or "the structure is still adjusting in real time")
  lead_pattern_name = str(live_context.get("lead_pattern_name") or event.get("lead_pattern_name") or pattern_name)
  lead_direction = str(live_context.get("lead_direction") or "Neutral").lower()
  sma_20 = str(live_context.get("sma_20") or event.get("sma_20") or "").strip()
  sma_bias = str(live_context.get("sma_bias") or event.get("sma_bias") or "").strip()
  sma_slope = str(live_context.get("sma_slope") or event.get("sma_slope") or "").strip()
  fib_focus_label = str(live_context.get("fib_focus_label") or event.get("fib_focus_label") or "").strip()
  fib_focus_value = str(live_context.get("fib_focus_value") or event.get("fib_focus_value") or "").strip()
  current_price = live_context.get("current_price")
  change_percent = safe_float(live_context.get("change_percent"), 0.0)
  rsi_value = safe_float(live_context.get("rsi"), 50.0)
  macd_value = safe_float(live_context.get("macd"), 0.0)
  follow_up_transition = bool(event.get("follow_up_transition"))
  impulse_direction = str(event.get("impulse_direction") or direction or "Neutral").title()
  impulse_move_pct = safe_float(event.get("candle_move_pct"), 0.0)
  strength_label = str(event.get("strength_label") or "strong")
  sma_line = ""
  if sma_20 and sma_bias:
    sma_line = f"The 20 SMA is around {sma_20}, with price still {sma_bias}"
    if sma_slope:
      sma_line += f", and the average is still {sma_slope}"
    sma_line += "."
  elif sma_20:
    sma_line = f"The 20 SMA is around {sma_20}."
  fib_line = f"The nearest Fibonacci level is {fib_focus_label} around {fib_focus_value}." if fib_focus_label and fib_focus_value else ""
  quick_react = maybe_fill(f"live:{event_type}:{pattern_name}:a1", ["Wait", "Look at this", "Interesting", "Hold on"], 88)
  caution = maybe_fill(f"live:{event_type}:{pattern_name}:a2", ["I still want to see follow-through", "I want one more clean reaction", "I'm not fully convinced yet", "I need to see it hold"], 85)

  if event_type == "warmup_intro":
    analyst_1 = (
      f"Welcome to {coin_pair} analysis.{dynamic_break(f'live:{event_type}:open-break')}"
      f"Let us see how the market shapes into {emphasis(pattern_name)} on the displayed {displayed_interval}."
      f"{' ' + sma_line if sma_line else ''}"
    )
    analyst_2 = (
      f"The active zone is still {support} into {resistance},{dynamic_break(f'live:{event_type}:reply-break')}"
      f"and the higher-timeframe context is the {lead_interval} {lead_pattern_name} read."
      f"{' ' + fib_line if fib_line else ''}"
    )
    analyst_1_follow_up = (
      f"Let us stay patient and watch how this market starts to shape in real time."
    )
  elif event_type == "impulse_candle":
    side_copy = "the bulls are trying to push price higher fast" if impulse_direction.lower() == "bullish" else "the bears are trying to force price lower fast"
    analyst_1 = (
      f"{quick_react + dynamic_break(f'live:{event_type}:open-break') if quick_react else ''}"
      f"That is a {strength_label} {impulse_direction.lower()} impulse candle on the displayed {displayed_interval},{dynamic_break(f'live:{event_type}:open-break-2')}"
      f"and {side_copy} with about {impulse_move_pct:.2f} percent of fast tape movement."
      f"{' ' + sma_line if sma_line else ''}"
    )
    analyst_2 = (
      f"{caution + dynamic_break(f'live:{event_type}:reply-break') if caution else ''}"
      f"I want to see whether this is real expansion or just a fast stop run,{dynamic_break(f'live:{event_type}:reply-break-2')}"
      f"because the pattern desk is still reading {pattern_name} while price is ripping between {support} and {resistance}."
      f"{' ' + fib_line if fib_line else ''}"
    )
    analyst_1_follow_up = (
      f"{pick_phrase(['Exactly', 'Right', 'That is the key'], f'live:{event_type}:follow')}{dynamic_break(f'live:{event_type}:follow-break')}"
      f"If this candle gets accepted, the {impulse_direction.lower()} side can keep pressing. If it gets snapped back quickly, then it was probably a manipulation flush."
    )
  elif event_type == "indicator_observation":
    price_copy = f"Price is trading around {current_price:,.2f}" if isinstance(current_price, (int, float)) and current_price else "Price is still moving inside the active zone"
    rsi_tone = "cool and soft" if rsi_value < 40 else "balanced" if rsi_value < 60 else "firm" if rsi_value < 70 else "hot"
    macd_tone = "positive" if macd_value > 0 else "negative" if macd_value < 0 else "flat"
    analyst_1 = (
      f"{quick_react + dynamic_break(f'live:{event_type}:open-break') if quick_react else ''}"
      f"{price_copy} on the displayed {displayed_interval},{dynamic_break(f'live:{event_type}:open-break-2')}"
      f"and the indicator desk is seeing RSI around {rsi_value:.1f}, which still looks {rsi_tone}."
      f"{' ' + sma_line if sma_line else ''}"
    )
    analyst_2 = (
      f"{caution + dynamic_break(f'live:{event_type}:reply-break') if caution else ''}"
      f"MACD is still {macd_tone},{dynamic_break(f'live:{event_type}:reply-break-2')}"
      f"while price is reacting between {support} and {resistance}. That usually tells me the market is still choosing its next push."
      f"{' ' + fib_line if fib_line else ''}"
    )
    analyst_1_follow_up = (
      f"{pick_phrase(['Exactly', 'Yeah', 'That lines up'], f'live:{event_type}:follow')}{dynamic_break(f'live:{event_type}:follow-break')}"
      f"With the {change_percent:+.2f} percent session move still live, I would treat this as observation mode until the tape commits."
    )
  elif follow_up_transition:
    analyst_1 = (
      f"{quick_react + dynamic_break(f'live:{event_type}:open-break') if quick_react else ''}"
      f"Looks like there is more manipulation now,{dynamic_break(f'live:{event_type}:open-break-2')}"
      f"and the live pattern has shifted to {emphasis(pattern_name)} on the displayed {displayed_interval}."
      f"{' ' + sma_line if sma_line else ''}"
    )
    analyst_2 = (
      f"{caution + dynamic_break(f'live:{event_type}:reply-break') if caution else ''}"
      f"The reason I am staying careful is that fast shifts like this can be fake-outs,{dynamic_break(f'live:{event_type}:reply-break-2')}"
      f"while the higher-timeframe context is still the {lead_interval} {lead_pattern_name} read."
      f"{' ' + fib_line if fib_line else ''}"
    )
    analyst_1_follow_up = (
      f"{pick_phrase(['Right', 'Exactly', 'That is the live part of this'], f'live:{event_type}:follow')}{dynamic_break(f'live:{event_type}:follow-break')}"
      f"If the tape accepts {pattern_name}, then this rotation can continue. If not, we are probably just watching another manipulation pocket."
    )
  else:
    opening = pick_phrase(
      [
        f"On the displayed {displayed_interval} chart, {coin_pair} currently seems to be shaping like {emphasis(pattern_name)}",
        f"On this displayed {displayed_interval} window, {coin_pair} is starting to organize like {emphasis(pattern_name)}",
        f"On the live {displayed_interval}, {coin_pair} currently leans like {emphasis(pattern_name)}",
      ],
      f"live:{event_type}:{pattern_name}:opening",
    )
    analyst_1 = (
      f"{quick_react + dynamic_break(f'live:{event_type}:{pattern_name}:open-break') if quick_react else ''}"
      f"{opening}{dynamic_break(f'live:{event_type}:{pattern_name}:open-break-2')}"
      f"with around {confidence} percent confidence, and the active zone looks like {support} into {resistance}."
      f"{' ' + sma_line if sma_line else ''}"
    )
    analyst_2 = (
      f"{caution + dynamic_break(f'live:{event_type}:{pattern_name}:reply-break') if caution else ''}"
      f"{pick_phrase(['That makes sense to me because', 'I can see that because', 'The reason I am tracking that is'], f'live:{event_type}:{pattern_name}:reply')}"
      f" {rationale}{dynamic_break(f'live:{event_type}:{pattern_name}:reply-break-2')}"
      f"The higher-timeframe context is still the {lead_interval} {lead_pattern_name} read, so this is still a live reaction."
      f"{' ' + fib_line if fib_line else ''}"
    )
    analyst_1_follow_up = (
      f"{pick_phrase(['Yeah, exactly', 'Right, and that matters', 'That is the key part for me'], f'live:{event_type}:{pattern_name}:follow')}"
      f"{dynamic_break(f'live:{event_type}:{pattern_name}:follow-break')}"
      f"If {support} gives way, the {direction.lower()} pressure can speed up. If it keeps absorbing there, this can keep rotating while the {lead_interval} picture stays {lead_direction}."
    )
  follow_up_speaker = "narrator" if event_type in {"lead_pattern_change", "exact_mtf_change"} else "analyst_1"
  return [
    {"speaker_id": "analyst_1", "stage": "live", "text": analyst_1, "event_type": event_type},
    {"speaker_id": "analyst_2", "stage": "live", "text": analyst_2, "event_type": event_type},
    {"speaker_id": follow_up_speaker, "stage": "live", "text": analyst_1_follow_up, "event_type": event_type},
  ]


def resolve_cast(requested_ids: Optional[List[str]] = None) -> Dict[str, PodcastSpeaker]:
  del requested_ids
  assignments = voice_service.get_voice_assignments()
  selected_packs = voice_service.select_role_templates(assignments)
  runtimes = {pack.id: voice_service.resolve_voice_runtime(pack) for pack in selected_packs}
  selected_by_id = {pack.id: pack for pack in selected_packs}
  analyst_1_pack = selected_by_id.get("analyst_1")
  analyst_2_pack = selected_by_id.get("analyst_2")
  host_pack = selected_by_id.get("host")

  cast: Dict[str, PodcastSpeaker] = {}
  for speaker_id, pack in {
    "analyst_1": analyst_1_pack,
    "analyst_2": analyst_2_pack,
    "host": host_pack,
    "narrator": host_pack,
  }.items():
    if not pack:
      continue
    runtime = runtimes.get(pack.id) or {"engine": "none"}
    cast[speaker_id] = PodcastSpeaker(
      id=speaker_id,
      name=voice_service.active_voice_label(pack, runtime),
      role=pack.role,
      voice_pack_id=pack.id,
      subtitle_color=pack.subtitle_color,
      runtime_engine=runtime.get("engine", "none"),
    )

  return cast


def get_podcast_voice_status() -> Dict[str, Any]:
  catalog = voice_service.list_voice_statuses()
  cast = resolve_cast()
  speakers = []
  runtimes: Dict[str, Dict[str, Any]] = {}
  role_templates = voice_service.load_role_templates(catalog.get("assignments"))
  for speaker_id in ("analyst_1", "analyst_2", "host"):
    member = cast.get(speaker_id)
    if not member:
      speakers.append(
        {
          "id": speaker_id,
          "name": speaker_id.replace("_", " ").title(),
          "role": "Unassigned",
          "voice_pack_id": "",
          "engine": "none",
          "ready": False,
        }
      )
      continue
    runtime = voice_service.resolve_voice_runtime(role_templates[member.voice_pack_id])
    runtimes[member.voice_pack_id] = runtime
    speakers.append(
      {
        "id": speaker_id,
        "name": member.name,
        "role": member.role,
        "voice_pack_id": member.voice_pack_id,
        "engine": runtime.get("engine", "none"),
        "configured_engine": runtime.get("configured_engine", runtime.get("engine", "none")),
        "ready": runtime.get("available", False),
        "subtitle_color": member.subtitle_color,
        "active_voice_label": voice_service.active_voice_label(role_templates[member.voice_pack_id], runtime),
        "fallback_active": runtime.get("fallback_active", False),
        "model_id": voice_service.runtime_model_id(runtime),
      }
    )

  return {
    "provider": voice_service.provider_name_for_runtimes(runtimes),
    "ready": bool(cast) and all(item["ready"] for item in speakers if item["voice_pack_id"]),
    "model_id": voice_service.primary_model_id_for_runtimes(runtimes, DEFAULT_MODEL_ID),
    "output_format": DEFAULT_OUTPUT_FORMAT,
    "role_ids": list(voice_service.VOICE_ROLE_ORDER),
    "voices": catalog.get("voices", []),
    "speakers": speakers,
    "cast_ready": catalog.get("cast_ready", False),
    "assignments": catalog.get("assignments", {}),
  }


def build_podcast_script(payload: Dict[str, Any]) -> Dict[str, Any]:
  mode = str(payload.get("mode") or "intermission_full")
  coin = payload.get("coin") or {}
  coin_pair = str(coin.get("spoken_name") or coin.get("name") or coin.get("pair") or coin.get("symbol") or "Crypto market")
  timeframe_entries = collect_timeframe_entries(payload)
  news_items = payload.get("news_items") or payload.get("news") or []

  turns: List[Dict[str, Any]] = []
  if mode == "live_brief":
    turns.extend(build_live_brief_turns(payload, coin_pair))
    timeframe_entries = []
    news_items = []
  elif mode == "subscribe_cta":
    turns.extend(build_subscribe_cta_turn(payload))
    timeframe_entries = []
    news_items = []
  elif mode == "intermission_full":
    turns.extend(build_roundtable_summary_turns(timeframe_entries, coin_pair))
    turns.extend(build_news_turns(news_items))
  else:
    previous_entry: Optional[Dict[str, Any]] = None
    for entry in timeframe_entries:
      turns.extend(build_timeframe_turns(entry, coin_pair, previous_entry))
      previous_entry = entry
    turns.extend(build_summary_turn(timeframe_entries, coin_pair))
    turns.extend(build_news_turns(news_items))

  cast = resolve_cast(payload.get("voice_pack_ids"))
  for turn in turns:
    speaker = cast.get(turn["speaker_id"])
    if speaker:
      turn["speaker_name"] = speaker.name
      turn["speaker_role"] = speaker.role
      turn["voice_pack_id"] = speaker.voice_pack_id
      turn["subtitle_color"] = speaker.subtitle_color
    else:
      turn["speaker_name"] = turn["speaker_id"].replace("_", " ").title()
      turn["speaker_role"] = "Unassigned"
      turn["voice_pack_id"] = ""
      turn["subtitle_color"] = "#ffd58b"
    turn["plain_text"] = strip_tags(turn["text"])

  return {
    "mode": mode,
    "coin": coin,
    "timeframes": timeframe_entries,
    "news_items": [normalize_news_item(item) for item in news_items[:3]],
    "turns": turns,
    "script_text": "\n".join(f"[{turn['speaker_name']}]: {turn['plain_text']}" for turn in turns),
  }


def estimate_duration_ms(text: str) -> int:
  words = max(1, len(strip_tags(text).split()))
  return int(clamp(words * 340 + 750, 1300, 10000))


def merge_wav_files(clip_paths: List[Path], merged_path: Path) -> str:
  if not clip_paths:
    return ""

  params = None
  frames: List[bytes] = []
  for path in clip_paths:
    with contextlib.closing(wave.open(str(path), "rb")) as wav_file:
      current = (
        wav_file.getnchannels(),
        wav_file.getsampwidth(),
        wav_file.getframerate(),
        wav_file.getcomptype(),
        wav_file.getcompname(),
      )
      if params is None:
        params = current
      elif params != current:
        return ""
      frames.append(wav_file.readframes(wav_file.getnframes()))

  merged_path.parent.mkdir(parents=True, exist_ok=True)
  with wave.open(str(merged_path), "wb") as output:
    output.setnchannels(params[0])
    output.setsampwidth(params[1])
    output.setframerate(params[2])
    output.setcomptype(params[3], params[4])
    for chunk in frames:
      output.writeframes(chunk)
  return f"/api/podcast/audio/{merged_path.parent.name}/{merged_path.name}"


def render_podcast_response(payload: Dict[str, Any]) -> Dict[str, Any]:
  script_package = build_podcast_script(payload)
  voice_status = get_podcast_voice_status()
  session_id = uuid.uuid4().hex[:12]
  session_dir = PODCAST_SESSION_ROOT / session_id
  session_dir.mkdir(parents=True, exist_ok=True)

  transcript = []
  clips = []
  cumulative_ms = 0

  selected_packs = voice_service.select_role_templates(voice_status.get("assignments"))
  runtimes = {pack.id: voice_service.resolve_voice_runtime(pack) for pack in selected_packs}

  if not voice_status["ready"]:
    for index, turn in enumerate(script_package["turns"]):
      duration_ms = estimate_duration_ms(turn["text"])
      pause_ms = SPEAKER_PAUSE_MS.get(turn["speaker_id"], 220)
      transcript.append(
        {
          "index": index,
          "speaker": turn["speaker_name"],
          "speaker_id": turn["speaker_id"],
          "start_ms": cumulative_ms,
          "end_ms": cumulative_ms + duration_ms,
          "text": turn["plain_text"],
          "stage": turn["stage"],
        }
      )
      clips.append(
        {
          "index": index,
          "speaker": turn["speaker_name"],
          "speaker_label": turn["speaker_name"],
          "speaker_id": turn["speaker_id"],
          "text": turn["plain_text"],
          "audio_url": "",
          "duration_ms": duration_ms,
          "pause_ms": pause_ms,
          "stage": turn["stage"],
          "subtitle_color": turn["subtitle_color"],
          "meta": {
            "news_index": turn.get("news_index"),
            "timeframe": turn.get("timeframe"),
            "event_type": turn.get("event_type"),
          },
        }
      )
      cumulative_ms += duration_ms
    return {
      "provider": voice_service.provider_name_for_runtimes(runtimes),
      "ready": False,
      "audio_enabled": False,
      "script": script_package["turns"],
      "script_text": script_package["script_text"],
      "transcript": transcript,
      "clips": clips,
      "sequence": clips,
      "merged_audio_url": "",
      "model_id": voice_service.primary_model_id_for_runtimes(runtimes, DEFAULT_MODEL_ID),
      "output_format": DEFAULT_OUTPUT_FORMAT,
      "voice_status": voice_status,
      "missing": {
        "cast_ready": voice_status["cast_ready"],
        "speakers": [item["id"] for item in voice_status["speakers"] if not item["ready"]],
      },
    }

  clip_paths: List[Path] = []
  for index, turn in enumerate(script_package["turns"]):
    voice_pack_id = turn.get("voice_pack_id")
    if not voice_pack_id:
      continue
    runtime = runtimes.get(voice_pack_id)
    pack = next((candidate for candidate in selected_packs if candidate.id == voice_pack_id), None)
    if not runtime or not pack:
      continue

    clip_id = f"{index + 1:03d}-{voice_pack_id}"
    asset = voice_service.materialize_clip_asset(pack, runtime, turn["plain_text"], session_dir, clip_id)
    audio_path = asset["audio_path"]
    actual_runtime = asset["runtime"]
    spoken_text = asset["metadata"].get("transcript") or turn["plain_text"]
    runtimes[voice_pack_id] = actual_runtime
    clip_paths.append(audio_path)
    duration_ms = voice_service.audio_duration_ms(audio_path)
    pause_ms = pack.pause_ms
    transcript.append(
      {
        "index": index,
        "speaker": turn["speaker_name"],
        "speaker_id": turn["speaker_id"],
        "start_ms": cumulative_ms,
        "end_ms": cumulative_ms + duration_ms,
        "text": spoken_text,
        "stage": turn["stage"],
      }
    )
    clips.append(
      {
        "index": index,
        "speaker": turn["speaker_name"],
        "speaker_label": turn["speaker_name"],
        "speaker_id": turn["speaker_id"],
        "text": spoken_text,
        "audio_url": f"/api/podcast/audio/{session_id}/{clip_id}.wav",
        "duration_ms": duration_ms,
        "pause_ms": pause_ms,
        "stage": turn["stage"],
        "subtitle_color": turn["subtitle_color"],
        "meta": {
          "news_index": turn.get("news_index"),
          "timeframe": turn.get("timeframe"),
          "event_type": turn.get("event_type"),
        },
      }
    )
    cumulative_ms += duration_ms

  merged_audio_url = merge_wav_files(clip_paths, session_dir / "podcast-full.wav")
  return {
    "provider": voice_service.provider_name_for_runtimes(runtimes),
    "ready": True,
    "audio_enabled": True,
    "script": script_package["turns"],
    "script_text": script_package["script_text"],
    "transcript": transcript,
    "clips": clips,
    "sequence": clips,
    "merged_audio_url": merged_audio_url,
    "mode": script_package["mode"],
    "model_id": voice_service.primary_model_id_for_runtimes(runtimes, DEFAULT_MODEL_ID),
    "output_format": DEFAULT_OUTPUT_FORMAT,
    "voice_status": voice_status,
    "duration_ms": cumulative_ms,
  }


def podcast_audio_file_path(session_id: str, filename: str) -> Path:
  safe_session = re.sub(r"[^a-zA-Z0-9_-]", "", session_id)
  safe_filename = re.sub(r"[^a-zA-Z0-9._-]", "", filename)
  return PODCAST_SESSION_ROOT / safe_session / safe_filename


def cleanup_podcast_cache(max_age_seconds: int = 6 * 60 * 60) -> None:
  cutoff = time.time() - max_age_seconds
  if not PODCAST_SESSION_ROOT.exists():
    return
  for entry in PODCAST_SESSION_ROOT.iterdir():
    with contextlib.suppress(FileNotFoundError):
      if entry.stat().st_mtime >= cutoff:
        continue
      if entry.is_dir():
        for child in entry.iterdir():
          child.unlink(missing_ok=True)
        entry.rmdir()
