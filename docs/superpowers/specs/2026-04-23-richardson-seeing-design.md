# Richardson-Number Seeing Forecast — Design

**Date:** 2026-04-23
**Scope:** Forecast tab — Seeing badge in the Astronomy Conditions card.

## Goal

Replace the Clear-Sky-Chart-style weighted seeing score (jet 50% + mid wind
15% + lapse 20% + surface wind 15%) with a Richardson-Number model that
uses first-principles physics instead of empirically-tuned weights, while
preserving graceful degradation when HRDPS pressure-level data is
unavailable.

## Why

The current weighted score fuses four proxies with coefficients picked by
convention (Rahill/CMC). Each coefficient is a tunable knob without
ground-truth calibration in this project. The bulk Richardson number
`Ri = (g/θ̄)(Δθ/Δz) / (ΔU/Δz)²` directly answers "does this layer generate
turbulence?" and has a textbook threshold (Miles-Howard: `Ri < 0.25`
means dynamic instability). Using Ri per layer pair and summarizing with
the minimum across the column produces a defensible, physics-anchored
forecast instead of a fitted score.

## Non-Goals

- Converting the badge to FWHM arcseconds. That requires empirically
  calibrated coefficients against real seeing measurements, which we don't
  have.
- Changing Transparency, Dew Risk, Precipitation, Outlook, cloud chart,
  or temp/dew chart. Only the Seeing computation is in scope.
- Visual redesign of the Astronomy Conditions card. The existing badge
  slot (label + value line + colored bucket chip) carries the new output.

## Data Flow

```
fetchForecast()
  HRDPS upper-air variable set grows to include (11 new fields):
    temperature_250hPa,    temperature_1000hPa,
    wind_speed_1000hPa,
    wind_direction_250hPa, wind_direction_500hPa,
    wind_direction_850hPa, wind_direction_1000hPa,
    geopotential_height_250hPa,  geopotential_height_500hPa,
    geopotential_height_850hPa,  geopotential_height_1000hPa
  (Verified available on gem_hrdps_continental via Open-Meteo.)
  GEM Seamless fallback path: unchanged.

parseForecast()
  Each hour row gains: temp250, temp1000, wind1000,
                       wdir250, wdir500, wdir850, wdir1000,
                       z250, z500, z850, z1000.

computeSeeing(nightHrs)
  If pressure data present at nightly-median level:
    For each pair in [250↔500, 500↔850, 850↔1000]:
      1. u,v at each level from (speed, direction).
      2. ΔU = |v_upper − v_lower|  (vector magnitude, m/s)
      3. Δz = z_upper − z_lower    (m, real values from HRDPS)
      4. θ = T·(P₀/P)^(R/cp)       (potential temperature, K)
      5. Δθ = θ_upper − θ_lower    (K)
      6. θ̄  = (θ_upper + θ_lower)/2
      7. Ri = (g · Δθ · Δz) / (θ̄ · ΔU²)
         Equivalent form: Ri = (g/θ̄)·(Δθ/Δz) / (ΔU/Δz)² — buoyancy
         gradient divided by squared shear gradient.
         Zero-shear guard: if ΔU < 1e-2 m/s, return +∞ (laminar).
    minRi = min(Ri_upper, Ri_mid, Ri_boundary)
    turbulentLayers = pairs where Ri < 0.25 (named: upper / mid / boundary)
    bucket = _riBucket(minRi)  (table below)
    text   = "Min Ri 0.18 · turbulent: upper, boundary"
             or "Min Ri 1.23 · all layers stable"
  Else:
    Surface-only fallback (existing `_scoreSurfaceWind` path).
    text = "Surface wind X.X m/s · surface-only"
```

**Why potential temperature, not raw temperature:** θ removes the
adiabatic cooling a lifted parcel gets purely from expansion. Raw `T` drops
with altitude everywhere, so raw `dT/dz` would make every layer look
unstable. Using θ is the physically correct quantity for static stability.

**Why vector shear:** wind direction rotates with altitude (jet stream is
often crosswise to surface wind). Scalar speed difference under-counts
shear. Converting each level to u,v components and taking the vector
magnitude gives the real shear.

**Unit handling:** Open-Meteo returns wind speeds in km/h, temperatures in
°C. Convert to m/s and K inside the Ri computation at the boundary and
keep the rest of the pipeline in SI.

## Ri → Badge Mapping

