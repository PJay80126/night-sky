# App-Wide Improvements: Freshness, Location, Offline, A11y, Tests

**Date:** 2026-07-05
**Status:** Approved (user approved all five items from the whole-app review)

## Problem

A whole-app review found five gaps, ranked by impact on the core use case
(an observer using the PWA across a full night in the field):

1. **Staleness.** Every tab computes "tonight" once and latches via load
   guards. No `visibilitychange` handler, no interval, no date-rollover
   check exists anywhere. An app opened at 20:00 and glanced at at 01:00
   shows hours-old NOW lines, a stale forecast, and — after midnight —
   the wrong day's Q-Day, targets, and night windows.
2. **Geolocation denied = three dead tabs.** Planets, Messier, and
   Forecast offer only a Retry card. CLAUDE.md claims a static fallback
   location exists in `state.js`; it does not (documentation drift).
3. **Forecast is useless offline.** The one network-dependent tab shows
   only an error, but the field pattern is: check at home, drive to a
   no-signal dark site, re-open the app.
4. **Accessibility gaps** in the interactive chrome: no tablist
   semantics, chips without `aria-pressed`, anonymous canvases, a
   lightbox with no keyboard dismissal, a click-handler `<div>` expander.
5. **No committed test suite.** Two work sessions in a row built (and
   discarded) a Node `vm` smoke harness in a scratchpad to verify the
   forecast pipeline.

## Design

### 1. Staleness / auto-refresh (`js/main.js`, small touch points elsewhere)

Track the active tab (`State.activeTab`, set in `switchTab`) and add a
single `refreshStaleData()` in `main.js`, wired to:

- `document.visibilitychange` → runs when the app becomes visible;
- a 5-minute `setInterval` that no-ops while `document.hidden`.

Three tiers of staleness, checked in order:

1. **Date rollover** (calendar date differs from `_lastActiveDate`,
   captured at boot): re-run `renderMoon()`, clear all tab load guards
   (`State.planetsLoaded`, `State.forecastLoaded`, `_messierLoaded`,
   `_eventsLoaded`), then re-activate the current tab via
   `switchTab(State.activeTab)` so it recomputes on the spot. The Moon
   Map needs no guard-clearing — its overlay recomputes Q-Day and
   libration on every `_render()` — so a `resizeMoonMap()` redraw
   suffices (folded into tier 3).
2. **Forecast age**: `renderForecast()` stamps
   `State.forecastFetchedAt = Date.now()` on success. If the data is
   older than 60 minutes, clear `State.forecastLoaded`; if the Forecast
   tab is active, re-trigger it immediately (re-fetch), otherwise the
   next activation re-fetches naturally.
3. **Chart redraw** (NOW lines): if more than 5 minutes have passed
   since the last redraw, redraw whatever charts exist — the same call
   set as the resize handler (`drawAltitudeGraph`, the three forecast
   charts, `resizeMoonMap`).

The interval is 5 minutes because that's the NOW-line granularity worth
having; date rollover and forecast age piggyback on the same tick and on
every visibility resume.

### 2. Manual location fallback (`js/state.js`, CLAUDE.md)

- `getLocation()` gains a persisted-manual-coords fallback: on
  geolocation failure (or missing API), if `nightsky.manualLat`/`Lon`
  exist in localStorage, use them (`State.locationSource = 'manual'`)
  and call `onSuccess` instead of `onFail`. Geolocation success still
  wins and sets `State.locationSource = 'gps'`.
- `locationErrorHTML()` gains a manual-entry row under the Retry button:
  two number inputs (lat −90…90, lon −180…180, step any) plus a "Use
  coordinates" button calling `setManualLocation(tabName)`, which
  validates, persists to localStorage, sets `State.obsLat/On`, and
  re-triggers the tab exactly as `retryLocation` does.
- CLAUDE.md's incorrect "static fallback location defined in state.js"
  sentence is replaced with a description of the manual fallback.

### 3. Forecast offline cache (`js/forecast.js`)

- Extract the body of `renderForecast()`'s `.then` into
  `_renderForecastData(data, container, cachedAt)` so the live path and
  the cache path share one renderer. `cachedAt == null` means live.
