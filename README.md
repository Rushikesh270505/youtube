# Crypto Live Stream Overlay

OBS-ready crypto overlay for a single rotating YouTube live stream. The current build combines:

- live Binance candles and ticker data
- a 68-pattern dedicated detector registry
- top-down `4h -> 1h -> 30m -> 15m -> 5m -> 1m` analysis
- sliding-door intermissions between coins
- three-host local AI-style commentary with offline TTS
- a headline segment before the next coin opens

## Runtime

The overlay now runs from a small FastAPI server instead of `python -m http.server`, so the same local URL serves:

- the OBS browser-source frontend
- the `Strategy Lab` backtest website
- voice status APIs
- rendered local audio clips

Start it from this folder:

```bash
python3 server.py
```

Then open:

```text
http://127.0.0.1:4173
```

Strategy website:

```text
http://127.0.0.1:4173/strategy-lab.html
```

## Voice Commentary

The commentary layer uses three local host packs:

- `neutral_analyst`
- `high_energy_host`
- `calm_educator`

Voice config lives in [voice_packs/hosts.json](/Users/rushikeshkatari/Desktop/youtube/voice_packs/hosts.json).

Playback order:

1. light live commentary during major pattern / timeframe changes
2. three-host roundtable after each full 6-timeframe cycle
3. spoken `Top 3 Crypto Headlines`
4. doors reopen and the next coin starts

### TTS engine

- preferred engine: local `Piper`
- current fallback on macOS: system `say` voices

If Piper models are not installed yet, the app still works with local `say` fallback. Large Piper models should go under `voice_assets/` and are gitignored.

## Local Podcast Engine

There is now a separate multi-speaker podcast API for richer analyst-style commentary using your own local voice packs.

Endpoints:

- `GET /api/podcast/config`
- `POST /api/podcast/render`
- `GET /api/podcast/audio/{session_id}/{filename}`

Voice source:

- preferred: your own local `Piper` models in `voice_assets/`
- fallback: local macOS `say` voices while you are still preparing custom packs

Default podcast cast mapping:

- `high_energy_host` -> Analyst 1
- `neutral_analyst` -> Analyst 2
- `calm_educator` -> Narrator

To make your own voice packs, replace the model paths in [voice_packs/hosts.json](/Users/rushikeshkatari/Desktop/youtube/voice_packs/hosts.json) and drop your local models under `voice_assets/`.

What `/api/podcast/render` returns:

- structured multi-speaker script
- line-by-line timestamped transcript
- per-clip audio URLs
- merged podcast audio URL when clip formats match

The script generator follows the stream spec:

- 2 analysts + 1 narrator using your local cast
- 4-turn analysis per timeframe
- final female summary
- news read + analyst reactions
- cautious market language
- SSML-style breaks and emphasis markers in the generated lines

## Local API

- `GET /api/health`
- `GET /api/voices`
- `POST /api/commentary/render`
- `GET /api/strategy-lab/report`
- `POST /api/strategy-lab/run`
- `GET /api/strategy-lab/trade/{trade_id}`
- `GET /api/audio/{session_id}/{clip_id}.wav`

## OBS Setup

Use a Browser Source in OBS with:

- URL: `http://127.0.0.1:4173`
- Width: `1920`
- Height: `1080`
- FPS: `30`

If you want audio directly from the browser source, enable OBS audio for that source.

## Project Files

- [app.js](/Users/rushikeshkatari/Desktop/youtube/app.js): frontend state, live Binance rendering, intermission flow, voice director
- [detectors.mjs](/Users/rushikeshkatari/Desktop/youtube/detectors.mjs): dedicated 68-pattern detector registry
- [intermission-utils.mjs](/Users/rushikeshkatari/Desktop/youtube/intermission-utils.mjs): cross-timeframe vote aggregation and subtitle summaries
- [server.py](/Users/rushikeshkatari/Desktop/youtube/server.py): FastAPI app and static hosting
- [strategy-lab.html](/Users/rushikeshkatari/Desktop/youtube/strategy-lab.html): BTC strategy website shell
- [strategy-lab.js](/Users/rushikeshkatari/Desktop/youtube/strategy-lab.js): strategy leaderboard, trade-call feed, annotated chart UI
- [strategy-lab.css](/Users/rushikeshkatari/Desktop/youtube/strategy-lab.css): dedicated strategy lab styling
- [voice_service.py](/Users/rushikeshkatari/Desktop/youtube/voice_service.py): voice-pack loading, local audio rendering, fallback logic
- [podcast_voice_engine.py](/Users/rushikeshkatari/Desktop/youtube/podcast_voice_engine.py): multi-speaker podcast script generation and local podcast rendering
- [voice_packs/hosts.json](/Users/rushikeshkatari/Desktop/youtube/voice_packs/hosts.json): host manifests

## Quick Tweaks

- coin rotation timing: edit `rotationMinutes` in [app.js](/Users/rushikeshkatari/Desktop/youtube/app.js)
- coin list: edit `CONFIG.coins` in [app.js](/Users/rushikeshkatari/Desktop/youtube/app.js)
- voice personalities / colors / fallback voices: edit [voice_packs/hosts.json](/Users/rushikeshkatari/Desktop/youtube/voice_packs/hosts.json)
- podcast cast role mapping: edit `podcast_role` in [voice_packs/hosts.json](/Users/rushikeshkatari/Desktop/youtube/voice_packs/hosts.json)
- visuals and overlay layout: edit [styles.css](/Users/rushikeshkatari/Desktop/youtube/styles.css)

## Validation

Useful local checks:

```bash
node --check app.js
node --check strategy-lab.js
python3 -m py_compile server.py voice_service.py
python3 -m py_compile backtest/*.py
python3 -m unittest tests/test_backtest_engine.py
python3 -m unittest tests/test_voice_service.py
node --test tests/intermission-utils.test.mjs
node --test tests/detectors.test.mjs
```