| min Ri | Bucket | CSS class |
|---|---|---|
| ≥ 1.0 | Excellent | good |
| ≥ 0.5 | Good | good |
| ≥ 0.25 | Fair | warn |
| ≥ 0.1 | Poor | poor |
| < 0.1 | Very Poor | poor |

## Tunables (document in CLAUDE.md)

Four knobs are interpretation, not physics, and must be called out:

1. **Bucket thresholds 1.0, 0.5, 0.25, 0.1.** The 0.25 boundary is
   Miles-Howard (not a knob). The 1.0 upper cutoff follows the common
   bulk-Ri convention for thick layers but is weakly supported — could be
   0.75 or 1.25 without changing the physics. The 0.5 and 0.1 splits are
   cosmetic granularity for the five-bucket UI.
2. **Layer pair set {250↔500, 500↔850, 850↔1000}.** Three pairs covers
   upper / mid / boundary; different choices would still be physically
   defensible. Adding a 300 or 700 hPa level would refine the column at
   the cost of another API variable.
3. **Summary strategy (min Ri).** "Weakest-link" treats any turbulent
   layer as poor seeing. Alternatives include a count of turbulent layers
   or an altitude-weighted score; min Ri is the most conservative and
   matches the fact that turbulence anywhere along the light path degrades
   the wavefront.
4. **Bulk-Ri vs gradient-Ri convention.** The 0.25 threshold is strictly
   proven for gradient Ri at a point; we are computing bulk Ri across
   ~1–5 km thick layers. Empirically the threshold is near 0.25 for bulk
   Ri too but some sources use values up to 1.0. Current mapping stays
   with 0.25 as the turbulent/non-turbulent boundary because it matches
   the textbook result and the literature consensus for observing
   conditions.

## Fallback Behavior

Preserves the existing CLAUDE.md guarantee: *"never throw or show
'Unknown' just because pressure-level data is missing."*

| State | Seeing output |
|---|---|
| HRDPS OK, full pressure data | Ri-based bucket + "Min Ri X.XX · turbulent: …" |
| HRDPS OK, pressure fields null | Surface-only bucket + "Surface wind X.X m/s · surface-only" |
| GEM Seamless fallback | Surface-only bucket + "Surface wind X.X m/s · surface-only" |
| No surface data either | Bucket "Unknown", text "No data" |

## Components / File Touches

- **`js/forecast.js`**
  - Extend `_UPPER_AIR_VARS` with the eleven new fields listed in Data Flow.
  - Extend `parseForecast()` row shape.
  - Add helpers: `_potentialTemp(tC, pHpa)`, `_uvFrom(speedKmh, dirDeg)`,
    `_bulkRichardson({tLo, tHi, uLo, vLo, uHi, vHi, zLo, zHi, pLo, pHi})`,
    `_riBucket(minRi)`.
  - Rewrite `computeSeeing(nightHrs)` to use Ri when pressure data is
    present, fall back to the surface-wind path otherwise.
  - Delete `_scoreJetWind`, `_scoreMidWind`, `_scoreLapseRate` (no
    longer reachable once Ri replaces the CSC path).
  - Keep `_scoreSurfaceWind`, `_weightedScore`, `_scoreBucket` — still
    used by surface-only fallback and by `computeTransparency`.
- **`sw.js`** — bump `CACHE` version.
- **`CLAUDE.md`** — replace the existing "Seeing / Transparency scoring"
  paragraph. New paragraph documents the Ri pipeline, lists the four
  tunables verbatim, and notes that Transparency still uses the old
  weighted path.
- **No HTML/CSS changes.** The existing Seeing badge slot renders label
  + value line + colored bucket chip — same surface area, new payload.

## Verification

- Reload the Forecast tab on a location within the HRDPS domain (e.g.
  Ottawa, 45.4N 75.7W). Seeing badge should show a bucket and an
  `Min Ri …` text line; subtext should name turbulent layers (or
  "all layers stable").
- Reload on a location outside HRDPS domain (e.g. Sydney, Australia).
  Seeing should fall back to "Surface wind … · surface-only".
- Sanity check: on a jet-stream day the upper Ri should drop well below
  0.25 while a deep high-pressure night should keep all three Ri above
  1.0.

## Constants (fixed, not tunable)

- `g = 9.80665 m/s²` — standard gravity.
- `R/cp = 2/7 ≈ 0.2857` — dry-air Poisson constant (specific-heat ratio).
- `P₀ = 1000 hPa` — reference pressure for potential temperature.
- `Ri_crit = 0.25` — Miles-Howard threshold.
