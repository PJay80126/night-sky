# Best Window, Planet Details, Nightly Heads-Up

**Date:** 2026-07-05
**Status:** Approved (user: "all good"; device = Android phone, scope =
best-effort notifications)

## Features

### 1. Best Window Tonight (Forecast tab)

`findBestWindow(nightHours)` in `forecast.js` scans the night's hourly
records for the longest contiguous run of *observable* hours — cloud
cover ≤ 40% AND precipitation probability < 40% — tie-breaking equal-length
runs by lower mean cloud. Returns `{start, end, count, avgCloud}` or
`null` (end = last good hour + 1 h, so a 23:00+00:00 run displays as
"23:00–01:00 (2h)").

Surfacing:
- One line in the Tonight's Outlook card: "✨ Best window: 23:00–01:00
  (2h, avg 15% cloud)", "✨ All night looks good (avg N% cloud)" when the
  run spans every hour, or "No clear window expected tonight" (dim style).
- A translucent gold band on the tonight cloud chart over the window
  (`drawCloudChart` gains an optional `bestWin` argument; stored as
  `State.fcBestWin` so resize/refresh redraws keep the band; the
  tomorrow chart gets no band).
- A sentence in the Outlook ⓘ explainer.
- The thresholds (40/40) are interpretation, documented in CLAUDE.md as
  tunables next to the other scoring knobs.

### 2. Planet detail rows (Planets tab)

Each planet row gains a detail line computed at transit time (falling
back to now): `mag −2.4 · 44.8″ · 99% lit · in Taurus`.
- Magnitude + illuminated fraction from `Astronomy.Illumination`
  (`phase_fraction`).
- Apparent equatorial diameter from the geocentric distance
  (`Astronomy.Equator(...).dist`, AU) and embedded planet radii (km):
  `2·atan(r/d)` in arcseconds.
- Constellation from `Astronomy.Constellation(ra, dec)`.
- Illuminated fraction shown only for Mercury/Venus/Mars (always ~100%
  for the outer planets); the Moon shows `NN% lit · in <con>` only.
- All local computation; wrapped in try/catch returning null (line
  simply omitted on failure).

### 3. Nightly heads-up notification (opt-in, best effort)

A "🔔 Nightly heads-up" card at the top of the Forecast tab (static in
`index.html`, revealed by JS only when `Notification` +
`serviceWorker` exist) with a `role="switch"` toggle.

**Enabling** requests notification permission, persists
`nightsky.notifyEnabled`, writes shared state, and registers Periodic
Background Sync tag `nightly-outlook` (`minInterval` 12 h) when
supported; sync registration failure is non-fatal (in-page timer still
works). Disabling unregisters and updates state.

**Shared state** (page ↔ service worker) lives in Cache Storage, cache
`night-sky-notify`, key `./notify-state`, JSON:
`{enabled, lat, lon, nightStartIso, nightEndIso, lastNotified, updated}`.
The page refreshes coords + tonight's real twilight window whenever the
forecast renders; the worker re-anchors the stored *clock times* to the
current date (twilight drifts ~1 min/day, so staleness is harmless).
**The service worker's activate-cleanup must exclude this cache** — it
currently deletes every cache that isn't the versioned asset cache.

**Delivery paths** (both once per calendar date via `lastNotified`,
duplicated in localStorage for the page):
1. *Background (Android installed PWA):* `periodicsync` handler in
   `sw.js`. Gated to fire only between 12:00–22:00 local. Fetches a
   lightweight Open-Meteo request (cloud_cover + precipitation_probability,
   2 days), filters to tonight's window, and computes a simplified
   verdict `_swNightVerdict(hours)`: median-cloud bucket (same 10/30/55/
   80 thresholds and labels as `getOutlook`) plus the same best-window
   scan (≤40 cloud, <40 precip). Shows e.g. "🌙 Mostly Clear tonight /
   Best window 22:00–01:00". Deliberate ~30-line duplication of
   simplified scoring — the worker cannot reuse the page pipeline.
2. *Foreground:* `maybeNotifyTonight()` in `forecast.js`, called from
   `refreshStaleData()`'s tick — between 17:00 and 22:00, uses
   `State.fcNightHrs`, else the forecast cache, else a live fetch, then
   `getOutlook` + `findBestWindow` and
   `registration.showNotification` (tag `nightly-outlook` so the two
   paths coalesce).

`notificationclick` focuses an existing app window or opens one.
Notifications fire daily with the verdict good *or* bad (silence means
"sync didn't run", never "tonight is bad").

**Honest limits (documented in the card subtext):** background delivery
requires the installed PWA on Android Chrome and fires when the browser
chooses, not at 17:00 sharp; iOS gets the foreground path only.

## Housekeeping

- `sw.js` CACHE v50 → v51 (js/css/html change). New Open-Meteo fetch in
  `sw.js` needs a documented exception to CLAUDE.md offline rule 5.
- CLAUDE.md: best-window tunables, planet detail row, nightly heads-up
  architecture (shared cache state, once-per-day, activate-cleanup
  exclusion).
- `tests/smoke.js`: findBestWindow cases (clear run, tie-break, none,
  all-night), planet-details shape (mag/size/constellation present),
  `_swNightVerdict` cases (sw.js loaded with stubbed `self`/`caches`).

## Out of scope

- Push-server-based notifications (needs a backend).
- Best-window band on the tomorrow chart.
- Moon angular size in the detail row.
