# Moon Map Tab — Design Spec
**Date:** 2026-03-31
**Status:** Approved

---

## Overview

A new "Map" sub-tab inside the existing Moon tab that renders the LROC equirectangular image (`photos/lroc_color_poles_4k.jpg`) as a live orthographic projection — matching what the observer actually sees through a telescope tonight. All RASC catalogue features are plotted as dots, tonight's visible features highlighted in gold. Users can zoom, pan, toggle labels, and tap any dot for a tooltip.

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Placement | Sub-tab inside Moon tab (Features \| Map) |
| Rendering | WebGL fragment shader (GPU projection, pixel-perfect at all zoom levels) |
| Feature dots on tap | Tooltip callout bubble near the dot |
| Which features shown | All ~90 dots always visible; tonight's highlighted gold |
| Orientation | Live — libration-adjusted, rotated for observer's latitude |
| Controls | Toolbar strip **below** the globe (no overlap) |

---

## Architecture & Files

| File | Change |
|------|--------|
| `js/moonmap.js` | **New** — all map logic: WebGL setup, shader, projection math, overlay canvas, interaction, sub-tab switcher |
| `index.html` | Add sub-tab bar + `<canvas>` elements inside Moon tab; add `<script src="js/moonmap.js">` |
| `styles.css` | Sub-tab switcher, map container, toolbar strip, tooltip styles |
| `sw.js` | Add `js/moonmap.js` to ASSETS; bump cache version to `v23` |
| `state.js` | Add `moonmapLoaded: false` flag to `State` |

`moon.js` and its `FEATURES` array are untouched. `moonmap.js` reads `FEATURES` directly (shared page scope).

---

## Section 1 — HTML Structure

Inside the Moon tab, the existing content is wrapped in a features sub-view and a new map sub-view added:

```html
<!-- Sub-tab switcher -->
<div id="moonSubTabs">
  <button id="moonSubTab-features" onclick="switchMoonSubTab('features')">FEATURES</button>
  <button id="moonSubTab-map"      onclick="switchMoonSubTab('map')">MAP</button>
</div>

<!-- Existing moon content moved into this wrapper -->
<div id="moonFeaturesView"> …existing moon content… </div>

<!-- New map view -->
<div id="moonMapView" style="display:none">
  <div id="mapContainer">
    <canvas id="moonGlCanvas"></canvas>      <!-- WebGL globe -->
    <canvas id="moonOverlayCanvas"></canvas> <!-- dots, labels, tooltip -->
  </div>
  <div id="mapToolbar">
    <!-- legend (left) + +/−/label/reset buttons (right) -->
  </div>
</div>
```

---

## Section 2 — WebGL Rendering

### Canvas sizing
Both canvases are sized to a square: `min(containerWidth, 500px)`. On mobile this fills the screen width; on tablet it caps at 500px centred.

### Shader overview

**Vertex shader** — draws two triangles covering clip space, passes `vUv` (normalised -1..1 coords) to fragment shader.

**Fragment shader** — per pixel:
1. Discard if outside unit circle
2. Apply `u_zoom` and `u_pan` to screen coord
3. Inverse orthographic projection → moon (φ, λ):
   - `ρ = length(coord)`, `c = asin(ρ)`
   - `φ = asin(cos(c)·sin(φ₀) + coord.y·sin(c)·cos(φ₀)/ρ)`
   - `λ = λ₀ + atan(coord.x·sin(c), ρ·cos(φ₀)·cos(c) − coord.y·sin(φ₀)·sin(c))`
4. Apply position angle rotation (lunar north pole tilt)
5. Convert (φ, λ) → equirectangular UV → `texture2D(u_texture, uv)`

