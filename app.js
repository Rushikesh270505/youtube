const CONFIG = {
  rotationMinutes: 12,
  chartPoints: 72,
  interval: "4h",
  reconnectMs: 2500,
  restBaseUrls: ["https://data-api.binance.vision", "https://api.binance.com"],
  wsBaseUrl: "wss://stream.binance.com:9443/stream?streams=",
  coins: [
    { symbol: "BTC", name: "Bitcoin", pair: "BTC / USDT", spokenName: "BITCOIN", marketSymbol: "BTCUSDT", tone: "Institutional flow" },
    { symbol: "ETH", name: "Ethereum", pair: "ETH / USDT", spokenName: "ETHERIUM", marketSymbol: "ETHUSDT", tone: "Smart-contract rotation" },
    { symbol: "SOL", name: "Solana", pair: "SOL / USDT", spokenName: "SOLANA", marketSymbol: "SOLUSDT", tone: "Momentum leadership" },
    { symbol: "XRP", name: "XRP", pair: "XRP / USDT", spokenName: "XRP", marketSymbol: "XRPUSDT", tone: "Event-sensitive flow" },
    { symbol: "DOGE", name: "Dogecoin", pair: "DOGE / USDT", spokenName: "DOGE", marketSymbol: "DOGEUSDT", tone: "Retail impulse" },
    { symbol: "PEPE", name: "Pepe", pair: "PEPE / USDT", spokenName: "PEPE", marketSymbol: "PEPEUSDT", tone: "Meme rotation" },
    { symbol: "PAXG", name: "Gold", pair: "PAXG / USDT", spokenName: "GOLD", marketSymbol: "PAXGUSDT", tone: "Precious-metal hedge" },
  ],
  tickerMessages: [
    "Dedicated detectors are reading live Binance candles",
    "Conservative pattern alerts only surface clean structures",
    "Single-stream rotation is tuned for longer watch sessions",
    "OBS browser source layout is locked to a 1080p canvas",
    "Shorts triggers should fire when exact multi-timeframe confirmation appears",
  ],
};

const MULTI_TIMEFRAME_INTERVALS = ["4h", "1h", "30m", "15m", "5m", "1m"];
const TOP_DOWN_SCAN_INTERVALS = ["4h", "1h", "30m", "15m", "5m", "1m"];
const PODCAST_TIMEFRAME_INTERVALS = ["1m", "5m", "15m", "30m", "1h", "4h"];
const CRYPTO_NEWS_FEEDS = [
  {
    source: "CoinDesk",
    endpoint: "https://api.rss2json.com/v1/api.json?rss_url=https://www.coindesk.com/arc/outboundfeeds/rss/",
  },
  {
    source: "Cointelegraph",
    endpoint: "https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss",
  },
];
const NEWS_CACHE_MS = 5 * 60 * 1000;
const DEFAULT_VOICE_PACK_IDS = ["neutral_analyst", "high_energy_host", "calm_educator"];
const LIVE_COMMENTARY_MIN_INTERVAL_MS = 18 * 1000;
const LIVE_COMMENTARY_DEDUPE_MS = 120 * 1000;
const LIVE_COMMENTARY_QUEUE_MAX = 2;
const INTERMISSION_SUMMARY_MIN_MS = 5000;
const INTERMISSION_SUMMARY_MAX_MS = 7000;
const INTERMISSION_NEWS_MIN_MS = 6000;
const INTERMISSION_NEWS_MAX_MS = 8000;
const INTERMISSION_DOOR_CLOSE_MS = 1100;
const INTERMISSION_DOOR_OPEN_MS = 1100;

const dom = {
  coinAvatar: document.getElementById("coin-avatar"),
  coinPair: document.getElementById("coin-pair"),
  brandPattern: document.getElementById("brand-pattern"),
  nextCoin: document.getElementById("next-coin"),
  rotationCountdown: document.getElementById("rotation-countdown"),
  voiceToggle: document.getElementById("voice-toggle"),
  voiceButtonLabel: document.getElementById("voice-button-label"),
  voiceStatus: document.getElementById("voice-status"),
  currentInterval: document.getElementById("current-interval"),
  intervalSwitchCopy: document.getElementById("interval-switch-copy"),
  slotProgress: document.getElementById("slot-progress"),
  intervalSwitchboard: document.getElementById("interval-switchboard"),
  currentPrice: document.getElementById("current-price"),
  currentChange: document.getElementById("current-change"),
  alertTagline: document.getElementById("alert-tagline"),
  rsiValue: document.getElementById("rsi-value"),
  macdValue: document.getElementById("macd-value"),
  signalDirection: document.getElementById("signal-direction"),
  signalConfidence: document.getElementById("signal-confidence"),
  signalTone: document.getElementById("signal-tone"),
  signalPhase: document.getElementById("signal-phase"),
  momentumContext: document.getElementById("momentum-context"),
  timeframeConfirmation: document.getElementById("timeframe-confirmation"),
  leadPatternCard: document.getElementById("lead-pattern-card"),
  patternReferenceCard: document.getElementById("pattern-reference-card"),
  newsPanelCard: document.getElementById("news-panel-card"),
  newsRotationMeta: document.getElementById("news-rotation-meta"),
  engineStatus: document.getElementById("engine-status"),
  alertCadence: document.getElementById("alert-cadence"),
  alertTitle: document.getElementById("alert-title"),
  alertBody: document.getElementById("alert-body"),
  alertConfidence: document.getElementById("alert-confidence"),
  priceChart: document.getElementById("price-chart"),
  rsiChart: document.getElementById("rsi-chart"),
  macdChart: document.getElementById("macd-chart"),
  tickerTrack: document.getElementById("ticker-track"),
  voiceSubtitleLayer: document.getElementById("voice-subtitle-layer"),
  voiceAudioPlayer: document.getElementById("voice-audio-player"),
  intermissionOverlay: document.getElementById("intermission-overlay"),
};

const state = {
  currentIndex: 0,
  rotationStartedAt: Date.now(),
  candles: [],
  rsiSeries: [],
  macdLine: [],
  macdSignal: [],
  macdHistogram: [],
  liveTicker: null,
  patternAnalysis: null,
  currentIntervalPattern: null,
  topDownAnalysis: null,
  intervalAnalyses: {},
  marketSnapshots: {},
  socket: null,
  reconnectTimer: null,
  intentionalSocketClose: false,
  mockInterval: null,
  isMock: false,
  loadSequence: 0,
  currentIntervalIndex: 0,
  timeframeAlignment: [],
  alignmentLoading: false,
  alignmentRequestId: 0,
  latestNewsItems: [],
  latestNewsFetchedAt: 0,
  newsPanelIndex: 0,
  newsPanelStartedAt: 0,
  orderBook: {
    bids: [],
    asks: [],
    spread: null,
    spreadPercent: null,
    updatedAt: 0,
    status: "Loading",
  },
  intermission: {
    active: false,
    phase: "idle",
    startedAt: 0,
    frozenCoinIndex: null,
    frozenIntervalIndex: null,
    coin: null,
    summary: null,
    analysisStatus: "idle",
    newsItems: [],
    newsStatus: "idle",
    snapshotReady: false,
    token: 0,
    timeouts: [],
    cachedIntervalAnalyses: {},
    preloadedSnapshot: null,
    nextCoinIndex: null,
    podcastPackage: null,
    podcastStatus: "idle",
    podcastIntervalAnalyses: {},
    subtitleClip: null,
  },
};

