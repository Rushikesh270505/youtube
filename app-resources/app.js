const CONFIG = {
  rotationMinutes: 12,
  chartPoints: 72,
  interval: "4h",
  reconnectMs: 2500,
  restBaseUrls: ["https://data-api.binance.vision", "https://api.binance.com"],
  wsBaseUrl: "wss://stream.binance.com:9443/stream?streams=",
  coins: [
    { symbol: "BTC", name: "Bitcoin", pair: "BTC / USDT", spokenName: "BITCOIN", marketSymbol: "BTCUSDT", tone: "Institutional flow", logoUrl: "/assets/coin-logos/btc.png" },
    { symbol: "ETH", name: "Ethereum", pair: "ETH / USDT", spokenName: "ETHEREUM", marketSymbol: "ETHUSDT", tone: "Smart-contract rotation", logoUrl: "/assets/coin-logos/eth.png" },
    { symbol: "SOL", name: "Solana", pair: "SOL / USDT", spokenName: "SOLANA", marketSymbol: "SOLUSDT", tone: "Momentum leadership", logoUrl: "/assets/coin-logos/sol.png" },
    { symbol: "PAXG", name: "Gold", pair: "PAXG / USDT", spokenName: "GOLD", marketSymbol: "PAXGUSDT", tone: "Precious-metal hedge", logoUrl: "/assets/coin-logos/paxg.png" },
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
const LIVE_COMMENTARY_MIN_INTERVAL_MS = 18 * 1000;
const LIVE_COMMENTARY_DEDUPE_MS = 120 * 1000;
const LIVE_COMMENTARY_QUEUE_MAX = 2;
const INTERMISSION_SUMMARY_MIN_MS = 30000;
const INTERMISSION_SUMMARY_MAX_MS = 50000;
const INTERMISSION_NEWS_MIN_MS = 9000;
const INTERMISSION_NEWS_MAX_MS = 20000;
const INTERMISSION_DOOR_CLOSE_MS = 1100;
const INTERMISSION_DOOR_OPEN_MS = 10000;
const SUBSCRIBE_PROMPT_SILENCE_MS = 4000;
const SUBSCRIBE_PROMPT_COOLDOWN_MS = 4 * 60 * 1000;
const SUBSCRIBE_PROMPT_LINES = [
  "Smack that like and subscribe button if you want more live reads like this.",
  "Hit like, hit subscribe, and stay locked in for the next setup.",
  "If this live desk is helping, smash subscribe and ride with the channel.",
  "Don\u2019t miss the next rotation, smack that like and subscribe button right now.",
  "Join the crew, hit subscribe, and keep this live chart energy rolling.",
  "Tap that subscribe button and show some love if you want more live market breakdowns.",
];
const AUDIO_MIX = {
  commentaryBaseVolume: 1,
  commentaryVolume: 0.8,
  commentaryLevel: 0.8,
  bgmCommentaryBaseVolume: 1,
  bgmIdleBaseVolume: 1,
  bgmCommentaryVolume: 0.2,
  bgmIdleVolume: 0.2,
  bgmLevel: 0.2,
  bgmFadeMs: 420,
  bgmPlaylistApiUrl: "/api/bgm-playlist",
};

const LIVE_RENDER_CONFIG = {
  visualFrameMs: 250,
  heavyRefreshMs: 10000,
  analysisWorkerUrl: "./analysis-worker.js?v=20260328a",
};

const PERFORMANCE_MODE = {
  REDUCED: "reduced",
  MINIMAL: "minimal",
};

const dom = {
  body: document.body,
  coinAvatar: document.getElementById("coin-avatar"),
  coinPair: document.getElementById("coin-pair"),
  brandPattern: document.getElementById("brand-pattern"),
  nextCoin: document.getElementById("next-coin"),
  rotationCountdown: document.getElementById("rotation-countdown"),
  nextCoinQueue: document.getElementById("next-coin-queue"),
  voiceToggle: document.getElementById("voice-toggle"),
  voiceButtonLabel: document.getElementById("voice-button-label"),
  voiceStatus: document.getElementById("voice-status"),
  currentInterval: document.getElementById("current-interval"),
  intervalSwitchCopy: document.getElementById("interval-switch-copy"),
  slotProgress: document.getElementById("slot-progress"),
  intervalSwitchboard: document.getElementById("interval-switchboard"),
  currentPriceCoinLogo: document.getElementById("current-price-coin-logo"),
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
  bgmAudioPlayer: document.getElementById("bgm-audio-player"),
  intermissionOverlay: document.getElementById("intermission-overlay"),
  subscribePromoPopup: document.getElementById("subscribe-promo-popup"),
  streamSkipButton: document.getElementById("stream-skip-button"),
  streamStopButton: document.getElementById("stream-stop-button"),
  bgmVolumeSlider: document.getElementById("bgm-volume-slider"),
  bgmVolumeValue: document.getElementById("bgm-volume-value"),
  voiceVolumeSlider: document.getElementById("voice-volume-slider"),
  voiceVolumeValue: document.getElementById("voice-volume-value"),
  launchBgmVolumeSlider: document.getElementById("launch-bgm-volume-slider"),
  launchBgmVolumeValue: document.getElementById("launch-bgm-volume-value"),
  launchVoiceVolumeSlider: document.getElementById("launch-voice-volume-slider"),
  launchVoiceVolumeValue: document.getElementById("launch-voice-volume-value"),
  launchScreen: document.getElementById("stream-launch-screen"),
  launchButton: document.getElementById("stream-launch-button"),
  launchCountdown: document.getElementById("stream-launch-countdown"),
  launchStatus: document.getElementById("stream-launch-status"),
};

const state = {
  launch: {
    active: true,
    countdownActive: false,
    remaining: 10,
    timers: [],
  },
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
  analysisRequestId: 0,
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
    phaseStartedAt: 0,
    openingEndsAt: 0,
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
    intervalAnalyses: {},
    subtitleClip: null,
    stageRunId: 0,
  },
  streamControl: {
    stopAfterCurrent: false,
    stopped: false,
  },
  performance: {
    mode: PERFORMANCE_MODE.MINIMAL,
    pressureScore: 0,
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
  INTERMISSION_SUMMARY_MS: 30000,
  INTERMISSION_NEWS_MS: 9000,
  INTERMISSION_OPEN_MS: 10000,
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

const renderCache = {
  intervalSwitchboardKey: "",
  newsPanelKey: "",
  patternListKey: "",
  priceChartKey: "",
  referenceKey: "",
  tickerKey: "",
  timeframeAlignmentKey: "",
};

const liveRenderScheduler = {
  visualFrameId: 0,
  visualTimerId: 0,
  visualQueued: false,
  lastVisualRenderAt: 0,
  fullRenderQueued: false,
  fullRenderTimeoutId: 0,
  fullRenderIdleId: 0,
  heavyInFlight: false,
  heavyQueued: false,
  queuedForce: false,
  lastHeavyRequestedAt: 0,
  lastHeavyCompletedAt: 0,
};

const analysisWorkerRuntime = {
  worker: null,
  bootPromise: null,
  unavailable: false,
  nextRequestId: 1,
  pending: new Map(),
};

let intermissionStageFitRaf = 0;
let subscribePromoPopupTimer = 0;

const voiceDirector = {
  audio: null,
  bgm: null,
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
  lastSpeechEndedAt: 0,
  lastSubscribePromptAt: 0,
  lastSubscribePromptLine: "",
  subscribePromptBag: [],
  openingPromptPlayedForToken: 0,
  subscribePromptPending: false,
  recentLiveEvents: new Map(),
  lastObservedSnapshot: null,
  currentMode: "idle",
  warmupQueued: false,
  warmupPreloadKey: "",
  warmupPreloadResponse: null,
  warmupPreloadPromise: null,
  lastAmbientQueuedAt: 0,
  lastAmbientType: "pattern",
  activeLiveEvent: null,
  autoplayAttempted: false,
  pendingAutoStart: false,
  subtitleTimers: [],
  subtitleFrame: 0,
  voiceAssignments: null,
  assignmentsVersion: 0,
  assignmentPollTimer: 0,
  assignmentPollInFlight: false,
  bgmStarted: false,
  bgmTargetVolume: 0,
  bgmFadeFrame: 0,
  bgmPlaylist: [],
  bgmPlaylistPromise: null,
  bgmQueue: [],
  bgmCurrentTrack: null,
};

const chartCinematic = {
  rafId: 0,
  lastFrameAt: 0,
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
    zoneLabelScaleWrap: null,
    zoneLabelCard: null,
    zoneLabelTitle: null,
    zoneLabelRange: null,
    patternTimePanel: null,
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
  levelFocus: {
    fibKeys: [],
    renderKey: "",
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
  const module = await import("./detectors.mjs?v=20260325h");
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

function buildCandleSnapshotKey(candles = []) {
  if (!Array.isArray(candles) || !candles.length) {
    return "empty";
  }
  const firstCandle = candles[0];
  const lastCandle = candles[candles.length - 1];
  return [
    candles.length,
    firstCandle?.openTime ?? 0,
    lastCandle?.openTime ?? 0,
    lastCandle?.open ?? 0,
    lastCandle?.high ?? 0,
    lastCandle?.low ?? 0,
    lastCandle?.close ?? 0,
    lastCandle?.volume ?? 0,
  ].join(":");
}

function buildPatternAnalysisKey(patternAnalysis) {
  const secondaryKey = (patternAnalysis?.patterns || [])
    .map((pattern) => [pattern.id || pattern.name || "pattern", pattern.confidence || 0, pattern.direction || "Neutral"].join(":"))
    .join("|");
  return [
    patternAnalysis?.patternId || "none",
    patternAnalysis?.confidence || 0,
    patternAnalysis?.direction || "Neutral",
    patternAnalysis?.span?.startIndex ?? -1,
    patternAnalysis?.span?.endIndex ?? -1,
    secondaryKey,
  ].join("|");
}

function buildTimeframeAlignmentKey(alignment = []) {
  return alignment
    .map((item) => [
      item.interval || "--",
      item.status || "Waiting",
      item.patternName || "",
      item.confidence || 0,
      item.direction || "Neutral",
      item.isLoading ? 1 : 0,
      item.isUnavailable ? 1 : 0,
    ].join(":"))
    .join("|");
}

function resetLiveRenderScheduler() {
  if (liveRenderScheduler.visualFrameId) {
    cancelAnimationFrame(liveRenderScheduler.visualFrameId);
  }
  if (liveRenderScheduler.visualTimerId) {
    clearTimeout(liveRenderScheduler.visualTimerId);
  }
  if (liveRenderScheduler.fullRenderTimeoutId) {
    clearTimeout(liveRenderScheduler.fullRenderTimeoutId);
  }
  if (liveRenderScheduler.fullRenderIdleId) {
    if (typeof window !== "undefined" && typeof window.cancelIdleCallback === "function") {
      window.cancelIdleCallback(liveRenderScheduler.fullRenderIdleId);
    } else {
      clearTimeout(liveRenderScheduler.fullRenderIdleId);
    }
  }
  liveRenderScheduler.visualFrameId = 0;
  liveRenderScheduler.visualTimerId = 0;
  liveRenderScheduler.visualQueued = false;
  liveRenderScheduler.lastVisualRenderAt = 0;
  liveRenderScheduler.fullRenderQueued = false;
  liveRenderScheduler.fullRenderTimeoutId = 0;
  liveRenderScheduler.fullRenderIdleId = 0;
  liveRenderScheduler.heavyInFlight = false;
  liveRenderScheduler.heavyQueued = false;
  liveRenderScheduler.queuedForce = false;
  liveRenderScheduler.lastHeavyRequestedAt = 0;
  liveRenderScheduler.lastHeavyCompletedAt = 0;
  chartCinematic.lastFrameAt = 0;
}

function flushAnalysisWorkerPending(error) {
  analysisWorkerRuntime.pending.forEach(({ reject }) => {
    reject(error);
  });
  analysisWorkerRuntime.pending.clear();
}

function destroyAnalysisWorker(error = new Error("Analysis worker unavailable")) {
  if (analysisWorkerRuntime.worker) {
    analysisWorkerRuntime.worker.terminate();
  }
  analysisWorkerRuntime.worker = null;
  analysisWorkerRuntime.unavailable = true;
  flushAnalysisWorkerPending(error);
}

function handleAnalysisWorkerMessage(event) {
  const payload = event.data || {};
  const pendingRequest = analysisWorkerRuntime.pending.get(payload.requestId);
  if (!pendingRequest) {
    return;
  }
  analysisWorkerRuntime.pending.delete(payload.requestId);
  if (payload.error) {
    pendingRequest.reject(new Error(payload.error));
    return;
  }
  pendingRequest.resolve(payload);
}

async function ensureAnalysisWorker() {
  if (analysisWorkerRuntime.unavailable || typeof Worker === "undefined") {
    return null;
  }
  if (analysisWorkerRuntime.worker) {
    return analysisWorkerRuntime.worker;
  }
  if (analysisWorkerRuntime.bootPromise) {
    return analysisWorkerRuntime.bootPromise;
  }

  analysisWorkerRuntime.bootPromise = new Promise((resolve) => {
    try {
      const worker = new Worker(LIVE_RENDER_CONFIG.analysisWorkerUrl, { type: "module" });
      worker.addEventListener("message", handleAnalysisWorkerMessage);
      worker.addEventListener("error", () => {
        destroyAnalysisWorker(new Error("Analysis worker crashed"));
      });
      analysisWorkerRuntime.worker = worker;
      resolve(worker);
    } catch {
      analysisWorkerRuntime.unavailable = true;
      resolve(null);
    } finally {
      analysisWorkerRuntime.bootPromise = null;
    }
  });

  return analysisWorkerRuntime.bootPromise;
}

async function requestAnalysisWorker(message) {
  const worker = await ensureAnalysisWorker();
  if (!worker) {
    throw new Error("Analysis worker unavailable");
  }
  const requestId = analysisWorkerRuntime.nextRequestId++;
  return new Promise((resolve, reject) => {
    analysisWorkerRuntime.pending.set(requestId, { resolve, reject });
    worker.postMessage({
      ...message,
      requestId,
    });
  });
}

function currentPerformanceMode() {
  return state.performance?.mode || PERFORMANCE_MODE.REDUCED;
}

function isReducedPerformanceMode() {
  return currentPerformanceMode() === PERFORMANCE_MODE.REDUCED || currentPerformanceMode() === PERFORMANCE_MODE.MINIMAL;
}

function isMinimalPerformanceMode() {
  return currentPerformanceMode() === PERFORMANCE_MODE.MINIMAL;
}

function currentVisualFrameMs() {
  return isMinimalPerformanceMode() ? 1400 : 700;
}

function currentHeavyRefreshMs() {
  return isMinimalPerformanceMode() ? 30000 : 12000;
}

function currentCinematicFrameMs() {
  return isMinimalPerformanceMode() ? 220 : 100;
}

function applyPerformanceMode() {
  dom.body?.classList.toggle("performance-reduced", isReducedPerformanceMode() || isMinimalPerformanceMode());
  dom.body?.classList.toggle("performance-minimal", isMinimalPerformanceMode());
}

function setPerformanceMode(mode) {
  if (!mode || currentPerformanceMode() === mode) {
    return;
  }
  state.performance.mode = mode;
  renderCache.priceChartKey = "";
  chartCinematic.lastFrameAt = 0;
  applyPerformanceMode();
}

function trackRenderPressure(mode, durationMs) {
  if (!Number.isFinite(durationMs) || mode === "fast") {
    return;
  }

  const threshold = mode === "full" ? 44 : 26;
  if (durationMs > threshold) {
    state.performance.pressureScore = Math.min(10, state.performance.pressureScore + 2);
  } else {
    state.performance.pressureScore = Math.max(0, state.performance.pressureScore - 1);
  }

  if (state.performance.pressureScore >= 4 && currentPerformanceMode() !== PERFORMANCE_MODE.MINIMAL) {
    setPerformanceMode(PERFORMANCE_MODE.MINIMAL);
  }
}

function scheduleDeferredFullRender(options = {}) {
  const { delayMs = 0 } = options;
  if (liveRenderScheduler.fullRenderQueued) {
    return;
  }

  liveRenderScheduler.fullRenderQueued = true;
  const queueRender = () => {
    liveRenderScheduler.fullRenderTimeoutId = 0;
    const commit = () => {
      liveRenderScheduler.fullRenderIdleId = 0;
      liveRenderScheduler.fullRenderQueued = false;
      render("full");
    };

    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      liveRenderScheduler.fullRenderIdleId = window.requestIdleCallback(commit, { timeout: 160 });
      return;
    }

    liveRenderScheduler.fullRenderIdleId = window.setTimeout(commit, 16);
  };

  if (delayMs > 0) {
    liveRenderScheduler.fullRenderTimeoutId = window.setTimeout(queueRender, delayMs);
    return;
  }

  queueRender();
}

function currentCoin() {
  return CONFIG.coins[state.currentIndex];
}

function isElementVisible(element) {
  return Boolean(element && element.getClientRects && element.getClientRects().length);
}

function nextCoin(offset = 1) {
  return CONFIG.coins[(state.currentIndex + offset) % CONFIG.coins.length];
}

function estimatedNextCoinStartMs() {
  if (!isIntermissionActive()) {
    const rotationMs = CONFIG.rotationMinutes * 60 * 1000;
    return Math.max(0, rotationMs - (Date.now() - state.rotationStartedAt));
  }

  if (state.streamControl.stopped) {
    return 0;
  }

  const phaseElapsed = Math.max(0, Date.now() - Number(state.intermission.phaseStartedAt || state.intermission.startedAt || Date.now()));

  if (state.intermission.phase === "opening") {
    return Math.max(0, Number(state.intermission.openingEndsAt || 0) - Date.now());
  }

  if (state.intermission.phase === "news") {
    return Math.max(0, INTERMISSION_NEWS_MIN_MS - phaseElapsed) + INTERMISSION_DOOR_OPEN_MS;
  }

  if (state.intermission.phase === "summary") {
    return Math.max(0, INTERMISSION_SUMMARY_MIN_MS - phaseElapsed) + INTERMISSION_NEWS_MIN_MS + INTERMISSION_DOOR_OPEN_MS;
  }

  if (state.intermission.phase === "closing") {
    return Math.max(0, INTERMISSION_DOOR_CLOSE_MS - phaseElapsed) + INTERMISSION_SUMMARY_MIN_MS + INTERMISSION_NEWS_MIN_MS + INTERMISSION_DOOR_OPEN_MS;
  }

  return INTERMISSION_DOOR_OPEN_MS;
}

function upcomingCoinQueueEntries() {
  const baseCoinIndex = isIntermissionActive()
    ? (state.intermission.nextCoinIndex ?? ((state.intermission.frozenCoinIndex ?? state.currentIndex) + 1) % CONFIG.coins.length)
    : (state.currentIndex + 1) % CONFIG.coins.length;
  const baseMs = estimatedNextCoinStartMs();
  const rotationMs = CONFIG.rotationMinutes * 60 * 1000;

  return Array.from({ length: 3 }, (_, index) => {
    const coin = CONFIG.coins[(baseCoinIndex + index) % CONFIG.coins.length];
    return {
      coin,
      countdown: formatClock(baseMs + index * rotationMs),
    };
  });
}

function renderUpcomingCoinQueue() {
  const entries = upcomingCoinQueueEntries();
  const leadEntry = entries[0];
  if (dom.nextCoin && leadEntry) {
    dom.nextCoin.textContent = leadEntry.coin.symbol;
  }
  if (dom.rotationCountdown && leadEntry) {
    dom.rotationCountdown.textContent = leadEntry.countdown;
  }
  if (!dom.nextCoinQueue) {
    return;
  }

  entries.slice(1).forEach((entry, index) => {
    const coinTarget = dom.nextCoinQueue.querySelector(`[data-queue-coin="${index + 1}"]`);
    const countdownTarget = dom.nextCoinQueue.querySelector(`[data-queue-countdown="${index + 1}"]`);
    if (coinTarget) {
      coinTarget.textContent = entry.coin.symbol;
    }
    if (countdownTarget) {
      countdownTarget.textContent = entry.countdown;
    }
  });
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

function recalculateAudioMixLevels() {
  AUDIO_MIX.commentaryVolume = clamp(AUDIO_MIX.commentaryBaseVolume * AUDIO_MIX.commentaryLevel, 0, 1);
  AUDIO_MIX.bgmCommentaryVolume = clamp(AUDIO_MIX.bgmCommentaryBaseVolume * AUDIO_MIX.bgmLevel, 0, 1);
  AUDIO_MIX.bgmIdleVolume = clamp(AUDIO_MIX.bgmIdleBaseVolume * AUDIO_MIX.bgmLevel, 0, 1);
}

recalculateAudioMixLevels();

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
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function humanizeIntervalLabel(interval, options = {}) {
  const labelMap = {
    "1m": { title: "1 Minute", lower: "1 minute" },
    "5m": { title: "5 Minutes", lower: "5 minutes" },
    "15m": { title: "15 Minutes", lower: "15 minutes" },
    "30m": { title: "30 Minutes", lower: "30 minutes" },
    "1h": { title: "1 Hour", lower: "1 hour" },
    "4h": { title: "4 Hours", lower: "4 hours" },
    "1d": { title: "1 Day", lower: "1 day" },
    "1D": { title: "1 Day", lower: "1 day" },
  };
  const resolved = labelMap[String(interval)] || { title: String(interval), lower: String(interval).toLowerCase() };
  return options.lower ? resolved.lower : resolved.title;
}

function humanizeIntervalList(intervals = [], options = {}) {
  return intervals
    .filter(Boolean)
    .map((interval) => humanizeIntervalLabel(interval, options))
    .join(" · ");
}

function waitMs(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, duration));
  });
}

function shuffleArray(values = []) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function refillBgmQueue(previousTrackName = "") {
  const tracks = [...voiceDirector.bgmPlaylist];
  if (!tracks.length) {
    voiceDirector.bgmQueue = [];
    return;
  }
  const shuffled = shuffleArray(tracks);
  if (shuffled.length > 1 && previousTrackName && shuffled[0]?.name === previousTrackName) {
    const replacementIndex = shuffled.findIndex((track, index) => index > 0 && track.name !== previousTrackName);
    if (replacementIndex > 0) {
      [shuffled[0], shuffled[replacementIndex]] = [shuffled[replacementIndex], shuffled[0]];
    }
  }
  voiceDirector.bgmQueue = shuffled;
}

async function ensureBgmPlaylistLoaded(force = false) {
  if (!force && voiceDirector.bgmPlaylist.length) {
    return voiceDirector.bgmPlaylist;
  }
  if (!force && voiceDirector.bgmPlaylistPromise) {
    return voiceDirector.bgmPlaylistPromise;
  }

  const request = fetch(AUDIO_MIX.bgmPlaylistApiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`BGM playlist request failed with ${response.status}`);
      }
      return response.json();
    })
    .then((payload) => {
      const tracks = Array.isArray(payload?.tracks)
        ? payload.tracks.filter((track) => track?.url).map((track) => ({
            name: String(track.name || "Unknown Track"),
            url: String(track.url),
          }))
        : [];
      voiceDirector.bgmPlaylist = tracks;
      refillBgmQueue(voiceDirector.bgmCurrentTrack?.name || "");
      return tracks;
    })
    .catch(() => {
      voiceDirector.bgmPlaylist = [];
      voiceDirector.bgmQueue = [];
      return [];
    })
    .finally(() => {
      voiceDirector.bgmPlaylistPromise = null;
    });
  voiceDirector.bgmPlaylistPromise = request;
  return request;
}

