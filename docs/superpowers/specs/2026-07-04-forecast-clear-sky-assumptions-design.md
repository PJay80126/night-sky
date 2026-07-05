# Forecast Tab: Clear-Sky Assumptions Rework

**Date:** 2026-07-04
**Status:** Approved for planning

## Problem

The Forecast tab's "Tonight's Outlook" badge (and the Seeing/Transparency/Dew
Risk badges that share its data) is built on two weak assumptions:

1. **Clock-based night window.** `getForecastNightHours()` /
   `getTomorrowNightHours()` in `forecast.js` define "tonight" as a hardcoded
   `localHour >= 18` through `localHour <= 6` window, regardless of actual
   sunset/twilight/sunrise times. This is inaccurate by hours depending on
   season and latitude, while the rest of the app (Planets, Messier tabs)
   already computes the real astronomical night window via
   `getNightWindow()` in `state.js`.
2. **Single-median cloud scoring.** `getOutlook()` reduces the whole night to
   one median total-cloud-cover number, which can't distinguish a night that
   clears at 1am from one that's steadily 50% cloudy all night, and never
   cross-checks against precipitation probability — so a "Clear" badge is
   possible even when the model separately reports a high chance of rain.

## Scope

In scope:
- Replace the clock-based night window with a real nautical-twilight window,
  shared with the rest of the app via a new generalized helper.
- Add a variability signal and a precipitation cross-check to
  `getOutlook()`.
- Update CLAUDE.md documentation and bump the service-worker cache version.

Out of scope (explicitly not changing):
- `computeSeeing()` / `computeTransparency()` internals — CLAUDE.md already
  documents these as deliberate, tuned conventions (Richardson-Number
  seeing, Rahill/CMC transparency weighting). They benefit automatically
  from the corrected night window but their own formulas are untouched.
- The five Outlook cloud-cover bucket thresholds (10/30/55/80) — kept as-is.
- The 48-hour Temp/Dew chart's night-shading bands (still an approximate
  18:00–06:00 visual aid across a 2-day chart) — a rendering nicety, not
  part of the clear-sky determination.
- Moon phase / light pollution — a different concern from sky clarity.

## Design

### 1. Shared twilight-window helper

Add to `state.js`:

```js
function getTwilightWindow(date, sunAltDeg) {
  const midnight = new Date(date); midnight.setHours(0, 0, 0, 0);
  const observer = new Astronomy.Observer(State.obsLat, State.obsLon, 0);
  let start = null, end = null;
  try { start = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, midnight, 1, sunAltDeg)?.date; } catch(e) {}
  try {
    const from = start ?? new Date(midnight.getTime() + 20 * 3600000);
    end = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, +1, from, 1, sunAltDeg)?.date;
  } catch(e) {}
  return {
    nightStart: start ?? new Date(midnight.getTime() + 18 * 3600000),
    nightEnd:   end   ?? new Date(midnight.getTime() + 30 * 3600000),
    hasTrueDark: !!(start && end),
  };
}
```

- `getNightWindow(date)` in `state.js` becomes a thin wrapper:
  `return getTwilightWindow(date, -18);` (preserves existing return shape
  `{nightStart, nightEnd, noTrueDark}` used by `planets.js` — map
  `noTrueDark: !hasTrueDark`).
- `messier.js`'s private `_nauticalNight(date)` becomes a thin wrapper:
  `return getTwilightWindow(date, -12);` (adjust returned field name to
  match its existing `hasTrueDark` shape — no call-site changes needed).

Both existing call sites (`planets.js`, `messier.js`) keep their current
function names and return shapes, so no changes are needed outside
`state.js`/`messier.js` themselves.

### 2. Forecast night-window filtering

In `forecast.js`, rewrite `getForecastNightHours()` and
`getTomorrowNightHours()` to keep their existing "which calendar date is
tonight" logic (the `nowH < 6` rollover check that picks the right evening
date), but replace the `localHour` boundary comparisons with a real
`getTwilightWindow(eveningDate, -12)` call, then filter hourly records by
`h.time` falling within `[nightStart, nightEnd]`:

```js
function getForecastNightHours(hours) {
  if (!hours.length) return [];
  const nowH     = new Date().getHours();
  const todayStr = hours.find(h => h.localHour === nowH)?.localDate || hours[0].localDate;
  const anchor   = new Date(todayStr + 'T12:00:00');
  if (nowH < 6) anchor.setDate(anchor.getDate() - 1);
  const { nightStart, nightEnd } = getTwilightWindow(anchor, -12);
  return hours.filter(h => h.time >= nightStart && h.time <= nightEnd);
}
```

