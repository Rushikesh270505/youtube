import {
  analyzeDetectedPatterns,
  buildTopDownAnalysis,
  TOP_DOWN_INTERVALS,
} from "./detectors.mjs?v=20260325h";

function resolveIntervals(scanIntervals = []) {
  return Array.isArray(scanIntervals) && scanIntervals.length
    ? scanIntervals
    : TOP_DOWN_INTERVALS;
}

function buildEntriesFromCandles(candleMap = {}, displayedInterval = "1m", orderedIntervals = TOP_DOWN_INTERVALS) {
  return orderedIntervals.map((interval) => {
    const candles = Array.isArray(candleMap[interval]) ? candleMap[interval] : [];
    return {
      interval,
      analysis: candles.length ? analyzeDetectedPatterns(candles, interval) : null,
      isUnavailable: !candles.length,
    };
  });
}

self.addEventListener("message", (event) => {
  const payload = event.data || {};
  const {
    requestId,
    type = "top-down-analysis",
    candles,
    interval = "1m",
    intervalCandles = {},
    marketSymbol = "",
    scanIntervals = [],
  } = payload;

  try {
    const orderedIntervals = resolveIntervals(scanIntervals);

    if (type === "interval-analysis") {
      const intervalAnalysis = analyzeDetectedPatterns(Array.isArray(candles) ? candles : [], interval);
      const topDownAnalysis = buildTopDownAnalysis(
        [
          {
            interval,
            analysis: intervalAnalysis,
            isUnavailable: false,
          },
        ],
        interval,
        orderedIntervals
      );
      self.postMessage({
        requestId,
        type,
        marketSymbol,
        interval,
        intervalAnalysis,
        intervalAnalyses: {
          [interval]: intervalAnalysis,
        },
        topDownAnalysis,
        timeframeAlignment: topDownAnalysis?.timeframeAlignment || [],
      });
      return;
    }

    const candleMap = {
      ...intervalCandles,
    };
    if (Array.isArray(candles)) {
      candleMap[interval] = candles;
    }

    const entries = buildEntriesFromCandles(candleMap, interval, orderedIntervals);
    const intervalAnalyses = Object.fromEntries(entries.map((entry) => [entry.interval, entry.analysis]));
    const topDownAnalysis = buildTopDownAnalysis(entries, interval, orderedIntervals);

    self.postMessage({
      requestId,
      type,
      marketSymbol,
      interval,
      intervalAnalysis: intervalAnalyses[interval] || null,
      intervalAnalyses,
      topDownAnalysis,
      timeframeAlignment: topDownAnalysis?.timeframeAlignment || [],
    });
  } catch (error) {
    self.postMessage({
      requestId,
      type,
      marketSymbol,
      interval,
      error: error?.message || String(error),
    });
  }
});
