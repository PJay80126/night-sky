# Richardson-Number Seeing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CSC-style weighted seeing score in `js/forecast.js`
with a bulk Richardson-Number model computed across three HRDPS pressure
layer pairs, with the existing surface-only path preserved as the
HRDPS-unavailable fallback.

**Architecture:** Add 11 new HRDPS pressure-level variables to the fetch,
extend `parseForecast` row shape, introduce four pure helpers
(`_potentialTemp`, `_uvFrom`, `_bulkRichardson`, `_riBucket`), rewrite
`computeSeeing` to use minimum Ri across layers when data is present and
fall back to surface wind when not. Remove the three CSC helpers that are
no longer reachable. Update CLAUDE.md to document the pipeline and its
four tunables. Bump SW cache.

**Tech Stack:** Vanilla JS (no build step), Open-Meteo `gem_hrdps_continental`
model, service-worker cached PWA. Verification via `node -e` for pure math
helpers and browser reload for the Forecast tab.

**Restartability:** Each task ends with a commit + push. A fresh session
can resume by reading this plan (checked boxes show progress) and running
`git log --oneline` to confirm which commits have landed.

**Spec:** `docs/superpowers/specs/2026-04-23-richardson-seeing-design.md`

---

## Task 1: Add new HRDPS pressure-level variables to fetch

**Files:**
- Modify: `js/forecast.js` — the `_UPPER_AIR_VARS` array (lines 13–18 in
  the pre-change file)

- [ ] **Step 1: Edit `_UPPER_AIR_VARS`**

Replace the current contents of `_UPPER_AIR_VARS` with the full list
including the new variables. Final form:

```js
// Upper-air variables needed for Richardson-Number seeing. HRDPS only.
const _UPPER_AIR_VARS = [
  // Winds at four pressure levels (speed + direction)
  'wind_speed_250hPa','wind_speed_500hPa','wind_speed_850hPa','wind_speed_1000hPa',
  'wind_direction_250hPa','wind_direction_500hPa','wind_direction_850hPa','wind_direction_1000hPa',
  // Temperatures at all four levels (need 250 and 1000 for end-of-column Ri pairs)
  'temperature_250hPa','temperature_500hPa','temperature_850hPa','temperature_1000hPa',
  // Geopotential heights — real layer thicknesses, not standard-atmosphere estimates
  'geopotential_height_250hPa','geopotential_height_500hPa','geopotential_height_850hPa','geopotential_height_1000hPa',
  // Still used by transparency scoring
  'relative_humidity_500hPa','cape',
];
```

- [ ] **Step 2: Probe the API to confirm all variables return data**

Run (one line):

```bash
curl -s "https://api.open-meteo.com/v1/forecast?latitude=45.4&longitude=-75.7&forecast_days=1&hourly=wind_speed_250hPa,wind_speed_500hPa,wind_speed_850hPa,wind_speed_1000hPa,wind_direction_250hPa,wind_direction_500hPa,wind_direction_850hPa,wind_direction_1000hPa,temperature_250hPa,temperature_500hPa,temperature_850hPa,temperature_1000hPa,geopotential_height_250hPa,geopotential_height_500hPa,geopotential_height_850hPa,geopotential_height_1000hPa,relative_humidity_500hPa,cape&models=gem_hrdps_continental" | head -c 400
```

Expected: JSON starts with `{"latitude":…` and `"hourly_units"` block
includes every variable. No `"error"` field.

- [ ] **Step 3: Commit and push**

```bash
git add js/forecast.js
git commit -m "feat(forecast): expand HRDPS fetch for Richardson-Number seeing

Adds wind direction at 4 levels, temperature at 250/1000 hPa, and
geopotential height at 4 levels so the upcoming Ri-based seeing model
can compute bulk Richardson across the upper/mid/boundary layer pairs
using real HRDPS heights instead of standard-atmosphere estimates."
git push
```

---

## Task 2: Extend `parseForecast()` row shape

