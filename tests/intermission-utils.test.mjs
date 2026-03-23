import test from "node:test";
import assert from "node:assert/strict";

import {
  INTERMISSION_TOTAL_MS,
  INTERMISSION_CLOSE_MS,
  INTERMISSION_SUMMARY_MS,
  INTERMISSION_NEWS_MS,
  INTERMISSION_OPEN_MS,
  aggregatePatternVotes,
  buildIntermissionSummary,
} from "../intermission-utils.mjs";

function analysis(patterns) {
  return { patterns };
}

test("intermission timing constants add up to the full transition", () => {
  assert.equal(INTERMISSION_TOTAL_MS, 13200);
  assert.equal(
    INTERMISSION_CLOSE_MS + INTERMISSION_SUMMARY_MS + INTERMISSION_NEWS_MS + INTERMISSION_OPEN_MS,
    INTERMISSION_TOTAL_MS
  );
});

test("higher timeframes outweigh lower timeframes in the vote summary", () => {
  const summary = aggregatePatternVotes({
    "4h": analysis([{ id: "descending_triangle", name: "Descending Triangle", direction: "Bearish", confidence: 88 }]),
    "1h": analysis([{ id: "descending_triangle", name: "Descending Triangle", direction: "Bearish", confidence: 86 }]),
    "30m": analysis([{ id: "cup_handle", name: "Cup and Handle", direction: "Bullish", confidence: 92 }]),
    "15m": analysis([{ id: "cup_handle", name: "Cup and Handle", direction: "Bullish", confidence: 90 }]),
    "5m": analysis([{ id: "cup_handle", name: "Cup and Handle", direction: "Bullish", confidence: 89 }]),
    "1m": analysis([{ id: "cup_handle", name: "Cup and Handle", direction: "Bullish", confidence: 88 }]),
  });

  assert.equal(summary.dominantDirection, "Neutral");
  assert.equal(summary.biasPhrase, "mixed / neutral");
  assert.equal(summary.topPatterns[0]?.name, "Descending Triangle");
});

test("mixed direction scores stay neutral instead of overclaiming", () => {
  const summary = aggregatePatternVotes({
    "4h": analysis([{ id: "drift_base", name: "Drift Base", direction: "Bullish", confidence: 85 }]),
    "1h": analysis([{ id: "dead_cat_bounce", name: "Dead Cat Bounce", direction: "Bearish", confidence: 84 }]),
    "30m": analysis([{ id: "range_compression", name: "Range Compression", direction: "Neutral", confidence: 88 }]),
  });

  assert.equal(summary.dominantDirection, "Bullish");
  assert.equal(summary.biasPhrase, "mildly bullish");
});

test("intermission summary keeps subtitle wording uncertain and includes the top patterns", () => {
  const summary = buildIntermissionSummary(
    {
      "4h": analysis([
        { id: "descending_triangle", name: "Descending Triangle", direction: "Bearish", confidence: 88 },
        { id: "falling_wedge", name: "Falling Wedge", direction: "Bullish", confidence: 84 },
        { id: "range_compression", name: "Range Compression", direction: "Neutral", confidence: 83 },
      ]),
      "1h": analysis([
        { id: "descending_triangle", name: "Descending Triangle", direction: "Bearish", confidence: 86 },
        { id: "stair_step_down", name: "Stair Step Down", direction: "Bearish", confidence: 84 },
        { id: "mean_reversion_bounce", name: "Mean Reversion Bounce", direction: "Bullish", confidence: 82 },
      ]),
    },
    { pair: "ETH / USDT" }
  );

  assert.equal(summary.subtitleLines[0], "ETH / USDT pattern read complete.");
  assert.match(summary.subtitleLines[1], /currently seems to look/i);
  assert.match(summary.subtitleLines[2], /Descending Triangle/);
  assert.match(summary.subtitleLines[2], /Let's see what happens\./);
  assert.doesNotMatch(summary.subtitleLines.join(" "), /\bconfirmed\b|\bdefinitely\b|\bwill\b/i);
});
