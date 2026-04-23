# Night Sky Observer — CLAUDE.md

## What This Is
A vanilla JavaScript PWA for amateur astronomers. No framework, no build step, no package.json. Focused on the RASC "Explore the Moon" observing program, with tabs for an interactive moon map, planets, sky events, Messier objects, and weather forecasting.

## Running the App
Serve the project directory over HTTP — `index.html` is the entry point. There is no build process; the app is ready to run as-is.

```bash
# Any static server works, e.g.:
npx serve .
python -m http.server 8080
```

Requires browser geolocation permission for accurate astronomy calculations.

## Architecture

### File Layout
```
index.html              # Markup — 6 tabs: Moon, Map, Planets, Events, Messier, Forecast
styles.css              # All CSS (~40KB), dark theme, CSS custom properties
sw.js                   # Service worker — cache-first, version tagged (e.g. night-sky-v43)
manifest.json           # PWA manifest
astronomy.browser.js    # Bundled Astronomy.js library (Don Cross) — do not modify
js/
  state.js              # Shared State object, geolocation, sun/night helpers
  main.js               # Tab switching, resize, SW registration, app init
  moon.js               # Lunar photo DB, Q-Day calculator, feature catalogue, lightbox
  moonmap.js            # WebGL moon globe — orthographic projection, feature dots, zoom/pan
  planets.js            # Planet rise/transit/set, altitude graphs, visibility badges
  events.js             # Moon phases, oppositions, meteor showers, eclipses
  messier.js            # 110-object Messier catalogue with filter chips
  forecast.js           # Open-Meteo API, cloud/temp charts, observing conditions
photos/                 # 35 high-res lunar region PNGs + WAC_GLOBAL_O000N0000_032P.jpg (moon globe texture)
fonts/                  # Cinzel + Crimson Pro WOFF2 (self-hosted)
icons/                  # PWA icons (192, 512)
```

