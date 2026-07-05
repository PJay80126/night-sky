# Forecast Tab: Statistical Summarization Fixes

**Date:** 2026-07-05
**Status:** Approved (user approved all four items from the assumptions review)

## Problem

A follow-up review of the Forecast tab's assumptions (after the 2026-07-04
clear-sky rework) found four spots where the *statistical summary* of the
hourly data works against what an observer actually cares about. No new API
variables are needed — all four are changes to how existing parsed data is
reduced to a badge.

1. **Median wind direction is statistically wrong.** `computeSeeing()`
   takes nightly medians of `wdir250…wdir1000` before computing shear.
   Direction is circular: a night oscillating around north (350°, 8°,
   355°, 12°…) has no meaningful sorted median, and Ri is nonlinear in the
   shear term (ΔU²), so Ri-of-medians can also diverge from the typical
   hourly Ri when the jet strengthens overnight.
2. **Median precipitation probability hides short events.** A dry evening
   with a 90% shower chance from 02:00–04:00 medians out to ~0%, so both
   the "Unsettled" cross-check in `getOutlook()` and the Precip. Chance
   badge read "Low." Observers care whether it rains *at all* during the
   night, not in the typical hour.
3. **Dew risk uses the whole-night median RH, but dew forms at the dawn
   peak.** RH climbs as temperature falls toward the dew point overnight;
   the median under-reports the pre-dawn maximum. The minimum temp–dew
   spread (already parsed per hour) is the better predictor.
4. **Missing cloud data counts as clear.** `getOutlook()` maps
   `h.tcdc ?? 0`, biasing the badge optimistic exactly when the model is
   least trustworthy.

## Design

All changes in `js/forecast.js` unless noted.

### 1. Per-hour Richardson numbers

`computeSeeing()` stops taking medians of the raw fields. Instead, for
each of the three layer pairs it computes `_bulkRichardson()` **per hour**
from that hour's temperatures/winds/directions/heights, then takes the
nightly **median of the hourly Ri values per layer** (nulls dropped).
The rest of the pipeline is unchanged: minimum median-Ri across layers
drives `_riBucket()`, and layers whose median Ri < 0.25 are named as
turbulent. Badge semantics are identical; only the summarization order
changes (summarize-last instead of summarize-first).

Sorting note: hourly Ri can be `Infinity` (zero-shear hours). The median
sort must not use the `(a, b) => a - b` comparator (`Infinity - Infinity
= NaN`); use an explicit three-way comparison.

`_bulkRichardson`, `_potentialTemp`, `_uvFrom`, `_riBucket`, and the
surface-only fallback are untouched.

### 2. Peak precipitation probability

Add a `forecastMax(arr, key)` helper beside `forecastMedian`. Then:

- `getOutlook()`'s rain cross-check uses the nightly **max** of
  `precip_prob` (threshold unchanged at ≥50, still only when the cloud
  verdict is Clear/Mostly Clear). Sub-text becomes
  "Up to N% chance of precipitation despite low reported cloud cover".
- The Precip. Chance badge (`buildAstroConditionsHTML` /
  `renderForecast`) is fed the nightly max instead of the median, with
  the existing <20 / <50 bucket thresholds kept and the card sub-text
  reading "peak tonight".

Cloud stays median-based — an hour of cloud can be waited out; an hour of
rain cannot.

### 3. Dawn-aware dew risk

`getDewRisk(rh)` becomes `getDewRisk(nightHrs)`:

- Primary: nightly **minimum** of the per-hour temp–dew spread
  (`h.tmp - h.dewp`). Buckets: >5 °C Low · >3 Moderate · >1 High ·
  ≤1 Very High (aligned with `_scoreDewSpread`'s breakpoints).
- Fallback (spread unavailable): nightly **maximum** RH with thresholds
  shifted up for a peak statistic: <70 Low · <85 Moderate · <95 High ·
  else Very High.
- No data at all → existing "Unknown" shape.

Call site in `renderForecast()` passes `nightHrs`. The Outlook card's
median-humidity stat box is unchanged (it reports conditions, not risk).

### 4. Null-cloud guard

`getOutlook()` builds its cloud array as
`nightHours.map(h => h.tcdc).filter(v => v != null)` and returns the
No-Data badge when the filtered array is empty. `pctClear`/`pctCloudy`
compute over the filtered array. `drawCloudChart`'s `?? 0` is a chart
rendering concern and stays as-is.

## Out of scope

- Seeing/transparency formulas, bucket thresholds, layer-pair set.
- The temp/dew chart's fixed 18:00–06:00 night-shading bands.
- The "Tomorrow Night" header-date cosmetic edge case after midnight.

## Documentation / housekeeping

- CLAUDE.md: update the Seeing bullet (per-hour Ri, median per layer),
  the Outlook bullet (peak-precip cross-check, null-cloud guard), and add
  a Dew Risk / Precip badge note.
- Bump `sw.js` `CACHE` v48 → v49 (`forecast.js` changes).

## Verification

No test suite exists. Reuse the Node `vm` smoke-test approach (real
production files, no reimplementation): extend the e2e harness with
checks for (a) seeing still computing on the HRDPS path, (b) Outlook
No-Data on all-null cloud and undiluted median on mixed-null cloud,
(c) Unsettled triggering on a single-hour precip spike, (d) dew risk
Very High on a dawn spread collapse and on the RH-only fallback path,
plus `node --check` on `js/forecast.js`.