function applyBgmTrack(track) {
  const bgm = voiceDirector.bgm;
  if (!bgm || !track?.url) {
    return false;
  }
  voiceDirector.bgmCurrentTrack = track;
  bgm.src = track.url;
  bgm.load();
  return true;
}

function nextBgmTrack(previousTrackName = "") {
  if (!voiceDirector.bgmPlaylist.length) {
    return null;
  }
  if (!voiceDirector.bgmQueue.length) {
    refillBgmQueue(previousTrackName || voiceDirector.bgmCurrentTrack?.name || "");
  }
  return voiceDirector.bgmQueue.shift() || null;
}

async function queueNextBackgroundTrack(options = {}) {
  const tracks = await ensureBgmPlaylistLoaded(Boolean(options.forceReload));
  if (!tracks.length) {
    return false;
  }
  const nextTrack = nextBgmTrack(options.previousTrackName || voiceDirector.bgmCurrentTrack?.name || "");
  if (!nextTrack) {
    return false;
  }
  applyBgmTrack(nextTrack);
  return true;
}

function clearSubscribePromoPopupTimer() {
  if (subscribePromoPopupTimer) {
    clearTimeout(subscribePromoPopupTimer);
    subscribePromoPopupTimer = 0;
  }
}

function hideSubscribePromoPopup() {
  clearSubscribePromoPopupTimer();
  if (!dom.subscribePromoPopup) {
    return;
  }
  dom.subscribePromoPopup.classList.remove("active");
  dom.subscribePromoPopup.setAttribute("aria-hidden", "true");
}

