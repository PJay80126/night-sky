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
- **Tab load guards**: `State.planetsLoaded`, `State.forecastLoaded`, `State.moonmapLoaded` etc. prevent redundant work on re-tab. The Map tab uses `initMoonMap()` (public wrapper in `moonmap.js`) which no-ops if already loaded; `main.js#switchTab` calls it on activation and also schedules a `resizeMoonMap()` on the next frame so the WebGL canvas lays out correctly after the panel becomes visible. `switchTab` also redraws the Planets altitude chart and the three Forecast charts on re-activation — the debounced resize handler runs even while a panel is hidden and sizes its canvases against a 0-width layout, so returning to the tab must redraw.
- **Astronomy calculations**: Always create a fresh observer — `new Astronomy.Observer(lat, lon, 0)`. Use `Astronomy.SearchRiseSet`, `Astronomy.SearchAltitude`, `Astronomy.SearchMoonPhase`, etc.
- **Observing-night anchor**: `getObservingDate()` in `state.js` returns midnight of the current *observing night* — before 06:00 local it rolls back a day, so a session in progress at 1 AM keeps tonight's windows instead of flipping to the next night (same cutoff convention as `getForecastNightHours`). Planets (`renderPlanets`, `drawAltitudeGraph` twilight lines) and Messier (`_computeMessier`, `_renderMessierResults`) anchor on it; anything new that computes "tonight" from the wall clock should too. The Moon tab's Q-Day deliberately stays on the calendar date (RASC convention).
- **Q-Day**: Days since First Quarter (RASC lunar observing standard) — implemented in `moon.js`
- **Canvas charts**: Planet altitude and forecast charts are drawn directly on `<canvas>` — no chart library. The altitude chart overlays tonight's cloud cover (`State.cloudNightHours`, set by the forecast render) as a dashed line via `_cloudOverlayPoints()` — 0–100% mapped to the full graph height, style matched to the `.cloud-legend-dot` legend swatch.
- **Moon Map**: Top-level tab (`#panel-moonmap` in `index.html`, icon 🗺). Lazy-initialized via `initMoonMap()` the first time the tab is activated. WebGL 1.0 fragment shader displays the WAC orthographic texture (`WAC_GLOBAL_O000N0000_032P.jpg`). The WAC image is itself an orthographic projection centered at (0°N, 0°E). The shader does an inverse orthographic from screen → selenographic lat/lon centered on the current sub-Earth point (libration), then a forward orthographic back to WAC-image UVs — so features shift with libration but stay aligned with the texture. A 2D canvas overlay draws feature dots and labels using the same two-step projection (`_projectFeature`). The 0.85 BASE_SCALE factor must stay in sync across three places: shader zoom uniform, overlay `_projectFeature`, and `_clampPan`. Max zoom is 12× (buttons, wheel, and pinch). WebGL requires HTTP (not `file://`) due to CORS restrictions on `texImage2D`.
- **HiDPI / DPR**: Both the WebGL and 2D overlay canvas buffers are allocated at `cssW × devicePixelRatio` (capped at 3) while their CSS size stays at `cssW`. The 2D context carries a `setTransform(dpr, ...)` so overlay draw + hit-test code keeps using CSS-pixel coords (`_canvasSize`). Sizing is centralized in `_sizeCanvases(cssW)` — don't re-implement it elsewhere. Without DPR scaling the map was blurry on phones (3× DPR stretched each rendered pixel across a 3×3 device-pixel block).
- **Map fullscreen**: `mapToggleFullscreen()` toggles a `body.map-fs` class that pins `#moonMapView` to the viewport (`position: fixed; inset: 0; z-index: 1000`) and hides `.tab-bar` + `#nightModeToggle`. Pseudo-fullscreen only — the native Fullscreen API is avoided for iOS Safari consistency. Canvas size is picked by `_computeCssW()`: in fullscreen the 500px cap is lifted and `min(availW, availH - 80)` is used (80px toolbar reserve). Escape key also exits.
- **Lunar terminator**: Rendered in the fragment shader using uniforms `u_sunLat`/`u_sunLon` (subsolar selenographic point). `subsolarLon = (lib.elon - phase + 180) * DEG` (the +180 is critical — at new moon the Sun is opposite Earth), `subsolarLat = -lib.mlat * 0.30 * DEG`. Night side rendered at 2% brightness with 5° `smoothstep` penumbra.
- **Telescope view**: `u_flip` uniform (1.0 = eye, -1.0 = telescope) rotates the view 180° for refractor/SCT users. The overlay applies the same flip to feature positions. Toggled via the telescope button in `.map-controls`.
- **Cursor-anchored zoom**: Wheel zoom keeps the point under the cursor fixed; pinch zoom keeps the midpoint between the two fingers fixed. Implemented via `_zoomAt(newZoom, clipX, clipY)` + `_clientToClip()`. The +/- buttons still zoom around the canvas center by design (no cursor position available).
- **Mobile viewport**: `body` uses `min-height: 100dvh` (with `100vh` fallback) so the layout tracks the mobile browser's dynamic viewport as the URL bar shows/hides. This is required to keep the fixed-position `.tab-bar` flush against the visible bottom on first paint. Do not switch back to plain `100vh` — the tab bar rendered "half-height" on first load before this fix.
- **Catalogue data**: Embedded as `const` arrays/objects (PHOTO_DATA, MESSIER, METEOR_SHOWERS, etc.) — not fetched. `FEATURE_IMAGE_MAP` values and every `PHOTO_CAPTIONS` key must be `PHOTO_DATA` keys — the smoke test enforces this, so add all three together when adding a photo.
- **Sky events math**: conjunction separation uses `Astronomy.AngleBetween` on `GeoVector`s (never raw RA/Dec differences — those break across the RA 0h wrap and overstate separation off the equator), with `_minSepRuns()` collapsing each contiguous sub-2.5° stretch to its closest-approach sample. Elongation direction comes from the library's `el.visibility` ('morning'/'evening') — `el.elongation` is an unsigned angle and carries no direction.
- **Weather**: Open-Meteo API — free, no auth, returns JSON directly. Every Open-Meteo fetch (both `fetchForecast` attempts and `sw.js`'s `_nightlyOutlook`) passes `_fetchTimeoutOpts()` — a 15 s `AbortSignal.timeout`, guarded for browsers without it — so a stalled connection fails fast into the offline-cache path instead of hanging the spinner.
- **Forecast model selection**: `fetchForecast()` tries `gem_hrdps_continental` first (2.5 km Canadian high-res, the same model Astrospheric uses) with pressure-level variables at 250/500/850/1000 hPa — wind speed+direction, temperature, and geopotential height at all four levels, plus 500 hPa RH and surface CAPE. If the response lacks jet-stream data (`_hasPressureData()` returns false — happens outside the HRDPS domain or on model outage), it falls back to `gem_seamless` with surface variables only. The chosen model is stamped on the data as `_model` and surfaced in the forecast footer. Open-Meteo defaults all wind speeds to km/h across both surface and pressure levels — the Ri helpers convert to m/s internally; the CSC transparency helpers consume km/h directly.
- **Seeing scoring (Richardson Number)**: `computeSeeing()` uses bulk Richardson numbers `Ri = (g · Δθ · Δz) / (θ̄ · ΔU²)` computed across three HRDPS layer pairs — upper (250↔500 hPa), mid (500↔850 hPa), and boundary (850↔1000 hPa). Δθ uses potential temperature `θ = T·(P₀/P)^(R/cp)` so static stability is measured correctly; ΔU is the vector wind-difference magnitude (converting km/h→m/s and using direction at both levels); Δz comes from HRDPS geopotential heights so layer thicknesses are real rather than standard-atmosphere estimates. The badge reflects the *minimum* Ri across the column (weakest-link convention) and the subtext names any layers below the Miles-Howard turbulence threshold (`Ri < 0.25`). Ri is computed **per hour** for each layer pair, then summarized as the nightly *median Ri per layer* over the real nautical-twilight window (see Forecast night window below) — summarize-last, never summarize-first, because wind direction is circular (a sorted median of degree values near north is meaningless) and Ri is nonlinear in the shear term. The hourly-Ri median sort uses an explicit three-way comparator since zero-shear hours yield `Infinity`.
- **Seeing / Richardson-Number tunables**: Four knobs in the pipeline are interpretation rather than physics, and live in `computeSeeing()` / `_riBucket()` for easy adjustment: (1) bucket thresholds `1.0 / 0.5 / 0.25 / 0.1` — only `0.25` is physics (Miles-Howard), the other three are cosmetic granularity; (2) the layer-pair set `{250↔500, 500↔850, 850↔1000}` — adding a 300 or 700 hPa pair would refine the column at the cost of an API variable; (3) the min-Ri summary strategy — alternatives include altitude-weighted or count-of-turbulent-layers; (4) the bulk-vs-gradient Ri convention — `0.25` is strictly a *gradient*-Ri threshold but is empirically close for bulk Ri across these thicknesses.
- **Transparency scoring**: Unchanged Clear-Sky-Chart (Rahill/CMC) convention — `computeTransparency()` weights mid-atmos RH (500 hPa) 40%, max(low, mid) cloud 35%, surface dew-point spread 25%. Score buckets: ≥85 Excellent · ≥70 Good · ≥50 Fair · ≥30 Poor · else Very Poor.
- **Forecast night window**: `getForecastNightHours()` / `getTomorrowNightHours()` no longer use a fixed 18:00–06:00 clock window. They call the shared `getTwilightWindow(date, sunAltDeg)` helper in `state.js` (also backing `getNightWindow()` for Planets/Events at -18°, `_nauticalNight()` for Messier at -12°, and the planet visibility badge in `getVisibility()` at -12° — planets are bright enough for nautical twilight, so high-latitude summer doesn't mislabel them "No Dark Sky"; `getVisibility` also returns its `peakAlt`, which is what `renderPlanets` uses for altitude-graph membership so badge and graph never disagree. The 48 h temp/dew chart's night shading comes from `_twilightBands()` at -12° too) at nautical twilight (-12°), so "tonight" is the real dusk-to-dawn dark window at the observer's location and date. The Tonight's Outlook badge and all four Astronomy Conditions badges (Seeing, Transparency, Dew Risk, Precip. Chance) inherit this window since they share the same `nightHrs` array. Falls back to the old 18:00/06:00 default automatically at latitudes with no true nautical dark (e.g. high-latitude summer). The "Tonight's Outlook" card's displayed clock range comes from `nightHrs[0].time`/`nightHrs[last].time` (the actual hourly forecast points used), not the exact twilight instants from `getTwilightWindow()` — this keeps the label consistent with the medians shown in the same card, at the cost of rounding to the nearest hour.
- **Outlook cloud scoring**: `getOutlook()`'s five median-cloud-cover buckets (10/30/55/80, unchanged) get two checks layered on top of the base bucket: (1) a precipitation cross-check — if the night's **peak** precipitation probability (`forecastMax`, not the median — a median hides a short pre-dawn shower) is ≥50% while the cloud-based verdict would be Clear/Mostly Clear, the badge becomes "Unsettled 🌦" instead, since cloud cover and precip probability can disagree in the model output; (2) a variability check — if at least 25% of night hours are clear (≤30% cloud) *and* at least 25% are cloudy (≥70% cloud), the sub-text notes "Variable" conditions without changing the icon/label/color, which stay driven by the median. Null cloud hours are dropped from the cloud array (never coerced to 0%/clear); if every hour is null the badge reads "No Data".
- **Peak-vs-median statistics**: cloud cover uses the nightly *median* (an hour of cloud can be waited out); precipitation uses the nightly *peak* (an hour of rain cannot — the Precip. Chance badge and the Unsettled cross-check both read `forecastMax(nightHrs, 'precip_prob')`); dew risk uses the nightly *minimum* temp–dew spread via `getDewRisk(nightHrs)` (>5 °C Low · >3 Moderate · >1 High · ≤1 Very High), because RH peaks just before dawn where a whole-night median under-reports it — peak RH (<70/<85/<95) is the fallback when spread data is missing.
- **Best observing window**: `findBestWindow(nightHours)` in `forecast.js` — longest contiguous run of hours with cloud ≤ 40% AND precip probability < 40%, tie-broken by lower mean cloud; returned `end` is the last good hour + 1 h. Surfaced as the ✨ line on the Outlook card, a gold band on the tonight cloud chart (`drawCloudChart`'s optional third arg, persisted as `State.fcBestWin` for redraws), and reused verbatim by both notification paths. The 40/40 thresholds are interpretation knobs, not physics.
- **Planet detail rows**: `getPlanetDetails(name, when)` in `planets.js`, evaluated at transit — apparent magnitude + illuminated fraction from `Astronomy.Illumination`, angular size from `Astronomy.Equator(...).dist` (AU) and the embedded `PLANET_RADIUS_KM` equatorial radii, constellation from `Astronomy.Constellation(ra, dec)`. Illuminated fraction shown only for Mercury/Venus/Mars; the Moon row shows `% lit · constellation` only. Returns null on failure and the line is simply omitted.
- **Nightly heads-up notifications**: opt-in via the `#notifyCard` switch on the Forecast tab (`toggleNightlyNotify()` in `forecast.js`; card stays hidden without `Notification` + `serviceWorker` support). Two delivery paths share the `nightly-outlook` tag and a once-per-local-date guard: (1) a `periodicsync` handler in `sw.js` (installed Android PWA; gated to 12:00–22:00 local; lightweight cloud+precip fetch feeding the simplified `_swNightVerdict` — deliberate duplication, the worker can't reuse the page pipeline) and (2) `maybeNotifyTonight()` (17:00–22:00, fired from `refreshStaleData()`). Page↔worker state (`{enabled, lat, lon, nightStartIso, nightEndIso, lastNotified}`) lives in Cache Storage cache `night-sky-notify`, key `./notify-state` — **excluded from the activate-cleanup cache purge**; the worker re-anchors the stored twilight *clock times* to its own date. The once-per-day guard is cross-store: the page path checks both its localStorage stamp and the worker's `lastNotified` via `_alreadyNotified()` (syncing the former), since the background path can only write Cache Storage.
- **Forecast stat explainers**: the Tonight's Outlook and Astronomy Conditions cards each carry an ⓘ button (`_fcInfoBtn(panelId)` markup helper + shared `fcToggleInfo(id)` in `forecast.js`) that toggles an inline `.fc-info-panel` explainer via the `hidden` attribute, syncing `aria-expanded` on the button. Inline-expand by design — the image lightbox stays the app's only overlay.
- **Freshness / auto-refresh**: `refreshStaleData()` in `main.js` runs on `visibilitychange` (becoming visible) and a 5-minute interval. Three tiers: calendar-date rollover re-runs `renderMoon()`, clears every tab load guard (`State.planetsLoaded`, `State.forecastLoaded`, `_messierLoaded`, `_eventsLoaded`), and re-activates `State.activeTab`; forecast data older than 60 min (stamped as `State.forecastFetchedAt`) clears `State.forecastLoaded` and re-fetches if the tab is active; otherwise charts redraw every 5 min so NOW lines stay honest. The Moon Map needs no guard-clearing — its overlay recomputes Q-Day/libration on every `_render()`, so the chart-redraw tier's `resizeMoonMap()` covers it.
- **Forecast offline cache**: the last successful Open-Meteo response is stored as `nightsky.fcCache` (`{ts, lat, lon, data}`) in localStorage. On fetch failure, `_readForecastCache()` serves it when within 0.5° of the current observer, rendered by the shared `_renderForecastData(data, container, cachedAt)` behind an amber `.fc-cache-banner` ("Offline — showing cached forecast from …"). Age is displayed, not enforced. Cache writes are best-effort (quota errors swallowed).
- **Accessibility conventions**: the tab bar is a `role="tablist"` with `aria-selected` synced in `switchTab()` and Left/Right arrow-key navigation; filter chips carry `aria-pressed`; every chart canvas gets `role="img"` + a descriptive `aria-label`; the photo lightbox is a `role="dialog"` with a real close button, Escape-to-dismiss, and focus restore; expanders (forecast ⓘ panels, Messier Below-Horizon) are `<button>`s with `aria-expanded`. Follow these patterns for any new interactive UI.
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

The fetch handler uses cache-first strategy: cached response wins; network is fallback only. A cache miss with the network down resolves to a controlled response instead of rejecting — navigations get the cached `index.html` shell, everything else a 503 the page code treats as a normal HTTP failure.

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
| Geolocation | Browser API — works offline if OS has cached GPS fix | Manual lat/lon entry on the location-error card, persisted in localStorage |

### Rules for maintaining offline capability
1. **No new external resources** — never add `<script src="https://...">`, CDN fonts, remote images, or any fetch call outside Open-Meteo without discussing it first.
2. **Self-host everything** — fonts, icons, and any new static assets must live in the repo.
3. **ASSETS list must be complete** — every file the app uses must appear in the `ASSETS` array in `sw.js`. If you add a file, add it to `ASSETS` and bump the cache version.
4. **Fail gracefully on network errors** — any `fetch()` call must have a `catch` that shows a user-visible message, not a blank screen or silent failure.
5. **No external API calls from JS files other than `forecast.js`** — astronomy calculations stay local. Sole exception: `sw.js`'s `_nightlyOutlook()` makes a lightweight Open-Meteo fetch for the background notification path (same API, same host, no new external dependency).

## Important Notes
- No TypeScript, no linting config, no build step — keep changes consistent with the existing vanilla JS style
- **Testing**: run `node tests/smoke.js` — a dependency-free Node `vm` harness that loads the real production files with stubbed DOM/browser globals and drives the twilight, Q-Day, location-fallback, forecast-scoring, and cache logic. Keep it green, and extend it whenever changing scoring/twilight/Q-Day/location/cache behaviour. `tests/` is not an app asset (never add it to `sw.js` ASSETS).
- `astronomy.browser.js` is a third-party bundle — never edit it directly
- The app is mobile-first; test layout changes at narrow viewports
- Location fallback: when geolocation is denied/unavailable, `getLocation()` in `state.js` falls back to manually entered coordinates persisted as `nightsky.manualLat`/`nightsky.manualLon` (entered via the location-error card's `setManualLocation()` form; `State.locationSource` records `'gps'` vs `'manual'`). There is no hardcoded static fallback location. When a location update moves the observer more than 0.5° (the forecast-cache tolerance), `_handleLocationChange()` clears the planets/forecast/messier/events guards so stale altitudes and windows recompute on the next tab activation.
- Open-Meteo requires lat/lon (from geolocation or manual entry); the forecast tab shows the location-error card without either