### Uniforms
| Uniform | Type | Source |
|---------|------|--------|
| `u_texture` | sampler2D | LROC image loaded as WebGL texture |
| `u_libLat` | float | `Astronomy.Libration(date).elat` — sub-Earth selenographic latitude (degrees) |
| `u_libLon` | float | `Astronomy.Libration(date).elon` — sub-Earth selenographic longitude (degrees) |
| `u_posAngle` | float | Parallactic angle of the moon: `atan2(sin(H)·cos(φ), cos(δ)·sin(φ) − sin(δ)·cos(φ)·cos(H))` where H = hour angle, φ = observer latitude, δ = moon declination (from `Astronomy.GeoMoon()`). Negated for southern hemisphere observers. |
| `u_zoom` | float | Local state, default 1.0, range 1.0–8.0 |
| `u_pan` | vec2 | Local state, default (0,0), normalised coords |

### Texture loading
LROC image loaded once via `Image()`, uploaded to WebGL texture on load. Displays a "Loading…" message while pending. Image is already pre-cached by the service worker so load is near-instant after first visit.

### Render loop
No `requestAnimationFrame` loop. Redraws triggered only by: initial load, zoom/pan input, window resize. Zero battery cost when idle.

---

## Section 3 — Feature Overlay

A 2D canvas (`moonOverlayCanvas`) layered on top of the WebGL canvas, same dimensions, `pointer-events: none` except for tap handling on the container.

### Projection mirror (JS)
The same orthographic + libration math from the shader is replicated in JS to map each feature's (lat, lon) to a screen (x, y). Features where the dot product with the sub-Earth normal is ≤ 0 are on the far side and skipped.

### Dot rendering
- **Tonight's features** (`Math.abs(feature.qday - currentQDay) <= 1`): gold dot, 8px, soft glow (`shadowBlur`)
- **Other features**: grey dot (`#444`), 5px, no glow

`currentQDay` computed by calling the existing `getMoonInfo()` from `moon.js`.

### Labels
Drawn in Cinzel 10px, offset 6px above each dot, only when labels are enabled. Skipped for dots very close together to reduce clutter (minimum 40px separation enforced — later dot in render order wins).

### Tooltip
A `<div id="mapTooltip">` positioned absolutely over the container. On tap/click:
- Hit-test: find nearest dot within 20px
- If found: position tooltip near dot, flip horizontally/vertically if near edge, show:
  - Feature name (gold, bold)
  - Description
  - Q-Day value + position (North / South / Equatorial)
- Tap on empty space: hide tooltip

---

## Section 4 — Zoom, Pan & Controls

### State (local to `moonmap.js`)
```js
let zoom = 1.0;       // range 1.0–8.0
let pan  = {x:0, y:0}; // normalised, clamped to keep globe on-screen
```

### Input handling
| Input | Action |
|-------|--------|
| Pinch (touch) | Zoom |
| Single-finger drag | Pan |
| Mouse scroll | Zoom |
| Mouse drag | Pan |
| Tap dot | Show tooltip |
| Tap empty | Dismiss tooltip |

Pan is clamped so the globe centre never moves more than `(zoom-1)/zoom` units from origin (keeps the disc edge always visible).

### Toolbar controls
- **`+`** — zoom × 1.5 (capped at 8.0)
- **`−`** — zoom ÷ 1.5 (floored at 1.0)
- **🏷 labels** — toggles label rendering; button dims at 40% opacity when off
- **⌂ reset** — sets `zoom = 1.0`, `pan = {0,0}`, redraws immediately

---

## Section 5 — Sub-tab Switcher & Integration

### `switchMoonSubTab(name)`
Defined in `moonmap.js`. Shows/hides `moonFeaturesView` and `moonMapView`, updates active underline on the switcher buttons. On first switch to `map`:
- Initialises WebGL context
- Loads LROC texture
- Computes libration and renders
- Sets `State.moonmapLoaded = true`

Subsequent switches to `map` just show the existing canvas — no re-init.

### Resize
`main.js` resize listener calls `resizeMoonMap()` (exported as a global from `moonmap.js`) which resizes both canvases and redraws.

### `state.js` addition
```js
moonmapLoaded: false,
```

---

## Out of Scope
- Animation / smooth zoom transitions (canvas redraws instantly)
- Clicking a dot to open the RASC photo lightbox (may be added later)
- Far-side features (anything with dot-product ≤ 0 is simply not drawn)
- Filtering by feature type (crater, mare, mountain range, etc.)