**Files:**
- Modify: `js/forecast.js` — `parseForecast()` function (lines 58–84 in
  the pre-change file)

- [ ] **Step 1: Extend the returned row shape**

Replace the current `parseForecast` function with:

```js
function parseForecast(data) {
  const h = data.hourly;
  const get = (key, i) => (h[key] ? h[key][i] : null);
  return h.time.map((t, i) => ({
    time:        new Date(t),
    localHour:   parseInt(t.slice(11, 13), 10),
    localDate:   t.slice(0, 10),
    tcdc:        get('cloud_cover', i),
    lcdc:        get('cloud_cover_low', i),
    mcdc:        get('cloud_cover_mid', i),
    hcdc:        get('cloud_cover_high', i),
    tmp:         get('temperature_2m', i),
    dewp:        get('dew_point_2m', i),
    rh:          get('relative_humidity_2m', i),
    wspd:        get('wind_speed_10m', i),
    precip_prob: get('precipitation_probability', i),
    // HRDPS pressure-level fields — null when in fallback mode.
    // Winds in km/h, directions in degrees, temperatures in °C, heights in m.
    wind250:     get('wind_speed_250hPa', i),
    wind500:     get('wind_speed_500hPa', i),
    wind850:     get('wind_speed_850hPa', i),
    wind1000:    get('wind_speed_1000hPa', i),
    wdir250:     get('wind_direction_250hPa', i),
    wdir500:     get('wind_direction_500hPa', i),
    wdir850:     get('wind_direction_850hPa', i),
    wdir1000:    get('wind_direction_1000hPa', i),
    temp250:     get('temperature_250hPa', i),
    temp500:     get('temperature_500hPa', i),
    temp850:     get('temperature_850hPa', i),
    temp1000:    get('temperature_1000hPa', i),
    z250:        get('geopotential_height_250hPa', i),
    z500:        get('geopotential_height_500hPa', i),
    z850:        get('geopotential_height_850hPa', i),
    z1000:       get('geopotential_height_1000hPa', i),
    rh500:       get('relative_humidity_500hPa', i),
    cape:        get('cape', i),
  }));
}
```

- [ ] **Step 2: Verify no existing reader broke**

Run:

```bash
grep -n -E "\.(temp850|temp500|wind250|wind500|wind850|rh500|cape)" js/forecast.js js/main.js js/state.js js/planets.js 2>/dev/null
```

Expected: only `js/forecast.js` references these fields (inside
`computeSeeing` and `computeTransparency`). If other files reference them,
stop and investigate.

- [ ] **Step 3: Commit and push**

```bash
git add js/forecast.js
git commit -m "feat(forecast): extend parseForecast row shape for Ri inputs

Passes the new HRDPS pressure-level fields (winds+directions+temps+
geopotential heights at 4 levels) through to each hour record so the
Ri seeing helpers can consume them."
git push
```

---

## Task 3: Add `_potentialTemp()` helper

**Files:**
- Modify: `js/forecast.js` — insert a new `// ── Richardson-Number helpers`
  section just *above* the `function _weightedScore` block (around line
  200 pre-change). Keep it separate from the old `_scoreXxx` helpers so
  the subsequent deletion of those is a clean block removal.

- [ ] **Step 1: Insert the section header and the first helper**

Add before `function _weightedScore(entries)`:

```js
// ── Richardson-Number seeing helpers ───────────────────────────────────
// Potential temperature θ = T·(P0/P)^(R/cp). P0 = 1000 hPa, R/cp = 2/7
// for dry air. Input in °C, output in Kelvin. θ removes the adiabatic
// cooling a lifted parcel gets purely from expansion, so dθ/dz measures
// real static stability — unlike raw dT/dz, which looks unstable
// everywhere because T always drops with altitude.
function _potentialTemp(tC, pHpa) {
  if (tC == null || pHpa == null) return null;
  const tK = tC + 273.15;
  return tK * Math.pow(1000 / pHpa, 2 / 7);
}
```

