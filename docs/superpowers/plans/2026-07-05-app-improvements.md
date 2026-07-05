# App-Wide Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the five approved improvements in `docs/superpowers/specs/2026-07-05-app-improvements-design.md`: staleness auto-refresh, manual location fallback, forecast offline cache, accessibility pass, committed test harness.

**Architecture:** Vanilla JS, global scope, no build step. New code follows existing conventions (State object, load guards, localStorage `nightsky.*` keys). One new directory: `tests/`.

**Tech Stack:** Plain JS + Node (vm module) for the test harness.

---

### Task 1: Staleness / auto-refresh

**Files:** Modify `js/main.js`, `js/state.js` (one field), `js/forecast.js` (one stamp)

- [ ] `js/state.js`: add to the `State` object literal:

```js
  // Active tab + freshness tracking (see refreshStaleData in main.js)
  activeTab: 'moon',
  forecastFetchedAt: null,
```

- [ ] `js/forecast.js`: in `renderForecast()`'s success path (top of the
  `.then` body — after Task 3 this lives at the top of the live-fetch
  `.then`, before `_renderForecastData`), add
  `State.forecastFetchedAt = Date.now();`
- [ ] `js/main.js`: first line of `switchTab(name)` body:
  `State.activeTab = name;`
- [ ] `js/main.js`: add after the resize handler:

```js
// ── Freshness ─────────────────────────────────────────────────────────────
// Recompute stale data when the app resurfaces or a timer ticks. Three
// tiers: (1) calendar-date rollover -> recompute everything, (2) forecast
// older than an hour -> re-fetch, (3) >5 min since last chart draw ->
// redraw so NOW lines stay honest. The Moon Map self-refreshes its Q-Day
// dots and terminator on every render, so tier 3's resizeMoonMap() covers it.
let _lastActiveDate = today().getTime();
let _lastChartDraw  = Date.now();

function _redrawCharts() {
  _lastChartDraw = Date.now();
  if (State.altDatasets) drawAltitudeGraph(State.altDatasets, State.altSteps, State.altHStart, State.altHEnd);
  if (State.fcNightHrs)  drawCloudChart('cloudCanvas',     State.fcNightHrs);
  if (State.fcTmrwHrs)   drawCloudChart('cloudCanvasTmrw', State.fcTmrwHrs);
  if (State.fcHours48)   drawTempDewChart('tempDewCanvas', State.fcHours48);
  if (State.moonmapLoaded) resizeMoonMap();
}

function refreshStaleData() {
  if (document.hidden) return;

  if (today().getTime() !== _lastActiveDate) {
    _lastActiveDate = today().getTime();
    renderMoon();
    State.planetsLoaded  = false;
    State.forecastLoaded = false;
    _messierLoaded       = false;
    _eventsLoaded        = false;
    switchTab(State.activeTab);
    _lastChartDraw = Date.now();
    return;
  }

  if (State.forecastFetchedAt && Date.now() - State.forecastFetchedAt > 60 * 60000) {
    State.forecastLoaded = false;
    if (State.activeTab === 'forecast') { switchTab('forecast'); return; }
  }

  if (Date.now() - _lastChartDraw > 5 * 60000) _redrawCharts();
}

document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshStaleData(); });
setInterval(refreshStaleData, 5 * 60000);
```

- [ ] `node --check` on the three files → OK
- [ ] Commit: `feat(app): auto-refresh stale data on resume, rollover, and timer`

### Task 2: Manual location fallback

**Files:** Modify `js/state.js`, `styles.css`, `CLAUDE.md`

- [ ] `js/state.js`: extend `getLocation` and add helpers:

```js
function _manualCoords() {
  const lat = parseFloat(localStorage.getItem('nightsky.manualLat'));
  const lon = parseFloat(localStorage.getItem('nightsky.manualLon'));
  return (Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180)
    ? { lat, lon } : null;
}

function getLocation(onSuccess, onFail) {
  const useManual = () => {
    const m = _manualCoords();
    if (!m) return false;
    State.obsLat = m.lat; State.obsLon = m.lon;
    State.locationSource = 'manual';
    onSuccess();
    return true;
  };
  if (!navigator.geolocation) { if (!useManual()) onFail(); return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      State.obsLat = pos.coords.latitude;
      State.obsLon = pos.coords.longitude;
      State.locationSource = 'gps';
      onSuccess();
    },
    () => { if (!useManual()) onFail(); },
    { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
  );
}

function setManualLocation(tabName) {
  const lat = parseFloat(document.getElementById('manualLat')?.value);
  const lon = parseFloat(document.getElementById('manualLon')?.value);
  const msg = document.getElementById('manualLocMsg');
  if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180) {
    if (msg) msg.textContent = 'Enter a latitude −90…90 and longitude −180…180.';
    return;
  }
  localStorage.setItem('nightsky.manualLat', String(lat));
  localStorage.setItem('nightsky.manualLon', String(lon));
  State.obsLat = lat; State.obsLon = lon;
  State.locationSource = 'manual';
  retryLocation(tabName);
}
```

  (add `locationSource: null` to the `State` literal), and extend
  `locationErrorHTML` with a manual-entry block before the closing div:

```js
      <div class="manual-loc">
        <div class="manual-loc-title">or enter coordinates manually</div>
        <div class="manual-loc-row">
          <input type="number" id="manualLat" placeholder="Latitude"  min="-90"  max="90"  step="any" inputmode="decimal">
          <input type="number" id="manualLon" placeholder="Longitude" min="-180" max="180" step="any" inputmode="decimal">
          <button class="loc-retry-btn" onclick="setManualLocation('${tabName}')">Use</button>
        </div>
        <div class="manual-loc-msg" id="manualLocMsg"></div>
      </div>
```

  Note: `retryLocation` calls `getLocation`, which now prefers GPS but
  falls back to the just-saved manual coords, so the tab renders either way.
- [ ] `styles.css`: add `.manual-loc` block (muted title, flex row, inputs
  styled like `.scope-field input`, small warn-colored message line).
- [ ] `CLAUDE.md`: replace the incorrect "Location fallback (when
  geolocation is denied) defaults to a reasonable static location defined
  in `state.js`" with the manual-coords description; update the offline
  table's Geolocation row.
- [ ] `node --check js/state.js` → OK
- [ ] Commit: `feat(location): manual coordinate fallback when geolocation fails`

### Task 3: Forecast offline cache

**Files:** Modify `js/forecast.js`, `styles.css`

- [ ] Extract everything inside `renderForecast()`'s `.then(data => { ... })`
  into `function _renderForecastData(data, container, cachedAt)`; when
  `cachedAt` is non-null, prepend a banner to the assembled HTML:

```js
      const cacheBanner = cachedAt
        ? `<div class="fc-cache-banner">⚠ Offline — showing cached forecast from ${new Date(cachedAt).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</div>`
        : '';
```

- [ ] Live path stores the cache and stamps freshness:

```js
    .then(data => {
      State.forecastFetchedAt = Date.now();
      try {
        localStorage.setItem('nightsky.fcCache',
          JSON.stringify({ ts: Date.now(), lat: State.obsLat, lon: State.obsLon, data }));
      } catch (e) { /* quota — cache is best-effort */ }
      _renderForecastData(data, container, null);
    })
```

- [ ] Catch path tries the cache before the error card:

```js
    .catch(err => {
      console.error('Forecast fetch error:', err);
      const cached = _readForecastCache();
      if (cached) { _renderForecastData(cached.data, container, cached.ts); return; }
      container.innerHTML = /* existing error card */;
    });

function _readForecastCache() {
  try {
    const c = JSON.parse(localStorage.getItem('nightsky.fcCache'));
    if (!c || !c.data || !c.data.hourly) return null;
    if (Math.abs(c.lat - State.obsLat) > 0.5 || Math.abs(c.lon - State.obsLon) > 0.5) return null;
    return c;
  } catch (e) { return null; }
}
```

- [ ] `styles.css`: `.fc-cache-banner` — amber-tinted card
  (`rgba(201,168,76,0.1)` bg, gold border, 12px padding, margin-bottom 14px).
- [ ] `node --check js/forecast.js` → OK
- [ ] Commit: `feat(forecast): serve cached forecast with banner when offline`

### Task 4: Accessibility — tab bar + filter chips

**Files:** Modify `index.html`, `js/main.js`, `js/events.js`, `js/messier.js`

- [ ] `index.html`: `.tab-bar` gets `role="tablist"` `aria-label="App sections"`;
  each `.tab-btn` gets `role="tab"`, `aria-controls="panel-<name>"`, and
  `aria-selected="true|false"` (true only on `tab-moon`); each `.tab-panel`
  gets `role="tabpanel"` and `aria-labelledby="tab-<name>"`.
- [ ] `js/main.js` `switchTab()`: alongside the class toggles, set
  `b.setAttribute('aria-selected', 'false')` in the button loop and
  `'true'` on the activated button; add arrow-key handler:

```js
document.getElementById('tabBar').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const tabs = [...document.querySelectorAll('.tab-btn')];
  const idx  = tabs.findIndex(t => t === document.activeElement);
  if (idx === -1) return;
  e.preventDefault();
  const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
  next.focus();
  next.click();
});
```

- [ ] Filter chips: add `aria-pressed="true|false"` to all chips in
  `index.html` (true on the two `active` ones); in `filterEvents` and
  `filterMessier`, mirror the class toggle with
  `c.setAttribute('aria-pressed', 'false')` / `chipEl.setAttribute('aria-pressed', 'true')`.
- [ ] `node --check js/main.js js/events.js js/messier.js` → OK
- [ ] Commit: `feat(a11y): tablist semantics, arrow-key tab nav, chip aria-pressed`

### Task 5: Accessibility — canvases, lightbox, Messier expander

**Files:** Modify `index.html`, `js/moon.js`, `js/planets.js`, `js/forecast.js`, `js/messier.js`, `styles.css`

- [ ] Chart canvases get `role="img"` + `aria-label` where their HTML is
  built: `altCanvas` ("Planet altitude chart for tonight", planets.js),
  `cloudCanvas` ("Hourly cloud cover chart for tonight"), `cloudCanvasTmrw`
  ("Hourly cloud cover chart for tomorrow night"), `tempDewCanvas`
  ("48-hour temperature and dew point chart") in forecast.js;
  `moonGlCanvas` in index.html ("Interactive moon map").
- [ ] Lightbox (`index.html` + `js/moon.js`): container gets `role="dialog"
  aria-modal="true" aria-label="Lunar feature photo"`; ✕ becomes
  `<button class="lightbox-close" aria-label="Close photo">✕</button>`;
  in `moon.js`, `openLightbox` records `document.activeElement`, focuses
  the close button; `closeLightbox` restores focus; a `document` keydown
  closes on Escape only when the lightbox has the `open` class.
- [ ] Messier "Below Horizon" expander (`js/messier.js`): the labelled
  `<div ... onclick>` becomes
  `<button class="target-group-label messier-below-toggle" aria-expanded="false" onclick="toggleMessierBelow(this)">`;
  `toggleMessierBelow` also sets `aria-expanded`. `styles.css` adds
  `.messier-below-toggle { display:block; width:100%; text-align:left; background:none; border:none; font:inherit; color:inherit; cursor:pointer; }`.
- [ ] `node --check` all touched JS → OK
- [ ] Commit: `feat(a11y): labelled canvases, dialog lightbox with Escape, button expander`

### Task 6: Committed test harness

**Files:** Create `tests/smoke.js`; modify `CLAUDE.md`

- [ ] Port the scratchpad harness: root `path.join(__dirname, '..')`;
  sandbox stubs `document.getElementById`/`querySelector`, `navigator`,
  `localStorage` (in-memory Map-backed so cache tests work),
  `requestAnimationFrame`; load `astronomy.browser.js`, `js/state.js`,
  `js/moon.js`, `js/messier.js`, `js/forecast.js`; set Ottawa coords.
- [ ] Keep the 24 existing forecast checks; add:
  - `getTwilightWindow(-12)` and `(-18)`: start < end, −18 window ⊆ −12 window.
  - Q-Day: `findNearestFQ(new Date('2026-07-10T00:00:00'))` returns a Date
    within 15 days; `daysBetween` of consecutive first quarters ≈ 29–30;
    `getMoonInfo(new Date())` returns `{pct: 0–100, name, icon, label}`.
  - Manual location: seed `nightsky.manualLat/Lon` in the stub
    localStorage, stub `navigator.geolocation` as missing, call
    `getLocation(ok, fail)` → ok path, `State.locationSource === 'manual'`;
    invalid stored coords → fail path.
  - Forecast cache: `_readForecastCache()` null on empty, null on far-away
    coords, round-trips a stored `{ts, lat, lon, data}`.
- [ ] `node tests/smoke.js` → all checks pass, exit 0.
- [ ] `CLAUDE.md`: replace both "no test suite" statements with the
  `node tests/smoke.js` convention.
- [ ] Commit: `test: commit Node vm smoke harness as tests/smoke.js`

### Task 7: Docs, cache bump, final verification

**Files:** Modify `CLAUDE.md`, `sw.js`

- [ ] CLAUDE.md Key Conventions additions: freshness/auto-refresh bullet,
  manual-location bullet (drift fix done in Task 2 — verify), forecast
  offline-cache bullet, a11y conventions bullet.
- [ ] `sw.js`: CACHE `night-sky-v49` → `night-sky-v50`. `tests/` is NOT
  added to ASSETS.
- [ ] Full pass: `node --check` on every touched JS file;
  `node tests/smoke.js` green.
- [ ] Commit: `docs(claude): document freshness/location/offline/a11y conventions; chore(sw): bump to v50`
- [ ] Hand off to superpowers:finishing-a-development-branch.
