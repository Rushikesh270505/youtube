import test from "node:test";
import assert from "node:assert/strict";

import {
  DETECTOR_REGISTRY,
  DETECTION_THRESHOLD,
  PATTERN_REFERENCE_LIBRARY,
  TOP_DOWN_INTERVALS,
  analyzeDetectedPatterns,
  buildTopDownAnalysis,
  buildFixtureCandles,
} from "../detectors.mjs";

function buildFlatCandles(count = 36, startPrice = 100, intervalMs = 60_000) {
  const candles = [];
  const startTime = Date.now() - count * intervalMs;
  for (let index = 0; index < count; index += 1) {
    const open = startPrice;
    const close = startPrice + ((index % 3) - 1) * 0.02;
    candles.push({
      openTime: startTime + index * intervalMs,
      open,
      high: Math.max(open, close) + 0.05,
      low: Math.min(open, close) - 0.05,
      close,
      volume: 18 + (index % 4) * 0.5,
      closeTime: startTime + (index + 1) * intervalMs,
    });
  }
  return candles;
}

test("detector registry exposes 68 dedicated detectors", () => {
  assert.equal(DETECTOR_REGISTRY.length, 68);
});

test("pattern reference library exposes 68 textbook reference entries", () => {
  assert.equal(Object.keys(PATTERN_REFERENCE_LIBRARY).length, 68);
  const reference = PATTERN_REFERENCE_LIBRARY.double_top_echo;
  assert.equal(reference.referenceTitle, "Double Top Echo");
  assert.ok(reference.referenceDescription.length > 40);
  assert.equal(reference.referenceTraits.length, 4);
  assert.ok(Array.isArray(reference.referenceIllustration.signature));
});

test("flat tape does not force a high-confidence active pattern", () => {
  const analysis = analyzeDetectedPatterns(buildFlatCandles(), "1m");
  assert.equal(analysis.patternId, null);
  assert.equal(analysis.confidence, 0);
  assert.equal(analysis.patterns.length, 0);
});

test("representative canonical fixtures self-detect cleanly", () => {
  const canonicalIds = [
    "rounded_top",
    "rounded_bottom",
    "capitulation_bottom",
    "low_tight_flag",
    "descending_triangle",
    "rising_wedge",
    "falling_wedge",
    "megaphone",
    "base_breakout",
    "rounded_distribution",
  ];

  for (const id of canonicalIds) {
    const analysis = analyzeDetectedPatterns(buildFixtureCandles(id), "1m");
    assert.equal(analysis.patternId, id, `${id} should win its canonical fixture`);
    assert.ok(analysis.confidence >= DETECTION_THRESHOLD, `${id} should clear the conservative threshold`);
    assert.ok(Array.isArray(analysis.tracePoints) && analysis.tracePoints.length >= 2, `${id} should expose chart trace points`);
  }
});

test("each detector can evaluate its own canonical fixture without throwing", () => {
  for (const detector of DETECTOR_REGISTRY) {
    const result = detector.detect(buildFixtureCandles(detector.id), "1m");
    assert.ok(result === null || result.id === detector.id, `${detector.id} should either return null or its own detector result`);
  }
});

function buildAnalysis(patternId, name, confidence = 88, direction = "Bullish") {
  return {
    patternId,
    confidence,
    direction,
    marketBias: direction === "Bearish" ? "Cautious bias" : "Bullish bias",
    regime: "Trend",
    span: { timeLabel: "10:00 -> 10:30" },
    pattern: {
      id: patternId,
      name,
      direction,
      confidence,
    },
  };
}

test("top-down analysis picks the highest timeframe and keeps exact matches downward", () => {
  const topDown = buildTopDownAnalysis(
    [
      { interval: "4h", analysis: buildAnalysis("drift_base", "Drift Base", 87, "Bullish") },
      { interval: "1h", analysis: buildAnalysis("drift_base", "Drift Base", 86, "Bullish") },
      { interval: "30m", analysis: buildAnalysis("drift_base", "Drift Base", 86, "Bullish") },
      { interval: "15m", analysis: null },
      { interval: "5m", analysis: buildAnalysis("cup_handle", "Cup and Handle", 88, "Bullish") },
      { interval: "1m", analysis: buildAnalysis("cup_handle", "Cup and Handle", 87, "Bullish") },
    ],
    "5m",
    TOP_DOWN_INTERVALS
  );

  assert.equal(topDown.leadInterval, "4h");
  assert.equal(topDown.topDownPatternId, "drift_base");
  assert.deepEqual(topDown.cascadeIntervals, ["4h", "1h", "30m"]);
  assert.equal(topDown.cascadeBreakInterval, "15m");
  assert.equal(topDown.currentIntervalPattern.patternId, "cup_handle");
});

test("top-down analysis stops the cascade when a smaller timeframe diverges", () => {
  const topDown = buildTopDownAnalysis(
    [
      { interval: "4h", analysis: buildAnalysis("pennant_breakout", "Pennant Breakout", 90, "Bullish") },
      { interval: "1h", analysis: buildAnalysis("pennant_breakout", "Pennant Breakout", 88, "Bullish") },
      { interval: "30m", analysis: buildAnalysis("ascending_triangle", "Ascending Triangle", 86, "Bullish") },
      { interval: "15m", analysis: buildAnalysis("ascending_triangle", "Ascending Triangle", 85, "Bullish") },
      { interval: "5m", analysis: null },
      { interval: "1m", analysis: null },
    ],
    "15m",
    TOP_DOWN_INTERVALS
  );

  assert.equal(topDown.leadInterval, "4h");
  assert.deepEqual(topDown.cascadeIntervals, ["4h", "1h"]);
  assert.equal(topDown.cascadeBreakInterval, "30m");
  assert.equal(topDown.timeframeAlignment.find((item) => item.interval === "30m")?.status, "Diverging");
  assert.equal(topDown.timeframeAlignment.find((item) => item.interval === "15m")?.status, "Unconfirmed");
});

test("top-down analysis falls through to the next lower matched timeframe when larger frames are empty", () => {
  const topDown = buildTopDownAnalysis(
    [
      { interval: "4h", analysis: null },
      { interval: "1h", analysis: null },
      { interval: "30m", analysis: buildAnalysis("rising_wedge", "Rising Wedge", 86, "Bearish") },
      { interval: "15m", analysis: buildAnalysis("rising_wedge", "Rising Wedge", 85, "Bearish") },
      { interval: "5m", analysis: null },
      { interval: "1m", analysis: null },
    ],
    "15m",
    TOP_DOWN_INTERVALS
  );

  assert.equal(topDown.leadInterval, "30m");
  assert.equal(topDown.topDownPatternId, "rising_wedge");
  assert.deepEqual(topDown.cascadeIntervals, ["30m", "15m"]);
});