- [ ] **Step 2: Verify with node**

Run:

```bash
node -e "function _potentialTemp(tC,pHpa){if(tC==null||pHpa==null)return null;return (tC+273.15)*Math.pow(1000/pHpa,2/7);} const cases=[[15,1000,288.15],[-50,250,331.0],[0,500,333.0],[15,850,302.4]]; for(const [t,p,exp] of cases){const got=_potentialTemp(t,p); console.log('theta('+t+'C,'+p+'hPa)=',got.toFixed(2),'K  expected≈',exp);}"
```

Expected lines (tolerance ±0.2 K):
- `theta(15C,1000hPa)= 288.15 K  expected≈ 288.15`
- `theta(-50C,250hPa)= 331.05 K  expected≈ 331.0`
- `theta(0C,500hPa)= 333.20 K  expected≈ 333.0`
- `theta(15C,850hPa)= 302.49 K  expected≈ 302.4`

- [ ] **Step 3: Commit and push**

```bash
git add js/forecast.js
git commit -m "feat(forecast): add _potentialTemp helper

Converts temperature (°C) at a given pressure level (hPa) into potential
temperature (K). Used by the upcoming bulk Richardson computation to
measure static stability correctly across layers."
git push
```

---

## Task 4: Add `_uvFrom()` helper

**Files:**
- Modify: `js/forecast.js` — insert after `_potentialTemp` in the Ri
  helpers section.

- [ ] **Step 1: Add the helper**

Insert immediately below `_potentialTemp`:

```js
// Wind (speed in km/h, meteorological direction in degrees — the
// direction wind blows *from*) to u,v components in m/s. Convention:
// u is east-positive, v is north-positive. The Ri shear term needs
// the vector magnitude of the wind *difference* between two layers,
// not the scalar speed difference, because wind direction rotates
// with altitude and scalar differences under-count the real shear.
function _uvFrom(speedKmh, dirDeg) {
  if (speedKmh == null || dirDeg == null) return null;
  const ms  = speedKmh / 3.6;
  const rad = dirDeg * Math.PI / 180;
  // "From" direction: a wind *from* the north blows *toward* the south,
  // so the vector points opposite to the compass bearing.
  return { u: -ms * Math.sin(rad), v: -ms * Math.cos(rad) };
}
```

- [ ] **Step 2: Verify with node**

Run:

```bash
node -e "function _uvFrom(s,d){if(s==null||d==null)return null;const ms=s/3.6,r=d*Math.PI/180;return {u:-ms*Math.sin(r),v:-ms*Math.cos(r)};} const cases=[[36,0,'N wind → v≈-10 u≈0'],[36,90,'E wind → u≈-10 v≈0'],[36,180,'S wind → v≈+10 u≈0'],[36,270,'W wind → u≈+10 v≈0']]; for(const [s,d,note] of cases){const r=_uvFrom(s,d); console.log(note,'| got u=',r.u.toFixed(2),'v=',r.v.toFixed(2));}"
```

Expected:
- `N wind → v≈-10 u≈0 | got u= 0.00 v= -10.00` (wind from N pushes south)
- `E wind → u≈-10 v≈0 | got u= -10.00 v= 0.00` (wind from E pushes west)
- `S wind → v≈+10 u≈0 | got u= -0.00 v= 10.00`
- `W wind → u≈+10 v≈0 | got u= 10.00 v= 0.00`

- [ ] **Step 3: Commit and push**

```bash
git add js/forecast.js
git commit -m "feat(forecast): add _uvFrom wind-vector helper

Converts (speed km/h, meteorological direction °) to (u, v) in m/s
using the east/north convention. Required for vector wind-shear in
bulk Richardson — scalar speed differences under-count shear when
direction rotates with altitude."
git push
```

---

## Task 5: Add `_bulkRichardson()` helper

**Files:**
- Modify: `js/forecast.js` — insert after `_uvFrom`.

