# Night Sky Observer — CLAUDE.md

## What This Is
A vanilla JavaScript PWA for amateur astronomers. No framework, no build step, no package.json. Focused on the RASC "Explore the Moon" observing program, with tabs for planets, sky events, Messier objects, and weather forecasting.

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
index.html              # Markup — 5 tabs: Moon, Planets, Events, Messier, Forecast
styles.css              # All CSS (~36KB), dark theme, CSS custom properties
sw.js                   # Service worker — cache-first, version tagged (e.g. night-sky-v32)
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
photos/                 # 24 high-res lunar region images + WAC_GLOBAL_O000N0000_032P.jpg (moon globe texture)
fonts/                  # Cinzel + Crimson Pro WOFF2 (self-hosted)
icons/                  # PWA icons (192, 512)
```

### Key Conventions
- **Global state**: `State` object in `state.js` — observer location, chart refs, tab load guards
- **Tab load guards**: `State.planetsLoaded`, `State.forecastLoaded` etc. prevent redundant API calls on re-tab
- **Astronomy calculations**: Always create a fresh observer — `new Astronomy.Observer(lat, lon, 0)`. Use `Astronomy.SearchRiseSet`, `Astronomy.SearchAltitude`, `Astronomy.SearchMoonPhase`, etc.
- **Q-Day**: Days since First Quarter (RASC lunar observing standard) — implemented in `moon.js`
- **Canvas charts**: Planet altitude and forecast charts are drawn directly on `<canvas>` — no chart library
- **Moon Map**: WebGL 1.0 fragment shader displays the WAC orthographic texture (`WAC_GLOBAL_O000N0000_032P.jpg`). The WAC image is itself an orthographic projection centered at (0°N, 0°E). The shader does an inverse orthographic from screen → selenographic lat/lon centered on the current sub-Earth point (libration), then a forward orthographic back to WAC-image UVs — so features shift with libration but stay aligned with the texture. A 2D canvas overlay draws feature dots and labels using the same two-step projection (`_projectFeature`). The 0.85 BASE_SCALE factor must stay in sync across three places: shader zoom uniform, overlay `_projectFeature`, and `_clampPan`. Max zoom is 12× (buttons, wheel, and pinch). WebGL requires HTTP (not `file://`) due to CORS restrictions on `texImage2D`.
- **Lunar terminator**: Rendered in the fragment shader using uniforms `u_sunLat`/`u_sunLon` (subsolar selenographic point). `subsolarLon = (lib.elon - phase + 180) * DEG` (the +180 is critical — at new moon the Sun is opposite Earth), `subsolarLat = -lib.mlat * 0.30 * DEG`. Night side rendered at 2% brightness with 5° `smoothstep` penumbra.
- **Telescope view**: `u_flip` uniform (1.0 = eye, -1.0 = telescope) rotates the view 180° for refractor/SCT users. The overlay applies the same flip to feature positions. Toggled via the telescope button in `.map-controls`.
- **Catalogue data**: Embedded as `const` arrays/objects (PHOTO_DATA, MESSIER, METEOR_SHOWERS, etc.) — not fetched
- **Weather**: Open-Meteo API — free, no auth, returns JSON directly

### CSS Custom Properties (design tokens)
```css
--gold: #c9a84c      /* accents, headings */
--bg: #06090f        /* page background */
--surface: #0d1220   /* card/panel backgrounds */
--text: #ddd8cc      /* body text */
--good: #4caf7a      /* positive indicators */
```

## Service Worker
Cache version is hardcoded in `sw.js` as `CACHE = 'night-sky-v32'`. **Bump the version number whenever assets change** to force cache invalidation for existing installs. The assets list at the top of `sw.js` must include any new files added to the project.

The fetch handler uses cache-first strategy: cached response wins; network is fallback only.

## Offline Support

The app is designed to work fully offline for everything except live weather. Keep it that way.

### What works offline (keep it this way)
| Tab | Why offline-safe |
|-----|-----------------|
| Moon | All data embedded in `moon.js`; photos pre-cached in `sw.js`; moon globe rendered via WebGL from pre-cached WAC texture |
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
