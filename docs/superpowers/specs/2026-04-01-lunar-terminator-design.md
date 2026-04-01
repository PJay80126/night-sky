# Lunar Terminator & Shadow Rendering — Design Spec

**Date:** 2026-04-01
**Feature:** Day/night terminator on the Moon Map WebGL globe
**Branch target:** `feature/moon-map` (worktree at `.worktrees/moon-map`)

---

## Overview

Render the lunar terminator (day/night boundary) on the existing Moon Map WebGL globe. The shadow is computed physically in the fragment shader using the sun's selenographic position derived from Astronomy.js data already available at render time. The night side is rendered near-black (~2% brightness). A narrow 5° penumbra band softens the terminator edge. Feature overlay dots are unaffected.

The terminator is computed once when the map tab is opened (on `_initMoonMap()` → `_render()`). No real-time animation is needed; the position updates correctly each time the user loads or refreshes the app.

---

## What Changes

All changes are confined to **`js/moonmap.js`** and **`sw.js`** (cache bump only).

---

## 1. Subsolar Point Calculation (`_computeUniforms`)

Two new values are added to the existing `_computeUniforms()` return object.

### Subsolar longitude

```js
const phase = Astronomy.MoonPhase(now); // 0–360°; 0 = new moon, 180 = full moon
const subsolarLon = (lib.elon - phase) * Math.PI / 180;
```

`lib.elon` is the sub-Earth selenographic longitude (already computed for libration). Subtracting the phase angle gives the sub-solar longitude because:
- At new moon (phase = 0°): sun and Earth are on the same side → subsolarLon ≈ lib.elon ✓
- At full moon (phase = 180°): sun is opposite Earth → subsolarLon ≈ lib.elon − 180° ✓

The result is normalised to −π…π by the GLSL `cos()` call consuming it (cosine is periodic, so no explicit wrap needed).

### Subsolar latitude

```js
const subsolarLat = -lib.mlat * 0.30 * Math.PI / 180;
```

`lib.mlat` is the moon's geocentric ecliptic latitude (±5.14° max, returned by `Astronomy.Libration()`). The sun lies in the ecliptic plane, so the subsolar selenographic latitude is driven by the tilt of the lunar equatorial plane to the ecliptic (~1.54°). The scaling factor 0.30 ≈ 1.54° / 5.14° converts ecliptic latitude to subsolar selenographic latitude. Maximum resulting error: ~1.5°, invisible at globe scale.

### Updated return value

```js
return { libLat, libLon, posAngle, subsolarLat, subsolarLon };
```

---

## 2. Fragment Shader (`_FRAG`)

### New uniforms

```glsl
uniform float u_sunLat;
uniform float u_sunLon;
```

### Illumination computation (added after existing UV lookup)

```glsl
vec4 color = texture2D(u_texture, vec2(u, v));

// Illumination: dot product of surface normal with sun direction (selenographic frame)
float cosI = sin(phi) * sin(u_sunLat)
           + cos(phi) * cos(u_sunLat) * cos(lam - u_sunLon);

// Smooth terminator: 5° penumbra band (sin(5°) ≈ 0.087)
float illum = smoothstep(-0.087, 0.087, cosI);

// Night side at 2% brightness; lit side at full brightness
gl_FragColor = vec4(color.rgb * mix(0.02, 1.0, illum), color.a);
```

The `cosI` formula is the standard spherical dot product — identical to the existing `cosc` visibility check in the shader, just using sun coordinates instead of sub-Earth coordinates.

`smoothstep(-0.087, 0.087, cosI)` maps the 5° zone around the terminator to a smooth 0→1 transition. Outside the penumbra: `cosI < -0.087` → full night, `cosI > 0.087` → full day.

---

## 3. Uniform Registration (`_compileProgram`)

Add to the `_uniLoc` object:

```js
sunLat: gl.getUniformLocation(prog, 'u_sunLat'),
sunLon: gl.getUniformLocation(prog, 'u_sunLon'),
```

---

## 4. Uniform Upload (`_render`)

Add alongside the existing uniform calls:

```js
gl.uniform1f(_uniLoc.sunLat, subsolarLat);
gl.uniform1f(_uniLoc.sunLon, subsolarLon);
```

---

## 5. Feature Overlay

No changes. Feature dots are always drawn regardless of illumination state.

---

## 6. Service Worker

Bump `CACHE` in `sw.js` from `night-sky-v25` to `night-sky-v26`. No new files are added; the bump ensures existing installs pick up the updated `moonmap.js`.

---

## Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Rendering approach | In-shader (WebGL fragment shader) | Physically accurate, no extra canvas overlay needed |
| Night-side brightness | 2% (`mix(0.02, 1.0, illum)`) | Realistic; night side near-black like telescope view |
| Terminator softness | 5° penumbra (`smoothstep ±0.087`) | Natural appearance; sun is a disc not a point |
| Subsolar latitude source | `lib.mlat × 0.30` | `Astronomy.Libration()` already called; max error ~1.5°, invisible at scale |
| Feature dots in shadow | Unchanged | User wants dots always visible for orientation |
| Update frequency | On load / tab open | Daily accuracy sufficient; no real-time animation needed |

---

## Accuracy Notes

The subsolar longitude formula (`lib.elon − phase`) ignores the small (~0.5°) difference between the moon's selenographic prime meridian and its mean orbital position. This is acceptable for a visual feature where the terminator is rendered across a ~5° penumbra band anyway.

The subsolar latitude approximation (`lib.mlat × 0.30`) has a maximum error of ~1.5° and affects only the very slight north/south tilt of the terminator. At the scale of this globe it is undetectable.

---

## Files Modified

| File | Change |
|------|--------|
| `js/moonmap.js` | `_computeUniforms`: add `phase`, `subsolarLat`, `subsolarLon` |
| `js/moonmap.js` | `_FRAG`: add `u_sunLat`, `u_sunLon` uniforms + illumination math |
| `js/moonmap.js` | `_compileProgram`: register new uniform locations |
| `js/moonmap.js` | `_render`: upload new uniforms |
| `sw.js` | Bump cache version v25 → v26 |