- [ ] **Step 1: Add the helper**

Insert immediately below `_uvFrom`:

```js
// Bulk Richardson number for a layer between two pressure levels.
// Ri = (g · Δθ · Δz) / (θ̄ · ΔU²)
// Equivalent: (g/θ̄)·(Δθ/Δz) / (ΔU/Δz)² — buoyancy gradient over
// squared shear gradient. Ri > 0.25 ⇒ dynamically stable (laminar),
// Ri < 0.25 ⇒ shear overcomes buoyancy and the layer generates
// turbulence (Miles-Howard theorem). Returns null if any input is
// missing, +Infinity for effectively zero shear.
function _bulkRichardson({ tLo, tHi, wLo, wHi, dLo, dHi, zLo, zHi, pLo, pHi }) {
  if (tLo == null || tHi == null || zLo == null || zHi == null) return null;
  const thLo = _potentialTemp(tLo, pLo);
  const thHi = _potentialTemp(tHi, pHi);
  const vLo  = _uvFrom(wLo, dLo);
  const vHi  = _uvFrom(wHi, dHi);
  if (thLo == null || thHi == null || vLo == null || vHi == null) return null;
  const dz    = zHi - zLo;                                // m (always >0, higher level has larger z)
  if (dz <= 0) return null;
  const du    = vHi.u - vLo.u;
  const dv    = vHi.v - vLo.v;
  const dU    = Math.sqrt(du * du + dv * dv);             // m/s
  const dTh   = thHi - thLo;                              // K (positive when stably stratified)
  const thBar = 0.5 * (thLo + thHi);                      // K
  const G     = 9.80665;                                  // m/s²
  if (dU < 1e-2) return Infinity;                         // laminar flow
  return (G * dTh * dz) / (thBar * dU * dU);
}
```

- [ ] **Step 2: Verify with node**

Run (all one line, wrapped for readability):

```bash
node -e "
function _potentialTemp(tC,pHpa){if(tC==null||pHpa==null)return null;return (tC+273.15)*Math.pow(1000/pHpa,2/7);}
function _uvFrom(s,d){if(s==null||d==null)return null;const ms=s/3.6,r=d*Math.PI/180;return {u:-ms*Math.sin(r),v:-ms*Math.cos(r)};}
function _bulkRichardson({tLo,tHi,wLo,wHi,dLo,dHi,zLo,zHi,pLo,pHi}){if(tLo==null||tHi==null||zLo==null||zHi==null)return null;const thLo=_potentialTemp(tLo,pLo),thHi=_potentialTemp(tHi,pHi);const vLo=_uvFrom(wLo,dLo),vHi=_uvFrom(wHi,dHi);if(thLo==null||thHi==null||vLo==null||vHi==null)return null;const dz=zHi-zLo;if(dz<=0)return null;const du=vHi.u-vLo.u,dv=vHi.v-vLo.v,dU=Math.sqrt(du*du+dv*dv),dTh=thHi-thLo,thBar=0.5*(thLo+thHi),G=9.80665;if(dU<1e-2)return Infinity;return (G*dTh*dz)/(thBar*dU*dU);}
// Case 1: stable calm — temps rise with altitude (warm aloft), weak shear → large Ri
console.log('stable/calm:', _bulkRichardson({tLo:0,tHi:-5,wLo:5,wHi:10,dLo:270,dHi:270,zLo:1500,zHi:5500,pLo:850,pHi:500}).toFixed(2));
// Case 2: strong jet shear aloft → small or negative Ri
console.log('jet shear:',   _bulkRichardson({tLo:-5,tHi:-55,wLo:20,wHi:200,dLo:270,dHi:270,zLo:5500,zHi:10400,pLo:500,pHi:250}).toFixed(2));
// Case 3: isothermal zero-shear edge case
console.log('zero shear:',  _bulkRichardson({tLo:0,tHi:-20,wLo:10,wHi:10,dLo:270,dHi:270,zLo:1500,zHi:5500,pLo:850,pHi:500}));
// Case 4: missing input
console.log('missing:',     _bulkRichardson({tLo:null,tHi:-5,wLo:5,wHi:10,dLo:270,dHi:270,zLo:1500,zHi:5500,pLo:850,pHi:500}));
"
```