### Key Conventions
- **Global state**: `State` object in `state.js` — observer location, chart refs, tab load guards
- **Tab load guards**: `State.planetsLoaded`, `State.forecastLoaded`, `State.moonmapLoaded` etc. prevent redundant work on re-tab. The Map tab uses `initMoonMap()` (public wrapper in `moonmap.js`) which no-ops if already loaded; `main.js#switchTab` calls it on activation and also schedules a `resizeMoonMap()` on the next frame so the WebGL canvas lays out correctly after the panel becomes visible.
- **Astronomy calculations**: Always create a fresh observer — `new Astronomy.Observer(lat, lon, 0)`. Use `Astronomy.SearchRiseSet`, `Astronomy.SearchAltitude`, `Astronomy.SearchMoonPhase`, etc.
- **Q-Day**: Days since First Quarter (RASC lunar observing standard) — implemented in `moon.js`
- **Canvas charts**: Planet altitude and forecast charts are drawn directly on `<canvas>` — no chart library
- **Moon Map**: Top-level tab (`#panel-moonmap` in `index.html`, icon 🗺). Lazy-initialized via `initMoonMap()` the first time the tab is activated. WebGL 1.0 fragment shader displays the WAC orthographic texture (`WAC_GLOBAL_O000N0000_032P.jpg`). The WAC image is itself an orthographic projection centered at (0°N, 0°E). The shader does an inverse orthographic from screen → selenographic lat/lon centered on the current sub-Earth point (libration), then a forward orthographic back to WAC-image UVs — so features shift with libration but stay aligned with the texture. A 2D canvas overlay draws feature dots and labels using the same two-step projection (`_projectFeature`). The 0.85 BASE_SCALE factor must stay in sync across three places: shader zoom uniform, overlay `_projectFeature`, and `_clampPan`. Max zoom is 12× (buttons, wheel, and pinch). WebGL requires HTTP (not `file://`) due to CORS restrictions on `texImage2D`.
- **HiDPI / DPR**: Both the WebGL and 2D overlay canvas buffers are allocated at `cssW × devicePixelRatio` (capped at 3) while their CSS size stays at `cssW`. The 2D context carries a `setTransform(dpr, ...)` so overlay draw + hit-test code keeps using CSS-pixel coords (`_canvasSize`). Sizing is centralized in `_sizeCanvases(cssW)` — don't re-implement it elsewhere. Without DPR scaling the map was blurry on phones (3× DPR stretched each rendered pixel across a 3×3 device-pixel block).
- **Map fullscreen**: `mapToggleFullscreen()` toggles a `body.map-fs` class that pins `#moonMapView` to the viewport (`position: fixed; inset: 0; z-index: 1000`) and hides `.tab-bar` + `#nightModeToggle`. Pseudo-fullscreen only — the native Fullscreen API is avoided for iOS Safari consistency. Canvas size is picked by `_computeCssW()`: in fullscreen the 500px cap is lifted and `min(availW, availH - 80)` is used (80px toolbar reserve). Escape key also exits.
- **Lunar terminator**: Rendered in the fragment shader using uniforms `u_sunLat`/`u_sunLon` (subsolar selenographic point). `subsolarLon = (lib.elon - phase + 180) * DEG` (the +180 is critical — at new moon the Sun is opposite Earth), `subsolarLat = -lib.mlat * 0.30 * DEG`. Night side rendered at 2% brightness with 5° `smoothstep` penumbra.
- **Telescope view**: `u_flip` uniform (1.0 = eye, -1.0 = telescope) rotates the view 180° for refractor/SCT users. The overlay applies the same flip to feature positions. Toggled via the telescope button in `.map-controls`.
- **Cursor-anchored zoom**: Wheel zoom keeps the point under the cursor fixed; pinch zoom keeps the midpoint between the two fingers fixed. Implemented via `_zoomAt(newZoom, clipX, clipY)` + `_clientToClip()`. The +/- buttons still zoom around the canvas center by design (no cursor position available).
- **Mobile viewport**: `body` uses `min-height: 100dvh` (with `100vh` fallback) so the layout tracks the mobile browser's dynamic viewport as the URL bar shows/hides. This is required to keep the fixed-position `.tab-bar` flush against the visible bottom on first paint. Do not switch back to plain `100vh` — the tab bar rendered "half-height" on first load before this fix.
- **Catalogue data**: Embedded as `const` arrays/objects (PHOTO_DATA, MESSIER, METEOR_SHOWERS, etc.) — not fetched
- **Weather**: Open-Meteo API — free, no auth, returns JSON directly
- **Forecast model selection**: `fetchForecast()` tries `gem_hrdps_continental` first (2.5 km Canadian high-res, the same model Astrospheric uses) with pressure-level variables at 250/500/850/1000 hPa — wind speed+direction, temperature, and geopotential height at all four levels, plus 500 hPa RH and surface CAPE. If the response lacks jet-stream data (`_hasPressureData()` returns false — happens outside the HRDPS domain or on model outage), it falls back to `gem_seamless` with surface variables only. The chosen model is stamped on the data as `_model` and surfaced in the forecast footer. Open-Meteo defaults all wind speeds to km/h across both surface and pressure levels — the Ri helpers convert to m/s internally; the CSC transparency helpers consume km/h directly.
- **Seeing scoring (Richardson Number)**: `computeSeeing()` uses bulk Richardson numbers `Ri = (g · Δθ · Δz) / (θ̄ · ΔU²)` computed across three HRDPS layer pairs — upper (250↔500 hPa), mid (500↔850 hPa), and boundary (850↔1000 hPa). Δθ uses potential temperature `θ = T·(P₀/P)^(R/cp)` so static stability is measured correctly; ΔU is the vector wind-difference magnitude (converting km/h→m/s and using direction at both levels); Δz comes from HRDPS geopotential heights so layer thicknesses are real rather than standard-atmosphere estimates. The badge reflects the *minimum* Ri across the column (weakest-link convention) and the subtext names any layers below the Miles-Howard turbulence threshold (`Ri < 0.25`). Badges use nightly medians over the 18:00–06:00 window to stay consistent with the other badges.
- **Seeing / Richardson-Number tunables**: Four knobs in the pipeline are interpretation rather than physics, and live in `computeSeeing()` / `_riBucket()` for easy adjustment: (1) bucket thresholds `1.0 / 0.5 / 0.25 / 0.1` — only `0.25` is physics (Miles-Howard), the other three are cosmetic granularity; (2) the layer-pair set `{250↔500, 500↔850, 850↔1000}` — adding a 300 or 700 hPa pair would refine the column at the cost of an API variable; (3) the min-Ri summary strategy — alternatives include altitude-weighted or count-of-turbulent-layers; (4) the bulk-vs-gradient Ri convention — `0.25` is strictly a *gradient*-Ri threshold but is empirically close for bulk Ri across these thicknesses.
- **Transparency scoring**: Unchanged Clear-Sky-Chart (Rahill/CMC) convention — `computeTransparency()` weights mid-atmos RH (500 hPa) 40%, max(low, mid) cloud 35%, surface dew-point spread 25%. Score buckets: ≥85 Excellent · ≥70 Good · ≥50 Fair · ≥30 Poor · else Very Poor.
- **Graceful scoring fallback**: When HRDPS pressure-level data is missing (outside the HRDPS domain or during a model outage), `computeSeeing` falls back to a surface-only estimate driven by `_scoreSurfaceWind` and labels itself `surface-only` in the subtext; `computeTransparency` renormalizes via `_weightedScore` over whichever factors are present. Never throw or show "Unknown" just because pressure-level data is missing.

