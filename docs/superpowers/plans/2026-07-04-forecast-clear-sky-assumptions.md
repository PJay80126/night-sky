# Forecast Clear-Sky Assumptions Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Forecast tab's hardcoded 18:00–06:00 "tonight" window with a real nautical-twilight window, and make the Outlook badge cross-check precipitation and flag variable nights, instead of trusting a single median cloud-cover number.

**Architecture:** Generalize the existing astronomical-twilight search (`state.js`'s `getNightWindow`) into a parameterized `getTwilightWindow(date, sunAltDeg)` helper shared by Planets (`-18°`), Messier (`-12°`), and now Forecast (`-12°`). `forecast.js`'s night-hour filters switch from `localHour` clock comparisons to real `Date` range comparisons against that helper's output. `getOutlook()` gains two post-processing checks (precipitation conflict, cloud variability) layered on top of its existing five-bucket median logic.

**Tech Stack:** Vanilla JS, no build step, no test runner (per project CLAUDE.md) — verification is manual via a locally served app and the browser console.

This project has no automated test suite, so each task below substitutes a **manual verification step** (exact browser-console commands + expected output) for the automated test step a TDD workflow would normally use. Run `npx serve .` from the repo root once at the start of the session and keep it running — every task's verification step assumes the app is being served at the printed local URL (e.g. `http://localhost:3000`).

---

### Task 1: Add shared `getTwilightWindow` helper, refactor `getNightWindow`

**Files:**
- Modify: `js/state.js:125-137`

- [ ] **Step 1: Replace `getNightWindow` with the generalized helper + thin wrapper**

Replace this block in `js/state.js` (currently lines 125-137):

```js
function getNightWindow(date) {
  const midnight = new Date(date); midnight.setHours(0, 0, 0, 0);
  const observer = new Astronomy.Observer(State.obsLat, State.obsLon, 0);
  let darkStart  = null, darkEnd = null;
  try { darkStart = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, midnight, 1, -18)?.date; } catch(e) {}
  try {
    const searchFrom = darkStart ?? new Date(midnight.getTime() + 20 * 3600000);
    darkEnd = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, +1, searchFrom, 1, -18)?.date;
  } catch(e) {}
  const nightStart = darkStart ?? new Date(midnight.getTime() + 18 * 3600000);
  const nightEnd   = darkEnd   ?? new Date(midnight.getTime() + 30 * 3600000);
  return { nightStart, nightEnd, noTrueDark: !darkStart || !darkEnd };
}
```

with:

```js
// Generalized twilight-window search. sunAltDeg is the sun-altitude
// threshold that defines "dark" (-18 astronomical, -12 nautical, -6 civil).
// Falls back to a fixed 18:00/06:00 clock window when SearchAltitude can't
// find a crossing (e.g. high-latitude summer with no true dark).
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
    nightStart:  start ?? new Date(midnight.getTime() + 18 * 3600000),
    nightEnd:    end   ?? new Date(midnight.getTime() + 30 * 3600000),
    hasTrueDark: !!(start && end),
  };
}

// Astronomical twilight (-18°) window for tonight — used by Planets/Events
// for faint-object visibility timing.
function getNightWindow(date) {
  const w = getTwilightWindow(date, -18);
  return { nightStart: w.nightStart, nightEnd: w.nightEnd, noTrueDark: !w.hasTrueDark };
}
```

- [ ] **Step 2: Verify `getNightWindow` still behaves identically**

With the app served locally, open the Planets tab in the browser, note the displayed "Dark" and "Dawn" times, then open DevTools console and run:

```js
getNightWindow(new Date())
```

Expected: an object `{ nightStart: <Date>, nightEnd: <Date>, noTrueDark: false }` (assuming a temperate-latitude dev location) whose `nightStart`/`nightEnd` clock times match what's displayed on the Planets tab as "Dark" and "Dawn".

Also run:

```js
getTwilightWindow(new Date(), -18)
```

Expected: `{ nightStart, nightEnd, hasTrueDark: true }` with the same `nightStart`/`nightEnd` values as the `getNightWindow()` call above.

- [ ] **Step 3: Commit**

```bash
git add js/state.js
git commit -m "refactor(state): generalize getNightWindow into getTwilightWindow(date, sunAltDeg)"
```

---

### Task 2: Refactor Messier's `_nauticalNight` to use `getTwilightWindow`

**Files:**
- Modify: `js/messier.js:167-182`

- [ ] **Step 1: Replace `_nauticalNight`'s body with a call to `getTwilightWindow`**

Replace this block in `js/messier.js` (currently lines 167-182):

```js
// Nautical twilight (sun alt < -12°) window for tonight.
function _nauticalNight(date) {
  const midnight = new Date(date); midnight.setHours(0, 0, 0, 0);
  const observer = new Astronomy.Observer(State.obsLat, State.obsLon, 0);
  let start = null, end = null;
  try { start = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, midnight, 1, -12)?.date; } catch(e) {}
  try {
    const from = start ?? new Date(midnight.getTime() + 20 * 3600000);
    end = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, +1, from, 1, -12)?.date;
  } catch(e) {}
  return {
    nightStart: start ?? new Date(midnight.getTime() + 18 * 3600000),
    nightEnd:   end   ?? new Date(midnight.getTime() + 30 * 3600000),
    hasTrueDark: !!(start && end),
  };
}
```

with:

```js
// Nautical twilight (sun alt < -12°) window for tonight.
function _nauticalNight(date) {
  return getTwilightWindow(date, -12);
}
```

- [ ] **Step 2: Verify Messier tab visibility windows are unchanged**

Open the Messier tab in the browser (with a location set), note the visibility/altitude details shown for any one object (e.g. M13), then in DevTools console run:

```js
_nauticalNight(new Date())
```

Expected: `{ nightStart, nightEnd, hasTrueDark: true }` — compare `nightStart`/`nightEnd` against the values from `getTwilightWindow(new Date(), -12)` (Task 1, Step 2's pattern); they must match exactly since `_nauticalNight` now just delegates. Re-check the Messier tab's rendered object list still looks the same as before the change (no visible regression).

- [ ] **Step 3: Commit**

```bash
git add js/messier.js
git commit -m "refactor(messier): delegate _nauticalNight to shared getTwilightWindow helper"
```

---

### Task 3: Real twilight window for Forecast's night-hour filters

**Files:**
- Modify: `js/forecast.js:103-130`

- [ ] **Step 1: Replace `getForecastNightHours` and `getTomorrowNightHours`**

Replace this block in `js/forecast.js` (currently lines 103-130):

```js
function getForecastNightHours(hours) {
  if (!hours.length) return [];
  const nowH      = new Date().getHours();
  const todayStr  = hours.find(h => h.localHour === nowH)?.localDate || hours[0].localDate;
  const dates     = [...new Set(hours.map(h => h.localDate))].sort();
  const todayIdx  = dates.indexOf(todayStr);
  const eveningStr = nowH < 6 ? (dates[todayIdx - 1] || dates[0]) : todayStr;
  const morningStr = nowH < 6 ? todayStr : (dates[todayIdx + 1] || dates[dates.length - 1]);
  return hours.filter(h =>
    (h.localDate === eveningStr && h.localHour >= 18) ||
    (h.localDate === morningStr && h.localHour <= 6)
  );
}

function getTomorrowNightHours(hours) {
  if (!hours.length) return [];
  const nowH       = new Date().getHours();
  const dates      = [...new Set(hours.map(h => h.localDate))].sort();
  const todayStr   = hours.find(h => h.localHour === nowH)?.localDate || hours[0].localDate;
  const todayIdx   = dates.indexOf(todayStr);
  const eveningIdx = nowH < 6 ? todayIdx : todayIdx + 1;
  const tmrwStr    = dates[eveningIdx]     || dates[dates.length - 1];
  const dayAfterStr= dates[eveningIdx + 1] || dates[dates.length - 1];
  return hours.filter(h =>
    (h.localDate === tmrwStr      && h.localHour >= 18) ||
    (h.localDate === dayAfterStr  && h.localHour <= 6)
  );
}
```

with:

```js
// "Tonight" is the real nautical-twilight window (sunset-side dusk through
// sunrise-side dawn at -12° sun altitude), not a fixed 18:00-06:00 clock
// window — see getTwilightWindow() in state.js. Falls back to the old
// 18:00/06:00 default automatically at latitudes with no true nautical
// dark (e.g. high-latitude summer).
function getForecastNightHours(hours) {
  if (!hours.length) return [];
  const nowH       = new Date().getHours();
  const todayStr   = hours.find(h => h.localHour === nowH)?.localDate || hours[0].localDate;
  const dates      = [...new Set(hours.map(h => h.localDate))].sort();
  const todayIdx   = dates.indexOf(todayStr);
  const eveningStr = nowH < 6 ? (dates[todayIdx - 1] || dates[0]) : todayStr;
  const { nightStart, nightEnd } = getTwilightWindow(new Date(eveningStr + 'T12:00:00'), -12);
  return hours.filter(h => h.time >= nightStart && h.time <= nightEnd);
}

function getTomorrowNightHours(hours) {
  if (!hours.length) return [];
  const nowH       = new Date().getHours();
  const dates      = [...new Set(hours.map(h => h.localDate))].sort();
  const todayStr   = hours.find(h => h.localHour === nowH)?.localDate || hours[0].localDate;
  const todayIdx   = dates.indexOf(todayStr);
  const eveningIdx = nowH < 6 ? todayIdx : todayIdx + 1;
  const tmrwStr    = dates[eveningIdx] || dates[dates.length - 1];
  const { nightStart, nightEnd } = getTwilightWindow(new Date(tmrwStr + 'T12:00:00'), -12);
  return hours.filter(h => h.time >= nightStart && h.time <= nightEnd);
}
```

- [ ] **Step 2: Verify the real window is used and looks right**

Open the Forecast tab in the browser. In DevTools console, run:

```js
getTwilightWindow(new Date(), -12)
```

Note the `nightStart`/`nightEnd` clock times (e.g. `21:15` to `04:50`, not `18:00`/`06:00`). Then run:

```js
State.fcNightHrs.length
State.fcNightHrs[0].time
State.fcNightHrs[State.fcNightHrs.length - 1].time
```

Expected: `State.fcNightHrs` is non-empty, and its first/last `.time` values fall inside (or very close to, given hourly data granularity) the `nightStart`/`nightEnd` window just printed — not at `18:00`/`06:00` unless that happens to coincide with real twilight at your location/date.

Also confirm the "Hourly Cloud Cover — Tonight" chart on the page still renders a sensible multi-hour curve (not empty, not a single point).

- [ ] **Step 3: Commit**

```bash
git add js/forecast.js
git commit -m "fix(forecast): use real nautical-twilight window instead of fixed 18:00-06:00"
```

---

### Task 3b: Fix stale "18:00–06:00" label in the Outlook card

**Added during implementation:** the Task 3 code-quality review found that `buildOutlookHTML()`'s card label hardcodes the literal string `"Tonight's Outlook · 18:00–06:00 ${tzLabel}"` (`js/forecast.js`, in `buildOutlookHTML`). Once Task 3 makes the underlying window a real nautical-twilight range, this label becomes actively misleading — e.g. it might say "18:00–06:00" while the badge above it is really scored over a 21:15–04:50 window. This wasn't caught during design because the original plan only asked for the *filtering* logic to change, not the display string; it's a direct consequence of Task 3, so it's fixed here rather than shipped as a known inaccuracy.

**Files:**
- Modify: `js/forecast.js` (`buildOutlookHTML` function and its call site)

- [ ] **Step 1: Make the Outlook card label reflect the real window**

Change `buildOutlookHTML`'s signature to accept the night-hours array, and derive the displayed clock range from the first/last hour actually used (already computed via the real twilight window in Task 3):

```js
/** Builds the "Tonight's Outlook" card HTML. */
function buildOutlookHTML(outlook, medians, tzLabel, nightHrs) {
  const fmt1 = v => v !== null ? Math.round(v) + '%'  : '—';
  const fmtT = v => v !== null ? Math.round(v) + '°C' : '—';
  const fmtW = v => v !== null ? (parseFloat(v) / 3.6).toFixed(1) + ' m/s' : '—';
  const fmtClock = d => d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:false });
  const windowLabel = nightHrs.length
    ? `${fmtClock(nightHrs[0].time)}–${fmtClock(nightHrs[nightHrs.length - 1].time)}`
    : '18:00–06:00';

  return `
    <div class="fc-outlook-card">
      <div class="fc-outlook-row">
        <div class="fc-outlook-icon">${outlook.icon}</div>
        <div class="fc-outlook-text">
          <div class="fc-outlook-label">Tonight's Outlook · ${windowLabel} ${tzLabel}</div>
          <div class="fc-outlook-value ${outlook.cls}">${outlook.label}</div>
          <div class="fc-outlook-sub">${outlook.sub}</div>
        </div>
      </div>
      <div class="fc-stats-grid">
        <div class="fc-stat-box"><div class="fc-stat-label">Cloud</div><div class="fc-stat-value">${fmt1(medians.tcdc)}</div><div class="fc-stat-sub">median tonight</div></div>
        <div class="fc-stat-box"><div class="fc-stat-label">Temp</div><div class="fc-stat-value">${fmtT(medians.tmp)}</div><div class="fc-stat-sub">2 m above ground</div></div>
        <div class="fc-stat-box"><div class="fc-stat-label">Humidity</div><div class="fc-stat-value">${fmt1(medians.rh)}</div><div class="fc-stat-sub">relative humidity</div></div>
        <div class="fc-stat-box"><div class="fc-stat-label">Wind</div><div class="fc-stat-value">${fmtW(medians.wspd)}</div><div class="fc-stat-sub">10 m surface wind</div></div>
      </div>
    </div>`;
}
```

Update the one call site inside `renderForecast()` from:

```js
buildOutlookHTML(outlook, medians, tzLabel) +
```

to:

```js
buildOutlookHTML(outlook, medians, tzLabel, nightHrs) +
```

(`nightHrs` is already an in-scope local in `renderForecast()` — it's the same array `getForecastNightHours()` returned, already used for `medians`, `outlook`, `computeSeeing`, etc.)

- [ ] **Step 2: Verify**

Serve the app locally, open the Forecast tab, and confirm the "Tonight's Outlook" card's label now shows a real clock range (e.g. "21:15–04:50 EDT") instead of the literal "18:00–06:00" string, and that it's consistent with the `getTwilightWindow(new Date(), -12)` values you'd get from the console. Confirm the "Tomorrow Night" card (which doesn't use `buildOutlookHTML`'s label — check `buildTomorrowCardHTML` isn't affected) still renders correctly since it's a separate template.

- [ ] **Step 3: Commit**

```bash
git add js/forecast.js
git commit -m "fix(forecast): show real twilight window in Outlook card label instead of hardcoded 18:00-06:00"
```

---

### Task 4: Outlook variability + precipitation cross-check

**Files:**
- Modify: `js/forecast.js:132-141`

- [ ] **Step 1: Replace `getOutlook`**

Replace this block in `js/forecast.js` (currently lines 132-141):

```js
function getOutlook(nightHours) {
  if (!nightHours.length) return { icon:'❓', label:'No Data', sub:'Forecast unavailable', cls:'partly' };
  const sorted = [...nightHours.map(h => h.tcdc ?? 0)].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (median <= 10) return { icon:'⭐', label:'Clear',         sub:'Excellent — minimal cloud cover expected',   cls:'clear'        };
  if (median <= 30) return { icon:'🌙', label:'Mostly Clear',  sub:'Good — occasional cloud possible',          cls:'mostly-clear' };
  if (median <= 55) return { icon:'⛅', label:'Partly Cloudy', sub:'Mixed — intermittent cloud cover',          cls:'partly'       };
  if (median <= 80) return { icon:'🌥', label:'Mostly Cloudy', sub:'Poor — cloud will interrupt viewing',       cls:'cloudy'       };
  return               { icon:'☁️', label:'Overcast',       sub:'Cloud cover will prevent observing tonight', cls:'cloudy'       };
}
```

with:

```js
// Median cloud cover picks the base bucket (thresholds unchanged: 10/30/
// 55/80). Two checks then run on top of that base bucket:
//   1. Precipitation cross-check — cloud cover and precip probability can
//      disagree in the model output (e.g. scattered convective showers
//      under otherwise low reported cloud). If precip is likely (>=50%
//      median) while cloud alone would say Clear/Mostly Clear, surface an
//      explicit "Unsettled" verdict instead of a falsely reassuring badge.
//   2. Variability check — a single median can't distinguish "clear until
//      1am, then socks in" from "steady 50% cloud all night." If at least
//      25% of night hours are clear (<=30%) AND at least 25% are cloudy
//      (>=70%), note it in the sub-text without changing the icon/label/
//      color, which stay anchored to the median.
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

  const precipMed     = forecastMedian(nightHours, 'precip_prob');
  const rainConflict   = precipMed != null && precipMed >= 50 && (base.cls === 'clear' || base.cls === 'mostly-clear');
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

- [ ] **Step 2: Verify with synthetic data in the browser console**

With the app served locally and the Forecast tab open, run each of these in DevTools console and check the result matches the expected verdict:

```js
// Steady clear night — base "Clear" bucket, no overrides.
getOutlook(Array.from({length: 12}, () => ({ tcdc: 5, precip_prob: 5 })))
```
Expected: `{ icon:'⭐', label:'Clear', sub:'Excellent — minimal cloud cover expected', cls:'clear' }`

```js
// Low cloud but high rain chance — precipitation cross-check should win.
getOutlook(Array.from({length: 12}, () => ({ tcdc: 8, precip_prob: 65 })))
```
Expected: `{ icon:'🌦', label:'Unsettled', sub:'65% chance of precipitation despite low reported cloud cover', cls:'partly' }`

```js
// Half the night clear, half cloudy — variability note, base bucket color unchanged.
const half = [
  ...Array.from({length: 6}, () => ({ tcdc: 5,  precip_prob: 0 })),
  ...Array.from({length: 6}, () => ({ tcdc: 90, precip_prob: 0 })),
];
getOutlook(half)
```
Expected: `sub: 'Variable — expect clear spells and cloudy stretches through the night'`, with `icon`/`label`/`cls` matching whatever the median of `[5,5,5,5,5,5,90,90,90,90,90,90]` resolves to under the base bucket logic. Note: with 12 elements, `sorted[Math.floor(12/2)]` indexes into the *cloudy* half (index 6, the first `90`), so the true base bucket is `{ icon:'☁️', label:'Overcast', cls:'cloudy' }`, not Clear as an earlier draft of this doc assumed — the variability sub-text override still fires correctly regardless of which base bucket it's layered on.

Then reload the Forecast tab normally (no synthetic data) and confirm "Tonight's Outlook" and "Tomorrow Night" badges still render with real forecast data, no console errors.

- [ ] **Step 3: Commit**

```bash
git add js/forecast.js
git commit -m "feat(forecast): add precipitation conflict and cloud-variability checks to Outlook"
```

---

### Task 5: Update CLAUDE.md documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add two new bullets to the "Key Conventions" section**

In `CLAUDE.md`, find the bullet starting with `- **Graceful scoring fallback**:` (in the "Key Conventions" section, after "Transparency scoring"). Insert these two new bullets immediately **before** it:

```markdown
- **Forecast night window**: `getForecastNightHours()` / `getTomorrowNightHours()` no longer use a fixed 18:00–06:00 clock window. They call the shared `getTwilightWindow(date, sunAltDeg)` helper in `state.js` (also backing `getNightWindow()` for Planets/Events at -18° and `_nauticalNight()` for Messier at -12°) at nautical twilight (-12°), so "tonight" is the real sunset-to-sunrise dark window at the observer's location and date. All four Astronomy Conditions badges (Outlook, Seeing, Transparency, Dew Risk) inherit this window since they share the same `nightHrs` array. Falls back to the old 18:00/06:00 default automatically at latitudes with no true nautical dark (e.g. high-latitude summer).
- **Outlook cloud scoring**: `getOutlook()`'s five median-cloud-cover buckets (10/30/55/80, unchanged) get two checks layered on top of the base bucket: (1) a precipitation cross-check — if the night's median precipitation probability is ≥50% while the cloud-based verdict would be Clear/Mostly Clear, the badge becomes "Unsettled 🌦" instead, since cloud cover and precip probability can disagree in the model output; (2) a variability check — if at least 25% of night hours are clear (≤30% cloud) *and* at least 25% are cloudy (≥70% cloud), the sub-text notes "Variable" conditions without changing the icon/label/color, which stay driven by the median.
```

- [ ] **Step 2: Verify the doc renders sensibly**

Read the edited section back (`Read` the file or `git diff CLAUDE.md`) and confirm the new bullets sit in the right place, use consistent Markdown bullet formatting with their neighbors, and don't duplicate content already stated elsewhere in the file.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): document nautical-twilight forecast window and Outlook checks"
```

---

### Task 6: Bump service worker cache version

**Files:**
- Modify: `sw.js:1`

- [ ] **Step 1: Bump `CACHE`**

Change line 1 of `sw.js` from:

```js
const CACHE = 'night-sky-v47';
```

to:

```js
const CACHE = 'night-sky-v48';
```

- [ ] **Step 2: Verify**

Run `git diff sw.js` and confirm only the version string changed (no accidental edits to the `ASSETS` array — this task adds no new files, so `ASSETS` should be untouched).

- [ ] **Step 3: Commit**

```bash
git add sw.js
git commit -m "chore(sw): bump cache to v48 for forecast clear-sky rework"
```

---

### Task 7: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Full Forecast tab smoke test**

With the app served locally (`npx serve .`) and a real or fallback location available, open the app in Chrome, go to the Forecast tab, and confirm:
- "Current Conditions" and "Tonight's Outlook" cards render with real values (no `—` placeholders unless the API genuinely lacks that field).
- "Astronomy Conditions" shows Seeing, Transparency, Dew Risk, and Precip. Chance all populated.
- "Tomorrow Night" card renders a badge and (if ≥2 hours of data available) a chart.
- DevTools console shows no errors during load.

- [ ] **Step 2: Cross-tab regression check**

Open the Planets tab and the Messier tab. Confirm Planets still shows Sunset/Dark/Dawn/Sunrise times and rise/set/transit tables, and Messier still shows its object list with visibility info — neither should look different from before this change (Task 1/2 were refactors with no intended behavior change for these tabs).

- [ ] **Step 3: Final confirmation**

No commit needed for this task — it's a verification-only gate confirming Tasks 1-6 are correct together. If anything looks wrong, stop and investigate before considering the plan complete.