Expected:
- `stable/calm:` a large positive number (> 10) — layer is strongly stable
- `jet shear:` a small positive number, typically < 1 — strong shear
  relative to a modest Δθ drops Ri toward or below 0.25
- `zero shear: Infinity`
- `missing: null`

- [ ] **Step 3: Commit and push**

```bash
git add js/forecast.js
git commit -m "feat(forecast): add _bulkRichardson layer-pair helper

Computes Ri = (g · Δθ · Δz) / (θ̄ · ΔU²) for a layer between two
pressure levels. Uses vector wind-shear, potential temperature, and
HRDPS geopotential heights for real layer thickness. Returns null for
missing inputs and +Infinity for zero-shear layers so the min-Ri
summary treats them as laminar."
git push
```

---

## Task 6: Add `_riBucket()` helper

**Files:**
- Modify: `js/forecast.js` — insert after `_bulkRichardson`.

- [ ] **Step 1: Add the helper**

Insert immediately below `_bulkRichardson`:

```js
// Map minimum Ri across the column to the Astronomy Conditions badge.
// 0.25 = Miles-Howard critical threshold (not tunable — it's the
// proven dynamic stability boundary). 1.0, 0.5, 0.1 are tunable knobs
// (see CLAUDE.md "Seeing / Richardson-Number tunables").
function _riBucket(minRi) {
  if (minRi == null)         return { label:'Unknown',   cls:'warn' };
  if (minRi >= 1.0)          return { label:'Excellent', cls:'good' };
  if (minRi >= 0.5)          return { label:'Good',      cls:'good' };
  if (minRi >= 0.25)         return { label:'Fair',      cls:'warn' };
  if (minRi >= 0.1)          return { label:'Poor',      cls:'poor' };
  return                            { label:'Very Poor', cls:'poor' };
}
```

- [ ] **Step 2: Verify with node**

Run:

```bash
node -e "
function _riBucket(r){if(r==null)return {label:'Unknown',cls:'warn'};if(r>=1.0)return {label:'Excellent',cls:'good'};if(r>=0.5)return {label:'Good',cls:'good'};if(r>=0.25)return {label:'Fair',cls:'warn'};if(r>=0.1)return {label:'Poor',cls:'poor'};return {label:'Very Poor',cls:'poor'};}
for (const r of [null,2.0,1.0,0.99,0.5,0.26,0.25,0.24,0.1,0.09,-0.5,Infinity]) console.log(String(r).padStart(10),'→',_riBucket(r).label);
"
```

Expected:
- `null → Unknown`
- `2 → Excellent`, `1 → Excellent`, `0.99 → Good`, `0.5 → Good`,
- `0.26 → Fair`, `0.25 → Fair`, `0.24 → Poor`,
- `0.1 → Poor`, `0.09 → Very Poor`, `-0.5 → Very Poor`,
- `Infinity → Excellent`

- [ ] **Step 3: Commit and push**

```bash
git add js/forecast.js
git commit -m "feat(forecast): add _riBucket badge-mapping helper

Maps minimum Ri across the column to the existing 5-bucket
Excellent/Good/Fair/Poor/Very Poor labels with the same CSS classes
already used by transparency and dew-risk. 0.25 boundary is
Miles-Howard; the other thresholds are explicitly tunable."
git push
```

---

## Task 7: Rewrite `computeSeeing()` to use Ri with surface fallback

**Files:**
- Modify: `js/forecast.js` — replace the entire `computeSeeing(nightHrs)`
  function (lines 216–246 in the pre-change file).

- [ ] **Step 1: Replace `computeSeeing`**

