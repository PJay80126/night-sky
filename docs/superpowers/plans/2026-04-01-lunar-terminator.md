# Lunar Terminator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the lunar day/night terminator on the Moon Map WebGL globe, computed physically in the fragment shader from the sun's selenographic position.

**Architecture:** Two new GLSL uniforms (`u_sunLat`, `u_sunLon`) carry the subsolar selenographic coordinates derived in JS from `Astronomy.MoonPhase()` and `Astronomy.Libration()`. The fragment shader computes a dot-product illumination factor per fragment and applies a 5° `smoothstep` penumbra, dimming the night side to 2% brightness. All changes are confined to `js/moonmap.js` and `sw.js`.

**Tech Stack:** Vanilla JS, WebGL 1.0 GLSL, Astronomy.js (Don Cross), service worker cache versioning.

---

## Working Directory

All work happens in the worktree: `.worktrees/moon-map/` (branch `feature/moon-map`).

```bash
cd .worktrees/moon-map
```

---

## Task 1: Add subsolar point computation to `_computeUniforms()`

**Files:**
- Modify: `js/moonmap.js` — function `_computeUniforms` (around line 247)

- [ ] **Step 1: Locate the function**

  Open `js/moonmap.js`. Find `_computeUniforms()` — it currently ends with:

  ```js
    return { libLat, libLon, posAngle };
  }
  ```

- [ ] **Step 2: Add subsolar computation before the return**

  Replace the final `return` line with:

  ```js
    const phase       = Astronomy.MoonPhase(now);           // 0–360°; 0=new, 180=full
    const subsolarLon = (lib.elon - phase) * Math.PI / 180; // selenographic lon of sub-solar point
    const subsolarLat = -lib.mlat * 0.30  * Math.PI / 180;  // scaled from geocentric ecliptic lat

    return { libLat, libLon, posAngle, subsolarLat, subsolarLon };
  }
  ```

  > **Why these formulas:**
  > - `lib.elon - phase`: at new moon (phase=0) the sun is on the same side as Earth so subsolarLon ≈ lib.elon; at full moon (phase=180) the sun is opposite so subsolarLon ≈ lib.elon−180°.
  > - `lib.mlat * 0.30`: the sun lies in the ecliptic plane; the subsolar lat is driven by the lunar equatorial tilt to the ecliptic (1.54°) relative to the moon's max orbital inclination (5.14°) — ratio ≈ 0.30.

- [ ] **Step 3: Commit**

  ```bash
  git add js/moonmap.js
  git commit -m "feat: compute subsolar selenographic point in _computeUniforms"
  ```

---

## Task 2: Update fragment shader and register new uniform locations

**Files:**
- Modify: `js/moonmap.js` — `_FRAG` constant (lines 26–65) and `_compileProgram()` `_uniLoc` block (around line 188)