function emptyPatternAnalysis(intervalLabel = CONFIG.interval) {
  return {
    patternId: null,
    title: `${intervalLabel} Detector Scan Active`,
    body: `No high-confidence dedicated pattern is active on live Binance ${intervalLabel} candles right now.`,
    tagline: "No high-confidence pattern detected",
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

const detectorEngine = {
  DETECTION_THRESHOLD: 84,
  DETECTOR_REGISTRY: [],
  PATTERN_REFERENCE_LIBRARY: {},
  TOP_DOWN_INTERVALS: TOP_DOWN_SCAN_INTERVALS,
  analyzeDetectedPatterns: emptyPatternAnalysis,
  buildTopDownAnalysis: () => ({
    leadPattern: null,
    leadAnalysis: null,
    leadInterval: null,
    cascadeIntervals: [],
    cascadeBreakInterval: null,
    topDownPatternId: null,
    topDownPattern: null,
    currentIntervalPattern: null,
    intervalResults: {},
    cascadeStatus: "Waiting for an exact top-down lead.",
    referencePatternId: null,
    timeframeAlignment: [],
  }),
  getPatternReference: () => null,
};

const intermissionEngine = {
  INTERMISSION_TOTAL_MS: 13200,
  INTERMISSION_CLOSE_MS: 1100,
  INTERMISSION_SUMMARY_MS: 5000,
  INTERMISSION_NEWS_MS: 6000,
  INTERMISSION_OPEN_MS: 1100,
  DEFAULT_INTERVAL_ORDER: TOP_DOWN_SCAN_INTERVALS,
  aggregatePatternVotes: () => ({
    directionScores: { Bullish: 0, Bearish: 0, Neutral: 0 },
    topPatterns: [],
    intervalBreakdown: [],
    contributingIntervals: 0,
    totalContribution: 0,
    dominantDirection: "Neutral",
    biasPhrase: "mixed / neutral",
    biasStrength: "mixed",
  }),
  buildSubtitleLines: () => [],
  buildIntermissionSummary: (intervalAnalyses, coin) => ({
    directionScores: { Bullish: 0, Bearish: 0, Neutral: 0 },
    topPatterns: [],
    intervalBreakdown: [],
    contributingIntervals: 0,
    totalContribution: 0,
    dominantDirection: "Neutral",
    biasPhrase: "mixed / neutral",
    biasStrength: "mixed",
    coin,
    analysisStatus: "ready",
    subtitleLines: [
      `${coin?.pair || "This market"} pattern read complete.`,
      "Based on the six-timeframe analysis, the market currently seems to look mixed / neutral.",
      "The strongest reads are still mixed across the scanned timeframes. Let's see what happens.",
    ],
  }),
};

const voiceDirector = {
  audio: null,
  initialized: false,
  serviceReady: false,
  castReady: false,
  podcastReady: false,
  podcastConfig: null,
  audioPlaybackAllowed: true,
  audioPlaybackFailures: 0,
  audioUnlocked: false,
  voiceStatus: [],
  queue: [],
  isProcessing: false,
  currentPlaybackToken: 0,
  activeIntermissionToken: 0,
  lastLiveSpokenAt: 0,
  recentLiveEvents: new Map(),
  lastObservedSnapshot: null,
  currentMode: "idle",
  warmupQueued: false,
  lastAmbientQueuedAt: 0,
  lastAmbientType: "pattern",
  activeLiveEvent: null,
};

const chartCinematic = {
  rafId: 0,
  layout: null,
  dom: {
    svg: null,
    cameraRoot: null,
    staticLevelsLayer: null,
    zoneUnderlay: null,
    candleHighlightLayer: null,
    zoneOverlay: null,
    priceCalloutLayer: null,
    zoneGroup: null,
    zoneHalo: null,
    zoneBorder: null,
    zoneFill: null,
    zoneLabel: null,
    zoneLabelCard: null,
    zoneLabelTitle: null,
    zoneLabelRange: null,
    candleHighlightGroup: null,
  },
  camera: {
    currentScale: 1,
    currentTx: 0,
    currentTy: 0,
    fromScale: 1,
    fromTx: 0,
    fromTy: 0,
    targetScale: 1,
    targetTx: 0,
    targetTy: 0,
    startedAt: 0,
    duration: 0,
    easing: null,
    active: false,
  },
  zone: {
    input: null,
    resolved: null,
    visible: false,
    pulseActive: false,
    highlightActive: false,
    commentaryActive: false,
    drawStartedAt: 0,
    pulseStartedAt: 0,
    labelStartedAt: 0,
    fadeOutStartedAt: 0,
    renderKey: "",
  },
  priceFocus: {
    lines: [],
    renderKey: "",
    active: false,
    startedAt: 0,
    fadeOutStartedAt: 0,
  },
  sync: {
    active: false,
    audioStartAt: 0,
    durationMs: 0,
    preRollMs: 300,
    timeline: [],
    firedActions: new Set(),
    zoomOutStartedAt: 0,
  },
};

function hasLocalCommentaryProvider() {
  return voiceDirector.serviceReady && voiceDirector.castReady;
}

function hasPodcastCommentaryProvider() {
  return voiceDirector.podcastReady;
}

function hasAnyCommentaryProvider() {
  return hasPodcastCommentaryProvider() || hasLocalCommentaryProvider();
}

async function loadDetectorEngine() {
  const module = await import("./detectors.mjs?v=20260322g");
  detectorEngine.DETECTION_THRESHOLD = module.DETECTION_THRESHOLD;
  detectorEngine.DETECTOR_REGISTRY = module.DETECTOR_REGISTRY;
  detectorEngine.PATTERN_REFERENCE_LIBRARY = module.PATTERN_REFERENCE_LIBRARY || {};
  detectorEngine.TOP_DOWN_INTERVALS = module.TOP_DOWN_INTERVALS || TOP_DOWN_SCAN_INTERVALS;
  detectorEngine.analyzeDetectedPatterns = module.analyzeDetectedPatterns;
  detectorEngine.buildTopDownAnalysis = module.buildTopDownAnalysis || detectorEngine.buildTopDownAnalysis;
  detectorEngine.getPatternReference = module.getPatternReference || detectorEngine.getPatternReference;
}

async function loadIntermissionEngine() {
  const module = await import("./intermission-utils.mjs?v=20260323c");
  intermissionEngine.INTERMISSION_TOTAL_MS = module.INTERMISSION_TOTAL_MS || intermissionEngine.INTERMISSION_TOTAL_MS;
  intermissionEngine.INTERMISSION_CLOSE_MS = module.INTERMISSION_CLOSE_MS || intermissionEngine.INTERMISSION_CLOSE_MS;
  intermissionEngine.INTERMISSION_SUMMARY_MS = module.INTERMISSION_SUMMARY_MS || intermissionEngine.INTERMISSION_SUMMARY_MS;
  intermissionEngine.INTERMISSION_NEWS_MS = module.INTERMISSION_NEWS_MS || intermissionEngine.INTERMISSION_NEWS_MS;
  intermissionEngine.INTERMISSION_OPEN_MS = module.INTERMISSION_OPEN_MS || intermissionEngine.INTERMISSION_OPEN_MS;
  intermissionEngine.DEFAULT_INTERVAL_ORDER = module.DEFAULT_INTERVAL_ORDER || intermissionEngine.DEFAULT_INTERVAL_ORDER;
  intermissionEngine.aggregatePatternVotes = module.aggregatePatternVotes || intermissionEngine.aggregatePatternVotes;
  intermissionEngine.buildSubtitleLines = module.buildSubtitleLines || intermissionEngine.buildSubtitleLines;
  intermissionEngine.buildIntermissionSummary = module.buildIntermissionSummary || intermissionEngine.buildIntermissionSummary;
}

function currentCoin() {
  return CONFIG.coins[state.currentIndex];
}

function nextCoin(offset = 1) {
  return CONFIG.coins[(state.currentIndex + offset) % CONFIG.coins.length];
}

function currentInterval() {
  return MULTI_TIMEFRAME_INTERVALS[state.currentIntervalIndex] || MULTI_TIMEFRAME_INTERVALS[0];
}

function timeframeStepMs() {
  return (CONFIG.rotationMinutes * 60 * 1000) / MULTI_TIMEFRAME_INTERVALS.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

function easeInOutCubic(value) {
  const t = clamp(value, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function easeOutCubic(value) {
  const t = clamp(value, 0, 1);
  return 1 - (1 - t) ** 3;
}

function normalizeMarketTimestamp(timestamp) {
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return timestamp < 1e12 ? timestamp * 1000 : timestamp;
}

function currentAnimationTime() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function zonePalette(type = "focus") {
  if (type === "support") {
    return {
      accent: "#74ffad",
      accentSoft: "#4ddc8f",
      fillStart: "rgba(96, 255, 168, 0.36)",
      fillEnd: "rgba(96, 255, 168, 0.02)",
      border: "#7dffb8",
      halo: "rgba(86, 255, 171, 0.46)",
      text: "#dfffea",
    };
  }
  return {
    accent: "#ff6996",
    accentSoft: "#ff3f77",
    fillStart: "rgba(255, 103, 148, 0.34)",
    fillEnd: "rgba(255, 103, 148, 0.03)",
    border: "#ff83a5",
    halo: "rgba(255, 84, 133, 0.48)",
    text: "#ffe7ee",
  };
}

function zoneTitle(type = "focus") {
  if (type === "support") {
    return "Support Zone";
  }
  if (type === "resistance") {
    return "Resistance Zone";
  }
  return "Focus Zone";
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

function formatPrice(price) {
  if (!Number.isFinite(price)) {
    return "--";
  }
  if (price >= 1000) {
    return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  if (price >= 1) {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 0.01) {
    return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  return price.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 8 });
}

function formatChange(change) {
  if (!Number.isFinite(change)) {
    return "--";
  }
  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
}

function percentageMove(start, end) {
  if (!Number.isFinite(start) || start === 0 || !Number.isFinite(end)) {
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

function formatClock(ms) {
  const safe = Math.max(0, Math.round(ms));
  const minutes = String(Math.floor(safe / 60000)).padStart(2, "0");
  const seconds = String(Math.floor((safe % 60000) / 1000)).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function waitMs(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, duration));
  });
}

function decodeHtml(value = "") {
  if (!value || typeof document === "undefined") {
    return value || "";
  }
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function stripHtml(value = "") {
  return decodeHtml(String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function normalizeHeadlineKey(value = "") {
  return stripHtml(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatRelativeNewsTime(dateLike) {
  if (!dateLike) {
    return "Just now";
  }
  const published = new Date(dateLike).getTime();
  if (!Number.isFinite(published)) {
    return "Just now";
  }

  const diffMinutes = Math.max(0, Math.round((Date.now() - published) / 60000));
  if (diffMinutes < 1) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

async function fetchJsonWithTimeout(url, timeoutMs = 2800) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function summarizeNewsDescription(value = "") {
  const summary = stripHtml(value);
  if (!summary) {
    return "Headline is still settling in across the crypto tape.";
  }
  return summary.length > 118 ? `${summary.slice(0, 115).trimEnd()}...` : summary;
}

function normalizeNewsItem(item, source) {
  const title = stripHtml(item?.title || "");
  if (!title) {
    return null;
  }

  const description = summarizeNewsDescription(item?.description || item?.content || "");
  const publishedTime = item?.pubDate ? new Date(item.pubDate).getTime() : NaN;
  const publishedAt = Number.isFinite(publishedTime) ? new Date(publishedTime).toISOString() : null;
  const categories = Array.isArray(item?.categories) ? item.categories : [];
  return {
    id: item?.guid || item?.link || `${source}-${normalizeHeadlineKey(title)}`,
    title,
    source,
    publishedAt,
    relativeTime: formatRelativeNewsTime(item?.pubDate),
    summary: description,
    link: item?.link || "",
    image: item?.thumbnail || item?.enclosure?.link || "",
    categories,
  };
}

function isUsefulNewsItem(item) {
  if (!item?.title) {
    return false;
  }
  const titleKey = normalizeHeadlineKey(item.title);
  if (!titleKey) {
    return false;
  }
  if (titleKey.includes("here s what happened in crypto today")) {
    return false;
  }
  if ((item.categories || []).some((category) => String(category).toLowerCase() === "opinion")) {
    return false;
  }
  return true;
}

function sortAndSelectNewsItems(items) {
  const seen = new Set();
  return items
    .filter(Boolean)
    .filter(isUsefulNewsItem)
    .filter((item) => {
      const key = normalizeHeadlineKey(item.title);
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      const leftTime = left?.publishedAt ? new Date(left.publishedAt).getTime() : 0;
      const rightTime = right?.publishedAt ? new Date(right.publishedAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 3);
}

function intervalToMs(interval) {
  const intervalMap = {
    "1m": 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "30m": 30 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
  };
  return intervalMap[interval] || 60 * 1000;
}

function intervalCycleMeta() {
  const rotationMs = CONFIG.rotationMinutes * 60 * 1000;
  const elapsed = clamp(Date.now() - state.rotationStartedAt, 0, rotationMs);
  const stepMs = timeframeStepMs();
  const isLastStep = state.currentIntervalIndex >= MULTI_TIMEFRAME_INTERVALS.length - 1;
  const remainingRotation = Math.max(0, rotationMs - elapsed);
  const remainingInterval = isLastStep
    ? remainingRotation
    : Math.max(0, stepMs - (elapsed % stepMs));
  const nextLabel = isLastStep ? `${nextCoin().symbol} 1m` : MULTI_TIMEFRAME_INTERVALS[state.currentIntervalIndex + 1];
  return {
    elapsed,
    rotationMs,
    remainingRotation,
    remainingInterval,
    isLastStep,
    nextLabel,
    slotProgress: rotationMs ? elapsed / rotationMs : 0,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isIntermissionActive() {
  return Boolean(state.intermission?.active);
}

function shouldFreezeUnderlyingScene() {
  return isIntermissionActive() && state.intermission.phase !== "opening";
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
  return denominator ? (numerator / denominator) / (values[0] || 1) : 0;
}

function calculateEMA(values, period) {
  if (!values.length) {
    return [];
  }
  const smoothing = 2 / (period + 1);
  const ema = [];
  let previous = values[0];
  values.forEach((value, index) => {
    if (index === 0) {
      ema.push(value);
      return;
    }
    previous = value * smoothing + previous * (1 - smoothing);
    ema.push(previous);
  });
  return ema;
}

function calculateRSI(closes, period = 14) {
  if (closes.length < 2) {
    return closes.map(() => 50);
  }

  const rsi = new Array(closes.length).fill(50);
  if (closes.length <= period) {
    return rsi;
  }

  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const delta = closes[index] - closes[index - 1];
    gains += Math.max(delta, 0);
    losses += Math.max(-delta, 0);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  const firstRsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let index = 0; index <= period; index += 1) {
    rsi[index] = firstRsi;
  }

  for (let index = period + 1; index < closes.length; index += 1) {
    const delta = closes[index] - closes[index - 1];
    const gain = Math.max(delta, 0);
    const loss = Math.max(-delta, 0);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi[index] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return rsi.map((value) => clamp(value, 0, 100));
}

function calculateMACD(closes) {
  if (!closes.length) {
    return { line: [], signal: [], histogram: [] };
  }

  const fast = calculateEMA(closes, 12);
  const slow = calculateEMA(closes, 26);
  const line = closes.map((_, index) => fast[index] - slow[index]);
  const signal = calculateEMA(line, 9);
  const histogram = line.map((value, index) => value - signal[index]);
  return { line, signal, histogram };
}

function deriveVolatilityLabel(candles) {
  const ranges = candles.slice(-14).map((candle) => (candle.high - candle.low) / candle.close);
  const averageRange = average(ranges);
  if (averageRange > 0.01) {
    return "High";
  }
  if (averageRange > 0.006) {
    return "Elevated";
  }
  return "Balanced";
}

function normalizeTicker(payload) {
  return {
    lastPrice: Number(payload.lastPrice ?? payload.c),
    changePercent: Number(payload.priceChangePercent ?? payload.P),
    highPrice: Number(payload.highPrice ?? payload.h),
    lowPrice: Number(payload.lowPrice ?? payload.l),
    openPrice: Number(payload.openPrice ?? payload.o),
    volume: Number(payload.volume ?? payload.v),
  };
}

function normalizeKlines(klines) {
  return klines.map((entry) => ({
    openTime: Number(entry[0]),
    open: Number(entry[1]),
    high: Number(entry[2]),
    low: Number(entry[3]),
    close: Number(entry[4]),
    volume: Number(entry[5]),
    closeTime: Number(entry[6]),
  }));
}

async function fetchBinanceJson(path) {
  let lastError = null;
  for (const baseUrl of CONFIG.restBaseUrls) {
    try {
      const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Binance request failed");
}

async function loadCoinSnapshot(coin) {
  const [klines, ticker] = await Promise.all([
    fetchBinanceJson(`/api/v3/klines?symbol=${coin.marketSymbol}&interval=${CONFIG.interval}&limit=${CONFIG.chartPoints}`),
    fetchBinanceJson(`/api/v3/ticker/24hr?symbol=${coin.marketSymbol}`),
  ]);

  return {
    candles: normalizeKlines(klines),
    ticker: normalizeTicker(ticker),
  };
}

async function loadKlinesForInterval(symbol, interval, limit = CONFIG.chartPoints) {
  const klines = await fetchBinanceJson(`/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  return normalizeKlines(klines);
}

async function fetchCurrentCryptoNews() {
  const now = Date.now();
  if (state.latestNewsItems.length >= 3 && now - state.latestNewsFetchedAt < NEWS_CACHE_MS) {
    return {
      items: state.latestNewsItems,
      status: "cached",
    };
  }

  const responses = await Promise.allSettled(
    CRYPTO_NEWS_FEEDS.map(async (feed) => {
      const payload = await fetchJsonWithTimeout(feed.endpoint, 3200);
      const items = Array.isArray(payload?.items) ? payload.items : [];
      return items.map((item) => normalizeNewsItem(item, feed.source));
    })
  );

  const mergedItems = sortAndSelectNewsItems(
    responses.flatMap((result) => (result.status === "fulfilled" ? result.value : []))
  );

  if (mergedItems.length) {
    state.latestNewsItems = mergedItems;
    state.latestNewsFetchedAt = now;
    return {
      items: mergedItems,
      status: "ready",
    };
  }

  if (state.latestNewsItems.length) {
    return {
      items: state.latestNewsItems,
      status: "fallback",
    };
  }

  return {
    items: [],
    status: "empty",
  };
}

function normalizeOrderBookEntries(entries = []) {
  return entries
    .map((entry) => ({
      price: Number(entry?.[0]),
      quantity: Number(entry?.[1]),
    }))
    .filter((entry) => Number.isFinite(entry.price) && Number.isFinite(entry.quantity));
}

async function refreshOrderBook(force = false) {
  const coin = currentCoin();
  if (!coin?.marketSymbol) {
    return;
  }
  if (!force && state.orderBook.updatedAt && Date.now() - state.orderBook.updatedAt < 3500) {
    return;
  }

  try {
    const payload = await fetchBinanceJson(`/api/v3/depth?symbol=${coin.marketSymbol}&limit=6`);
    const bids = normalizeOrderBookEntries(payload?.bids || []).sort((left, right) => right.price - left.price);
    const asks = normalizeOrderBookEntries(payload?.asks || []).sort((left, right) => left.price - right.price);
    const bestBid = bids[0]?.price ?? null;
    const bestAsk = asks[0]?.price ?? null;
    const spread = Number.isFinite(bestBid) && Number.isFinite(bestAsk) ? bestAsk - bestBid : null;
    const spreadPercent = Number.isFinite(spread) && Number.isFinite(bestAsk) && bestAsk !== 0
      ? (spread / bestAsk) * 100
      : null;
    state.orderBook = {
      bids,
      asks,
      spread,
      spreadPercent,
      updatedAt: Date.now(),
      status: "Live",
    };
  } catch {
    if (state.orderBook.bids.length || state.orderBook.asks.length) {
      state.orderBook.status = "Cached";
    } else {
      state.orderBook.status = "Unavailable";
    }
  }
}

function maybeRotateNewsPanel() {
  if (state.latestNewsItems.length <= 1) {
    if (!state.newsPanelStartedAt) {
      state.newsPanelStartedAt = Date.now();
    }
    return;
  }

  if (!state.newsPanelStartedAt) {
    state.newsPanelStartedAt = Date.now();
    return;
  }

  if (Date.now() - state.newsPanelStartedAt >= 30000) {
    state.newsPanelIndex = (state.newsPanelIndex + 1) % state.latestNewsItems.length;
    state.newsPanelStartedAt = Date.now();
    renderNewsPanel();
  }
}

async function refreshNewsPanel(force = false) {
  try {
    const result = await fetchCurrentCryptoNews();
    if (result.items.length) {
      const currentItemId = state.latestNewsItems[state.newsPanelIndex]?.id;
      state.latestNewsItems = result.items;
      const nextIndex = result.items.findIndex((item) => item.id === currentItemId);
      state.newsPanelIndex = nextIndex >= 0 ? nextIndex : clamp(state.newsPanelIndex, 0, Math.max(result.items.length - 1, 0));
      if (force || !state.newsPanelStartedAt) {
        state.newsPanelStartedAt = Date.now();
      }
    }
  } catch {
    // Keep the previous news slate in place.
  }
  renderNewsPanel();
}

function renderOrderBook() {
  if (!dom.orderbookCard || !dom.orderbookStatus) {
    return;
  }

  const orderBook = state.orderBook;
  dom.orderbookStatus.textContent = orderBook.status || "Live";
  if (!orderBook.bids.length || !orderBook.asks.length) {
    dom.orderbookCard.innerHTML = `
      <div class="orderbook-empty">
        <strong>Order book is syncing</strong>
        <p>Waiting for current Binance depth on ${escapeHtml(currentCoin().pair)}.</p>
      </div>
    `;
    return;
  }

  const maxQuantity = Math.max(
    ...orderBook.bids.map((entry) => entry.quantity),
    ...orderBook.asks.map((entry) => entry.quantity),
    1
  );
  const spreadLabel = Number.isFinite(orderBook.spread)
    ? `${formatPrice(orderBook.spread)}${Number.isFinite(orderBook.spreadPercent) ? ` · ${orderBook.spreadPercent.toFixed(3)}%` : ""}`
    : "--";
  const buildRows = (entries, side) => entries
    .map((entry) => {
      const width = clamp((entry.quantity / maxQuantity) * 100, 8, 100);
      return `
        <div class="orderbook-row ${side}">
          <div class="orderbook-bar" style="width:${width.toFixed(2)}%"></div>
          <span class="orderbook-price">${formatPrice(entry.price)}</span>
          <span class="orderbook-qty">${entry.quantity.toFixed(3)}</span>
        </div>
      `;
    })
    .join("");

  dom.orderbookCard.innerHTML = `
    <div class="orderbook-section asks">
      <div class="orderbook-section-head">
        <span>Asks</span>
        <span>${orderBook.asks.length}</span>
      </div>
      <div class="orderbook-rows">${buildRows(orderBook.asks.slice(0, 4), "ask")}</div>
    </div>
    <div class="orderbook-spread">
      <span>Spread</span>
      <strong>${spreadLabel}</strong>
    </div>
    <div class="orderbook-section bids">
      <div class="orderbook-section-head">
        <span>Bids</span>
        <span>${orderBook.bids.length}</span>
      </div>
      <div class="orderbook-rows">${buildRows(orderBook.bids.slice(0, 4), "bid")}</div>
    </div>
  `;
}

function renderNewsPanel() {
  if (!dom.newsPanelCard || !dom.newsRotationMeta) {
    return;
  }

  const newsItems = state.latestNewsItems || [];
  const activeItem = newsItems[state.newsPanelIndex] || newsItems[0] || null;
  const remainingMs = state.newsPanelStartedAt ? Math.max(0, 30000 - (Date.now() - state.newsPanelStartedAt)) : 30000;
  dom.newsRotationMeta.textContent = newsItems.length > 1 ? `${formatClock(remainingMs)} left` : "Holding";

  if (!activeItem) {
    dom.newsPanelCard.innerHTML = `
      <div class="news-panel-empty">
        <strong>Latest crypto headlines are loading</strong>
        <p>The previous headline slate will stay on screen until a new feed is ready.</p>
      </div>
    `;
    return;
  }

  const activePosition = state.newsPanelIndex + 1;
  dom.newsPanelCard.innerHTML = `
    <article class="news-panel-story">
      <div class="news-panel-top">
        <span class="news-panel-rank">#${activePosition}</span>
        <span class="news-panel-source">${escapeHtml(activeItem.source || "Crypto desk")}</span>
        <span class="news-panel-age">${escapeHtml(activeItem.relativeTime || "Now")}</span>
      </div>
      <strong class="news-panel-headline">${escapeHtml(activeItem.title)}</strong>
      <p class="news-panel-summary">${escapeHtml(activeItem.summary)}</p>
      <div class="news-panel-footer">
        <span>${newsItems.length > 1 ? `Rotating ${activePosition} of ${newsItems.length}` : "Latest headline pinned"}</span>
      </div>
    </article>
  `;
}

async function refreshVoiceCatalog() {
  try {
    const response = await fetch("/api/voices", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    voiceDirector.serviceReady = true;
    voiceDirector.castReady = Boolean(payload.cast_ready);
    voiceDirector.voiceStatus = payload.voices || [];
    updateVoiceControls();
    return payload;
  } catch {
    voiceDirector.serviceReady = false;
    voiceDirector.castReady = false;
    voiceDirector.voiceStatus = [];
    updateVoiceControls();
    return null;
  }
}

async function refreshPodcastCatalog() {
  try {
    const response = await fetch("/api/podcast/config", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    voiceDirector.podcastReady = Boolean(payload.ready);
    voiceDirector.podcastConfig = payload;
    updateVoiceControls();
    return payload;
  } catch {
    voiceDirector.podcastReady = false;
    voiceDirector.podcastConfig = null;
    updateVoiceControls();
    return null;
  }
}

async function requestPodcastRender(payload) {
  const response = await fetch("/api/podcast/render", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Podcast HTTP ${response.status}`);
  }
  return await response.json();
}

function updateVoiceControls() {
  if (!dom.voiceToggle || !dom.voiceButtonLabel || !dom.voiceStatus) {
    return;
  }

  const hasPodcastConfig = Boolean(voiceDirector.podcastConfig);
  dom.voiceToggle.classList.remove("active", "warning");

  if (!voiceDirector.serviceReady && !hasPodcastConfig) {
    dom.voiceButtonLabel.textContent = "Voice Offline";
    dom.voiceStatus.textContent = "Local voice service is not responding";
    dom.voiceToggle.classList.add("warning");
    return;
  }

  if (!hasPodcastCommentaryProvider() && voiceDirector.serviceReady && !voiceDirector.castReady) {
    dom.voiceButtonLabel.textContent = "Voice Limited";
    dom.voiceStatus.textContent = "A host voice is unavailable right now";
    dom.voiceToggle.classList.add("warning");
    return;
  }

  if (!voiceDirector.audioUnlocked) {
    dom.voiceButtonLabel.textContent = voiceDirector.podcastReady ? "Enable Podcast Voice" : "Enable Voice";
    dom.voiceStatus.textContent = voiceDirector.audioPlaybackFailures
      ? "Browser blocked autoplay. Click to enable audio."
      : voiceDirector.podcastReady
        ? "Click once to allow local podcast audio"
        : "Click once to allow local commentary audio";
    return;
  }

  if (voiceDirector.isProcessing) {
    dom.voiceButtonLabel.textContent = "Speaking...";
    dom.voiceStatus.textContent = voiceDirector.podcastReady
      ? "Local podcast commentary is playing now"
      : "Local commentary is playing now";
    dom.voiceToggle.classList.add("active");
    return;
  }

  dom.voiceButtonLabel.textContent = voiceDirector.podcastReady ? "Test Podcast Voice" : "Test Voice";
  dom.voiceStatus.textContent = voiceDirector.podcastReady
    ? "Audio is enabled. Click to replay a local podcast test."
    : "Audio is enabled. Click to replay a voice test.";
  dom.voiceToggle.classList.add("active");
}

async function unlockVoicePlayback(triggerTest = false) {
  voiceDirector.audioUnlocked = true;
  voiceDirector.audioPlaybackAllowed = true;
  updateVoiceControls();

  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioContextCtor) {
      const context = new AudioContextCtor();
      if (context.state === "suspended") {
        await context.resume();
      }
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      gain.gain.value = 0.00001;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.02);
      setTimeout(() => {
        context.close().catch(() => {});
      }, 80);
    }
  } catch {
    // A user gesture is still enough for most browsers even if the warmup tone fails.
  }

  if (triggerTest) {
    setTimeout(() => {
      window.cryptoStreamOverlay?.testVoice?.();
    }, 120);
  }
}

async function initVoiceDirector() {
  if (voiceDirector.initialized) {
    return;
  }

  voiceDirector.initialized = true;
  voiceDirector.audio = dom.voiceAudioPlayer || new Audio();
  voiceDirector.audio.preload = "auto";
  voiceDirector.audio.crossOrigin = "anonymous";
  voiceDirector.audio.volume = 1;
  voiceDirector.audio.muted = false;
  voiceDirector.audio.playsInline = true;
  if (!dom.voiceAudioPlayer && voiceDirector.audio instanceof HTMLAudioElement) {
    voiceDirector.audio.className = "voice-audio-player";
    document.body.appendChild(voiceDirector.audio);
  }
  if (dom.voiceToggle) {
    dom.voiceToggle.addEventListener("click", (event) => {
      event.preventDefault();
      if (!voiceDirector.audioUnlocked) {
        unlockVoicePlayback(true).catch(() => {});
        return;
      }
      window.cryptoStreamOverlay?.testVoice?.();
    });
  }
  const unlockFromGesture = () => {
    if (!voiceDirector.audioUnlocked) {
      unlockVoicePlayback(false).catch(() => {});
    }
  };
  window.addEventListener("pointerdown", unlockFromGesture, { once: true, capture: true });
  window.addEventListener("keydown", unlockFromGesture, { once: true, capture: true });
  await refreshVoiceCatalog();
  await refreshPodcastCatalog();
  updateVoiceControls();
}

function clearIntermissionNewsHighlight() {
  if (!dom.intermissionOverlay) {
    return;
  }
  dom.intermissionOverlay
    .querySelectorAll(".intermission-news-card.speaking")
    .forEach((card) => card.classList.remove("speaking"));
}

function setIntermissionNewsHighlight(newsIndex) {
  if (!dom.intermissionOverlay) {
    return;
  }
  clearIntermissionNewsHighlight();
  const target = dom.intermissionOverlay.querySelector(`.intermission-news-card[data-news-index="${newsIndex}"]`);
  if (target) {
    target.classList.add("speaking");
  }
}

function clearVoiceSubtitle() {
  if (!dom.voiceSubtitleLayer) {
    return;
  }
  dom.voiceSubtitleLayer.className = "voice-subtitle-layer";
  dom.voiceSubtitleLayer.innerHTML = "";
  dom.voiceSubtitleLayer.style.removeProperty("--voice-color");
  if (state.intermission) {
    state.intermission.subtitleClip = null;
    renderIntermissionLiveSubtitle();
  }
  updateVoiceControls();
}

function formatSpeakerDisplayName(label) {
  const cleaned = String(label || "Host").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || "Host";
}

function buildSubtitleWordMarkup(text, durationMs = 2400) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return "";
  }
  const revealDelay = clamp((durationMs || 2400) / Math.max(words.length, 1), 60, 240);
  return words
    .map((word, index) => `
      <span
        class="voice-subtitle-word"
        style="animation-delay:${Math.round(index * revealDelay)}ms;"
      >${escapeHtml(word)}</span>
    `)
    .join(" ");
}

function showVoiceSubtitle(clip, options = {}) {
  if (!dom.voiceSubtitleLayer) {
    return;
  }
  const modeClass = options.displayMode === "intermission" ? "intermission-mode" : "live-mode";
  dom.voiceSubtitleLayer.className = `voice-subtitle-layer active ${modeClass}`;
  dom.voiceSubtitleLayer.style.setProperty("--voice-color", clip.subtitle_color || "#ffd58b");
  dom.voiceSubtitleLayer.innerHTML = `
    <div class="voice-subtitle-card">
      <div class="voice-subtitle-head">
        <span class="voice-subtitle-speaker">${escapeHtml(formatSpeakerDisplayName(clip.speaker_label || clip.speaker_id || "Host"))}</span>
      </div>
      <p class="voice-subtitle-text">${buildSubtitleWordMarkup(clip.text || "", clip.duration_ms || 2400)}</p>
    </div>
  `;
  if (options.displayMode === "intermission" && state.intermission?.active) {
    state.intermission.subtitleClip = {
      speaker: formatSpeakerDisplayName(clip.speaker_label || clip.speaker_id || "Host"),
      text: clip.text || "",
      durationMs: clip.duration_ms || 2400,
      color: clip.subtitle_color || "#ffd58b",
    };
    renderIntermissionLiveSubtitle();
  }
}

function renderIntermissionLiveSubtitle() {
  if (!dom.intermissionOverlay) {
    return;
  }
  const target = dom.intermissionOverlay.querySelector("[data-intermission-live-subtitle]");
  if (!target) {
    return;
  }

  const clip = state.intermission?.subtitleClip;
  if (!clip?.text) {
    target.className = "intermission-live-subtitle";
    target.innerHTML = "";
    target.style.removeProperty("--voice-color");
    return;
  }

  target.className = "intermission-live-subtitle active";
  target.style.setProperty("--voice-color", clip.color || "#ffd58b");
  target.innerHTML = `
    <div class="intermission-live-subtitle-card">
      <span class="intermission-live-subtitle-speaker">${escapeHtml(clip.speaker)}</span>
      <p class="intermission-live-subtitle-text">${buildSubtitleWordMarkup(clip.text || "", clip.durationMs || 2400)}</p>
    </div>
  `;
}

function cleanupRecentLiveEvents() {
  const cutoff = Date.now() - LIVE_COMMENTARY_DEDUPE_MS;
  [...voiceDirector.recentLiveEvents.entries()].forEach(([key, timestamp]) => {
    if (timestamp < cutoff) {
      voiceDirector.recentLiveEvents.delete(key);
    }
  });
}

function resetLiveCommentaryObservation() {
  voiceDirector.lastObservedSnapshot = null;
  voiceDirector.warmupQueued = false;
  voiceDirector.lastAmbientQueuedAt = 0;
  voiceDirector.lastAmbientType = "pattern";
  updateVoiceControls();
}

function interruptVoicePlayback() {
  voiceDirector.currentPlaybackToken += 1;
  voiceDirector.queue = [];
  voiceDirector.isProcessing = false;
  voiceDirector.activeLiveEvent = null;
  if (voiceDirector.audio) {
    voiceDirector.audio.pause();
    voiceDirector.audio.removeAttribute("src");
    voiceDirector.audio.load();
  }
  clearChartCommentaryFocus(true);
  clearIntermissionNewsHighlight();
  clearVoiceSubtitle();
  updateVoiceControls();
}

function beginIntermissionVoice(token) {
  voiceDirector.activeIntermissionToken = token;
  interruptVoicePlayback();
}

function endIntermissionVoice(token) {
  if (token && voiceDirector.activeIntermissionToken !== token) {
    return;
  }
  voiceDirector.activeIntermissionToken = 0;
  clearIntermissionNewsHighlight();
  clearVoiceSubtitle();
}

async function requestCommentarySequence(payload) {
  const response = await fetch("/api/commentary/render", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Commentary HTTP ${response.status}`);
  }
  return await response.json();
}

function podcastFetchInterval(intervalLabel) {
  return intervalLabel === "1D" ? "1d" : intervalLabel;
}

function deriveSupportResistance(candles = []) {
  const raw = deriveSupportResistanceBounds(candles);
  return {
    support: Number.isFinite(raw.support) ? formatPrice(raw.support) : "",
    resistance: Number.isFinite(raw.resistance) ? formatPrice(raw.resistance) : "",
  };
}

function deriveSupportResistanceBounds(candles = []) {
  if (!candles.length) {
    return {
      support: null,
      resistance: null,
    };
  }
  const window = candles.slice(-Math.min(candles.length, 24));
  const support = Math.min(...window.map((candle) => candle.low));
  const resistance = Math.max(...window.map((candle) => candle.high));
  return {
    support: Number.isFinite(support) ? support : null,
    resistance: Number.isFinite(resistance) ? resistance : null,
  };
}

function findNearestCandleIndex(candles, timestamp, edge = "start") {
  if (!candles.length) {
    return 0;
  }
  const target = normalizeMarketTimestamp(timestamp);
  if (!target) {
    return edge === "end" ? candles.length - 1 : 0;
  }

  let bestIndex = 0;
  let bestDistance = Infinity;
  candles.forEach((candle, index) => {
    const sourceTime = edge === "end" ? candle.closeTime || candle.openTime : candle.openTime;
    const distance = Math.abs(sourceTime - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function derivePatternZoneInput(patternAnalysis = state.currentIntervalPattern, candles = state.candles) {
  if (!patternAnalysis?.span || !candles.length) {
    return null;
  }

  const startIndex = clamp(patternAnalysis.span.startIndex ?? 0, 0, Math.max(candles.length - 1, 0));
  const endIndex = clamp(patternAnalysis.span.endIndex ?? startIndex, startIndex, Math.max(candles.length - 1, 0));
  const spanCandles = candles.slice(startIndex, endIndex + 1);
  if (!spanCandles.length) {
    return null;
  }

  const spanLow = Math.min(...spanCandles.map((candle) => candle.low));
  const spanHigh = Math.max(...spanCandles.map((candle) => candle.high));
  const spanRange = Math.max(spanHigh - spanLow, (spanCandles[0]?.close || 1) * 0.0025);
  const direction = patternAnalysis.direction || "Neutral";
  const type = direction === "Bearish" ? "resistance" : direction === "Bullish" ? "support" : "focus";

  let low = spanLow;
  let high = spanHigh;
  if (type === "support") {
    low = spanLow;
    high = spanLow + spanRange * 0.34;
  } else if (type === "resistance") {
    low = spanHigh - spanRange * 0.34;
    high = spanHigh;
  } else {
    low = spanLow + spanRange * 0.24;
    high = spanHigh - spanRange * 0.24;
  }

  return {
    startTime: spanCandles[0].openTime,
    endTime: last(spanCandles).closeTime || last(spanCandles).openTime,
    low,
    high,
    type,
    focusLow: spanLow,
    focusHigh: spanHigh,
    focusStartTime: spanCandles[0].openTime,
    focusEndTime: last(spanCandles).closeTime || last(spanCandles).openTime,
    label: `${patternAnalysis.pattern?.name || patternAnalysis.title || "Pattern"} Zone`,
  };
}

function deriveObservationZoneInput(candles = state.candles, patternAnalysis = state.currentIntervalPattern) {
  if (!candles.length) {
    return null;
  }

  const lookback = candles.slice(-Math.min(candles.length, 20));
  const bounds = deriveSupportResistanceBounds(lookback);
  if (!Number.isFinite(bounds.support) || !Number.isFinite(bounds.resistance)) {
    return null;
  }

  const currentPrice = last(candles)?.close ?? bounds.resistance;
  const fullRange = Math.max(bounds.resistance - bounds.support, currentPrice * 0.0035);
  const bandSize = Math.max(fullRange * 0.12, currentPrice * 0.002);
  const shouldUseResistance = patternAnalysis?.direction === "Bearish"
    || currentPrice >= bounds.support + fullRange * 0.62;
  const anchor = shouldUseResistance ? bounds.resistance : bounds.support;
  return {
    startTime: lookback[0].openTime,
    endTime: last(lookback).closeTime || last(lookback).openTime,
    low: anchor - bandSize / 2,
    high: anchor + bandSize / 2,
    type: shouldUseResistance ? "resistance" : "support",
    focusLow: bounds.support,
    focusHigh: bounds.resistance,
    focusStartTime: lookback[0].openTime,
    focusEndTime: last(lookback).closeTime || last(lookback).openTime,
    label: shouldUseResistance ? "Resistance Zone" : "Support Zone",
  };
}

function deriveCommentaryZoneInput(event = voiceDirector.activeLiveEvent) {
  if (event?.zone) {
    return event.zone;
  }
  if (event?.type === "indicator_observation") {
    return deriveObservationZoneInput(state.candles, state.currentIntervalPattern);
  }
  return derivePatternZoneInput(state.currentIntervalPattern, state.candles)
    || deriveObservationZoneInput(state.candles, state.currentIntervalPattern);
}

function defaultCameraTarget() {
  return {
    scale: 1,
    tx: 0,
    ty: 0,
  };
}

function resolveZoneInputToChartZone(zoneInput, layout = chartCinematic.layout) {
  if (!zoneInput || !layout?.candles?.length) {
    return null;
  }

  const candles = layout.candles;
  const startIndex = findNearestCandleIndex(candles, zoneInput.startTime, "start");
  const endIndex = clamp(
    findNearestCandleIndex(candles, zoneInput.endTime ?? zoneInput.startTime, "end"),
    startIndex,
    Math.max(candles.length - 1, startIndex)
  );
  const focusStartIndex = clamp(
    findNearestCandleIndex(candles, zoneInput.focusStartTime ?? zoneInput.startTime, "start"),
    0,
    Math.max(candles.length - 1, 0)
  );
  const focusEndIndex = clamp(
    findNearestCandleIndex(candles, zoneInput.focusEndTime ?? zoneInput.endTime ?? zoneInput.startTime, "end"),
    focusStartIndex,
    Math.max(candles.length - 1, focusStartIndex)
  );
  const low = clamp(Number(zoneInput.low), layout.minPrice, layout.maxPrice);
  const high = clamp(Number(zoneInput.high), layout.minPrice, layout.maxPrice);
  const safeLow = Math.min(low, high);
  const safeHigh = Math.max(low, high);
  const focusLow = clamp(Number(zoneInput.focusLow ?? safeLow), layout.minPrice, layout.maxPrice);
  const focusHigh = clamp(Number(zoneInput.focusHigh ?? safeHigh), layout.minPrice, layout.maxPrice);
  const safeFocusLow = Math.min(focusLow, focusHigh);
  const safeFocusHigh = Math.max(focusLow, focusHigh);
  const x = layout.chartLeft + startIndex * layout.candleSlot;
  const width = Math.max((endIndex - startIndex + 1) * layout.candleSlot, layout.candleSlot * 1.8);
  const y = layout.mapY(safeHigh);
  const height = Math.max(layout.mapY(safeLow) - y, 18);
  const candleIndices = Array.from({ length: endIndex - startIndex + 1 }, (_, offset) => startIndex + offset);
  const type = zoneInput.type === "support" || zoneInput.type === "resistance" ? zoneInput.type : "focus";
  const label = zoneInput.label || zoneTitle(type);
  const rangeLabel = `${formatPrice(safeLow)} - ${formatPrice(safeHigh)}`;

  return {
    type,
    label,
    rangeLabel,
    startIndex,
    endIndex,
    focusStartIndex,
    focusEndIndex,
    low: safeLow,
    high: safeHigh,
    focusLow: safeFocusLow,
    focusHigh: safeFocusHigh,
    x,
    y,
    width,
    height,
    candleIndices,
    palette: zonePalette(type),
    key: [
      type,
      startIndex,
      endIndex,
      safeLow.toFixed(4),
      safeHigh.toFixed(4),
      focusStartIndex,
      focusEndIndex,
    ].join(":"),
  };
}

function buildCameraTargetForZone(zone, layout = chartCinematic.layout) {
  if (!zone || !layout) {
    return defaultCameraTarget();
  }

  const focusStartX = layout.chartLeft + zone.focusStartIndex * layout.candleSlot;
  const focusEndX = layout.chartLeft + (zone.focusEndIndex + 1) * layout.candleSlot;
  const focusTopY = layout.mapY(zone.focusHigh);
  const focusBottomY = layout.mapY(zone.focusLow);
  const focusWidth = Math.max(focusEndX - focusStartX, layout.candleSlot * 3);
  const focusHeight = Math.max(focusBottomY - focusTopY, 42);
  const paddedWidth = focusWidth * 1.15 + 22;
  const paddedHeight = focusHeight * 1.15 + 22;
  const viewportWidth = layout.chartWidth;
  const viewportHeight = layout.priceTop - 24;
  const targetScale = clamp(
    Math.min(viewportWidth / paddedWidth, viewportHeight / paddedHeight),
    1,
    2.65
  );
  const focusCenterX = focusStartX + focusWidth / 2;
  const focusCenterY = focusTopY + focusHeight / 2;
  const viewportCenterX = layout.chartLeft + viewportWidth / 2;
  const viewportCenterY = 24 + viewportHeight / 2;

  return {
    scale: targetScale,
    tx: viewportCenterX - focusCenterX * targetScale,
    ty: viewportCenterY - focusCenterY * targetScale,
  };
}

function startCameraAnimation(target, duration = 960, easing = easeInOutCubic) {
  const now = currentAnimationTime();
  chartCinematic.camera.fromScale = chartCinematic.camera.currentScale;
  chartCinematic.camera.fromTx = chartCinematic.camera.currentTx;
  chartCinematic.camera.fromTy = chartCinematic.camera.currentTy;
  chartCinematic.camera.targetScale = target.scale;
  chartCinematic.camera.targetTx = target.tx;
  chartCinematic.camera.targetTy = target.ty;
  chartCinematic.camera.startedAt = now;
  chartCinematic.camera.duration = clamp(duration, 180, 1400);
  chartCinematic.camera.easing = easing;
  chartCinematic.camera.active = true;
}

function buildCommentarySyncTimeline(durationMs, providedTimeline = []) {
  if (Array.isArray(providedTimeline) && providedTimeline.length) {
    return providedTimeline.slice().sort((left, right) => left.time - right.time);
  }

  const totalSeconds = Math.max((durationMs || 5600) / 1000, 4.8);
  const zoomOutAt = Math.max(totalSeconds - 0.95, 1.8);
  return [
    { time: 0.3, action: "draw_zone" },
    { time: 0.8, action: "start_pulse" },
    { time: 1.05, action: "highlight_candles" },
    { time: zoomOutAt, action: "zoom_out" },
  ];
}

function clearChartCommentaryFocus(resetCamera = false) {
  const previousRenderKey = chartCinematic.zone.renderKey;
  chartCinematic.sync.active = false;
  chartCinematic.sync.audioStartAt = 0;
  chartCinematic.sync.durationMs = 0;
  chartCinematic.sync.timeline = [];
  chartCinematic.sync.firedActions = new Set();
  chartCinematic.sync.zoomOutStartedAt = 0;
  chartCinematic.zone.visible = false;
  chartCinematic.zone.pulseActive = false;
  chartCinematic.zone.highlightActive = false;
  chartCinematic.zone.commentaryActive = false;
  chartCinematic.zone.drawStartedAt = 0;
  chartCinematic.zone.pulseStartedAt = 0;
  chartCinematic.zone.labelStartedAt = 0;
  chartCinematic.zone.fadeOutStartedAt = 0;
  chartCinematic.zone.input = null;
  chartCinematic.zone.resolved = null;
  chartCinematic.zone.renderKey = previousRenderKey;
  rebuildChartZoneOverlay(true);
  chartCinematic.zone.renderKey = "";
  chartCinematic.priceFocus.lines = [];
  chartCinematic.priceFocus.renderKey = "";
  chartCinematic.priceFocus.active = false;
  chartCinematic.priceFocus.startedAt = 0;
  chartCinematic.priceFocus.fadeOutStartedAt = 0;
  if (chartCinematic.dom.priceCalloutLayer) {
    chartCinematic.dom.priceCalloutLayer.innerHTML = "";
  }
  if (resetCamera) {
    startCameraAnimation(defaultCameraTarget(), 900, easeOutCubic);
  }
}

function beginCommentaryChartSync({ zone, timeline, durationMs } = {}) {
  const zoneInput = zone || deriveCommentaryZoneInput();
  const resolvedZone = resolveZoneInputToChartZone(zoneInput);
  if (!resolvedZone) {
    clearChartCommentaryFocus(true);
    return { preRollMs: 0 };
  }

  const preRollMs = 300;
  const now = currentAnimationTime();
  chartCinematic.zone.input = zoneInput;
  chartCinematic.zone.resolved = resolvedZone;
  chartCinematic.zone.visible = false;
  chartCinematic.zone.pulseActive = false;
  chartCinematic.zone.highlightActive = false;
  chartCinematic.zone.commentaryActive = true;
  chartCinematic.zone.drawStartedAt = 0;
  chartCinematic.zone.pulseStartedAt = 0;
  chartCinematic.zone.labelStartedAt = 0;
  chartCinematic.zone.fadeOutStartedAt = 0;
  chartCinematic.zone.renderKey = "";
  chartCinematic.sync.active = true;
  chartCinematic.sync.audioStartAt = now + preRollMs;
  chartCinematic.sync.durationMs = durationMs || 5600;
  chartCinematic.sync.timeline = buildCommentarySyncTimeline(durationMs, timeline);
  chartCinematic.sync.firedActions = new Set(["zoom_in"]);
  chartCinematic.sync.zoomOutStartedAt = 0;
  startCameraAnimation(buildCameraTargetForZone(resolvedZone), clamp(durationMs ? durationMs * 0.16 : 960, 800, 1200), easeInOutCubic);
  ensureChartCinematicLoop();
  syncChartPresentation(true, now);
  return { preRollMs };
}

function analysisToPodcastEntry(interval, analysis, candles = []) {
  const derived = deriveSupportResistance(candles);
  const patternName = analysis?.pattern?.name || analysis?.title || "No clean pattern yet";
  const direction = analysis?.direction || "Neutral";
  const confidence = Number(analysis?.confidence || 0);
  const breakoutProbability = clamp(confidence / 100, 0.08, 0.92);
  return {
    interval,
    pattern_name: patternName,
    direction,
    confidence,
    support: derived.support,
    resistance: derived.resistance,
    breakout_probability: breakoutProbability,
    reasoning: analysis?.rationale || analysis?.body || analysis?.tagline || "The structure is still developing.",
    status: analysis?.patternId ? "active" : "watching",
  };
}

async function collectPodcastAnalyses(coin, cachedIntervalAnalyses = {}) {
  const entries = await Promise.all(
    PODCAST_TIMEFRAME_INTERVALS.map(async (interval) => {
      const fetchInterval = podcastFetchInterval(interval);
      try {
        const candles = await loadKlinesForInterval(coin.marketSymbol, fetchInterval);
        return {
          interval,
          candles,
          analysis: detectorEngine.analyzeDetectedPatterns(candles, interval),
          source: "live",
        };
      } catch {
        const fallback = cachedIntervalAnalyses[interval] || null;
        return {
          interval,
          candles: [],
          analysis: fallback,
          source: fallback ? "fallback" : "missing",
        };
      }
    })
  );

  return {
    entries,
    intervalAnalyses: Object.fromEntries(entries.map((entry) => [entry.interval, entry.analysis])),
  };
}

function buildPodcastPayload(mode, extras = {}) {
  const coin = extras.coin || state.intermission.coin || currentCoin();
  if (mode === "live_brief") {
    const liveSupportResistance = deriveSupportResistance(state.candles || []);
    const chartPattern = state.currentIntervalPattern;
    const leadPattern = state.topDownAnalysis?.leadAnalysis;
    const snapshot = state.marketSnapshots[coin.marketSymbol] || state.liveTicker || null;
    return {
      mode: "live_brief",
      coin: {
        symbol: coin.symbol,
        pair: coin.pair,
        spoken_name: coin.spokenName || coin.name || coin.symbol,
        marketSymbol: coin.marketSymbol,
      },
      displayed_interval: extras.displayedInterval || currentInterval(),
      lead_interval: extras.leadInterval || state.topDownAnalysis?.leadInterval || currentInterval(),
      event: extras.event || {},
      live_context: {
        pattern_name: chartPattern?.pattern?.name || extras.event?.pattern_name || "",
        direction: chartPattern?.direction || "Neutral",
        confidence: Number(chartPattern?.confidence || extras.event?.confidence || 0),
        support: liveSupportResistance.support,
        resistance: liveSupportResistance.resistance,
        rationale: chartPattern?.rationale || chartPattern?.body || chartPattern?.tagline || "",
        lead_pattern_name: leadPattern?.pattern?.name || state.topDownAnalysis?.leadPattern?.name || extras.event?.lead_pattern_name || "",
        lead_direction: leadPattern?.direction || state.topDownAnalysis?.leadPattern?.direction || "Neutral",
        lead_confidence: Number(leadPattern?.confidence || 0),
        current_price: snapshot?.lastPrice ?? last(state.candles)?.close ?? 0,
        change_percent: snapshot?.changePercent ?? 0,
        rsi: last(state.rsiSeries) ?? 50,
        macd: last(state.macdLine) ?? 0,
      },
    };
  }

  const entries = extras.entries || [];
  return {
    mode: "intermission_full",
    coin: {
      symbol: coin.symbol,
      pair: coin.pair,
      spoken_name: coin.spokenName || coin.name || coin.symbol,
      marketSymbol: coin.marketSymbol,
    },
    timeframes: Object.fromEntries(
      entries.map((entry) => [entry.interval, analysisToPodcastEntry(entry.interval, entry.analysis, entry.candles)])
    ),
    news_items: extras.newsItems || state.intermission.newsItems || [],
  };
}

async function playAudioClip(clip, playbackToken) {
  if (!voiceDirector.audioPlaybackAllowed || !voiceDirector.audio || !clip.audio_url) {
    return false;
  }

  return await new Promise((resolve) => {
    const audio = voiceDirector.audio;
    let settled = false;
    const finish = (played) => {
      if (settled) {
        return;
      }
      settled = true;
      audio.onended = null;
      audio.onerror = null;
      resolve(played);
    };

    audio.onended = () => {
      voiceDirector.audioPlaybackAllowed = true;
      voiceDirector.audioPlaybackFailures = 0;
      voiceDirector.audioUnlocked = true;
      updateVoiceControls();
      finish(true);
    };
    audio.onerror = () => finish(false);
    audio.src = `${clip.audio_url}${clip.audio_url.includes("?") ? "&" : "?"}v=${Date.now()}`;
    audio.currentTime = 0;

    const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch(() => {
        voiceDirector.audioPlaybackFailures += 1;
        updateVoiceControls();
        finish(false);
      });
    }

    setTimeout(() => {
      if (playbackToken !== voiceDirector.currentPlaybackToken) {
        audio.pause();
        finish(false);
      }
    }, 0);
  });
}

async function playCommentarySequence(sequence, options = {}) {
  if (!sequence?.length) {
    return 0;
  }

  const playbackToken = ++voiceDirector.currentPlaybackToken;
  voiceDirector.isProcessing = true;
  updateVoiceControls();
  const stageStart = Date.now();
  let playedAny = false;

  try {
    for (const clip of sequence) {
      if (playbackToken !== voiceDirector.currentPlaybackToken) {
        break;
      }

      if (options.displayMode === "live" && !isIntermissionActive()) {
        const sync = beginCommentaryChartSync({
          zone: options.zone,
          timeline: options.timeline,
          durationMs: clip.duration_ms || 5200,
        });
        setCommentaryPriceLinesFromClip(clip);
        if (sync.preRollMs) {
          await waitMs(sync.preRollMs);
        }
      }

      if (typeof options.onClipStart === "function") {
        options.onClipStart(clip);
      }

      const elapsedBeforeClip = Date.now() - stageStart;
      const projectedElapsed = elapsedBeforeClip + (clip.duration_ms || 1800) + (clip.pause_ms || 0);
      if (options.maxDurationMs && playedAny && projectedElapsed > options.maxDurationMs) {
        break;
      }

      showVoiceSubtitle(clip, {
        displayMode: options.displayMode || "live",
        modeLabel: options.modeLabel,
      });

      if (clip.meta?.news_index !== undefined) {
        setIntermissionNewsHighlight(clip.meta.news_index);
      } else {
        clearIntermissionNewsHighlight();
      }

      const played = await playAudioClip(clip, playbackToken);
      if (!played) {
        await waitMs(clip.duration_ms || 1800);
      }

      if (playbackToken !== voiceDirector.currentPlaybackToken) {
        break;
      }

      playedAny = true;
      if (clip.pause_ms) {
        await waitMs(clip.pause_ms);
      }
    }
  } finally {
    if (playbackToken === voiceDirector.currentPlaybackToken) {
      clearIntermissionNewsHighlight();
      clearVoiceSubtitle();
      voiceDirector.isProcessing = false;
      if (options.displayMode === "live") {
        clearChartCommentaryFocus(true);
      }
      updateVoiceControls();
    }
  }

  return Date.now() - stageStart;
}

function buildCommentaryPayload(mode, extras = {}) {
  const summary = extras.summary || state.intermission.summary || {};
  return {
    mode,
    coin: {
      symbol: currentCoin().symbol,
      pair: currentCoin().pair,
      spoken_name: currentCoin().spokenName || currentCoin().name || currentCoin().symbol,
      marketSymbol: currentCoin().marketSymbol,
    },
    displayed_interval: currentInterval(),
    lead_interval: state.topDownAnalysis?.leadInterval || currentInterval(),
    summary: {
      bias_phrase: summary.bias_phrase || summary.biasPhrase || "mixed / neutral",
      top_patterns: summary.top_patterns || summary.topPatterns || [],
      direction_scores: summary.direction_scores || summary.directionScores || { Bullish: 0, Bearish: 0, Neutral: 0 },
    },
    news_items: extras.newsItems || state.intermission.newsItems || [],
    event: extras.event || {},
    voice_pack_ids: DEFAULT_VOICE_PACK_IDS,
  };
}

async function runIntermissionVoiceStage(token, mode, timing, extras = {}) {
  if (!state.intermission.active || state.intermission.token !== token) {
    return;
  }

  const startedAt = Date.now();
  let response = null;
  if (voiceDirector.serviceReady) {
    try {
      response = await requestCommentarySequence(buildCommentaryPayload(mode, extras));
    } catch {
      response = null;
    }
  }

  if (!state.intermission.active || state.intermission.token !== token) {
    return;
  }

  if (response?.sequence?.length) {
    await playCommentarySequence(response.sequence, {
      displayMode: "intermission",
      modeLabel: mode === "intermission_news" ? "Crypto headlines" : "Roundtable",
      maxDurationMs: timing.maxDurationMs,
    });
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed < timing.minDurationMs) {
    await waitMs(timing.minDurationMs - elapsed);
  }
}

async function runIntermissionSequence(token) {
  if (hasPodcastCommentaryProvider()) {
    const playedPodcast = await runIntermissionPodcastSequence(token);
    if (!state.intermission.active || state.intermission.token !== token) {
      return;
    }
    if (playedPodcast) {
      state.intermission.phase = "opening";
      activateNextCoinForOpening(token);
      renderIntermissionOverlay();
      scheduleIntermissionTimeout(INTERMISSION_DOOR_OPEN_MS, () => {
        finishIntermission(token);
      });
      return;
    }
  }

  await runIntermissionVoiceStage(token, "intermission_summary", {
    minDurationMs: INTERMISSION_SUMMARY_MIN_MS,
    maxDurationMs: INTERMISSION_SUMMARY_MAX_MS,
  });
  if (!state.intermission.active || state.intermission.token !== token) {
    return;
  }

  state.intermission.phase = "news";
  renderIntermissionOverlay();

  await runIntermissionVoiceStage(
    token,
    "intermission_news",
    {
      minDurationMs: INTERMISSION_NEWS_MIN_MS,
      maxDurationMs: INTERMISSION_NEWS_MAX_MS,
    },
    { newsItems: state.intermission.newsItems || [] }
  );

  if (!state.intermission.active || state.intermission.token !== token) {
    return;
  }

  state.intermission.phase = "opening";
  activateNextCoinForOpening(token);
  renderIntermissionOverlay();
  scheduleIntermissionTimeout(INTERMISSION_DOOR_OPEN_MS, () => {
    finishIntermission(token);
  });
}

function buildLiveCommentaryEvent(snapshot, previous) {
  if (!previous) {
    return null;
  }

  if (snapshot.interval !== previous.interval) {
    return {
      type: "timeframe_switch",
      key: `${currentCoin().marketSymbol}:timeframe:${snapshot.interval}`,
      pattern_name: snapshot.chartPatternName || snapshot.leadPatternName || "the live structure",
    };
  }

  if (snapshot.chartPatternId && snapshot.chartPatternId !== previous.chartPatternId) {
    return {
      type: "chart_pattern_change",
      key: `${currentCoin().marketSymbol}:chart:${snapshot.interval}:${snapshot.chartPatternId}`,
      pattern_name: snapshot.chartPatternName,
      confidence: snapshot.chartConfidence,
    };
  }

  if (snapshot.leadPatternId && snapshot.leadPatternId !== previous.leadPatternId) {
    return {
      type: "lead_pattern_change",
      key: `${currentCoin().marketSymbol}:lead:${snapshot.leadInterval}:${snapshot.leadPatternId}`,
      lead_pattern_name: snapshot.leadPatternName,
      lead_interval: snapshot.leadInterval,
    };
  }

  if (snapshot.confirmedCount !== previous.confirmedCount && snapshot.confirmedCount > 0) {
    return {
      type: "exact_mtf_change",
      key: `${currentCoin().marketSymbol}:mtf:${snapshot.confirmedCount}:${snapshot.leadPatternId || "none"}`,
      confirmed_count: snapshot.confirmedCount,
    };
  }

  return null;
}

async function processLiveCommentaryQueue() {
  if (voiceDirector.isProcessing || isIntermissionActive()) {
    return;
  }

  const event = voiceDirector.queue.shift();
  if (!event) {
    return;
  }

  if (!hasAnyCommentaryProvider()) {
    updateVoiceControls();
    return;
  }

  voiceDirector.isProcessing = true;
  voiceDirector.activeLiveEvent = event;
  try {
    const response = hasPodcastCommentaryProvider()
      ? await requestPodcastRender(
          buildPodcastPayload("live_brief", {
            coin: currentCoin(),
            event,
            displayedInterval: currentInterval(),
            leadInterval: state.topDownAnalysis?.leadInterval || currentInterval(),
          })
        )
      : await requestCommentarySequence(buildCommentaryPayload("live_event", { event }));
    if (!response?.sequence?.length || isIntermissionActive()) {
      return;
    }

    await playCommentarySequence(response.sequence, {
      displayMode: "live",
      modeLabel: "Live commentary",
    });
    voiceDirector.audioPlaybackAllowed = true;
    voiceDirector.audioPlaybackFailures = 0;
  } catch {
    // Subtitle-only fallback already exists in the visual layer.
  } finally {
    voiceDirector.activeLiveEvent = null;
    voiceDirector.isProcessing = false;
    updateVoiceControls();
    if (voiceDirector.queue.length && !isIntermissionActive()) {
      processLiveCommentaryQueue().catch(() => {});
    }
  }
}

function enqueueLiveCommentaryEvent(event, options = {}) {
  if (!event || isIntermissionActive() || !hasAnyCommentaryProvider()) {
    return false;
  }

  cleanupRecentLiveEvents();
  const now = Date.now();
  const lastSeen = voiceDirector.recentLiveEvents.get(event.key);
  if (!options.bypassDedupe && lastSeen && now - lastSeen < LIVE_COMMENTARY_DEDUPE_MS) {
    return false;
  }
  if (!options.bypassTiming && now - voiceDirector.lastLiveSpokenAt < LIVE_COMMENTARY_MIN_INTERVAL_MS) {
    return false;
  }
  if (voiceDirector.queue.length >= LIVE_COMMENTARY_QUEUE_MAX) {
    return false;
  }

  voiceDirector.lastLiveSpokenAt = now;
  voiceDirector.recentLiveEvents.set(event.key, now);
  voiceDirector.queue.push(event);
  processLiveCommentaryQueue().catch(() => {});
  return true;
}

function maybeQueueAmbientCommentary(force = false) {
  if (!state.candles.length || isIntermissionActive() || !hasAnyCommentaryProvider()) {
    return;
  }

  const now = Date.now();
  if (!force && (voiceDirector.isProcessing || voiceDirector.queue.length)) {
    return;
  }
  if (!force && now - Math.max(voiceDirector.lastAmbientQueuedAt, voiceDirector.lastLiveSpokenAt) < 22_000) {
    return;
  }

  const chartPattern = state.currentIntervalPattern;
  const leadPattern = state.topDownAnalysis?.leadAnalysis;
  const patternName = chartPattern?.pattern?.name || leadPattern?.pattern?.name || "a developing live structure";
  const confidence = chartPattern?.confidence || leadPattern?.confidence || 0;
  const useIndicatorObservation = !force && (!chartPattern?.patternId || voiceDirector.lastAmbientType === "pattern");
  const event = {
    type: force ? "warmup_intro" : useIndicatorObservation ? "indicator_observation" : "ambient_update",
    key: `${currentCoin().marketSymbol}:${force ? "warmup" : useIndicatorObservation ? "indicator" : "ambient"}:${currentInterval()}:${chartPattern?.patternId || leadPattern?.patternId || "scan"}:${Math.floor(now / 20000)}`,
    pattern_name: patternName,
    confidence,
    lead_pattern_name: leadPattern?.pattern?.name || leadPattern?.title || patternName,
    lead_interval: state.topDownAnalysis?.leadInterval || currentInterval(),
  };

  if (enqueueLiveCommentaryEvent(event, { bypassTiming: force, bypassDedupe: force })) {
    voiceDirector.lastAmbientQueuedAt = now;
    voiceDirector.lastAmbientType = force ? "pattern" : useIndicatorObservation ? "indicator" : "pattern";
    if (force) {
      voiceDirector.warmupQueued = true;
    }
  }
}

function observeLiveCommentary() {
  const snapshot = {
    interval: currentInterval(),
    chartPatternId: state.currentIntervalPattern?.patternId || null,
    chartPatternName: state.currentIntervalPattern?.pattern?.name || null,
    chartConfidence: state.currentIntervalPattern?.confidence || 0,
    leadPatternId: state.topDownAnalysis?.topDownPatternId || state.topDownAnalysis?.leadPattern?.id || null,
    leadPatternName: state.topDownAnalysis?.leadPattern?.name || state.topDownAnalysis?.leadAnalysis?.pattern?.name || null,
    leadInterval: state.topDownAnalysis?.leadInterval || currentInterval(),
    confirmedCount: (state.topDownAnalysis?.timeframeAlignment || []).filter((item) => item.status === "Confirmed").length,
  };

  const previous = voiceDirector.lastObservedSnapshot;
  voiceDirector.lastObservedSnapshot = snapshot;

  if (!previous || isIntermissionActive() || !hasAnyCommentaryProvider()) {
    return;
  }

  const event = buildLiveCommentaryEvent(snapshot, previous);
  if (!event) {
    return;
  }
  enqueueLiveCommentaryEvent(event);
}

async function refreshMarketSnapshots() {
  const snapshotEntries = await Promise.all(
    CONFIG.coins.map(async (coin) => {
      try {
        const ticker = await fetchBinanceJson(`/api/v3/ticker/24hr?symbol=${coin.marketSymbol}`);
        return [coin.marketSymbol, normalizeTicker(ticker)];
      } catch {
        return [coin.marketSymbol, state.marketSnapshots[coin.marketSymbol] || null];
      }
    })
  );

  snapshotEntries.forEach(([symbol, ticker]) => {
    if (ticker) {
      state.marketSnapshots[symbol] = ticker;
    }
  });
}

function normalizePath(values) {
  if (!values.length) {
    return [];
  }
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum;
  if (spread < 1e-9) {
    return values.map(() => 0.5);
  }
  return values.map((value) => (value - minimum) / spread);
}

function resampleSeries(values, targetLength) {
  if (!values.length) {
    return new Array(targetLength).fill(0.5);
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

function invertShape(shape) {
  return normalizePath(shape.map((value) => 1 - value));
}

function tiltShape(shape, amount) {
  const lastIndex = Math.max(shape.length - 1, 1);
  return normalizePath(
    shape.map((value, index) => {
      const tilt = ((index / lastIndex) - 0.5) * amount;
      return clamp(value + tilt, 0, 1);
    })
  );
}

function squeezeShape(shape, factor) {
  return normalizePath(shape.map((value) => 0.5 + (value - 0.5) * factor));
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

const SHAPES = {
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

const VOLUME_SHAPES = {
  flat: normalizePath([0.55, 0.54, 0.56, 0.55, 0.54, 0.56, 0.55, 0.54, 0.55, 0.56, 0.55, 0.56]),
  rise: normalizePath([0.34, 0.36, 0.4, 0.44, 0.48, 0.54, 0.6, 0.66, 0.72, 0.8, 0.88, 0.96]),
  fade: normalizePath([0.92, 0.86, 0.78, 0.72, 0.66, 0.6, 0.54, 0.5, 0.46, 0.42, 0.38, 0.34]),
  breakout: normalizePath([0.4, 0.42, 0.44, 0.46, 0.48, 0.46, 0.44, 0.5, 0.54, 0.62, 0.78, 0.98]),
  compression: normalizePath([0.74, 0.68, 0.62, 0.56, 0.52, 0.48, 0.44, 0.42, 0.4, 0.38, 0.36, 0.34]),
  expansion: normalizePath([0.34, 0.36, 0.38, 0.42, 0.48, 0.56, 0.64, 0.72, 0.8, 0.86, 0.92, 0.98]),
  spikeFade: normalizePath([0.36, 0.38, 0.42, 0.48, 0.56, 0.7, 0.96, 0.72, 0.58, 0.48, 0.42, 0.38]),
  sweep: normalizePath([0.42, 0.44, 0.46, 0.48, 0.52, 1, 0.58, 0.52, 0.48, 0.46, 0.44, 0.42]),
  accumulate: normalizePath([0.58, 0.56, 0.54, 0.52, 0.5, 0.52, 0.54, 0.56, 0.6, 0.66, 0.74, 0.86]),
  distribute: normalizePath([0.86, 0.78, 0.72, 0.66, 0.6, 0.56, 0.54, 0.5, 0.48, 0.46, 0.42, 0.38]),
};

const VOLUME_LABELS = {
  flat: "steady participation",
  rise: "rising participation",
  fade: "cooling participation",
  breakout: "breakout-style volume expansion",
  compression: "contracting volume",
  expansion: "expanding participation",
  spikeFade: "a spike-and-fade volume burst",
  sweep: "liquidity-sweep volume",
  accumulate: "accumulating participation",
  distribute: "distribution-style turnover",
};

function definePattern(definition) {
  return {
    ...definition,
    shape: normalizePath(definition.shape),
    volumeShape: VOLUME_SHAPES[definition.volumeKey] || VOLUME_SHAPES.flat,
  };
}

const PATTERN_LIBRARY = [
  definePattern({ id: "double_top_echo", name: "Double Top Echo", shape: SHAPES.mTop, volumeKey: "distribute", bias: "Watch rejection at highs", marketBias: "Cautious bias", regime: "Distribution", title: "1m Double Top Similarity", tagline: "1m candles resemble a double top echo" }),
  definePattern({ id: "double_bottom_echo", name: "Double Bottom Echo", shape: invertShape(SHAPES.mTop), volumeKey: "accumulate", bias: "Watch higher-low support", marketBias: "Recovery bias", regime: "Accumulation", title: "1m Double Bottom Similarity", tagline: "1m candles resemble a double bottom echo" }),
  definePattern({ id: "triple_top", name: "Triple Top", shape: SHAPES.tripleTop, volumeKey: "distribute", bias: "Repeated ceiling in play", marketBias: "Cautious bias", regime: "Distribution", title: "1m Triple Top Similarity", tagline: "1m candles resemble a triple top" }),
  definePattern({ id: "triple_bottom", name: "Triple Bottom", shape: invertShape(SHAPES.tripleTop), volumeKey: "accumulate", bias: "Repeated floor in play", marketBias: "Recovery bias", regime: "Accumulation", title: "1m Triple Bottom Similarity", tagline: "1m candles resemble a triple bottom" }),
  definePattern({ id: "head_shoulders", name: "Head and Shoulders", shape: SHAPES.headShoulders, volumeKey: "distribute", bias: "Neckline risk rising", marketBias: "Cautious bias", regime: "Distribution", title: "1m Head and Shoulders Similarity", tagline: "1m candles resemble a head and shoulders top" }),
  definePattern({ id: "inverse_head_shoulders", name: "Inverse Head and Shoulders", shape: invertShape(SHAPES.headShoulders), volumeKey: "accumulate", bias: "Base structure improving", marketBias: "Recovery bias", regime: "Accumulation", title: "1m Inverse Head and Shoulders Similarity", tagline: "1m candles resemble an inverse head and shoulders" }),
  definePattern({ id: "rounded_top", name: "Rounded Top", shape: SHAPES.roundedTop, volumeKey: "fade", bias: "Momentum is rolling over", marketBias: "Cautious bias", regime: "Distribution", title: "1m Rounded Top Similarity", tagline: "1m candles resemble a rounded top" }),
  definePattern({ id: "rounded_bottom", name: "Rounded Bottom", shape: invertShape(SHAPES.roundedTop), volumeKey: "accumulate", bias: "Base is slowly improving", marketBias: "Recovery bias", regime: "Accumulation", title: "1m Rounded Bottom Similarity", tagline: "1m candles resemble a rounded bottom" }),
  definePattern({ id: "diamond_top", name: "Diamond Top", shape: SHAPES.diamondTop, volumeKey: "expansion", bias: "Erratic topping action", marketBias: "Cautious bias", regime: "Distribution", title: "1m Diamond Top Similarity", tagline: "1m candles resemble a diamond top" }),
  definePattern({ id: "diamond_bottom", name: "Diamond Bottom", shape: invertShape(SHAPES.diamondTop), volumeKey: "expansion", bias: "Erratic basing action", marketBias: "Recovery bias", regime: "Accumulation", title: "1m Diamond Bottom Similarity", tagline: "1m candles resemble a diamond bottom" }),
  definePattern({ id: "broadening_top", name: "Broadening Top", shape: SHAPES.broadeningTop, volumeKey: "expansion", bias: "Volatility is widening near highs", marketBias: "Cautious bias", regime: "Expansion", title: "1m Broadening Top Similarity", tagline: "1m candles resemble a broadening top" }),
  definePattern({ id: "broadening_bottom", name: "Broadening Bottom", shape: invertShape(SHAPES.broadeningTop), volumeKey: "expansion", bias: "Volatility is widening near lows", marketBias: "Recovery bias", regime: "Expansion", title: "1m Broadening Bottom Similarity", tagline: "1m candles resemble a broadening bottom" }),
  definePattern({ id: "v_reversal", name: "V Reversal", shape: SHAPES.vReversal, volumeKey: "spikeFade", bias: "Fast reversal pressure", marketBias: "Recovery bias", regime: "Expansion", title: "1m V Reversal Similarity", tagline: "1m candles resemble a V reversal" }),
  definePattern({ id: "v_recovery", name: "V Recovery", shape: invertShape(SHAPES.vReversal), volumeKey: "spikeFade", bias: "Fast rebound structure", marketBias: "Bullish bias", regime: "Expansion", title: "1m V Recovery Similarity", tagline: "1m candles resemble a V recovery" }),
  definePattern({ id: "dead_cat_bounce", name: "Dead Cat Bounce", shape: SHAPES.deadCat, volumeKey: "spikeFade", bias: "Bounce looks weak", marketBias: "Cautious bias", regime: "Mean Reversion", title: "1m Dead Cat Bounce Similarity", tagline: "1m candles resemble a dead cat bounce" }),
  definePattern({ id: "relief_rally_fade", name: "Relief Rally Fade", shape: invertShape(SHAPES.deadCat), volumeKey: "spikeFade", bias: "Relief move may be fading", marketBias: "Cautious bias", regime: "Mean Reversion", title: "1m Relief Rally Fade Similarity", tagline: "1m candles resemble a relief rally fade" }),
  definePattern({ id: "blow_off_top", name: "Blow-Off Top", shape: SHAPES.blowOffTop, volumeKey: "spikeFade", bias: "Exhaustion risk is elevated", marketBias: "Cautious bias", regime: "Expansion", title: "1m Blow-Off Top Similarity", tagline: "1m candles resemble a blow-off top" }),
  definePattern({ id: "capitulation_bottom", name: "Capitulation Bottom", shape: invertShape(SHAPES.blowOffTop), volumeKey: "spikeFade", bias: "Panic flush may be exhausting", marketBias: "Recovery bias", regime: "Expansion", title: "1m Capitulation Bottom Similarity", tagline: "1m candles resemble a capitulation bottom" }),
  definePattern({ id: "bull_flag_echo", name: "Bull Flag Echo", shape: SHAPES.bullFlag, volumeKey: "fade", bias: "Continuation structure intact", marketBias: "Continuation bias", regime: "Trend", title: "1m Bull Flag Similarity", tagline: "1m candles resemble a bull flag continuation" }),
  definePattern({ id: "bear_flag_echo", name: "Bear Flag Echo", shape: invertShape(SHAPES.bullFlag), volumeKey: "fade", bias: "Continuation risk to the downside", marketBias: "Cautious bias", regime: "Trend", title: "1m Bear Flag Similarity", tagline: "1m candles resemble a bear flag continuation" }),
  definePattern({ id: "pennant_breakout", name: "Pennant Breakout", shape: SHAPES.pennantUp, volumeKey: "breakout", bias: "Breakout pressure is building", marketBias: "Breakout bias", regime: "Compression", title: "1m Pennant Breakout Similarity", tagline: "1m candles resemble a bullish pennant" }),
  definePattern({ id: "pennant_breakdown", name: "Pennant Breakdown", shape: invertShape(SHAPES.pennantUp), volumeKey: "breakout", bias: "Breakdown pressure is building", marketBias: "Cautious bias", regime: "Compression", title: "1m Pennant Breakdown Similarity", tagline: "1m candles resemble a bearish pennant" }),
  definePattern({ id: "high_tight_flag", name: "High Tight Flag", shape: tiltShape(SHAPES.bullFlag, 0.18), volumeKey: "breakout", bias: "Fast continuation risk is alive", marketBias: "Momentum bias", regime: "Expansion", title: "1m High Tight Flag Similarity", tagline: "1m candles resemble a high tight flag" }),
  definePattern({ id: "low_tight_flag", name: "Low Tight Flag", shape: invertShape(tiltShape(SHAPES.bullFlag, 0.18)), volumeKey: "breakout", bias: "Fast downside continuation risk", marketBias: "Cautious bias", regime: "Expansion", title: "1m Low Tight Flag Similarity", tagline: "1m candles resemble a low tight flag" }),
  definePattern({ id: "ascending_triangle", name: "Ascending Triangle", shape: SHAPES.triangleUp, volumeKey: "compression", bias: "Resistance is under pressure", marketBias: "Breakout bias", regime: "Compression", title: "1m Ascending Triangle Similarity", tagline: "1m candles resemble an ascending triangle" }),
  definePattern({ id: "descending_triangle", name: "Descending Triangle", shape: invertShape(SHAPES.triangleUp), volumeKey: "compression", bias: "Support is under pressure", marketBias: "Cautious bias", regime: "Compression", title: "1m Descending Triangle Similarity", tagline: "1m candles resemble a descending triangle" }),
  definePattern({ id: "symmetrical_triangle", name: "Symmetrical Triangle", shape: SHAPES.triangleSym, volumeKey: "compression", bias: "Compression is balancing both sides", marketBias: "Neutral bias", regime: "Compression", title: "1m Symmetrical Triangle Similarity", tagline: "1m candles resemble a symmetrical triangle" }),
  definePattern({ id: "flat_top_breakout", name: "Flat Top Breakout", shape: SHAPES.flatTop, volumeKey: "breakout", bias: "Flat-top pressure building", marketBias: "Breakout bias", regime: "Compression", title: "1m Flat Top Breakout Similarity", tagline: "1m candles resemble a flat-top breakout" }),
  definePattern({ id: "flat_bottom_breakdown", name: "Flat Bottom Breakdown", shape: invertShape(SHAPES.flatTop), volumeKey: "breakout", bias: "Flat-bottom pressure building", marketBias: "Cautious bias", regime: "Compression", title: "1m Flat Bottom Breakdown Similarity", tagline: "1m candles resemble a flat-bottom breakdown" }),
  definePattern({ id: "impulse_pullback", name: "Impulse Pullback", shape: tiltShape(SHAPES.bullFlag, 0.12), volumeKey: "fade", bias: "Trend pullback remains orderly", marketBias: "Continuation bias", regime: "Trend", title: "1m Impulse Pullback Similarity", tagline: "1m candles resemble an impulse pullback" }),
  definePattern({ id: "stair_step_up", name: "Stair Step Up", shape: SHAPES.stairStep, volumeKey: "rise", bias: "Higher-low stair steps intact", marketBias: "Bullish bias", regime: "Trend", title: "1m Stair Step Up Similarity", tagline: "1m candles resemble a stair-step trend" }),
  definePattern({ id: "stair_step_down", name: "Stair Step Down", shape: invertShape(SHAPES.stairStep), volumeKey: "rise", bias: "Lower-high stair steps intact", marketBias: "Cautious bias", regime: "Trend", title: "1m Stair Step Down Similarity", tagline: "1m candles resemble a stair-step decline" }),
  definePattern({ id: "continuation_box", name: "Continuation Box", shape: SHAPES.boxContinuation, volumeKey: "flat", bias: "Range is holding after impulse", marketBias: "Continuation bias", regime: "Range", title: "1m Continuation Box Similarity", tagline: "1m candles resemble a continuation box" }),
  definePattern({ id: "breakout_retest", name: "Breakout Retest", shape: SHAPES.breakoutRetest, volumeKey: "breakout", bias: "Retest remains healthy", marketBias: "Breakout bias", regime: "Trend", title: "1m Breakout Retest Similarity", tagline: "1m candles resemble a breakout retest" }),
  definePattern({ id: "breakdown_retest", name: "Breakdown Retest", shape: invertShape(SHAPES.breakoutRetest), volumeKey: "breakout", bias: "Retest remains heavy", marketBias: "Cautious bias", regime: "Trend", title: "1m Breakdown Retest Similarity", tagline: "1m candles resemble a breakdown retest" }),
  definePattern({ id: "drift_base", name: "Drift Base", shape: SHAPES.driftBase, volumeKey: "compression", bias: "Base is quietly forming", marketBias: "Neutral-to-bullish", regime: "Accumulation", title: "1m Drift Base Similarity", tagline: "1m candles resemble a drift base" }),
  definePattern({ id: "rising_wedge", name: "Rising Wedge", shape: SHAPES.risingWedge, volumeKey: "compression", bias: "Slope is getting crowded", marketBias: "Cautious bias", regime: "Compression", title: "1m Rising Wedge Similarity", tagline: "1m candles resemble a rising wedge" }),
  definePattern({ id: "falling_wedge", name: "Falling Wedge", shape: invertShape(SHAPES.risingWedge), volumeKey: "compression", bias: "Downside squeeze may be tiring", marketBias: "Recovery bias", regime: "Compression", title: "1m Falling Wedge Similarity", tagline: "1m candles resemble a falling wedge" }),
  definePattern({ id: "compression_wedge", name: "Compression Wedge", shape: squeezeShape(SHAPES.triangleSym, 0.72), volumeKey: "compression", bias: "Expansion setup building", marketBias: "Neutral-to-breakout", regime: "Compression", title: "1m Compression Wedge Similarity", tagline: "1m candles resemble a compression wedge" }),
  definePattern({ id: "ascending_channel", name: "Ascending Channel", shape: SHAPES.channelUp, volumeKey: "flat", bias: "Trend is channeling higher", marketBias: "Bullish bias", regime: "Trend", title: "1m Ascending Channel Similarity", tagline: "1m candles resemble an ascending channel" }),
  definePattern({ id: "descending_channel", name: "Descending Channel", shape: invertShape(SHAPES.channelUp), volumeKey: "flat", bias: "Trend is channeling lower", marketBias: "Cautious bias", regime: "Trend", title: "1m Descending Channel Similarity", tagline: "1m candles resemble a descending channel" }),
  definePattern({ id: "rising_channel", name: "Rising Channel", shape: tiltShape(SHAPES.channelUp, 0.12), volumeKey: "flat", bias: "Uptrend is orderly but stretched", marketBias: "Bullish bias", regime: "Trend", title: "1m Rising Channel Similarity", tagline: "1m candles resemble a rising channel" }),
  definePattern({ id: "falling_channel", name: "Falling Channel", shape: invertShape(tiltShape(SHAPES.channelUp, 0.12)), volumeKey: "flat", bias: "Downtrend is orderly but extended", marketBias: "Cautious bias", regime: "Trend", title: "1m Falling Channel Similarity", tagline: "1m candles resemble a falling channel" }),
  definePattern({ id: "ascending_broadening_wedge", name: "Ascending Broadening Wedge", shape: SHAPES.broadeningWedgeUp, volumeKey: "expansion", bias: "Wider swings are forming overhead", marketBias: "High-risk momentum", regime: "Expansion", title: "1m Ascending Broadening Wedge Similarity", tagline: "1m candles resemble an ascending broadening wedge" }),
  definePattern({ id: "descending_broadening_wedge", name: "Descending Broadening Wedge", shape: invertShape(SHAPES.broadeningWedgeUp), volumeKey: "expansion", bias: "Wider swings are forming under pressure", marketBias: "Recovery bias", regime: "Expansion", title: "1m Descending Broadening Wedge Similarity", tagline: "1m candles resemble a descending broadening wedge" }),
  definePattern({ id: "megaphone", name: "Megaphone", shape: SHAPES.megaphone, volumeKey: "expansion", bias: "Volatility is widening fast", marketBias: "High-risk momentum", regime: "Expansion", title: "1m Megaphone Similarity", tagline: "1m candles resemble a megaphone pattern" }),
  definePattern({ id: "volatility_coil", name: "Volatility Coil", shape: SHAPES.coil, volumeKey: "compression", bias: "Fast move likely", marketBias: "Neutral bias", regime: "Compression", title: "1m Volatility Coil Similarity", tagline: "1m candles resemble a volatility coil" }),
  definePattern({ id: "squeeze_release", name: "Squeeze Release", shape: tiltShape(SHAPES.coil, 0.1), volumeKey: "breakout", bias: "Compression is starting to release", marketBias: "Breakout bias", regime: "Compression", title: "1m Squeeze Release Similarity", tagline: "1m candles resemble a squeeze release" }),
  definePattern({ id: "coiled_breakout", name: "Coiled Breakout", shape: tiltShape(SHAPES.coil, 0.18), volumeKey: "breakout", bias: "Coiled energy favors upside expansion", marketBias: "Breakout bias", regime: "Compression", title: "1m Coiled Breakout Similarity", tagline: "1m candles resemble a coiled breakout" }),
  definePattern({ id: "coiled_breakdown", name: "Coiled Breakdown", shape: invertShape(tiltShape(SHAPES.coil, 0.18)), volumeKey: "breakout", bias: "Coiled energy favors downside expansion", marketBias: "Cautious bias", regime: "Compression", title: "1m Coiled Breakdown Similarity", tagline: "1m candles resemble a coiled breakdown" }),
  definePattern({ id: "range_compression", name: "Range Compression", shape: SHAPES.rangeCompression, volumeKey: "compression", bias: "Range is tightening", marketBias: "Neutral bias", regime: "Compression", title: "1m Range Compression Similarity", tagline: "1m candles resemble range compression" }),
  definePattern({ id: "range_expansion", name: "Range Expansion", shape: SHAPES.rangeExpansion, volumeKey: "expansion", bias: "Range is widening quickly", marketBias: "High-risk momentum", regime: "Expansion", title: "1m Range Expansion Similarity", tagline: "1m candles resemble range expansion" }),
  definePattern({ id: "liquidity_sweep_high", name: "Liquidity Sweep High", shape: SHAPES.liquiditySweepHigh, volumeKey: "sweep", bias: "Stop run above local highs", marketBias: "Cautious bias", regime: "Liquidity Sweep", title: "1m Liquidity Sweep High Similarity", tagline: "1m candles resemble a liquidity sweep above highs" }),
  definePattern({ id: "liquidity_sweep_low", name: "Liquidity Sweep Low", shape: invertShape(SHAPES.liquiditySweepHigh), volumeKey: "sweep", bias: "Stop run below local lows", marketBias: "Recovery bias", regime: "Liquidity Sweep", title: "1m Liquidity Sweep Low Similarity", tagline: "1m candles resemble a liquidity sweep below lows" }),
  definePattern({ id: "cup_handle", name: "Cup and Handle", shape: SHAPES.cupHandle, volumeKey: "accumulate", bias: "Handle still constructive", marketBias: "Bullish bias", regime: "Accumulation", title: "1m Cup and Handle Similarity", tagline: "1m candles resemble a cup and handle" }),
  definePattern({ id: "inverse_cup_handle", name: "Inverse Cup and Handle", shape: invertShape(SHAPES.cupHandle), volumeKey: "distribute", bias: "Inverse handle still heavy", marketBias: "Cautious bias", regime: "Distribution", title: "1m Inverse Cup and Handle Similarity", tagline: "1m candles resemble an inverse cup and handle" }),
  definePattern({ id: "accumulation_shelf", name: "Accumulation Shelf", shape: SHAPES.shelfAccum, volumeKey: "accumulate", bias: "Supply looks absorbable", marketBias: "Accumulation bias", regime: "Accumulation", title: "1m Accumulation Shelf Similarity", tagline: "1m candles resemble an accumulation shelf" }),
  definePattern({ id: "distribution_shelf", name: "Distribution Shelf", shape: invertShape(SHAPES.shelfAccum), volumeKey: "distribute", bias: "Supply is building overhead", marketBias: "Cautious bias", regime: "Distribution", title: "1m Distribution Shelf Similarity", tagline: "1m candles resemble a distribution shelf" }),
  definePattern({ id: "base_breakout", name: "Base Breakout", shape: SHAPES.baseBreakout, volumeKey: "breakout", bias: "Base is trying to lift", marketBias: "Breakout bias", regime: "Accumulation", title: "1m Base Breakout Similarity", tagline: "1m candles resemble a base breakout" }),
  definePattern({ id: "mean_reversion_bounce", name: "Mean Reversion Bounce", shape: SHAPES.meanReversionBounce, volumeKey: "spikeFade", bias: "Snapback is underway", marketBias: "Recovery bias", regime: "Mean Reversion", title: "1m Mean Reversion Bounce Similarity", tagline: "1m candles resemble a mean reversion bounce" }),
  definePattern({ id: "mean_reversion_fade", name: "Mean Reversion Fade", shape: invertShape(SHAPES.meanReversionBounce), volumeKey: "spikeFade", bias: "Snapback is fading", marketBias: "Cautious bias", regime: "Mean Reversion", title: "1m Mean Reversion Fade Similarity", tagline: "1m candles resemble a mean reversion fade" }),
  definePattern({ id: "rounded_accumulation", name: "Rounded Accumulation", shape: SHAPES.roundedAccum, volumeKey: "accumulate", bias: "Gradual base improvement", marketBias: "Accumulation bias", regime: "Accumulation", title: "1m Rounded Accumulation Similarity", tagline: "1m candles resemble rounded accumulation" }),
  definePattern({ id: "rounded_distribution", name: "Rounded Distribution", shape: invertShape(SHAPES.roundedAccum), volumeKey: "distribute", bias: "Gradual top distribution", marketBias: "Cautious bias", regime: "Distribution", title: "1m Rounded Distribution Similarity", tagline: "1m candles resemble rounded distribution" }),
  definePattern({ id: "higher_low_ladder", name: "Higher-Low Ladder", shape: SHAPES.ladderUp, volumeKey: "rise", bias: "Higher lows keep stacking", marketBias: "Bullish bias", regime: "Trend", title: "1m Higher-Low Ladder Similarity", tagline: "1m candles resemble a higher-low ladder" }),
  definePattern({ id: "lower_high_ladder", name: "Lower-High Ladder", shape: invertShape(SHAPES.ladderUp), volumeKey: "rise", bias: "Lower highs keep stacking", marketBias: "Cautious bias", regime: "Trend", title: "1m Lower-High Ladder Similarity", tagline: "1m candles resemble a lower-high ladder" }),
  definePattern({ id: "parabolic_advance", name: "Parabolic Advance", shape: SHAPES.parabolicAdvance, volumeKey: "expansion", bias: "Momentum is accelerating hard", marketBias: "High-risk momentum", regime: "Expansion", title: "1m Parabolic Advance Similarity", tagline: "1m candles resemble a parabolic advance" }),
  definePattern({ id: "parabolic_fade", name: "Parabolic Fade", shape: invertShape(SHAPES.parabolicAdvance), volumeKey: "expansion", bias: "Cool-off risk is rising", marketBias: "High-risk momentum", regime: "Expansion", title: "1m Parabolic Fade Similarity", tagline: "1m candles resemble a parabolic fade" }),
  definePattern({ id: "micro_flag", name: "Micro Flag", shape: SHAPES.microFlag, volumeKey: "fade", bias: "Short pullback remains organized", marketBias: "Continuation bias", regime: "Trend", title: "1m Micro Flag Similarity", tagline: "1m candles resemble a micro flag" }),
];

const BULLISH_PATTERN_IDS = new Set([
  "double_bottom_echo",
  "triple_bottom",
  "inverse_head_shoulders",
  "rounded_bottom",
  "diamond_bottom",
  "broadening_bottom",
  "v_reversal",
  "capitulation_bottom",
  "bull_flag_echo",
  "pennant_breakout",
  "high_tight_flag",
  "ascending_triangle",
  "flat_top_breakout",
  "impulse_pullback",
  "stair_step_up",
  "continuation_box",
  "breakout_retest",
  "drift_base",
  "falling_wedge",
  "ascending_channel",
  "rising_channel",
  "descending_broadening_wedge",
  "squeeze_release",
  "coiled_breakout",
  "liquidity_sweep_low",
  "cup_handle",
  "accumulation_shelf",
  "base_breakout",
  "mean_reversion_bounce",
  "rounded_accumulation",
  "higher_low_ladder",
  "parabolic_advance",
  "micro_flag",
  "v_recovery",
  "breakout_continuation",
]);

const BEARISH_PATTERN_IDS = new Set([
  "double_top_echo",
  "triple_top",
  "head_shoulders",
  "rounded_top",
  "diamond_top",
  "broadening_top",
  "dead_cat_bounce",
  "relief_rally_fade",
  "blow_off_top",
  "bear_flag_echo",
  "pennant_breakdown",
  "low_tight_flag",
  "descending_triangle",
  "flat_bottom_breakdown",
  "stair_step_down",
  "breakdown_retest",
  "rising_wedge",
  "descending_channel",
  "falling_channel",
  "ascending_broadening_wedge",
  "coiled_breakdown",
  "liquidity_sweep_high",
  "inverse_cup_handle",
  "distribution_shelf",
  "mean_reversion_fade",
  "rounded_distribution",
  "lower_high_ladder",
  "parabolic_fade",
]);

function patternDirection(patternId) {
  if (BULLISH_PATTERN_IDS.has(patternId)) {
    return "Bullish";
  }
  if (BEARISH_PATTERN_IDS.has(patternId)) {
    return "Bearish";
  }
  return "Neutral";
}

function buildHeuristicEntry(definition, score) {
  const confidence = Math.round(54 + clamp(score, 0, 1) * 30);
  return {
    ...definition,
    score,
    confidence,
  };
}

function scoreDoubleTop(candles) {
  const window = candles.slice(-22);
  const highs = window.map((candle) => candle.high);
  const lows = window.map((candle) => candle.low);
  const closes = window.map((candle) => candle.close);
  const peaks = [];

  for (let index = 1; index < highs.length - 1; index += 1) {
    if (highs[index] > highs[index - 1] && highs[index] >= highs[index + 1]) {
      peaks.push({ index, value: highs[index] });
    }
  }

  let bestScore = 0;
  let details = "Recent highs are not yet repeating cleanly.";

  for (let left = 0; left < peaks.length - 1; left += 1) {
    for (let right = left + 1; right < peaks.length; right += 1) {
      const firstPeak = peaks[left];
      const secondPeak = peaks[right];
      const averagePeak = (firstPeak.value + secondPeak.value) / 2;
      const peakGap = Math.abs(firstPeak.value - secondPeak.value) / averagePeak;
      const valley = Math.min(...lows.slice(firstPeak.index, secondPeak.index + 1));
      const valleyDepth = (Math.min(firstPeak.value, secondPeak.value) - valley) / Math.min(firstPeak.value, secondPeak.value);
      const coolOff = Math.max(0, (secondPeak.value - last(closes)) / secondPeak.value);
      const score =
        clamp(1 - peakGap / 0.0045, 0, 1) * 0.44 +
        clamp(valleyDepth / 0.0035, 0, 1) * 0.36 +
        clamp(coolOff / 0.0025, 0, 1) * 0.2;

      if (score > bestScore) {
        bestScore = score;
        details = `Two 1m peaks are sitting roughly ${percentText(peakGap, 3)} apart with a ${percentText(valleyDepth, 3)} pullback between them.`;
      }
    }
  }

  return buildHeuristicEntry(
    {
      id: "double_top_echo",
      name: "Double Top Echo",
      bias: "Watch rejection at highs",
      marketBias: "Cautious bias",
      regime: "Distribution",
      title: "1m Double Top Similarity",
      tagline: "1m candles resemble a double top echo",
      body: details,
    },
    bestScore
  );
}

function scoreBullFlag(candles) {
  const window = candles.slice(-22);
  const closes = window.map((candle) => candle.close);
  const pole = closes.slice(0, 8);
  const flag = closes.slice(8);
  const poleGain = percentageMove(pole[0], last(pole));
  const flagSlope = linearSlope(flag);
  const flagRange = (Math.max(...flag) - Math.min(...flag)) / last(pole);
  const recovery = (last(flag) - Math.min(...flag)) / Math.max(Math.max(...flag) - Math.min(...flag), 1e-9);
  const score =
    clamp(poleGain / 0.012, 0, 1) * 0.46 +
    clamp(1 - Math.abs(flagSlope) / 0.0022, 0, 1) * 0.24 +
    clamp(1 - flagRange / 0.009, 0, 1) * 0.18 +
    clamp(recovery, 0, 1) * 0.12;

  return buildHeuristicEntry(
    {
      id: "bull_flag_echo",
      name: "Bull Flag Echo",
      bias: "Continuation structure intact",
      marketBias: "Continuation bias",
      regime: "Trend",
      title: "1m Bull Flag Similarity",
      tagline: "1m candles resemble a bull flag continuation",
      body: `A ${percentText(poleGain)} impulse is being followed by a controlled pullback rather than a deep unwind on the 1m chart.`,
    },
    score
  );
}

function scoreAscendingTriangle(candles) {
  const window = candles.slice(-18);
  const highs = window.map((candle) => candle.high).slice(-8);
  const lows = window.map((candle) => candle.low).slice(-8);
  const closes = window.map((candle) => candle.close);
  const averageHigh = average(highs);
  const highBand = (Math.max(...highs) - Math.min(...highs)) / averageHigh;
  const lowSlope = linearSlope(lows);
  const resistanceDistance = Math.max(0, (Math.max(...highs) - last(closes)) / Math.max(...highs, 1e-9));
  const score =
    clamp(1 - highBand / 0.0035, 0, 1) * 0.48 +
    clamp(lowSlope / 0.0014, 0, 1) * 0.3 +
    clamp(1 - resistanceDistance / 0.0035, 0, 1) * 0.22;

  return buildHeuristicEntry(
    {
      id: "ascending_triangle",
      name: "Ascending Triangle",
      bias: "Resistance is under pressure",
      marketBias: "Breakout bias",
      regime: "Compression",
      title: "1m Ascending Triangle Similarity",
      tagline: "1m candles resemble an ascending triangle",
      body: `Recent highs are clustering inside a ${percentText(highBand)} band while minute-by-minute lows keep stepping higher.`,
    },
    score
  );
}

function scoreCompressionWedge(candles) {
  const window = candles.slice(-20);
  const firstHalf = window.slice(0, 10);
  const secondHalf = window.slice(10);
  const firstRange = (Math.max(...firstHalf.map((candle) => candle.high)) - Math.min(...firstHalf.map((candle) => candle.low))) / firstHalf[0].close;
  const secondRange = (Math.max(...secondHalf.map((candle) => candle.high)) - Math.min(...secondHalf.map((candle) => candle.low))) / secondHalf[0].close;
  const highSlope = linearSlope(secondHalf.map((candle) => candle.high));
  const lowSlope = linearSlope(secondHalf.map((candle) => candle.low));
  const compression = clamp(1 - secondRange / Math.max(firstRange, 1e-9), 0, 1);
  const convergence = clamp((lowSlope - highSlope) / 0.003, 0, 1);
  const score = compression * 0.56 + convergence * 0.44;

  return buildHeuristicEntry(
    {
      id: "compression_wedge",
      name: "Compression Wedge",
      bias: "Expansion setup building",
      marketBias: "Neutral-to-breakout",
      regime: "Compression",
      title: "1m Compression Wedge Similarity",
      tagline: "1m candles resemble a compression wedge",
      body: `The active 1m range has tightened from ${percentText(firstRange)} to ${percentText(secondRange)}, which usually means pressure is building.`,
    },
    score
  );
}

function scoreBreakoutContinuation(candles) {
  const window = candles.slice(-20);
  const highs = window.map((candle) => candle.high);
  const closes = window.map((candle) => candle.close);
  const volumes = window.map((candle) => candle.volume);
  const priorHigh = Math.max(...highs.slice(0, -4));
  const breakout = Math.max(0, percentageMove(priorHigh, last(closes)));
  const recentVolume = average(volumes.slice(-4));
  const priorVolume = average(volumes.slice(0, -4));
  const volumeBoost = priorVolume ? recentVolume / priorVolume : 1;
  const score = clamp(breakout / 0.006, 0, 1) * 0.62 + clamp((volumeBoost - 1) / 0.45, 0, 1) * 0.38;

  return buildHeuristicEntry(
    {
      id: "breakout_continuation",
      name: "Breakout Continuation",
      bias: "Momentum remains constructive",
      marketBias: "Bullish bias",
      regime: "Expansion",
      title: "1m Breakout Continuation Similarity",
      tagline: "1m candles resemble a breakout continuation",
      body: `Price is trading ${percentText(breakout)} above the recent 1m ceiling while short-term volume is running ${volumeBoost.toFixed(2)}x the earlier average.`,
    },
    score
  );
}

function scoreParabolicSpikeFade(candles) {
  const window = candles.slice(-16);
  const closes = window.map((candle) => candle.close);
  const peak = Math.max(...closes);
  const peakIndex = closes.findIndex((value) => value === peak);
  const rise = percentageMove(closes[0], peak);
  const fade = peak ? (peak - last(closes)) / peak : 0;
  const score =
    clamp(rise / 0.014, 0, 1) * 0.54 +
    clamp(fade / 0.007, 0, 1) * 0.28 +
    clamp((closes.length - peakIndex) / closes.length, 0, 1) * 0.18;

  return buildHeuristicEntry(
    {
      id: "parabolic_fade",
      name: "Parabolic Fade",
      bias: "Cool-off risk is rising",
      marketBias: "High-risk momentum",
      regime: "Expansion",
      title: "1m Parabolic Fade Similarity",
      tagline: "1m candles resemble a parabolic fade",
      body: `A ${percentText(rise)} 1m burst has cooled by ${percentText(fade)} from the local peak, which often creates retrace risk before the next move.`,
    },
    score
  );
}

function scoreTemplateSimilarity(template, candles) {
  let bestMatch = {
    score: -1,
    shapeScore: 0,
    volumeScore: 0,
    startIndex: Math.max(0, candles.length - 24),
    endIndex: Math.max(0, candles.length - 1),
  };

  for (const windowSize of [18, 24, 30]) {
    if (candles.length < windowSize) {
      continue;
    }

    for (let startIndex = 0; startIndex <= candles.length - windowSize; startIndex += 1) {
      const endIndex = startIndex + windowSize - 1;
      const window = candles.slice(startIndex, endIndex + 1);
      const closeSeries = normalizePath(resampleSeries(window.map((candle) => candle.close), template.shape.length));
      const volumeSeries = normalizePath(resampleSeries(window.map((candle) => candle.volume), template.shape.length));
      const shapeScore = 1 - rmse(closeSeries, template.shape);
      const volumeScore = 1 - rmse(volumeSeries, template.volumeShape);
      const trendScore = 1 - clamp(Math.abs(linearSlope(closeSeries) - linearSlope(template.shape)) / 0.08, 0, 1);
      const rawScore = clamp(shapeScore * 0.68 + volumeScore * 0.18 + trendScore * 0.14, 0, 1);
      const rightEdgeScore = clamp((endIndex + 1) / candles.length, 0, 1);
      const candlesFromLiveEdge = candles.length - 1 - endIndex;
      const freshnessScore = clamp(1 - candlesFromLiveEdge / Math.max(windowSize * 0.6, 1), 0, 1);
      const activeFormationScore = candlesFromLiveEdge <= 3
        ? 1
        : clamp(1 - (candlesFromLiveEdge - 3) / 14, 0, 1);
      const score = clamp(
        rawScore * 0.58 +
          rightEdgeScore * 0.14 +
          freshnessScore * 0.16 +
          activeFormationScore * 0.12,
        0,
        1
      );

      if (score > bestMatch.score) {
        bestMatch = {
          score,
          shapeScore,
          volumeScore,
          startIndex,
          endIndex,
        };
      }
    }
  }

  return bestMatch;
}

function buildPatternSpan(candles, startIndex, endIndex) {
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

function buildTemplateBody(template, candles, match) {
  const window = candles.slice(match.startIndex, match.endIndex + 1);
  const closes = window.map((candle) => candle.close);
  const move = percentageMove(closes[0], last(closes));
  const span = buildPatternSpan(candles, match.startIndex, match.endIndex);
  return `${template.name} is closest across ${span.timeLabel}, with ${percentText(move, 3)} net movement and ${VOLUME_LABELS[template.volumeKey]}.`;
}

function localizeIntervalCopy(value, intervalLabel) {
  if (typeof value !== "string" || intervalLabel === "1m") {
    return value;
  }
  return value.replaceAll("1m", intervalLabel);
}

function localizePatternDefinition(definition, intervalLabel) {
  return {
    ...definition,
    title: localizeIntervalCopy(definition.title, intervalLabel),
    tagline: localizeIntervalCopy(definition.tagline, intervalLabel),
    body: localizeIntervalCopy(definition.body, intervalLabel),
  };
}

function buildHeuristicMap(candles, intervalLabel = CONFIG.interval) {
  return new Map(
    [
      scoreDoubleTop(candles),
      scoreBullFlag(candles),
      scoreAscendingTriangle(candles),
      scoreCompressionWedge(candles),
      scoreBreakoutContinuation(candles),
      scoreParabolicSpikeFade(candles),
    ].map((entry) => [entry.id, localizePatternDefinition(entry, intervalLabel)])
  );
}

function buildTemplateBodyForInterval(template, candles, match, intervalLabel = CONFIG.interval) {
  const body = buildTemplateBody(template, candles, match);
  return intervalLabel === "1m" ? body : `${body.slice(0, -1)} on ${intervalLabel}.`;
}

function buildPatternCandidate(template, candles, heuristicMap, intervalLabel = CONFIG.interval) {
  const templateScore = scoreTemplateSimilarity(template, candles);
  const heuristic = heuristicMap.get(template.id);
  const localizedTemplate = localizePatternDefinition(template, intervalLabel);
  const combinedScore = heuristic
    ? clamp(templateScore.score * 0.72 + heuristic.score * 0.28, 0, 1)
    : templateScore.score;
  const confidence = Math.round(50 + combinedScore * 42);
  const span = buildPatternSpan(candles, templateScore.startIndex, templateScore.endIndex);
  const direction = patternDirection(template.id);

  return {
    id: template.id,
    name: template.name,
    direction,
    bias: heuristic?.bias ?? localizedTemplate.bias,
    marketBias: heuristic?.marketBias ?? localizedTemplate.marketBias,
    regime: heuristic?.regime ?? localizedTemplate.regime,
    title: heuristic?.title ?? localizedTemplate.title,
    tagline: heuristic?.tagline ?? localizedTemplate.tagline,
    body: heuristic?.body ?? buildTemplateBodyForInterval(template, candles, templateScore, intervalLabel),
    confidence,
    score: combinedScore,
    span,
  };
}

function scorePatternCandidates(candles, intervalLabel = CONFIG.interval) {
  if (candles.length < 30) {
    return [];
  }

  const heuristicMap = buildHeuristicMap(candles, intervalLabel);
  return PATTERN_LIBRARY.map((template) => buildPatternCandidate(template, candles, heuristicMap, intervalLabel)).sort(
    (left, right) => right.score - left.score
  );
}

function analyzePatternSimilarity(candles, intervalLabel = CONFIG.interval) {
  if (candles.length < 30) {
    return {
      patternId: null,
      title: `${intervalLabel} Pattern Engine Warming Up`,
      body: `Waiting for enough live Binance candles to score the ${intervalLabel} pattern library with confidence.`,
      tagline: `Collecting ${intervalLabel} Binance data`,
      mode: `${intervalLabel} similarity scan`,
      regime: "Initializing",
      marketBias: "Neutral bias",
      direction: "Neutral",
      confidence: 50,
      span: null,
      patterns: [
        { name: "Double Top Echo", confidence: 50, bias: "Collecting more candles" },
        { name: "Bull Flag Echo", confidence: 49, bias: "Collecting more candles" },
        { name: "Compression Wedge", confidence: 48, bias: "Collecting more candles" },
      ],
    };
  }

  const candidates = scorePatternCandidates(candles, intervalLabel);
  const leader = candidates[0];
  return {
    patternId: leader.id,
    title: leader.title,
    body: leader.body,
    tagline: leader.tagline,
    mode: `${intervalLabel} ${PATTERN_LIBRARY.length}-template similarity scan`,
    regime: leader.regime,
    marketBias: leader.marketBias,
    direction: leader.direction,
    confidence: leader.confidence,
    span: leader.span,
    patterns: candidates.slice(0, 3).map((pattern) => ({
      id: pattern.id,
      name: pattern.name,
      direction: pattern.direction,
      confidence: pattern.confidence,
      bias: pattern.bias,
      span: pattern.span.timeLabel,
      candleSpan: pattern.span.candleLabel,
    })),
  };
}

function recomputeDerivedState() {
  const closes = state.candles.map((candle) => candle.close);
  state.rsiSeries = calculateRSI(closes);
  const macd = calculateMACD(closes);
  state.macdLine = macd.line;
  state.macdSignal = macd.signal;
  state.macdHistogram = macd.histogram;
  state.currentIntervalPattern = detectorEngine.analyzeDetectedPatterns(state.candles, currentInterval());
  state.patternAnalysis = state.currentIntervalPattern;
  state.intervalAnalyses = {
    ...state.intervalAnalyses,
    [currentInterval()]: state.currentIntervalPattern,
  };
  if (state.isMock || !state.topDownAnalysis) {
    state.topDownAnalysis = detectorEngine.buildTopDownAnalysis(
      (detectorEngine.TOP_DOWN_INTERVALS || TOP_DOWN_SCAN_INTERVALS).map((interval) => ({
        interval,
        analysis: interval === currentInterval() ? state.currentIntervalPattern : null,
        isUnavailable: state.isMock && interval !== currentInterval(),
      })),
      currentInterval(),
      detectorEngine.TOP_DOWN_INTERVALS || TOP_DOWN_SCAN_INTERVALS
    );
    state.timeframeAlignment = state.topDownAnalysis.timeframeAlignment || [];
  }
}

function buildAlignmentSummary() {
  if (state.isMock) {
    return "Top-down confirmation needs live Binance data.";
  }
  if (state.alignmentLoading) {
    return "Top-down detector cascade is updating from live Binance data.";
  }
  return state.topDownAnalysis?.cascadeStatus || "Waiting for an exact top-down lead.";
}

async function refreshTopDownAnalysis(coin) {
  state.alignmentRequestId += 1;
  const requestId = state.alignmentRequestId;
  const displayedInterval = currentInterval();
  const scanIntervals = detectorEngine.TOP_DOWN_INTERVALS || TOP_DOWN_SCAN_INTERVALS;

  if (state.isMock) {
    const mockEntries = scanIntervals.map((interval) => ({
      interval,
      analysis: interval === displayedInterval ? state.currentIntervalPattern : null,
      isUnavailable: interval !== displayedInterval,
    }));
    state.topDownAnalysis = detectorEngine.buildTopDownAnalysis(mockEntries, displayedInterval, scanIntervals);
    state.timeframeAlignment = state.topDownAnalysis.timeframeAlignment || [];
    state.alignmentLoading = false;
    render();
    return;
  }

  state.alignmentLoading = true;
  render();

  const results = await Promise.all(
    scanIntervals.map(async (interval) => {
      if (interval === displayedInterval) {
        return {
          interval,
          analysis: state.currentIntervalPattern,
          isUnavailable: false,
        };
      }
      try {
        const candles = await loadKlinesForInterval(coin.marketSymbol, interval);
        return {
          interval,
          analysis: detectorEngine.analyzeDetectedPatterns(candles, interval),
          isUnavailable: false,
        };
      } catch {
        return {
          interval,
          analysis: null,
          isUnavailable: true,
        };
      }
    })
  );

  if (requestId !== state.alignmentRequestId || coin.marketSymbol !== currentCoin().marketSymbol) {
    return;
  }

  state.intervalAnalyses = Object.fromEntries(results.map((entry) => [entry.interval, entry.analysis]));
  state.topDownAnalysis = detectorEngine.buildTopDownAnalysis(results, displayedInterval, scanIntervals);
  state.timeframeAlignment = state.topDownAnalysis.timeframeAlignment || [];
  state.alignmentLoading = false;
  render();
}

function captureCachedIntervalAnalyses() {
  return {
    ...state.intervalAnalyses,
    [currentInterval()]: state.currentIntervalPattern,
  };
}

async function collectIntermissionAnalyses(coin, cachedIntervalAnalyses = {}) {
  const intervals = detectorEngine.TOP_DOWN_INTERVALS || TOP_DOWN_SCAN_INTERVALS;
  let fetchedCount = 0;
  const entries = await Promise.all(
    intervals.map(async (interval) => {
      try {
        const candles = await loadKlinesForInterval(coin.marketSymbol, interval);
        fetchedCount += 1;
        return {
          interval,
          analysis: detectorEngine.analyzeDetectedPatterns(candles, interval),
          source: "live",
          isUnavailable: false,
        };
      } catch {
        const fallback = cachedIntervalAnalyses[interval] || null;
        return {
          interval,
          analysis: fallback,
          source: fallback ? "fallback" : "missing",
          isUnavailable: !fallback,
        };
      }
    })
  );

  if (fetchedCount < 3) {
    return {
      intervalAnalyses: Object.fromEntries(entries.map((entry) => [entry.interval, entry.analysis])),
      analysisStatus: "fallback",
      entries,
    };
  }

  return {
    intervalAnalyses: Object.fromEntries(entries.map((entry) => [entry.interval, entry.analysis])),
    analysisStatus: entries.some((entry) => entry.source === "fallback") ? "fallback" : "ready",
    entries,
  };
}

function clearIntermissionTimers() {
  (state.intermission?.timeouts || []).forEach((timeoutId) => clearTimeout(timeoutId));
  if (state.intermission) {
    state.intermission.timeouts = [];
  }
}

function clearIntermissionOverlay() {
  if (!dom.intermissionOverlay) {
    return;
  }
  dom.intermissionOverlay.className = "intermission-overlay";
  dom.intermissionOverlay.setAttribute("aria-hidden", "true");
  dom.intermissionOverlay.innerHTML = "";
  delete dom.intermissionOverlay.dataset.contentKey;
}

function scheduleIntermissionTimeout(delay, callback) {
  const timeoutId = setTimeout(callback, delay);
  state.intermission.timeouts.push(timeoutId);
}

function preloadNextCoinSnapshot(token) {
  const nextIndex = (state.intermission.frozenCoinIndex + 1) % CONFIG.coins.length;
  const coin = CONFIG.coins[nextIndex];
  state.intermission.nextCoinIndex = nextIndex;
  loadCoinSnapshot(coin)
    .then((snapshot) => {
      if (!state.intermission.active || state.intermission.token !== token) {
        return;
      }
      state.intermission.preloadedSnapshot = snapshot;
      state.intermission.snapshotReady = true;
    })
    .catch(() => {
      if (!state.intermission.active || state.intermission.token !== token) {
        return;
      }
      state.intermission.preloadedSnapshot = null;
      state.intermission.snapshotReady = false;
    });
}

function activateNextCoinForOpening(token) {
  if (!state.intermission.active || state.intermission.token !== token) {
    return;
  }

  const nextIndex = state.intermission.nextCoinIndex ?? ((state.intermission.frozenCoinIndex + 1) % CONFIG.coins.length);
  activateCoin(nextIndex, {
    resetRotation: false,
    intervalIndex: 0,
    prefetchedSnapshot: state.intermission.preloadedSnapshot,
  }).catch(() => {});
}

function buildIntermissionSummaryStage(summary, intermission) {
  const header = summary
    ? `<div class="intermission-readline">Weighted read: ${escapeHtml(summary.biasPhrase)}</div>`
    : `<div class="intermission-readline">Analyzing top 3 patterns across 6 timeframes...</div>`;

  if (!summary) {
    return `
      <div class="intermission-stage loading">
        <span class="intermission-eyebrow">Cycle complete</span>
        <strong class="intermission-coin">${escapeHtml(intermission.coin?.pair || "")}</strong>
        ${header}
        <p class="intermission-loading-copy">Gathering the strongest pattern reads from 4h down to 1m.</p>
      </div>
    `;
  }

  let cumulativeDelay = 120;
  const subtitleMarkup = summary.subtitleLines
    .map((line) => {
      const words = line.split(/\s+/).filter(Boolean);
      const lineStart = cumulativeDelay;
      const wordMarkup = words
        .map((word, index) => `<span class="subtitle-word" style="animation-delay:${lineStart + index * 70}ms">${escapeHtml(word)}</span>`)
        .join("");
      cumulativeDelay += words.length * 70 + 340 + 420;
      return `<p class="subtitle-line">${wordMarkup}</p>`;
    })
    .join("");

  return `
    <div class="intermission-stage ready ${intermission.analysisStatus === "fallback" ? "fallback" : ""}">
      <span class="intermission-eyebrow">Cycle complete</span>
      <strong class="intermission-coin">${escapeHtml(intermission.coin?.pair || "")}</strong>
      ${header}
      <div class="intermission-subtitles">${subtitleMarkup}</div>
    </div>
  `;
}

function buildIntermissionOpeningStage(intermission) {
  const nextCoin = CONFIG.coins[intermission.nextCoinIndex ?? ((intermission.frozenCoinIndex + 1) % CONFIG.coins.length)] || null;
  const nextCoinName = nextCoin?.spokenName || nextCoin?.name || nextCoin?.symbol || "the next coin";
  return `
    <div class="intermission-stage opening-stage ready">
      <span class="intermission-eyebrow">Next Rotation</span>
      <strong class="intermission-opening-copy">Let's proceed to ${escapeHtml(nextCoinName)}'s live analysis.</strong>
      <div class="intermission-readline">Doors opening now.</div>
    </div>
  `;
}

function buildIntermissionNewsStage(intermission) {
  const newsItems = intermission.newsItems || [];
  const statusText = intermission.newsStatus === "fallback"
    ? "Showing the latest cached crypto headlines while live feeds refresh."
    : intermission.newsStatus === "cached"
      ? "Recently refreshed crypto headlines are queued for the next rotation."
      : "Live crypto headlines are rotating in from the current news tape.";

  if (!newsItems.length) {
    return `
      <div class="intermission-stage loading">
        <span class="intermission-eyebrow">Current Crypto News</span>
        <strong class="intermission-coin">${escapeHtml(intermission.coin?.pair || "")}</strong>
        <div class="intermission-readline">Refreshing the top 3 crypto headlines...</div>
        <p class="intermission-loading-copy">The feed is syncing from CoinDesk and Cointelegraph. The next coin will open as soon as the news slate completes.</p>
      </div>
    `;
  }

  return `
    <div class="intermission-stage intermission-news-stage ready ${intermission.newsStatus === "fallback" ? "fallback" : ""}">
      <span class="intermission-eyebrow">Current Crypto News</span>
      <strong class="intermission-news-title">Top 3 Crypto Headlines</strong>
      <div class="intermission-readline">${escapeHtml(statusText)}</div>
      <div class="intermission-news-grid">
        ${newsItems.map((item, index) => `
          <article class="intermission-news-card rank-${index + 1}" data-news-index="${index}" style="--news-delay:${140 + index * 520}ms">
            <div class="intermission-news-head">
              <span class="intermission-news-rank">#${index + 1}</span>
              <span class="intermission-news-source">${escapeHtml(item.source || "Crypto desk")}</span>
              <span class="intermission-news-age">${escapeHtml(item.relativeTime || "Now")}</span>
            </div>
            <strong class="intermission-news-headline">${escapeHtml(item.title)}</strong>
            <p class="intermission-news-summary">${escapeHtml(item.summary)}</p>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function buildIntermissionStage(intermission) {
  if (intermission.phase === "opening") {
    return buildIntermissionOpeningStage(intermission);
  }
  if (intermission.phase === "news") {
    return buildIntermissionNewsStage(intermission);
  }
  return buildIntermissionSummaryStage(intermission.summary, intermission);
}

function renderIntermissionOverlay() {
  if (!dom.intermissionOverlay) {
    return;
  }

  if (!state.intermission.active) {
    clearIntermissionOverlay();
    return;
  }

  const phaseClass = `phase-${state.intermission.phase}`;
  dom.intermissionOverlay.className = `intermission-overlay active ${phaseClass} ${state.intermission.summary ? "summary-ready" : "summary-loading"} ${state.intermission.newsItems?.length ? "news-ready" : "news-loading"}`;
  dom.intermissionOverlay.setAttribute("aria-hidden", "false");

  const stageView = state.intermission.phase === "opening"
    ? "opening"
    : state.intermission.phase === "news"
      ? "news"
      : "summary";
  const stageSpecificKey = stageView === "news"
    ? [
        state.intermission.newsStatus,
        (state.intermission.newsItems || []).map((item) => item.title).join("|") || "no-news",
      ].join("::")
    : stageView === "opening"
      ? [
          state.intermission.nextCoinIndex ?? "",
          CONFIG.coins[state.intermission.nextCoinIndex ?? 0]?.spokenName || "",
        ].join("::")
      : [
          state.intermission.analysisStatus,
          state.intermission.summary?.subtitleLines?.join("|") || "loading",
          state.intermission.summary?.biasPhrase || "",
        ].join("::");
  const contentKey = [
    state.intermission.token,
    stageView,
    stageSpecificKey,
    state.intermission.coin?.pair || "",
  ].join("::");

  if (dom.intermissionOverlay.dataset.contentKey === contentKey) {
    return;
  }

  dom.intermissionOverlay.dataset.contentKey = contentKey;
  dom.intermissionOverlay.innerHTML = `
    <div class="intermission-door intermission-door-left">
      <div class="intermission-door-sheen"></div>
    </div>
    <div class="intermission-door intermission-door-right">
      <div class="intermission-door-sheen"></div>
    </div>
    <div class="intermission-stage-wrap">
      ${buildIntermissionStage(state.intermission)}
      <div class="intermission-live-subtitle" data-intermission-live-subtitle></div>
    </div>
  `;
  renderIntermissionLiveSubtitle();
}

async function loadIntermissionSummary(token, coin, cachedIntervalAnalyses) {
  try {
    const result = await collectIntermissionAnalyses(coin, cachedIntervalAnalyses);
    if (!state.intermission.active || state.intermission.token !== token) {
      return;
    }
    state.intermission.summary = intermissionEngine.buildIntermissionSummary(
      result.intervalAnalyses,
      coin,
      detectorEngine.TOP_DOWN_INTERVALS || intermissionEngine.DEFAULT_INTERVAL_ORDER,
      { analysisStatus: result.analysisStatus }
    );
    state.intermission.analysisStatus = result.analysisStatus;
    renderIntermissionOverlay();
  } catch {
    if (!state.intermission.active || state.intermission.token !== token) {
      return;
    }
    state.intermission.summary = intermissionEngine.buildIntermissionSummary(
      cachedIntervalAnalyses,
      coin,
      detectorEngine.TOP_DOWN_INTERVALS || intermissionEngine.DEFAULT_INTERVAL_ORDER,
      { analysisStatus: "fallback" }
    );
    state.intermission.analysisStatus = "fallback";
    renderIntermissionOverlay();
  }
}

async function loadIntermissionPodcast(token, coin, cachedIntervalAnalyses) {
  if (!voiceDirector.podcastReady) {
    return;
  }

  try {
    const podcastAnalysis = await collectPodcastAnalyses(coin, cachedIntervalAnalyses);
    if (!state.intermission.active || state.intermission.token !== token) {
      return;
    }
    state.intermission.podcastIntervalAnalyses = podcastAnalysis.intervalAnalyses;
    const response = await requestPodcastRender(
      buildPodcastPayload("intermission_full", {
        coin,
        entries: podcastAnalysis.entries,
        newsItems: state.intermission.newsItems || [],
      })
    );
    if (!state.intermission.active || state.intermission.token !== token) {
      return;
    }
    state.intermission.podcastPackage = response;
    state.intermission.podcastStatus = response.ready ? "ready" : "fallback";
  } catch {
    if (!state.intermission.active || state.intermission.token !== token) {
      return;
    }
    state.intermission.podcastPackage = null;
    state.intermission.podcastStatus = "error";
  }
}

async function loadIntermissionNews(token) {
  try {
    const result = await fetchCurrentCryptoNews();
    if (!state.intermission.active || state.intermission.token !== token) {
      return;
    }
    state.intermission.newsItems = result.items.slice(0, 3);
    state.intermission.newsStatus = result.status;
    renderIntermissionOverlay();
  } catch {
    if (!state.intermission.active || state.intermission.token !== token) {
      return;
    }
    state.intermission.newsItems = state.latestNewsItems.slice(0, 3);
    state.intermission.newsStatus = state.intermission.newsItems.length ? "fallback" : "empty";
    renderIntermissionOverlay();
  }
}

async function runIntermissionPodcastSequence(token) {
  const startedAt = Date.now();
  if (!state.intermission.active || state.intermission.token !== token) {
    return false;
  }

  if (!state.intermission.podcastPackage) {
    await loadIntermissionPodcast(token, state.intermission.coin, state.intermission.cachedIntervalAnalyses || {});
  }

  if (!state.intermission.active || state.intermission.token !== token) {
    return false;
  }

  const response = state.intermission.podcastPackage;
  if (!response?.sequence?.length) {
    return false;
  }

  await playCommentarySequence(response.sequence, {
    displayMode: "intermission",
    modeLabel: "Podcast roundtable",
    onClipStart: (clip) => {
      if (!state.intermission.active || state.intermission.token !== token) {
        return;
      }
      const nextPhase = clip.stage === "news" ? "news" : "summary";
      if (state.intermission.phase !== nextPhase) {
        state.intermission.phase = nextPhase;
        renderIntermissionOverlay();
      }
    },
  });

  if (!state.intermission.active || state.intermission.token !== token) {
    return true;
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed < INTERMISSION_SUMMARY_MIN_MS + INTERMISSION_NEWS_MIN_MS) {
    await waitMs(INTERMISSION_SUMMARY_MIN_MS + INTERMISSION_NEWS_MIN_MS - elapsed);
  }
  return true;
}

function startIntermission() {
  if (state.intermission.active) {
    return;
  }

  const token = Date.now();
  const coin = { ...currentCoin() };
  const cachedIntervalAnalyses = captureCachedIntervalAnalyses();
  state.intermission = {
    active: true,
    phase: "closing",
    startedAt: Date.now(),
    frozenCoinIndex: state.currentIndex,
    frozenIntervalIndex: state.currentIntervalIndex,
    coin,
    summary: null,
    analysisStatus: "loading",
    newsItems: [],
    newsStatus: "loading",
    snapshotReady: false,
    token,
    timeouts: [],
    cachedIntervalAnalyses,
    preloadedSnapshot: null,
    nextCoinIndex: (state.currentIndex + 1) % CONFIG.coins.length,
    podcastPackage: null,
    podcastStatus: voiceDirector.podcastReady ? "loading" : "idle",
    podcastIntervalAnalyses: {},
    subtitleClip: null,
  };

  beginIntermissionVoice(token);
  resetLiveCommentaryObservation();
  renderIntermissionOverlay();
  loadIntermissionSummary(token, coin, cachedIntervalAnalyses).catch(() => {});
  loadIntermissionNews(token).catch(() => {});
  loadIntermissionPodcast(token, coin, cachedIntervalAnalyses).catch(() => {});
  preloadNextCoinSnapshot(token);

  scheduleIntermissionTimeout(INTERMISSION_DOOR_CLOSE_MS, () => {
    if (!state.intermission.active || state.intermission.token !== token) {
      return;
    }
    state.intermission.phase = "summary";
    renderIntermissionOverlay();
    runIntermissionSequence(token).catch(() => {
      if (!state.intermission.active || state.intermission.token !== token) {
        return;
      }
      state.intermission.phase = "opening";
      activateNextCoinForOpening(token);
      renderIntermissionOverlay();
      scheduleIntermissionTimeout(INTERMISSION_DOOR_OPEN_MS, () => {
        finishIntermission(token);
      });
    });
  });
}

function finishIntermission(token) {
  if (!state.intermission.active || state.intermission.token !== token) {
    return;
  }

  const nextIndex = state.intermission.nextCoinIndex ?? ((state.intermission.frozenCoinIndex + 1) % CONFIG.coins.length);
  const needsActivation = state.currentIndex === state.intermission.frozenCoinIndex;
  const prefetchedSnapshot = state.intermission.preloadedSnapshot;
  clearIntermissionTimers();
  state.intermission = {
    active: false,
    phase: "idle",
    startedAt: 0,
    frozenCoinIndex: null,
    frozenIntervalIndex: null,
    coin: null,
    summary: null,
    analysisStatus: "idle",
    newsItems: [],
    newsStatus: "idle",
    snapshotReady: false,
    token: 0,
    timeouts: [],
    cachedIntervalAnalyses: {},
    preloadedSnapshot: null,
    nextCoinIndex: null,
    podcastPackage: null,
    podcastStatus: "idle",
    podcastIntervalAnalyses: {},
    subtitleClip: null,
  };
  endIntermissionVoice(token);
  resetLiveCommentaryObservation();
  clearIntermissionOverlay();

  if (needsActivation) {
    activateCoin(nextIndex, {
      resetRotation: true,
      intervalIndex: 0,
      prefetchedSnapshot,
    }).catch(() => {});
    return;
  }

  state.rotationStartedAt = Date.now();
  state.currentIntervalIndex = 0;
  CONFIG.interval = currentInterval();
  render();
}

function cancelIntermission() {
  if (!state.intermission.active) {
    return;
  }
  clearIntermissionTimers();
  endIntermissionVoice(state.intermission.token);
  state.intermission = {
    active: false,
    phase: "idle",
    startedAt: 0,
    frozenCoinIndex: null,
    frozenIntervalIndex: null,
    coin: null,
    summary: null,
    analysisStatus: "idle",
    newsItems: [],
    newsStatus: "idle",
    snapshotReady: false,
    token: 0,
    timeouts: [],
    cachedIntervalAnalyses: {},
    preloadedSnapshot: null,
    nextCoinIndex: null,
    podcastPackage: null,
    podcastStatus: "idle",
    podcastIntervalAnalyses: {},
    subtitleClip: null,
  };
  clearIntermissionOverlay();
  resetLiveCommentaryObservation();
}

function clearSocket() {
  state.intentionalSocketClose = true;
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
  if (state.socket) {
    state.socket.close();
    state.socket = null;
  }
}

function connectSocket(coin, loadSequence) {
  clearSocket();
  state.intentionalSocketClose = false;
  const streamName = coin.marketSymbol.toLowerCase();
  const interval = currentInterval();
  const url = `${CONFIG.wsBaseUrl}${streamName}@kline_${interval}/${streamName}@ticker`;
  const socket = new WebSocket(url);
  state.socket = socket;

  socket.addEventListener("open", () => {
    if (loadSequence !== state.loadSequence) {
      socket.close();
      return;
    }
    state.isMock = false;
    if (dom.engineStatus) {
      dom.engineStatus.textContent = `Binance ${currentInterval()} live`;
    }
  });

  socket.addEventListener("message", (event) => {
    if (loadSequence !== state.loadSequence) {
      return;
    }

    const payload = JSON.parse(event.data);
    const data = payload.data || payload;
    if (payload.stream?.includes("@ticker")) {
      state.liveTicker = normalizeTicker(data);
      state.marketSnapshots[coin.marketSymbol] = state.liveTicker;
      if (state.candles.length && !shouldFreezeUnderlyingScene()) {
        renderText();
        renderIntervalBanner();
        renderTicker();
        updateCountdown();
      }
      return;
    }

    if (payload.stream?.includes(`@kline_${interval}`) && data.k) {
      const kline = data.k;
      const nextCandle = {
        openTime: Number(kline.t),
        open: Number(kline.o),
        high: Number(kline.h),
        low: Number(kline.l),
        close: Number(kline.c),
        volume: Number(kline.v),
        closeTime: Number(kline.T),
      };

      const lastCandle = last(state.candles);
      if (!lastCandle || lastCandle.openTime !== nextCandle.openTime) {
        state.candles.push(nextCandle);
      } else {
        state.candles[state.candles.length - 1] = nextCandle;
      }

      if (state.candles.length > CONFIG.chartPoints) {
        state.candles = state.candles.slice(-CONFIG.chartPoints);
      }

      recomputeDerivedState();
      if (!shouldFreezeUnderlyingScene()) {
        render();
      }
      if (kline.x) {
        refreshTopDownAnalysis(coin).catch(() => {});
      }
    }
  });

  socket.addEventListener("close", () => {
    if (state.intentionalSocketClose || loadSequence !== state.loadSequence) {
      return;
    }
    if (dom.engineStatus) {
      dom.engineStatus.textContent = "Reconnecting to Binance...";
    }
    state.reconnectTimer = setTimeout(() => connectSocket(coin, loadSequence), CONFIG.reconnectMs);
  });

  socket.addEventListener("error", () => {
    if (dom.engineStatus) {
      dom.engineStatus.textContent = "Binance stream error";
    }
  });
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function fallbackSeed(symbol) {
  return symbol.split("").reduce((total, character) => total + character.charCodeAt(0) * 23, 19);
}

function buildFallbackCandles(coin) {
  const random = seededRandom(fallbackSeed(coin.marketSymbol));
  const intervalMs = intervalToMs(currentInterval());
  const basePrice = {
    BTCUSDT: 68000,
    ETHUSDT: 3900,
    SOLUSDT: 185,
    XRPUSDT: 0.74,
    DOGEUSDT: 0.24,
    PEPEUSDT: 0.0000094,
  }[coin.marketSymbol] || 100;

  const candles = [];
  let price = basePrice;
  for (let index = 0; index < CONFIG.chartPoints; index += 1) {
    const drift = (Math.sin(index / 5) * 0.0012) + (random() - 0.5) * 0.0038;
    const open = price;
    const close = price * (1 + drift);
    candles.push({
      openTime: Date.now() - (CONFIG.chartPoints - index) * intervalMs,
      open,
      high: Math.max(open, close) * (1 + random() * 0.0026),
      low: Math.min(open, close) * (1 - random() * 0.0026),
      close,
      volume: 24 + random() * 40,
      closeTime: Date.now(),
    });
    price = close;
  }
  return candles;
}

function startMockMode(coin, reason) {
  stopMockMode();
  state.isMock = true;
  state.alignmentLoading = false;
  state.topDownAnalysis = null;
  state.intervalAnalyses = {};
  state.timeframeAlignment = [];
  state.candles = buildFallbackCandles(coin);
  state.liveTicker = {
    lastPrice: last(state.candles).close,
    changePercent: percentageMove(state.candles[0].open, last(state.candles).close) * 100,
    highPrice: Math.max(...state.candles.map((candle) => candle.high)),
    lowPrice: Math.min(...state.candles.map((candle) => candle.low)),
    openPrice: state.candles[0].open,
    volume: sum(state.candles.map((candle) => candle.volume)),
  };
  recomputeDerivedState();
  refreshTopDownAnalysis(coin).catch(() => {});
  if (dom.engineStatus) {
    dom.engineStatus.textContent = reason ? "Binance unavailable, mock fallback" : "Mock fallback";
  }
  render();

  state.mockInterval = setInterval(() => {
    const lastCandle = last(state.candles);
    const nextClose = lastCandle.close * (1 + (Math.random() - 0.48) * 0.0022);
    const updated = {
      ...lastCandle,
      high: Math.max(lastCandle.high, nextClose),
      low: Math.min(lastCandle.low, nextClose),
      close: nextClose,
      volume: clamp(lastCandle.volume + (Math.random() - 0.4) * 3, 10, 100),
    };
    state.candles[state.candles.length - 1] = updated;
    state.liveTicker.lastPrice = nextClose;
    state.liveTicker.changePercent = percentageMove(state.candles[0].open, nextClose) * 100;
    recomputeDerivedState();
    render();
  }, 1500);
}

function stopMockMode() {
  if (state.mockInterval) {
    clearInterval(state.mockInterval);
    state.mockInterval = null;
  }
}

async function activateCoin(index, options = {}) {
  const { resetRotation = true, intervalIndex = state.currentIntervalIndex, prefetchedSnapshot = null } = options;
  if (!isIntermissionActive()) {
    interruptVoicePlayback();
    resetLiveCommentaryObservation();
  }
  state.currentIndex = index;
  if (resetRotation) {
    state.rotationStartedAt = Date.now();
  }
  state.currentIntervalIndex = clamp(intervalIndex, 0, MULTI_TIMEFRAME_INTERVALS.length - 1);
  CONFIG.interval = currentInterval();
  state.loadSequence += 1;
  const loadSequence = state.loadSequence;
  const coin = currentCoin();
  state.topDownAnalysis = null;
  state.intervalAnalyses = {};
  state.timeframeAlignment = [];

  clearSocket();
  stopMockMode();
  if (dom.engineStatus) {
    dom.engineStatus.textContent = `Loading Binance ${currentInterval()}...`;
  }

  try {
    const snapshot = prefetchedSnapshot || await loadCoinSnapshot(coin);
    if (loadSequence !== state.loadSequence) {
      return;
    }
    state.candles = snapshot.candles;
    state.liveTicker = snapshot.ticker;
    state.marketSnapshots[coin.marketSymbol] = snapshot.ticker;
    state.isMock = false;
    recomputeDerivedState();
    render();
    refreshTopDownAnalysis(coin).catch(() => {});
    connectSocket(coin, loadSequence);
  } catch (error) {
    if (loadSequence !== state.loadSequence) {
      return;
    }
    startMockMode(coin, error);
  }
}

function maybeRotateCoin() {
  if (isIntermissionActive()) {
    return;
  }
  const elapsed = Date.now() - state.rotationStartedAt;
  const rotationMs = CONFIG.rotationMinutes * 60 * 1000;
  if (elapsed >= rotationMs) {
    startIntermission();
  }
}

function maybeRotateTimeframe() {
  if (isIntermissionActive()) {
    return;
  }
  const elapsed = Date.now() - state.rotationStartedAt;
  const rotationMs = CONFIG.rotationMinutes * 60 * 1000;
  if (elapsed >= rotationMs) {
    return;
  }

  const nextIntervalIndex = clamp(Math.floor(elapsed / timeframeStepMs()), 0, MULTI_TIMEFRAME_INTERVALS.length - 1);
  if (nextIntervalIndex !== state.currentIntervalIndex) {
    activateCoin(state.currentIndex, { resetRotation: false, intervalIndex: nextIntervalIndex });
  }
}

function updateCountdown() {
  if (isIntermissionActive()) {
    return;
  }
  const rotationMs = CONFIG.rotationMinutes * 60 * 1000;
  const remaining = Math.max(0, rotationMs - (Date.now() - state.rotationStartedAt));
  const minutes = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
  dom.rotationCountdown.textContent = `${minutes}:${seconds}`;
  renderIntervalBanner();
  if (dom.signalPhase) {
    const cycleMeta = intervalCycleMeta();
    dom.signalPhase.textContent = cycleMeta.isLastStep
      ? `${currentInterval()} · next ${nextCoin().symbol} in ${formatClock(cycleMeta.remainingInterval)}`
      : `${currentInterval()} -> ${cycleMeta.nextLabel} in ${formatClock(cycleMeta.remainingInterval)}`;
  }
}

function linePath(values, width, height, minValue, maxValue) {
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - minValue) / Math.max(maxValue - minValue, 1e-9)) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildAreaPath(values, width, height, minValue, maxValue) {
  const line = linePath(values, width, height, minValue, maxValue);
  return `${line} L ${width} ${height} L 0 ${height} Z`;
}

function offsetSvgPath(path, xOffset) {
  return path.replace(/([ML]) (\d+\.\d+) (\d+\.\d+)/g, (_, command, x, y) => {
    return `${command} ${(Number(x) + xOffset).toFixed(2)} ${y}`;
  });
}

function buildSmoothPath(points) {
  if (!points.length) {
    return "";
  }
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  }
  if (points.length === 2) {
    return buildPolylinePath(points);
  }

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] || points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] || next;
    const control1X = current.x + (next.x - previous.x) / 6;
    const control1Y = current.y + (next.y - previous.y) / 6;
    const control2X = next.x - (afterNext.x - current.x) / 6;
    const control2Y = next.y - (afterNext.y - current.y) / 6;
    path += ` C ${control1X.toFixed(2)} ${control1Y.toFixed(2)} ${control2X.toFixed(2)} ${control2Y.toFixed(2)} ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }
  return path;
}

function buildPolylinePath(points) {
  if (!points.length) {
    return "";
  }
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function buildPatternTracePoints(candles, startIndex, chartLeft, candleSlot, mapY) {
  if (!candles.length) {
    return [];
  }

  const points = [];
  const first = candles[0];
  const second = candles[1] || first;
  points.push({
    localIndex: 0,
    kind: second.close >= first.close ? "low" : "high",
    price: second.close >= first.close ? first.low : first.high,
  });

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
    const lastPoint = points[points.length - 1];

    if (lastPoint?.kind === kind) {
      const isMoreExtreme = kind === "high" ? price >= lastPoint.price : price <= lastPoint.price;
      if (isMoreExtreme) {
        points[points.length - 1] = { localIndex: index, kind, price };
      }
      continue;
    }

    if (lastPoint && index - lastPoint.localIndex < 2) {
      const isMoreExtreme = kind === "high" ? price >= lastPoint.price : price <= lastPoint.price;
      if (isMoreExtreme) {
        points[points.length - 1] = { localIndex: index, kind, price };
      }
      continue;
    }

    points.push({ localIndex: index, kind, price });
  }

  const lastIndex = candles.length - 1;
  const last = candles[lastIndex];
  const beforeLast = candles[lastIndex - 1] || last;
  const lastKind = last.close >= beforeLast.close ? "high" : "low";
  const lastPrice = lastKind === "high" ? last.high : last.low;
  const finalPoint = points[points.length - 1];

  if (!finalPoint || finalPoint.localIndex !== lastIndex) {
    if (finalPoint?.kind === lastKind) {
      const isMoreExtreme = lastKind === "high" ? lastPrice >= finalPoint.price : lastPrice <= finalPoint.price;
      if (isMoreExtreme) {
        points[points.length - 1] = { localIndex: lastIndex, kind: lastKind, price: lastPrice };
      }
    } else {
      points.push({ localIndex: lastIndex, kind: lastKind, price: lastPrice });
    }
  }

  if (points.length < 3) {
    return candles.map((candle, index) => ({
      x: chartLeft + (startIndex + index) * candleSlot + candleSlot / 2,
      y: mapY(candle.close),
    }));
  }

  return points.map((point) => ({
    x: chartLeft + (startIndex + point.localIndex) * candleSlot + candleSlot / 2,
    y: mapY(point.price),
  }));
}

function cacheChartCinematicDom() {
  chartCinematic.dom.svg = dom.priceChart;
  chartCinematic.dom.cameraRoot = dom.priceChart?.querySelector("#chart-camera-root") || null;
  chartCinematic.dom.staticLevelsLayer = dom.priceChart?.querySelector("#chart-static-levels-layer") || null;
  chartCinematic.dom.zoneUnderlay = dom.priceChart?.querySelector("#chart-zone-underlay") || null;
  chartCinematic.dom.candleHighlightLayer = dom.priceChart?.querySelector("#chart-candle-highlight-layer") || null;
  chartCinematic.dom.zoneOverlay = dom.priceChart?.querySelector("#chart-zone-overlay") || null;
  chartCinematic.dom.priceCalloutLayer = dom.priceChart?.querySelector("#chart-price-callout-layer") || null;
  chartCinematic.dom.zoneGroup = dom.priceChart?.querySelector("#chart-zone-group") || null;
  chartCinematic.dom.zoneHalo = dom.priceChart?.querySelector("#chart-zone-halo") || null;
  chartCinematic.dom.zoneBorder = dom.priceChart?.querySelector("#chart-zone-border") || null;
  chartCinematic.dom.zoneFill = dom.priceChart?.querySelector("#chart-zone-fill") || null;
  chartCinematic.dom.zoneLabel = dom.priceChart?.querySelector("#chart-zone-label") || null;
  chartCinematic.dom.zoneLabelCard = dom.priceChart?.querySelector("#chart-zone-label-card") || null;
  chartCinematic.dom.zoneLabelTitle = dom.priceChart?.querySelector("#chart-zone-label-title") || null;
  chartCinematic.dom.zoneLabelRange = dom.priceChart?.querySelector("#chart-zone-label-range") || null;
  chartCinematic.dom.candleHighlightGroup = dom.priceChart?.querySelector("#chart-zone-candle-highlights") || null;
}

function extractMentionedPriceLevels(text, layout = chartCinematic.layout) {
  if (!text || !layout) {
    return [];
  }
  const matches = String(text).match(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g) || [];
  const seen = new Set();
  return matches
    .map((value) => Number(value.replaceAll(",", "")))
    .filter((value) => Number.isFinite(value))
    .filter((value) => value >= layout.minPrice * 0.8 && value <= layout.maxPrice * 1.2)
    .filter((value) => {
      const key = value.toFixed(value < 1 ? 6 : 2);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function buildStaticLevelMarkup(layout) {
  if (!layout) {
    return "";
  }
  const bounds = deriveSupportResistanceBounds(layout.candles || []);
  if (!Number.isFinite(bounds.support) || !Number.isFinite(bounds.resistance)) {
    return "";
  }
  const levels = [
    { name: "Support", value: bounds.support, stroke: "#7dffb8", glow: "rgba(111, 255, 181, 0.22)" },
    { name: "Resistance", value: bounds.resistance, stroke: "#ff8aa8", glow: "rgba(255, 118, 154, 0.22)" },
  ];
  return levels.map((level) => {
    const y = layout.mapY(level.value);
    return `
      <g class="chart-static-level ${level.name.toLowerCase()}">
        <line x1="${layout.chartLeft}" y1="${y.toFixed(2)}" x2="${layout.chartLeft + layout.chartWidth}" y2="${y.toFixed(2)}" stroke="${level.glow}" stroke-width="7" stroke-linecap="round" />
        <line x1="${layout.chartLeft}" y1="${y.toFixed(2)}" x2="${layout.chartLeft + layout.chartWidth}" y2="${y.toFixed(2)}" stroke="${level.stroke}" stroke-width="1.5" stroke-dasharray="8 7" opacity="0.72" />
        <rect x="${(layout.chartLeft + 8).toFixed(2)}" y="${(y - 18).toFixed(2)}" width="138" height="22" rx="11" fill="rgba(10, 14, 22, 0.68)" stroke="rgba(255,255,255,0.08)" />
        <text x="${(layout.chartLeft + 18).toFixed(2)}" y="${(y - 4).toFixed(2)}" fill="${level.stroke}" font-size="11" font-weight="700">${level.name} · ${escapeHtml(formatPrice(level.value))}</text>
      </g>
    `;
  }).join("");
}

function buildPriceCalloutMarkup(lines, layout) {
  if (!lines?.length || !layout) {
    return "";
  }
  return lines.map((line, index) => {
    const y = layout.mapY(line.value);
    const labelWidth = Math.min(180, Math.max(118, line.label.length * 7.2 + 18));
    const labelX = clamp(layout.chartLeft + layout.chartWidth - labelWidth - 10, layout.chartLeft + 20, layout.chartLeft + layout.chartWidth - labelWidth - 10);
    const labelY = clamp(y - 17 - index * 28, 26, layout.priceTop - 32);
    return `
      <g class="chart-price-callout-line" data-price-key="${escapeHtml(line.key)}">
        <line x1="${layout.chartLeft}" y1="${y.toFixed(2)}" x2="${layout.chartLeft + layout.chartWidth}" y2="${y.toFixed(2)}" stroke="rgba(255, 210, 123, 0.2)" stroke-width="12" stroke-linecap="round" />
        <line x1="${layout.chartLeft}" y1="${y.toFixed(2)}" x2="${layout.chartLeft + layout.chartWidth}" y2="${y.toFixed(2)}" stroke="#ffd27b" stroke-width="2.1" stroke-dasharray="10 7" stroke-linecap="round" />
        <rect x="${labelX.toFixed(2)}" y="${labelY.toFixed(2)}" width="${labelWidth.toFixed(2)}" height="22" rx="11" fill="rgba(17, 14, 10, 0.84)" stroke="rgba(255, 214, 138, 0.22)" />
        <text x="${(labelX + 12).toFixed(2)}" y="${(labelY + 14).toFixed(2)}" fill="#ffe6b5" font-size="11" font-weight="700">${escapeHtml(line.label)}</text>
      </g>
    `;
  }).join("");
}

function renderStaticLevels() {
  if (!chartCinematic.dom.staticLevelsLayer || !chartCinematic.layout) {
    return;
  }
  chartCinematic.dom.staticLevelsLayer.innerHTML = buildStaticLevelMarkup(chartCinematic.layout);
}

function updatePriceCalloutPresentation(now = currentAnimationTime()) {
  if (!chartCinematic.dom.priceCalloutLayer || !chartCinematic.layout) {
    return;
  }

  if (!chartCinematic.priceFocus.lines.length) {
    chartCinematic.priceFocus.renderKey = "";
    chartCinematic.dom.priceCalloutLayer.innerHTML = "";
    chartCinematic.dom.priceCalloutLayer.setAttribute("opacity", "0");
    return;
  }

  const renderKey = chartCinematic.priceFocus.lines.map((line) => line.key).join("|");
  if (chartCinematic.priceFocus.renderKey !== renderKey || !chartCinematic.dom.priceCalloutLayer.childElementCount) {
    chartCinematic.priceFocus.renderKey = renderKey;
    chartCinematic.dom.priceCalloutLayer.innerHTML = buildPriceCalloutMarkup(chartCinematic.priceFocus.lines, chartCinematic.layout);
  }

  const activeOpacity = chartCinematic.priceFocus.active
    ? 0.54 + 0.38 * (0.5 - Math.cos((((now - chartCinematic.priceFocus.startedAt) % 1500) / 1500) * Math.PI * 2) / 2)
    : 0;
  chartCinematic.dom.priceCalloutLayer.setAttribute("opacity", activeOpacity.toFixed(3));
}

function setCommentaryPriceLinesFromClip(clip) {
  const layout = chartCinematic.layout;
  if (!layout) {
    return;
  }
  const levels = extractMentionedPriceLevels(clip?.text || "", layout);
  chartCinematic.priceFocus.lines = levels.map((value, index) => ({
    value,
    key: `${value.toFixed(value < 1 ? 6 : 2)}:${index}`,
    label: `${index === 0 ? "Mentioned Price" : "Reference Price"} · ${formatPrice(value)}`,
  }));
  chartCinematic.priceFocus.renderKey = chartCinematic.priceFocus.lines.map((line) => line.key).join("|");
  chartCinematic.priceFocus.active = chartCinematic.priceFocus.lines.length > 0;
  chartCinematic.priceFocus.startedAt = currentAnimationTime();
  chartCinematic.priceFocus.fadeOutStartedAt = 0;
  if (chartCinematic.dom.priceCalloutLayer) {
    chartCinematic.dom.priceCalloutLayer.innerHTML = buildPriceCalloutMarkup(chartCinematic.priceFocus.lines, layout);
    chartCinematic.dom.priceCalloutLayer.setAttribute("opacity", chartCinematic.priceFocus.active ? "0.72" : "0");
  }
}

function buildZoneOverlayMarkup(zone, layout) {
  if (!zone || !layout) {
    return {
      underlay: "",
      highlights: "",
      overlay: "",
    };
  }

  const cornerRadius = Math.max(12, Math.min(22, zone.height * 0.22));
  const palette = zone.palette;
  const labelWidth = Math.min(220, Math.max(128, Math.max(zone.label.length, zone.rangeLabel.length) * 7.2 + 28));
  const labelHeight = 42;
  const labelX = clamp(zone.x + zone.width / 2 - labelWidth / 2, layout.chartLeft + 6, layout.chartLeft + layout.chartWidth - labelWidth - 6);
  const labelY = clamp(zone.y + zone.height / 2 - labelHeight / 2, 32, layout.priceTop - labelHeight - 4);
  const candleGlowMarkup = zone.candleIndices
    .map((index) => {
      const candle = layout.candles[index];
      if (!candle) {
        return "";
      }
      const x = layout.chartLeft + index * layout.candleSlot + layout.candleSlot / 2;
      const yOpen = layout.mapY(candle.open);
      const yClose = layout.mapY(candle.close);
      const yHigh = layout.mapY(candle.high);
      const yLow = layout.mapY(candle.low);
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(Math.abs(yClose - yOpen), 4);
      const highlightWidth = Math.max(layout.candleSlot * 0.72, 7);
      return `
        <g>
          <line x1="${x.toFixed(2)}" y1="${yHigh.toFixed(2)}" x2="${x.toFixed(2)}" y2="${yLow.toFixed(2)}" stroke="${palette.border}" stroke-width="1.7" stroke-linecap="round" opacity="0.7" />
          <rect
            x="${(x - highlightWidth / 2).toFixed(2)}"
            y="${bodyTop.toFixed(2)}"
            width="${highlightWidth.toFixed(2)}"
            height="${bodyHeight.toFixed(2)}"
            rx="3"
            fill="rgba(255,255,255,0.06)"
            stroke="${palette.border}"
            stroke-width="1.15"
          />
        </g>
      `;
    })
    .join("");

  return {
    underlay: `
      <g id="chart-zone-group">
        <rect
          id="chart-zone-fill"
          x="${zone.x.toFixed(2)}"
          y="${zone.y.toFixed(2)}"
          width="${zone.width.toFixed(2)}"
          height="${zone.height.toFixed(2)}"
          rx="${cornerRadius.toFixed(2)}"
          fill="url(#${zone.type === "support" ? "supportZoneFill" : "resistanceZoneFill"})"
          fill-opacity="0"
          filter="url(#zoneSoftBlur)"
        />
      </g>
    `,
    highlights: `
      <g id="chart-zone-candle-highlights" opacity="0" style="mix-blend-mode:screen;">
        ${candleGlowMarkup}
      </g>
    `,
    overlay: `
      <g>
        <rect
          id="chart-zone-halo"
          x="${zone.x.toFixed(2)}"
          y="${zone.y.toFixed(2)}"
          width="${zone.width.toFixed(2)}"
          height="${zone.height.toFixed(2)}"
          rx="${cornerRadius.toFixed(2)}"
          fill="none"
          stroke="${palette.halo}"
          stroke-width="12"
          stroke-opacity="0"
          filter="url(#zoneNeonGlow)"
        />
        <rect
          id="chart-zone-border"
          x="${zone.x.toFixed(2)}"
          y="${zone.y.toFixed(2)}"
          width="${zone.width.toFixed(2)}"
          height="${zone.height.toFixed(2)}"
          rx="${cornerRadius.toFixed(2)}"
          fill="none"
          stroke="${palette.border}"
          stroke-width="2.6"
          stroke-opacity="0"
          filter="url(#zoneEdgeGlow)"
        />
        <g id="chart-zone-label" opacity="0">
          <rect
            id="chart-zone-label-card"
            x="${labelX.toFixed(2)}"
            y="${labelY.toFixed(2)}"
            width="${labelWidth.toFixed(2)}"
            height="${labelHeight.toFixed(2)}"
            rx="12"
            fill="rgba(14, 18, 28, 0.46)"
            stroke="rgba(255,255,255,0.16)"
            filter="url(#zoneLabelGlow)"
          />
          <text id="chart-zone-label-title" x="${(labelX + 14).toFixed(2)}" y="${(labelY + 17).toFixed(2)}" fill="${palette.text}" font-size="12" font-weight="700">${escapeHtml(zone.label)}</text>
          <text id="chart-zone-label-range" x="${(labelX + 14).toFixed(2)}" y="${(labelY + 32).toFixed(2)}" fill="rgba(255,255,255,0.76)" font-size="11" font-weight="500">${escapeHtml(zone.rangeLabel)}</text>
        </g>
      </g>
    `,
  };
}

function rebuildChartZoneOverlay(force = false) {
  cacheChartCinematicDom();
  const zone = chartCinematic.zone.resolved;
  const layout = chartCinematic.layout;
  if (!chartCinematic.dom.zoneUnderlay || !chartCinematic.dom.zoneOverlay || !chartCinematic.dom.candleHighlightLayer) {
    return;
  }

  if (!zone) {
    if (chartCinematic.zone.renderKey || force) {
      chartCinematic.dom.zoneUnderlay.innerHTML = "";
      chartCinematic.dom.candleHighlightLayer.innerHTML = "";
      chartCinematic.dom.zoneOverlay.innerHTML = "";
      chartCinematic.zone.renderKey = "";
      cacheChartCinematicDom();
    }
    return;
  }

  if (!force && chartCinematic.zone.renderKey === zone.key) {
    return;
  }

  const markup = buildZoneOverlayMarkup(zone, layout);
  chartCinematic.dom.zoneUnderlay.innerHTML = markup.underlay;
  chartCinematic.dom.candleHighlightLayer.innerHTML = markup.highlights;
  chartCinematic.dom.zoneOverlay.innerHTML = markup.overlay;
  chartCinematic.zone.renderKey = zone.key;
  cacheChartCinematicDom();
}

function applyChartCameraTransform() {
  if (!chartCinematic.dom.cameraRoot) {
    return;
  }
  chartCinematic.dom.cameraRoot.setAttribute(
    "transform",
    `translate(${chartCinematic.camera.currentTx.toFixed(2)} ${chartCinematic.camera.currentTy.toFixed(2)}) scale(${chartCinematic.camera.currentScale.toFixed(4)})`
  );
}

function updateChartCamera(now) {
  if (!chartCinematic.camera.active) {
    applyChartCameraTransform();
    return;
  }

  const elapsed = clamp((now - chartCinematic.camera.startedAt) / Math.max(chartCinematic.camera.duration, 1), 0, 1);
  const eased = (chartCinematic.camera.easing || easeInOutCubic)(elapsed);
  chartCinematic.camera.currentScale = lerp(chartCinematic.camera.fromScale, chartCinematic.camera.targetScale, eased);
  chartCinematic.camera.currentTx = lerp(chartCinematic.camera.fromTx, chartCinematic.camera.targetTx, eased);
  chartCinematic.camera.currentTy = lerp(chartCinematic.camera.fromTy, chartCinematic.camera.targetTy, eased);
  if (elapsed >= 1) {
    chartCinematic.camera.active = false;
  }
  applyChartCameraTransform();
}

function zoneAnimationState(now) {
  const zone = chartCinematic.zone;
  const drawProgress = zone.drawStartedAt
    ? clamp((now - zone.drawStartedAt) / 320, 0, 1)
    : zone.visible
      ? 1
      : 0;
  const fadeOut = zone.fadeOutStartedAt
    ? 1 - clamp((now - zone.fadeOutStartedAt) / 520, 0, 1)
    : 1;
  const pulseWave = zone.pulseActive
    ? 0.5 - Math.cos((((now - zone.pulseStartedAt) % 1500) / 1500) * Math.PI * 2) / 2
    : 0;
  const labelProgress = zone.labelStartedAt
    ? clamp((now - zone.labelStartedAt) / 300, 0, 1)
    : drawProgress;
  return {
    drawProgress: drawProgress * fadeOut,
    pulseWave,
    labelProgress: labelProgress * fadeOut,
    fadeOut,
  };
}

function syncChartPresentation(force = false, now = currentAnimationTime()) {
  if (!dom.priceChart) {
    return;
  }

  cacheChartCinematicDom();
  renderStaticLevels();
  rebuildChartZoneOverlay(force);
  updateChartCamera(now);
  updatePriceCalloutPresentation(now);

  if (!chartCinematic.zone.resolved || !chartCinematic.dom.zoneFill) {
    return;
  }

  const visual = zoneAnimationState(now);
  const pulseOpacity = 0.2 + visual.pulseWave * 0.25;
  const haloOpacity = 0.16 + visual.pulseWave * 0.34;
  const highlightOpacity = chartCinematic.zone.highlightActive ? 0.2 + visual.pulseWave * 0.35 : 0;
  const scaleX = 0.92 + visual.drawProgress * 0.08;
  const scaleY = 0.86 + visual.drawProgress * 0.14;
  const zoneCenterX = chartCinematic.zone.resolved.x + chartCinematic.zone.resolved.width / 2;
  const zoneCenterY = chartCinematic.zone.resolved.y + chartCinematic.zone.resolved.height / 2;

  if (chartCinematic.dom.zoneGroup) {
    chartCinematic.dom.zoneGroup.setAttribute(
      "transform",
      `translate(${zoneCenterX.toFixed(2)} ${zoneCenterY.toFixed(2)}) scale(${scaleX.toFixed(4)} ${scaleY.toFixed(4)}) translate(${(-zoneCenterX).toFixed(2)} ${(-zoneCenterY).toFixed(2)})`
    );
    chartCinematic.dom.zoneGroup.setAttribute("opacity", visual.drawProgress.toFixed(3));
  }
  if (chartCinematic.dom.zoneFill) {
    chartCinematic.dom.zoneFill.setAttribute("fill-opacity", (pulseOpacity * visual.drawProgress).toFixed(3));
  }
  if (chartCinematic.dom.zoneHalo) {
    chartCinematic.dom.zoneHalo.setAttribute("stroke-opacity", (haloOpacity * visual.drawProgress).toFixed(3));
    chartCinematic.dom.zoneHalo.setAttribute("stroke-width", (10 + visual.pulseWave * 8).toFixed(2));
  }
  if (chartCinematic.dom.zoneBorder) {
    chartCinematic.dom.zoneBorder.setAttribute("stroke-opacity", (0.42 + visual.pulseWave * 0.38).toFixed(3));
    chartCinematic.dom.zoneBorder.setAttribute("stroke-width", (2.4 + visual.pulseWave * 1.9).toFixed(2));
  }
  if (chartCinematic.dom.candleHighlightGroup) {
    chartCinematic.dom.candleHighlightGroup.setAttribute("opacity", highlightOpacity.toFixed(3));
  }
  if (chartCinematic.dom.zoneLabel) {
    chartCinematic.dom.zoneLabel.setAttribute("opacity", visual.labelProgress.toFixed(3));
    chartCinematic.dom.zoneLabel.setAttribute(
      "transform",
      `translate(0 ${(8 - visual.labelProgress * 8).toFixed(2)})`
    );
  }

}

function executeChartSyncAction(action, now) {
  if (!chartCinematic.zone.resolved) {
    return;
  }

  if (action === "draw_zone") {
    chartCinematic.zone.visible = true;
    chartCinematic.zone.drawStartedAt = now;
    chartCinematic.zone.labelStartedAt = now + 80;
    syncChartPresentation(true, now);
    return;
  }
  if (action === "start_pulse") {
    chartCinematic.zone.visible = true;
    chartCinematic.zone.pulseActive = true;
    chartCinematic.zone.pulseStartedAt = now;
    return;
  }
  if (action === "highlight_candles") {
    chartCinematic.zone.highlightActive = true;
    return;
  }
  if (action === "zoom_out") {
    chartCinematic.zone.fadeOutStartedAt = now;
    startCameraAnimation(defaultCameraTarget(), 980, easeOutCubic);
    chartCinematic.sync.zoomOutStartedAt = now;
  }
}

function updateChartSync(now) {
  if (!chartCinematic.sync.active) {
    return;
  }

  const elapsedSeconds = (now - chartCinematic.sync.audioStartAt) / 1000;
  chartCinematic.sync.timeline.forEach((item) => {
    const key = `${item.time}:${item.action}`;
    if (!chartCinematic.sync.firedActions.has(key) && elapsedSeconds >= item.time) {
      chartCinematic.sync.firedActions.add(key);
      executeChartSyncAction(item.action, now);
    }
  });

  const syncEndAt = chartCinematic.sync.audioStartAt + chartCinematic.sync.durationMs + 1200;
  if (now >= syncEndAt || (chartCinematic.sync.zoomOutStartedAt && now - chartCinematic.sync.zoomOutStartedAt >= 1080)) {
    clearChartCommentaryFocus(false);
  }
}

function ensureChartCinematicLoop() {
  if (chartCinematic.rafId || typeof window === "undefined") {
    return;
  }

  const tick = (timestamp) => {
    chartCinematic.rafId = window.requestAnimationFrame(tick);
    updateChartSync(timestamp);
    syncChartPresentation(false, timestamp);
  };
  chartCinematic.rafId = window.requestAnimationFrame(tick);
}

function renderPriceChart() {
  const priceTop = 430;
  const volumeTop = 450;
  const volumeHeight = 80;
  const chartLeft = 30;
  const chartWidth = 1010;
  const candleSlot = chartWidth / Math.max(state.candles.length, 1);
  const candleWidth = candleSlot * 0.58;
  const maximumVolume = Math.max(...state.candles.map((entry) => entry.volume), 1);
  const prices = state.candles.flatMap((candle) => [candle.high, candle.low]);
  const maxPrice = Math.max(...prices) * 1.004;
  const minPrice = Math.min(...prices) * 0.996;
  const range = Math.max(maxPrice - minPrice, 1e-9);
  const mapY = (value) => priceTop - ((value - minPrice) / range) * (priceTop - 24);
  const mapX = (index) => chartLeft + index * candleSlot + candleSlot / 2;
  chartCinematic.layout = {
    chartLeft,
    chartWidth,
    candleSlot,
    candleWidth,
    priceTop,
    volumeTop,
    volumeHeight,
    minPrice,
    maxPrice,
    range,
    candles: state.candles,
    mapY,
    mapX,
  };

  let defs = `
    <defs>
      <linearGradient id="chartAreaGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(255, 196, 92, 0.24)" />
        <stop offset="100%" stop-color="rgba(255, 196, 92, 0)" />
      </linearGradient>
      <linearGradient id="priceLine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#ffcc74" />
        <stop offset="100%" stop-color="#ffe5a8" />
      </linearGradient>
      <linearGradient id="volumeUp" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(74, 255, 177, 0.72)" />
        <stop offset="100%" stop-color="rgba(74, 255, 177, 0.08)" />
      </linearGradient>
      <linearGradient id="volumeDown" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(255, 116, 95, 0.72)" />
        <stop offset="100%" stop-color="rgba(255, 116, 95, 0.08)" />
      </linearGradient>
      <filter id="softGlow">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="patternNeonGlow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="7.2" result="outerGlow" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.3" result="innerGlow" />
        <feMerge>
          <feMergeNode in="outerGlow" />
          <feMergeNode in="innerGlow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="resistanceZoneFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(255, 99, 145, 0.32)" />
        <stop offset="100%" stop-color="rgba(255, 99, 145, 0.02)" />
      </linearGradient>
      <linearGradient id="supportZoneFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(111, 255, 181, 0.34)" />
        <stop offset="100%" stop-color="rgba(111, 255, 181, 0.02)" />
      </linearGradient>
      <filter id="zoneSoftBlur" x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
      <filter id="zoneNeonGlow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="10" result="zoneBlur" />
        <feMerge>
          <feMergeNode in="zoneBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="zoneEdgeGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="4.2" result="edgeBlur" />
        <feMerge>
          <feMergeNode in="edgeBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="zoneLabelGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="4.4" result="glassBlur" />
        <feMerge>
          <feMergeNode in="glassBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  `;
  let cameraMarkup = "";

  for (let row = 0; row < 6; row += 1) {
    const y = 40 + row * 65;
    cameraMarkup += `<line x1="${chartLeft}" y1="${y}" x2="${chartLeft + chartWidth}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />`;
  }
  cameraMarkup += `<g id="chart-static-levels-layer"></g>`;

  const closes = state.candles.map((candle) => candle.close);
  const areaPath = offsetSvgPath(
    buildAreaPath(closes, chartWidth, priceTop - 24, minPrice, maxPrice),
    chartLeft
  );
  cameraMarkup += `<g id="chart-zone-underlay"></g>`;
  cameraMarkup += `<path d="${areaPath}" fill="url(#chartAreaGlow)" opacity="0.85" />`;

  state.candles.forEach((candle, index) => {
    const x = mapX(index);
    const yOpen = mapY(candle.open);
    const yClose = mapY(candle.close);
    const yHigh = mapY(candle.high);
    const yLow = mapY(candle.low);
    const rising = candle.close >= candle.open;
    const color = rising ? "#88f1a8" : "#ff7e68";
    const rectY = Math.min(yOpen, yClose);
    const rectHeight = Math.max(4, Math.abs(yClose - yOpen));
    cameraMarkup += `<line x1="${x}" y1="${yHigh}" x2="${x}" y2="${yLow}" stroke="${color}" stroke-width="1.4" opacity="0.95" />`;
    cameraMarkup += `<rect x="${x - candleWidth / 2}" y="${rectY}" width="${candleWidth}" height="${rectHeight}" rx="1.8" fill="${color}" />`;

    const volumeHeightPx = (candle.volume / maximumVolume) * volumeHeight;
    cameraMarkup += `
      <rect
        x="${x - candleWidth / 2}"
        y="${volumeTop + volumeHeight - volumeHeightPx}"
        width="${candleWidth}"
        height="${volumeHeightPx}"
        rx="1.2"
        fill="url(#${rising ? "volumeUp" : "volumeDown"})"
      />
    `;
  });

  const emaValues = calculateEMA(closes, 9);
  const emaPath = offsetSvgPath(
    linePath(emaValues, chartWidth, priceTop - 24, minPrice, maxPrice),
    chartLeft
  );
  cameraMarkup += `<path d="${emaPath}" fill="none" stroke="url(#priceLine)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#softGlow)" />`;
  cameraMarkup += `<g id="chart-candle-highlight-layer"></g>`;

  const activePattern = state.currentIntervalPattern;
  const activeSpan = activePattern?.span;
  const activeTrace = activePattern?.tracePoints || [];
  const activeGuides = activePattern?.guideLines || [];
  if (activeSpan && activeTrace.length) {
    const spanCandles = state.candles.slice(activeSpan.startIndex, activeSpan.endIndex + 1);
    const spanHigh = Math.max(...spanCandles.map((candle) => candle.high));
    const spanX = chartLeft + activeSpan.startIndex * candleSlot;
    const spanWidth = Math.max((activeSpan.endIndex - activeSpan.startIndex + 1) * candleSlot, 28);
    const tracePoints = activeTrace.map((point) => ({
      x: chartLeft + point.index * candleSlot + candleSlot / 2,
      y: mapY(point.price),
    }));
    const tracePath = tracePoints.length > 2 ? buildSmoothPath(tracePoints) : buildPolylinePath(tracePoints);
    const guidePaths = activeGuides.map((guide) => {
      const guidePoints = (guide.points || []).map((point) => ({
        x: chartLeft + point.index * candleSlot + candleSlot / 2,
        y: mapY(point.price),
      }));
      return guidePoints.length > 2 ? buildSmoothPath(guidePoints) : buildPolylinePath(guidePoints);
    });
    const structuralGuidesFirst = guidePaths.length >= 2
      && ["triangle", "wedge", "channel", "broadeningWedge", "pennant", "coil"].includes(activePattern?.pattern?.detectorType);
    const guideMarkup = guidePaths
      .map((guidePath) => {
        if (structuralGuidesFirst) {
          return `
            <path d="${guidePath}" fill="none" stroke="rgba(255, 70, 111, 0.18)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" filter="url(#patternNeonGlow)" />
            <path d="${guidePath}" fill="none" stroke="rgba(255, 74, 118, 0.32)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" filter="url(#patternNeonGlow)" />
            <path
              d="${guidePath}"
              fill="none"
              stroke="#ff4f77"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
              filter="url(#patternNeonGlow)"
              pathLength="100"
              stroke-dasharray="14 7"
              stroke-dashoffset="0"
            >
              <animate attributeName="stroke-dashoffset" values="0;-42" dur="1.1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.74;1;0.8" dur="1.1s" repeatCount="indefinite" />
            </path>
          `;
        }
        return `
          <path
            d="${guidePath}"
            fill="none"
            stroke="rgba(255, 118, 154, 0.66)"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-dasharray="8 8"
            filter="url(#patternNeonGlow)"
          />
        `;
      })
      .join("");
    const labelY = Math.max(32, mapY(spanHigh) - 16);
    const labelText = `${activePattern.pattern?.name || activePattern.title} · ${activeSpan.timeLabel}`;
    const labelWidth = Math.min(404, Math.max(214, labelText.length * 7.1));
    const labelX = clamp(spanX, chartLeft + 8, chartLeft + chartWidth - labelWidth - 8);
    const endAnchor = chartLeft + chartWidth - 190;

    cameraMarkup += `
      ${guideMarkup}
      <path d="${tracePath}" fill="none" stroke="${structuralGuidesFirst ? "rgba(255, 70, 111, 0.08)" : "rgba(255, 70, 111, 0.18)"}" stroke-width="${structuralGuidesFirst ? "10" : "20"}" stroke-linecap="round" stroke-linejoin="round" filter="url(#patternNeonGlow)" />
      <path d="${tracePath}" fill="none" stroke="${structuralGuidesFirst ? "rgba(255, 74, 118, 0.14)" : "rgba(255, 74, 118, 0.34)"}" stroke-width="${structuralGuidesFirst ? "5" : "10"}" stroke-linecap="round" stroke-linejoin="round" filter="url(#patternNeonGlow)" />
      <path
        d="${tracePath}"
        fill="none"
        stroke="#ff4f77"
        stroke-width="${structuralGuidesFirst ? "2.8" : "5.6"}"
        stroke-linecap="round"
        stroke-linejoin="round"
        filter="url(#patternNeonGlow)"
        pathLength="100"
        stroke-dasharray="14 7"
        stroke-dashoffset="0"
      >
        <animate attributeName="stroke-dashoffset" values="0;-42" dur="1.1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.72;1;0.78" dur="1.1s" repeatCount="indefinite" />
      </path>
      <path
        d="${tracePath}"
        fill="none"
        stroke="#ffe6ec"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        pathLength="100"
        stroke-dasharray="100"
        stroke-dashoffset="100"
      >
        <animate attributeName="stroke-dashoffset" values="100;0;0;100" keyTimes="0;0.42;0.82;1" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;0.96;0.92;0" dur="2.6s" repeatCount="indefinite" />
      </path>
      <circle cx="${tracePoints[0].x}" cy="${tracePoints[0].y}" r="4.4" fill="#ff7897" filter="url(#patternNeonGlow)">
        <animate attributeName="r" values="4.4;5.8;4.4" dur="1.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="${tracePoints[tracePoints.length - 1].x}" cy="${tracePoints[tracePoints.length - 1].y}" r="5.6" fill="#ffe0e7" filter="url(#patternNeonGlow)">
        <animate attributeName="r" values="5.6;7.4;5.6" dur="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.78;1;0.82" dur="1s" repeatCount="indefinite" />
      </circle>
      <circle r="4.6" fill="#ff6687" filter="url(#patternNeonGlow)">
        <animateMotion dur="2.6s" repeatCount="indefinite" path="${tracePath}" />
        <animate attributeName="opacity" values="0;1;1;0" dur="2.6s" repeatCount="indefinite" />
      </circle>
      <rect x="${labelX}" y="${labelY - 16}" width="${labelWidth}" height="24" rx="12" fill="rgba(32, 11, 17, 0.92)" stroke="rgba(255, 108, 143, 0.34)" />
      <text x="${labelX + 12}" y="${labelY}" class="pattern-trace-label" font-size="13" font-weight="700">${labelText}</text>
      <text x="${spanX + 6}" y="${volumeTop + volumeHeight + 18}" fill="#d8bec6" font-size="12">Pattern trace</text>
      <text x="${Math.max(spanX + spanWidth - 150, endAnchor)}" y="${volumeTop + volumeHeight + 18}" fill="#ffd2dc" font-size="12">${activeSpan.timeLabel}</text>
    `;
  }

  cameraMarkup += `<g id="chart-price-callout-layer"></g>`;
  cameraMarkup += `<g id="chart-zone-overlay"></g>`;

  const lastClose = last(closes);
  const lastY = mapY(lastClose);
  cameraMarkup += `
    <line x1="${chartLeft}" y1="${lastY}" x2="${chartLeft + chartWidth}" y2="${lastY}" stroke="rgba(255, 215, 148, 0.22)" stroke-dasharray="4 6" />
    <text x="${chartLeft + chartWidth + 18}" y="${lastY + 4}" fill="#ddd1be" font-size="18">${formatPrice(lastClose)}</text>
  `;

  dom.priceChart.innerHTML = `
    ${defs}
    <g id="chart-camera-root">
      ${cameraMarkup}
    </g>
  `;

  if (chartCinematic.zone.input) {
    chartCinematic.zone.resolved = resolveZoneInputToChartZone(chartCinematic.zone.input, chartCinematic.layout);
  } else if (!chartCinematic.sync.active) {
    chartCinematic.zone.resolved = null;
  }
  cacheChartCinematicDom();
  syncChartPresentation(true);
}

function renderLineChart(svgElement, values, options) {
  if (!svgElement) {
    return;
  }
  const width = 420;
  const height = 120;
  const path = linePath(values, width, height - 12, options.min, options.max);
  const areaPath = buildAreaPath(values, width, height - 12, options.min, options.max);

  svgElement.innerHTML = `
    <defs>
      <linearGradient id="${options.gradientId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${options.fillTop}" />
        <stop offset="100%" stop-color="${options.fillBottom}" />
      </linearGradient>
    </defs>
    <line x1="0" y1="${(height - 12) * 0.25}" x2="${width}" y2="${(height - 12) * 0.25}" stroke="rgba(255,255,255,0.06)" />
    <line x1="0" y1="${(height - 12) * 0.5}" x2="${width}" y2="${(height - 12) * 0.5}" stroke="rgba(255,255,255,0.06)" />
    <line x1="0" y1="${(height - 12) * 0.75}" x2="${width}" y2="${(height - 12) * 0.75}" stroke="rgba(255,255,255,0.06)" />
    <path d="${areaPath}" fill="url(#${options.gradientId})" opacity="0.9" />
    <path d="${path}" fill="none" stroke="${options.stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  `;
}

function renderMACDChart() {
  if (!dom.macdChart) {
    return;
  }
  const width = 420;
  const height = 120;
  const zeroY = 60;
  const histogram = state.macdHistogram;
  const line = state.macdLine;
  const signal = state.macdSignal;
  const combined = [...histogram, ...line, ...signal].map((value) => Math.abs(value));
  const maxAbs = Math.max(...combined, 1e-9);
  const barWidth = width / Math.max(histogram.length, 1);
  const mapY = (value) => zeroY - (value / maxAbs) * 42;

  let bars = "";
  histogram.forEach((value, index) => {
    const x = index * barWidth + barWidth * 0.15;
    const barHeight = Math.abs((value / maxAbs) * 42);
    const y = value >= 0 ? zeroY - barHeight : zeroY;
    const fill = value >= 0 ? "rgba(146, 247, 176, 0.88)" : "rgba(255, 120, 97, 0.88)";
    bars += `<rect x="${x}" y="${y}" width="${barWidth * 0.7}" height="${barHeight}" rx="1.4" fill="${fill}" />`;
  });

  const macdPath = line
    .map((value, index) => `${index === 0 ? "M" : "L"} ${((index / Math.max(line.length - 1, 1)) * width).toFixed(2)} ${mapY(value).toFixed(2)}`)
    .join(" ");
  const signalPath = signal
    .map((value, index) => `${index === 0 ? "M" : "L"} ${((index / Math.max(signal.length - 1, 1)) * width).toFixed(2)} ${mapY(value).toFixed(2)}`)
    .join(" ");

  dom.macdChart.innerHTML = `
    <line x1="0" y1="${zeroY}" x2="${width}" y2="${zeroY}" stroke="rgba(255,255,255,0.08)" />
    ${bars}
    <path d="${signalPath}" fill="none" stroke="#ffcf77" stroke-width="2.6" stroke-linecap="round" />
    <path d="${macdPath}" fill="none" stroke="#86f0b1" stroke-width="2.6" stroke-linecap="round" />
  `;
}

function referencePathFromSignature(signature, width, height, padding) {
  const safeSignature = Array.isArray(signature) && signature.length ? signature : [0.48, 0.52, 0.5, 0.56, 0.6];
  const points = safeSignature.map((value, index) => ({
    x: padding + (index / Math.max(safeSignature.length - 1, 1)) * (width - padding * 2),
    y: padding + (1 - clamp(value, 0, 1)) * (height - padding * 2),
  }));
  return buildSmoothPath(points);
}

function normalizedReferencePath(points, width, height, padding) {
  return buildSmoothPath(
    points.map((point) => ({
      x: padding + point.x * (width - padding * 2),
      y: padding + point.y * (height - padding * 2),
    }))
  );
}

function buildReferenceGuideMarkup(illustration, width, height, padding) {
  const guideSets = {
    triangle: [
      [{ x: 0.12, y: 0.72 }, { x: 0.9, y: 0.38 }],
      [{ x: 0.12, y: 0.26 }, { x: 0.9, y: 0.6 }],
    ],
    wedge: [
      [{ x: 0.12, y: illustration?.style === "falling" ? 0.34 : 0.72 }, { x: 0.9, y: illustration?.style === "falling" ? 0.5 : 0.4 }],
      [{ x: 0.12, y: illustration?.style === "falling" ? 0.78 : 0.28 }, { x: 0.9, y: illustration?.style === "falling" ? 0.54 : 0.58 }],
    ],
    pennant: [
      [{ x: 0.14, y: 0.2 }, { x: 0.38, y: 0.5 }, { x: 0.88, y: 0.4 }],
      [{ x: 0.14, y: 0.8 }, { x: 0.38, y: 0.52 }, { x: 0.88, y: 0.56 }],
    ],
    channel: [
      [{ x: 0.12, y: 0.28 }, { x: 0.9, y: 0.16 }],
      [{ x: 0.12, y: 0.7 }, { x: 0.9, y: 0.58 }],
    ],
    broadeningWedge: [
      [{ x: 0.12, y: 0.44 }, { x: 0.9, y: 0.18 }],
      [{ x: 0.12, y: 0.54 }, { x: 0.9, y: 0.86 }],
    ],
    coil: [
      [{ x: 0.14, y: 0.28 }, { x: 0.9, y: 0.48 }],
      [{ x: 0.14, y: 0.74 }, { x: 0.9, y: 0.54 }],
    ],
    doubleSwing: [[{ x: 0.16, y: 0.56 }, { x: 0.88, y: 0.56 }]],
    tripleSwing: [[{ x: 0.16, y: 0.56 }, { x: 0.88, y: 0.56 }]],
    headShoulders: [[{ x: 0.16, y: 0.6 }, { x: 0.88, y: 0.54 }]],
    flatBreak: [[{ x: 0.14, y: illustration?.side === "top" ? 0.32 : 0.68 }, { x: 0.9, y: illustration?.side === "top" ? 0.32 : 0.68 }]],
    retest: [[{ x: 0.14, y: illustration?.side === "top" ? 0.34 : 0.68 }, { x: 0.9, y: illustration?.side === "top" ? 0.34 : 0.68 }]],
    shelf: [
      [{ x: 0.16, y: 0.38 }, { x: 0.88, y: 0.38 }],
      [{ x: 0.16, y: 0.66 }, { x: 0.88, y: 0.66 }],
    ],
    baseBreakout: [[{ x: 0.14, y: 0.44 }, { x: 0.9, y: 0.44 }]],
    sweep: [[{ x: 0.14, y: illustration?.side === "high" ? 0.34 : 0.7 }, { x: 0.9, y: illustration?.side === "high" ? 0.34 : 0.7 }]],
    cupHandle: [[{ x: 0.14, y: illustration?.side === "top" ? 0.3 : 0.68 }, { x: 0.9, y: illustration?.side === "top" ? 0.3 : 0.68 }]],
  };
  const guides = guideSets[illustration?.detectorType] || [];
  return guides
    .map((guide) => {
      const path = normalizedReferencePath(guide, width, height, padding);
      return `<path d="${path}" fill="none" stroke="rgba(255, 214, 138, 0.42)" stroke-width="2.2" stroke-dasharray="8 8" stroke-linecap="round" />`;
    })
    .join("");
}

function buildReferenceIllustration(reference) {
  const width = 420;
  const height = 230;
  const padding = 22;
  const illustration = reference?.referenceIllustration || {};
  const mainPath = referencePathFromSignature(illustration.signature, width, height, padding);
  const guideMarkup = buildReferenceGuideMarkup(illustration, width, height, padding);
  const directionColor = reference?.referenceDirection === "Bullish"
    ? "#8cf3a6"
    : reference?.referenceDirection === "Bearish"
      ? "#ff8ea1"
      : "#ffd58b";

  return `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="${reference?.referenceTitle || "Pattern"} reference schematic">
      <defs>
        <linearGradient id="referencePathGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#ffd98f" />
          <stop offset="100%" stop-color="${directionColor}" />
        </linearGradient>
        <linearGradient id="referenceAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(255, 213, 139, 0.22)" />
          <stop offset="100%" stop-color="rgba(255, 213, 139, 0.02)" />
        </linearGradient>
        <filter id="referenceSoftGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="rgba(7, 9, 14, 0.35)" />
      ${[0.2, 0.4, 0.6, 0.8].map((step) => `<line x1="${padding}" y1="${padding + step * (height - padding * 2)}" x2="${width - padding}" y2="${padding + step * (height - padding * 2)}" stroke="rgba(255,255,255,0.06)" />`).join("")}
      ${[0.2, 0.4, 0.6, 0.8].map((step) => `<line x1="${padding + step * (width - padding * 2)}" y1="${padding}" x2="${padding + step * (width - padding * 2)}" y2="${height - padding}" stroke="rgba(255,255,255,0.04)" />`).join("")}
      ${guideMarkup}
      <path d="${mainPath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z" fill="url(#referenceAreaFill)" opacity="0.9" />
      <path d="${mainPath}" fill="none" stroke="rgba(255, 214, 138, 0.18)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" filter="url(#referenceSoftGlow)" />
      <path d="${mainPath}" fill="none" stroke="url(#referencePathGlow)" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#referenceSoftGlow)" />
    </svg>
  `;
}

function buildSecondaryPatternPreview(pattern, rankIndex = 0) {
  const width = 136;
  const height = 72;
  const paddingX = 8;
  const paddingY = 8;
  const palettes = [
    {
      glowStart: "#72ffe0",
      glowEnd: "#54d7ff",
      halo: "rgba(92, 255, 226, 0.26)",
      fill: "rgba(92, 255, 226, 0.10)",
    },
    {
      glowStart: "#ffc86b",
      glowEnd: "#ff9068",
      halo: "rgba(255, 181, 109, 0.26)",
      fill: "rgba(255, 181, 109, 0.10)",
    },
  ];
  const palette = palettes[rankIndex % palettes.length];
  const traceIndices = (pattern.tracePoints || [])
    .map((point) => point.index)
    .filter((value) => Number.isFinite(value));
  const firstIndex = traceIndices.length ? Math.min(...traceIndices) : 0;
  const lastIndex = traceIndices.length ? Math.max(...traceIndices) : Math.min(state.candles.length - 1, 10);
  const previewStart = clamp(firstIndex - 1, 0, Math.max(state.candles.length - 1, 0));
  const previewEnd = clamp(lastIndex + 1, previewStart, Math.max(state.candles.length - 1, 0));
  const previewCandles = state.candles.slice(previewStart, previewEnd + 1);
  const reference = detectorEngine.getPatternReference(pattern.id);

  if (!previewCandles.length) {
    return "";
  }

  const minValue = (values) => (values.length ? Math.min(...values) : 0);
  const maxValue = (values) => (values.length ? Math.max(...values) : 0);
  const previewLows = previewCandles.map((candle) => candle.low);
  const previewHighs = previewCandles.map((candle) => candle.high);
  const traceSource = pattern.tracePoints?.length
    ? pattern.tracePoints.map((point) => ({ index: point.index, price: point.price }))
    : (reference?.referenceIllustration?.signature || []).map((value, index, values) => ({
        index: previewStart + Math.round((index / Math.max(values.length - 1, 1)) * Math.max(previewEnd - previewStart, 1)),
        price: minValue(previewLows) + clamp(value, 0, 1) * (maxValue(previewHighs) - minValue(previewLows)),
      }));
  const priceRangeValues = [...previewHighs, ...previewLows, ...traceSource.map((point) => point.price)];
  const minPrice = minValue(priceRangeValues);
  const maxPrice = maxValue(priceRangeValues);
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const candleSlot = chartWidth / Math.max(previewCandles.length, 1);
  const mapX = (absoluteIndex) => paddingX + (((absoluteIndex - previewStart) + 0.5) / Math.max(previewCandles.length, 1)) * chartWidth;
  const mapY = (price) => paddingY + (1 - ((price - minPrice) / Math.max(maxPrice - minPrice, 1e-9))) * chartHeight;
  const uid = `secondary-${pattern.id}-${rankIndex}`.replace(/[^a-zA-Z0-9_-]/g, "");

  const candlesMarkup = previewCandles
    .map((candle, index) => {
      const x = paddingX + ((index + 0.5) / Math.max(previewCandles.length, 1)) * chartWidth;
      const wickTop = mapY(candle.high);
      const wickBottom = mapY(candle.low);
      const bodyTop = mapY(Math.max(candle.open, candle.close));
      const bodyBottom = mapY(Math.min(candle.open, candle.close));
      const bodyHeight = Math.max(bodyBottom - bodyTop, 1.4);
      const bodyWidth = Math.max(2, candleSlot * 0.4);
      const rising = candle.close >= candle.open;
      return `
        <line x1="${x.toFixed(2)}" y1="${wickTop.toFixed(2)}" x2="${x.toFixed(2)}" y2="${wickBottom.toFixed(2)}" stroke="${rising ? "rgba(131, 255, 190, 0.9)" : "rgba(255, 132, 111, 0.9)"}" stroke-width="1.1" stroke-linecap="round" />
        <rect
          x="${(x - bodyWidth / 2).toFixed(2)}"
          y="${bodyTop.toFixed(2)}"
          width="${bodyWidth.toFixed(2)}"
          height="${bodyHeight.toFixed(2)}"
          rx="1"
          fill="${rising ? "rgba(131, 255, 190, 0.88)" : "rgba(255, 132, 111, 0.88)"}"
        />
      `;
    })
    .join("");

  const tracePoints = traceSource.map((point) => ({
    x: mapX(point.index),
    y: mapY(point.price),
  }));
  const tracePath = tracePoints.length > 2 ? buildSmoothPath(tracePoints) : buildPolylinePath(tracePoints);
  const areaPath = `${tracePath} L ${width - paddingX} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`;

  return `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="${pattern.name} live preview">
      <defs>
        <linearGradient id="${uid}-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${palette.glowStart}" />
          <stop offset="100%" stop-color="${palette.glowEnd}" />
        </linearGradient>
        <linearGradient id="${uid}-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${palette.fill}" />
          <stop offset="100%" stop-color="rgba(255,255,255,0.01)" />
        </linearGradient>
        <filter id="${uid}-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" rx="14" fill="rgba(8, 11, 17, 0.82)" />
      ${[0.25, 0.5, 0.75].map((step) => `<line x1="${paddingX}" y1="${(paddingY + chartHeight * step).toFixed(2)}" x2="${width - paddingX}" y2="${(paddingY + chartHeight * step).toFixed(2)}" stroke="rgba(255,255,255,0.05)" />`).join("")}
      ${candlesMarkup}
      <path d="${areaPath}" fill="url(#${uid}-fill)" opacity="0.88" />
      <path d="${tracePath}" fill="none" stroke="${palette.halo}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" filter="url(#${uid}-glow)" />
      <path d="${tracePath}" fill="none" stroke="url(#${uid}-stroke)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#${uid}-glow)" />
      <circle cx="${tracePoints[tracePoints.length - 1]?.x || width - paddingX}" cy="${tracePoints[tracePoints.length - 1]?.y || height / 2}" r="3.2" fill="${palette.glowEnd}" filter="url(#${uid}-glow)" />
    </svg>
  `;
}

function renderPatternList() {
  if (!dom.leadPatternCard) {
    return;
  }

  const chartAnalysis = state.currentIntervalPattern;
  const secondaryPatterns = (chartAnalysis?.patterns || []).slice(1, 3);
  if (!chartAnalysis?.patternId || !secondaryPatterns.length) {
    dom.leadPatternCard.innerHTML = `
      <div class="lead-pattern-empty secondary-pattern-empty">
        <strong>Secondary matches are warming up</strong>
        <p>The displayed ${currentInterval()} chart does not yet have two clean backup reads above the conservative detector threshold.</p>
      </div>
    `;
    return;
  }

  dom.leadPatternCard.innerHTML = `
    <div class="secondary-match-list">
      ${secondaryPatterns.map((pattern, index) => `
        <article class="secondary-match-card ${pattern.direction?.toLowerCase() || "neutral"}">
          <div class="secondary-match-layout">
            <div class="secondary-match-copy">
              <div class="secondary-match-top">
                <span class="secondary-match-rank">#${index + 2}</span>
                <span class="secondary-match-score">${pattern.confidence}%</span>
              </div>
              <strong>${pattern.name}</strong>
              <span class="secondary-match-bias">${pattern.direction} · ${pattern.bias || "Monitoring structure"}</span>
              <span class="secondary-match-span">${pattern.span || "--"}</span>
            </div>
            <div class="secondary-match-preview">
              ${buildSecondaryPatternPreview(pattern, index)}
            </div>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderReferenceCard() {
  if (!dom.patternReferenceCard) {
    return;
  }

  const referenceId = state.currentIntervalPattern?.patternId || state.topDownAnalysis?.referencePatternId || null;
  const reference = referenceId ? detectorEngine.getPatternReference(referenceId) : null;
  if (!reference) {
    dom.patternReferenceCard.innerHTML = `
      <div class="reference-empty">
        <p>A textbook-style schematic will appear here when the displayed ${currentInterval()} chart has a clean active pattern.</p>
      </div>
    `;
    return;
  }

  const directionClass = (reference.referenceDirection || "Neutral").toLowerCase();
  dom.patternReferenceCard.innerHTML = `
    <div class="reference-hero">
      <strong class="reference-title">${reference.referenceTitle}</strong>
      <span class="reference-direction ${directionClass}">${reference.referenceDirection}</span>
    </div>
    <div class="reference-figure">
      ${buildReferenceIllustration(reference)}
    </div>
    <p class="reference-description">${reference.referenceDescription}</p>
  `;
}

function renderTimeframeAlignment() {
  if (!dom.timeframeConfirmation) {
    return;
  }

  if (state.isMock) {
    dom.timeframeConfirmation.innerHTML = `
      <article class="timeframe-pill neutral">
        <small>MTF</small>
        <strong>Live Only</strong>
        <span class="card-label">Binance confirmation required</span>
        <span class="timeframe-meta">Mock mode disables alignment</span>
      </article>
    `;
    return;
  }

  const alignment = state.topDownAnalysis?.timeframeAlignment || state.timeframeAlignment || [];
  if (!alignment.length) {
    dom.timeframeConfirmation.innerHTML = `
      <article class="timeframe-pill loading neutral">
        <small>MTF</small>
        <strong>${state.alignmentLoading ? "Loading" : "Waiting"}</strong>
        <span class="card-label">${state.alignmentLoading ? "Top-down live fetch" : "Waiting for an exact detected pattern"}</span>
        <span class="timeframe-meta">${state.alignmentLoading ? "Refreshing 4h -> 1m" : "Lead pattern not ready yet"}</span>
      </article>
    `;
    return;
  }

  dom.timeframeConfirmation.innerHTML = alignment
    .map((item) => {
      const directionClass = item.direction?.toLowerCase() || "neutral";
      const classes = ["timeframe-pill", directionClass];
      if (item.isLoading) {
        classes.push("loading");
      }
      if (item.isUnavailable) {
        classes.push("neutral");
      }

      const detail = item.isLoading
        ? "Scanning"
        : item.isUnavailable
          ? "No data"
          : item.status === "Lead"
            ? `${item.patternName || "Lead"} · ${item.confidence}%`
            : item.status === "Confirmed"
              ? `${item.confidence}% exact match`
              : item.status === "Diverging" || item.status === "Higher Match" || item.status === "Unconfirmed"
                ? item.patternName || "Different structure"
                : "No exact match";
      const meta = item.isLoading ? "Live" : item.status;

      return `
        <article class="${classes.join(" ")}">
          <small>${item.interval}</small>
          <strong>${meta}</strong>
          <span class="card-label">${detail}</span>
        </article>
      `;
    })
    .join("");
}

function renderTicker() {
  const coin = currentCoin();
  const chartPattern = state.currentIntervalPattern?.pattern?.name || "No chart pattern";
  const leadPattern = state.topDownAnalysis?.leadPattern?.name || "No higher-timeframe lead";
  const leadInterval = state.topDownAnalysis?.leadInterval || "scan";
  const messages = [
    `Live source: Binance ${currentInterval()} for ${coin.marketSymbol}`,
    `Chart pattern: ${chartPattern} on ${currentInterval()}`,
    `Higher timeframe lead: ${leadPattern} on ${leadInterval}`,
    `Displayed chart timeframe: ${currentInterval()}`,
    `Timeframe cadence: ${MULTI_TIMEFRAME_INTERVALS.join(" -> ")}`,
    ...CONFIG.tickerMessages,
  ];

  const doubled = [...messages, ...messages];
  dom.tickerTrack.innerHTML = doubled
    .map(
      (message) => `
        <span class="ticker-item">
          <span class="ticker-dot"></span>
          <span>${message}</span>
        </span>
      `
    )
    .join("");
}

function renderIntervalBanner() {
  if (!dom.currentInterval || !dom.intervalSwitchCopy || !dom.slotProgress || !dom.intervalSwitchboard) {
    return;
  }

  const meta = intervalCycleMeta();
  const alignmentMap = new Map((state.topDownAnalysis?.timeframeAlignment || []).map((item) => [item.interval, item]));
  dom.currentInterval.textContent = currentInterval();
  dom.intervalSwitchCopy.textContent = meta.isLastStep
    ? `Next coin ${nextCoin().symbol} starts in ${formatClock(meta.remainingInterval)}`
    : `Switching to ${meta.nextLabel} in ${formatClock(meta.remainingInterval)}`;
  dom.slotProgress.style.width = `${(meta.slotProgress * 100).toFixed(2)}%`;

  dom.intervalSwitchboard.innerHTML = MULTI_TIMEFRAME_INTERVALS.map((interval, index) => {
    const statusClass = index < state.currentIntervalIndex ? "done" : index === state.currentIntervalIndex ? "active" : index === state.currentIntervalIndex + 1 ? "next" : "";
    const statusLabel = index < state.currentIntervalIndex ? "Done" : index === state.currentIntervalIndex ? "Live" : index === state.currentIntervalIndex + 1 ? "Next" : `+${index * 2}m`;
    const alignment = alignmentMap.get(interval);
    const directionClass = alignment?.direction?.toLowerCase() || "neutral";
    const mtfStatus = state.isMock
      ? "Live only"
      : state.alignmentLoading && !alignment
        ? "Loading"
        : alignment?.status || "Waiting";
    const mtfDetail = state.isMock
      ? "Binance exact match only"
      : !alignment
        ? "Awaiting scan"
        : alignment.isUnavailable
          ? "No data"
          : alignment.status === "Lead"
            ? `${alignment.patternName || "Lead"} · ${alignment.confidence}%`
            : alignment.status === "Confirmed"
              ? `${alignment.confidence}% exact match`
              : alignment.status === "Diverging" || alignment.status === "Higher Match" || alignment.status === "Unconfirmed"
                ? alignment.patternName || "Different structure"
                : "No exact match";
    return `
      <article class="interval-chip ${statusClass} ${directionClass}">
        <div class="interval-chip-top">
          <strong>${interval}</strong>
          <span class="interval-chip-cycle">${statusLabel}</span>
        </div>
        <span class="interval-chip-mtf">${mtfStatus}</span>
        <span class="interval-chip-detail">${mtfDetail}</span>
      </article>
    `;
  }).join("");
}

function renderText() {
  const coin = currentCoin();
  const currentPrice = state.liveTicker?.lastPrice ?? last(state.candles)?.close ?? 0;
  const currentChange = state.liveTicker?.changePercent ?? percentageMove(state.candles[0]?.open, currentPrice) * 100;
  const rsi = last(state.rsiSeries) ?? 50;
  const macdValue = last(state.macdLine) ?? 0;
  const chartPattern = state.currentIntervalPattern || emptyPatternAnalysis(currentInterval());
  const leadPattern = state.topDownAnalysis?.leadAnalysis || chartPattern;
  const alignmentSummary = buildAlignmentSummary();
  const leadInterval = state.topDownAnalysis?.leadInterval || "--";
  const cycleMeta = intervalCycleMeta();
  const directionColors = {
    Bullish: "#98f7a3",
    Bearish: "#ff9aa6",
    Neutral: "#ffd58b",
  };

  dom.coinAvatar.textContent = coin.symbol;
  dom.coinPair.textContent = coin.pair;
  dom.brandPattern.textContent = chartPattern.pattern?.name || leadPattern.pattern?.name || "Detector Scan Active";
  dom.nextCoin.textContent = nextCoin().symbol;
  dom.currentPrice.textContent = formatPrice(currentPrice);
  dom.currentChange.textContent = formatChange(currentChange);
  dom.currentChange.style.color = currentChange >= 0 ? "var(--green)" : "var(--red)";
  dom.alertTagline.textContent = chartPattern.patternId
    ? `Chart ${currentInterval()} · ${chartPattern.pattern?.name || chartPattern.title}`
    : `Top-down scan active · chart ${currentInterval()}`;
  if (dom.rsiValue) {
    dom.rsiValue.textContent = rsi.toFixed(1);
  }
  if (dom.macdValue) {
    dom.macdValue.textContent = `${macdValue >= 0 ? "+" : ""}${macdValue.toFixed(2)}`;
  }
  if (dom.signalDirection) {
    dom.signalDirection.textContent = chartPattern.direction;
    dom.signalDirection.style.color = directionColors[chartPattern.direction] || directionColors.Neutral;
  }
  if (dom.signalConfidence) {
    dom.signalConfidence.textContent = chartPattern.patternId ? `${chartPattern.confidence}%` : "Scan";
  }
  if (dom.signalTone) {
    dom.signalTone.textContent = chartPattern.patternId ? `${chartPattern.marketBias}` : "Waiting for structure";
  }
  if (dom.momentumContext) {
    dom.momentumContext.textContent = `${currentInterval()} live`;
  }
  if (dom.signalPhase) {
    dom.signalPhase.textContent = cycleMeta.isLastStep
      ? `${currentInterval()} · next ${nextCoin().symbol} in ${formatClock(cycleMeta.remainingInterval)}`
      : `${currentInterval()} -> ${cycleMeta.nextLabel} in ${formatClock(cycleMeta.remainingInterval)}`;
  }
  if (dom.engineStatus) {
    dom.engineStatus.textContent = state.isMock ? "Binance unavailable, mock fallback" : `Binance ${currentInterval()} live`;
  }
  if (dom.alertCadence) {
    dom.alertCadence.textContent = leadPattern.patternId ? alignmentSummary : "Waiting for structure";
  }
}

function render() {
  if (shouldFreezeUnderlyingScene()) {
    renderIntermissionOverlay();
    return;
  }
  if (!state.candles.length) {
    renderIntermissionOverlay();
    return;
  }
  renderText();
  renderIntervalBanner();
  renderTimeframeAlignment();
  renderPatternList();
  renderReferenceCard();
  renderNewsPanel();
  renderTicker();
  renderPriceChart();
  renderLineChart(dom.rsiChart, state.rsiSeries, {
    min: 20,
    max: 84,
    stroke: "#ffd27b",
    gradientId: "rsiFill",
    fillTop: "rgba(255, 210, 123, 0.28)",
    fillBottom: "rgba(255, 210, 123, 0.02)",
  });
  renderMACDChart();
  updateCountdown();
  renderIntermissionOverlay();
  observeLiveCommentary();
  if (!voiceDirector.warmupQueued && hasAnyCommentaryProvider()) {
    if (voiceDirector.audioUnlocked) {
      maybeQueueAmbientCommentary(true);
    }
  } else if (voiceDirector.audioUnlocked) {
    maybeQueueAmbientCommentary(false);
  }
  updateVoiceControls();
}

async function init() {
  updateCountdown();
  await loadDetectorEngine().catch(() => {});
  await loadIntermissionEngine().catch(() => {});
  await initVoiceDirector().catch(() => {});
  ensureChartCinematicLoop();
  refreshMarketSnapshots().catch(() => {});
  refreshNewsPanel(true).catch(() => {});
  setInterval(() => {
    maybeRotateCoin();
    maybeRotateTimeframe();
    maybeRotateNewsPanel();
    updateCountdown();
  }, 1000);
  setInterval(() => {
    refreshMarketSnapshots()
      .then(() => {
        if (state.candles.length) {
          render();
        }
      })
      .catch(() => {});
  }, 60000);
  setInterval(() => {
    refreshNewsPanel(false).catch(() => {});
  }, 30000);
  await activateCoin(0);
  setTimeout(() => {
    if (!isIntermissionActive() && voiceDirector.audioUnlocked) {
      maybeQueueAmbientCommentary(true);
    }
  }, 2500);
}

window.cryptoStreamOverlay = {
  setRotationMinutes(minutes) {
    cancelIntermission();
    CONFIG.rotationMinutes = clamp(Number(minutes) || CONFIG.rotationMinutes, 5, 20);
    activateCoin(state.currentIndex, { resetRotation: true, intervalIndex: 0 });
  },
  setCoin(symbol) {
    cancelIntermission();
    const index = CONFIG.coins.findIndex((coin) => coin.symbol === symbol);
    if (index >= 0) {
      activateCoin(index, { resetRotation: true, intervalIndex: 0 });
    }
  },
  refreshVoices() {
    return Promise.all([refreshVoiceCatalog(), refreshPodcastCatalog()]);
  },
  getVoiceStatus() {
    return {
      serviceReady: voiceDirector.serviceReady,
      castReady: voiceDirector.castReady,
      podcastReady: voiceDirector.podcastReady,
      podcastConfig: voiceDirector.podcastConfig,
      voices: voiceDirector.voiceStatus,
      audioPlaybackAllowed: voiceDirector.audioPlaybackAllowed,
    };
  },
  testVoice() {
    if (!voiceDirector.audioUnlocked) {
      unlockVoicePlayback(true).catch(() => {});
      return false;
    }
    return enqueueLiveCommentaryEvent(
      {
        type: "warmup_intro",
        key: `${currentCoin().marketSymbol}:manual-voice-test:${Date.now()}`,
        pattern_name: state.currentIntervalPattern?.pattern?.name || "a developing live structure",
        confidence: state.currentIntervalPattern?.confidence || 0,
        lead_pattern_name: state.topDownAnalysis?.leadPattern?.name || state.currentIntervalPattern?.pattern?.name || "a developing live structure",
        lead_interval: state.topDownAnalysis?.leadInterval || currentInterval(),
      },
      { bypassTiming: true, bypassDedupe: true }
    );
  },
  focusZone(payload = {}, options = {}) {
    const zone = payload.zone || payload;
    const durationMs = clamp(Number(options.durationMs || payload.durationMs || 6200) || 6200, 1800, 16000);
    beginCommentaryChartSync({
      zone,
      timeline: payload.timeline || options.timeline || [],
      durationMs,
    });
    return Boolean(chartCinematic.zone.resolved);
  },
  clearFocusedZone() {
    clearChartCommentaryFocus(true);
  },
};

init();