Replace with:

```js
function computeSeeing(nightHrs) {
  // Compute nightly medians for every field Ri needs.
  const temps = {
    250:  forecastMedian(nightHrs, 'temp250'),
    500:  forecastMedian(nightHrs, 'temp500'),
    850:  forecastMedian(nightHrs, 'temp850'),
    1000: forecastMedian(nightHrs, 'temp1000'),
  };
  const winds = {
    250:  forecastMedian(nightHrs, 'wind250'),
    500:  forecastMedian(nightHrs, 'wind500'),
    850:  forecastMedian(nightHrs, 'wind850'),
    1000: forecastMedian(nightHrs, 'wind1000'),
  };
  const dirs = {
    250:  forecastMedian(nightHrs, 'wdir250'),
    500:  forecastMedian(nightHrs, 'wdir500'),
    850:  forecastMedian(nightHrs, 'wdir850'),
    1000: forecastMedian(nightHrs, 'wdir1000'),
  };
  const heights = {
    250:  forecastMedian(nightHrs, 'z250'),
    500:  forecastMedian(nightHrs, 'z500'),
    850:  forecastMedian(nightHrs, 'z850'),
    1000: forecastMedian(nightHrs, 'z1000'),
  };

  const pairs = [
    { name: 'upper',    lo: 500,  hi: 250  },
    { name: 'mid',      lo: 850,  hi: 500  },
    { name: 'boundary', lo: 1000, hi: 850  },
  ];

  const riByLayer = pairs.map(p => ({
    name: p.name,
    ri:   _bulkRichardson({
      tLo: temps[p.lo],   tHi: temps[p.hi],
      wLo: winds[p.lo],   wHi: winds[p.hi],
      dLo: dirs[p.lo],    dHi: dirs[p.hi],
      zLo: heights[p.lo], zHi: heights[p.hi],
      pLo: p.lo,          pHi: p.hi,
    }),
  }));

  const haveRi = riByLayer.some(r => r.ri != null);

  if (haveRi) {
    const validRi = riByLayer.filter(r => r.ri != null);
    const minRi   = Math.min(...validRi.map(r => r.ri));
    const turb    = validRi.filter(r => r.ri < 0.25).map(r => r.name);
    const bucket  = _riBucket(minRi);
    const riLabel = !isFinite(minRi) ? '∞' : minRi.toFixed(2);
    const tail    = turb.length ? `turbulent: ${turb.join(', ')}` : 'all layers stable';
    return {
      ...bucket,
      text:        `Min Ri ${riLabel} · ${tail}`,
      score:       minRi,
      hasUpperAir: true,
    };
  }

  // Surface-only fallback — preserved from pre-Ri code so locations
  // outside the HRDPS domain (or during an HRDPS outage) still get a
  // usable Seeing badge rather than "No data".
  const sfc = forecastMedian(nightHrs, 'wspd');
  const score = _weightedScore([
    { score: _scoreSurfaceWind(sfc), weight: 1.0 },
  ]);
  const bucket = _scoreBucket(score);
  const text = sfc != null
    ? `Surface wind ${(sfc / 3.6).toFixed(1)} m/s · surface-only`
    : (score == null ? 'No data' : 'Limited data');
  return { ...bucket, text, score, hasUpperAir: false };
}
```

- [ ] **Step 2: Start a local server and reload the forecast tab**

In one shell:

```bash
npx serve . -p 8080
```

Open `http://localhost:8080/` in a browser, allow location (or use your
normal location), switch to the Forecast tab, and watch the Seeing badge
in the Astronomy Conditions card.

Expected on an HRDPS-covered location (e.g. your normal Canadian
latitude): badge shows one of Excellent/Good/Fair/Poor/Very Poor and
the text line matches `Min Ri X.XX · turbulent: <names>` or
`Min Ri X.XX · all layers stable`.