function showSubscribePromoPopup() {
  if (!dom.subscribePromoPopup) {
    return;
  }
  clearSubscribePromoPopupTimer();
  dom.subscribePromoPopup.classList.remove("active");
  void dom.subscribePromoPopup.offsetWidth;
  dom.subscribePromoPopup.classList.add("active");
  dom.subscribePromoPopup.setAttribute("aria-hidden", "false");
  subscribePromoPopupTimer = window.setTimeout(() => {
    hideSubscribePromoPopup();
  }, 3600);
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

function calculateSMA(values, period) {
  if (!values.length || period <= 0) {
    return [];
  }
  const sma = [];
  let rollingTotal = 0;
  values.forEach((value, index) => {
    rollingTotal += value;
    if (index >= period) {
      rollingTotal -= values[index - period];
    }
    if (index < period - 1) {
      sma.push(null);
      return;
    }
    sma.push(rollingTotal / period);
  });
  return sma;
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
  const newsKey = activeItem
    ? [state.newsPanelIndex, activeItem.source || "", activeItem.title || "", activeItem.relativeTime || "", newsItems.length].join("|")
    : `empty:${newsItems.length}`;

  if (renderCache.newsPanelKey === newsKey) {
    return;
  }
  renderCache.newsPanelKey = newsKey;

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
    if (payload.assignments) {
      voiceDirector.voiceAssignments = payload.assignments;
      voiceDirector.assignmentsVersion = Number(payload.assignments.version || 0);
    }
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

async function refreshVoiceAssignments() {
  const response = await fetch("/api/voice-assignments", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Voice assignments HTTP ${response.status}`);
  }
  const payload = await response.json();
  voiceDirector.voiceAssignments = payload;
  voiceDirector.assignmentsVersion = Number(payload.version || 0);
  return payload;
}

async function handleVoiceAssignmentsVersionChange(previousVersion, nextState) {
  if (!nextState || !previousVersion || previousVersion === Number(nextState.version || 0)) {
    return;
  }
  interruptVoicePlayback();
  await Promise.all([refreshVoiceCatalog(), refreshPodcastCatalog()]).catch(() => {});
}

function startVoiceAssignmentPolling() {
  if (voiceDirector.assignmentPollTimer) {
    return;
  }
  const poll = async () => {
    if (voiceDirector.assignmentPollInFlight) {
      return;
    }
    voiceDirector.assignmentPollInFlight = true;
    try {
      const previousVersion = Number(voiceDirector.assignmentsVersion || 0);
      const nextState = await refreshVoiceAssignments();
      if (previousVersion && Number(nextState?.version || 0) !== previousVersion) {
        await handleVoiceAssignmentsVersionChange(previousVersion, nextState);
      }
    } catch {
      // Keep the current voice selection state until the next successful poll.
    } finally {
      voiceDirector.assignmentPollInFlight = false;
    }
  };
  poll().catch(() => {});
  voiceDirector.assignmentPollTimer = window.setInterval(() => {
    poll().catch(() => {});
  }, 10000);
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

function isLaunchScreenActive() {
  return Boolean(state.launch?.active || state.launch?.countdownActive);
}

function canAutoPlayLiveCommentary() {
  return !isLaunchScreenActive() && voiceDirector.audioUnlocked && !voiceDirector.pendingAutoStart;
}

function clearLaunchCountdownTimers() {
  state.launch.timers.forEach((timerId) => clearTimeout(timerId));
  state.launch.timers = [];
}

function updateLaunchScreenState() {
  if (!dom.launchScreen || !dom.launchButton || !dom.launchCountdown || !dom.launchStatus) {
    return;
  }
  dom.body?.classList.toggle("launch-active", state.launch.active);
  dom.launchScreen.classList.toggle("is-hidden", !state.launch.active);
  dom.launchScreen.setAttribute("aria-hidden", state.launch.active ? "false" : "true");
  dom.launchButton.disabled = state.launch.countdownActive;
  dom.launchCountdown.textContent = state.launch.countdownActive ? String(state.launch.remaining) : "10";
  dom.launchStatus.textContent = state.launch.countdownActive
    ? `Voice gate opening in ${state.launch.remaining} seconds`
    : "Waiting for launch";
  updateFooterControlState();
}

function speakLaunchCountdownValue(value) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(value));
  utterance.rate = 0.88;
  utterance.pitch = 0.9;
  utterance.volume = 1;
  const preferredVoice = window.speechSynthesis
    .getVoices()
    .find((voice) => /en/i.test(voice.lang) && /female|samantha|victoria|ava|karen|zira/i.test(voice.name));
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  window.speechSynthesis.speak(utterance);
}

function completeLaunchSequence() {
  clearLaunchCountdownTimers();
  state.launch.countdownActive = false;
  state.launch.active = false;
  state.launch.remaining = 10;
  window.speechSynthesis?.cancel?.();
  updateLaunchScreenState();
  updateAudioMix("idle");
  if (!isIntermissionActive()) {
    activateCoin(state.currentIndex, {
      resetRotation: true,
      intervalIndex: 0,
    })
      .then(() => {
        if (hasAnyCommentaryProvider() && voiceDirector.audioUnlocked) {
          voiceDirector.warmupQueued = false;
          maybeQueueAmbientCommentary(true);
        }
      })
      .catch(() => {});
    return;
  }
  if (hasAnyCommentaryProvider() && voiceDirector.audioUnlocked) {
    voiceDirector.warmupQueued = false;
    maybeQueueAmbientCommentary(true);
  }
}

function beginLaunchCountdown() {
  if (!dom.launchScreen || state.launch.countdownActive || !state.launch.active) {
    return;
  }
  state.launch.countdownActive = true;
  state.launch.remaining = 10;
  updateLaunchScreenState();
  preloadWarmupIntro().catch(() => {});
  speakLaunchCountdownValue(state.launch.remaining);

  const tick = () => {
    state.launch.remaining -= 1;
    if (state.launch.remaining <= 0) {
      completeLaunchSequence();
      return;
    }
    updateLaunchScreenState();
    speakLaunchCountdownValue(state.launch.remaining);
    const timerId = setTimeout(tick, 1000);
    state.launch.timers.push(timerId);
  };

  const timerId = setTimeout(tick, 1000);
  state.launch.timers.push(timerId);
}

async function unlockVoicePlayback(triggerTest = false, options = {}) {
  voiceDirector.audioUnlocked = true;
  voiceDirector.audioPlaybackAllowed = true;
  voiceDirector.pendingAutoStart = false;
  if (voiceDirector.audio) {
    voiceDirector.audio.muted = false;
    voiceDirector.audio.volume = AUDIO_MIX.commentaryVolume;
  }
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
  } else {
    setTimeout(() => {
      updateAudioMix("idle", {
        immediate: !voiceDirector.bgmStarted,
        allowDuringLaunch: Boolean(options.allowDuringLaunch),
      });
      if (!options.suppressAutoQueue && !isIntermissionActive() && hasAnyCommentaryProvider() && !isLaunchScreenActive()) {
        voiceDirector.warmupQueued = false;
        maybeQueueAmbientCommentary(true);
      }
    }, 140);
  }
}

async function initVoiceDirector() {
  if (voiceDirector.initialized) {
    return;
  }

  voiceDirector.initialized = true;
  voiceDirector.audio = dom.voiceAudioPlayer || new Audio();
  voiceDirector.bgm = dom.bgmAudioPlayer || new Audio();
  voiceDirector.audio.preload = "auto";
  voiceDirector.audio.crossOrigin = "anonymous";
  voiceDirector.audio.volume = AUDIO_MIX.commentaryVolume;
  voiceDirector.audio.muted = false;
  voiceDirector.audio.playsInline = true;
  voiceDirector.bgm.preload = "auto";
  voiceDirector.bgm.crossOrigin = "anonymous";
  voiceDirector.bgm.volume = 0;
  voiceDirector.bgm.muted = false;
  voiceDirector.bgm.loop = false;
  voiceDirector.bgm.playsInline = true;
  if (!dom.voiceAudioPlayer && voiceDirector.audio instanceof HTMLAudioElement) {
    voiceDirector.audio.className = "voice-audio-player";
    document.body.appendChild(voiceDirector.audio);
  }
  if (!dom.bgmAudioPlayer && voiceDirector.bgm instanceof HTMLAudioElement) {
    voiceDirector.bgm.className = "voice-audio-player";
    document.body.appendChild(voiceDirector.bgm);
  }
  voiceDirector.bgm.addEventListener("ended", () => {
    voiceDirector.bgmStarted = false;
    queueNextBackgroundTrack({ previousTrackName: voiceDirector.bgmCurrentTrack?.name || "" })
      .then((queued) => {
        if (!queued) {
          return false;
        }
        return ensureBackgroundMusicPlayback({
          allowDuringLaunch: state.launch.active || state.launch.countdownActive,
        });
      })
      .catch(() => {});
  });
  ensureBgmPlaylistLoaded().catch(() => {});
  if (dom.voiceToggle) {
    dom.voiceToggle.addEventListener("click", (event) => {
      event.preventDefault();
      if (!voiceDirector.audioUnlocked || voiceDirector.pendingAutoStart || !voiceDirector.audioPlaybackAllowed) {
        unlockVoicePlayback(true).catch(() => {});
        return;
      }
      window.cryptoStreamOverlay?.testVoice?.();
    });
  }
  const beginLaunchFromGesture = (event) => {
    if (!state.launch.active || state.launch.countdownActive) {
      return;
    }
    if (event) {
      event.preventDefault();
    }
    unlockVoicePlayback(false, { suppressAutoQueue: true, allowDuringLaunch: true }).catch(() => {});
    beginLaunchCountdown();
  };
  dom.launchButton?.addEventListener("click", beginLaunchFromGesture);
  const unlockFromGesture = () => {
    if (isLaunchScreenActive()) {
      return;
    }
    if (!voiceDirector.audioUnlocked || voiceDirector.pendingAutoStart) {
      unlockVoicePlayback(false).catch(() => {});
      return;
    }
    window.removeEventListener("pointerdown", unlockFromGesture, true);
    window.removeEventListener("keydown", unlockFromGesture, true);
  };
  window.addEventListener("pointerdown", unlockFromGesture, { capture: true });
  window.addEventListener("keydown", unlockFromGesture, { capture: true });
  await refreshVoiceAssignments().catch(() => {});
  await refreshVoiceCatalog();
  await refreshPodcastCatalog();
  startVoiceAssignmentPolling();
  voiceDirector.audioUnlocked = false;
  voiceDirector.audioPlaybackAllowed = true;
  voiceDirector.pendingAutoStart = true;
  updateLaunchScreenState();
  updateVoiceControls();
  updateFooterControlState();
}

function stopBackgroundMusicFade() {
  if (!voiceDirector.bgmFadeFrame) {
    return;
  }
  cancelAnimationFrame(voiceDirector.bgmFadeFrame);
  voiceDirector.bgmFadeFrame = 0;
}

function animateBackgroundMusicVolume(targetVolume, options = {}) {
  const bgm = voiceDirector.bgm;
  if (!bgm) {
    return;
  }

  const nextTarget = clamp(Number(targetVolume) || 0, 0, 1);
  const immediate = Boolean(options.immediate);
  voiceDirector.bgmTargetVolume = nextTarget;
  stopBackgroundMusicFade();

  if (immediate) {
    bgm.volume = nextTarget;
    return;
  }

  const startVolume = Number.isFinite(bgm.volume) ? bgm.volume : 0;
  const durationMs = clamp(Number(options.durationMs || AUDIO_MIX.bgmFadeMs) || AUDIO_MIX.bgmFadeMs, 120, 1600);
  const startedAt = performance.now();

  const step = (now) => {
    const progress = clamp((now - startedAt) / durationMs, 0, 1);
    bgm.volume = lerp(startVolume, nextTarget, easeInOutCubic(progress));
    if (progress < 1) {
      voiceDirector.bgmFadeFrame = requestAnimationFrame(step);
    } else {
      voiceDirector.bgmFadeFrame = 0;
      bgm.volume = nextTarget;
    }
  };

  voiceDirector.bgmFadeFrame = requestAnimationFrame(step);
}

async function ensureBackgroundMusicPlayback(options = {}) {
  const bgm = voiceDirector.bgm;
  if (!bgm || !voiceDirector.audioUnlocked) {
    return false;
  }
  if (!options.allowDuringLaunch && isLaunchScreenActive()) {
    return false;
  }
  if (!bgm.src) {
    const queued = await queueNextBackgroundTrack();
    if (!queued || !bgm.src) {
      return false;
    }
  }
  if (!bgm.paused && !bgm.ended) {
    voiceDirector.bgmStarted = true;
    return true;
  }
  try {
    await bgm.play();
    voiceDirector.bgmStarted = true;
    return true;
  } catch {
    voiceDirector.bgmStarted = false;
    return false;
  }
}

function updateAudioMix(mode = "idle", options = {}) {
  if (voiceDirector.audio) {
    voiceDirector.audio.volume = AUDIO_MIX.commentaryVolume;
  }

  const resolvedMode = isLaunchScreenActive() && !options.allowDuringLaunch ? "muted" : mode;
  if (resolvedMode !== "muted") {
    ensureBackgroundMusicPlayback({ allowDuringLaunch: Boolean(options.allowDuringLaunch) }).catch(() => {});
  }

  const targetVolume = resolvedMode === "commentary"
    ? AUDIO_MIX.bgmCommentaryVolume
    : resolvedMode === "idle"
      ? AUDIO_MIX.bgmIdleVolume
      : 0;
  animateBackgroundMusicVolume(targetVolume, options);
}

function currentSkipButtonLabel() {
  return state.streamControl.stopped && state.intermission.active ? "Resume" : "Skip";
}

function updateFooterControlState() {
  if (dom.bgmVolumeSlider && document.activeElement !== dom.bgmVolumeSlider) {
    dom.bgmVolumeSlider.value = String(Math.round(AUDIO_MIX.bgmLevel * 100));
  }
  if (dom.voiceVolumeSlider && document.activeElement !== dom.voiceVolumeSlider) {
    dom.voiceVolumeSlider.value = String(Math.round(AUDIO_MIX.commentaryLevel * 100));
  }
  if (dom.launchBgmVolumeSlider && document.activeElement !== dom.launchBgmVolumeSlider) {
    dom.launchBgmVolumeSlider.value = String(Math.round(AUDIO_MIX.bgmLevel * 100));
  }
  if (dom.launchVoiceVolumeSlider && document.activeElement !== dom.launchVoiceVolumeSlider) {
    dom.launchVoiceVolumeSlider.value = String(Math.round(AUDIO_MIX.commentaryLevel * 100));
  }
  if (dom.bgmVolumeValue) {
    dom.bgmVolumeValue.textContent = `${Math.round(AUDIO_MIX.bgmLevel * 100)}%`;
  }
  if (dom.voiceVolumeValue) {
    dom.voiceVolumeValue.textContent = `${Math.round(AUDIO_MIX.commentaryLevel * 100)}%`;
  }
  if (dom.launchBgmVolumeValue) {
    dom.launchBgmVolumeValue.textContent = `${Math.round(AUDIO_MIX.bgmLevel * 100)}%`;
  }
  if (dom.launchVoiceVolumeValue) {
    dom.launchVoiceVolumeValue.textContent = `${Math.round(AUDIO_MIX.commentaryLevel * 100)}%`;
  }

  const stopped = Boolean(state.streamControl.stopped && state.intermission.active);
  const stopPending = Boolean(state.streamControl.stopAfterCurrent && !stopped);
  const canResume = stopped && state.intermission.active;

  if (dom.streamSkipButton) {
    dom.streamSkipButton.textContent = currentSkipButtonLabel();
    dom.streamSkipButton.disabled = Boolean(state.launch.active);
  }

  if (dom.streamStopButton) {
    dom.streamStopButton.textContent = stopped ? "Stopped" : stopPending ? "Stopping" : "Stop";
    dom.streamStopButton.disabled = Boolean(state.launch.active || stopped || stopPending);
  }
}

function nextIntermissionStageRunId() {
  const nextId = Number(state.intermission.stageRunId || 0) + 1;
  state.intermission.stageRunId = nextId;
  return nextId;
}

function isIntermissionStageCurrent(token, runId) {
  return Boolean(
    state.intermission.active
    && state.intermission.token === token
    && state.intermission.stageRunId === runId
  );
}

async function waitForIntermissionStage(duration, token, runId) {
  const startedAt = Date.now();
  const targetDuration = Math.max(0, Number(duration) || 0);
  while (Date.now() - startedAt < targetDuration) {
    if (!isIntermissionStageCurrent(token, runId)) {
      return false;
    }
    await waitMs(Math.min(140, targetDuration - (Date.now() - startedAt)));
  }
  return isIntermissionStageCurrent(token, runId);
}

function enterStoppedIntermission(token) {
  if (!state.intermission.active || state.intermission.token !== token) {
    return;
  }

  clearIntermissionTimers();
  endIntermissionVoice(token);
  state.intermission.phase = "stopped";
  state.intermission.phaseStartedAt = Date.now();
  state.intermission.openingEndsAt = 0;
  state.intermission.subtitleClip = null;
  state.streamControl.stopAfterCurrent = true;
  state.streamControl.stopped = true;
  renderIntermissionOverlay();
  updateAudioMix("idle");
  updateFooterControlState();
}

function handleSkipControl() {
  if (state.launch.active) {
    return;
  }

  if (state.streamControl.stopped && state.intermission.active) {
    state.streamControl.stopAfterCurrent = false;
    state.streamControl.stopped = false;
    updateFooterControlState();
    finishIntermission(state.intermission.token);
    return;
  }

  if (state.intermission.active) {
    interruptVoicePlayback();
    clearIntermissionTimers();
    const token = state.intermission.token;
    const runId = nextIntermissionStageRunId();

    if (state.intermission.phase === "opening") {
      finishIntermission(token);
      return;
    }

    if (state.intermission.phase === "news") {
      if (state.streamControl.stopAfterCurrent) {
        enterStoppedIntermission(token);
        return;
      }
      enterIntermissionOpeningPhase(token);
      return;
    }

    if (state.intermission.phase === "summary" || state.intermission.phase === "closing") {
      state.intermission.phase = "news";
      state.intermission.phaseStartedAt = Date.now();
      renderIntermissionOverlay();
      runIntermissionNewsPhase(token, runId).catch(() => {
        if (!state.intermission.active || state.intermission.token !== token) {
          return;
        }
        if (state.streamControl.stopAfterCurrent) {
          enterStoppedIntermission(token);
          return;
        }
        enterIntermissionOpeningPhase(token);
      });
      return;
    }

    return;
  }

  state.streamControl.stopAfterCurrent = false;
  state.streamControl.stopped = false;
  updateFooterControlState();
  startIntermission();
}

function handleStopControl() {
  if (state.launch.active || state.streamControl.stopAfterCurrent || state.streamControl.stopped) {
    return;
  }

  state.streamControl.stopAfterCurrent = true;
  state.streamControl.stopped = false;
  updateFooterControlState();

  if (!state.intermission.active) {
    startIntermission();
    return;
  }

  if (state.intermission.phase === "opening") {
    enterStoppedIntermission(state.intermission.token);
  }
}

function initFooterControls() {
  updateFooterControlState();

  const handleBgmSliderInput = (event) => {
    AUDIO_MIX.bgmLevel = clamp(Number(event.target.value) / 100 || 0, 0, 1);
    recalculateAudioMixLevels();
    updateAudioMix(voiceDirector.isProcessing ? "commentary" : "idle", {
      immediate: true,
      allowDuringLaunch: isLaunchScreenActive(),
    });
    updateFooterControlState();
  };

  const handleVoiceSliderInput = (event) => {
    AUDIO_MIX.commentaryLevel = clamp(Number(event.target.value) / 100 || 0, 0, 1);
    recalculateAudioMixLevels();
    updateAudioMix(voiceDirector.isProcessing ? "commentary" : "idle", {
      immediate: true,
      allowDuringLaunch: isLaunchScreenActive(),
    });
    updateFooterControlState();
  };

  dom.streamSkipButton?.addEventListener("click", () => {
    handleSkipControl();
  });
  dom.streamStopButton?.addEventListener("click", () => {
    handleStopControl();
  });
  dom.bgmVolumeSlider?.addEventListener("input", handleBgmSliderInput);
  dom.launchBgmVolumeSlider?.addEventListener("input", handleBgmSliderInput);
  dom.voiceVolumeSlider?.addEventListener("input", handleVoiceSliderInput);
  dom.launchVoiceVolumeSlider?.addEventListener("input", handleVoiceSliderInput);
}

function clearIntermissionNewsHighlight() {
  if (!dom.intermissionOverlay) {
    return;
  }
  dom.intermissionOverlay
    .querySelectorAll(".intermission-news-story.speaking")
    .forEach((card) => card.classList.remove("speaking"));
}

function setIntermissionNewsHighlight(newsIndex) {
  if (!dom.intermissionOverlay) {
    return;
  }
  clearIntermissionNewsHighlight();
  const target = dom.intermissionOverlay.querySelector(`.intermission-news-story[data-news-index="${newsIndex}"]`);
  if (target) {
    target.classList.add("speaking");
  }
}

function clearVoiceSubtitle() {
  if (!dom.voiceSubtitleLayer) {
    return;
  }
  clearScheduledSubtitleTimers();
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
  const clipDuration = Math.max(1200, Number(durationMs || 2400));
  const revealDelay = clamp(clipDuration / Math.max(words.length, 1), 70, 260);
  const totalReveal = Math.round(words.length * revealDelay);
  const holdMs = 600;
  const fadeMs = 600;
  const lineFadeStart = Math.max(totalReveal + holdMs, clipDuration - fadeMs);
  return `
    <span
      class="voice-subtitle-line"
      style="--line-fade-start:${lineFadeStart}ms; --line-fade-duration:${fadeMs}ms;"
    >
      ${words
        .map((word, index) => `
          <span
            class="voice-subtitle-word"
            style="--reveal-delay:${Math.round(index * revealDelay)}ms;"
          >${escapeHtml(word)}&nbsp;</span>
        `)
        .join("")}
    </span>
  `;
}

function clearScheduledSubtitleTimers() {
  voiceDirector.subtitleTimers.forEach((timerId) => clearTimeout(timerId));
  voiceDirector.subtitleTimers = [];
  if (voiceDirector.subtitleFrame) {
    cancelAnimationFrame(voiceDirector.subtitleFrame);
    voiceDirector.subtitleFrame = 0;
  }
}

function scheduleSubtitleTimer(callback, delay) {
  const timerId = setTimeout(callback, Math.max(0, delay));
  voiceDirector.subtitleTimers.push(timerId);
}

function buildSubtitleTimingModel(text, line, durationMs = 2400) {
  const pages = splitSubtitleIntoPages(text, line);
  const words = pages.flat();
  if (!words.length) {
    return null;
  }

  const clipDuration = Math.max(1200, Number(durationMs || 2400));
  const holdMs = 420;
  const fadeMs = 420;
  const pagePauseMs = pages.length > 1 ? 140 : 0;
  const timingBudget = Math.max(clipDuration - holdMs - fadeMs, words.length * 70);
  const revealDelay = clamp(
    (timingBudget - Math.max(0, pages.length - 1) * pagePauseMs) / Math.max(words.length, 1),
    70,
    220
  );
  const totalReveal = Math.round(words.length * revealDelay + Math.max(0, pages.length - 1) * pagePauseMs);
  const lineFadeStart = Math.max(totalReveal + holdMs, clipDuration - fadeMs);

  return {
    pages,
    clipDuration,
    pagePauseMs,
    revealDelay,
    lineFadeStart,
  };
}

function renderSubtitleAtProgress(line, model, elapsedMs, options = {}) {
  if (!line || !model) {
    return;
  }

  const persist = Boolean(options.persist);
  const safeElapsed = Math.max(0, elapsedMs);

  line.classList.add("is-visible");
  if (!persist && safeElapsed >= model.lineFadeStart) {
    line.classList.add("fade-out");
  } else {
    line.classList.remove("fade-out");
  }

  let pageStartMs = 0;
  for (const pageWords of model.pages) {
    const pageRevealMs = pageWords.length * model.revealDelay;
    const pageEndMs = pageStartMs + pageRevealMs;
    if (safeElapsed < pageStartMs) {
      line.textContent = "";
      return;
    }
    if (safeElapsed <= pageEndMs) {
      const visibleCount = clamp(
        Math.floor((safeElapsed - pageStartMs) / model.revealDelay) + 1,
        1,
        pageWords.length
      );
      line.textContent = pageWords.slice(0, visibleCount).join(" ");
      return;
    }
    line.textContent = pageWords.join(" ");
    pageStartMs = pageEndMs + model.pagePauseMs;
  }
}

function measureSubtitleTextWidth(text, line) {
  const canvas = measureSubtitleTextWidth.canvas || (measureSubtitleTextWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  if (!context) {
    return text.length * 10;
  }
  const computed = window.getComputedStyle(line);
  context.font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
  return context.measureText(text).width;
}

function splitSubtitleIntoPages(text, line) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }

  const availableWidth = Math.max(
    line.getBoundingClientRect().width || 0,
    line.parentElement?.getBoundingClientRect().width || 0,
    dom.voiceSubtitleLayer?.getBoundingClientRect().width || 0,
    160
  ) - 8;

  const pages = [];
  let currentWords = [];

  words.forEach((word) => {
    const candidateWords = currentWords.length ? [...currentWords, word] : [word];
    const candidateText = candidateWords.join(" ");
    if (!currentWords.length || measureSubtitleTextWidth(candidateText, line) <= availableWidth) {
      currentWords = candidateWords;
      return;
    }
    pages.push(currentWords);
    currentWords = [word];
  });

  if (currentWords.length) {
    pages.push(currentWords);
  }

  return pages;
}

function hydrateLiveSubtitleLine(text, durationMs = 2400, options = {}) {
  if (!dom.voiceSubtitleLayer) {
    return;
  }
  const line = dom.voiceSubtitleLayer.querySelector("[data-live-subtitle-line]");
  if (!line) {
    return;
  }

  clearScheduledSubtitleTimers();
  const model = buildSubtitleTimingModel(text, line, durationMs);
  if (!model) {
    line.textContent = "";
    return;
  }
  const persist = Boolean(options.persist);

  line.textContent = "";
  line.classList.add("is-visible");
  line.classList.remove("fade-out");

  if (options.syncWithAudio && voiceDirector.audio) {
    const startedAt = performance.now();
    const step = () => {
      if (!document.body.contains(line) || !voiceDirector.audio) {
        voiceDirector.subtitleFrame = 0;
        return;
      }
      const elapsedMs = voiceDirector.audio.currentTime > 0
        ? voiceDirector.audio.currentTime * 1000
        : performance.now() - startedAt;
      renderSubtitleAtProgress(line, model, elapsedMs, { persist });
      if (!voiceDirector.audio.paused && !voiceDirector.audio.ended) {
        voiceDirector.subtitleFrame = requestAnimationFrame(step);
      } else {
        voiceDirector.subtitleFrame = 0;
        renderSubtitleAtProgress(line, model, model.clipDuration, { persist });
      }
    };
    renderSubtitleAtProgress(line, model, 0, { persist });
    voiceDirector.subtitleFrame = requestAnimationFrame(step);
    return;
  }

  renderSubtitleAtProgress(line, model, 0, { persist });
  let stepMs = model.revealDelay;
  const totalWords = model.pages.reduce((sum, pageWords) => sum + pageWords.length, 0);
  for (let index = 0; index < totalWords; index += 1) {
    const targetMs = stepMs;
    scheduleSubtitleTimer(() => {
      renderSubtitleAtProgress(line, model, targetMs, { persist });
    }, Math.round(targetMs));
    stepMs += model.revealDelay;
  }

  if (!persist) {
    scheduleSubtitleTimer(() => {
      line.classList.add("fade-out");
    }, model.lineFadeStart);
  }
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
      <p class="voice-subtitle-text"><span class="voice-subtitle-line" data-live-subtitle-line></span></p>
    </div>
  `;
  hydrateLiveSubtitleLine(clip.text || "", clip.duration_ms || 2400, {
    persist: options.displayMode !== "intermission",
    syncWithAudio: Boolean(options.syncWithAudio),
  });
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
      <p class="intermission-live-subtitle-text">${escapeHtml(clip.text || "")}</p>
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

function clearWarmupPreload() {
  voiceDirector.warmupPreloadKey = "";
  voiceDirector.warmupPreloadResponse = null;
  voiceDirector.warmupPreloadPromise = null;
}

function resetLiveCommentaryObservation(options = {}) {
  const resetWarmup = options.resetWarmup !== false;
  voiceDirector.lastObservedSnapshot = null;
  if (resetWarmup) {
    voiceDirector.warmupQueued = false;
    clearWarmupPreload();
  }
  voiceDirector.lastAmbientQueuedAt = 0;
  voiceDirector.lastAmbientType = "pattern";
  updateVoiceControls();
}

function noteSpeechEnded() {
  voiceDirector.lastSpeechEndedAt = Date.now();
}

function isSubscribePromptActive() {
  return voiceDirector.currentMode === "subscribe_cta" && voiceDirector.isProcessing;
}

function shuffleSubscribePromptBag(previousLine = "") {
  const bag = [...SUBSCRIBE_PROMPT_LINES];
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
  }
  if (bag.length > 1 && previousLine && bag[0] === previousLine) {
    const replacementIndex = bag.findIndex((line, index) => index > 0 && line !== previousLine);
    if (replacementIndex > 0) {
      [bag[0], bag[replacementIndex]] = [bag[replacementIndex], bag[0]];
    }
  }
  return bag;
}

function nextSubscribePromptLine() {
  if (!voiceDirector.subscribePromptBag.length) {
    voiceDirector.subscribePromptBag = shuffleSubscribePromptBag(voiceDirector.lastSubscribePromptLine);
  }
  const line = voiceDirector.subscribePromptBag.shift() || SUBSCRIBE_PROMPT_LINES[0];
  voiceDirector.lastSubscribePromptLine = line;
  return line;
}

function canTriggerSubscribePrompt(trigger, token = 0) {
  const now = Date.now();
  if (!hasAnyCommentaryProvider() || !voiceDirector.audioUnlocked || voiceDirector.subscribePromptPending || voiceDirector.isProcessing) {
    return false;
  }
  if (trigger === "idle_gap") {
    if (now - voiceDirector.lastSubscribePromptAt < SUBSCRIBE_PROMPT_COOLDOWN_MS) {
      return false;
    }
    const inSummaryStage = state.intermission.active && state.intermission.phase === "summary";
    const inLiveStage = !state.launch.active && !state.intermission.active;
    if (!inSummaryStage && !inLiveStage) {
      return false;
    }
    if (!voiceDirector.lastSpeechEndedAt || now - voiceDirector.lastSpeechEndedAt < SUBSCRIBE_PROMPT_SILENCE_MS) {
      return false;
    }
    if (voiceDirector.queue.length || voiceDirector.currentMode !== "idle") {
      return false;
    }
    return true;
  }
  if (trigger === "next_coin_handoff") {
    if (
      !state.intermission.active
      || state.intermission.token !== token
      || state.intermission.phase !== "opening"
      || state.streamControl.stopAfterCurrent
      || state.streamControl.stopped
      || voiceDirector.openingPromptPlayedForToken === token
    ) {
      return false;
    }
    return true;
  }
  return false;
}

async function requestSubscribePromptResponse(trigger, line, coin) {
  const event = { trigger, line };
  if (voiceDirector.serviceReady) {
    try {
      const response = await requestCommentarySequence(
        buildCommentaryPayload("subscribe_cta", {
          coin,
          event,
        })
      );
      if (response?.sequence?.length) {
        return response;
      }
    } catch {
      // Fall through to podcast fallback when available.
    }
  }
  if (!hasPodcastCommentaryProvider()) {
    return null;
  }
  try {
    const response = await requestPodcastRender(
      buildPodcastPayload("subscribe_cta", {
        coin,
        event,
      })
    );
    return response?.sequence?.length ? response : null;
  } catch {
    return null;
  }
}

async function playSubscribePrompt(trigger, options = {}) {
  const token = Number(options.token || 0);
  if (!canTriggerSubscribePrompt(trigger, token)) {
    return false;
  }

  const line = options.line || nextSubscribePromptLine();
  const coin = options.coin || state.intermission.coin || currentCoin();
  let playedSequence = false;

  voiceDirector.subscribePromptPending = true;
  voiceDirector.isProcessing = true;
  voiceDirector.currentMode = "subscribe_cta";
  updateVoiceControls();

  try {
    const response = await requestSubscribePromptResponse(trigger, line, coin);
    if (!response?.sequence?.length) {
      return false;
    }
    if (trigger === "next_coin_handoff" && token) {
      voiceDirector.openingPromptPlayedForToken = token;
    }
    voiceDirector.lastSubscribePromptAt = Date.now();
    playedSequence = true;
    showSubscribePromoPopup();
    await playCommentarySequence(response.sequence, {
      displayMode: options.displayMode || "live",
      modeLabel: "Subscribe prompt",
      syncChart: false,
    });
    return true;
  } finally {
    voiceDirector.subscribePromptPending = false;
    if (!playedSequence) {
      voiceDirector.isProcessing = false;
      voiceDirector.currentMode = "idle";
      updateAudioMix("idle");
      updateVoiceControls();
    }
    if (!isIntermissionActive() && voiceDirector.queue.length && !voiceDirector.isProcessing) {
      processLiveCommentaryQueue().catch(() => {});
    }
  }
}

function maybeQueueSubscribePrompt() {
  if (!canTriggerSubscribePrompt("idle_gap")) {
    return;
  }
  playSubscribePrompt("idle_gap", {
    coin: state.intermission.coin || currentCoin(),
    displayMode: state.intermission.active ? "intermission" : "live",
  }).catch(() => {});
}

function triggerNextCoinSubscribePrompt(token) {
  if (!canTriggerSubscribePrompt("next_coin_handoff", token)) {
    return;
  }
  playSubscribePrompt("next_coin_handoff", {
    token,
    line: nextSubscribePromptLine(),
    coin: CONFIG.coins[state.intermission.nextCoinIndex ?? state.currentIndex] || currentCoin(),
    displayMode: "intermission",
  }).catch(() => {});
}

function interruptVoicePlayback() {
  const hadPlayback = Boolean(voiceDirector.isProcessing || dom.voiceSubtitleLayer?.textContent?.trim());
  voiceDirector.currentPlaybackToken += 1;
  voiceDirector.queue = [];
  voiceDirector.isProcessing = false;
  voiceDirector.activeLiveEvent = null;
  voiceDirector.subscribePromptPending = false;
  voiceDirector.currentMode = "idle";
  if (voiceDirector.audio) {
    voiceDirector.audio.pause();
    voiceDirector.audio.removeAttribute("src");
    voiceDirector.audio.load();
  }
  clearChartCommentaryFocus(true);
  clearIntermissionNewsHighlight();
  clearVoiceSubtitle();
  hideSubscribePromoPopup();
  if (hadPlayback) {
    noteSpeechEnded();
  }
  updateAudioMix("idle");
  updateVoiceControls();
}

function beginIntermissionVoice(token) {
  voiceDirector.activeIntermissionToken = token;
  voiceDirector.openingPromptPlayedForToken = 0;
  interruptVoicePlayback();
}

function endIntermissionVoice(token) {
  if (token && voiceDirector.activeIntermissionToken !== token) {
    return;
  }
  voiceDirector.activeIntermissionToken = 0;
  voiceDirector.openingPromptPlayedForToken = 0;
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

function deriveFibonacciLevels(candles = []) {
  if (!candles.length) {
    return [];
  }
  const window = candles.slice(-Math.min(candles.length, 34));
  const low = Math.min(...window.map((candle) => candle.low));
  const high = Math.max(...window.map((candle) => candle.high));
  const range = high - low;
  if (!Number.isFinite(low) || !Number.isFinite(high) || range <= 0) {
    return [];
  }

  return [
    { key: "fib-236", ratio: 0.236, label: "Fib 0.236", value: high - range * 0.236, stroke: "#57d7ff", glow: "rgba(87, 215, 255, 0.20)" },
    { key: "fib-382", ratio: 0.382, label: "Fib 0.382", value: high - range * 0.382, stroke: "#74f0ff", glow: "rgba(116, 240, 255, 0.18)" },
    { key: "fib-500", ratio: 0.5, label: "Fib 0.500", value: high - range * 0.5, stroke: "#8fd8ff", glow: "rgba(143, 216, 255, 0.16)" },
    { key: "fib-618", ratio: 0.618, label: "Fib 0.618", value: high - range * 0.618, stroke: "#7ef7c4", glow: "rgba(126, 247, 196, 0.18)" },
    { key: "fib-786", ratio: 0.786, label: "Fib 0.786", value: high - range * 0.786, stroke: "#7dffb8", glow: "rgba(125, 255, 184, 0.18)" },
  ];
}

function extractMentionedFibKeys(text, candles = state.candles) {
  if (!text) {
    return [];
  }

  const normalizedText = String(text).toLowerCase();
  return deriveFibonacciLevels(candles)
    .filter((level) => (
      normalizedText.includes(level.label.toLowerCase())
      || normalizedText.includes(level.ratio.toFixed(3))
      || normalizedText.includes(formatPrice(level.value).toLowerCase())
    ))
    .map((level) => level.key);
}

function deriveNearestFibLevel(candles = [], referencePrice = last(candles)?.close) {
  const fibLevels = deriveFibonacciLevels(candles);
  if (!fibLevels.length || !Number.isFinite(referencePrice)) {
    return null;
  }
  return fibLevels.reduce((closest, level) => {
    if (!closest) {
      return level;
    }
    return Math.abs(level.value - referencePrice) < Math.abs(closest.value - referencePrice) ? level : closest;
  }, null);
}

function deriveSmaSignal(candles = [], period = 20) {
  if (!candles.length) {
    return null;
  }
  const closes = candles.map((candle) => candle.close);
  const values = calculateSMA(closes, period);
  const current = last(values);
  if (!Number.isFinite(current)) {
    return null;
  }
  const prior = values.slice(0, -1).reverse().find((value) => Number.isFinite(value));
  const price = last(closes);
  return {
    period,
    value: current,
    slope: Number.isFinite(prior) ? current - prior : 0,
    position: Number.isFinite(price) ? (price >= current ? "above" : "below") : "near",
  };
}

function deriveCommentaryIndicatorContext(candles = state.candles, referencePrice = last(candles)?.close) {
  const smaSignal = deriveSmaSignal(candles, 20);
  const nearestFib = deriveNearestFibLevel(candles, referencePrice);
  return {
    smaValue: Number.isFinite(smaSignal?.value) ? formatPrice(smaSignal.value) : "",
    smaBias: smaSignal ? `${smaSignal.position} the 20 SMA` : "",
    smaSlope: smaSignal ? (smaSignal.slope >= 0 ? "rising" : "slipping") : "",
    fibLabel: nearestFib?.label || "",
    fibValue: Number.isFinite(nearestFib?.value) ? formatPrice(nearestFib.value) : "",
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

  const boxPadding = 18;
  const regionLeft = zone.x - boxPadding;
  const regionRight = zone.x + zone.width + boxPadding;
  const regionTop = zone.y - boxPadding;
  const regionBottom = zone.y + zone.height + boxPadding;
  const regionWidth = Math.max(regionRight - regionLeft, layout.candleSlot * 3);
  const regionHeight = Math.max(regionBottom - regionTop, 42);
  const paddedWidth = regionWidth * 1.18 + 24;
  const paddedHeight = regionHeight * 1.18 + 24;
  const viewportWidth = layout.chartWidth;
  const viewportHeight = layout.priceTop - (layout.priceTopPadding || 24);
  const targetScale = clamp(
    Math.min(viewportWidth / paddedWidth, viewportHeight / paddedHeight),
    1,
    2.35
  );

  const focusCenterX = clamp(regionLeft + regionWidth * 0.5, layout.chartLeft, layout.chartLeft + layout.chartWidth);
  const focusCenterY = clamp(regionTop + regionHeight * 0.5, (layout.priceTopPadding || 24), layout.priceTop - 12);
  const viewportCenterX = layout.chartLeft + viewportWidth * 0.5;
  const viewportCenterY = (layout.priceTopPadding || 24) + viewportHeight * 0.62;
  let tx = viewportCenterX - focusCenterX * targetScale;
  let ty = viewportCenterY - focusCenterY * targetScale;
  const safePad = 12;
  const topHeadroom = clamp(viewportHeight * 0.14, 34, 62);
  const leftEdge = regionLeft * targetScale + tx;
  const rightEdge = regionRight * targetScale + tx;
  const topEdge = regionTop * targetScale + ty;
  const bottomEdge = regionBottom * targetScale + ty;
  const minX = layout.chartLeft + safePad;
  const maxX = layout.chartLeft + viewportWidth - safePad;
  const minY = (layout.priceTopPadding || 24) + topHeadroom;
  const maxY = (layout.priceTopPadding || 24) + viewportHeight - safePad;

  if (leftEdge < minX) {
    tx += minX - leftEdge;
  }
  if (rightEdge > maxX) {
    tx -= rightEdge - maxX;
  }
  if (topEdge < minY) {
    ty += minY - topEdge;
  }
  if (bottomEdge > maxY) {
    ty -= bottomEdge - maxY;
  }

  return {
    scale: targetScale,
    tx,
    ty,
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
  chartCinematic.levelFocus.fibKeys = [];
  chartCinematic.levelFocus.renderKey = "";
  if (chartCinematic.dom.priceCalloutLayer) {
    chartCinematic.dom.priceCalloutLayer.innerHTML = "";
  }
  renderStaticLevels(true);
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
  const indicatorContext = deriveCommentaryIndicatorContext(candles);
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
    sma_20: indicatorContext.smaValue,
    sma_bias: indicatorContext.smaBias,
    fib_focus_label: indicatorContext.fibLabel,
    fib_focus_value: indicatorContext.fibValue,
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
  if (mode === "subscribe_cta") {
    return {
      mode: "subscribe_cta",
      coin: {
        symbol: coin.symbol,
        pair: coin.pair,
        spoken_name: coin.spokenName || coin.name || coin.symbol,
        marketSymbol: coin.marketSymbol,
      },
      event: extras.event || {},
    };
  }
  if (mode === "live_brief") {
    const liveSupportResistance = deriveSupportResistance(state.candles || []);
    const indicatorContext = deriveCommentaryIndicatorContext(state.candles || []);
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
        sma_20: indicatorContext.smaValue,
        sma_bias: indicatorContext.smaBias,
        sma_slope: indicatorContext.smaSlope,
        fib_focus_label: indicatorContext.fibLabel,
        fib_focus_value: indicatorContext.fibValue,
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

async function playAudioClip(clip, playbackToken, options = {}) {
  if (!voiceDirector.audioPlaybackAllowed || !voiceDirector.audio || !clip.audio_url) {
    return false;
  }

  return await new Promise((resolve) => {
    const audio = voiceDirector.audio;
    let settled = false;
    let started = false;
    const finish = (played) => {
      if (settled) {
        return;
      }
      settled = true;
      audio.onended = null;
      audio.onerror = null;
      updateAudioMix("idle");
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
    audio.volume = AUDIO_MIX.commentaryVolume;
    updateAudioMix("commentary");

    const notifyPlaybackStart = () => {
      if (started) {
        return;
      }
      started = true;
      if (typeof options.onPlaybackStart === "function") {
        options.onPlaybackStart();
      }
    };

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(() => {
        notifyPlaybackStart();
      });
      playPromise.catch(() => {
        voiceDirector.audioPlaybackFailures += 1;
        voiceDirector.audioUnlocked = false;
        voiceDirector.audioPlaybackAllowed = false;
        voiceDirector.pendingAutoStart = true;
        voiceDirector.warmupQueued = false;
        updateVoiceControls();
        finish(false);
      });
    } else {
      notifyPlaybackStart();
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

      if (options.displayMode === "live" && !isIntermissionActive() && options.syncChart !== false) {
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

      if (clip.meta?.news_index !== undefined) {
        setIntermissionNewsHighlight(clip.meta.news_index);
      } else {
        clearIntermissionNewsHighlight();
      }

      let subtitleStarted = false;
      const startSubtitle = () => {
        if (subtitleStarted) {
          return;
        }
        subtitleStarted = true;
        showVoiceSubtitle(clip, {
          displayMode: options.displayMode || "live",
          modeLabel: options.modeLabel,
          syncWithAudio: playedWithAudio,
        });
      };

      let playedWithAudio = Boolean(clip.audio_url);
      const played = await playAudioClip(clip, playbackToken, {
        onPlaybackStart: startSubtitle,
      });
      if (!played) {
        playedWithAudio = false;
        startSubtitle();
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
      if (options.displayMode === "intermission") {
        clearVoiceSubtitle();
      }
      voiceDirector.isProcessing = false;
      voiceDirector.currentMode = "idle";
      if (playedAny) {
        noteSpeechEnded();
      }
      updateAudioMix("idle");
      if (options.displayMode === "live" && options.syncChart !== false) {
        clearChartCommentaryFocus(true);
      }
      updateVoiceControls();
    }
  }

  return Date.now() - stageStart;
}

function buildCommentaryPayload(mode, extras = {}) {
  const coin = extras.coin || state.intermission.coin || currentCoin();
  const summary = extras.summary || state.intermission.summary || {};
  const indicatorContext = deriveCommentaryIndicatorContext(state.candles || []);
  return {
    mode,
    coin: {
      symbol: coin.symbol,
      pair: coin.pair,
      spoken_name: coin.spokenName || coin.name || coin.symbol,
      marketSymbol: coin.marketSymbol,
    },
    displayed_interval: currentInterval(),
    lead_interval: state.topDownAnalysis?.leadInterval || currentInterval(),
    summary: {
      bias_phrase: summary.bias_phrase || summary.biasPhrase || "mixed / neutral",
      top_patterns: summary.top_patterns || summary.topPatterns || [],
      direction_scores: summary.direction_scores || summary.directionScores || { Bullish: 0, Bearish: 0, Neutral: 0 },
    },
    news_items: extras.newsItems || state.intermission.newsItems || [],
    event: {
      ...(extras.event || {}),
      sma_20: indicatorContext.smaValue,
      sma_bias: indicatorContext.smaBias,
      sma_slope: indicatorContext.smaSlope,
      fib_focus_label: indicatorContext.fibLabel,
      fib_focus_value: indicatorContext.fibValue,
    },
  };
}

async function runIntermissionVoiceStage(token, mode, timing, extras = {}, runId = state.intermission.stageRunId) {
  if (!isIntermissionStageCurrent(token, runId)) {
    return false;
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

  if (!isIntermissionStageCurrent(token, runId)) {
    return false;
  }

  if (response?.sequence?.length) {
    await playCommentarySequence(response.sequence, {
      displayMode: "intermission",
      modeLabel: mode === "intermission_news" ? "Crypto headlines" : "Roundtable",
      maxDurationMs: timing.maxDurationMs,
    });
  }

  if (!isIntermissionStageCurrent(token, runId)) {
    return false;
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed < timing.minDurationMs) {
    const completedWait = await waitForIntermissionStage(timing.minDurationMs - elapsed, token, runId);
    if (!completedWait) {
      return false;
    }
  }
  return isIntermissionStageCurrent(token, runId);
}

async function runIntermissionNewsPhase(token, runId = state.intermission.stageRunId) {
  if (!isIntermissionStageCurrent(token, runId)) {
    return;
  }

  state.intermission.phase = "news";
  state.intermission.phaseStartedAt = Date.now();
  renderIntermissionOverlay();

  await runIntermissionVoiceStage(
    token,
    "intermission_news",
    {
      minDurationMs: INTERMISSION_NEWS_MIN_MS,
      maxDurationMs: INTERMISSION_NEWS_MAX_MS,
    },
    { newsItems: state.intermission.newsItems || [] },
    runId
  );

  if (!isIntermissionStageCurrent(token, runId)) {
    return;
  }

  if (state.streamControl.stopAfterCurrent) {
    enterStoppedIntermission(token);
    return;
  }

  enterIntermissionOpeningPhase(token);
}

async function runIntermissionSequence(token, runId = state.intermission.stageRunId) {
  if (hasPodcastCommentaryProvider()) {
    const playedPodcast = await runIntermissionPodcastSequence(token, runId);
    if (!isIntermissionStageCurrent(token, runId)) {
      return;
    }
    if (playedPodcast) {
      if (state.streamControl.stopAfterCurrent) {
        enterStoppedIntermission(token);
        return;
      }
      enterIntermissionOpeningPhase(token);
      return;
    }
  }

  await runIntermissionVoiceStage(token, "intermission_summary", {
    minDurationMs: INTERMISSION_SUMMARY_MIN_MS,
    maxDurationMs: INTERMISSION_SUMMARY_MAX_MS,
  }, {}, runId);
  if (!isIntermissionStageCurrent(token, runId)) {
    return;
  }

  await runIntermissionNewsPhase(token, runId);
}

function buildLiveCommentaryEvent(snapshot, previous) {
  if (!previous) {
    return null;
  }

  if (snapshot.impulseKey && snapshot.impulseKey !== previous.impulseKey) {
    return {
      type: "impulse_candle",
      key: snapshot.impulseKey,
      impulse_direction: snapshot.impulseDirection,
      strength_label: snapshot.impulseStrength,
      candle_move_pct: snapshot.impulseMovePct,
      pattern_name: snapshot.chartPatternName || snapshot.leadPatternName || "a live structure",
      confidence: snapshot.chartConfidence,
    };
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

function buildImpulseCandleSignal(candles = state.candles) {
  if (!candles.length) {
    return null;
  }

  const latest = last(candles);
  const history = candles.slice(-9, -1);
  if (!latest || history.length < 4) {
    return null;
  }

  const basis = Math.max(latest.open || latest.close || 1, 1);
  const bodyPct = (Math.abs(latest.close - latest.open) / basis) * 100;
  const rangePct = ((latest.high - latest.low) / basis) * 100;
  const avgBodyPct = Math.max(
    average(history.map((candle) => (Math.abs(candle.close - candle.open) / Math.max(candle.open || candle.close || 1, 1)) * 100)),
    0.05
  );
  const avgRangePct = Math.max(
    average(history.map((candle) => ((candle.high - candle.low) / Math.max(candle.open || candle.close || 1, 1)) * 100)),
    0.08
  );
  const previousClose = last(history)?.close || latest.open;
  const closeMovePct = (Math.abs(latest.close - previousClose) / Math.max(previousClose || 1, 1)) * 100;
  const qualifies = bodyPct >= 0.45
    && rangePct >= 0.75
    && (bodyPct >= avgBodyPct * 2.3 || rangePct >= avgRangePct * 2.1 || closeMovePct >= 0.9);

  if (!qualifies) {
    return null;
  }

  const bullish = latest.close >= latest.open;
  const strengthLabel = rangePct >= avgRangePct * 3 || closeMovePct >= 1.5 ? "huge" : "strong";
  return {
    key: `${currentCoin().marketSymbol}:impulse:${currentInterval()}:${latest.openTime}:${bullish ? "bull" : "bear"}`,
    direction: bullish ? "Bullish" : "Bearish",
    strengthLabel,
    movePct: Number(closeMovePct.toFixed(2)),
  };
}

function isPriorityLiveEvent(event) {
  return ["impulse_candle", "chart_pattern_change", "lead_pattern_change", "exact_mtf_change", "timeframe_switch"].includes(event?.type);
}

function liveEventPriority(event) {
  if (!event) {
    return 0;
  }
  if (event.type === "impulse_candle") {
    return 4;
  }
  if (["chart_pattern_change", "lead_pattern_change", "exact_mtf_change", "timeframe_switch"].includes(event.type)) {
    return 3;
  }
  if (["ambient_update", "indicator_observation"].includes(event.type)) {
    return 2;
  }
  return 1;
}

async function processLiveCommentaryQueue() {
  if (voiceDirector.isProcessing || !canAutoPlayLiveCommentary() || isIntermissionActive()) {
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
  voiceDirector.lastLiveSpokenAt = Date.now();
  try {
    const coin = currentCoin();
    let response = null;
    if (event.type === "warmup_intro") {
      const preloadKey = buildWarmupPreloadKey(event, coin);
      if (voiceDirector.warmupPreloadKey === preloadKey) {
        response = voiceDirector.warmupPreloadResponse?.sequence?.length
          ? voiceDirector.warmupPreloadResponse
          : voiceDirector.warmupPreloadPromise
            ? await voiceDirector.warmupPreloadPromise
            : null;
        if (voiceDirector.warmupPreloadKey === preloadKey) {
          clearWarmupPreload();
        }
      }
    }
    if (!response?.sequence?.length) {
      response = await requestLiveEventSequence(event, coin);
    }
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
  if (!event || !canAutoPlayLiveCommentary() || isIntermissionActive() || !hasAnyCommentaryProvider()) {
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
  if ((options.replaceQueued || event.follow_up_transition) && voiceDirector.queue.length) {
    const lastQueued = voiceDirector.queue[voiceDirector.queue.length - 1];
    if (liveEventPriority(event) >= liveEventPriority(lastQueued)) {
      voiceDirector.recentLiveEvents.set(event.key, now);
      voiceDirector.queue[voiceDirector.queue.length - 1] = event;
      processLiveCommentaryQueue().catch(() => {});
      return true;
    }
  }
  if (voiceDirector.queue.length >= LIVE_COMMENTARY_QUEUE_MAX) {
    return false;
  }

  if (!options.deferTimestamp) {
    voiceDirector.lastLiveSpokenAt = now;
  }
  voiceDirector.recentLiveEvents.set(event.key, now);
  voiceDirector.queue.push(event);
  processLiveCommentaryQueue().catch(() => {});
  return true;
}

function maybeQueueAmbientCommentary(force = false) {
  if (!canAutoPlayLiveCommentary() || !state.candles.length || isIntermissionActive() || !hasAnyCommentaryProvider()) {
    return;
  }
  if (force && state.currentIntervalIndex !== 0) {
    return;
  }

  const now = Date.now();
  if (!force && (voiceDirector.isProcessing || voiceDirector.queue.length)) {
    return;
  }
  if (!force && now - Math.max(voiceDirector.lastAmbientQueuedAt, voiceDirector.lastLiveSpokenAt, voiceDirector.lastSpeechEndedAt || 0) < 22_000) {
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

function buildWarmupPreloadKey(event, coin = currentCoin()) {
  return JSON.stringify([
    coin?.marketSymbol || "",
    currentInterval(),
    event?.type || "",
    event?.pattern_name || "",
    event?.lead_pattern_name || "",
    event?.lead_interval || "",
    Math.round(Number(event?.confidence || 0)),
  ]);
}

async function requestLiveEventSequence(event, coin = currentCoin()) {
  return hasPodcastCommentaryProvider()
    ? requestPodcastRender(
        buildPodcastPayload("live_brief", {
          coin,
          event,
          displayedInterval: currentInterval(),
          leadInterval: state.topDownAnalysis?.leadInterval || currentInterval(),
        })
      )
    : requestCommentarySequence(buildCommentaryPayload("live_event", { coin, event }));
}

async function preloadWarmupIntro() {
  if (!hasAnyCommentaryProvider() || state.currentIntervalIndex !== 0 || !state.candles.length) {
    return null;
  }

  const chartPattern = state.currentIntervalPattern;
  const leadPattern = state.topDownAnalysis?.leadAnalysis;
  const event = {
    type: "warmup_intro",
    pattern_name: chartPattern?.pattern?.name || leadPattern?.pattern?.name || "a developing live structure",
    confidence: chartPattern?.confidence || leadPattern?.confidence || 0,
    lead_pattern_name: state.topDownAnalysis?.leadPattern?.name || leadPattern?.pattern?.name || chartPattern?.pattern?.name || "a developing live structure",
    lead_interval: state.topDownAnalysis?.leadInterval || currentInterval(),
  };
  const coin = currentCoin();
  const preloadKey = buildWarmupPreloadKey(event, coin);

  if (voiceDirector.warmupPreloadKey === preloadKey) {
    if (voiceDirector.warmupPreloadResponse?.sequence?.length) {
      return voiceDirector.warmupPreloadResponse;
    }
    if (voiceDirector.warmupPreloadPromise) {
      return voiceDirector.warmupPreloadPromise;
    }
  }

  voiceDirector.warmupPreloadKey = preloadKey;
  voiceDirector.warmupPreloadResponse = null;
  const preloadPromise = requestLiveEventSequence(event, coin)
    .then((response) => {
      if (voiceDirector.warmupPreloadKey === preloadKey) {
        voiceDirector.warmupPreloadResponse = response?.sequence?.length ? response : null;
      }
      return voiceDirector.warmupPreloadResponse;
    })
    .catch(() => {
      if (voiceDirector.warmupPreloadKey === preloadKey) {
        voiceDirector.warmupPreloadResponse = null;
      }
      return null;
    })
    .finally(() => {
      if (voiceDirector.warmupPreloadKey === preloadKey) {
        voiceDirector.warmupPreloadPromise = null;
      }
    });
  voiceDirector.warmupPreloadPromise = preloadPromise;
  return preloadPromise;
}

function observeLiveCommentary() {
  const impulseSignal = buildImpulseCandleSignal(state.candles);
  const snapshot = {
    interval: currentInterval(),
    chartPatternId: state.currentIntervalPattern?.patternId || null,
    chartPatternName: state.currentIntervalPattern?.pattern?.name || null,
    chartConfidence: state.currentIntervalPattern?.confidence || 0,
    leadPatternId: state.topDownAnalysis?.topDownPatternId || state.topDownAnalysis?.leadPattern?.id || null,
    leadPatternName: state.topDownAnalysis?.leadPattern?.name || state.topDownAnalysis?.leadAnalysis?.pattern?.name || null,
    leadInterval: state.topDownAnalysis?.leadInterval || currentInterval(),
    confirmedCount: (state.topDownAnalysis?.timeframeAlignment || []).filter((item) => item.status === "Confirmed").length,
    impulseKey: impulseSignal?.key || null,
    impulseDirection: impulseSignal?.direction || null,
    impulseStrength: impulseSignal?.strengthLabel || null,
    impulseMovePct: impulseSignal?.movePct || 0,
  };

  const previous = voiceDirector.lastObservedSnapshot;
  voiceDirector.lastObservedSnapshot = snapshot;

  if (!previous || !canAutoPlayLiveCommentary() || isIntermissionActive() || !hasAnyCommentaryProvider()) {
    return;
  }

  const event = buildLiveCommentaryEvent(snapshot, previous);
  if (!event) {
    return;
  }
  const isFollowUp = voiceDirector.isProcessing || voiceDirector.queue.length;
  if (isFollowUp && ["chart_pattern_change", "lead_pattern_change"].includes(event.type)) {
    event.follow_up_transition = true;
  }
  enqueueLiveCommentaryEvent(event, {
    bypassTiming: isFollowUp || event.type === "impulse_candle",
    replaceQueued: isFollowUp && isPriorityLiveEvent(event),
    deferTimestamp: isFollowUp,
  });
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

function recomputeIndicators() {
  const closes = state.candles.map((candle) => candle.close);
  state.rsiSeries = calculateRSI(closes);
  const macd = calculateMACD(closes);
  state.macdLine = macd.line;
  state.macdSignal = macd.signal;
  state.macdHistogram = macd.histogram;
}

function applyCurrentIntervalAnalysis(analysis, intervalLabel = currentInterval()) {
  const resolvedAnalysis = analysis || emptyPatternAnalysis(intervalLabel);
  state.currentIntervalPattern = resolvedAnalysis;
  state.patternAnalysis = resolvedAnalysis;
  state.intervalAnalyses = {
    ...state.intervalAnalyses,
    [intervalLabel]: resolvedAnalysis,
  };
}

function buildTopDownEntriesFromState(displayedInterval = currentInterval()) {
  const scanIntervals = detectorEngine.TOP_DOWN_INTERVALS || TOP_DOWN_SCAN_INTERVALS;
  return scanIntervals.map((interval) => ({
    interval,
    analysis: interval === displayedInterval ? state.currentIntervalPattern : state.intervalAnalyses[interval] || null,
    isUnavailable: state.isMock && interval !== displayedInterval,
  }));
}

function applyTopDownAnalysisState(topDownAnalysis, intervalAnalyses = null) {
  if (intervalAnalyses) {
    state.intervalAnalyses = {
      ...state.intervalAnalyses,
      ...intervalAnalyses,
    };
  }
  state.topDownAnalysis = topDownAnalysis;
  state.timeframeAlignment = topDownAnalysis?.timeframeAlignment || [];
}

function recomputeDerivedState(options = {}) {
  const { analyzePattern = true } = options;
  recomputeIndicators();

  if (analyzePattern) {
    applyCurrentIntervalAnalysis(detectorEngine.analyzeDetectedPatterns(state.candles, currentInterval()));
  } else {
    applyCurrentIntervalAnalysis(
      state.intervalAnalyses[currentInterval()] || state.currentIntervalPattern || emptyPatternAnalysis(currentInterval()),
      currentInterval()
    );
  }

  if (state.isMock || !state.topDownAnalysis) {
    applyTopDownAnalysisState(
      detectorEngine.buildTopDownAnalysis(
        buildTopDownEntriesFromState(),
        currentInterval(),
        detectorEngine.TOP_DOWN_INTERVALS || TOP_DOWN_SCAN_INTERVALS
      )
    );
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
    scheduleDeferredFullRender();
    return;
  }

  state.alignmentLoading = true;
  renderTimeframeAlignment();
  renderIntervalBanner();

  const candlePayloads = await Promise.all(
    scanIntervals.map(async (interval) => {
      if (interval === displayedInterval) {
        return {
          interval,
          candles: state.candles.slice(),
          isUnavailable: false,
        };
      }
      try {
        return {
          interval,
          candles: await loadKlinesForInterval(coin.marketSymbol, interval),
          isUnavailable: false,
        };
      } catch {
        return {
          interval,
          candles: null,
          isUnavailable: true,
        };
      }
    })
  );

  const candleMap = Object.fromEntries(
    candlePayloads
      .filter((entry) => Array.isArray(entry.candles))
      .map((entry) => [entry.interval, entry.candles])
  );

  let analysisResult;
  try {
    analysisResult = await requestAnalysisWorker({
      type: "top-down-analysis",
      marketSymbol: coin.marketSymbol,
      interval: displayedInterval,
      candles: candleMap[displayedInterval] || state.candles.slice(),
      intervalCandles: candleMap,
      scanIntervals,
    });
  } catch {
    const fallbackEntries = candlePayloads.map((entry) => ({
      interval: entry.interval,
      analysis: Array.isArray(entry.candles) ? detectorEngine.analyzeDetectedPatterns(entry.candles, entry.interval) : null,
      isUnavailable: entry.isUnavailable,
    }));
    const topDownAnalysis = detectorEngine.buildTopDownAnalysis(fallbackEntries, displayedInterval, scanIntervals);
    analysisResult = {
      intervalAnalyses: Object.fromEntries(fallbackEntries.map((entry) => [entry.interval, entry.analysis])),
      topDownAnalysis,
      timeframeAlignment: topDownAnalysis.timeframeAlignment || [],
    };
  }

  if (
    requestId !== state.alignmentRequestId
    || coin.marketSymbol !== currentCoin().marketSymbol
    || displayedInterval !== currentInterval()
  ) {
    return;
  }

  if (analysisResult.intervalAnalyses?.[displayedInterval]) {
    applyCurrentIntervalAnalysis(analysisResult.intervalAnalyses[displayedInterval], displayedInterval);
  } else {
    applyCurrentIntervalAnalysis(state.currentIntervalPattern || emptyPatternAnalysis(displayedInterval), displayedInterval);
  }
  applyTopDownAnalysisState(analysisResult.topDownAnalysis, analysisResult.intervalAnalyses || null);
  state.alignmentLoading = false;
  scheduleDeferredFullRender();
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
  if (intermissionStageFitRaf) {
    cancelAnimationFrame(intermissionStageFitRaf);
    intermissionStageFitRaf = 0;
  }
  dom.intermissionOverlay.className = "intermission-overlay";
  dom.intermissionOverlay.setAttribute("aria-hidden", "true");
  dom.intermissionOverlay.innerHTML = "";
  delete dom.intermissionOverlay.dataset.contentKey;
}

function syncIntermissionStageFit() {
  if (!dom.intermissionOverlay || !state.intermission.active) {
    return;
  }

  const stageFit = dom.intermissionOverlay.querySelector("[data-intermission-stage-fit]");
  const stageScale = dom.intermissionOverlay.querySelector("[data-intermission-stage-scale]");
  const stage = dom.intermissionOverlay.querySelector(".intermission-stage");
  if (!stageFit || !stageScale || !stage) {
    return;
  }

  stageFit.style.setProperty("--intermission-fit-top", "0px");
  stageFit.style.setProperty("--intermission-fit-side", "0px");
  stageFit.style.setProperty("--intermission-fit-bottom", "0px");
  stageScale.style.setProperty("--intermission-fit-scale", "1");

  const overlayRect = dom.intermissionOverlay.getBoundingClientRect();
  if (!overlayRect.width || !overlayRect.height) {
    return;
  }

  const subtitle = dom.intermissionOverlay.querySelector(".intermission-live-subtitle");
  const subtitleTop = subtitle
    ? Math.max(0, subtitle.getBoundingClientRect().top - overlayRect.top)
    : overlayRect.height - 104;

  const isSummaryStage = state.intermission.phase === "summary";
  const sideInset = overlayRect.width * (isSummaryStage ? 0.23 : 0.18);
  const topInset = overlayRect.height * (isSummaryStage ? 0.06 : 0.09);
  const bottomClearance = Math.max(
    overlayRect.height - subtitleTop + 20,
    overlayRect.height * (isSummaryStage ? 0.28 : 0.2)
  );

  stageFit.style.setProperty("--intermission-fit-top", `${topInset.toFixed(2)}px`);
  stageFit.style.setProperty("--intermission-fit-side", `${sideInset.toFixed(2)}px`);
  stageFit.style.setProperty("--intermission-fit-bottom", `${bottomClearance.toFixed(2)}px`);

  const availableWidth = stageFit.clientWidth;
  const availableHeight = stageFit.clientHeight;
  const stageWidth = stage.scrollWidth || stage.offsetWidth || 1;
  const stageHeight = stage.scrollHeight || stage.offsetHeight || 1;
  const stageFitRatio = Math.min(availableWidth / stageWidth, availableHeight / stageHeight, 1);
  const fitScale = clamp(
    stageFitRatio * (isSummaryStage ? 0.87 : 0.88),
    isSummaryStage ? 0.46 : 0.54,
    isSummaryStage ? 0.84 : 0.86
  );

  stageScale.style.setProperty("--intermission-fit-scale", fitScale.toFixed(4));
}

function scheduleIntermissionStageFit() {
  if (intermissionStageFitRaf) {
    cancelAnimationFrame(intermissionStageFitRaf);
    intermissionStageFitRaf = 0;
  }

  intermissionStageFitRaf = requestAnimationFrame(() => {
    intermissionStageFitRaf = 0;
    syncIntermissionStageFit();
    intermissionStageFitRaf = requestAnimationFrame(() => {
      intermissionStageFitRaf = 0;
      syncIntermissionStageFit();
    });
  });
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

function enterIntermissionOpeningPhase(token) {
  if (!state.intermission.active || state.intermission.token !== token) {
    return;
  }

  state.intermission.phase = "opening";
  state.intermission.phaseStartedAt = Date.now();
  state.intermission.openingEndsAt = Date.now() + INTERMISSION_DOOR_OPEN_MS;
  activateNextCoinForOpening(token);
  renderIntermissionOverlay();
  triggerNextCoinSubscribePrompt(token);
  scheduleIntermissionTimeout(INTERMISSION_DOOR_OPEN_MS, () => {
    finishIntermission(token);
  });
}

function intermissionDirectionClass(direction) {
  const normalized = String(direction || "neutral").toLowerCase();
  if (normalized.includes("bull")) {
    return "bullish";
  }
  if (normalized.includes("bear")) {
    return "bearish";
  }
  return "neutral";
}

function intermissionDirectionArrow(direction) {
  const normalized = String(direction || "neutral").toLowerCase();
  if (normalized.includes("bull")) {
    return "↗";
  }
  if (normalized.includes("bear")) {
    return "↘";
  }
  return "→";
}

function trimIntermissionCell(text, fallback = "Scanning", maxLength = 26) {
  const cleaned = String(text || fallback).replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return fallback;
  }
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}

function intermissionMomentumText(analysis) {
  const confidence = Number(analysis?.confidence || 0);
  if (confidence >= 92) {
    return "High conviction";
  }
  if (confidence >= 88) {
    return "Firm pressure";
  }
  if (confidence >= 84) {
    return "Building read";
  }
  return "Early read";
}

function intermissionDirectionLabel(direction) {
  const normalized = intermissionDirectionClass(direction);
  if (normalized === "bullish") {
    return "Bullish";
  }
  if (normalized === "bearish") {
    return "Bearish";
  }
  return "Neutral";
}

function pickIntermissionLeadInterval(summary) {
  const dominantClass = intermissionDirectionClass(summary?.dominantDirection || "Neutral");
  const candidates = (summary?.intervalBreakdown || [])
    .map((entry) => {
      const ranked = entry?.patterns || [];
      const pattern = ranked.find((item) => intermissionDirectionClass(item.direction) === dominantClass) || ranked[0] || null;
      return pattern
        ? {
            interval: entry.interval,
            pattern,
          }
        : null;
    })
    .filter(Boolean);

  if (!candidates.length) {
    return null;
  }

  return candidates.reduce((best, current) => {
    if (!best) {
      return current;
    }
    const currentConfidence = Number(current.pattern?.confidence || 0);
    const bestConfidence = Number(best.pattern?.confidence || 0);
    return currentConfidence > bestConfidence ? current : best;
  }, null);
}

function buildIntermissionQuickFacts(summary) {
  const dominantClass = intermissionDirectionClass(summary?.dominantDirection || "Neutral");
  const topPattern = summary?.topPatterns?.[0] || null;
  const leadInterval = pickIntermissionLeadInterval(summary);
  const contributing = Number(summary?.contributingIntervals || 0);
  const totalFrames = (detectorEngine.TOP_DOWN_INTERVALS || intermissionEngine.DEFAULT_INTERVAL_ORDER || []).length || 6;
  const activeFramesCopy = `${contributing}/${totalFrames} frames active`;
  const leadPatternCopy = leadInterval
    ? `${humanizeIntervalLabel(leadInterval.interval)} · ${leadInterval.pattern.name}`
    : "Watching all frames";
  const topPatternCopy = topPattern
    ? `${topPattern.name} · ${Math.round(Number(topPattern.bestConfidence || 0))}%`
    : "No dominant setup yet";

  return `
    <div class="intermission-summary-facts">
      <article class="intermission-fact-card ${dominantClass}">
        <span class="intermission-panel-label">Overall bias</span>
        <strong class="intermission-fact-value">${escapeHtml(intermissionDirectionLabel(summary?.dominantDirection || "Neutral"))}</strong>
        <p class="intermission-fact-copy">${escapeHtml(summary?.biasPhrase || "mixed / neutral")}</p>
      </article>
      <article class="intermission-fact-card">
        <span class="intermission-panel-label">Lead timeframe</span>
        <strong class="intermission-fact-value">${escapeHtml(leadInterval?.interval ? humanizeIntervalLabel(leadInterval.interval) : "Scanning")}</strong>
        <p class="intermission-fact-copy">${escapeHtml(leadPatternCopy)}</p>
      </article>
      <article class="intermission-fact-card">
        <span class="intermission-panel-label">Participation</span>
        <strong class="intermission-fact-value">${escapeHtml(activeFramesCopy)}</strong>
        <p class="intermission-fact-copy">${escapeHtml(topPatternCopy)}</p>
      </article>
    </div>
  `;
}

function buildIntermissionTopPatternCards(summary) {
  const patterns = (summary?.topPatterns || []).slice(0, 3);
  if (!patterns.length) {
    return "";
  }

  return `
    <section class="intermission-panel intermission-patterns-panel">
      <div class="intermission-panel-headline-row">
        <span class="intermission-panel-label">Top setups</span>
        <span class="intermission-panel-copy">Ranked by weighted multi-timeframe strength</span>
      </div>
      <div class="intermission-pattern-card-grid">
        ${patterns.map((pattern, index) => {
          const directionClass = intermissionDirectionClass(pattern.direction);
          const directionLabel = intermissionDirectionLabel(pattern.direction);
          const intervals = humanizeIntervalList((pattern.intervals || []).slice(0, 4), { lower: true }) || "live scan";
          return `
            <article class="intermission-pattern-card ${directionClass}">
              <span class="intermission-pattern-rank">#${index + 1}</span>
              <strong class="intermission-pattern-name">${escapeHtml(pattern.name)}</strong>
              <div class="intermission-pattern-meta">
                <span class="intermission-pattern-bias">${escapeHtml(directionLabel)}</span>
                <span class="intermission-pattern-confidence">${Math.round(Number(pattern.bestConfidence || 0))}% confidence</span>
              </div>
              <p class="intermission-pattern-intervals">${escapeHtml(intervals)}</p>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function buildIntermissionAnalysisTitle(coin) {
  const pair = String(coin?.pair || "").trim();
  return pair ? `${pair} ANALYSIS` : "MARKET ANALYSIS";
}

function buildIntermissionMatrixRows(summary, intermission) {
  const intervals = detectorEngine.TOP_DOWN_INTERVALS || intermissionEngine.DEFAULT_INTERVAL_ORDER;
  const intervalAnalyses = intermission.intervalAnalyses || intermission.cachedIntervalAnalyses || {};
  const rows = [
    {
      label: "Trending",
      build: (analysis) => ({
        direction: analysis?.direction || "Neutral",
        text: trimIntermissionCell(analysis?.pattern?.name || analysis?.title || "Scanning"),
      }),
    },
    {
      label: "Momentum",
      build: (analysis) => ({
        direction: analysis?.direction || "Neutral",
        text: trimIntermissionCell(intermissionMomentumText(analysis)),
      }),
    },
    {
      label: "Volume / Regime",
      build: (analysis) => ({
        direction: analysis?.direction || "Neutral",
        text: trimIntermissionCell(analysis?.regime || "Balanced"),
      }),
    },
    {
      label: "Support / Resistance",
      build: (analysis) => ({
        direction: analysis?.direction || "Neutral",
        text: trimIntermissionCell(analysis?.marketBias || analysis?.bias || "Watching levels"),
      }),
    },
  ];

  const headerCells = intervals
    .map((interval) => `<span class="intermission-matrix-time">${escapeHtml(interval)}</span>`)
    .join("");

  const bodyRows = rows
    .map((row) => {
      const cells = intervals
        .map((interval) => {
          const analysis = intervalAnalyses[interval] || null;
          const cell = row.build(analysis);
          const directionClass = intermissionDirectionClass(cell.direction);
          const arrow = intermissionDirectionArrow(cell.direction);
          return `
            <div class="intermission-matrix-cell ${directionClass}">
              <span class="intermission-matrix-arrow">${arrow}</span>
              <span class="intermission-matrix-copy">${escapeHtml(cell.text)}</span>
            </div>
          `;
        })
        .join("");

      return `
        <div class="intermission-matrix-row">
          <strong class="intermission-matrix-label">${escapeHtml(row.label)}</strong>
          ${cells}
        </div>
      `;
    })
    .join("");

  return `
    <div class="intermission-matrix">
      <div class="intermission-matrix-row intermission-matrix-head">
        <span class="intermission-matrix-label">Time Frame</span>
        ${headerCells}
      </div>
      ${bodyRows}
    </div>
  `;
}

function buildIntermissionSummaryStage(summary, intermission) {
  const analysisTitle = buildIntermissionAnalysisTitle(intermission.coin);
  if (!summary) {
    return `
      <div class="intermission-stage intermission-portal-stage loading">
        <div class="intermission-portal intermission-summary-portal">
          <div class="intermission-portal-mark"></div>
          <section class="intermission-panel intermission-hero-panel">
            <div class="intermission-panel-topline">
              <span class="intermission-eyebrow">Coin analysis based on the last 6 time frames</span>
              <span class="intermission-dyor-badge">DYOR</span>
            </div>
            <strong class="intermission-portal-title">${escapeHtml(analysisTitle)}</strong>
            <div class="intermission-readline">Analyzing top 3 patterns across 6 timeframes...</div>
          </section>
          <div class="intermission-summary-grid">
            <section class="intermission-panel intermission-summary-card">
              <span class="intermission-panel-label">Market</span>
              <strong class="intermission-portal-coin">${escapeHtml(intermission.coin?.pair || "")}</strong>
              <p class="intermission-loading-copy">Gathering the strongest live reads from 4 hours down to 1 minute.</p>
            </section>
            <section class="intermission-panel intermission-summary-card intermission-discipline-card">
              <span class="intermission-panel-label">Status</span>
              <strong class="intermission-portal-status">Signal matrix warming up</strong>
              <div class="intermission-dyor-line">Analyze before you trade</div>
            </section>
          </div>
        </div>
      </div>
    `;
  }

  const biasLine = summary.dominantDirection === "Bullish"
    ? "Smart money seems active, and the current read leans bullish overall."
    : summary.dominantDirection === "Bearish"
      ? "Pressure still looks heavy, and the current read leans bearish overall."
      : "The read is still mixed, so the tape may need more confirmation.";
  const topPatternsText = summary.topPatterns?.length
    ? `Top patterns: ${summary.topPatterns.map((pattern) => pattern.name).slice(0, 3).join(" · ")}`
    : "Top patterns are still rotating into focus.";
  const weightedRead = `Weighted read: ${summary.biasPhrase}`;
  const quickFactsMarkup = buildIntermissionQuickFacts(summary);
  const topPatternCardsMarkup = buildIntermissionTopPatternCards(summary);

  return `
    <div class="intermission-stage intermission-portal-stage intermission-summary-stage ready ${intermission.analysisStatus === "fallback" ? "fallback" : ""}">
      <div class="intermission-portal intermission-summary-portal">
        <div class="intermission-portal-mark"></div>
        <section class="intermission-panel intermission-hero-panel">
          <div class="intermission-panel-topline">
            <span class="intermission-eyebrow">Coin analysis based on the last 6 time frames</span>
            <span class="intermission-dyor-badge">DYOR</span>
          </div>
          <strong class="intermission-portal-title">${escapeHtml(analysisTitle)}</strong>
          <div class="intermission-readline">${escapeHtml(weightedRead)}</div>
        </section>
        <div class="intermission-summary-grid">
          <section class="intermission-panel intermission-summary-card">
            <span class="intermission-panel-label">Market</span>
            <strong class="intermission-portal-coin">${escapeHtml(intermission.coin?.pair || "")}</strong>
            <p class="intermission-portal-summary">${escapeHtml(biasLine)}</p>
          </section>
          <section class="intermission-panel intermission-summary-card intermission-discipline-card">
            <span class="intermission-panel-label">Top patterns</span>
            <strong class="intermission-portal-status">${escapeHtml(topPatternsText)}</strong>
            <div class="intermission-dyor-line">Analyze before you trade</div>
          </section>
        </div>
        ${quickFactsMarkup}
        ${topPatternCardsMarkup}
      </div>
    </div>
  `;
}

function buildIntermissionOpeningStage(intermission) {
  const nextCoin = CONFIG.coins[intermission.nextCoinIndex ?? ((intermission.frozenCoinIndex + 1) % CONFIG.coins.length)] || null;
  const nextCoinName = nextCoin?.spokenName || nextCoin?.name || nextCoin?.symbol || "the next coin";
  const remainingMs = Math.max(0, Number(intermission.openingEndsAt || 0) - Date.now());
  const countdownSeconds = Math.max(1, Math.ceil((remainingMs || INTERMISSION_DOOR_OPEN_MS) / 1000));
  const progress = clamp(
    ((INTERMISSION_DOOR_OPEN_MS - Math.min(remainingMs || INTERMISSION_DOOR_OPEN_MS, INTERMISSION_DOOR_OPEN_MS)) / INTERMISSION_DOOR_OPEN_MS) * 100,
    0,
    100
  );
  return `
    <div class="intermission-stage intermission-portal-stage opening-stage ready">
      <div class="intermission-portal intermission-opening-portal">
        <div class="intermission-portal-mark"></div>
        <section class="intermission-panel intermission-hero-panel intermission-opening-frame">
          <div class="intermission-panel-topline">
            <span class="intermission-eyebrow">Next rotation chamber</span>
            <span class="intermission-dyor-badge">QUEUE</span>
          </div>
          <strong class="intermission-opening-title">NEXT COIN ANALYSIS STARTING...</strong>
          <p class="intermission-opening-copy">Let's proceed to ${escapeHtml(nextCoinName)}'s live analysis after a 10 second handoff.</p>
        </section>
        <section class="intermission-panel intermission-opening-progress-panel">
          <span class="intermission-panel-label">Queue status</span>
          <div class="intermission-opening-progress-copy">Proceeding to ${escapeHtml(nextCoinName)} in</div>
          <div class="intermission-opening-progress-value">${countdownSeconds}s</div>
          <div class="intermission-opening-progress-shell">
            <span class="intermission-opening-progress-fill" style="width:${Math.max(progress, 6).toFixed(2)}%;"></span>
          </div>
        </section>
      </div>
    </div>
  `;
}

function buildIntermissionStoppedStage(intermission) {
  const analysisTitle = buildIntermissionAnalysisTitle(intermission.coin);
  const topPatternName = intermission.summary?.topPatterns?.[0]?.name || "Rotation complete";
  const finalRead = intermission.summary?.biasPhrase
    ? `Final weighted read: ${intermission.summary.biasPhrase}`
    : "Current market wrap-up completed.";

  return `
    <div class="intermission-stage intermission-portal-stage opening-stage ready">
      <div class="intermission-portal intermission-opening-portal">
        <div class="intermission-portal-mark"></div>
        <section class="intermission-panel intermission-hero-panel intermission-opening-frame">
          <div class="intermission-panel-topline">
            <span class="intermission-eyebrow">Rotation paused</span>
            <span class="intermission-dyor-badge">STOPPED</span>
          </div>
          <strong class="intermission-opening-title">${escapeHtml(analysisTitle)}</strong>
          <p class="intermission-opening-copy">The current coin analysis and headline pass finished cleanly. The stream is now paused before moving to the next market.</p>
        </section>
        <section class="intermission-panel intermission-opening-progress-panel">
          <span class="intermission-panel-label">Final read</span>
          <div class="intermission-opening-progress-copy">${escapeHtml(finalRead)}</div>
          <div class="intermission-opening-progress-value">${escapeHtml(topPatternName)}</div>
          <div class="intermission-dyor-line">Rotation is on hold.</div>
        </section>
      </div>
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
      <div class="intermission-stage intermission-portal-stage loading">
        <div class="intermission-portal intermission-news-portal">
          <div class="intermission-portal-mark"></div>
        <section class="intermission-panel intermission-hero-panel intermission-news-frame">
          <strong class="intermission-portal-title">CURRENT TOP NEWS</strong>
          <div class="intermission-readline">Refreshing the top 3 crypto headlines...</div>
          <p class="intermission-loading-copy">The feed is syncing from CoinDesk and Cointelegraph. The next coin will open after a quick three-headline sweep and a 10 second handoff.</p>
        </section>
      </div>
    </div>
  `;
  }

  return `
    <div class="intermission-stage intermission-portal-stage intermission-news-scene ready ${intermission.newsStatus === "fallback" ? "fallback" : ""}">
      <div class="intermission-portal intermission-news-portal">
        <div class="intermission-portal-mark"></div>
        <section class="intermission-panel intermission-hero-panel intermission-news-frame">
          <div class="intermission-panel-topline">
            <span class="intermission-eyebrow">Headline rotation</span>
            <span class="intermission-dyor-badge">LIVE FEED</span>
          </div>
          <strong class="intermission-portal-title">CURRENT TOP NEWS</strong>
          <p class="intermission-news-deck-copy">Top 3 headline sweep. Source and title only, then a 10 second handoff to the next coin.</p>
          <div class="intermission-readline">${escapeHtml(statusText)}</div>
        </section>
        <div class="intermission-news-stack">
          ${newsItems.map((item, index) => `
            <article class="intermission-news-story rank-${index + 1}" data-news-index="${index}" style="--news-delay:${140 + index * 380}ms">
              <div class="intermission-news-story-rank">#${index + 1}</div>
              <div class="intermission-news-story-body">
                <div class="intermission-news-story-meta">
                  <span class="intermission-news-source">${escapeHtml(item.source || "Crypto desk")}</span>
                  <span class="intermission-news-age">${escapeHtml(item.relativeTime || "Now")}</span>
                </div>
                <strong class="intermission-news-headline">${escapeHtml(item.title)}</strong>
              </div>
            </article>
          `).join("")}
        </div>
        <div class="intermission-news-cta">Headline sweep only</div>
      </div>
    </div>
  `;
}

function buildIntermissionStage(intermission) {
  if (intermission.phase === "stopped") {
    return buildIntermissionStoppedStage(intermission);
  }
  if (intermission.phase === "opening") {
    return buildIntermissionOpeningStage(intermission);
  }
  if (intermission.phase === "news") {
    return buildIntermissionNewsStage(intermission);
  }
  return buildIntermissionSummaryStage(intermission.summary, intermission);
}

function buildIntermissionOverlayControls() {
  return `
    <div class="intermission-overlay-controls">
      <button
        type="button"
        class="ribbon-action-button intermission-overlay-action"
        data-intermission-skip
      >${escapeHtml(currentSkipButtonLabel())}</button>
    </div>
  `;
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
      : state.intermission.phase === "stopped"
        ? "stopped"
      : "summary";
  const stageSpecificKey = stageView === "news"
    ? [
        state.intermission.newsStatus,
        (state.intermission.newsItems || []).map((item) => item.title).join("|") || "no-news",
      ].join("::")
    : stageView === "stopped"
      ? [
          state.streamControl.stopAfterCurrent ? "stop-requested" : "stop-idle",
          state.intermission.summary?.biasPhrase || "",
          state.intermission.summary?.topPatterns?.[0]?.name || "",
        ].join("::")
    : stageView === "opening"
      ? [
          state.intermission.nextCoinIndex ?? "",
          CONFIG.coins[state.intermission.nextCoinIndex ?? 0]?.spokenName || "",
          Math.max(0, Math.ceil(Math.max(0, Number(state.intermission.openingEndsAt || 0) - Date.now()) / 1000)),
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
    scheduleIntermissionStageFit();
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
      ${buildIntermissionOverlayControls()}
      <div class="intermission-stage-fit" data-intermission-stage-fit>
        <div class="intermission-stage-scale" data-intermission-stage-scale>
          ${buildIntermissionStage(state.intermission)}
        </div>
      </div>
      <div class="intermission-live-subtitle" data-intermission-live-subtitle></div>
    </div>
  `;
  dom.intermissionOverlay.querySelector("[data-intermission-skip]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleSkipControl();
  });
  renderIntermissionLiveSubtitle();
  scheduleIntermissionStageFit();
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
    state.intermission.intervalAnalyses = result.intervalAnalyses;
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
    state.intermission.intervalAnalyses = cachedIntervalAnalyses;
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

async function runIntermissionPodcastSequence(token, runId = state.intermission.stageRunId) {
  const startedAt = Date.now();
  if (!isIntermissionStageCurrent(token, runId)) {
    return false;
  }

  if (!state.intermission.podcastPackage) {
    await loadIntermissionPodcast(token, state.intermission.coin, state.intermission.cachedIntervalAnalyses || {});
  }

  if (!isIntermissionStageCurrent(token, runId)) {
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

  if (!isIntermissionStageCurrent(token, runId)) {
    return true;
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed < INTERMISSION_SUMMARY_MIN_MS + INTERMISSION_NEWS_MIN_MS) {
    const completedWait = await waitForIntermissionStage(INTERMISSION_SUMMARY_MIN_MS + INTERMISSION_NEWS_MIN_MS - elapsed, token, runId);
    if (!completedWait) {
      return true;
    }
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
    phaseStartedAt: Date.now(),
    openingEndsAt: 0,
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
    intervalAnalyses: {},
    subtitleClip: null,
    stageRunId: 1,
  };

  beginIntermissionVoice(token);
  resetLiveCommentaryObservation();
  renderIntermissionOverlay();
  updateFooterControlState();
  loadIntermissionSummary(token, coin, cachedIntervalAnalyses).catch(() => {});
  loadIntermissionNews(token).catch(() => {});
  loadIntermissionPodcast(token, coin, cachedIntervalAnalyses).catch(() => {});
  preloadNextCoinSnapshot(token);

  scheduleIntermissionTimeout(INTERMISSION_DOOR_CLOSE_MS, () => {
    if (!state.intermission.active || state.intermission.token !== token) {
      return;
    }
    state.intermission.phase = "summary";
    state.intermission.phaseStartedAt = Date.now();
    renderIntermissionOverlay();
    runIntermissionSequence(token).catch(() => {
      if (!state.intermission.active || state.intermission.token !== token) {
        return;
      }
      if (state.streamControl.stopAfterCurrent) {
        enterStoppedIntermission(token);
        return;
      }
      enterIntermissionOpeningPhase(token);
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
    phaseStartedAt: 0,
    openingEndsAt: 0,
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
    intervalAnalyses: {},
    subtitleClip: null,
    stageRunId: 0,
  };
  state.streamControl.stopAfterCurrent = false;
  state.streamControl.stopped = false;
  endIntermissionVoice(token);
  resetLiveCommentaryObservation();
  clearIntermissionOverlay();
  updateFooterControlState();

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
    state.streamControl.stopAfterCurrent = false;
    state.streamControl.stopped = false;
    updateFooterControlState();
    return;
  }
  clearIntermissionTimers();
  endIntermissionVoice(state.intermission.token);
  state.intermission = {
    active: false,
    phase: "idle",
    startedAt: 0,
    phaseStartedAt: 0,
    openingEndsAt: 0,
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
    intervalAnalyses: {},
    subtitleClip: null,
    stageRunId: 0,
  };
  state.streamControl.stopAfterCurrent = false;
  state.streamControl.stopped = false;
  clearIntermissionOverlay();
  resetLiveCommentaryObservation();
  updateFooterControlState();
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
        render("fast");
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

      recomputeDerivedState({ analyzePattern: false });
      if (!shouldFreezeUnderlyingScene()) {
        render("fast");
        scheduleVisualRender();
      }
      scheduleHeavyRefresh({
        coin,
        force: Boolean(kline.x),
      });
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
  render("visual");
  scheduleDeferredFullRender();

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
    recomputeDerivedState({ analyzePattern: false });
    render("fast");
    scheduleVisualRender();
    scheduleHeavyRefresh({
      coin,
      force: false,
    });
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
  const nextIntervalIndex = clamp(intervalIndex, 0, MULTI_TIMEFRAME_INTERVALS.length - 1);
  const shouldResetWarmup = index !== state.currentIndex || (resetRotation && nextIntervalIndex === 0);
  if (!isIntermissionActive()) {
    interruptVoicePlayback();
    resetLiveCommentaryObservation({ resetWarmup: shouldResetWarmup });
  }
  state.currentIndex = index;
  if (resetRotation) {
    state.rotationStartedAt = Date.now();
  }
  state.currentIntervalIndex = nextIntervalIndex;
  CONFIG.interval = currentInterval();
  state.loadSequence += 1;
  state.alignmentRequestId += 1;
  const loadSequence = state.loadSequence;
  const coin = currentCoin();
  state.topDownAnalysis = null;
  state.intervalAnalyses = {};
  state.timeframeAlignment = [];
  state.alignmentLoading = false;
  resetLiveRenderScheduler();

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
    recomputeDerivedState({ analyzePattern: false });
    render("visual");
    scheduleDeferredFullRender();
    if ((state.launch.countdownActive || (state.intermission.active && state.intermission.phase === "opening")) && state.currentIntervalIndex === 0) {
      preloadWarmupIntro().catch(() => {});
    }
    scheduleHeavyRefresh({
      coin,
      force: true,
    });
    connectSocket(coin, loadSequence);
  } catch (error) {
    if (loadSequence !== state.loadSequence) {
      return;
    }
    startMockMode(coin, error);
  }
}

function maybeRotateCoin() {
  if (isLaunchScreenActive() || isIntermissionActive() || isSubscribePromptActive()) {
    return;
  }
  const elapsed = Date.now() - state.rotationStartedAt;
  const rotationMs = CONFIG.rotationMinutes * 60 * 1000;
  if (elapsed >= rotationMs) {
    startIntermission();
  }
}

function maybeRotateTimeframe() {
  if (isLaunchScreenActive() || isIntermissionActive() || isSubscribePromptActive()) {
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
    renderUpcomingCoinQueue();
    return;
  }
  const rotationMs = CONFIG.rotationMinutes * 60 * 1000;
  const remaining = Math.max(0, rotationMs - (Date.now() - state.rotationStartedAt));
  const minutes = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
  dom.rotationCountdown.textContent = `${minutes}:${seconds}`;
  renderUpcomingCoinQueue();
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

function normalizeOverlayPoints(points = []) {
  return points
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    .reduce((result, point) => {
      const previous = result[result.length - 1];
      if (!previous || Math.abs(previous.x - point.x) > 0.05 || Math.abs(previous.y - point.y) > 0.05) {
        result.push(point);
      }
      return result;
    }, []);
}

function shouldSmoothPatternOverlay(patternMeta = {}, pointCount = 0) {
  if (pointCount <= 3) {
    return false;
  }
  return ["roundedTurn", "roundedMarket", "vTurn", "fadePattern", "meanReversion", "parabolic", "broadening", "megaphone"].includes(patternMeta?.detectorType);
}

function buildPatternOverlayPath(points, patternMeta = {}) {
  const safePoints = normalizeOverlayPoints(points);
  if (safePoints.length < 2) {
    return "";
  }
  return shouldSmoothPatternOverlay(patternMeta, safePoints.length)
    ? buildSmoothPath(safePoints)
    : buildPolylinePath(safePoints);
}

function mapPatternPointToChart(index, price, chartLeft, candleSlot, mapY) {
  return {
    x: chartLeft + index * candleSlot + candleSlot / 2,
    y: mapY(price),
  };
}

function buildAnchoredPatternTracePoints(spanCandles, activePattern, chartLeft, candleSlot, mapY) {
  if (!spanCandles.length || !activePattern?.span || !(activePattern.tracePoints || []).length) {
    return [];
  }

  const spanStartIndex = activePattern.span.startIndex;
  const anchors = (activePattern.tracePoints || [])
    .filter((point) => Number.isFinite(point?.index) && Number.isFinite(point?.price))
    .slice()
    .sort((left, right) => left.index - right.index || left.price - right.price);

  if (anchors.length < 2) {
    return [];
  }

  const points = [];
  const lastLocalIndex = Math.max(spanCandles.length - 1, 0);
  const toLocalIndex = (globalIndex) => clamp(globalIndex - spanStartIndex, 0, lastLocalIndex);

  anchors.forEach((anchor, anchorIndex) => {
    const anchorLocalIndex = toLocalIndex(anchor.index);
    points.push(mapPatternPointToChart(anchor.index, anchor.price, chartLeft, candleSlot, mapY));

    const nextAnchor = anchors[anchorIndex + 1];
    if (!nextAnchor) {
      return;
    }

    const nextAnchorLocalIndex = toLocalIndex(nextAnchor.index);
    for (let localIndex = anchorLocalIndex + 1; localIndex < nextAnchorLocalIndex; localIndex += 1) {
      const candle = spanCandles[localIndex];
      if (!candle) {
        continue;
      }
      const globalIndex = spanStartIndex + localIndex;
      points.push(mapPatternPointToChart(globalIndex, candle.close, chartLeft, candleSlot, mapY));
    }
  });

  return normalizeOverlayPoints(points);
}

function buildCenteredPatternSignaturePoints(activePattern, spanX, spanWidth, spanLow, spanHigh, mapY) {
  const reference = detectorEngine.getPatternReference?.(activePattern?.patternId || activePattern?.pattern?.id || "");
  const signature = reference?.referenceIllustration?.signature;
  if (!Array.isArray(signature) || !signature.length || !Number.isFinite(spanX) || !Number.isFinite(spanWidth)) {
    return [];
  }

  const priceRange = Math.max(spanHigh - spanLow, 1e-9);
  const innerLow = spanLow + priceRange * 0.12;
  const innerHigh = spanHigh - priceRange * 0.12;
  const innerRange = Math.max(innerHigh - innerLow, 1e-9);

  return normalizeOverlayPoints(signature.map((value, index, values) => {
    const progress = index / Math.max(values.length - 1, 1);
    const x = spanX + spanWidth * (0.08 + progress * 0.84);
    const centeredValue = 0.5 + (clamp(value, 0, 1) - 0.5) * 0.78;
    const price = innerLow + centeredValue * innerRange;
    return {
      x,
      y: mapY(price),
    };
  }));
}

function buildActivePatternTracePoints(spanCandles, activePattern, chartLeft, candleSlot, mapY) {
  if (!spanCandles.length || !activePattern?.span) {
    return [];
  }

  const anchoredTrace = buildAnchoredPatternTracePoints(spanCandles, activePattern, chartLeft, candleSlot, mapY);
  if (anchoredTrace.length >= 4) {
    return anchoredTrace;
  }

  const candleTrace = normalizeOverlayPoints(
    buildPatternTracePoints(spanCandles, activePattern.span.startIndex, chartLeft, candleSlot, mapY)
  );
  if (candleTrace.length >= 2) {
    return candleTrace;
  }

  return normalizeOverlayPoints((activePattern.tracePoints || []).map((point) => ({
    x: chartLeft + point.index * candleSlot + candleSlot / 2,
    y: mapY(point.price),
  })));
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
  chartCinematic.dom.scannerGroup = dom.priceChart?.querySelector("#chart-scanner-group") || null;
  chartCinematic.dom.scannerLine = dom.priceChart?.querySelector("#chart-scanner-line") || null;
  chartCinematic.dom.scannerGlow = dom.priceChart?.querySelector("#chart-scanner-glow") || null;
  chartCinematic.dom.staticLevelsLayer = dom.priceChart?.querySelector("#chart-static-levels-layer") || null;
  chartCinematic.dom.priceCalloutLayer = dom.priceChart?.querySelector("#chart-price-callout-layer") || null;
  chartCinematic.dom.zoneUnderlay = dom.priceChart?.querySelector("#chart-zone-underlay") || null;
  chartCinematic.dom.candleHighlightLayer = dom.priceChart?.querySelector("#chart-candle-highlight-layer") || null;
  chartCinematic.dom.zoneOverlay = dom.priceChart?.querySelector("#chart-zone-overlay") || null;
  chartCinematic.dom.zoneGroup = dom.priceChart?.querySelector("#chart-zone-group") || null;
  chartCinematic.dom.zoneHalo = dom.priceChart?.querySelector("#chart-zone-halo") || null;
  chartCinematic.dom.zoneBorder = dom.priceChart?.querySelector("#chart-zone-border") || null;
  chartCinematic.dom.zoneFill = dom.priceChart?.querySelector("#chart-zone-fill") || null;
  chartCinematic.dom.zoneLabel = dom.priceChart?.querySelector("#chart-zone-label") || null;
  chartCinematic.dom.zoneLabelScaleWrap = dom.priceChart?.querySelector("#chart-zone-label-scale-wrap") || null;
  chartCinematic.dom.zoneLabelCard = dom.priceChart?.querySelector("#chart-zone-label-card") || null;
  chartCinematic.dom.zoneLabelTitle = dom.priceChart?.querySelector("#chart-zone-label-title") || null;
  chartCinematic.dom.zoneLabelRange = dom.priceChart?.querySelector("#chart-zone-label-range") || null;
  chartCinematic.dom.patternTimePanel = dom.priceChart?.querySelector("#chart-pattern-time-panel") || null;
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

function buildStaticLevelLinesMarkup(layout) {
  if (!layout) return "";
  const bounds = deriveSupportResistanceBounds(layout.candles || []);
  if (!Number.isFinite(bounds.support) || !Number.isFinite(bounds.resistance)) return "";
  const levels = [
    { name: "Support", value: bounds.support, stroke: "#7dffb8", glow: "rgba(111, 255, 181, 0.22)" },
    { name: "Resistance", value: bounds.resistance, stroke: "#ff8aa8", glow: "rgba(255, 118, 154, 0.22)" },
    ...deriveFibonacciLevels(layout.candles || [])
      .filter((level) => [0.382, 0.5, 0.618].includes(level.ratio))
      .map((level) => ({ name: level.label, value: level.value, stroke: level.stroke, glow: level.glow })),
  ];
  return levels.map((level) => {
    const y = layout.mapY(level.value);
    return `
      <g class="chart-static-level-lines ${level.name.toLowerCase()}">
        <line x1="${layout.chartLeft}" y1="${y.toFixed(2)}" x2="${layout.chartLeft + layout.chartWidth}" y2="${y.toFixed(2)}" stroke="${level.glow}" stroke-width="7" stroke-linecap="round" />
        <line x1="${layout.chartLeft}" y1="${y.toFixed(2)}" x2="${layout.chartLeft + layout.chartWidth}" y2="${y.toFixed(2)}" stroke="${level.stroke}" stroke-width="1.5" stroke-dasharray="8 7" opacity="0.72" />
      </g>
    `;
  }).join("");
}

function buildStaticLevelMarkup(layout) {
  if (!layout) return "";
  const bounds = deriveSupportResistanceBounds(layout.candles || []);
  if (!Number.isFinite(bounds.support) || !Number.isFinite(bounds.resistance)) return "";
  const reducedVisuals = isReducedPerformanceMode() || isMinimalPerformanceMode();
  const mentionedFibKeys = new Set(chartCinematic.levelFocus.fibKeys || []);
  const levels = [
    { key: "support", name: "Support", value: bounds.support, stroke: "#7dffb8", glow: "rgba(111, 255, 181, 0.22)", side: "inside-right" },
    { key: "resistance", name: "Resistance", value: bounds.resistance, stroke: "#ff8aa8", glow: "rgba(255, 118, 154, 0.22)", side: "inside-right" },
    ...deriveFibonacciLevels(layout.candles || [])
      .filter((level) => [0.382, 0.5, 0.618].includes(level.ratio))
      .map((level) => ({ key: level.key, name: level.label, value: level.value, stroke: level.stroke, glow: level.glow, side: "left" })),
  ];
  
  const activePattern = state.currentIntervalPattern;
  const activeSpan = activePattern?.span;
  const candleSlot = layout.chartWidth / (layout.candles?.length || 1);
  const spanX = activeSpan ? layout.chartLeft + activeSpan.startIndex * candleSlot : layout.chartLeft + layout.chartWidth * 0.42;
  const spanWidth = activeSpan
    ? Math.max((activeSpan.endIndex - activeSpan.startIndex + 1) * candleSlot, 28)
    : layout.chartWidth * 0.24;
  const boxLeft = spanX;
  const boxRight = spanX + spanWidth;
  const labelScale = chartCinematic.camera.currentScale > 1 ? clamp(1 / chartCinematic.camera.currentScale, 0.68, 1) : 1;
  const occupiedY = {
    left: [],
    right: [],
    "inside-right": [],
  };

  return levels.map((level) => {
    const y = layout.mapY(level.value);
    const levelText = `${level.name} · ${formatPrice(level.value)}`;
    const labelWidth = Math.min(132, Math.max(86, levelText.length * 5.6 + 12));
    const showLabel = !level.name.startsWith("Fib") || mentionedFibKeys.has(level.key);
    const desiredX = level.side === "left"
      ? clamp(boxLeft - labelWidth - 12, layout.chartLeft + 8, layout.chartLeft + layout.chartWidth - labelWidth - 8)
      : level.side === "inside-right"
        ? clamp(boxRight - labelWidth - 10, boxLeft + 8, layout.chartLeft + layout.chartWidth - labelWidth - 8)
        : clamp(boxRight + 10, layout.chartLeft + 8, layout.chartLeft + layout.chartWidth - labelWidth - 8);
    let labelY = clamp(y - 9, (layout.priceTopPadding || 24) + 6, layout.priceTop - 32);
    while (occupiedY[level.side].some((occupied) => Math.abs(occupied - labelY) < 20)) {
      labelY = clamp(labelY + 20, (layout.priceTopPadding || 24) + 6, layout.priceTop - 32);
    }
    occupiedY[level.side].push(labelY);
    const labelCenterX = desiredX + labelWidth / 2;
    const labelCenterY = labelY + 9;
    return `
      <g class="chart-static-level ${level.name.toLowerCase()}">
        <line x1="${layout.chartLeft}" y1="${y.toFixed(2)}" x2="${layout.chartLeft + layout.chartWidth}" y2="${y.toFixed(2)}" stroke="${level.glow}" stroke-width="6" stroke-linecap="round" />
        <line x1="${layout.chartLeft}" y1="${y.toFixed(2)}" x2="${layout.chartLeft + layout.chartWidth}" y2="${y.toFixed(2)}" stroke="${level.stroke}" stroke-width="1.2" stroke-dasharray="${level.name.startsWith("Fib") ? "4 7" : "8 7"}" opacity="${level.name.startsWith("Fib") ? "0.56" : "0.66"}" />
        ${showLabel ? `
          <g transform="translate(${labelCenterX.toFixed(2)} ${labelCenterY.toFixed(2)}) scale(${labelScale.toFixed(3)}) translate(${(-labelCenterX).toFixed(2)} ${(-labelCenterY).toFixed(2)})">
            <rect x="${desiredX.toFixed(2)}" y="${labelY.toFixed(2)}" width="${labelWidth.toFixed(2)}" height="18" rx="4" fill="rgba(10, 14, 22, 0.94)" stroke="${level.stroke}" stroke-opacity="0.32"${reducedVisuals ? "" : ' filter="url(#blueNeonGlow)"'} />
            <text x="${(desiredX + 8).toFixed(2)}" y="${(labelY + 4.5).toFixed(2)}" fill="${level.stroke}" font-size="10" font-weight="700">${escapeHtml(levelText)}</text>
          </g>
        ` : ""}
      </g>
    `;
  }).join("");
}

function buildPriceCalloutMarkup(lines, layout) {
  if (!lines?.length || !layout) return "";
  const reducedVisuals = isReducedPerformanceMode() || isMinimalPerformanceMode();
  const activePattern = state.currentIntervalPattern;
  const activeSpan = activePattern?.span;
  const candleSlot = layout.chartWidth / (layout.candles?.length || 1);
  const spanX = activeSpan ? layout.chartLeft + activeSpan.startIndex * candleSlot : layout.chartLeft + layout.chartWidth * 0.42;
  const spanWidth = activeSpan
    ? Math.max((activeSpan.endIndex - activeSpan.startIndex + 1) * candleSlot, 28)
    : layout.chartWidth * 0.24;
  const boxRight = spanX + spanWidth;
  const gutterStartX = boxRight + 12;
  const svgRight = 1110;
  const bounds = deriveSupportResistanceBounds(layout.candles || []);
  const referenceYs = [
    Number.isFinite(bounds.support) ? layout.mapY(bounds.support) : null,
    Number.isFinite(bounds.resistance) ? layout.mapY(bounds.resistance) : null,
  ].filter(Number.isFinite);
  const occupiedPanels = [];
  const labelScale = chartCinematic.camera.currentScale > 1 ? clamp(1 / chartCinematic.camera.currentScale, 0.68, 1) : 1;

  return lines.map((line, index) => {
    const y = layout.mapY(line.value);
    const labelWidth = Math.min(140, Math.max(94, line.label.length * 6.6 + 10));
    let labelY = clamp(y - 9 - index * 22, (layout.priceTopPadding || 24) + 6, layout.priceTop - 32);
    const labelX = gutterStartX;
    const gutterWidth = Math.max(44, svgRight - gutterStartX);
    const fitScale = Math.min(labelScale, clamp(gutterWidth / labelWidth, 0.52, 1));
    while (
      referenceYs.some((referenceY) => Math.abs(referenceY - (labelY + 9)) < 22)
      || occupiedPanels.some((panel) => Math.abs(panel.y - labelY) < 20 && Math.abs(panel.x - labelX) < Math.max(panel.width, labelWidth))
    ) {
      const nextY = clamp(labelY + 20, (layout.priceTopPadding || 24) + 6, layout.priceTop - 32);
      if (nextY === labelY) {
        break;
      }
      labelY = nextY;
    }
    occupiedPanels.push({ x: labelX, y: labelY, width: labelWidth });
    const labelCenterX = labelX + labelWidth / 2;
    const labelCenterY = labelY + 9;
    return `
      <g class="chart-price-callout-line" data-price-key="${escapeHtml(line.key)}">
        <line x1="${layout.chartLeft}" y1="${y.toFixed(2)}" x2="${layout.chartLeft + layout.chartWidth}" y2="${y.toFixed(2)}" stroke="rgba(255, 210, 123, 0.18)" stroke-width="8" stroke-linecap="round" />
        <g transform="translate(${labelCenterX.toFixed(2)} ${labelCenterY.toFixed(2)}) scale(${fitScale.toFixed(3)}) translate(${(-labelCenterX).toFixed(2)} ${(-labelCenterY).toFixed(2)})">
          <rect x="${labelX.toFixed(2)}" y="${labelY.toFixed(2)}" width="${labelWidth.toFixed(2)}" height="18" rx="4" fill="rgba(17, 14, 10, 0.96)" stroke="rgba(255, 214, 138, 0.42)"${reducedVisuals ? "" : ' filter="url(#blueNeonGlow)"'} />
          <text x="${(labelX + 8).toFixed(2)}" y="${(labelY + 13).toFixed(2)}" fill="#ffe6b5" font-size="10" font-weight="700">${escapeHtml(line.label)}</text>
        </g>
      </g>
    `;
  }).join("");
}

function buildStaticLevelRenderKey(layout) {
  if (!layout?.candles?.length) {
    return "";
  }

  const bounds = deriveSupportResistanceBounds(layout.candles || []);
  const fibLevels = deriveFibonacciLevels(layout.candles || [])
    .filter((level) => [0.382, 0.5, 0.618].includes(level.ratio))
    .map((level) => `${level.key}:${Number(level.value || 0).toFixed(4)}`)
    .join("|");
  const activeSpan = state.currentIntervalPattern?.span;
  const lastCandle = last(layout.candles);

  return [
    layout.candles.length,
    lastCandle?.openTime ?? "",
    Number(lastCandle?.open || 0).toFixed(4),
    Number(lastCandle?.high || 0).toFixed(4),
    Number(lastCandle?.low || 0).toFixed(4),
    Number(lastCandle?.close || 0).toFixed(4),
    Number(bounds.support || 0).toFixed(4),
    Number(bounds.resistance || 0).toFixed(4),
    fibLevels,
    activeSpan?.startIndex ?? "",
    activeSpan?.endIndex ?? "",
    (chartCinematic.levelFocus.fibKeys || []).join("|"),
  ].join("::");
}

function renderStaticLevels(force = false) {
  cacheChartCinematicDom();
  if (!chartCinematic.layout || !chartCinematic.dom.staticLevelsLayer) return;
  const renderKey = buildStaticLevelRenderKey(chartCinematic.layout);
  if (!force && chartCinematic.levelFocus.renderKey === renderKey && chartCinematic.dom.staticLevelsLayer.childElementCount) {
    return;
  }
  chartCinematic.levelFocus.renderKey = renderKey;
  chartCinematic.dom.staticLevelsLayer.innerHTML = buildStaticLevelMarkup(chartCinematic.layout);
}

function updatePriceCalloutPresentation(now = currentAnimationTime()) {
  cacheChartCinematicDom();
  if (!chartCinematic.dom.priceCalloutLayer || !chartCinematic.layout) {
    return;
  }

  if (!chartCinematic.priceFocus.lines.length) {
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
  chartCinematic.levelFocus.fibKeys = extractMentionedFibKeys(clip?.text || "", layout.candles || state.candles);
  if (chartCinematic.dom.priceCalloutLayer) {
    chartCinematic.dom.priceCalloutLayer.innerHTML = buildPriceCalloutMarkup(chartCinematic.priceFocus.lines, layout);
    chartCinematic.dom.priceCalloutLayer.setAttribute("opacity", chartCinematic.priceFocus.active ? "0.72" : "0");
  }
  renderStaticLevels(true);
}

function buildZoneOverlayMarkup(zone, layout) {
  if (!zone || !layout) return { underlay: "", highlights: "", overlay: "" };
  const candleSlot = layout.chartWidth / (layout.candles?.length || 1);

  const cornerRadius = Math.max(8, Math.min(16, zone.height * 0.16));
  const palette = zone.palette;
  const labelWidth = Math.min(128, Math.max(92, Math.max(zone.label.length, zone.rangeLabel.length) * 6.2 + 16));
  const labelHeight = 28;
  const labelX = zone.x + zone.width / 2 - labelWidth / 2;
  const labelY = zone.y + zone.height / 2 - labelHeight / 2;
  const labelCenterX = labelX + labelWidth / 2;
  const labelCenterY = labelY + labelHeight / 2;
  
  const candleGlowMarkup = zone.candleIndices.map((index) => {
    const candle = layout.candles[index];
    if (!candle) return "";
    const x = layout.chartLeft + index * layout.candleSlot + layout.candleSlot / 2;
    const bodyTop = Math.min(layout.mapY(candle.open), layout.mapY(candle.close));
    const bodyHeight = Math.max(Math.abs(layout.mapY(candle.close) - layout.mapY(candle.open)), 4);
    const highlightWidth = Math.max(layout.candleSlot * 0.72, 7);
    return `
      <g>
        <line x1="${x.toFixed(2)}" y1="${layout.mapY(candle.high).toFixed(2)}" x2="${x.toFixed(2)}" y2="${layout.mapY(candle.low).toFixed(2)}" stroke="${palette.border}" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />
        <rect x="${(x - highlightWidth / 2).toFixed(2)}" y="${bodyTop.toFixed(2)}" width="${highlightWidth.toFixed(2)}" height="${bodyHeight.toFixed(2)}" rx="2" fill="rgba(255,255,255,0.05)" stroke="${palette.border}" stroke-width="1.1" />
      </g>
    `;
  }).join("");

  return {
    underlay: `
      <g id="chart-zone-group">
        <rect id="chart-zone-fill" x="${zone.x.toFixed(2)}" y="${zone.y.toFixed(2)}" width="${zone.width.toFixed(2)}" height="${zone.height.toFixed(2)}" rx="${cornerRadius.toFixed(2)}" fill="url(#${zone.type === "support" ? "supportZoneFill" : "resistanceZoneFill"})" fill-opacity="0" filter="url(#zoneSoftBlur)" />
      </g>
    `,
    highlights: `
      <g id="chart-zone-candle-highlights" opacity="0" style="mix-blend-mode:screen;">${candleGlowMarkup}</g>
    `,
    overlay: `
      <g>
        <rect id="chart-zone-halo" x="${zone.x.toFixed(2)}" y="${zone.y.toFixed(2)}" width="${zone.width.toFixed(2)}" height="${zone.height.toFixed(2)}" rx="${cornerRadius.toFixed(2)}" fill="none" stroke="${palette.halo}" stroke-width="8" stroke-opacity="0" filter="url(#zoneNeonGlow)" />
        <rect id="chart-zone-border" x="${zone.x.toFixed(2)}" y="${zone.y.toFixed(2)}" width="${zone.width.toFixed(2)}" height="${zone.height.toFixed(2)}" rx="${cornerRadius.toFixed(2)}" fill="none" stroke="${palette.border}" stroke-width="1.9" stroke-opacity="0" stroke-dasharray="8 6" vector-effect="non-scaling-stroke" filter="url(#zoneEdgeGlow)">
          <animate attributeName="stroke-dashoffset" values="0;28" dur="0.9s" repeatCount="indefinite" />
        </rect>
      </g>
    `,
    labelOverlay: `
      <g id="chart-zone-label" opacity="0" data-anchor-x="${labelCenterX.toFixed(2)}" data-anchor-y="${labelCenterY.toFixed(2)}">
        <g id="chart-zone-label-scale-wrap">
          <rect id="chart-zone-label-card" x="${labelX.toFixed(2)}" y="${labelY.toFixed(2)}" width="${labelWidth.toFixed(2)}" height="${labelHeight.toFixed(2)}" rx="10" fill="rgba(14, 18, 28, 0.76)" stroke="rgba(255,255,255,0.12)" filter="url(#zoneLabelGlow)" />
          <text id="chart-zone-label-title" x="${(labelX + 12).toFixed(2)}" y="${(labelY + 15).toFixed(2)}" fill="${palette.text}" font-size="11" font-weight="700">${escapeHtml(zone.label)}</text>
          <text id="chart-zone-label-range" x="${(labelX + 12).toFixed(2)}" y="${(labelY + 28).toFixed(2)}" fill="rgba(255,255,255,0.72)" font-size="10" font-weight="500">${escapeHtml(zone.rangeLabel)}</text>
        </g>
      </g>
    `
  };
}

function rebuildChartZoneOverlay(force = false) {
  cacheChartCinematicDom();
  const zone = chartCinematic.zone.resolved;
  const layout = chartCinematic.layout;
  if (!chartCinematic.dom.zoneUnderlay || !chartCinematic.dom.zoneOverlay || !chartCinematic.dom.candleHighlightLayer) return;

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

  if (!force && chartCinematic.zone.renderKey === zone.key) return;

  chartCinematic.zone.renderKey = zone.key;
  const markup = buildZoneOverlayMarkup(zone, layout);
  chartCinematic.dom.zoneUnderlay.innerHTML = markup.underlay;
  chartCinematic.dom.candleHighlightLayer.innerHTML = markup.highlights;
  chartCinematic.dom.zoneOverlay.innerHTML = markup.overlay + (markup.labelOverlay || "");
  
  cacheChartCinematicDom();
}

function applyChartCameraTransform() {
  const { currentTx, currentTy, currentScale } = chartCinematic.camera;
  if (chartCinematic.dom.cameraRoot) {
    chartCinematic.dom.cameraRoot.setAttribute(
      "transform",
      `translate(${currentTx.toFixed(2)} ${currentTy.toFixed(2)}) scale(${currentScale.toFixed(4)})`
    );
  }
}

function updateFloatingChartLabelScale() {
  const currentScale = Number(chartCinematic.camera.currentScale || 1);
  const labelScale = currentScale > 1 ? clamp(1 / currentScale, 0.68, 1) : 1;

  if (chartCinematic.dom.zoneLabel && chartCinematic.dom.zoneLabelScaleWrap) {
    const anchorX = Number(chartCinematic.dom.zoneLabel.dataset.anchorX || 0);
    const anchorY = Number(chartCinematic.dom.zoneLabel.dataset.anchorY || 0);
    if (Number.isFinite(anchorX) && Number.isFinite(anchorY)) {
      chartCinematic.dom.zoneLabelScaleWrap.setAttribute(
        "transform",
        `translate(${anchorX.toFixed(2)} ${anchorY.toFixed(2)}) scale(${labelScale.toFixed(3)}) translate(${(-anchorX).toFixed(2)} ${(-anchorY).toFixed(2)})`
      );
    }
  }

  if (chartCinematic.dom.patternTimePanel) {
    const anchorX = Number(chartCinematic.dom.patternTimePanel.dataset.anchorX || 0);
    const anchorY = Number(chartCinematic.dom.patternTimePanel.dataset.anchorY || 0);
    if (Number.isFinite(anchorX) && Number.isFinite(anchorY)) {
      chartCinematic.dom.patternTimePanel.setAttribute(
        "transform",
        `translate(${anchorX.toFixed(2)} ${anchorY.toFixed(2)}) scale(${labelScale.toFixed(3)})`
      );
    }
  }
}

function updateScannerPresentation(now) {
  if (!chartCinematic.dom.scannerGroup || !chartCinematic.dom.scannerLine || !chartCinematic.dom.scannerGlow) return;
  const layout = chartCinematic.layout;
  const width = layout.chartWidth || 1000;
  const xLeft = layout.chartLeft || 40;
  
  // High-intensity scanner sweep
  const speed = 0.00034;
  const progress = (now * speed) % 1;
  const xPos = xLeft + progress * width;

  chartCinematic.dom.scannerLine.setAttribute("transform", `translate(${xPos} 0)`);
  chartCinematic.dom.scannerGlow.setAttribute("transform", `translate(${xPos} 0)`);
  
  // Boost visibility
  chartCinematic.dom.scannerLine.setAttribute("opacity", "0.8");
  chartCinematic.dom.scannerGlow.setAttribute("opacity", "0.45");
  
  // Use stroke width to make it a beam
  chartCinematic.dom.scannerLine.setAttribute("stroke-width", "3.2");
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
  if (force) {
    renderStaticLevels(true);
  }
  rebuildChartZoneOverlay(force);
  updateChartCamera(now);
  if (!isReducedPerformanceMode()) {
    updateFloatingChartLabelScale();
  }
  updatePriceCalloutPresentation(now);
  if (!isReducedPerformanceMode()) {
    updateScannerPresentation(now);
  }

  if (!chartCinematic.zone.resolved || !chartCinematic.dom.zoneFill) {
    return;
  }

  const visual = zoneAnimationState(now);
  const pulseOpacity = 0.08 + visual.pulseWave * 0.12;
  const haloOpacity = 0.1 + visual.pulseWave * 0.16;
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
    chartCinematic.dom.zoneHalo.setAttribute("stroke-width", (5.4 + visual.pulseWave * 2.6).toFixed(2));
  }
  if (chartCinematic.dom.zoneBorder) {
    chartCinematic.dom.zoneBorder.setAttribute("stroke-opacity", (0.34 + visual.pulseWave * 0.18).toFixed(3));
    chartCinematic.dom.zoneBorder.setAttribute("stroke-width", (1.7 + visual.pulseWave * 0.5).toFixed(2));
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
    if (timestamp - chartCinematic.lastFrameAt < currentCinematicFrameMs()) {
      chartCinematic.rafId = window.requestAnimationFrame(tick);
      return;
    }
    chartCinematic.lastFrameAt = timestamp;
    updateChartSync(timestamp);
    syncChartPresentation(false, timestamp);
    if (
      chartCinematic.sync.active
      || chartCinematic.zone.visible
      || chartCinematic.zone.commentaryActive
      || chartCinematic.priceFocus.active
      || chartCinematic.camera.active
    ) {
      chartCinematic.rafId = window.requestAnimationFrame(tick);
    } else {
      chartCinematic.rafId = 0;
    }
  };
  chartCinematic.rafId = window.requestAnimationFrame(tick);
}

function renderPriceChart() {
  const priceTop = 430;
  const volumeTop = 450;
  const topPadding = 110;
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
  const mapY = (value) => priceTop - ((value - minPrice) / range) * (priceTop - topPadding);
  const mapX = (index) => chartLeft + index * candleSlot + candleSlot / 2;
  const activePattern = state.currentIntervalPattern;
  const reducedVisuals = isReducedPerformanceMode() || isMinimalPerformanceMode();
  const minimalVisuals = isMinimalPerformanceMode();
  chartCinematic.layout = {
    chartLeft,
    chartWidth,
    candleSlot,
    candleWidth,
    priceTop,
    priceTopPadding: topPadding,
    volumeTop,
    volumeHeight,
    minPrice,
    maxPrice,
    range,
    candles: state.candles,
    mapY,
    mapX,
  };
  const priceChartKey = [
    currentCoin().marketSymbol,
    currentInterval(),
    buildCandleSnapshotKey(state.candles),
    buildPatternAnalysisKey(activePattern),
  ].join("|");
  if (renderCache.priceChartKey === priceChartKey) {
    if (chartCinematic.zone.input) {
      chartCinematic.zone.resolved = resolveZoneInputToChartZone(chartCinematic.zone.input, chartCinematic.layout);
    } else if (!chartCinematic.sync.active) {
      chartCinematic.zone.resolved = null;
    }
    cacheChartCinematicDom();
    syncChartPresentation(false);
    return;
  }
  renderCache.priceChartKey = priceChartKey;

  let defs = reducedVisuals
    ? `
      <defs>
        <linearGradient id="chartAreaGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(255, 196, 92, 0.16)" />
          <stop offset="100%" stop-color="rgba(255, 196, 92, 0.01)" />
        </linearGradient>
        <linearGradient id="priceLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#ffcc74" />
          <stop offset="100%" stop-color="#ffe5a8" />
        </linearGradient>
        <linearGradient id="smaLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#4ee6ff" />
          <stop offset="100%" stop-color="#8ed8ff" />
        </linearGradient>
        <linearGradient id="volumeUp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(74, 255, 177, 0.62)" />
          <stop offset="100%" stop-color="rgba(74, 255, 177, 0.06)" />
        </linearGradient>
        <linearGradient id="volumeDown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(255, 116, 95, 0.62)" />
          <stop offset="100%" stop-color="rgba(255, 116, 95, 0.06)" />
        </linearGradient>
        <filter id="blueNeonGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur5" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur2" />
          <feMerge>
            <feMergeNode in="blur5" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="resistanceZoneFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(255, 99, 145, 0.18)" />
          <stop offset="100%" stop-color="rgba(255, 99, 145, 0.02)" />
        </linearGradient>
        <linearGradient id="supportZoneFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(111, 255, 181, 0.18)" />
          <stop offset="100%" stop-color="rgba(111, 255, 181, 0.02)" />
        </linearGradient>
        <filter id="zoneSoftBlur" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="zoneNeonGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4.4" result="zoneBlur" />
          <feMerge>
            <feMergeNode in="zoneBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="zoneEdgeGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="edgeBlur" />
          <feMerge>
            <feMergeNode in="edgeBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="zoneLabelGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="glassBlur" />
          <feMerge>
            <feMergeNode in="glassBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    `
    : `
      <defs>
        <linearGradient id="chartAreaGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(255, 196, 92, 0.24)" />
          <stop offset="100%" stop-color="rgba(255, 196, 92, 0)" />
        </linearGradient>
        <linearGradient id="priceLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#ffcc74" />
          <stop offset="100%" stop-color="#ffe5a8" />
        </linearGradient>
        <linearGradient id="smaLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#4ee6ff" />
          <stop offset="100%" stop-color="#8ed8ff" />
        </linearGradient>
        <linearGradient id="scannerGlowGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="rgba(0, 240, 255, 0)" />
          <stop offset="50%" stop-color="rgba(0, 240, 255, 0.22)" />
          <stop offset="100%" stop-color="rgba(0, 240, 255, 0)" />
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
        <filter id="blueNeonGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur5" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur2" />
          <feMerge>
            <feMergeNode in="blur5" />
            <feMergeNode in="blur2" />
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

  const gridRows = minimalVisuals ? 4 : 6;
  for (let row = 0; row < gridRows; row += 1) {
    const y = 40 + row * 65;
    cameraMarkup += `<line x1="${chartLeft}" y1="${y}" x2="${chartLeft + chartWidth}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />`;
  }
  cameraMarkup += `<g id="chart-static-levels-layer"></g>`;

  const closes = state.candles.map((candle) => candle.close);
  const areaPath = offsetSvgPath(
    buildAreaPath(closes, chartWidth, priceTop - topPadding, minPrice, maxPrice),
    chartLeft
  );
  cameraMarkup += `<g id="chart-zone-underlay"></g>`;
  if (!minimalVisuals) {
    cameraMarkup += `<path d="${areaPath}" fill="url(#chartAreaGlow)" opacity="0.85" />`;
  }

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

    if (!minimalVisuals) {
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
    }
  });

  const emaValues = calculateEMA(closes, 9);
  const emaPath = offsetSvgPath(
    linePath(emaValues, chartWidth, priceTop - topPadding, minPrice, maxPrice),
    chartLeft
  );
  const smaPoints = calculateSMA(closes, 20)
    .map((value, index) => (Number.isFinite(value) ? { x: mapX(index), y: mapY(value) } : null))
    .filter(Boolean);
  const smaPath = buildSmoothPath(smaPoints);
  cameraMarkup += `<path d="${emaPath}" fill="none" stroke="url(#priceLine)" stroke-width="${reducedVisuals ? "2.4" : "3.2"}" stroke-linecap="round" stroke-linejoin="round"${reducedVisuals ? "" : ' filter="url(#softGlow)"'} />`;
  if (smaPath) {
    cameraMarkup += `<path d="${smaPath}" fill="none" stroke="url(#smaLine)" stroke-width="${reducedVisuals ? "1.6" : "2"}" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"${reducedVisuals ? "" : ' filter="url(#blueNeonGlow)"'} />`;
  }
  cameraMarkup += `<g id="chart-candle-highlight-layer"></g>`;

  const activeSpan = activePattern?.span;
  const activeTrace = activePattern?.tracePoints || [];
  const activeGuides = activePattern?.guideLines || [];
  if (activeSpan && activeTrace.length) {
    const spanCandles = state.candles.slice(activeSpan.startIndex, activeSpan.endIndex + 1);
    const spanHigh = Math.max(...spanCandles.map((candle) => candle.high));
    const spanLow = Math.min(...spanCandles.map((candle) => candle.low));
    const spanX = chartLeft + activeSpan.startIndex * candleSlot;
    const spanWidth = Math.max((activeSpan.endIndex - activeSpan.startIndex + 1) * candleSlot, 28);
    const centeredSignatureTrace = buildCenteredPatternSignaturePoints(activePattern, spanX, spanWidth, spanLow, spanHigh, mapY);
    const tracePoints = centeredSignatureTrace.length
      ? centeredSignatureTrace
      : buildActivePatternTracePoints(spanCandles, activePattern, chartLeft, candleSlot, mapY);
    const tracePath = centeredSignatureTrace.length
      ? buildSmoothPath(tracePoints)
      : buildPatternOverlayPath(tracePoints, activePattern.pattern);
    const guidePaths = activeGuides.map((guide) => {
      const guidePoints = normalizeOverlayPoints((guide.points || []).map((point) => ({
        x: chartLeft + point.index * candleSlot + candleSlot / 2,
        y: mapY(point.price),
      })));
      return guidePoints.length > 2
        ? buildPatternOverlayPath(guidePoints, activePattern.pattern)
        : buildPolylinePath(guidePoints);
    }).filter(Boolean);
    const emphasizedGuideTypes = [
      "triangle",
      "wedge",
      "channel",
      "broadeningWedge",
      "pennant",
      "coil",
      "flag",
      "flatBreak",
      "retest",
      "continuationBox",
      "sweep",
      "shelf",
      "baseBreakout",
      "headShoulders",
      "doubleSwing",
      "tripleSwing",
    ];
    const emphasizeGuides = guidePaths.length >= 1
      && emphasizedGuideTypes.includes(activePattern?.pattern?.detectorType);
    const guideMarkup = guidePaths
      .map((guidePath) => {
        if (reducedVisuals) {
          return `
            <path
              d="${guidePath}"
              fill="none"
              stroke="rgba(255, 118, 154, 0.72)"
              stroke-width="${minimalVisuals ? "1.8" : "2.2"}"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-dasharray="${minimalVisuals ? "none" : "8 8"}"
              vector-effect="non-scaling-stroke"
            />
          `;
        }
        if (emphasizeGuides) {
          return `
            <path d="${guidePath}" fill="none" stroke="rgba(255, 70, 111, 0.18)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" filter="url(#patternNeonGlow)" vector-effect="non-scaling-stroke" />
            <path d="${guidePath}" fill="none" stroke="rgba(255, 74, 118, 0.32)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" filter="url(#patternNeonGlow)" vector-effect="non-scaling-stroke" />
            <path
              d="${guidePath}"
              fill="none"
              stroke="#ff4f77"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
              filter="url(#patternNeonGlow)"
              vector-effect="non-scaling-stroke"
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
            vector-effect="non-scaling-stroke"
          />
        `;
      })
      .join("");
    const labelY = Math.max(32, mapY(spanHigh) - 16);
    const labelText = `${activePattern.pattern?.name || activePattern.title} · ${activeSpan.timeLabel}`;
    const labelWidth = Math.min(404, Math.max(214, labelText.length * 7.1));
    const labelX = clamp(spanX, chartLeft + 8, chartLeft + chartWidth - labelWidth - 8);
    const boxTopY = mapY(spanHigh) - 12;
    const timePanelY = clamp(boxTopY - 20, topPadding + 28, priceTop - 26);
    const timePanelX = spanX + spanWidth / 2;

    cameraMarkup += reducedVisuals
      ? `
        ${guideMarkup}
        <path d="${tracePath}" fill="none" stroke="rgba(255, 92, 130, 0.16)" stroke-width="${minimalVisuals ? "5.5" : "8"}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
        <path d="${tracePath}" fill="none" stroke="#ff6e92" stroke-width="${minimalVisuals ? "2.2" : "3"}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
        <circle cx="${tracePoints[tracePoints.length - 1].x}" cy="${tracePoints[tracePoints.length - 1].y}" r="${minimalVisuals ? "3.4" : "4.2"}" fill="#ffe0e7" />
        <g class="chart-pattern-bounding-box" opacity="0.72">
          <rect x="${spanX}" y="${mapY(spanHigh) - 12}" width="${spanWidth}" height="${Math.abs(mapY(spanHigh) - mapY(spanLow)) + 24}" rx="8" fill="rgba(0, 240, 255, 0.03)" stroke="rgba(0, 240, 255, 0.22)" stroke-width="1.2" pointer-events="none" />
        </g>
        ${minimalVisuals ? "" : `
          <g id="chart-pattern-time-panel" data-anchor-x="${timePanelX.toFixed(2)}" data-anchor-y="${timePanelY.toFixed(2)}" transform="translate(${timePanelX.toFixed(2)} ${timePanelY.toFixed(2)})">
            <rect x="-54" y="-13" width="108" height="26" rx="8" fill="rgba(0, 240, 255, 0.08)" stroke="rgba(0, 240, 255, 0.24)" stroke-width="1" />
            <text x="0" y="1" dominant-baseline="middle" text-anchor="middle" font-size="12" font-family="var(--font-mono)" font-weight="700" fill="var(--cyan-bright)" style="letter-spacing:1px;">${activeSpan.timeLabel.replace(" -> ", "→")}</text>
          </g>
        `}
      `
      : `
        ${guideMarkup}
        <path d="${tracePath}" fill="none" stroke="${emphasizeGuides ? "rgba(255, 70, 111, 0.08)" : "rgba(255, 70, 111, 0.18)"}" stroke-width="${emphasizeGuides ? "10" : "20"}" stroke-linecap="round" stroke-linejoin="round" filter="url(#patternNeonGlow)" vector-effect="non-scaling-stroke" />
        <path d="${tracePath}" fill="none" stroke="${emphasizeGuides ? "rgba(255, 74, 118, 0.14)" : "rgba(255, 74, 118, 0.34)"}" stroke-width="${emphasizeGuides ? "5" : "10"}" stroke-linecap="round" stroke-linejoin="round" filter="url(#patternNeonGlow)" vector-effect="non-scaling-stroke" />
        <path
          d="${tracePath}"
          fill="none"
          stroke="#ff4f77"
          stroke-width="${emphasizeGuides ? "2.8" : "5.6"}"
          stroke-linecap="round"
          stroke-linejoin="round"
          filter="url(#patternNeonGlow)"
          vector-effect="non-scaling-stroke"
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
          vector-effect="non-scaling-stroke"
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
        <g class="chart-pattern-bounding-box" opacity="0.84">
          <rect x="${spanX}" y="${mapY(spanHigh) - 12}" width="${spanWidth}" height="${Math.abs(mapY(spanHigh) - mapY(spanLow)) + 24}" rx="8" fill="rgba(0, 240, 255, 0.05)" stroke="rgba(0, 240, 255, 0.14)" stroke-width="1.2" pointer-events="none" />
          <rect x="${spanX}" y="${mapY(spanHigh) - 12}" width="${spanWidth}" height="${Math.abs(mapY(spanHigh) - mapY(spanLow)) + 24}" rx="8" fill="none" stroke="var(--cyan-bright)" stroke-width="2.8" stroke-dasharray="10 6" pointer-events="none" filter="url(#blueNeonGlow)" vector-effect="non-scaling-stroke">
             <animate attributeName="stroke-dashoffset" from="0" to="16" dur="0.8s" repeatCount="indefinite" />
             <animate attributeName="opacity" values="0.75;1;0.75" dur="1.2s" repeatCount="indefinite" />
          </rect>
        </g>
        <g id="chart-pattern-time-panel" data-anchor-x="${timePanelX.toFixed(2)}" data-anchor-y="${timePanelY.toFixed(2)}" transform="translate(${timePanelX.toFixed(2)} ${timePanelY.toFixed(2)})">
          <path d="M-64,-16 L58,-16 L64,-10 L64,10 L58,16 L-58,16 L-64,10 Z" fill="rgba(0, 240, 255, 0.14)" stroke="rgba(0, 240, 255, 0.44)" stroke-width="0.8" />
          <path d="M-60,-16 L54,-16 L60,-10 L60,10 L54,16 L-54,16 L-60,10 Z" fill="none" stroke="var(--cyan-bright)" stroke-width="2.6" filter="url(#blueNeonGlow)" />
          <path d="M-64,-6 L-64,-10 L-60,-16 M60,-16 L64,-10 L64,-6 M64,6 L64,10 L60,16 M-60,16 L-64,10 L-64,6" fill="none" stroke="var(--cyan-bright)" stroke-width="1.2" opacity="0.8" />
          ${Array.from({ length: 22 }).map((_, i) => `
            <line x1="${(-52 + i * 5).toFixed(1)}" y1="11" x2="${(-52 + i * 5).toFixed(1)}" y2="14" stroke="var(--cyan-bright)" stroke-width="1.4" opacity="0.55" />
          `).join("")}
          <text x="0" y="-1.5" dominant-baseline="middle" text-anchor="middle" font-size="13" font-family="var(--font-mono)" font-weight="800" fill="var(--cyan-bright)" filter="url(#blueNeonGlow)" style="letter-spacing:1.5px;">${activeSpan.timeLabel.replace(" -> ", "→")}</text>
        </g>
      `;
  }

  cameraMarkup += `<g id="chart-price-callout-layer"></g>`;
  cameraMarkup += `<g id="chart-zone-overlay"></g>`;
  const lastClose = last(closes);
  dom.priceChart.innerHTML = `
    ${defs}
    <g id="chart-camera-root">
      ${cameraMarkup}
    </g>
    ${reducedVisuals ? "" : `
      <g id="chart-scanner-group">
        <line id="chart-scanner-line" x1="0" y1="${priceTop - 20}" x2="0" y2="${volumeTop + volumeHeight + 20}" stroke="rgba(0, 240, 255, 0.48)" stroke-width="2.8" filter="url(#blueNeonGlow)" opacity="0" />
        <rect id="chart-scanner-glow" x="-20" y="${priceTop - 20}" width="40" height="${volumeTop + volumeHeight - priceTop + 54}" fill="url(#scannerGlowGradient)" opacity="0" />
      </g>
    `}
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
  if (!svgElement || !isElementVisible(svgElement)) {
    return;
  }
  const renderKey = [
    options.gradientId,
    options.min,
    options.max,
    values.length,
    values[0] ?? 0,
    values[values.length - 1] ?? 0,
    values.slice(-6).map((value) => Number(value || 0).toFixed(4)).join(":"),
  ].join("|");
  if (svgElement.dataset.renderKey === renderKey) {
    return;
  }
  svgElement.dataset.renderKey = renderKey;
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
  if (!dom.macdChart || !isElementVisible(dom.macdChart)) {
    return;
  }
  const macdKey = [
    state.macdHistogram.length,
    state.macdHistogram.slice(-6).map((value) => Number(value || 0).toFixed(4)).join(":"),
    state.macdLine.slice(-6).map((value) => Number(value || 0).toFixed(4)).join(":"),
    state.macdSignal.slice(-6).map((value) => Number(value || 0).toFixed(4)).join(":"),
  ].join("|");
  if (dom.macdChart.dataset.renderKey === macdKey) {
    return;
  }
  dom.macdChart.dataset.renderKey = macdKey;
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

  if (isMinimalPerformanceMode()) {
    return `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="${reference?.referenceTitle || "Pattern"} reference schematic">
        <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="rgba(7, 9, 14, 0.5)" />
        ${[0.25, 0.5, 0.75].map((step) => `<line x1="${padding}" y1="${padding + step * (height - padding * 2)}" x2="${width - padding}" y2="${padding + step * (height - padding * 2)}" stroke="rgba(255,255,255,0.05)" />`).join("")}
        ${guideMarkup}
        <path d="${mainPath}" fill="none" stroke="${directionColor}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  }

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

  if (isMinimalPerformanceMode()) {
    return `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="${pattern.name} live preview">
        <rect x="0" y="0" width="${width}" height="${height}" rx="14" fill="rgba(8, 11, 17, 0.88)" />
        ${[0.33, 0.66].map((step) => `<line x1="${paddingX}" y1="${(paddingY + chartHeight * step).toFixed(2)}" x2="${width - paddingX}" y2="${(paddingY + chartHeight * step).toFixed(2)}" stroke="rgba(255,255,255,0.04)" />`).join("")}
        ${candlesMarkup}
        <path d="${tracePath}" fill="none" stroke="${palette.glowEnd}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  }

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
  const patternListKey = chartAnalysis?.patternId
    ? [currentInterval(), buildPatternAnalysisKey(chartAnalysis)].join("|")
    : `empty:${currentInterval()}`;
  if (renderCache.patternListKey === patternListKey) {
    return;
  }
  renderCache.patternListKey = patternListKey;

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
  const referenceKey = reference
    ? [referenceId, reference.referenceTitle || "", reference.referenceDirection || ""].join("|")
    : `empty:${currentInterval()}`;
  if (renderCache.referenceKey === referenceKey) {
    return;
  }
  renderCache.referenceKey = referenceKey;

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
    <div class="reference-figure">
      <div class="reference-figure-head">
        <strong class="reference-title">${reference.referenceTitle}</strong>
        <span class="reference-direction ${directionClass}">${reference.referenceDirection}</span>
      </div>
      ${buildReferenceIllustration(reference)}
    </div>
    <p class="reference-description">${reference.referenceDescription}</p>
  `;
}

function renderTimeframeAlignment() {
  if (!dom.timeframeConfirmation || !isElementVisible(dom.timeframeConfirmation)) {
    return;
  }

  const alignment = state.topDownAnalysis?.timeframeAlignment || state.timeframeAlignment || [];
  const timeframeKey = [
    state.isMock ? "mock" : "live",
    state.alignmentLoading ? "loading" : "ready",
    buildTimeframeAlignmentKey(alignment),
  ].join("|");
  if (renderCache.timeframeAlignmentKey === timeframeKey) {
    return;
  }
  renderCache.timeframeAlignmentKey = timeframeKey;

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
  if (!dom.tickerTrack || !isElementVisible(dom.tickerTrack)) {
    return;
  }
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
  const tickerKey = doubled.join("|");
  if (renderCache.tickerKey === tickerKey) {
    return;
  }
  renderCache.tickerKey = tickerKey;
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
  const nextIntervalLabel = meta.isLastStep
    ? `${nextCoin().symbol} 1 minute`
    : humanizeIntervalLabel(MULTI_TIMEFRAME_INTERVALS[state.currentIntervalIndex + 1], { lower: true });
  dom.intervalSwitchCopy.textContent = meta.isLastStep
    ? `Next coin ${nextCoin().symbol} starts in ${formatClock(meta.remainingInterval)}`
    : `Switching to ${nextIntervalLabel} in ${formatClock(meta.remainingInterval)}`;
  dom.slotProgress.style.width = `${(meta.slotProgress * 100).toFixed(2)}%`;
  const switchboardKey = [
    state.currentIntervalIndex,
    state.isMock ? "mock" : "live",
    state.alignmentLoading ? "loading" : "ready",
    buildTimeframeAlignmentKey(state.topDownAnalysis?.timeframeAlignment || []),
  ].join("|");
  if (renderCache.intervalSwitchboardKey === switchboardKey) {
    return;
  }
  renderCache.intervalSwitchboardKey = switchboardKey;

  dom.intervalSwitchboard.innerHTML = MULTI_TIMEFRAME_INTERVALS.map((interval, index) => {
    const statusClass = index < state.currentIntervalIndex ? "done" : index === state.currentIntervalIndex ? "active" : "";
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

function renderFastHud() {
  const currentPrice = state.liveTicker?.lastPrice ?? last(state.candles)?.close ?? 0;
  const currentChange = state.liveTicker?.changePercent ?? percentageMove(state.candles[0]?.open, currentPrice) * 100;

  if (dom.currentPrice) {
    dom.currentPrice.textContent = formatPrice(currentPrice);
  }
  if (dom.currentChange) {
    dom.currentChange.textContent = formatChange(currentChange);
    dom.currentChange.style.color = currentChange >= 0 ? "var(--green)" : "var(--red)";
  }
}

function renderRuntimeHud() {
  const cycleMeta = intervalCycleMeta();
  if (dom.signalPhase) {
    dom.signalPhase.textContent = cycleMeta.isLastStep
      ? `${currentInterval()} · next ${nextCoin().symbol} in ${formatClock(cycleMeta.remainingInterval)}`
      : `${currentInterval()} -> ${cycleMeta.nextLabel} in ${formatClock(cycleMeta.remainingInterval)}`;
  }
  renderIntervalBanner();
  renderNewsPanel();
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
  renderUpcomingCoinQueue();
  if (dom.currentPriceCoinLogo) {
    if (coin.logoUrl) {
      dom.currentPriceCoinLogo.src = coin.logoUrl;
      dom.currentPriceCoinLogo.alt = `${coin.name} logo`;
      dom.currentPriceCoinLogo.setAttribute("aria-hidden", "false");
    } else {
      dom.currentPriceCoinLogo.removeAttribute("src");
      dom.currentPriceCoinLogo.alt = "";
      dom.currentPriceCoinLogo.setAttribute("aria-hidden", "true");
    }
  }
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

function render(mode = "full") {
  const startedAt = currentAnimationTime();
  if (shouldFreezeUnderlyingScene()) {
    renderIntermissionOverlay();
    return;
  }
  if (!state.candles.length) {
    renderIntermissionOverlay();
    return;
  }

  const renderMode = mode || "full";
  if (renderMode === "fast") {
    renderFastHud();
    return;
  }

  if (renderMode === "visual") {
    renderFastHud();
    renderPriceChart();
    trackRenderPressure(renderMode, currentAnimationTime() - startedAt);
    return;
  }

  renderText();
  renderIntervalBanner();
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

  renderTimeframeAlignment();
  renderPatternList();
  renderReferenceCard();
  renderNewsPanel();
  renderTicker();
  observeLiveCommentary();
  if (!voiceDirector.warmupQueued && hasAnyCommentaryProvider() && state.currentIntervalIndex === 0) {
    maybeQueueAmbientCommentary(true);
  } else if (hasAnyCommentaryProvider()) {
    maybeQueueAmbientCommentary(false);
  }
  updateVoiceControls();
  trackRenderPressure(renderMode, currentAnimationTime() - startedAt);
}

function scheduleVisualRender() {
  if (liveRenderScheduler.visualQueued || shouldFreezeUnderlyingScene() || !state.candles.length) {
    return;
  }

  liveRenderScheduler.visualQueued = true;
  const delayMs = Math.max(0, currentVisualFrameMs() - (Date.now() - liveRenderScheduler.lastVisualRenderAt));
  const flushVisualRender = () => {
    liveRenderScheduler.visualTimerId = 0;
    liveRenderScheduler.visualFrameId = requestAnimationFrame(() => {
      liveRenderScheduler.visualFrameId = 0;
      liveRenderScheduler.visualQueued = false;
      liveRenderScheduler.lastVisualRenderAt = Date.now();
      render("visual");
    });
  };

  if (delayMs > 0) {
    liveRenderScheduler.visualTimerId = setTimeout(flushVisualRender, delayMs);
  } else {
    flushVisualRender();
  }
}

function scheduleHeavyRefresh(options = {}) {
  const { coin = currentCoin(), force = false } = options;
  if (!coin?.marketSymbol || state.isMock || isLaunchScreenActive()) {
    return;
  }

  const now = Date.now();
  const isDue = force || !liveRenderScheduler.lastHeavyRequestedAt || now - liveRenderScheduler.lastHeavyRequestedAt >= currentHeavyRefreshMs();
  if (!isDue) {
    return;
  }

  if (liveRenderScheduler.heavyInFlight) {
    liveRenderScheduler.heavyQueued = true;
    liveRenderScheduler.queuedForce = liveRenderScheduler.queuedForce || force;
    return;
  }

  liveRenderScheduler.heavyInFlight = true;
  liveRenderScheduler.lastHeavyRequestedAt = now;
  refreshTopDownAnalysis(coin)
    .catch(() => {})
    .finally(() => {
      liveRenderScheduler.heavyInFlight = false;
      liveRenderScheduler.lastHeavyCompletedAt = Date.now();
      if (liveRenderScheduler.heavyQueued && coin.marketSymbol === currentCoin().marketSymbol) {
        const queuedForce = liveRenderScheduler.queuedForce;
        liveRenderScheduler.heavyQueued = false;
        liveRenderScheduler.queuedForce = false;
        scheduleHeavyRefresh({
          coin: currentCoin(),
          force: queuedForce,
        });
      } else {
        liveRenderScheduler.heavyQueued = false;
        liveRenderScheduler.queuedForce = false;
      }
    });
}

async function init() {
  if (typeof window !== "undefined" && window.obsstudio) {
    setPerformanceMode(PERFORMANCE_MODE.MINIMAL);
  } else {
    applyPerformanceMode();
  }
  updateCountdown();
  await loadDetectorEngine().catch(() => {});
  await ensureAnalysisWorker().catch(() => {});
  await loadIntermissionEngine().catch(() => {});
  await initVoiceDirector().catch(() => {});
  initFooterControls();
  ensureChartCinematicLoop();
  refreshMarketSnapshots().catch(() => {});
  refreshNewsPanel(true).catch(() => {});
  setInterval(() => {
    maybeRotateCoin();
    maybeRotateTimeframe();
    maybeRotateNewsPanel();
    updateCountdown();
    if (state.candles.length && !shouldFreezeUnderlyingScene()) {
      renderRuntimeHud();
    }
    if (state.intermission.active && state.intermission.phase === "opening") {
      renderIntermissionOverlay();
    }
    maybeQueueSubscribePrompt();
  }, 1000);
  setInterval(() => {
    refreshMarketSnapshots().catch(() => {});
  }, 60000);
  setInterval(() => {
    refreshNewsPanel(false).catch(() => {});
  }, 30000);
  await activateCoin(0);
  setTimeout(() => {
    if (!isLaunchScreenActive() && !isIntermissionActive() && voiceDirector.audioUnlocked) {
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
    return Promise.all([refreshVoiceAssignments(), refreshVoiceCatalog(), refreshPodcastCatalog()]);
  },
  getVoiceStatus() {
    return {
      serviceReady: voiceDirector.serviceReady,
      castReady: voiceDirector.castReady,
      podcastReady: voiceDirector.podcastReady,
      podcastConfig: voiceDirector.podcastConfig,
      voices: voiceDirector.voiceStatus,
      assignments: voiceDirector.voiceAssignments,
      audioPlaybackAllowed: voiceDirector.audioPlaybackAllowed,
    };
  },
  testVoice() {
    if (!voiceDirector.audioUnlocked || voiceDirector.pendingAutoStart || !voiceDirector.audioPlaybackAllowed) {
      unlockVoicePlayback(true).catch(() => {});
      return false;
    }
    interruptVoicePlayback();
    if (voiceDirector.audio) {
      voiceDirector.audio.muted = false;
      voiceDirector.audio.volume = AUDIO_MIX.commentaryVolume;
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

window.addEventListener("resize", () => {
  if (state.intermission.active) {
    scheduleIntermissionStageFit();
  }
});

init();
