# Night Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the three features in `docs/superpowers/specs/2026-07-05-night-features-design.md`: Best Window Tonight, planet detail rows, and the opt-in nightly heads-up notification.

**Architecture:** Vanilla JS, no build step. Page-side logic in `forecast.js`/`planets.js`; background path in `sw.js` with Cache Storage as the page↔worker channel.

**Tech Stack:** Astronomy.js (Illumination/Equator/Constellation), Open-Meteo, Periodic Background Sync + Notifications APIs, Node vm harness.

---

### Task 1: findBestWindow + Outlook line + chart band

**Files:** Modify `js/forecast.js`, `js/main.js`, `js/state.js`, `styles.css`

- [ ] Add `findBestWindow(nightHours)` + `_betterRun` to `forecast.js`
  (thresholds: `(h.tcdc ?? 100) <= 40 && (h.precip_prob ?? 0) < 40`;
  longest run wins, ties broken by lower mean cloud; returned `end` is
  last good hour + 1 h).
- [ ] `_renderForecastData`: compute `const bestWin = findBestWindow(nightHrs);`,
  store `State.fcBestWin = bestWin;` (add field to State), pass to
  `buildOutlookHTML(outlook, medians, tzLabel, nightHrs, bestWin)` which
  renders the ✨ line under the sub-text (all-night / window / none
  variants), and pass to `drawCloudChart('cloudCanvas', nightHrs, bestWin)`.
- [ ] `drawCloudChart(canvasId, nightHrs, bestWin)`: after the background,
  draw `rgba(201,168,76,0.10)` band + faint edge lines from
  `xT(bestWin.start)` to `xT(min(bestWin.end, tEnd))` when provided.
- [ ] `js/main.js`: resize handler + `_redrawCharts` pass
  `State.fcBestWin` for the tonight chart only.
- [ ] Outlook ⓘ panel: add best-window sentence. CSS: `.fc-best-window`
  (gold-light, 0.85rem, margin-top 6px) + `.fc-best-window.none` (dim).
- [ ] `node --check`; commit `feat(forecast): best observing window tonight`.

### Task 2: Planet detail rows

**Files:** Modify `js/planets.js`, `styles.css`

- [ ] Add `PLANET_RADIUS_KM` map + `getPlanetDetails(name, when)` (spec
  formulas; Moon returns `NN% lit · in <con>`; try/catch → null).
- [ ] In `renderPlanets` loop: `const details = getPlanetDetails(planet.name, rts.transit ?? new Date());`
  and append `<span class="planet-detail-line">${details}</span>` inside
  `.planet-times` when non-null (verify layout at narrow width).
- [ ] CSS `.planet-detail-line` — dim, 0.72rem, full row.
- [ ] `node --check`; commit `feat(planets): magnitude, size, phase, constellation detail rows`.

### Task 3: Nightly heads-up — page side

**Files:** Modify `index.html`, `js/forecast.js`, `js/main.js`, `styles.css`

- [ ] `index.html`: notify card (hidden) at top of `#panel-forecast` with
  `role="switch"` toggle calling `toggleNightlyNotify()`.
- [ ] `forecast.js`: `NOTIFY_CACHE`/`NOTIFY_KEY` consts,
  `_readNotifyState`/`_writeNotifyState` (Cache Storage JSON),
  `_updateNotifyState()` (coords + tonight's twilight ISO),
  `toggleNightlyNotify()` (permission → persist → periodicSync
  register/unregister → `_syncNotifyUI`), `_syncNotifyUI()` (button
  text/aria-checked/subtext incl. install hint when periodicSync
  missing), boot-time reveal, and `maybeNotifyTonight()` (17:00–22:00,
  once per local date, State.fcNightHrs → cache → live fetch,
  `getOutlook` + `findBestWindow`, `reg.showNotification` tag
  `nightly-outlook`).
- [ ] `_renderForecastData` calls `_updateNotifyState()` when enabled.
- [ ] `main.js` `refreshStaleData()` tail: `maybeNotifyTonight();`.
- [ ] CSS `.notify-card` / `.notify-toggle` (on/off states).
- [ ] `node --check`; commit `feat(notify): nightly heads-up toggle + foreground delivery`.

### Task 4: Nightly heads-up — service worker + cache bump

**Files:** Modify `sw.js`

- [ ] **Exclude `night-sky-notify` from activate cleanup** (currently
  deletes every non-versioned cache).
- [ ] Add `_notifyState`/`_saveNotifyState`, pure `_swNightVerdict(hours)`
  (median bucket 10/30/55/80 + best-window scan ≤40/<40), `_anchorTonight`
  clock-time re-anchoring, `_nightlyOutlook()` (enabled + 12:00–22:00 +
  once/date gates, lightweight Open-Meteo fetch, filter to window,
  verdict, `self.registration.showNotification`), `periodicsync` +
  `notificationclick` listeners.
- [ ] Bump CACHE v50 → v51.
- [ ] `node --check sw.js`; commit `feat(sw): periodic-sync nightly outlook notification; bump to v51`.

### Task 5: Tests + docs

**Files:** Modify `tests/smoke.js`, `CLAUDE.md`

- [ ] smoke.js: findBestWindow (mid-night window incl. end+1h, all-night,
  none, tie-break), getPlanetDetails (loads planets.js; Jupiter has
  mag/″/in, Venus has % lit, Moon shape), sw.js loaded with stubbed
  `self`/`caches`/`fetch` → `_swNightVerdict` clear-with-window and
  overcast-no-window cases.
- [ ] CLAUDE.md: best-window tunables bullet, planet detail bullet,
  nightly heads-up bullet (state channel, once-per-day, activate
  exclusion), amend offline rule 5 with the sw.js exception.
- [ ] `node tests/smoke.js` green; commit
  `test+docs: cover best-window/planet-details/notify; document conventions`.
- [ ] Hand off to superpowers:finishing-a-development-branch.