If you want to force the fallback path to verify it still works, open
DevTools > Network, set the `gem_hrdps_continental` request to "block
URL", reload, confirm Seeing badge shows `Surface wind X.X m/s ·
surface-only`. Then remove the block.

- [ ] **Step 3: Commit and push**

```bash
git add js/forecast.js
git commit -m "feat(forecast): replace CSC seeing score with Richardson model

computeSeeing now computes bulk Ri across three HRDPS layer pairs
(250<->500, 500<->850, 850<->1000 hPa) using vector wind shear,
potential temperature, and real geopotential heights. The min Ri
across the column maps to the existing 5-bucket badge and the text
line names any turbulent layers. Surface-only fallback is retained
verbatim for the HRDPS-unavailable path."
git push
```

---

## Task 8: Delete dead CSC helpers

**Files:**
- Modify: `js/forecast.js` — remove `_scoreJetWind`, `_scoreMidWind`,
  `_scoreLapseRate` (currently lines 136–163 in the pre-change file).

- [ ] **Step 1: Verify they are now unreachable**

Run:

```bash
grep -n -E "_scoreJetWind|_scoreMidWind|_scoreLapseRate" js/forecast.js js/main.js js/state.js 2>/dev/null
```

Expected: only `js/forecast.js` returns matches, all of them function
*definitions* (no call sites). If you see call sites, stop — Task 7 is
incomplete.

- [ ] **Step 2: Delete the three helpers**

Remove the three `function _scoreJetWind(kmh){…}`, `function
_scoreMidWind(kmh){…}`, `function _scoreLapseRate(t850, t500){…}` blocks
in full. Keep `_scoreSurfaceWind` (still used by fallback),
`_scoreMidRH`, `_scoreCloud`, `_scoreDewSpread` (all used by
transparency), `_weightedScore`, and `_scoreBucket`.

- [ ] **Step 3: Grep to confirm clean removal**

```bash
grep -n -E "_scoreJetWind|_scoreMidWind|_scoreLapseRate" js/forecast.js
```

Expected: no matches (exit code 1 from ripgrep is fine here).

- [ ] **Step 4: Commit and push**

```bash
git add js/forecast.js
git commit -m "chore(forecast): remove unreachable CSC seeing helpers

_scoreJetWind, _scoreMidWind, and _scoreLapseRate are no longer called
now that computeSeeing uses Richardson-Number scoring. _scoreSurfaceWind
is kept — it backs the surface-only fallback."
git push
```

---

## Task 9: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` — replace the `- **Seeing / Transparency
  scoring**:` bullet and the `- **Graceful scoring fallback**:` bullet
  with the new Ri-focused documentation. (Everything else in CLAUDE.md
  stays.)

- [ ] **Step 1: Read the current paragraph to locate it exactly**

Open `CLAUDE.md`, find the line starting ` - **Seeing / Transparency
scoring**:` inside the "Key Conventions" list.

- [ ] **Step 2: Replace that bullet and the following "Graceful scoring
  fallback" bullet with this new text** (preserve the surrounding bullets
  and their indentation):

