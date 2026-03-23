const DETECTION_THRESHOLD = 84;
const DEFAULT_WINDOW_SIZES = [18, 22, 26, 30];
const DEFAULT_END_OFFSETS = [0, 1, 2, 3];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function average(values) {
  return values.length ? sum(values) / values.length : 0;
}

function last(values) {
  return values[values.length - 1];
}

function minimum(values) {
  return values.length ? Math.min(...values) : 0;
}

function maximum(values) {
  return values.length ? Math.max(...values) : 0;
}

function percentageMove(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === 0) {
    return 0;
  }
  return (end - start) / start;
}

function percentText(value, decimals = 2) {
  return `${(value * 100).toFixed(decimals)}%`;
}

function formatChartTime(timestamp) {
  if (!Number.isFinite(timestamp)) {
    return "--:--";
  }
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function linearSlope(values) {
  if (values.length < 2) {
    return 0;
  }
  const xMean = (values.length - 1) / 2;
  const yMean = average(values);
  let numerator = 0;
  let denominator = 0;
  values.forEach((value, index) => {
    numerator += (index - xMean) * (value - yMean);
    denominator += (index - xMean) ** 2;
  });
  return denominator ? (numerator / denominator) / Math.max(Math.abs(values[0]), 1e-9) : 0;
}

function normalizeSeries(values) {
  if (!values.length) {
    return [];
  }
  const minValue = minimum(values);
  const maxValue = maximum(values);
  const spread = maxValue - minValue;
  if (spread < 1e-9) {
    return values.map(() => 0.5);
  }
  return values.map((value) => (value - minValue) / spread);
}

function resampleSeries(values, targetLength) {
  if (!values.length) {
    return new Array(targetLength).fill(0);
  }
  if (values.length === targetLength) {
    return values.slice();
  }
  const lastIndex = values.length - 1;
  return Array.from({ length: targetLength }, (_, index) => {
    const position = (index / Math.max(targetLength - 1, 1)) * lastIndex;
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(lastIndex, leftIndex + 1);
    const blend = position - leftIndex;
    return values[leftIndex] * (1 - blend) + values[rightIndex] * blend;
  });
}

function rmse(left, right) {
  if (!left.length || !right.length) {
    return 1;
  }
  const size = Math.min(left.length, right.length);
  let total = 0;
  for (let index = 0; index < size; index += 1) {
    total += (left[index] - right[index]) ** 2;
  }
  return Math.sqrt(total / size);
}

function invertSeries(series) {
  return normalizeSeries(series.map((value) => 1 - value));
}

function tiltSeries(series, amount) {
  const lastIndex = Math.max(series.length - 1, 1);
  return normalizeSeries(
    series.map((value, index) => {
      const tilt = ((index / lastIndex) - 0.5) * amount;
      return clamp(value + tilt, 0, 1);
    })
  );
}

function squeezeSeries(series, factor) {
  return normalizeSeries(series.map((value) => 0.5 + (value - 0.5) * factor));
}

function scoreNear(value, tolerance) {
  return clamp(1 - Math.abs(value) / Math.max(tolerance, 1e-9), 0, 1);
}

function scoreAtLeast(value, target) {
  return clamp(value / Math.max(target, 1e-9), 0, 1);
}

function scoreAtMost(value, target) {
  return clamp(1 - value / Math.max(target, 1e-9), 0, 1);
}

function scoreBetween(value, minimumTarget, maximumTarget) {
  if (value < minimumTarget) {
    return clamp(value / Math.max(minimumTarget, 1e-9), 0, 1);
  }
  if (value > maximumTarget) {
    return clamp(1 - (value - maximumTarget) / Math.max(maximumTarget, 1e-9), 0, 1);
  }
  return 1;
}

function priceGapRatio(left, right) {
  const scale = Math.max(Math.abs((left + right) / 2), 1e-9);
  return Math.abs(left - right) / scale;
}

function localizeIntervalCopy(value, intervalLabel) {
  if (typeof value !== "string" || intervalLabel === "1m") {
    return value;
  }
  return value.replaceAll("1m", intervalLabel);
}

function buildSpan(candles, startIndex, endIndex) {
  const safeStart = clamp(startIndex, 0, Math.max(candles.length - 1, 0));
  const safeEnd = clamp(endIndex, safeStart, Math.max(candles.length - 1, 0));
  const startCandle = candles[safeStart];
  const endCandle = candles[safeEnd];
  return {
    startIndex: safeStart,
    endIndex: safeEnd,
    candleStart: safeStart + 1,
    candleEnd: safeEnd + 1,
    startTime: startCandle?.openTime ?? null,
    endTime: endCandle?.openTime ?? endCandle?.closeTime ?? null,
    candleLabel: `C${safeStart + 1}-${safeEnd + 1}`,
    timeLabel: `${formatChartTime(startCandle?.openTime)} -> ${formatChartTime(endCandle?.openTime ?? endCandle?.closeTime)}`,
  };
}

function extractPivots(candles, minGap = 2) {
  const pivots = [];
  for (let index = 1; index < candles.length - 1; index += 1) {
    const previous = candles[index - 1];
    const current = candles[index];
    const next = candles[index + 1];
    const isPeak = current.high >= previous.high && current.high >= next.high;
    const isTrough = current.low <= previous.low && current.low <= next.low;
    if (!isPeak && !isTrough) {
      continue;
    }

    const kind = isPeak && !isTrough
      ? "high"
      : isTrough && !isPeak
        ? "low"
        : Math.abs(current.high - Math.max(previous.high, next.high)) >= Math.abs(Math.min(previous.low, next.low) - current.low)
          ? "high"
          : "low";
    const price = kind === "high" ? current.high : current.low;
    const close = current.close;
    const latest = pivots[pivots.length - 1];

    if (latest?.kind === kind) {
      const moreExtreme = kind === "high" ? price >= latest.price : price <= latest.price;
      if (moreExtreme) {
        pivots[pivots.length - 1] = { index, kind, price, close };
      }
      continue;
    }

    if (latest && index - latest.index < minGap) {
      const moreExtreme = kind === "high" ? price >= latest.price : price <= latest.price;
      if (moreExtreme) {
        pivots[pivots.length - 1] = { index, kind, price, close };
      }
      continue;
    }

    pivots.push({ index, kind, price, close });
  }
  return pivots;
}

function findContiguousSequences(pivots, kinds) {
  const sequences = [];
  for (let index = 0; index <= pivots.length - kinds.length; index += 1) {
    let matches = true;
    for (let offset = 0; offset < kinds.length; offset += 1) {
      if (pivots[index + offset].kind !== kinds[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      sequences.push(pivots.slice(index, index + kinds.length));
    }
  }
  return sequences;
}

function buildWindowContext(candles, startIndex, endIndex, intervalLabel) {
  const window = candles.slice(startIndex, endIndex + 1);
  const closes = window.map((candle) => candle.close);
  const highs = window.map((candle) => candle.high);
  const lows = window.map((candle) => candle.low);
  const volumes = window.map((candle) => candle.volume);
  const priceAverage = average(closes);
  const third = Math.max(3, Math.floor(window.length / 3));
  const early = window.slice(0, third);
  const middle = window.slice(third, Math.max(third + 1, window.length - third));
  const late = window.slice(-third);
  const earlyVolumes = early.map((candle) => candle.volume);
  const lateVolumes = late.map((candle) => candle.volume);
  const earlyRange = (maximum(early.map((candle) => candle.high)) - minimum(early.map((candle) => candle.low))) / Math.max(average(early.map((candle) => candle.close)), 1e-9);
  const lateRange = (maximum(late.map((candle) => candle.high)) - minimum(late.map((candle) => candle.low))) / Math.max(average(late.map((candle) => candle.close)), 1e-9);
  const minGap = Math.max(2, Math.floor(window.length / 10));
  const pivots = extractPivots(window, minGap);
  return {
    intervalLabel,
    candles,
    window,
    startIndex,
    endIndex,
    closes,
    highs,
    lows,
    volumes,
    normalizedCloses: normalizeSeries(closes),
    normalizedVolumes: normalizeSeries(volumes),
    pivots,
    highPivots: pivots.filter((pivot) => pivot.kind === "high"),
    lowPivots: pivots.filter((pivot) => pivot.kind === "low"),
    length: window.length,
    firstClose: closes[0],
    lastClose: last(closes),
    highestHigh: maximum(highs),
    lowestLow: minimum(lows),
    closeSlope: linearSlope(closes),
    highSlope: linearSlope(highs),
    lowSlope: linearSlope(lows),
    volumeSlope: linearSlope(volumes),
    move: percentageMove(closes[0], last(closes)),
    priceAverage,
    rangeRatio: (maximum(highs) - minimum(lows)) / Math.max(priceAverage, 1e-9),
    earlyRange,
    lateRange,
    earlyVolume: average(earlyVolumes),
    lateVolume: average(lateVolumes),
    volumeBoost: average(earlyVolumes) ? average(lateVolumes) / average(earlyVolumes) : 1,
    toGlobal(points) {
      return points.map((point) => ({
        index: startIndex + point.index,
        price: point.price,
      }));
    },
  };
}

function buildGuideLine(left, right, mode = "line") {
  return {
    mode,
    points: [
      { index: left.index, price: left.price },
      { index: right.index, price: right.price },
    ],
  };
}

function finalPoint(ctx) {
  return { index: ctx.length - 1, price: ctx.lastClose };
}

function buildBaseResult(spec, candles, ctx, metrics, intervalLabel) {
  const freshnessScore = clamp(metrics.freshnessScore ?? 1, 0, 1);
  const structureScore = clamp(metrics.structureScore ?? 0, 0, 1);
  const volumeScore = clamp(metrics.volumeScore ?? 0.5, 0, 1);
  const confirmationScore = clamp(metrics.confirmationScore ?? structureScore, 0, 1);
  const prototypeScore = clamp(metrics.prototypeScore ?? 0.5, 0, 1);
  const score = clamp(
    prototypeScore * 0.62 + structureScore * 0.18 + volumeScore * 0.08 + freshnessScore * 0.06 + confirmationScore * 0.06,
    0,
    1
  );
  const confidence = Math.round(44 + score * 52);
  const span = buildSpan(candles, ctx.startIndex, ctx.endIndex);
  const rationale = localizeIntervalCopy(metrics.rationale ?? spec.bias, intervalLabel);
  const moveText = percentText(percentageMove(ctx.firstClose, ctx.lastClose), 3);
  const body = `${rationale} Active span ${span.timeLabel} with ${moveText} net movement.`;
  const minConfidence = spec.minConfidence ?? DETECTION_THRESHOLD;
  const minScore = spec.minScore ?? 0.58;
  const minStructure = spec.minStructure ?? 0.48;
  const minPrototype = spec.minPrototype ?? 0.6;

  return {
    id: spec.id,
    name: spec.name,
    family: spec.family,
    direction: spec.direction,
    matched: confidence >= minConfidence && score >= minScore && structureScore >= minStructure && prototypeScore >= minPrototype,
    confidence,
    score,
    startIndex: ctx.startIndex,
    endIndex: ctx.endIndex,
    timeLabel: span.timeLabel,
    span,
    tracePoints: metrics.tracePoints || [],
    guideLines: metrics.guideLines || [],
    bias: spec.bias,
    marketBias: spec.marketBias,
    regime: spec.regime,
    rationale,
    freshnessScore,
    volumeScore,
    structureScore,
    prototypeScore,
    confirmationScore,
    body,
    title: `${intervalLabel} ${spec.name} Detected`,
    tagline: `${intervalLabel} ${spec.name} active`,
  };
}

function scorePrototypeAlignment(spec, ctx) {
  if (!spec.signature?.length) {
    return 0.5;
  }
  const closeSeries = resampleSeries(ctx.normalizedCloses, spec.signature.length);
  const shapeScore = 1 - rmse(closeSeries, spec.signature);
  const volumeTarget = VOLUME_SIGNATURES[spec.volumeMode] || VOLUME_SIGNATURES.flat;
  const volumeSeries = resampleSeries(ctx.normalizedVolumes, volumeTarget.length);
  const volumeAgreement = 1 - rmse(volumeSeries, volumeTarget);
  return clamp(shapeScore * 0.8 + volumeAgreement * 0.2, 0, 1);
}

function scoreVolumeByMode(mode, ctx) {
  const volumeBoost = ctx.volumeBoost;
  const rangeShift = ctx.lateRange / Math.max(ctx.earlyRange, 1e-9);
  switch (mode) {
    case "breakout":
      return clamp((volumeBoost - 1) / 0.28, 0, 1);
    case "compression":
      return clamp(1 - (volumeBoost - 0.8) / 0.9, 0, 1) * 0.45 + clamp(1 - (rangeShift - 0.74) / 0.85, 0, 1) * 0.55;
    case "expansion":
      return clamp((rangeShift - 1) / 0.24, 0, 1) * 0.52 + clamp((volumeBoost - 1) / 0.18, 0, 1) * 0.48;
    case "spikeFade":
      return clamp((maximum(ctx.volumes) / Math.max(average(ctx.volumes), 1e-9) - 1.2) / 0.7, 0, 1);
    case "sweep":
      return clamp((maximum(ctx.volumes) / Math.max(average(ctx.volumes), 1e-9) - 1.35) / 0.7, 0, 1);
    case "accumulate":
      return clamp((volumeBoost - 0.92) / 0.22, 0, 1);
    case "distribute":
      return clamp((volumeBoost - 0.95) / 0.2, 0, 1);
    case "rise":
      return clamp((volumeBoost - 0.98) / 0.16, 0, 1);
    case "fade":
      return clamp(1 - (volumeBoost - 0.88) / 0.5, 0, 1);
    case "flat":
      return 1 - clamp(Math.abs(volumeBoost - 1) / 0.35, 0, 1);
    default:
      return 0.5;
  }
}

function computeFreshness(candlesLength, endIndex, windowSize) {
  const candlesFromEdge = Math.max(0, candlesLength - 1 - endIndex);
  if (candlesFromEdge <= 1) {
    return 1;
  }
  return clamp(1 - candlesFromEdge / Math.max(windowSize * 0.22, 1), 0, 1);
}

function findBestSequence(sequences, scoreBuilder) {
  let best = null;
  sequences.forEach((sequence) => {
    const candidate = scoreBuilder(sequence);
    if (!best || candidate.score > best.score) {
      best = candidate;
    }
  });
  return best;
}

function evaluateDoubleSwing(spec, ctx) {
  const kinds = spec.side === "top" ? ["high", "low", "high"] : ["low", "high", "low"];
  const sequence = findBestSequence(findContiguousSequences(ctx.pivots, kinds), (seq) => {
    const [left, mid, right] = seq;
    const levelScore = scoreNear(priceGapRatio(left.price, right.price), spec.levelTolerance ?? 0.0075);
    const depth = spec.side === "top"
      ? (Math.min(left.price, right.price) - mid.price) / Math.min(left.price, right.price)
      : (mid.price - Math.max(left.price, right.price)) / Math.max(left.price, right.price);
    const depthScore = scoreAtLeast(depth, spec.depthTarget ?? 0.004);
    const neckline = mid.price;
    const confirmMove = spec.side === "top"
      ? Math.max(0, (neckline - ctx.lastClose) / Math.max(neckline, 1e-9))
      : Math.max(0, (ctx.lastClose - neckline) / Math.max(neckline, 1e-9));
    const confirmScore = scoreAtLeast(confirmMove, spec.confirmTarget ?? 0.0018);
    const balanceScore = scoreNear(((mid.index - left.index) - (right.index - mid.index)) / ctx.length, 0.26);
    return {
      score: levelScore * 0.34 + depthScore * 0.3 + confirmScore * 0.22 + balanceScore * 0.14,
      structureScore: levelScore * 0.42 + depthScore * 0.34 + balanceScore * 0.24,
      confirmationScore: confirmScore,
      rationale: `${spec.bias}. The two swing ${spec.side === "top" ? "highs" : "lows"} are within ${percentText(priceGapRatio(left.price, right.price), 3)} while the middle reaction spans ${percentText(depth, 3)}.`,
      tracePoints: ctx.toGlobal([
        { index: left.index, price: left.price },
        { index: mid.index, price: mid.price },
        { index: right.index, price: right.price },
        finalPoint(ctx),
      ]),
      guideLines: [buildGuideLine({ index: left.index, price: neckline }, { index: ctx.length - 1, price: neckline }, "rail")],
    };
  });
  if (!sequence) {
    return null;
  }
  return {
    ...sequence,
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
  };
}

function evaluateTripleSwing(spec, ctx) {
  const kinds = spec.side === "top" ? ["high", "low", "high", "low", "high"] : ["low", "high", "low", "high", "low"];
  const sequence = findBestSequence(findContiguousSequences(ctx.pivots, kinds), (seq) => {
    const extremes = [seq[0].price, seq[2].price, seq[4].price];
    const levelScore = scoreNear((maximum(extremes) - minimum(extremes)) / Math.max(average(extremes), 1e-9), spec.levelTolerance ?? 0.012);
    const reactions = spec.side === "top"
      ? [
          (Math.min(seq[0].price, seq[2].price) - seq[1].price) / Math.min(seq[0].price, seq[2].price),
          (Math.min(seq[2].price, seq[4].price) - seq[3].price) / Math.min(seq[2].price, seq[4].price),
        ]
      : [
          (seq[1].price - Math.max(seq[0].price, seq[2].price)) / Math.max(seq[0].price, seq[2].price),
          (seq[3].price - Math.max(seq[2].price, seq[4].price)) / Math.max(seq[2].price, seq[4].price),
        ];
    const reactionScore = average(reactions.map((value) => scoreAtLeast(value, 0.0035)));
    const neckline = average([seq[1].price, seq[3].price]);
    const confirmMove = spec.side === "top"
      ? Math.max(0, (neckline - ctx.lastClose) / Math.max(neckline, 1e-9))
      : Math.max(0, (ctx.lastClose - neckline) / Math.max(neckline, 1e-9));
    const confirmScore = scoreAtLeast(confirmMove, 0.0018);
    return {
      score: levelScore * 0.34 + reactionScore * 0.34 + confirmScore * 0.22 + scoreNear((seq[4].index - seq[0].index) / ctx.length - 0.55, 0.32) * 0.1,
      structureScore: levelScore * 0.48 + reactionScore * 0.36 + scoreNear((seq[4].index - seq[0].index) / ctx.length - 0.55, 0.32) * 0.16,
      confirmationScore: confirmScore,
      rationale: `${spec.bias}. Three swing ${spec.side === "top" ? "highs" : "lows"} are clustering while the reaction legs remain clearly separated.`,
      tracePoints: ctx.toGlobal([
        { index: seq[0].index, price: seq[0].price },
        { index: seq[1].index, price: seq[1].price },
        { index: seq[2].index, price: seq[2].price },
        { index: seq[3].index, price: seq[3].price },
        { index: seq[4].index, price: seq[4].price },
        finalPoint(ctx),
      ]),
      guideLines: [buildGuideLine({ index: seq[0].index, price: neckline }, { index: ctx.length - 1, price: neckline }, "rail")],
    };
  });
  if (!sequence) {
    return null;
  }
  return { ...sequence, volumeScore: scoreVolumeByMode(spec.volumeMode, ctx) };
}

function evaluateHeadShoulders(spec, ctx) {
  const kinds = spec.side === "top" ? ["high", "low", "high", "low", "high"] : ["low", "high", "low", "high", "low"];
  const sequence = findBestSequence(findContiguousSequences(ctx.pivots, kinds), (seq) => {
    const shoulders = [seq[0].price, seq[4].price];
    const head = seq[2].price;
    const shouldersScore = scoreNear(priceGapRatio(shoulders[0], shoulders[1]), 0.012);
    const headEdge = spec.side === "top"
      ? (head - maximum(shoulders)) / Math.max(head, 1e-9)
      : (minimum(shoulders) - head) / Math.max(Math.abs(head), 1e-9);
    const headScore = scoreAtLeast(headEdge, 0.004);
    const neckline = {
      left: { index: seq[1].index, price: seq[1].price },
      right: { index: seq[3].index, price: seq[3].price },
    };
    const necklinePrice = average([seq[1].price, seq[3].price]);
    const confirmMove = spec.side === "top"
      ? Math.max(0, (necklinePrice - ctx.lastClose) / Math.max(necklinePrice, 1e-9))
      : Math.max(0, (ctx.lastClose - necklinePrice) / Math.max(necklinePrice, 1e-9));
    const confirmScore = scoreAtLeast(confirmMove, 0.0018);
    return {
      score: shouldersScore * 0.26 + headScore * 0.36 + confirmScore * 0.24 + scoreNear(((seq[2].index - seq[0].index) / (seq[4].index - seq[0].index || 1)) - 0.5, 0.16) * 0.14,
      structureScore: shouldersScore * 0.34 + headScore * 0.44 + scoreNear(((seq[2].index - seq[0].index) / (seq[4].index - seq[0].index || 1)) - 0.5, 0.16) * 0.22,
      confirmationScore: confirmScore,
      rationale: `${spec.bias}. The middle swing is protruding ${percentText(headEdge, 3)} beyond the two shoulders while the neckline is being tested.`,
      tracePoints: ctx.toGlobal([
        { index: seq[0].index, price: seq[0].price },
        { index: seq[1].index, price: seq[1].price },
        { index: seq[2].index, price: seq[2].price },
        { index: seq[3].index, price: seq[3].price },
        { index: seq[4].index, price: seq[4].price },
        finalPoint(ctx),
      ]),
      guideLines: [buildGuideLine(neckline.left, neckline.right, "rail")],
    };
  });
  if (!sequence) {
    return null;
  }
  return { ...sequence, volumeScore: scoreVolumeByMode(spec.volumeMode, ctx) };
}

function evaluateRoundedTurn(spec, ctx) {
  const normalized = ctx.normalizedCloses;
  const middleIndex = spec.side === "top"
    ? normalized.findIndex((value) => value === maximum(normalized))
    : normalized.findIndex((value) => value === minimum(normalized));
  const centerScore = scoreNear(middleIndex / Math.max(ctx.length - 1, 1) - 0.5, 0.2);
  const leftSlope = linearSlope(normalized.slice(0, Math.max(3, Math.floor(ctx.length / 2))));
  const rightSlope = linearSlope(normalized.slice(Math.floor(ctx.length / 2)));
  const slopeScore = spec.side === "top"
    ? scoreAtLeast(leftSlope, 0.01) * 0.5 + scoreAtLeast(-rightSlope, 0.01) * 0.5
    : scoreAtLeast(-leftSlope, 0.01) * 0.5 + scoreAtLeast(rightSlope, 0.01) * 0.5;
  const edgeGap = priceGapRatio(ctx.closes[0], last(ctx.closes));
  const edgeScore = scoreNear(edgeGap, 0.02);
  const curvature = spec.side === "top"
    ? (maximum(ctx.closes) - average([ctx.closes[0], last(ctx.closes)])) / Math.max(maximum(ctx.closes), 1e-9)
    : (average([ctx.closes[0], last(ctx.closes)]) - minimum(ctx.closes)) / Math.max(average([ctx.closes[0], last(ctx.closes)]), 1e-9);
  const curveScore = scoreAtLeast(curvature, 0.006);
  return {
    structureScore: centerScore * 0.26 + slopeScore * 0.3 + edgeScore * 0.16 + curveScore * 0.28,
    confirmationScore: spec.side === "top"
      ? scoreAtLeast((average(ctx.closes.slice(-4)) - ctx.lastClose) / Math.max(average(ctx.closes.slice(-4)), 1e-9), -0.002)
      : scoreAtLeast((ctx.lastClose - average(ctx.closes.slice(-4))) / Math.max(average(ctx.closes.slice(-4)), 1e-9), -0.002),
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The curve apex is centered and the left-to-right slope has transitioned cleanly.`,
    tracePoints: ctx.toGlobal([0, Math.floor(ctx.length * 0.2), Math.floor(ctx.length * 0.4), Math.floor(ctx.length * 0.6), Math.floor(ctx.length * 0.8), ctx.length - 1].map((index) => ({
      index,
      price: ctx.closes[index],
    }))),
    guideLines: [],
  };
}

function evaluateDiamond(spec, ctx) {
  const kinds = spec.side === "top" ? ["high", "low", "high", "low", "high"] : ["low", "high", "low", "high", "low"];
  const sequence = findBestSequence(findContiguousSequences(ctx.pivots, kinds), (seq) => {
    const firstAmplitude = Math.abs(seq[0].price - seq[1].price) / Math.max(average([seq[0].price, seq[1].price]), 1e-9);
    const midAmplitude = Math.abs(seq[2].price - seq[3].price) / Math.max(average([seq[2].price, seq[3].price]), 1e-9);
    const broadeningScore = scoreAtLeast(midAmplitude - firstAmplitude, 0.002);
    const contractionScore = scoreAtLeast(midAmplitude - Math.abs(seq[4].price - seq[3].price) / Math.max(average([seq[4].price, seq[3].price]), 1e-9), 0.001);
    const extremeScore = spec.side === "top"
      ? scoreAtLeast((seq[2].price - maximum([seq[0].price, seq[4].price])) / Math.max(seq[2].price, 1e-9), 0.003)
      : scoreAtLeast((minimum([seq[0].price, seq[4].price]) - seq[2].price) / Math.max(Math.abs(seq[2].price), 1e-9), 0.003);
    return {
      score: broadeningScore * 0.3 + contractionScore * 0.3 + extremeScore * 0.24 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.16,
      structureScore: broadeningScore * 0.34 + contractionScore * 0.34 + extremeScore * 0.32,
      confirmationScore: extremeScore,
      rationale: `${spec.bias}. Swing width expanded into the center of the structure and then started contracting again.`,
      tracePoints: ctx.toGlobal(seq.map((pivot) => ({ index: pivot.index, price: pivot.price }))),
      guideLines: [],
    };
  });
  return sequence;
}

function evaluateBroadening(spec, ctx) {
  const kinds = spec.side === "top" ? ["high", "low", "high", "low", "high"] : ["low", "high", "low", "high", "low"];
  const sequence = findBestSequence(findContiguousSequences(ctx.pivots, kinds), (seq) => {
    const amplitudes = [
      Math.abs(seq[0].price - seq[1].price),
      Math.abs(seq[2].price - seq[1].price),
      Math.abs(seq[2].price - seq[3].price),
      Math.abs(seq[4].price - seq[3].price),
    ];
    const expansionScore = scoreAtLeast((amplitudes[2] + amplitudes[3]) / Math.max(amplitudes[0] + amplitudes[1], 1e-9), 1.16);
    const trendScore = spec.side === "top"
      ? scoreAtLeast((seq[4].price - seq[0].price) / Math.max(seq[4].price, 1e-9), 0)
      : scoreAtLeast((seq[0].price - seq[4].price) / Math.max(seq[0].price, 1e-9), 0);
    return {
      score: expansionScore * 0.58 + trendScore * 0.18 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.24,
      structureScore: expansionScore * 0.74 + trendScore * 0.26,
      confirmationScore: trendScore,
      rationale: `${spec.bias}. The most recent swing amplitudes are widening instead of settling down.`,
      tracePoints: ctx.toGlobal(seq.map((pivot) => ({ index: pivot.index, price: pivot.price }))),
      guideLines: [],
    };
  });
  return sequence;
}

function evaluateVTurn(spec, ctx) {
  const closes = ctx.closes;
  const lowIndex = closes.findIndex((value) => value === minimum(closes));
  const highIndex = closes.findIndex((value) => value === maximum(closes));
  const turnIndex = spec.side === "bottom" ? lowIndex : highIndex;
  const leftMove = spec.side === "bottom"
    ? percentageMove(closes[0], closes[turnIndex])
    : percentageMove(closes[turnIndex], closes[0]);
  const rightMove = spec.side === "bottom"
    ? percentageMove(closes[turnIndex], last(closes))
    : percentageMove(last(closes), closes[turnIndex]);
  const shapeScore = scoreNear(turnIndex / Math.max(closes.length - 1, 1) - 0.5, 0.22);
  const leftScore = scoreAtLeast(Math.abs(leftMove), spec.leftMoveTarget ?? 0.008);
  const rightScore = scoreAtLeast(Math.abs(rightMove), spec.rightMoveTarget ?? 0.007);
  const followThrough = scoreAtLeast(spec.side === "bottom"
    ? (last(closes) - average(closes.slice(-4))) / Math.max(last(closes), 1e-9)
    : (average(closes.slice(-4)) - last(closes)) / Math.max(Math.abs(last(closes)), 1e-9), -0.0008);
  return {
    structureScore: shapeScore * 0.22 + leftScore * 0.32 + rightScore * 0.3 + followThrough * 0.16,
    confirmationScore: followThrough,
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The move snapped ${percentText(Math.abs(leftMove), 2)} into the turn and recovered ${percentText(Math.abs(rightMove), 2)} on the right side.`,
    tracePoints: ctx.toGlobal([
      { index: 0, price: closes[0] },
      { index: turnIndex, price: closes[turnIndex] },
      { index: ctx.length - 1, price: last(closes) },
    ]),
    guideLines: [],
  };
}

function evaluateFadePattern(spec, ctx) {
  const split = Math.max(5, Math.floor(ctx.length * 0.38));
  const first = ctx.closes.slice(0, split);
  const second = ctx.closes.slice(split);
  if (!first.length || !second.length) {
    return null;
  }

  if (spec.style === "dead_cat") {
    const drop = Math.abs(percentageMove(first[0], minimum(first)));
    const bounce = percentageMove(minimum(second), maximum(second));
    const fail = Math.max(0, (maximum(second) - last(second)) / Math.max(maximum(second), 1e-9));
    return {
      structureScore: scoreAtLeast(drop, 0.01) * 0.34 + scoreBetween(bounce, 0.003, 0.018) * 0.28 + scoreAtLeast(fail, 0.003) * 0.26 + scoreNear(linearSlope(second), 0.0018) * 0.12,
      confirmationScore: scoreAtLeast(fail, 0.003),
      volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
      rationale: `${spec.bias}. The selloff was sharp, the bounce stayed shallow, and follow-through is already fading.`,
      tracePoints: ctx.toGlobal([
        { index: 0, price: first[0] },
        { index: split - 1, price: minimum(first) },
        { index: split + Math.floor(second.length * 0.4), price: maximum(second) },
        { index: ctx.length - 1, price: ctx.lastClose },
      ]),
      guideLines: [],
    };
  }

  const rally = percentageMove(first[0], maximum(first));
  const fade = Math.max(0, (maximum(first.concat(second)) - last(ctx.closes)) / Math.max(maximum(ctx.closes), 1e-9));
  return {
    structureScore: scoreAtLeast(rally, 0.008) * 0.34 + scoreAtLeast(fade, 0.004) * 0.34 + scoreAtMost(Math.abs(linearSlope(second)), 0.003) * 0.16 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.16,
    confirmationScore: scoreAtLeast(fade, 0.004),
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The relief squeeze stalled and price is already giving back the late-session push.`,
    tracePoints: ctx.toGlobal([
      { index: 0, price: first[0] },
      { index: split - 1, price: maximum(first) },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [],
  };
}

function evaluateExhaustionSpike(spec, ctx) {
  const closes = ctx.closes;
  const extremeIndex = spec.side === "top"
    ? closes.findIndex((value) => value === maximum(closes))
    : closes.findIndex((value) => value === minimum(closes));
  const run = spec.side === "top"
    ? percentageMove(closes[0], closes[extremeIndex])
    : percentageMove(closes[extremeIndex], closes[0]);
  const unwind = spec.side === "top"
    ? Math.max(0, (closes[extremeIndex] - last(closes)) / Math.max(closes[extremeIndex], 1e-9))
    : Math.max(0, (last(closes) - closes[extremeIndex]) / Math.max(Math.abs(closes[extremeIndex]), 1e-9));
  const centered = scoreNear(extremeIndex / Math.max(ctx.length - 1, 1) - 0.68, 0.2);
  return {
    structureScore: scoreAtLeast(Math.abs(run), spec.runTarget ?? 0.012) * 0.38 + scoreAtLeast(unwind, spec.unwindTarget ?? 0.004) * 0.36 + centered * 0.14 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.12,
    confirmationScore: scoreAtLeast(unwind, spec.unwindTarget ?? 0.004),
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The move stretched ${percentText(Math.abs(run), 2)} into an exhaustion extreme before reversing ${percentText(unwind, 2)}.`,
    tracePoints: ctx.toGlobal([
      { index: 0, price: closes[0] },
      { index: extremeIndex, price: closes[extremeIndex] },
      { index: ctx.length - 1, price: last(closes) },
    ]),
    guideLines: [],
  };
}

function evaluateFlag(spec, ctx) {
  const poleLength = spec.poleLength ?? Math.max(5, Math.floor(ctx.length * 0.36));
  const pole = ctx.window.slice(0, poleLength);
  const flag = ctx.window.slice(poleLength);
  if (flag.length < 6) {
    return null;
  }
  const poleCloses = pole.map((candle) => candle.close);
  const flagCloses = flag.map((candle) => candle.close);
  const directionMultiplier = spec.direction === "Bearish" ? -1 : 1;
  const poleMove = percentageMove(poleCloses[0], last(poleCloses)) * directionMultiplier;
  const flagSlope = linearSlope(flagCloses) * directionMultiplier;
  const flagRange = (maximum(flagCloses) - minimum(flagCloses)) / Math.max(average(flagCloses), 1e-9);
  const pullbackDepth = spec.direction === "Bearish"
    ? (maximum(flagCloses) - minimum(poleCloses)) / Math.max(maximum(flagCloses), 1e-9)
    : (maximum(poleCloses) - minimum(flagCloses)) / Math.max(maximum(poleCloses), 1e-9);
  const poleScore = scoreAtLeast(poleMove, spec.poleTarget ?? 0.009);
  const flagSlopeScore = spec.style === "impulse"
    ? scoreAtMost(Math.abs(flagSlope), 0.0014)
    : spec.style === "micro"
      ? scoreAtMost(Math.abs(flagSlope), 0.0019)
      : scoreAtMost(Math.abs(flagSlope), 0.0025);
  const rangeScore = scoreAtMost(flagRange, spec.rangeTarget ?? (spec.style === "tight" ? 0.007 : 0.011));
  const pullbackScore = scoreAtMost(pullbackDepth, spec.pullbackTarget ?? (spec.style === "tight" ? 0.018 : 0.032));
  const breakoutScore = spec.direction === "Bearish"
    ? scoreAtLeast((minimum(flagCloses) - ctx.lastClose) / Math.max(minimum(flagCloses), 1e-9), spec.breakoutTarget ?? 0)
    : scoreAtLeast((ctx.lastClose - maximum(flagCloses)) / Math.max(maximum(flagCloses), 1e-9), spec.breakoutTarget ?? 0);
  const lineLeft = spec.direction === "Bearish"
    ? { index: poleLength, price: maximum(flagCloses) }
    : { index: poleLength, price: minimum(flagCloses) };
  const lineRight = spec.direction === "Bearish"
    ? { index: ctx.length - 1, price: maximum(flagCloses.slice(-3)) }
    : { index: ctx.length - 1, price: minimum(flagCloses.slice(-3)) };

  return {
    structureScore: poleScore * 0.32 + flagSlopeScore * 0.2 + rangeScore * 0.2 + pullbackScore * 0.2 + breakoutScore * 0.08,
    confirmationScore: breakoutScore,
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The impulse leg held while the flag stayed compact at ${percentText(flagRange, 2)} of price range.`,
    tracePoints: ctx.toGlobal([
      { index: 0, price: poleCloses[0] },
      { index: poleLength - 1, price: last(poleCloses) },
      { index: poleLength + Math.floor(flag.length / 2), price: average(flagCloses.slice(Math.floor(flag.length / 2) - 1, Math.floor(flag.length / 2) + 1)) || last(flagCloses) },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [buildGuideLine(lineLeft, lineRight, "rail")],
  };
}

function evaluatePennant(spec, ctx) {
  const poleLength = Math.max(5, Math.floor(ctx.length * 0.32));
  const pole = ctx.window.slice(0, poleLength);
  const pennant = ctx.window.slice(poleLength);
  if (pennant.length < 8) {
    return null;
  }
  const poleCloses = pole.map((candle) => candle.close);
  const directionMultiplier = spec.direction === "Bearish" ? -1 : 1;
  const poleMove = percentageMove(poleCloses[0], last(poleCloses)) * directionMultiplier;
  const pennantHighSlope = linearSlope(pennant.map((candle) => candle.high));
  const pennantLowSlope = linearSlope(pennant.map((candle) => candle.low));
  const convergence = spec.direction === "Bearish"
    ? scoreAtLeast(pennantLowSlope - pennantHighSlope, 0.0012)
    : scoreAtLeast(pennantLowSlope - pennantHighSlope, 0.0012);
  const breakoutScore = spec.direction === "Bearish"
    ? scoreAtLeast((minimum(pennant.map((candle) => candle.low)) - ctx.lastClose) / Math.max(minimum(pennant.map((candle) => candle.low)), 1e-9), 0)
    : scoreAtLeast((ctx.lastClose - maximum(pennant.map((candle) => candle.high))) / Math.max(maximum(pennant.map((candle) => candle.high)), 1e-9), 0);
  const upperLeft = { index: poleLength, price: pennant[0].high };
  const upperRight = { index: ctx.length - 1, price: maximum(pennant.slice(-2).map((candle) => candle.high)) };
  const lowerLeft = { index: poleLength, price: pennant[0].low };
  const lowerRight = { index: ctx.length - 1, price: minimum(pennant.slice(-2).map((candle) => candle.low)) };

  return {
    structureScore: scoreAtLeast(poleMove, 0.01) * 0.34 + convergence * 0.32 + scoreAtMost(ctx.lateRange / Math.max(ctx.earlyRange, 1e-9), 1) * 0.18 + breakoutScore * 0.16,
    confirmationScore: breakoutScore,
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The pole is intact and the pennant apex is tightening into the live edge.`,
    tracePoints: ctx.toGlobal([
      { index: 0, price: poleCloses[0] },
      { index: poleLength - 1, price: last(poleCloses) },
      { index: poleLength + Math.floor(pennant.length / 2), price: average([pennant[Math.floor(pennant.length / 2)].high, pennant[Math.floor(pennant.length / 2)].low]) },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [buildGuideLine(upperLeft, upperRight, "rail"), buildGuideLine(lowerLeft, lowerRight, "rail")],
  };
}

function evaluateTriangle(spec, ctx) {
  const slice = ctx.window.slice(-Math.max(10, Math.floor(ctx.length * 0.55)));
  const highs = slice.map((candle) => candle.high);
  const lows = slice.map((candle) => candle.low);
  const highSlope = linearSlope(highs);
  const lowSlope = linearSlope(lows);
  const highBand = (maximum(highs) - minimum(highs)) / Math.max(average(highs), 1e-9);
  const lowBand = (maximum(lows) - minimum(lows)) / Math.max(average(lows), 1e-9);
  let structureScore = 0;
  let rationale = spec.bias;
  if (spec.style === "ascending") {
    structureScore = scoreAtMost(highBand, 0.006) * 0.42 + scoreAtLeast(lowSlope, 0.0011) * 0.34 + scoreAtLeast((ctx.lastClose - average(highs)) / Math.max(average(highs), 1e-9), -0.0025) * 0.24;
    rationale = `${spec.bias}. Highs are capped inside ${percentText(highBand, 3)} while lows keep ratcheting upward.`;
  } else if (spec.style === "descending") {
    structureScore = scoreAtMost(lowBand, 0.006) * 0.42 + scoreAtLeast(-highSlope, 0.0011) * 0.34 + scoreAtLeast((average(lows) - ctx.lastClose) / Math.max(average(lows), 1e-9), -0.0025) * 0.24;
    rationale = `${spec.bias}. Lows are flat while overhead supply keeps stepping down.`;
  } else {
    structureScore = scoreAtLeast(lowSlope - highSlope, 0.0012) * 0.46 + scoreAtMost(Math.abs(highSlope + lowSlope), 0.0018) * 0.22 + scoreAtMost(ctx.lateRange / Math.max(ctx.earlyRange, 1e-9), 1) * 0.32;
    rationale = `${spec.bias}. Both rails are converging toward an apex with balanced pressure on each side.`;
  }
  return {
    structureScore,
    confirmationScore: scoreVolumeByMode(spec.volumeMode, ctx),
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale,
    tracePoints: ctx.toGlobal([
      { index: ctx.length - slice.length, price: average([slice[0].high, slice[0].low]) },
      { index: ctx.length - Math.floor(slice.length * 0.45), price: average([slice[Math.floor(slice.length * 0.45)].high, slice[Math.floor(slice.length * 0.45)].low]) },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [
      buildGuideLine({ index: ctx.length - slice.length, price: slice[0].high }, { index: ctx.length - 1, price: last(slice).high }, "rail"),
      buildGuideLine({ index: ctx.length - slice.length, price: slice[0].low }, { index: ctx.length - 1, price: last(slice).low }, "rail"),
    ],
  };
}

function evaluateFlatBreak(spec, ctx) {
  const slice = ctx.window.slice(-Math.max(10, Math.floor(ctx.length * 0.55)));
  const highs = slice.map((candle) => candle.high);
  const lows = slice.map((candle) => candle.low);
  const highBand = (maximum(highs) - minimum(highs)) / Math.max(average(highs), 1e-9);
  const lowBand = (maximum(lows) - minimum(lows)) / Math.max(average(lows), 1e-9);
  const breakout = spec.side === "top"
    ? Math.max(0, (ctx.lastClose - maximum(highs.slice(0, -1))) / Math.max(maximum(highs.slice(0, -1)), 1e-9))
    : Math.max(0, (minimum(lows.slice(0, -1)) - ctx.lastClose) / Math.max(minimum(lows.slice(0, -1)), 1e-9));
  return {
    structureScore: (spec.side === "top" ? scoreAtMost(highBand, 0.006) : scoreAtMost(lowBand, 0.006)) * 0.4 + scoreAtLeast(breakout, 0.0012) * 0.4 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.2,
    confirmationScore: scoreAtLeast(breakout, 0.0012),
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The range stayed flat and the live edge is now pushing through that shelf.`,
    tracePoints: ctx.toGlobal([
      { index: ctx.length - slice.length, price: spec.side === "top" ? average(highs) : average(lows) },
      { index: ctx.length - 3, price: spec.side === "top" ? average(highs) : average(lows) },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [buildGuideLine({ index: ctx.length - slice.length, price: spec.side === "top" ? average(highs) : average(lows) }, { index: ctx.length - 1, price: spec.side === "top" ? average(highs) : average(lows) }, "rail")],
  };
}

function evaluateStair(spec, ctx) {
  const relevant = spec.direction === "Bearish" ? ctx.highPivots : ctx.lowPivots;
  if (relevant.length < 3) {
    return null;
  }
  const sample = relevant.slice(-3);
  const monotonicScore = average(sample.slice(1).map((pivot, index) => {
    const previous = sample[index];
    if (spec.direction === "Bearish") {
      return scoreAtLeast((previous.price - pivot.price) / Math.max(previous.price, 1e-9), 0.0014);
    }
    return scoreAtLeast((pivot.price - previous.price) / Math.max(previous.price, 1e-9), 0.0014);
  }));
  const stepScore = scoreAtMost(Math.abs(linearSlope(sample.map((pivot) => pivot.price))), 0.01) * 0.2 + monotonicScore * 0.8;
  return {
    structureScore: stepScore * 0.62 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.18 + scoreAtLeast(Math.abs(ctx.move), 0.004) * 0.2,
    confirmationScore: scoreAtLeast(Math.abs(ctx.move), 0.004),
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. Successive swing ${spec.direction === "Bearish" ? "highs" : "lows"} are stepping in the same direction without losing cadence.`,
    tracePoints: ctx.toGlobal(sample.map((pivot) => ({ index: pivot.index, price: pivot.price })).concat([finalPoint(ctx)])),
    guideLines: [],
  };
}

function evaluateContinuationBox(spec, ctx) {
  const split = Math.max(5, Math.floor(ctx.length * 0.34));
  const impulse = ctx.closes.slice(0, split);
  const box = ctx.window.slice(split);
  const impulseMove = percentageMove(impulse[0], last(impulse));
  const boxHigh = maximum(box.map((candle) => candle.high));
  const boxLow = minimum(box.map((candle) => candle.low));
  const boxRange = (boxHigh - boxLow) / Math.max(average(box.map((candle) => candle.close)), 1e-9);
  const holdScore = scoreAtMost(boxRange, 0.012);
  const stayAboveScore = scoreAtLeast((boxLow - impulse[0]) / Math.max(impulse[0], 1e-9), 0);
  return {
    structureScore: scoreAtLeast(impulseMove, 0.008) * 0.34 + holdScore * 0.32 + stayAboveScore * 0.18 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.16,
    confirmationScore: holdScore,
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The initial drive held and the follow-on box stayed compact instead of unwinding.`,
    tracePoints: ctx.toGlobal([
      { index: 0, price: impulse[0] },
      { index: split - 1, price: last(impulse) },
      { index: split, price: boxLow },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [
      buildGuideLine({ index: split, price: boxHigh }, { index: ctx.length - 1, price: boxHigh }, "rail"),
      buildGuideLine({ index: split, price: boxLow }, { index: ctx.length - 1, price: boxLow }, "rail"),
    ],
  };
}

function evaluateRetest(spec, ctx) {
  const split = Math.max(6, Math.floor(ctx.length * 0.42));
  const base = ctx.window.slice(0, split);
  const follow = ctx.window.slice(split);
  const rangeHigh = maximum(base.map((candle) => candle.high));
  const rangeLow = minimum(base.map((candle) => candle.low));
  const breakoutLevel = spec.side === "top" ? rangeHigh : rangeLow;
  const breach = spec.side === "top"
    ? Math.max(0, (maximum(follow.map((candle) => candle.high)) - rangeHigh) / Math.max(rangeHigh, 1e-9))
    : Math.max(0, (rangeLow - minimum(follow.map((candle) => candle.low))) / Math.max(rangeLow, 1e-9));
  const retestScore = spec.side === "top"
    ? scoreAtLeast((minimum(follow.slice(-Math.min(4, follow.length)).map((candle) => candle.low)) - rangeHigh) / Math.max(rangeHigh, 1e-9), -0.0022)
    : scoreAtLeast((rangeLow - maximum(follow.slice(-Math.min(4, follow.length)).map((candle) => candle.high))) / Math.max(rangeLow, 1e-9), -0.0022);
  return {
    structureScore: scoreAtLeast(breach, 0.002) * 0.36 + retestScore * 0.36 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.18 + scoreAtMost(ctx.lateRange, 0.016) * 0.1,
    confirmationScore: retestScore,
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The breakout level was cleared and the live retest is still respecting that pivot.`,
    tracePoints: ctx.toGlobal([
      { index: split - 1, price: breakoutLevel },
      { index: split + Math.floor(follow.length * 0.3), price: spec.side === "top" ? maximum(follow.map((candle) => candle.high)) : minimum(follow.map((candle) => candle.low)) },
      { index: ctx.length - 2, price: spec.side === "top" ? minimum(follow.slice(-Math.min(4, follow.length)).map((candle) => candle.low)) : maximum(follow.slice(-Math.min(4, follow.length)).map((candle) => candle.high)) },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [buildGuideLine({ index: 0, price: breakoutLevel }, { index: ctx.length - 1, price: breakoutLevel }, "rail")],
  };
}

function evaluateDriftBase(spec, ctx) {
  const lateCloses = ctx.closes.slice(-Math.max(10, Math.floor(ctx.length * 0.45)));
  const slopeScore = scoreAtMost(Math.abs(linearSlope(lateCloses)), 0.0018);
  const rangeScore = scoreAtMost(ctx.lateRange, 0.012);
  const riseScore = scoreAtLeast(percentageMove(lateCloses[0], last(lateCloses)), -0.0015);
  const midpoint = Math.max(4, Math.floor(ctx.length / 2));
  const earlyCloses = ctx.closes.slice(0, midpoint);
  const lateHalfCloses = ctx.closes.slice(midpoint);
  const transitionScore = scoreAtLeast(linearSlope(lateHalfCloses) - linearSlope(earlyCloses), 0.0007);
  const baseLift = (ctx.lastClose - minimum(ctx.lows.slice(0, midpoint))) / Math.max(ctx.priceAverage, 1e-9);
  const baseLiftScore = scoreAtLeast(baseLift, 0.0035);
  return {
    structureScore: slopeScore * 0.18 + rangeScore * 0.26 + riseScore * 0.14 + transitionScore * 0.22 + baseLiftScore * 0.2,
    confirmationScore: (transitionScore + baseLiftScore) / 2,
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The opening drift has stabilized and the base is starting to lift from its earlier lows without expanding.`,
    tracePoints: ctx.toGlobal([
      { index: ctx.length - lateCloses.length, price: lateCloses[0] },
      { index: ctx.length - 1, price: last(lateCloses) },
    ]),
    guideLines: [],
  };
}

function evaluateWedge(spec, ctx) {
  const slice = ctx.window.slice(-Math.max(12, Math.floor(ctx.length * 0.56)));
  const highSlope = linearSlope(slice.map((candle) => candle.high));
  const lowSlope = linearSlope(slice.map((candle) => candle.low));
  const convergence = scoreAtLeast(lowSlope - highSlope, spec.style === "compression" ? 0.0009 : 0.0011);
  const slopeScore = spec.style === "rising"
    ? scoreAtLeast(highSlope, 0.0003) * 0.5 + scoreAtLeast(lowSlope, 0.0003) * 0.5
    : spec.style === "falling"
      ? scoreAtLeast(-highSlope, 0.0003) * 0.5 + scoreAtLeast(-lowSlope, 0.0003) * 0.5
      : scoreAtMost(Math.abs(highSlope + lowSlope), 0.0014);
  const exhaustionScore = spec.style === "rising"
    ? scoreAtLeast((maximum(slice.map((candle) => candle.high)) - ctx.lastClose) / Math.max(maximum(slice.map((candle) => candle.high)), 1e-9), 0)
    : spec.style === "falling"
      ? scoreAtLeast((ctx.lastClose - minimum(slice.map((candle) => candle.low))) / Math.max(minimum(slice.map((candle) => candle.low)), 1e-9), 0)
      : scoreAtMost(ctx.lateRange / Math.max(ctx.earlyRange, 1e-9), 1);
  return {
    structureScore: convergence * 0.38 + slopeScore * 0.26 + exhaustionScore * 0.18 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.18,
    confirmationScore: exhaustionScore,
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The upper and lower rails are squeezing together while the move keeps leaning ${spec.style === "rising" ? "up" : spec.style === "falling" ? "down" : "inward"}.`,
    tracePoints: ctx.toGlobal([
      { index: ctx.length - slice.length, price: average([slice[0].high, slice[0].low]) },
      { index: ctx.length - Math.floor(slice.length * 0.42), price: average([slice[Math.floor(slice.length * 0.42)].high, slice[Math.floor(slice.length * 0.42)].low]) },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [
      buildGuideLine({ index: ctx.length - slice.length, price: slice[0].high }, { index: ctx.length - 1, price: last(slice).high }, "rail"),
      buildGuideLine({ index: ctx.length - slice.length, price: slice[0].low }, { index: ctx.length - 1, price: last(slice).low }, "rail"),
    ],
  };
}

function evaluateChannel(spec, ctx) {
  const slice = ctx.window.slice(-Math.max(12, Math.floor(ctx.length * 0.56)));
  const highs = slice.map((candle) => candle.high);
  const lows = slice.map((candle) => candle.low);
  const highSlope = linearSlope(highs);
  const lowSlope = linearSlope(lows);
  const parallelScore = scoreNear(highSlope - lowSlope, spec.style === "rising" || spec.style === "falling" ? 0.0011 : 0.0008);
  const trendScore = spec.direction === "Bearish"
    ? scoreAtLeast(-highSlope, spec.style === "falling" ? 0.0012 : 0.0005) * 0.5 + scoreAtLeast(-lowSlope, spec.style === "falling" ? 0.0012 : 0.0005) * 0.5
    : scoreAtLeast(highSlope, spec.style === "rising" ? 0.0012 : 0.0005) * 0.5 + scoreAtLeast(lowSlope, spec.style === "rising" ? 0.0012 : 0.0005) * 0.5;
  const stabilityScore = scoreAtMost(Math.abs(ctx.lateRange - ctx.earlyRange), 0.01);
  return {
    structureScore: parallelScore * 0.36 + trendScore * 0.34 + stabilityScore * 0.12 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.18,
    confirmationScore: trendScore,
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. Highs and lows are moving in parallel rails instead of compressing into a wedge.`,
    tracePoints: ctx.toGlobal([
      { index: ctx.length - slice.length, price: average([slice[0].high, slice[0].low]) },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [
      buildGuideLine({ index: ctx.length - slice.length, price: slice[0].high }, { index: ctx.length - 1, price: last(slice).high }, "rail"),
      buildGuideLine({ index: ctx.length - slice.length, price: slice[0].low }, { index: ctx.length - 1, price: last(slice).low }, "rail"),
    ],
  };
}

function evaluateBroadeningWedge(spec, ctx) {
  const slice = ctx.window.slice(-Math.max(12, Math.floor(ctx.length * 0.56)));
  const highSlope = linearSlope(slice.map((candle) => candle.high));
  const lowSlope = linearSlope(slice.map((candle) => candle.low));
  const divergence = scoreAtLeast(Math.abs(highSlope - lowSlope), 0.0013);
  const trendScore = spec.direction === "Bearish"
    ? scoreAtLeast(highSlope, 0.0004)
    : scoreAtLeast(-lowSlope, 0.0004);
  return {
    structureScore: divergence * 0.44 + trendScore * 0.24 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.2 + scoreAtLeast(ctx.lateRange / Math.max(ctx.earlyRange, 1e-9), 1.08) * 0.12,
    confirmationScore: trendScore,
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The rails are widening in the same directional lean, which keeps the structure unstable.`,
    tracePoints: ctx.toGlobal([
      { index: ctx.length - slice.length, price: average([slice[0].high, slice[0].low]) },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [
      buildGuideLine({ index: ctx.length - slice.length, price: slice[0].high }, { index: ctx.length - 1, price: last(slice).high }, "rail"),
      buildGuideLine({ index: ctx.length - slice.length, price: slice[0].low }, { index: ctx.length - 1, price: last(slice).low }, "rail"),
    ],
  };
}

function evaluateMegaphone(spec, ctx) {
  if (ctx.pivots.length < 5) {
    return null;
  }
  const pivots = ctx.pivots.slice(-5);
  const amplitudes = [];
  for (let index = 1; index < pivots.length; index += 1) {
    amplitudes.push(Math.abs(pivots[index].price - pivots[index - 1].price) / Math.max(average([pivots[index].price, pivots[index - 1].price]), 1e-9));
  }
  const expansionScore = scoreAtLeast((amplitudes[2] + amplitudes[3]) / Math.max(amplitudes[0] + amplitudes[1], 1e-9), 1.18);
  return {
    structureScore: expansionScore * 0.52 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.24 + scoreAtLeast(ctx.lateRange / Math.max(ctx.earlyRange, 1e-9), 1.15) * 0.24,
    confirmationScore: scoreAtLeast(ctx.lateRange / Math.max(ctx.earlyRange, 1e-9), 1.15),
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. Alternating swings are expanding instead of calming down, which is classic megaphone behavior.`,
    tracePoints: ctx.toGlobal(pivots.map((pivot) => ({ index: pivot.index, price: pivot.price }))),
    guideLines: [],
  };
}

function evaluateCoil(spec, ctx) {
  const rangeCompression = scoreAtMost(ctx.lateRange / Math.max(ctx.earlyRange, 1e-9), spec.style === "volatility" ? 0.82 : 0.92);
  const volumeCompression = scoreAtMost(ctx.volumeBoost, spec.style === "volatility" ? 0.95 : 1.02);
  const lastBreak = spec.style === "breakout"
    ? scoreAtLeast((ctx.lastClose - maximum(ctx.highs.slice(0, -3))) / Math.max(maximum(ctx.highs.slice(0, -3)), 1e-9), 0.001)
    : spec.style === "breakdown"
      ? scoreAtLeast((minimum(ctx.lows.slice(0, -3)) - ctx.lastClose) / Math.max(minimum(ctx.lows.slice(0, -3)), 1e-9), 0.001)
      : spec.style === "release"
        ? scoreAtLeast(Math.abs(ctx.move), 0.0025)
        : 0.5;
  return {
    structureScore: rangeCompression * 0.38 + volumeCompression * 0.22 + lastBreak * 0.24 + scoreAtMost(Math.abs(ctx.closeSlope), 0.002) * 0.16,
    confirmationScore: lastBreak,
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. Range compression has reached the live edge${spec.style === "volatility" ? "" : " and release pressure is now starting to build"}.`,
    tracePoints: ctx.toGlobal([
      { index: 0, price: ctx.closes[0] },
      { index: Math.floor(ctx.length * 0.45), price: ctx.closes[Math.floor(ctx.length * 0.45)] },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [
      buildGuideLine({ index: 0, price: maximum(ctx.highs) }, { index: ctx.length - 1, price: average(ctx.highs.slice(-4)) }, "rail"),
      buildGuideLine({ index: 0, price: minimum(ctx.lows) }, { index: ctx.length - 1, price: average(ctx.lows.slice(-4)) }, "rail"),
    ],
  };
}

function evaluateRangeState(spec, ctx) {
  const rangeShift = ctx.lateRange / Math.max(ctx.earlyRange, 1e-9);
  const structureScore = spec.style === "compression"
    ? scoreAtMost(rangeShift, 0.82) * 0.54 + scoreAtMost(ctx.volumeBoost, 0.95) * 0.22 + scoreAtMost(Math.abs(ctx.closeSlope), 0.0018) * 0.24
    : scoreAtLeast(rangeShift, 1.18) * 0.54 + scoreAtLeast(ctx.volumeBoost, 1.04) * 0.22 + scoreAtLeast(Math.abs(ctx.closeSlope), 0.0014) * 0.24;
  return {
    structureScore,
    confirmationScore: spec.style === "compression" ? scoreAtMost(rangeShift, 0.82) : scoreAtLeast(rangeShift, 1.18),
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The live range is ${spec.style === "compression" ? "tightening" : "widening"} compared with the opening portion of the window.`,
    tracePoints: ctx.toGlobal([
      { index: 0, price: average([ctx.highestHigh, ctx.lowestLow]) },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [],
  };
}

function evaluateSweep(spec, ctx) {
  const prior = ctx.window.slice(0, -2);
  const lastCandle = last(ctx.window);
  if (!prior.length || !lastCandle) {
    return null;
  }
  if (spec.side === "high") {
    const priorHigh = maximum(prior.map((candle) => candle.high));
    const sweepAmount = Math.max(0, (lastCandle.high - priorHigh) / Math.max(priorHigh, 1e-9));
    const reclaim = Math.max(0, (priorHigh - lastCandle.close) / Math.max(priorHigh, 1e-9));
    const wickScore = scoreAtLeast((lastCandle.high - Math.max(lastCandle.open, lastCandle.close)) / Math.max(lastCandle.high, 1e-9), 0.0022);
    return {
      structureScore: scoreAtLeast(sweepAmount, 0.0015) * 0.34 + scoreAtLeast(reclaim, 0.0015) * 0.3 + wickScore * 0.2 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.16,
      confirmationScore: scoreAtLeast(reclaim, 0.0015),
      volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
      rationale: `${spec.bias}. The latest candle swept above the prior range and closed back inside with a pronounced upper wick.`,
      tracePoints: ctx.toGlobal([
        { index: ctx.length - 3, price: priorHigh },
        { index: ctx.length - 1, price: lastCandle.high },
        { index: ctx.length - 1, price: lastCandle.close },
      ]),
      guideLines: [buildGuideLine({ index: 0, price: priorHigh }, { index: ctx.length - 1, price: priorHigh }, "rail")],
    };
  }
  const priorLow = minimum(prior.map((candle) => candle.low));
  const sweepAmount = Math.max(0, (priorLow - lastCandle.low) / Math.max(priorLow, 1e-9));
  const reclaim = Math.max(0, (lastCandle.close - priorLow) / Math.max(priorLow, 1e-9));
  const wickScore = scoreAtLeast((Math.min(lastCandle.open, lastCandle.close) - lastCandle.low) / Math.max(priorLow, 1e-9), 0.0022);
  return {
    structureScore: scoreAtLeast(sweepAmount, 0.0015) * 0.34 + scoreAtLeast(reclaim, 0.0015) * 0.3 + wickScore * 0.2 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.16,
    confirmationScore: scoreAtLeast(reclaim, 0.0015),
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The latest candle swept below the prior range and closed back above that liquidity pocket.`,
    tracePoints: ctx.toGlobal([
      { index: ctx.length - 3, price: priorLow },
      { index: ctx.length - 1, price: lastCandle.low },
      { index: ctx.length - 1, price: lastCandle.close },
    ]),
    guideLines: [buildGuideLine({ index: 0, price: priorLow }, { index: ctx.length - 1, price: priorLow }, "rail")],
  };
}

function evaluateCupHandle(spec, ctx) {
  const closes = ctx.closes;
  const leftIndex = Math.max(0, Math.floor(ctx.length * 0.18));
  const bottomIndex = spec.side === "top"
    ? closes.findIndex((value) => value === minimum(closes))
    : closes.findIndex((value) => value === maximum(closes));
  const rightIndex = Math.min(ctx.length - 1, Math.floor(ctx.length * 0.78));
  const leftPrice = closes[leftIndex];
  const bottomPrice = closes[bottomIndex];
  const rightPrice = closes[rightIndex];
  const rimScore = scoreNear(priceGapRatio(leftPrice, rightPrice), 0.018);
  const cupDepth = spec.side === "top"
    ? (average([leftPrice, rightPrice]) - bottomPrice) / Math.max(average([leftPrice, rightPrice]), 1e-9)
    : (bottomPrice - average([leftPrice, rightPrice])) / Math.max(Math.abs(bottomPrice), 1e-9);
  const depthScore = scoreAtLeast(cupDepth, 0.006);
  const handleSlice = closes.slice(rightIndex);
  const handleScore = spec.side === "top"
    ? scoreAtMost((maximum(handleSlice) - minimum(handleSlice)) / Math.max(average(handleSlice), 1e-9), 0.012)
    : scoreAtMost((maximum(handleSlice) - minimum(handleSlice)) / Math.max(average(handleSlice), 1e-9), 0.012);
  const breakoutScore = spec.side === "top"
    ? scoreAtLeast((ctx.lastClose - average([leftPrice, rightPrice])) / Math.max(average([leftPrice, rightPrice]), 1e-9), -0.001)
    : scoreAtLeast((average([leftPrice, rightPrice]) - ctx.lastClose) / Math.max(average([leftPrice, rightPrice]), 1e-9), -0.001);
  return {
    structureScore: rimScore * 0.26 + depthScore * 0.3 + handleScore * 0.22 + breakoutScore * 0.1 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.12,
    confirmationScore: breakoutScore,
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The cup rims are balanced and the handle remains contained instead of breaking the structure.`,
    tracePoints: ctx.toGlobal([
      { index: leftIndex, price: leftPrice },
      { index: bottomIndex, price: bottomPrice },
      { index: rightIndex, price: rightPrice },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [],
  };
}

function evaluateShelf(spec, ctx) {
  const slice = ctx.window.slice(-Math.max(10, Math.floor(ctx.length * 0.5)));
  const highs = slice.map((candle) => candle.high);
  const lows = slice.map((candle) => candle.low);
  const shelfRange = (maximum(highs) - minimum(lows)) / Math.max(average(slice.map((candle) => candle.close)), 1e-9);
  const drift = percentageMove(slice[0].close, last(slice).close);
  const driftScore = spec.side === "low"
    ? scoreAtLeast(drift, -0.0015)
    : scoreAtLeast(-drift, -0.0015);
  return {
    structureScore: scoreAtMost(shelfRange, 0.012) * 0.46 + driftScore * 0.22 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.18 + scoreAtMost(Math.abs(linearSlope(slice.map((candle) => candle.close))), 0.0015) * 0.14,
    confirmationScore: driftScore,
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The shelf is compact and the drift inside it remains controlled rather than breaking the balance.`,
    tracePoints: ctx.toGlobal([
      { index: ctx.length - slice.length, price: average([maximum(highs), minimum(lows)]) },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [
      buildGuideLine({ index: ctx.length - slice.length, price: maximum(highs) }, { index: ctx.length - 1, price: maximum(highs) }, "rail"),
      buildGuideLine({ index: ctx.length - slice.length, price: minimum(lows) }, { index: ctx.length - 1, price: minimum(lows) }, "rail"),
    ],
  };
}

function evaluateBaseBreakout(spec, ctx) {
  const shelf = evaluateShelf({ ...spec, side: "low" }, ctx);
  const breakout = Math.max(0, (ctx.lastClose - maximum(ctx.highs.slice(0, -2))) / Math.max(maximum(ctx.highs.slice(0, -2)), 1e-9));
  if (!shelf) {
    return null;
  }
  return {
    structureScore: shelf.structureScore * 0.54 + scoreAtLeast(breakout, 0.0014) * 0.28 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.18,
    confirmationScore: scoreAtLeast(breakout, 0.0014),
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The base stayed orderly and price is now pressing through that accumulated ceiling.`,
    tracePoints: shelf.tracePoints,
    guideLines: shelf.guideLines,
  };
}

function evaluateMeanReversion(spec, ctx) {
  const averagePrice = average(ctx.closes.slice(0, Math.max(3, Math.floor(ctx.length * 0.4))));
  const extreme = spec.side === "bounce" ? minimum(ctx.closes) : maximum(ctx.closes);
  const snapback = spec.side === "bounce"
    ? Math.max(0, (ctx.lastClose - extreme) / Math.max(extreme, 1e-9))
    : Math.max(0, (extreme - ctx.lastClose) / Math.max(extreme, 1e-9));
  const stretch = spec.side === "bounce"
    ? Math.max(0, (averagePrice - extreme) / Math.max(averagePrice, 1e-9))
    : Math.max(0, (extreme - averagePrice) / Math.max(averagePrice, 1e-9));
  return {
    structureScore: scoreAtLeast(stretch, 0.006) * 0.38 + scoreAtLeast(snapback, 0.004) * 0.34 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.16 + scoreNear(linearSlope(ctx.closes.slice(-5)), 0.0026) * 0.12,
    confirmationScore: scoreAtLeast(snapback, 0.004),
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. Price stretched away from its recent mean and the counter-move is already underway.`,
    tracePoints: ctx.toGlobal([
      { index: 0, price: averagePrice },
      { index: spec.side === "bounce" ? ctx.closes.findIndex((value) => value === minimum(ctx.closes)) : ctx.closes.findIndex((value) => value === maximum(ctx.closes)), price: extreme },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [],
  };
}

function evaluateRoundedMarket(spec, ctx) {
  const base = evaluateRoundedTurn({ ...spec, side: spec.side }, ctx);
  if (!base) {
    return null;
  }
  return {
    ...base,
    rationale: `${spec.bias}. The curve is broad and gradual, which fits a slower accumulation/distribution process.`,
  };
}

function evaluateLadder(spec, ctx) {
  const relevant = spec.direction === "Bearish" ? ctx.highPivots : ctx.lowPivots;
  if (relevant.length < 4) {
    return null;
  }
  const sample = relevant.slice(-4);
  const ladderScore = average(sample.slice(1).map((pivot, index) => {
    const previous = sample[index];
    if (spec.direction === "Bearish") {
      return scoreAtLeast((previous.price - pivot.price) / Math.max(previous.price, 1e-9), 0.001);
    }
    return scoreAtLeast((pivot.price - previous.price) / Math.max(previous.price, 1e-9), 0.001);
  }));
  return {
    structureScore: ladderScore * 0.62 + scoreVolumeByMode(spec.volumeMode, ctx) * 0.18 + scoreAtMost(ctx.lateRange, 0.016) * 0.2,
    confirmationScore: ladderScore,
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. The same side of the book keeps stepping in at progressively ${spec.direction === "Bearish" ? "lower highs" : "higher lows"}.`,
    tracePoints: ctx.toGlobal(sample.map((pivot) => ({ index: pivot.index, price: pivot.price })).concat([finalPoint(ctx)])),
    guideLines: [],
  };
}

function evaluateParabolic(spec, ctx) {
  const closes = ctx.closes;
  const firstSlope = linearSlope(closes.slice(0, Math.floor(ctx.length / 2)));
  const secondSlope = linearSlope(closes.slice(Math.floor(ctx.length / 2)));
  const acceleration = spec.side === "advance"
    ? secondSlope - firstSlope
    : firstSlope - secondSlope;
  const run = spec.side === "advance"
    ? percentageMove(closes[0], last(closes))
    : Math.abs(percentageMove(closes[0], minimum(closes)));
  const fade = spec.side === "fade"
    ? Math.max(0, (maximum(closes) - last(closes)) / Math.max(maximum(closes), 1e-9))
    : 0;
  return {
    structureScore: scoreAtLeast(acceleration, 0.0011) * 0.32 + scoreAtLeast(Math.abs(run), spec.side === "advance" ? 0.01 : 0.008) * 0.28 + (spec.side === "fade" ? scoreAtLeast(fade, 0.004) * 0.2 : scoreAtLeast(last(closes) - average(closes.slice(-4)), -0.001) * 0.2) + scoreVolumeByMode(spec.volumeMode, ctx) * 0.2,
    confirmationScore: spec.side === "fade" ? scoreAtLeast(fade, 0.004) : scoreAtLeast(last(closes) - average(closes.slice(-4)), -0.001),
    volumeScore: scoreVolumeByMode(spec.volumeMode, ctx),
    rationale: `${spec.bias}. Slope acceleration is increasing${spec.side === "fade" ? " and the blow-off leg is starting to cool" : ""}.`,
    tracePoints: ctx.toGlobal([
      { index: 0, price: closes[0] },
      { index: Math.floor(ctx.length * 0.4), price: closes[Math.floor(ctx.length * 0.4)] },
      { index: Math.floor(ctx.length * 0.7), price: closes[Math.floor(ctx.length * 0.7)] },
      { index: ctx.length - 1, price: ctx.lastClose },
    ]),
    guideLines: [],
  };
}

const SIGNATURES = {
  mTop: [0.28, 0.42, 0.58, 0.78, 0.86, 0.71, 0.52, 0.66, 0.8, 0.84, 0.68, 0.44],
  tripleTop: [0.34, 0.55, 0.79, 0.62, 0.76, 0.59, 0.78, 0.61, 0.57, 0.49, 0.41, 0.35],
  headShoulders: [0.34, 0.52, 0.72, 0.58, 0.76, 0.92, 0.74, 0.56, 0.78, 0.66, 0.5, 0.36],
  roundedTop: [0.26, 0.38, 0.52, 0.66, 0.78, 0.86, 0.84, 0.74, 0.6, 0.48, 0.38, 0.3],
  diamondTop: [0.35, 0.48, 0.64, 0.82, 0.68, 0.52, 0.34, 0.56, 0.74, 0.62, 0.48, 0.36],
  broadeningTop: [0.52, 0.66, 0.46, 0.78, 0.38, 0.84, 0.34, 0.76, 0.44, 0.68, 0.52, 0.42],
  vReversal: [0.82, 0.7, 0.56, 0.42, 0.28, 0.16, 0.22, 0.34, 0.48, 0.62, 0.74, 0.82],
  deadCat: [0.82, 0.62, 0.38, 0.18, 0.32, 0.48, 0.4, 0.34, 0.28, 0.26, 0.24, 0.22],
  blowOffTop: [0.24, 0.3, 0.36, 0.46, 0.58, 0.72, 0.82, 0.92, 1, 0.84, 0.58, 0.34],
  bullFlag: [0.24, 0.34, 0.46, 0.62, 0.82, 0.94, 0.88, 0.8, 0.76, 0.74, 0.8, 0.9],
  pennantUp: [0.26, 0.38, 0.54, 0.7, 0.86, 0.82, 0.78, 0.75, 0.74, 0.76, 0.82, 0.92],
  triangleUp: [0.34, 0.4, 0.5, 0.58, 0.56, 0.62, 0.6, 0.68, 0.66, 0.74, 0.72, 0.86],
  triangleSym: [0.58, 0.62, 0.56, 0.6, 0.54, 0.58, 0.52, 0.56, 0.54, 0.58, 0.62, 0.7],
  flatTop: [0.3, 0.34, 0.4, 0.52, 0.64, 0.66, 0.65, 0.64, 0.65, 0.66, 0.72, 0.88],
  stairStep: [0.26, 0.28, 0.42, 0.44, 0.54, 0.56, 0.66, 0.68, 0.76, 0.78, 0.86, 0.9],
  boxContinuation: [0.34, 0.48, 0.62, 0.76, 0.74, 0.72, 0.71, 0.73, 0.74, 0.76, 0.82, 0.9],
  breakoutRetest: [0.28, 0.38, 0.48, 0.62, 0.78, 0.9, 0.82, 0.74, 0.7, 0.76, 0.84, 0.94],
  driftBase: [0.56, 0.58, 0.6, 0.59, 0.57, 0.56, 0.55, 0.56, 0.57, 0.6, 0.66, 0.74],
  risingWedge: [0.22, 0.3, 0.42, 0.54, 0.64, 0.72, 0.78, 0.82, 0.84, 0.86, 0.84, 0.78],
  channelUp: [0.24, 0.32, 0.4, 0.48, 0.56, 0.64, 0.6, 0.68, 0.64, 0.72, 0.68, 0.76],
  broadeningWedgeUp: [0.22, 0.3, 0.42, 0.34, 0.52, 0.4, 0.62, 0.46, 0.74, 0.54, 0.86, 0.66],
  megaphone: [0.48, 0.62, 0.4, 0.7, 0.34, 0.78, 0.3, 0.82, 0.36, 0.74, 0.44, 0.62],
  coil: [0.52, 0.56, 0.5, 0.54, 0.49, 0.53, 0.5, 0.54, 0.52, 0.57, 0.64, 0.76],
  rangeCompression: [0.5, 0.54, 0.48, 0.52, 0.49, 0.51, 0.5, 0.52, 0.51, 0.53, 0.54, 0.56],
  rangeExpansion: [0.5, 0.52, 0.48, 0.56, 0.42, 0.6, 0.38, 0.68, 0.32, 0.74, 0.46, 0.66],
  liquiditySweepHigh: [0.48, 0.54, 0.58, 0.62, 0.68, 0.94, 0.56, 0.58, 0.6, 0.62, 0.64, 0.66],
  cupHandle: [0.72, 0.58, 0.46, 0.34, 0.26, 0.28, 0.36, 0.48, 0.62, 0.72, 0.66, 0.82],
  shelfAccum: [0.34, 0.36, 0.38, 0.4, 0.39, 0.38, 0.39, 0.4, 0.42, 0.44, 0.48, 0.62],
  baseBreakout: [0.34, 0.36, 0.38, 0.4, 0.39, 0.4, 0.41, 0.42, 0.44, 0.46, 0.6, 0.84],
  meanReversionBounce: [0.82, 0.7, 0.56, 0.44, 0.32, 0.24, 0.28, 0.36, 0.48, 0.58, 0.62, 0.56],
  roundedAccum: [0.44, 0.4, 0.36, 0.34, 0.34, 0.36, 0.4, 0.46, 0.54, 0.64, 0.74, 0.82],
  ladderUp: [0.3, 0.36, 0.34, 0.44, 0.42, 0.54, 0.52, 0.64, 0.62, 0.74, 0.72, 0.84],
  parabolicAdvance: [0.2, 0.24, 0.28, 0.34, 0.42, 0.54, 0.68, 0.82, 0.92, 0.98, 0.94, 0.88],
  microFlag: [0.42, 0.5, 0.58, 0.7, 0.84, 0.8, 0.76, 0.74, 0.76, 0.78, 0.82, 0.88],
};

const VOLUME_SIGNATURES = {
  flat: normalizeSeries([0.55, 0.54, 0.56, 0.55, 0.54, 0.56, 0.55, 0.54, 0.55, 0.56, 0.55, 0.56]),
  rise: normalizeSeries([0.34, 0.36, 0.4, 0.44, 0.48, 0.54, 0.6, 0.66, 0.72, 0.8, 0.88, 0.96]),
  fade: normalizeSeries([0.92, 0.86, 0.78, 0.72, 0.66, 0.6, 0.54, 0.5, 0.46, 0.42, 0.38, 0.34]),
  breakout: normalizeSeries([0.4, 0.42, 0.44, 0.46, 0.48, 0.46, 0.44, 0.5, 0.54, 0.62, 0.78, 0.98]),
  compression: normalizeSeries([0.74, 0.68, 0.62, 0.56, 0.52, 0.48, 0.44, 0.42, 0.4, 0.38, 0.36, 0.34]),
  expansion: normalizeSeries([0.34, 0.36, 0.38, 0.42, 0.48, 0.56, 0.64, 0.72, 0.8, 0.86, 0.92, 0.98]),
  spikeFade: normalizeSeries([0.36, 0.38, 0.42, 0.48, 0.56, 0.7, 0.96, 0.72, 0.58, 0.48, 0.42, 0.38]),
  sweep: normalizeSeries([0.42, 0.44, 0.46, 0.48, 0.52, 1, 0.58, 0.52, 0.48, 0.46, 0.44, 0.42]),
  accumulate: normalizeSeries([0.58, 0.56, 0.54, 0.52, 0.5, 0.52, 0.54, 0.56, 0.6, 0.66, 0.74, 0.86]),
  distribute: normalizeSeries([0.86, 0.78, 0.72, 0.66, 0.6, 0.56, 0.54, 0.5, 0.48, 0.46, 0.42, 0.38]),
};

function createPattern(definition) {
  return {
    windowSizes: DEFAULT_WINDOW_SIZES,
    endOffsets: DEFAULT_END_OFFSETS,
    minConfidence: DETECTION_THRESHOLD,
    minScore: 0.58,
    minStructure: 0.48,
    ...definition,
  };
}

const PATTERN_DEFINITIONS = [
  createPattern({ id: "double_top_echo", name: "Double Top Echo", family: "reversal", detectorType: "doubleSwing", side: "top", direction: "Bearish", volumeMode: "distribute", bias: "Watch rejection at highs", marketBias: "Cautious bias", regime: "Distribution", signature: SIGNATURES.mTop }),
  createPattern({ id: "double_bottom_echo", name: "Double Bottom Echo", family: "reversal", detectorType: "doubleSwing", side: "bottom", direction: "Bullish", volumeMode: "accumulate", bias: "Watch higher-low support", marketBias: "Recovery bias", regime: "Accumulation", signature: invertSeries(SIGNATURES.mTop) }),
  createPattern({ id: "triple_top", name: "Triple Top", family: "reversal", detectorType: "tripleSwing", side: "top", direction: "Bearish", volumeMode: "distribute", bias: "Repeated ceiling in play", marketBias: "Cautious bias", regime: "Distribution", signature: SIGNATURES.tripleTop }),
  createPattern({ id: "triple_bottom", name: "Triple Bottom", family: "reversal", detectorType: "tripleSwing", side: "bottom", direction: "Bullish", volumeMode: "accumulate", bias: "Repeated floor in play", marketBias: "Recovery bias", regime: "Accumulation", signature: invertSeries(SIGNATURES.tripleTop) }),
  createPattern({ id: "head_shoulders", name: "Head and Shoulders", family: "reversal", detectorType: "headShoulders", side: "top", direction: "Bearish", volumeMode: "distribute", bias: "Neckline risk rising", marketBias: "Cautious bias", regime: "Distribution", signature: SIGNATURES.headShoulders }),
  createPattern({ id: "inverse_head_shoulders", name: "Inverse Head and Shoulders", family: "reversal", detectorType: "headShoulders", side: "bottom", direction: "Bullish", volumeMode: "accumulate", bias: "Base structure improving", marketBias: "Recovery bias", regime: "Accumulation", signature: invertSeries(SIGNATURES.headShoulders) }),
  createPattern({ id: "rounded_top", name: "Rounded Top", family: "reversal", detectorType: "roundedTurn", side: "top", direction: "Bearish", volumeMode: "fade", bias: "Momentum is rolling over", marketBias: "Cautious bias", regime: "Distribution", signature: SIGNATURES.roundedTop, windowSizes: [22, 28, 34] }),
  createPattern({ id: "rounded_bottom", name: "Rounded Bottom", family: "reversal", detectorType: "roundedTurn", side: "bottom", direction: "Bullish", volumeMode: "accumulate", bias: "Base is slowly improving", marketBias: "Recovery bias", regime: "Accumulation", signature: invertSeries(SIGNATURES.roundedTop), windowSizes: [22, 28, 34] }),
  createPattern({ id: "diamond_top", name: "Diamond Top", family: "reversal", detectorType: "diamond", side: "top", direction: "Bearish", volumeMode: "expansion", bias: "Erratic topping action", marketBias: "Cautious bias", regime: "Distribution", signature: SIGNATURES.diamondTop, windowSizes: [22, 28, 34] }),
  createPattern({ id: "diamond_bottom", name: "Diamond Bottom", family: "reversal", detectorType: "diamond", side: "bottom", direction: "Bullish", volumeMode: "expansion", bias: "Erratic basing action", marketBias: "Recovery bias", regime: "Accumulation", signature: invertSeries(SIGNATURES.diamondTop), windowSizes: [22, 28, 34] }),
  createPattern({ id: "broadening_top", name: "Broadening Top", family: "reversal", detectorType: "broadening", side: "top", direction: "Bearish", volumeMode: "expansion", bias: "Volatility is widening near highs", marketBias: "Cautious bias", regime: "Expansion", signature: SIGNATURES.broadeningTop, windowSizes: [20, 26, 32] }),
  createPattern({ id: "broadening_bottom", name: "Broadening Bottom", family: "reversal", detectorType: "broadening", side: "bottom", direction: "Bullish", volumeMode: "expansion", bias: "Volatility is widening near lows", marketBias: "Recovery bias", regime: "Expansion", signature: invertSeries(SIGNATURES.broadeningTop), windowSizes: [20, 26, 32] }),
  createPattern({ id: "v_reversal", name: "V Reversal", family: "reversal", detectorType: "vTurn", side: "bottom", direction: "Bullish", volumeMode: "spikeFade", bias: "Fast reversal pressure", marketBias: "Recovery bias", regime: "Expansion", signature: SIGNATURES.vReversal, windowSizes: [16, 20, 24] }),
  createPattern({ id: "v_recovery", name: "V Recovery", family: "reversal", detectorType: "vTurn", side: "bottom", style: "recovery", direction: "Bullish", volumeMode: "spikeFade", bias: "Fast rebound structure", marketBias: "Bullish bias", regime: "Expansion", signature: invertSeries(SIGNATURES.vReversal), windowSizes: [16, 20, 24], rightMoveTarget: 0.01 }),
  createPattern({ id: "dead_cat_bounce", name: "Dead Cat Bounce", family: "reversal", detectorType: "fadePattern", style: "dead_cat", direction: "Bearish", volumeMode: "spikeFade", bias: "Bounce looks weak", marketBias: "Cautious bias", regime: "Mean Reversion", signature: SIGNATURES.deadCat, windowSizes: [16, 20, 24] }),
  createPattern({ id: "relief_rally_fade", name: "Relief Rally Fade", family: "reversal", detectorType: "fadePattern", style: "relief_fade", direction: "Bearish", volumeMode: "spikeFade", bias: "Relief move may be fading", marketBias: "Cautious bias", regime: "Mean Reversion", signature: invertSeries(SIGNATURES.deadCat), windowSizes: [16, 20, 24] }),
  createPattern({ id: "blow_off_top", name: "Blow-Off Top", family: "reversal", detectorType: "exhaustionSpike", side: "top", direction: "Bearish", volumeMode: "spikeFade", bias: "Exhaustion risk is elevated", marketBias: "Cautious bias", regime: "Expansion", signature: SIGNATURES.blowOffTop, windowSizes: [16, 20, 24] }),
  createPattern({ id: "capitulation_bottom", name: "Capitulation Bottom", family: "reversal", detectorType: "exhaustionSpike", side: "bottom", direction: "Bullish", volumeMode: "spikeFade", bias: "Panic flush may be exhausting", marketBias: "Recovery bias", regime: "Expansion", signature: invertSeries(SIGNATURES.blowOffTop), windowSizes: [16, 20, 24] }),
  createPattern({ id: "bull_flag_echo", name: "Bull Flag Echo", family: "continuation", detectorType: "flag", style: "regular", direction: "Bullish", volumeMode: "fade", bias: "Continuation structure intact", marketBias: "Continuation bias", regime: "Trend", signature: SIGNATURES.bullFlag }),
  createPattern({ id: "bear_flag_echo", name: "Bear Flag Echo", family: "continuation", detectorType: "flag", style: "regular", direction: "Bearish", volumeMode: "fade", bias: "Continuation risk to the downside", marketBias: "Cautious bias", regime: "Trend", signature: invertSeries(SIGNATURES.bullFlag) }),
  createPattern({ id: "pennant_breakout", name: "Pennant Breakout", family: "continuation", detectorType: "pennant", direction: "Bullish", volumeMode: "breakout", bias: "Breakout pressure is building", marketBias: "Breakout bias", regime: "Compression", signature: SIGNATURES.pennantUp }),
  createPattern({ id: "pennant_breakdown", name: "Pennant Breakdown", family: "continuation", detectorType: "pennant", direction: "Bearish", volumeMode: "breakout", bias: "Breakdown pressure is building", marketBias: "Cautious bias", regime: "Compression", signature: invertSeries(SIGNATURES.pennantUp) }),
  createPattern({ id: "high_tight_flag", name: "High Tight Flag", family: "continuation", detectorType: "flag", style: "tight", direction: "Bullish", volumeMode: "breakout", bias: "Fast continuation risk is alive", marketBias: "Momentum bias", regime: "Expansion", signature: tiltSeries(SIGNATURES.bullFlag, 0.18), poleTarget: 0.015, rangeTarget: 0.007, pullbackTarget: 0.015 }),
  createPattern({ id: "low_tight_flag", name: "Low Tight Flag", family: "continuation", detectorType: "flag", style: "tight", direction: "Bearish", volumeMode: "breakout", bias: "Fast downside continuation risk", marketBias: "Cautious bias", regime: "Expansion", signature: invertSeries(tiltSeries(SIGNATURES.bullFlag, 0.18)), poleTarget: 0.015, rangeTarget: 0.007, pullbackTarget: 0.015 }),
  createPattern({ id: "ascending_triangle", name: "Ascending Triangle", family: "compression", detectorType: "triangle", style: "ascending", direction: "Bullish", volumeMode: "compression", bias: "Resistance is under pressure", marketBias: "Breakout bias", regime: "Compression", signature: SIGNATURES.triangleUp }),
  createPattern({ id: "descending_triangle", name: "Descending Triangle", family: "compression", detectorType: "triangle", style: "descending", direction: "Bearish", volumeMode: "compression", bias: "Support is under pressure", marketBias: "Cautious bias", regime: "Compression", signature: invertSeries(SIGNATURES.triangleUp) }),
  createPattern({ id: "symmetrical_triangle", name: "Symmetrical Triangle", family: "compression", detectorType: "triangle", style: "symmetrical", direction: "Neutral", volumeMode: "compression", bias: "Compression is balancing both sides", marketBias: "Neutral bias", regime: "Compression", signature: SIGNATURES.triangleSym }),
  createPattern({ id: "flat_top_breakout", name: "Flat Top Breakout", family: "compression", detectorType: "flatBreak", side: "top", direction: "Bullish", volumeMode: "breakout", bias: "Flat-top pressure building", marketBias: "Breakout bias", regime: "Compression", signature: SIGNATURES.flatTop }),
  createPattern({ id: "flat_bottom_breakdown", name: "Flat Bottom Breakdown", family: "compression", detectorType: "flatBreak", side: "bottom", direction: "Bearish", volumeMode: "breakout", bias: "Flat-bottom pressure building", marketBias: "Cautious bias", regime: "Compression", signature: invertSeries(SIGNATURES.flatTop) }),
  createPattern({ id: "impulse_pullback", name: "Impulse Pullback", family: "continuation", detectorType: "flag", style: "impulse", direction: "Bullish", volumeMode: "fade", bias: "Trend pullback remains orderly", marketBias: "Continuation bias", regime: "Trend", signature: tiltSeries(SIGNATURES.bullFlag, 0.12), rangeTarget: 0.009, pullbackTarget: 0.02 }),
  createPattern({ id: "stair_step_up", name: "Stair Step Up", family: "trend", detectorType: "stair", direction: "Bullish", volumeMode: "rise", bias: "Higher-low stair steps intact", marketBias: "Bullish bias", regime: "Trend", signature: SIGNATURES.stairStep }),
  createPattern({ id: "stair_step_down", name: "Stair Step Down", family: "trend", detectorType: "stair", direction: "Bearish", volumeMode: "rise", bias: "Lower-high stair steps intact", marketBias: "Cautious bias", regime: "Trend", signature: invertSeries(SIGNATURES.stairStep) }),
  createPattern({ id: "continuation_box", name: "Continuation Box", family: "trend", detectorType: "continuationBox", direction: "Bullish", volumeMode: "flat", bias: "Range is holding after impulse", marketBias: "Continuation bias", regime: "Range", signature: SIGNATURES.boxContinuation }),
  createPattern({ id: "breakout_retest", name: "Breakout Retest", family: "trend", detectorType: "retest", side: "top", direction: "Bullish", volumeMode: "breakout", bias: "Retest remains healthy", marketBias: "Breakout bias", regime: "Trend", signature: SIGNATURES.breakoutRetest }),
  createPattern({ id: "breakdown_retest", name: "Breakdown Retest", family: "trend", detectorType: "retest", side: "bottom", direction: "Bearish", volumeMode: "breakout", bias: "Retest remains heavy", marketBias: "Cautious bias", regime: "Trend", signature: invertSeries(SIGNATURES.breakoutRetest) }),
  createPattern({ id: "drift_base", name: "Drift Base", family: "trend", detectorType: "driftBase", direction: "Bullish", volumeMode: "compression", bias: "Base is quietly forming", marketBias: "Neutral-to-bullish", regime: "Accumulation", signature: SIGNATURES.driftBase }),
  createPattern({ id: "rising_wedge", name: "Rising Wedge", family: "trend", detectorType: "wedge", style: "rising", direction: "Bearish", volumeMode: "compression", bias: "Slope is getting crowded", marketBias: "Cautious bias", regime: "Compression", signature: SIGNATURES.risingWedge }),
  createPattern({ id: "falling_wedge", name: "Falling Wedge", family: "trend", detectorType: "wedge", style: "falling", direction: "Bullish", volumeMode: "compression", bias: "Downside squeeze may be tiring", marketBias: "Recovery bias", regime: "Compression", signature: invertSeries(SIGNATURES.risingWedge) }),
  createPattern({ id: "compression_wedge", name: "Compression Wedge", family: "compression", detectorType: "wedge", style: "compression", direction: "Neutral", volumeMode: "compression", bias: "Expansion setup building", marketBias: "Neutral-to-breakout", regime: "Compression", signature: squeezeSeries(SIGNATURES.triangleSym, 0.72) }),
  createPattern({ id: "ascending_channel", name: "Ascending Channel", family: "trend", detectorType: "channel", style: "ascending", direction: "Bullish", volumeMode: "flat", bias: "Trend is channeling higher", marketBias: "Bullish bias", regime: "Trend", signature: SIGNATURES.channelUp }),
  createPattern({ id: "descending_channel", name: "Descending Channel", family: "trend", detectorType: "channel", style: "descending", direction: "Bearish", volumeMode: "flat", bias: "Trend is channeling lower", marketBias: "Cautious bias", regime: "Trend", signature: invertSeries(SIGNATURES.channelUp) }),
  createPattern({ id: "rising_channel", name: "Rising Channel", family: "trend", detectorType: "channel", style: "rising", direction: "Bullish", volumeMode: "flat", bias: "Uptrend is orderly but stretched", marketBias: "Bullish bias", regime: "Trend", signature: tiltSeries(SIGNATURES.channelUp, 0.12) }),
  createPattern({ id: "falling_channel", name: "Falling Channel", family: "trend", detectorType: "channel", style: "falling", direction: "Bearish", volumeMode: "flat", bias: "Downtrend is orderly but extended", marketBias: "Cautious bias", regime: "Trend", signature: invertSeries(tiltSeries(SIGNATURES.channelUp, 0.12)) }),
  createPattern({ id: "ascending_broadening_wedge", name: "Ascending Broadening Wedge", family: "broadening", detectorType: "broadeningWedge", direction: "Bearish", volumeMode: "expansion", bias: "Wider swings are forming overhead", marketBias: "High-risk momentum", regime: "Expansion", signature: SIGNATURES.broadeningWedgeUp }),
  createPattern({ id: "descending_broadening_wedge", name: "Descending Broadening Wedge", family: "broadening", detectorType: "broadeningWedge", direction: "Bullish", volumeMode: "expansion", bias: "Wider swings are forming under pressure", marketBias: "Recovery bias", regime: "Expansion", signature: invertSeries(SIGNATURES.broadeningWedgeUp) }),
  createPattern({ id: "megaphone", name: "Megaphone", family: "broadening", detectorType: "megaphone", direction: "Neutral", volumeMode: "expansion", bias: "Volatility is widening fast", marketBias: "High-risk momentum", regime: "Expansion", signature: SIGNATURES.megaphone }),
  createPattern({ id: "volatility_coil", name: "Volatility Coil", family: "compression", detectorType: "coil", style: "volatility", direction: "Neutral", volumeMode: "compression", bias: "Fast move likely", marketBias: "Neutral bias", regime: "Compression", signature: SIGNATURES.coil }),
  createPattern({ id: "squeeze_release", name: "Squeeze Release", family: "compression", detectorType: "coil", style: "release", direction: "Neutral", volumeMode: "breakout", bias: "Compression is starting to release", marketBias: "Breakout bias", regime: "Compression", signature: tiltSeries(SIGNATURES.coil, 0.1) }),
  createPattern({ id: "coiled_breakout", name: "Coiled Breakout", family: "compression", detectorType: "coil", style: "breakout", direction: "Bullish", volumeMode: "breakout", bias: "Coiled energy favors upside expansion", marketBias: "Breakout bias", regime: "Compression", signature: tiltSeries(SIGNATURES.coil, 0.18) }),
  createPattern({ id: "coiled_breakdown", name: "Coiled Breakdown", family: "compression", detectorType: "coil", style: "breakdown", direction: "Bearish", volumeMode: "breakout", bias: "Coiled energy favors downside expansion", marketBias: "Cautious bias", regime: "Compression", signature: invertSeries(tiltSeries(SIGNATURES.coil, 0.18)) }),
  createPattern({ id: "range_compression", name: "Range Compression", family: "compression", detectorType: "rangeState", style: "compression", direction: "Neutral", volumeMode: "compression", bias: "Range is tightening", marketBias: "Neutral bias", regime: "Compression", signature: SIGNATURES.rangeCompression }),
  createPattern({ id: "range_expansion", name: "Range Expansion", family: "compression", detectorType: "rangeState", style: "expansion", direction: "Neutral", volumeMode: "expansion", bias: "Range is widening quickly", marketBias: "High-risk momentum", regime: "Expansion", signature: SIGNATURES.rangeExpansion }),
  createPattern({ id: "liquidity_sweep_high", name: "Liquidity Sweep High", family: "liquidity", detectorType: "sweep", side: "high", direction: "Bearish", volumeMode: "sweep", bias: "Stop run above local highs", marketBias: "Cautious bias", regime: "Liquidity Sweep", signature: SIGNATURES.liquiditySweepHigh, windowSizes: [14, 18, 22] }),
  createPattern({ id: "liquidity_sweep_low", name: "Liquidity Sweep Low", family: "liquidity", detectorType: "sweep", side: "low", direction: "Bullish", volumeMode: "sweep", bias: "Stop run below local lows", marketBias: "Recovery bias", regime: "Liquidity Sweep", signature: invertSeries(SIGNATURES.liquiditySweepHigh), windowSizes: [14, 18, 22] }),
  createPattern({ id: "cup_handle", name: "Cup and Handle", family: "structure", detectorType: "cupHandle", side: "top", direction: "Bullish", volumeMode: "accumulate", bias: "Handle still constructive", marketBias: "Bullish bias", regime: "Accumulation", signature: SIGNATURES.cupHandle, windowSizes: [22, 28, 34] }),
  createPattern({ id: "inverse_cup_handle", name: "Inverse Cup and Handle", family: "structure", detectorType: "cupHandle", side: "bottom", direction: "Bearish", volumeMode: "distribute", bias: "Inverse handle still heavy", marketBias: "Cautious bias", regime: "Distribution", signature: invertSeries(SIGNATURES.cupHandle), windowSizes: [22, 28, 34] }),
  createPattern({ id: "accumulation_shelf", name: "Accumulation Shelf", family: "structure", detectorType: "shelf", side: "low", direction: "Bullish", volumeMode: "accumulate", bias: "Supply looks absorbable", marketBias: "Accumulation bias", regime: "Accumulation", signature: SIGNATURES.shelfAccum }),
  createPattern({ id: "distribution_shelf", name: "Distribution Shelf", family: "structure", detectorType: "shelf", side: "high", direction: "Bearish", volumeMode: "distribute", bias: "Supply is building overhead", marketBias: "Cautious bias", regime: "Distribution", signature: invertSeries(SIGNATURES.shelfAccum) }),
  createPattern({ id: "base_breakout", name: "Base Breakout", family: "structure", detectorType: "baseBreakout", direction: "Bullish", volumeMode: "breakout", bias: "Base is trying to lift", marketBias: "Breakout bias", regime: "Accumulation", signature: SIGNATURES.baseBreakout }),
  createPattern({ id: "mean_reversion_bounce", name: "Mean Reversion Bounce", family: "momentum", detectorType: "meanReversion", side: "bounce", direction: "Bullish", volumeMode: "spikeFade", bias: "Snapback is underway", marketBias: "Recovery bias", regime: "Mean Reversion", signature: SIGNATURES.meanReversionBounce, windowSizes: [16, 20, 24] }),
  createPattern({ id: "mean_reversion_fade", name: "Mean Reversion Fade", family: "momentum", detectorType: "meanReversion", side: "fade", direction: "Bearish", volumeMode: "spikeFade", bias: "Snapback is fading", marketBias: "Cautious bias", regime: "Mean Reversion", signature: invertSeries(SIGNATURES.meanReversionBounce), windowSizes: [16, 20, 24] }),
  createPattern({ id: "rounded_accumulation", name: "Rounded Accumulation", family: "structure", detectorType: "roundedMarket", side: "bottom", direction: "Bullish", volumeMode: "accumulate", bias: "Gradual base improvement", marketBias: "Accumulation bias", regime: "Accumulation", signature: SIGNATURES.roundedAccum, windowSizes: [22, 28, 34] }),
  createPattern({ id: "rounded_distribution", name: "Rounded Distribution", family: "structure", detectorType: "roundedMarket", side: "top", direction: "Bearish", volumeMode: "distribute", bias: "Gradual top distribution", marketBias: "Cautious bias", regime: "Distribution", signature: invertSeries(SIGNATURES.roundedAccum), windowSizes: [22, 28, 34] }),
  createPattern({ id: "higher_low_ladder", name: "Higher-Low Ladder", family: "trend", detectorType: "ladder", direction: "Bullish", volumeMode: "rise", bias: "Higher lows keep stacking", marketBias: "Bullish bias", regime: "Trend", signature: SIGNATURES.ladderUp }),
  createPattern({ id: "lower_high_ladder", name: "Lower-High Ladder", family: "trend", detectorType: "ladder", direction: "Bearish", volumeMode: "rise", bias: "Lower highs keep stacking", marketBias: "Cautious bias", regime: "Trend", signature: invertSeries(SIGNATURES.ladderUp) }),
  createPattern({ id: "parabolic_advance", name: "Parabolic Advance", family: "momentum", detectorType: "parabolic", side: "advance", direction: "Bullish", volumeMode: "expansion", bias: "Momentum is accelerating hard", marketBias: "High-risk momentum", regime: "Expansion", signature: SIGNATURES.parabolicAdvance }),
  createPattern({ id: "parabolic_fade", name: "Parabolic Fade", family: "momentum", detectorType: "parabolic", side: "fade", direction: "Bearish", volumeMode: "expansion", bias: "Cool-off risk is rising", marketBias: "High-risk momentum", regime: "Expansion", signature: invertSeries(SIGNATURES.parabolicAdvance) }),
  createPattern({ id: "micro_flag", name: "Micro Flag", family: "continuation", detectorType: "flag", style: "micro", direction: "Bullish", volumeMode: "fade", bias: "Short pullback remains organized", marketBias: "Continuation bias", regime: "Trend", signature: SIGNATURES.microFlag, windowSizes: [14, 18, 22], rangeTarget: 0.008, pullbackTarget: 0.014 }),
];

const DETECTOR_IMPLEMENTATIONS = {
  doubleSwing: evaluateDoubleSwing,
  tripleSwing: evaluateTripleSwing,
  headShoulders: evaluateHeadShoulders,
  roundedTurn: evaluateRoundedTurn,
  diamond: evaluateDiamond,
  broadening: evaluateBroadening,
  vTurn: evaluateVTurn,
  fadePattern: evaluateFadePattern,
  exhaustionSpike: evaluateExhaustionSpike,
  flag: evaluateFlag,
  pennant: evaluatePennant,
  triangle: evaluateTriangle,
  flatBreak: evaluateFlatBreak,
  stair: evaluateStair,
  continuationBox: evaluateContinuationBox,
  retest: evaluateRetest,
  driftBase: evaluateDriftBase,
  wedge: evaluateWedge,
  channel: evaluateChannel,
  broadeningWedge: evaluateBroadeningWedge,
  megaphone: evaluateMegaphone,
  coil: evaluateCoil,
  rangeState: evaluateRangeState,
  sweep: evaluateSweep,
  cupHandle: evaluateCupHandle,
  shelf: evaluateShelf,
  baseBreakout: evaluateBaseBreakout,
  meanReversion: evaluateMeanReversion,
  roundedMarket: evaluateRoundedMarket,
  ladder: evaluateLadder,
  parabolic: evaluateParabolic,
};

function detectPattern(spec, candles, intervalLabel = "1m") {
  const evaluate = DETECTOR_IMPLEMENTATIONS[spec.detectorType];
  if (!evaluate || candles.length < 14) {
    return null;
  }

  let best = null;
  for (const windowSize of spec.windowSizes || DEFAULT_WINDOW_SIZES) {
    if (candles.length < windowSize) {
      continue;
    }

    for (const endOffset of spec.endOffsets || DEFAULT_END_OFFSETS) {
      const endIndex = candles.length - 1 - endOffset;
      const startIndex = endIndex - windowSize + 1;
      if (startIndex < 0) {
        continue;
      }
      const ctx = buildWindowContext(candles, startIndex, endIndex, intervalLabel);
      const metrics = evaluate(spec, ctx);
      if (!metrics) {
        continue;
      }
      const candidate = buildBaseResult(spec, candles, ctx, {
        ...metrics,
        prototypeScore: scorePrototypeAlignment(spec, ctx),
        freshnessScore: computeFreshness(candles.length, endIndex, windowSize),
      }, intervalLabel);
      if (!best || candidate.score > best.score) {
        best = candidate;
      }
    }
  }

  return best;
}

const DETECTOR_REGISTRY = PATTERN_DEFINITIONS.map((spec) => ({
  ...spec,
  detect(candles, intervalLabel = "1m") {
    return detectPattern(spec, candles, intervalLabel);
  },
}));

function sortDetections(left, right) {
  return right.score - left.score || right.confidence - left.confidence || left.name.localeCompare(right.name);
}

function noPatternState(intervalLabel) {
  return {
    patternId: null,
    title: `${intervalLabel} Detector Scan Active`,
    body: `No high-confidence dedicated pattern is active on live Binance ${intervalLabel} candles right now.`,
    tagline: `No high-confidence pattern detected`,
    mode: `${intervalLabel} dedicated detector registry`,
    regime: "Scanning",
    marketBias: "Neutral bias",
    direction: "Neutral",
    confidence: 0,
    span: null,
    rationale: "Waiting for cleaner structure",
    patterns: [],
    tracePoints: [],
    guideLines: [],
    pattern: null,
  };
}

function analyzeDetectedPatterns(candles, intervalLabel = "1m") {
  if (candles.length < 30) {
    return {
      patternId: null,
      title: `${intervalLabel} Detector Engine Warming Up`,
      body: `Waiting for enough live Binance candles to activate the ${intervalLabel} dedicated detector registry.`,
      tagline: `Collecting ${intervalLabel} Binance data`,
      mode: `${intervalLabel} dedicated detector registry`,
      regime: "Initializing",
      marketBias: "Neutral bias",
      direction: "Neutral",
      confidence: 0,
      span: null,
      rationale: "Collecting more candles",
      patterns: [],
      tracePoints: [],
      guideLines: [],
      pattern: null,
    };
  }

  const results = DETECTOR_REGISTRY.map((detector) => detector.detect(candles, intervalLabel)).filter(Boolean).sort(sortDetections);
  const matched = results.filter((result) => result.matched);
  if (!matched.length) {
    return noPatternState(intervalLabel);
  }

  const leader = matched[0];
  return {
    patternId: leader.id,
    title: leader.title,
    body: leader.body,
    tagline: leader.tagline,
    mode: `${intervalLabel} dedicated detector registry`,
    regime: leader.regime,
    marketBias: leader.marketBias,
    direction: leader.direction,
    confidence: leader.confidence,
    span: leader.span,
    rationale: leader.rationale,
    tracePoints: leader.tracePoints,
    guideLines: leader.guideLines,
    pattern: leader,
    patterns: matched.slice(0, 3).map((pattern) => ({
      id: pattern.id,
      name: pattern.name,
      family: pattern.family,
      direction: pattern.direction,
      confidence: pattern.confidence,
      bias: pattern.bias,
      rationale: pattern.rationale,
      span: pattern.span.timeLabel,
      candleSpan: pattern.span.candleLabel,
      tracePoints: pattern.tracePoints,
      guideLines: pattern.guideLines,
    })),
  };
}

function getPatternDefinition(patternId) {
  return PATTERN_DEFINITIONS.find((pattern) => pattern.id === patternId) || null;
}

const TOP_DOWN_INTERVALS = ["4h", "1h", "30m", "15m", "5m", "1m"];

const VOLUME_REFERENCE_TRAITS = {
  flat: "Volume confirmation: participation usually stays even while structure matures.",
  rise: "Volume confirmation: strengthening participation should support each new step.",
  fade: "Volume confirmation: pullback volume often cools while the structure stays intact.",
  breakout: "Volume confirmation: expansion on the break is usually the textbook trigger.",
  compression: "Volume confirmation: volume often contracts before the release leg.",
  expansion: "Volume confirmation: widening range and rising activity often travel together.",
  spikeFade: "Volume confirmation: one-sided volume spikes often mark emotional extremes.",
  sweep: "Volume confirmation: a sharp sweep often prints with a sudden liquidity burst.",
  accumulate: "Volume confirmation: steady absorption is often more constructive than a single spike.",
  distribute: "Volume confirmation: heavy turnover near resistance often warns of supply.",
};

const DETECTOR_REFERENCE_DESCRIPTIONS = {
  doubleSwing(pattern) {
    return `This classic ${pattern.direction.toLowerCase()} reversal forms when price retests the same swing ${pattern.side === "top" ? "high" : "low"} twice and the reaction leg between those tests becomes the decision line. Textbook readers usually wait for that middle pivot to give way before treating the structure as active.`;
  },
  tripleSwing(pattern) {
    return `A triple test extends the same idea across three separated swing ${pattern.side === "top" ? "highs" : "lows"}, showing that the market keeps revisiting the same boundary without clean follow-through. The pattern becomes more meaningful when the reaction pivots stay orderly and the final break leaves that range behind.`;
  },
  headShoulders(pattern) {
    return `This structure uses a higher middle swing flanked by two smaller shoulders to show a tiring trend. The neckline is the reference level most technicians track, because a clean break there is what turns the pattern from a sketch into an actionable structure.`;
  },
  roundedTurn(pattern) {
    return `A rounded turn is a slower reversal where the slope gradually loses force, flattens, and then bends the other way. Analysts usually treat it as a patience pattern: the cleaner the curve and the steadier the transition, the stronger the textbook read.`;
  },
  diamond() {
    return "A diamond structure expands first and then contracts, producing a broad middle section before price is forced back into balance. In reference texts, it is treated as a high-attention transition pattern because disorder appears before the eventual resolution.";
  },
  broadening(pattern) {
    return `A broadening pattern shows swings growing wider rather than tighter, which means agreement is weakening instead of building. The more price keeps stretching the boundaries without settling, the more unstable the structure becomes.`;
  },
  vTurn() {
    return "A V-shaped turn is a fast directional reversal built on a sharp impulse and an equally sharp reclaim. The pattern is strongest when the recovery arrives quickly enough that the left side never develops into a drawn-out base.";
  },
  fadePattern() {
    return "Fade structures are textbook caution patterns: the first move looks dramatic, but the follow-through fails to extend cleanly and the retracement starts to dominate the tape. Analysts usually watch whether the bounce or relief leg stays shallow and fragile.";
  },
  exhaustionSpike() {
    return "Exhaustion spikes accelerate into a final emotional move and then begin to cool. The reference read focuses on whether the last vertical stretch is being accepted or immediately retraced, because that decides whether the spike was continuation or climax.";
  },
  flag(pattern) {
    return `A flag pairs an impulse leg with a smaller corrective channel or drift. In textbooks, the pattern stays constructive only while the pause remains compact relative to the original impulse and does not fully unwind the move that created it.`;
  },
  pennant() {
    return "A pennant compresses after an impulse and narrows toward an apex, creating a smaller triangular pause before the next expansion attempt. Analysts usually look for a clean squeeze, then judge the break by whether volume and range return together.";
  },
  triangle(pattern) {
    return `Triangles organize price between converging boundaries, forcing the market to reveal which side keeps absorbing pressure. The textbook focus is usually on the flat side, the rising or falling reaction line, and whether the apex resolves with real expansion.`;
  },
  flatBreak(pattern) {
    return `A flat-boundary breakout pattern keeps revisiting one horizontal edge while the opposite side creeps toward it. Reference-book analysis usually treats the flat ceiling or floor as the key decision line and waits for price to escape that shelf decisively.`;
  },
  stair(pattern) {
    return `This stair-step trend builds through repeated push-and-pause behavior, where each new impulse is followed by a smaller reset instead of a full unwind. The structure remains intact while each correction leaves the stepping sequence unchanged.`;
  },
  continuationBox() {
    return "A continuation box is a post-impulse holding range where price digests the prior move without surrendering it. Textbook treatment focuses on whether the box stays compact and whether the eventual break leaves the range with conviction.";
  },
  retest(pattern) {
    return `Retest structures revisit a recently broken level to see whether that old boundary flips into support or resistance. Analysts usually watch whether the retest remains controlled, because a messy re-entry back through the level weakens the setup quickly.`;
  },
  driftBase() {
    return "A drift base is a quiet holding pattern where price stops expanding lower and starts stabilizing in a compact zone. It is usually read as an early-stage accumulation structure when the base stays orderly and begins to lift without chasing.";
  },
  wedge(pattern) {
    return `A wedge pulls price between two lines that lean in the same general direction while still narrowing together. Textbook interpretation depends on whether the structure is crowding upward, crowding downward, or simply compressing into a decision point.`;
  },
  channel(pattern) {
    return `Channels track price between roughly parallel rails and are usually read as orderly trend containers rather than explosive setups. The reference question is whether the market keeps respecting both sides of the rail or starts slipping into a different structure.`;
  },
  broadeningWedge() {
    return "A broadening wedge combines directional lean with widening swings, so the structure becomes larger and less stable as it develops. In textbooks this is treated as a higher-risk pattern because each new swing stretches the pattern instead of calming it.";
  },
  megaphone() {
    return "A megaphone pattern alternates between higher highs and lower lows, showing disagreement and growing volatility rather than balance. Analysts usually treat it as unstable structure until price finally stops expanding and chooses one side decisively.";
  },
  coil(pattern) {
    return `A coil is a tight compression pattern where range and often volume contract into a smaller pocket of price. The reference read is less about the middle of the coil and more about whether the eventual release is clean enough to justify the buildup.`;
  },
  rangeState(pattern) {
    return `This pattern classifies whether the active range is tightening or widening instead of focusing on a single named formation. Textbook analysis uses it as context: shrinking range usually hints at pressure building, while widening range often signals instability.`;
  },
  sweep(pattern) {
    return `A liquidity sweep pushes through an obvious prior boundary, triggers resting stops, and then returns back through that level. The schematic matters because the wick beyond the old range is usually the visual clue that the move was a sweep rather than acceptance.`;
  },
  cupHandle(pattern) {
    return `A cup-and-handle structure first rounds into a base and then pauses in a smaller pullback before the breakout attempt. Analysts usually focus on whether the handle stays contained, because a deep or disorderly handle can damage the entire textbook read.`;
  },
  shelf(pattern) {
    return `A shelf is a compact horizontal holding structure where price repeatedly absorbs flow at nearly the same level. The pattern keeps its reference-book character only while the shelf remains tight and the drift inside it stays controlled.`;
  },
  baseBreakout() {
    return "A base breakout emerges from an orderly accumulation shelf and turns that slow stabilization into a directional push. The textbook view is strongest when price leaves the base cleanly rather than oscillating back through the old ceiling.";
  },
  meanReversion(pattern) {
    return `Mean reversion structures begin with an overstretched move away from recent balance and then look for the snapback leg. Textbook readers usually judge them by the size of the stretch and the speed of the counter-move, not by trend continuation.`;
  },
  roundedMarket(pattern) {
    return `This slower rounded structure describes a broad accumulation or distribution process rather than a quick reversal. The key visual is a gradual curvature that spends time transitioning rather than flipping direction in a single sharp turn.`;
  },
  ladder(pattern) {
    return `A ladder pattern emphasizes repeated support or resistance stepping in at progressively better prices for one side. In reference diagrams the sequence matters: the same side of the structure must keep stacking without breaking the cadence of the trend.`;
  },
  parabolic(pattern) {
    return `Parabolic structures accelerate as they develop, which means the later part of the move becomes steeper than the earlier part. The textbook read depends on whether that acceleration is still being accepted or whether it is starting to exhaust itself.`;
  },
};

const DETECTOR_REFERENCE_EMPHASIS = {
  doubleSwing(pattern) {
    return `Neckline focus: watch the reaction ${pattern.side === "top" ? "low" : "high"} between the two tests.`;
  },
  tripleSwing(pattern) {
    return `Boundary focus: the repeated ${pattern.side === "top" ? "ceiling" : "floor"} matters more than any single touch.`;
  },
  headShoulders() {
    return "Neckline focus: the shoulder symmetry matters less than the neckline response.";
  },
  roundedTurn() {
    return "Curve focus: the turn is strongest when the slope changes gradually, not violently.";
  },
  diamond() {
    return "Expansion-to-contraction focus: the middle disorder should eventually compress.";
  },
  broadening() {
    return "Volatility focus: wider swings usually mean unstable participation.";
  },
  vTurn() {
    return "Speed focus: fast reclaim is what separates a V-turn from a slow base.";
  },
  fadePattern() {
    return "Relief focus: the counter-move should stay shallow if the fade is valid.";
  },
  exhaustionSpike() {
    return "Exhaustion focus: climax moves often fail if the last leg cannot hold.";
  },
  flag() {
    return "Pullback focus: the pause should stay smaller than the impulse leg that created it.";
  },
  pennant() {
    return "Apex focus: the structure usually matters most near the narrowing point.";
  },
  triangle() {
    return "Boundary focus: track which side of the triangle is absorbing pressure.";
  },
  flatBreak(pattern) {
    return `Break line focus: the flat ${pattern.side === "top" ? "ceiling" : "floor"} is the key reference level.`;
  },
  stair() {
    return "Cadence focus: each step should hold before the next impulse begins.";
  },
  continuationBox() {
    return "Box focus: clean edges matter more than the exact internal path.";
  },
  retest(pattern) {
    return `Retest focus: the old ${pattern.side === "top" ? "resistance" : "support"} should flip cleanly.`;
  },
  driftBase() {
    return "Base focus: orderly drift is more constructive than aggressive chasing.";
  },
  wedge() {
    return "Rail focus: converging trend lines matter more than any single candle.";
  },
  channel() {
    return "Rail focus: parallel boundaries define the trend container.";
  },
  broadeningWedge() {
    return "Instability focus: widening rails increase failure risk.";
  },
  megaphone() {
    return "Instability focus: alternating wider swings usually mean poor agreement.";
  },
  coil() {
    return "Release focus: the breakout matters more than the center of the compression.";
  },
  rangeState(pattern) {
    return `Range focus: ${pattern.style === "compression" ? "pressure builds as the range tightens" : "instability rises as the range widens"}.`;
  },
  sweep(pattern) {
    return `Wick focus: the sweep candle should briefly trade beyond the old ${pattern.side}.`;
  },
  cupHandle() {
    return "Handle focus: the smaller pause should not damage the rounded base.";
  },
  shelf() {
    return "Shelf focus: balance matters more than speed inside the range.";
  },
  baseBreakout() {
    return "Ceiling focus: the base becomes active only when price clears the shelf cleanly.";
  },
  meanReversion() {
    return "Stretch focus: the snapback begins after price moves too far from recent balance.";
  },
  roundedMarket() {
    return "Process focus: broad curvature usually reflects slower accumulation or distribution.";
  },
  ladder(pattern) {
    return `Step focus: successive ${pattern.direction === "Bearish" ? "lower highs" : "higher lows"} must keep stacking.`;
  },
  parabolic(pattern) {
    return `Slope focus: later acceleration should be visibly steeper than the opening leg.`;
  },
};

function buildReferenceDescription(pattern) {
  const builder = DETECTOR_REFERENCE_DESCRIPTIONS[pattern.detectorType];
  return builder ? builder(pattern) : `${pattern.name} is treated as a ${pattern.direction.toLowerCase()} ${pattern.family} structure in the detector registry.`;
}

function buildReferenceTraits(pattern) {
  const emphasisBuilder = DETECTOR_REFERENCE_EMPHASIS[pattern.detectorType];
  const emphasis = emphasisBuilder ? emphasisBuilder(pattern) : `Structure focus: ${pattern.bias}.`;
  return [
    `Directional read: ${pattern.direction}`,
    `Market tone: ${pattern.marketBias}`,
    VOLUME_REFERENCE_TRAITS[pattern.volumeMode] || "Volume confirmation: participation should support the structural read.",
    emphasis,
  ];
}

function buildReferenceIllustration(pattern) {
  return {
    signature: pattern.signature || [],
    detectorType: pattern.detectorType,
    family: pattern.family,
    style: pattern.style || null,
    side: pattern.side || null,
    direction: pattern.direction,
  };
}

const PATTERN_REFERENCE_LIBRARY = Object.fromEntries(
  PATTERN_DEFINITIONS.map((pattern) => [
    pattern.id,
    {
      patternId: pattern.id,
      referenceTitle: pattern.name,
      referenceDirection: pattern.direction,
      referenceDescription: buildReferenceDescription(pattern),
      referenceTraits: buildReferenceTraits(pattern),
      referenceIllustration: buildReferenceIllustration(pattern),
    },
  ])
);

function getPatternReference(patternId) {
  return PATTERN_REFERENCE_LIBRARY[patternId] || null;
}

function formatCascadeStatus(cascadeIntervals, cascadeBreakInterval) {
  if (!cascadeIntervals?.length) {
    return "Waiting for an exact top-down lead.";
  }
  if (!cascadeBreakInterval) {
    return `Exact-match cascade confirmed through ${cascadeIntervals.join(" -> ")}.`;
  }
  return `Exact-match cascade held through ${cascadeIntervals.join(" -> ")} before diverging at ${cascadeBreakInterval}.`;
}

function buildTopDownAlignmentItem({
  interval,
  status,
  analysis,
  matchesLead = false,
  isUnavailable = false,
  isLoading = false,
}) {
  return {
    interval,
    status,
    matchesLead,
    isUnavailable,
    isLoading,
    direction: analysis?.direction || analysis?.pattern?.direction || "Neutral",
    confidence: analysis?.confidence || 0,
    span: analysis?.span?.timeLabel || "--",
    patternName: analysis?.pattern?.name || null,
    altPatternName: analysis?.pattern?.name || null,
  };
}

function buildTopDownAnalysis(intervalEntries, displayedInterval = "1m", orderedIntervals = TOP_DOWN_INTERVALS) {
  const sourceEntries = Array.isArray(intervalEntries)
    ? intervalEntries
    : orderedIntervals.map((interval) => ({ interval, analysis: intervalEntries?.[interval] || null }));
  const entryMap = new Map(
    sourceEntries.map((entry) => [
      entry.interval,
      {
        interval: entry.interval,
        analysis: entry.analysis?.analysis || entry.analysis || null,
        isUnavailable: Boolean(entry.isUnavailable),
      },
    ])
  );
  const normalizedEntries = orderedIntervals.map((interval) => entryMap.get(interval) || { interval, analysis: null, isUnavailable: false });
  const currentIntervalPattern = normalizedEntries.find((entry) => entry.interval === displayedInterval)?.analysis || null;
  const leadIndex = normalizedEntries.findIndex((entry) => entry.analysis?.patternId);

  if (leadIndex === -1) {
    const timeframeAlignment = normalizedEntries.map((entry) =>
      buildTopDownAlignmentItem({
        interval: entry.interval,
        status: entry.isUnavailable ? "Offline" : "Not Present",
        analysis: entry.analysis,
        isUnavailable: entry.isUnavailable,
      })
    );
    return {
      leadPattern: null,
      leadAnalysis: null,
      leadInterval: null,
      cascadeIntervals: [],
      cascadeBreakInterval: null,
      topDownPatternId: null,
      topDownPattern: null,
      currentIntervalPattern,
      intervalResults: Object.fromEntries(normalizedEntries.map((entry) => [entry.interval, entry.analysis])),
      cascadeStatus: "Waiting for an exact top-down lead.",
      referencePatternId: currentIntervalPattern?.patternId || null,
      timeframeAlignment,
    };
  }

  const leadEntry = normalizedEntries[leadIndex];
  const leadAnalysis = leadEntry.analysis;
  const leadPatternId = leadAnalysis.patternId;
  const cascadeIntervals = [leadEntry.interval];
  let cascadeBreakInterval = null;
  let cascadeBroken = false;

  const timeframeAlignment = normalizedEntries.map((entry, index) => {
    if (entry.isUnavailable) {
      if (index > leadIndex && !cascadeBreakInterval) {
        cascadeBreakInterval = entry.interval;
        cascadeBroken = true;
      }
      return buildTopDownAlignmentItem({
        interval: entry.interval,
        status: "Offline",
        analysis: entry.analysis,
        isUnavailable: true,
      });
    }

    if (index < leadIndex) {
      return buildTopDownAlignmentItem({
        interval: entry.interval,
        status: entry.analysis?.patternId ? "Higher Match" : "Not Present",
        analysis: entry.analysis,
      });
    }

    if (index === leadIndex) {
      return buildTopDownAlignmentItem({
        interval: entry.interval,
        status: "Lead",
        analysis: entry.analysis,
        matchesLead: true,
      });
    }

    if (cascadeBroken) {
      return buildTopDownAlignmentItem({
        interval: entry.interval,
        status: entry.analysis?.patternId ? "Unconfirmed" : "Not Present",
        analysis: entry.analysis,
      });
    }

    if (entry.analysis?.patternId === leadPatternId) {
      cascadeIntervals.push(entry.interval);
      return buildTopDownAlignmentItem({
        interval: entry.interval,
        status: "Confirmed",
        analysis: entry.analysis,
        matchesLead: true,
      });
    }

    cascadeBreakInterval = entry.interval;
    cascadeBroken = true;
    return buildTopDownAlignmentItem({
      interval: entry.interval,
      status: entry.analysis?.patternId ? "Diverging" : "Not Present",
      analysis: entry.analysis,
    });
  });

  return {
    leadPattern: leadAnalysis.pattern,
    leadAnalysis,
    leadInterval: leadEntry.interval,
    cascadeIntervals,
    cascadeBreakInterval,
    topDownPatternId: leadPatternId,
    topDownPattern: leadAnalysis.pattern,
    currentIntervalPattern,
    intervalResults: Object.fromEntries(normalizedEntries.map((entry) => [entry.interval, entry.analysis])),
    cascadeStatus: formatCascadeStatus(cascadeIntervals, cascadeBreakInterval),
    referencePatternId: leadPatternId,
    timeframeAlignment,
  };
}

function buildFixtureCandles(patternId, candleCount = 36, startPrice = 100, intervalMs = 60_000) {
  const pattern = getPatternDefinition(patternId);
  if (!pattern?.signature) {
    throw new Error(`No fixture signature for pattern ${patternId}`);
  }

  const normalizedCloses = resampleSeries(pattern.signature, candleCount);
  const normalizedVolumes = resampleSeries(VOLUME_SIGNATURES[pattern.volumeMode] || VOLUME_SIGNATURES.flat, candleCount);
  const candles = [];
  let previousClose = startPrice * (0.94 + normalizedCloses[0] * 0.12);
  const startTime = Date.now() - candleCount * intervalMs;

  normalizedCloses.forEach((normalizedClose, index) => {
    const close = startPrice * (0.94 + normalizedClose * 0.12);
    const open = index === 0 ? close * 0.998 : previousClose;
    const wick = startPrice * (0.0022 + (index % 4) * 0.00035);
    const high = Math.max(open, close) + wick;
    const low = Math.min(open, close) - wick;
    const volume = 30 + normalizedVolumes[index] * 38;
    candles.push({
      openTime: startTime + index * intervalMs,
      open,
      high,
      low,
      close,
      volume,
      closeTime: startTime + (index + 1) * intervalMs,
    });
    previousClose = close;
  });

  return candles;
}

export {
  DETECTION_THRESHOLD,
  DETECTOR_REGISTRY,
  PATTERN_REFERENCE_LIBRARY,
  PATTERN_DEFINITIONS,
  TOP_DOWN_INTERVALS,
  analyzeDetectedPatterns,
  buildTopDownAnalysis,
  buildFixtureCandles,
  getPatternDefinition,
  getPatternReference,
};