- On successful fetch: store `{ts, lat, lon, data}` as JSON under
  `nightsky.fcCache` (try/catch — quota failures are non-fatal), stamp
  `State.forecastFetchedAt`.
- On fetch failure: if a cache entry exists **and** its coords are
  within 0.5° of the current observer, render it via
  `_renderForecastData(..., cachedAt)` with a prominent banner card at
  the top: "⚠ Offline — showing cached forecast from {time}". Otherwise
  fall through to the existing error card. The banner reuses the
  `fc-error`-style styling with a warn (amber) variant class
  `fc-cache-banner`.

### 4. Accessibility pass (`index.html`, `js/main.js`, `js/moon.js`, `js/planets.js`, `js/forecast.js`, `js/events.js`, `js/messier.js`, `styles.css`)

- **Tab bar**: `role="tablist"` + `aria-label` on the bar; each button
  `role="tab"`, `aria-selected`, `aria-controls="panel-<name>"`; panels
  `role="tabpanel"` + `aria-labelledby="tab-<name>"`. `switchTab()`
  updates `aria-selected`. Arrow-key navigation: `keydown` on the bar
  moves focus and activates the previous/next tab (Left/Right), wrapping
  at the ends. Native tab order is left untouched (no roving tabindex —
  six always-visible buttons don't warrant it).
- **Filter chips** (Events + Messier): `aria-pressed` in the markup,
  toggled in `filterEvents()` / `filterMessier()`.
- **Canvases**: `role="img"` + descriptive `aria-label` on every chart
  canvas at creation (`altCanvas`, `cloudCanvas`, `cloudCanvasTmrw`,
  `tempDewCanvas`) and on the moon-map GL canvas in `index.html`.
- **Lightbox**: `role="dialog"`, `aria-modal="true"`, `aria-label`; the
  ✕ becomes a real `<button>`; Escape closes it while open (guarded so
  it doesn't fight the map-fullscreen Escape handler — check
  `classList.contains('open')` first); opening moves focus to the close
  button, closing restores focus to the previously focused element.
- **Messier "Below Horizon" expander**: the `onclick` `<div>` becomes a
  `<button>` with `aria-expanded`, styled to match the existing
  `target-group-label` look (`.messier-below-toggle` reset styles).

### 5. Committed test harness (`tests/smoke.js`, CLAUDE.md)

- Port the scratchpad Node `vm` harness into `tests/smoke.js`, rooted at
  `path.join(__dirname, '..')` so it runs from any checkout. Loads the
  real `astronomy.browser.js`, `js/state.js`, `js/moon.js`,
  `js/messier.js`, `js/forecast.js` into a stubbed-DOM sandbox. No
  package.json, no dependencies — `node tests/smoke.js` exits non-zero
  on failure.
- Checks: the existing 24 forecast checks (twilight windows, outlook,
  seeing incl. north-wrap and Infinity, dew risk, precip peak,
  null-cloud, info-button toggles) plus new ones for Q-Day math
  (`findNearestFQ` brackets a known 2026 first-quarter date,
  `getMoonInfo` returns a sane shape), `getTwilightWindow` ordering, and
  the new manual-location validation and forecast-cache round-trip.
- `tests/` is NOT added to `sw.js` ASSETS (not an app asset).
- CLAUDE.md's "no test suite" notes are updated: "Testing: run
  `node tests/smoke.js` (Node vm harness driving the real files); keep
  it green and extend it when changing scoring/twilight/Q-Day logic."

## Out of scope

- `renderPlanets()` duplicate SearchRiseSet calls (imperceptible).
- "Tomorrow Night" header off-by-one after midnight (cosmetic).
- Roving tabindex / full WAI-ARIA tabs keyboard spec (arrow keys only).
- Any visual redesign.

## Housekeeping

- `sw.js` CACHE v49 → v50 (`index.html`, `styles.css`, and five JS files
  change).
- CLAUDE.md: staleness/refresh convention, manual-location fallback
  (fixing the drift), forecast cache, a11y conventions, testing note.

## Verification

`node --check` on all touched JS. `node tests/smoke.js` green (the
harness is itself part of the change). Manual checks listed per-task in
the plan (visibility/rollover simulation via DevTools clock is not
possible in Node — rollover logic gets a direct unit check in the
harness instead).