```markdown
- **Seeing scoring (Richardson Number)**: `computeSeeing()` uses bulk
  Richardson numbers `Ri = (g · Δθ · Δz) / (θ̄ · ΔU²)` computed across
  three HRDPS layer pairs — upper (250↔500 hPa), mid (500↔850 hPa), and
  boundary (850↔1000 hPa). Δθ uses *potential temperature* (θ = T·(P₀/P)^(R/cp))
  so static stability is measured correctly; ΔU is the vector wind
  difference magnitude; Δz comes from HRDPS geopotential heights so layer
  thicknesses are real, not standard-atmosphere estimates. The badge
  reflects the *minimum* Ri across the column (weakest-link convention)
  and the subtext names any layers below the Miles-Howard turbulence
  threshold (`Ri < 0.25`).
- **Seeing / Richardson-Number tunables**: Four knobs in the pipeline are
  interpretation, not physics, and live in `computeSeeing()` /
  `_riBucket()` for easy adjustment: (1) the bucket thresholds 1.0/0.5/0.25/0.1
  — only 0.25 is physics (Miles-Howard), the other three are cosmetic
  granularity; (2) the layer-pair set {250↔500, 500↔850, 850↔1000} —
  adding a 300 or 700 hPa pair would refine the column at the cost of an
  API variable; (3) the min-Ri summary vs alternatives like altitude-
  weighted or count-of-turbulent-layers; (4) the bulk-vs-gradient Ri
  convention — 0.25 is strictly a *gradient*-Ri threshold but is
  empirically close for bulk Ri across these thicknesses.
- **Transparency scoring**: Unchanged from the CSC convention —
  `computeTransparency()` weights mid-atmos RH (500 hPa) 40%, max(low,
  mid) cloud 35%, surface dew-point spread 25%. Badges use nightly
  medians over the 18:00–06:00 window.
- **Graceful scoring fallback**: When HRDPS pressure-level data is
  missing (outside the HRDPS domain or during model outage), `computeSeeing`
  falls back to a surface-only estimate driven by `_scoreSurfaceWind` and
  labels itself "surface-only" in the subtext; `computeTransparency`
  renormalizes via `_weightedScore` over whichever factors are present.
  Never throw or show "Unknown" just because pressure-level data is
  missing.
```

- [ ] **Step 3: Verify the file still parses as Markdown and the bullet
  list structure is intact**

Run:

```bash
grep -n "^- \*\*" CLAUDE.md | head -30
```

Expected: each line is a top-level bullet with a bold lead. No stray
unclosed bullets.

- [ ] **Step 4: Commit and push**

```bash
git add CLAUDE.md
git commit -m "docs(claude): document Richardson-Number seeing pipeline

Replaces the old CSC-weighting paragraph with the new Ri formulation,
enumerates the four tunable knobs explicitly so future edits know what
they can safely change, and clarifies that Transparency still uses the
weighted path."
git push
```

---

## Task 10: Bump service-worker cache

**Files:**
- Modify: `sw.js` — `const CACHE = 'night-sky-vNN';` (currently v46).

- [ ] **Step 1: Bump to v47**

Replace the first line of `sw.js`:

```js
const CACHE = 'night-sky-v47';
```

- [ ] **Step 2: Commit and push**

```bash
git add sw.js
git commit -m "chore(sw): bump cache to v47 for Ri seeing"
git push
```

---

## Task 11: End-to-end verification

- [ ] **Step 1: Hard reload PWA on phone**

Close and reopen the Night Sky Observer PWA on your phone, or do a hard
refresh (Safari: Settings > Safari > Clear History; Chrome: Settings >
Privacy > Clear browsing data for site). Confirm that the Forecast tab
loads and the Seeing badge shows the new `Min Ri …` text line.

- [ ] **Step 2: Confirm tomorrow-night forecast is unaffected**

Scroll to "Tomorrow Night" — the cloud chart, outlook badge, and temp/dew
chart all render identically (Task touched only `computeSeeing`).

- [ ] **Step 3: Confirm footer model name**

Look at the footer: should still read `Model: HRDPS (2.5 km) via
Open-Meteo` inside the domain, `GEM Seamless` outside it.

- [ ] **Step 4: Mark plan complete**

If all three spot-checks pass, implementation is complete. No commit
needed for this task — it's verification only.

---

## Rollback plan

If something goes wrong mid-implementation, revert back to the known-good
state before Task 1:

```bash
# Find the SHA of the "docs(forecast): spec for Richardson-Number seeing" commit
git log --oneline -- docs/superpowers/specs/2026-04-23-richardson-seeing-design.md | tail -n 1
# Reset to just after that commit
git reset --hard <sha>
git push --force-with-lease  # only if you've pushed broken commits
```

Do not force-push if other commits on main aren't yours. The plan is
designed so every commit is individually safe to revert.
