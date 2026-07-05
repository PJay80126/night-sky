# Forecast Statistical Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four statistical-summarization flaws in the Forecast tab (per-hour Ri, peak precip, dawn-aware dew risk, null-cloud guard) per `docs/superpowers/specs/2026-07-05-forecast-stat-fixes-design.md`.

**Architecture:** All logic changes live in `js/forecast.js`; CLAUDE.md and `sw.js` get doc/version updates. No new API variables, no HTML/CSS changes beyond card sub-text strings.

**Tech Stack:** Vanilla JS, no build step, no test suite — verification via `node --check` plus a Node `vm` smoke test driving the real files.

---

### Task 1: `forecastMax` helper

**Files:** Modify `js/forecast.js` (beside `forecastMedian`, ~line 642)

- [ ] Add:

```js
/** Returns the maximum value of a numeric field across an array of hour objects. */
function forecastMax(arr, key) {
  const vals = arr.map(h => h[key]).filter(v => v !== null && v !== undefined);
  return vals.length ? Math.max(...vals) : null;
}
```

- [ ] `node --check js/forecast.js` → OK
- [ ] Commit: `feat(forecast): add forecastMax helper`

### Task 2: per-hour Richardson numbers in `computeSeeing`

**Files:** Modify `js/forecast.js` (`computeSeeing`, ~lines 296–369)

- [ ] Replace the four `temps/winds/dirs/heights` median blocks and the
  median-fed `riByLayer` mapping with per-hour Ri + per-layer median:

```js
function computeSeeing(nightHrs) {
  // Bulk Ri is computed PER HOUR for each layer pair, then summarized as
  // the nightly median per layer. Summarize-last (not summarize-first)
  // because wind direction is circular — a sorted median of degree values
  // near north is meaningless — and Ri is nonlinear in the shear term
  // (ΔU²), so Ri-of-median-inputs diverges from the typical hourly Ri
  // whenever the jet strengthens or veers overnight.
  const pairs = [
    { name: 'upper',    lo: 500,  hi: 250  },
    { name: 'mid',      lo: 850,  hi: 500  },
    { name: 'boundary', lo: 1000, hi: 850  },
  ];

  const riByLayer = pairs.map(p => {
    const hourly = nightHrs
      .map(h => _bulkRichardson({
        tLo: h['temp' + p.lo], tHi: h['temp' + p.hi],
        wLo: h['wind' + p.lo], wHi: h['wind' + p.hi],
        dLo: h['wdir' + p.lo], dHi: h['wdir' + p.hi],
        zLo: h['z' + p.lo],    zHi: h['z' + p.hi],
        pLo: p.lo,             pHi: p.hi,
      }))
      .filter(ri => ri != null);
    if (!hourly.length) return { name: p.name, ri: null };
    // Explicit three-way compare: hourly Ri may contain Infinity, and
    // (a, b) => a - b yields NaN for Infinity - Infinity.
    const s = [...hourly].sort((a, b) => a === b ? 0 : (a < b ? -1 : 1));
    return { name: p.name, ri: s[Math.floor(s.length / 2)] };
  });
  // ... haveRi block onward unchanged ...
```

- [ ] `node --check js/forecast.js` → OK
- [ ] Commit: `feat(forecast): compute Ri per hour, median per layer`

### Task 3: peak-precip cross-check and badge

**Files:** Modify `js/forecast.js` (`getOutlook` ~line 156, `renderForecast` ~line 843, `buildAstroConditionsHTML` ~line 724)

- [ ] In `getOutlook`, replace the median cross-check:

```js
  const precipPeak  = forecastMax(nightHours, 'precip_prob');
  const rainConflict = precipPeak != null && precipPeak >= 50 && (base.cls === 'clear' || base.cls === 'mostly-clear');
  if (rainConflict) {
    return { icon:'🌦', label:'Unsettled', sub:`Up to ${Math.round(precipPeak)}% chance of precipitation despite low reported cloud cover`, cls:'partly' };
  }
```

- [ ] In `renderForecast`, replace `const precipMed = forecastMedian(nightHrs, 'precip_prob');`
  with `const precipPeak = forecastMax(nightHrs, 'precip_prob');` and pass
  `precipPeak` to `buildAstroConditionsHTML`.
- [ ] In `buildAstroConditionsHTML`, rename the parameter to `precipPeak`
  (thresholds <20/<50 unchanged) and change the card value line to
  `${precipPeak !== null ? Math.round(precipPeak) + '%' : '—'} peak tonight`.