**Implementation note (post-review correction):** the first implementation
of this function anchored the evening date via `dates[todayIdx - 1] ||
dates[0]` (an array lookup) instead of the calendar-date arithmetic shown
above. That had a critical bug: Open-Meteo's response never contains a
"yesterday" entry, so the lookup always fell back to `dates[0]` (today)
whenever `nowH < 6`, causing the function to return a future night window
instead of the currently-in-progress one for anyone using the app between
midnight and 6am. Code review caught this before merge; the fix (shown
above) computes the anchor date directly via `Date` arithmetic, independent
of what dates happen to be present in `hours`.

`getTomorrowNightHours()` follows the original `dates`/`eveningIdx` pattern
unchanged — it was confirmed not to have this bug, since it only ever reads
`dates[todayIdx]`/`dates[todayIdx + 1]`, never a "yesterday" index. The
`dayAfterStr` variable is no longer needed since filtering by real
timestamp naturally spans into the next calendar date.

Nautical twilight (-12°) is used per the earlier scope decision — matches
the Messier tab's convention, dark enough for meaningful seeing/transparency
scoring without narrowing the window to full astronomical dark (-18°) the
way Planets does for faint-object visibility.

The high-latitude summer fallback (`hasTrueDark: false`) degrades to the
same 18:00/06:00-equivalent default the code uses today, so there's no
regression for locations with no true nautical dark.

### 3. Outlook variability + precipitation cross-check

Rewrite `getOutlook()` in `forecast.js`:

```js
function getOutlook(nightHours) {
  if (!nightHours.length) return { icon:'❓', label:'No Data', sub:'Forecast unavailable', cls:'partly' };

  const clouds = nightHours.map(h => h.tcdc ?? 0);
  const sorted = [...clouds].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  let base =
    median <= 10 ? { icon:'⭐', label:'Clear',         sub:'Excellent — minimal cloud cover expected',   cls:'clear'        } :
    median <= 30 ? { icon:'🌙', label:'Mostly Clear',  sub:'Good — occasional cloud possible',          cls:'mostly-clear' } :
    median <= 55 ? { icon:'⛅', label:'Partly Cloudy', sub:'Mixed — intermittent cloud cover',          cls:'partly'       } :
    median <= 80 ? { icon:'🌥', label:'Mostly Cloudy', sub:'Poor — cloud will interrupt viewing',       cls:'cloudy'       } :
                    { icon:'☁️', label:'Overcast',       sub:'Cloud cover will prevent observing tonight', cls:'cloudy'       };

  const precipMed = forecastMedian(nightHours, 'precip_prob');
  const rainConflict = precipMed != null && precipMed >= 50 && (base.cls === 'clear' || base.cls === 'mostly-clear');

  if (rainConflict) {
    return { icon:'🌦', label:'Unsettled', sub:`${Math.round(precipMed)}% chance of precipitation despite low reported cloud cover`, cls:'partly' };
  }

  const pctClear  = clouds.filter(c => c <= 30).length / clouds.length;
  const pctCloudy = clouds.filter(c => c >= 70).length / clouds.length;
  if (pctClear >= 0.25 && pctCloudy >= 0.25) {
    return { ...base, sub: 'Variable — expect clear spells and cloudy stretches through the night' };
  }

  return base;
}
```

- The five cloud-cover buckets and their thresholds are unchanged.
- Precipitation cross-check takes priority over the variability note (it's
  the more actionable safety-relevant signal) and reuses the `partly`
  (amber) badge class — no CSS changes needed.
- Variability only changes the sub-text, never the icon/label/color, so the
  badge's primary signal stays anchored to the median.
- Both `getOutlook()` call sites (Tonight, Tomorrow Night) get these
  improvements automatically.

## Testing / Verification

No test suite exists in this project (vanilla JS, no build step). Manual
verification plan:
1. Serve locally (`npx serve .`), open Forecast tab, confirm Outlook/Seeing/
   Transparency/Dew cards render sensibly for the current location.
2. Temporarily log `{nightStart, nightEnd}` to confirm real twilight times
   (not 18:00/06:00) are used, then remove the log.
3. Exercise `getOutlook()`'s new branches directly in the browser console
   with synthetic `nightHours` arrays (steady-cloudy, steady-clear,
   variable, and rain-conflict cases).
4. Read through the `hasTrueDark: false` fallback path carefully to confirm
   it still matches today's default behavior (can't easily test live from a
   temperate-latitude dev machine).

## Documentation

- Update CLAUDE.md's forecast section with a paragraph documenting the
  nautical-twilight night window (`getTwilightWindow`) and the Outlook
  variability/precipitation rules, in the same style as the existing
  Richardson-Number tunables paragraph.
- Bump `sw.js`'s `CACHE` version (currently `night-sky-v47`) since
  `forecast.js`, `state.js`, and `messier.js` contents change, per the
  project's cache-invalidation rule — even though no new files are added.