- [ ] **Step 1: Replace the entire `_FRAG` constant**

  Find `const _FRAG = \`` near the top of the file. Replace the entire string (from the opening backtick to the closing backtick) with:

  ```js
  const _FRAG = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D u_texture;
    uniform float u_libLat;
    uniform float u_libLon;
    uniform float u_posAngle;
    uniform float u_zoom;
    uniform vec2  u_pan;
    uniform float u_sunLat;
    uniform float u_sunLon;
    const float PI = 3.14159265358979;

    void main() {
      vec2 coord = (vUv - u_pan) / u_zoom;
      if (dot(coord, coord) >= 1.0) { discard; }

      // Rotate screen coord into selenographic frame (undo position angle)
      float cp = cos(u_posAngle), sp = sin(u_posAngle);
      vec2 c = vec2( coord.x * cp + coord.y * sp,
                    -coord.x * sp + coord.y * cp);

      // Inverse orthographic projection → (phi, lam)
      float rho = length(c);
      float phi, lam;
      if (rho < 0.0001) {
        phi = u_libLat; lam = u_libLon;
      } else {
        float ang  = asin(clamp(rho, 0.0, 1.0));
        float sinC = sin(ang), cosC = cos(ang);
        phi = asin(cosC * sin(u_libLat) +
                   c.y  * sinC * cos(u_libLat) / rho);
        lam = u_libLon + atan(c.x * sinC,
              rho * cos(u_libLat) * cosC - c.y * sin(u_libLat) * sinC);
      }

      // Equirectangular UV  (lon 0 → u=0.5, lat +90 → v=0)
      float u = mod(lam / (2.0 * PI) + 0.5, 1.0);
      float v = 0.5 - phi / PI;
      vec4 color = texture2D(u_texture, vec2(u, v));

      // Terminator: dot product of surface normal with sun direction (selenographic frame)
      // Same formula as the sub-Earth visibility check above, using sun coords instead
      float cosI = sin(phi) * sin(u_sunLat)
                 + cos(phi) * cos(u_sunLat) * cos(lam - u_sunLon);

      // 5° penumbra band: sin(5°) ≈ 0.087
      float illum = smoothstep(-0.087, 0.087, cosI);

      // Night side at 2% brightness; lit side at 100%
      gl_FragColor = vec4(color.rgb * mix(0.02, 1.0, illum), color.a);
    }
  `;
  ```

- [ ] **Step 2: Register the new uniform locations in `_compileProgram()`**

  Find the `_uniLoc = {` block in `_compileProgram()`. It currently reads:

  ```js
  _uniLoc = {
    texture:  gl.getUniformLocation(prog, 'u_texture'),
    libLat:   gl.getUniformLocation(prog, 'u_libLat'),
    libLon:   gl.getUniformLocation(prog, 'u_libLon'),
    posAngle: gl.getUniformLocation(prog, 'u_posAngle'),
    zoom:     gl.getUniformLocation(prog, 'u_zoom'),
    pan:      gl.getUniformLocation(prog, 'u_pan'),
  };
  ```

  Replace it with:

  ```js
  _uniLoc = {
    texture:  gl.getUniformLocation(prog, 'u_texture'),
    libLat:   gl.getUniformLocation(prog, 'u_libLat'),
    libLon:   gl.getUniformLocation(prog, 'u_libLon'),
    posAngle: gl.getUniformLocation(prog, 'u_posAngle'),
    zoom:     gl.getUniformLocation(prog, 'u_zoom'),
    pan:      gl.getUniformLocation(prog, 'u_pan'),
    sunLat:   gl.getUniformLocation(prog, 'u_sunLat'),
    sunLon:   gl.getUniformLocation(prog, 'u_sunLon'),
  };
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add js/moonmap.js
  git commit -m "feat: add terminator uniforms to GLSL shader and register locations"
  ```

---

## Task 3: Upload new uniforms in `_render()` and verify in browser

**Files:**
- Modify: `js/moonmap.js` — function `_render` (around line 272)

- [ ] **Step 1: Destructure the new values in `_render()`**

  Find the line in `_render()`:

  ```js
  const { libLat, libLon, posAngle } = _computeUniforms();
  ```

  Replace it with:

  ```js
  const { libLat, libLon, posAngle, subsolarLat, subsolarLon } = _computeUniforms();
  ```

- [ ] **Step 2: Upload the new uniforms**

  Find the block of `gl.uniform` calls. After the existing:

  ```js
  gl.uniform2f(_uniLoc.pan,      _mapPan.x, _mapPan.y);
  ```

  Add:

  ```js
  gl.uniform1f(_uniLoc.sunLat,   subsolarLat);
  gl.uniform1f(_uniLoc.sunLon,   subsolarLon);
  ```

  The full updated uniform upload block should now read:

  ```js
  gl.uniform1i(_uniLoc.texture,  0);
  gl.uniform1f(_uniLoc.libLat,   libLat);
  gl.uniform1f(_uniLoc.libLon,   libLon);
  gl.uniform1f(_uniLoc.posAngle, posAngle);
  gl.uniform1f(_uniLoc.zoom,     _mapZoom * 0.85);
  gl.uniform2f(_uniLoc.pan,      _mapPan.x, _mapPan.y);
  gl.uniform1f(_uniLoc.sunLat,   subsolarLat);
  gl.uniform1f(_uniLoc.sunLon,   subsolarLon);
  ```

- [ ] **Step 3: Verify in browser**

  Serve the worktree over HTTP (WebGL requires HTTP — `file://` is blocked by CORS):

  ```bash
  npx serve . -p 5000
  ```

  Open `http://localhost:5000` in a browser. Navigate to the Moon tab → MAP sub-tab.

  **What to check based on today's moon phase (2026-04-01):**
  - The terminator (shadow boundary) should be visible as a curved line across the disc
  - The unlit side should be very dark (near-black), not grey
  - The boundary should have a slight soft edge, not a perfectly sharp line
  - Feature dots should be visible on both the lit and unlit sides
  - Zoom and pan should still work correctly

  To double-check the terminator is on the correct side: `Astronomy.MoonPhase(new Date())` run in the browser console should return a value 0–360°. Phase ~90° = right half lit; phase ~270° = left half lit; phase ~0° or ~360° = nearly new (thin crescent); phase ~180° = nearly full.

  Open the browser console and run:
  ```js
  Astronomy.MoonPhase(new Date())
  ```
  Confirm the terminator position matches the expected phase.

- [ ] **Step 4: Commit**

  ```bash
  git add js/moonmap.js
  git commit -m "feat: upload terminator uniforms in render — lunar shadow now visible"
  ```

---

## Task 4: Bump service worker cache version

**Files:**
- Modify: `sw.js` — line 1

- [ ] **Step 1: Bump the cache version**

  In `sw.js`, change:

  ```js
  const CACHE = 'night-sky-v25';
  ```

  to:

  ```js
  const CACHE = 'night-sky-v26';
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add sw.js
  git commit -m "chore: bump cache to v26 after lunar terminator implementation"
  ```

---

## Done

All four tasks complete. The moon map now renders the terminator based on today's sun position. Run the finishing-a-development-branch skill to merge or create a PR.