### CSS Custom Properties (design tokens)
```css
--gold: #c9a84c      /* accents, headings */
--bg: #06090f        /* page background */
--surface: #0d1220   /* card/panel backgrounds */
--text: #ddd8cc      /* body text */
--good: #4caf7a      /* positive indicators */
```

## Service Worker
Cache version is hardcoded in `sw.js` as `CACHE = 'night-sky-v43'`. **Bump the version number whenever assets change** to force cache invalidation for existing installs. The assets list at the top of `sw.js` must include any new files added to the project.

The fetch handler uses cache-first strategy: cached response wins; network is fallback only.

## Offline Support

The app is designed to work fully offline for everything except live weather. Keep it that way.

### What works offline (keep it this way)
| Tab | Why offline-safe |
|-----|-----------------|
| Moon | All data embedded in `moon.js`; photos pre-cached in `sw.js` |
| Map | WebGL globe rendered from pre-cached WAC texture; feature catalogue embedded |
| Planets | All calculations done locally via `astronomy.browser.js` |
| Events | Phases, oppositions, showers all computed locally |
| Messier | Catalogue embedded in `messier.js` |

### What requires network
| Feature | Why | Graceful degradation |
|---------|-----|----------------------|
| Forecast tab | Open-Meteo API (`api.open-meteo.com`) | Show a clear offline/error message; do not leave a blank tab |
| Geolocation | Browser API — works offline if OS has cached GPS fix | Fallback coords defined in `state.js` |

### Rules for maintaining offline capability
1. **No new external resources** — never add `<script src="https://...">`, CDN fonts, remote images, or any fetch call outside Open-Meteo without discussing it first.
2. **Self-host everything** — fonts, icons, and any new static assets must live in the repo.
3. **ASSETS list must be complete** — every file the app uses must appear in the `ASSETS` array in `sw.js`. If you add a file, add it to `ASSETS` and bump the cache version.
4. **Fail gracefully on network errors** — any `fetch()` call must have a `catch` that shows a user-visible message, not a blank screen or silent failure.
5. **No external API calls from JS files other than `forecast.js`** — astronomy calculations stay local.

## Important Notes
- No TypeScript, no linting config, no test suite — keep changes consistent with the existing vanilla JS style
- `astronomy.browser.js` is a third-party bundle — never edit it directly
- The app is mobile-first; test layout changes at narrow viewports
- Location fallback (when geolocation is denied) defaults to a reasonable static location defined in `state.js`
- Open-Meteo requires lat/lon from geolocation; forecast tab won't load without location permission
