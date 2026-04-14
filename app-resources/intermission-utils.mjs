export const INTERMISSION_CLOSE_MS = 1100;
export const INTERMISSION_SUMMARY_MS = 30000;
export const INTERMISSION_NEWS_MS = 9000;
export const INTERMISSION_OPEN_MS = 10000;
export const INTERMISSION_TOTAL_SEQUENCE_MS = INTERMISSION_CLOSE_MS + INTERMISSION_SUMMARY_MS + INTERMISSION_NEWS_MS + INTERMISSION_OPEN_MS;
export const INTERMISSION_TOTAL_MS = INTERMISSION_TOTAL_SEQUENCE_MS;

export const DEFAULT_INTERVAL_ORDER = ["4h", "1h", "30m", "15m", "5m", "1m"];

export const TIMEFRAME_VOTE_WEIGHTS = {
  "4h": 6,
  "1h": 5,
  "30m": 4,
  "15m": 3,
  "5m": 2,
  "1m": 1,
};

export const RANK_VOTE_WEIGHTS = [1, 0.6, 0.35];

function normalizeDirection(direction) {
  if (direction === "Bullish" || direction === "Bearish" || direction === "Neutral") {
    return direction;
  }
  return "Neutral";
}

function asIntervalMap(intervalAnalyses, orderedIntervals) {
  if (!intervalAnalyses) {
    return {};
  }
  if (Array.isArray(intervalAnalyses)) {
    return Object.fromEntries(
      intervalAnalyses
        .filter((entry) => entry?.interval)
        .map((entry) => [entry.interval, entry.analysis || null])
    );
  }
  return Object.fromEntries(
    orderedIntervals.map((interval) => [interval, intervalAnalyses[interval] || null])
  );
}

function extractRankedPatterns(analysis) {
  if (!analysis) {
    return [];
  }

  if (Array.isArray(analysis.patterns) && analysis.patterns.length) {
    return analysis.patterns
      .slice(0, 3)
      .map((pattern, index) => ({
        id: pattern.id || analysis.patternId || `pattern-${index + 1}`,
        name: pattern.name || analysis.title || `Pattern ${index + 1}`,
        direction: normalizeDirection(pattern.direction || analysis.direction),
        confidence: Number(pattern.confidence || analysis.confidence || 0),
        rank: index + 1,
      }));
  }

  if (!analysis.patternId) {
    return [];
  }

  return [
    {
      id: analysis.patternId,
      name: analysis.pattern?.name || analysis.title || "Pattern",
      direction: normalizeDirection(analysis.direction || analysis.pattern?.direction),
      confidence: Number(analysis.confidence || analysis.pattern?.confidence || 0),
      rank: 1,
    },
  ];
}

function formatPatternNames(patternNames) {
  if (!patternNames.length) {
    return "";
  }
  if (patternNames.length === 1) {
    return patternNames[0];
  }
  if (patternNames.length === 2) {
    return `${patternNames[0]} and ${patternNames[1]}`;
  }
  return `${patternNames[0]}, ${patternNames[1]}, and ${patternNames[2]}`;
}

export function classifyBias(directionScores) {
  const sorted = Object.entries(directionScores)
    .sort((left, right) => right[1] - left[1]);

  const [winnerDirection, winnerScore] = sorted[0] || ["Neutral", 0];
  const [, runnerUpScore] = sorted[1] || ["Neutral", 0];
  const [, thirdScore] = sorted[2] || ["Neutral", 0];

  if (!winnerScore || winnerDirection === "Neutral") {
    return {
      dominantDirection: "Neutral",
      biasPhrase: "mixed / neutral",
      biasStrength: "mixed",
    };
  }

  const beatsRunnerUp = winnerScore >= runnerUpScore * 1.15;
  const beatsNeutral = winnerScore >= thirdScore * 1.15;
  if (!beatsRunnerUp || !beatsNeutral) {
    return {
      dominantDirection: "Neutral",
      biasPhrase: "mixed / neutral",
      biasStrength: "mixed",
    };
  }

  const ratio = runnerUpScore > 0 ? winnerScore / runnerUpScore : Infinity;
  const biasStrength = ratio >= 1.35 ? "strongly" : "mildly";
  return {
    dominantDirection: winnerDirection,
    biasPhrase: `${biasStrength} ${winnerDirection.toLowerCase()}`,
    biasStrength,
  };
}

export function aggregatePatternVotes(intervalAnalyses, orderedIntervals = DEFAULT_INTERVAL_ORDER) {
  const intervalMap = asIntervalMap(intervalAnalyses, orderedIntervals);
  const directionScores = {
    Bullish: 0,
    Bearish: 0,
    Neutral: 0,
  };
  const patternScores = new Map();
  const intervalBreakdown = [];
  let contributingIntervals = 0;

  orderedIntervals.forEach((interval) => {
    const analysis = intervalMap[interval] || null;
    const rankedPatterns = extractRankedPatterns(analysis);
    if (rankedPatterns.length) {
      contributingIntervals += 1;
    }

    rankedPatterns.forEach((pattern, index) => {
      const timeframeWeight = TIMEFRAME_VOTE_WEIGHTS[interval] || 1;
      const rankWeight = RANK_VOTE_WEIGHTS[index] || 0;
      const contribution = timeframeWeight * rankWeight * (Math.max(pattern.confidence, 0) / 100);
      const direction = normalizeDirection(pattern.direction);
      directionScores[direction] += contribution;

      const existing = patternScores.get(pattern.id) || {
        id: pattern.id,
        name: pattern.name,
        direction,
        score: 0,
        bestConfidence: 0,
        intervals: [],
      };
      existing.score += contribution;
      existing.bestConfidence = Math.max(existing.bestConfidence, pattern.confidence);
      existing.intervals.push(interval);
      patternScores.set(pattern.id, existing);
    });

    intervalBreakdown.push({
      interval,
      patterns: rankedPatterns,
    });
  });

  const topPatterns = [...patternScores.values()]
    .sort((left, right) => right.score - left.score || right.bestConfidence - left.bestConfidence || left.name.localeCompare(right.name))
    .slice(0, 3);

  return {
    directionScores,
    topPatterns,
    intervalBreakdown,
    contributingIntervals,
    totalContribution: directionScores.Bullish + directionScores.Bearish + directionScores.Neutral,
    ...classifyBias(directionScores),
  };
}

export function buildSubtitleLines(summary, coin) {
  const coinPair = coin?.pair || "This market";
  const topPatternNames = summary.topPatterns.map((pattern) => pattern.name).slice(0, 3);

  return [
    `${coinPair} pattern read complete.`,
    `Based on the six-timeframe analysis, the market currently seems to look ${summary.biasPhrase}.`,
    topPatternNames.length
      ? `The strongest reads came from ${formatPatternNames(topPatternNames)}. Let's see what happens.`
      : "The strongest reads are still mixed across the scanned timeframes. Let's see what happens.",
  ];
}

export function buildIntermissionSummary(intervalAnalyses, coin, orderedIntervals = DEFAULT_INTERVAL_ORDER, options = {}) {
  const aggregate = aggregatePatternVotes(intervalAnalyses, orderedIntervals);
  return {
    ...aggregate,
    coin,
    analysisStatus: options.analysisStatus || "ready",
    subtitleLines: buildSubtitleLines(aggregate, coin),
  };
}