- [ ] Update the comment above `getOutlook` (median → peak wording).
- [ ] `node --check js/forecast.js` → OK
- [ ] Commit: `feat(forecast): score precipitation by nightly peak, not median`

### Task 4: dawn-aware dew risk

**Files:** Modify `js/forecast.js` (`getDewRisk` ~line 403, call site ~line 849)

- [ ] Replace `getDewRisk`:

```js
// Dew risk peaks near dawn as the temp–dew spread bottoms out, so score
// the nightly MINIMUM spread rather than a whole-night median (which
// under-reports the pre-dawn RH maximum). Falls back to peak RH when
// spread data is missing; thresholds there are shifted up versus the old
// median-RH cutoffs because a peak statistic runs higher by construction.
function getDewRisk(nightHrs) {
  const spreads = nightHrs
    .map(h => (h.tmp != null && h.dewp != null) ? h.tmp - h.dewp : null)
    .filter(v => v != null);
  if (spreads.length) {
    const minSpread = Math.min(...spreads);
    const txt = `min spread ${minSpread.toFixed(1)}°C`;
    if (minSpread > 5) return { label:'Low',       cls:'good', text: txt };
    if (minSpread > 3) return { label:'Moderate',  cls:'warn', text: txt };
    if (minSpread > 1) return { label:'High',      cls:'warn', text:`${txt} — monitor optics` };
    return                    { label:'Very High', cls:'poor', text:`${txt} — dew likely` };
  }
  const rhPeak = forecastMax(nightHrs, 'rh');
  if (rhPeak == null)  return { label:'Unknown',   cls:'warn', text:'No humidity data' };
  if (rhPeak < 70)     return { label:'Low',       cls:'good', text:`peak ${Math.round(rhPeak)}% RH` };
  if (rhPeak < 85)     return { label:'Moderate',  cls:'warn', text:`peak ${Math.round(rhPeak)}% RH` };
  if (rhPeak < 95)     return { label:'High',      cls:'warn', text:`peak ${Math.round(rhPeak)}% RH — monitor optics` };
  return                      { label:'Very High', cls:'poor', text:`peak ${Math.round(rhPeak)}% RH — dew likely` };
}
```

- [ ] Call site: `const dew = getDewRisk(nightHrs);`
- [ ] `node --check js/forecast.js` → OK
- [ ] Commit: `feat(forecast): score dew risk from minimum temp-dew spread`

### Task 5: null-cloud guard in `getOutlook`

**Files:** Modify `js/forecast.js` (`getOutlook` ~line 145)

- [ ] Replace the cloud-array construction:

```js
  const clouds = nightHours.map(h => h.tcdc).filter(v => v != null);
  if (!clouds.length) return { icon:'❓', label:'No Data', sub:'Cloud forecast unavailable', cls:'partly' };
```

  (`pctClear`/`pctCloudy` already read from `clouds`, so they inherit the
  filtered array with no further change.)
- [ ] `node --check js/forecast.js` → OK
- [ ] Commit: `fix(forecast): drop null cloud hours instead of counting them clear`

### Task 6: docs + cache bump

**Files:** Modify `CLAUDE.md`, `sw.js`

- [ ] CLAUDE.md Seeing bullet: replace "Badges use nightly medians over the
  real nautical-twilight window…" wording with per-hour-Ri/median-per-layer
  wording. Outlook bullet: precip cross-check is the nightly **peak** ≥50%;
  note the null-cloud guard. Add a sentence covering the dew-risk
  min-spread convention and peak-precip badge.
- [ ] `sw.js`: `CACHE = 'night-sky-v48'` → `'night-sky-v49'`.
- [ ] Commit: `docs(claude): document stat-fix conventions; chore(sw): bump to v49`

### Task 7: end-to-end verification

- [ ] `node --check` on `js/forecast.js`, `js/state.js` (untouched, sanity).
- [ ] Extend the scratchpad `vm` smoke test (real files from this worktree):
  seeing computes on HRDPS path; Outlook No-Data on all-null cloud;
  mixed-null cloud median undiluted (6 nulls + 6×90 → Overcast);
  single-hour precip spike (11×0 + 1×80, cloud 5) → Unsettled "Up to 80%";
  dew Very High on dawn spread collapse (spreads 8→0.5); dew RH fallback
  (no tmp/dewp, rh peak 96 → Very High); `forecastMax` null on empty;
  full `renderForecast`-style pipeline still assembles all cards.
- [ ] All checks pass → done; hand off to finishing-a-development-branch.
