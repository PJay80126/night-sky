// ═══════════════════════════════════════════════════════════════════════════
// Night Sky Observer — moonmap.js
// Moon Map sub-tab: WebGL orthographic projection + 2D feature overlay
// ═══════════════════════════════════════════════════════════════════════════

// ── Map state ──────────────────────────────────────────────────────────────
let _gl           = null;   // WebGL context
let _program      = null;   // compiled shader program
let _texture      = null;   // LROC WebGL texture
let _textureReady = false;  // true after LROC image uploads to GPU
let _uniLoc       = {};     // uniform locations
let _mapZoom      = 1.0;    // 1.0–8.0
let _mapPan       = { x: 0, y: 0 }; // normalised clip coords
let _labelsOn     = true;
let _dotPositions = [];     // [{feature, x, y, tonight}] in canvas pixels
let _canvasSize   = 0;      // current canvas side length in px
let _activeFeature = null;  // feature object currently shown in tooltip

// ── GLSL shaders ───────────────────────────────────────────────────────────

const _VERT = `
  attribute vec2 a_pos;
  varying vec2 vUv;
  void main() { vUv = a_pos; gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const _FRAG = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D u_texture;
  uniform float u_zoom;
  uniform vec2  u_pan;
  uniform float u_sunLat;
  uniform float u_sunLon;
  const float PI = 3.14159265358979;

  void main() {
    vec2 c = (vUv - u_pan) / u_zoom;
    if (dot(c, c) >= 1.0) { discard; }

    // Direct UV from orthographic image (disc fills the image)
    float tu = (c.x + 1.0) / 2.0;
    float tv = (1.0 - c.y) / 2.0;
    vec4 color = texture2D(u_texture, vec2(tu, tv));

    // Derive lat/lon from screen coords for terminator calculation
    // Inverse orthographic centered at (0, 0)
    float rho = length(c);
    float phi, lam;
    if (rho < 0.0001) {
      phi = 0.0; lam = 0.0;
    } else {
      float ang  = asin(clamp(rho, 0.0, 1.0));
      float sinC = sin(ang), cosC = cos(ang);
      phi = asin(c.y * sinC / rho);
      lam = atan(c.x * sinC, rho * cosC);
    }

    // Terminator: cosine of sun incidence angle
    float cosI = sin(phi) * sin(u_sunLat)
               + cos(phi) * cos(u_sunLat) * cos(lam - u_sunLon);

    // 5 deg penumbra band: sin(5 deg) = 0.087
    float illum = smoothstep(-0.087, 0.087, cosI);

    // Night side at 2% brightness; lit side at 100%
    gl_FragColor = vec4(color.rgb * mix(0.02, 1.0, illum), color.a);
  }
`;


// ── Sub-tab switching ──────────────────────────────────────────────────────

function switchMoonSubTab(name) {
  document.getElementById('moonFeaturesView').style.display = name === 'features' ? '' : 'none';
  document.getElementById('moonMapView').style.display      = name === 'map'      ? '' : 'none';
  document.getElementById('moonSubTab-features').classList.toggle('active', name === 'features');
  document.getElementById('moonSubTab-map').classList.toggle('active', name === 'map');

  if (name === 'map' && !State.moonmapLoaded) {
    State.moonmapLoaded = true;
    _initMoonMap();
  }
}

function resizeMoonMap() {
  if (!_gl) return;
  _resizeCanvases();
  _render();
}


// ── Zoom / pan / labels ────────────────────────────────────────────────────

function mapZoomIn() {
  _mapZoom = Math.min(8.0, _mapZoom * 1.5);
  _clampPan();
  _render();
}

function mapZoomOut() {
  _mapZoom = Math.max(1.0, _mapZoom / 1.5);
  _clampPan();
  _render();
}

function mapResetView() {
  _mapZoom = 1.0;
  _mapPan  = { x: 0, y: 0 };
  _render();
}

function mapToggleLabels() {
  _labelsOn = !_labelsOn;
  document.getElementById('mapLabelToggle').classList.toggle('label-off', !_labelsOn);
  _drawOverlay();
}

function _clampPan() {
  const max = _mapZoom * 0.85;
  _mapPan.x = Math.max(-max, Math.min(max, _mapPan.x));
  _mapPan.y = Math.max(-max, Math.min(max, _mapPan.y));
}


// ── Core init ──────────────────────────────────────────────────────────────

function _initMoonMap() {
  const container = document.getElementById('mapContainer');
  const w = Math.min(container.parentElement.clientWidth, 500);
  _canvasSize = w;

  const glc = document.getElementById('moonGlCanvas');
  const ovc = document.getElementById('moonOverlayCanvas');
  glc.width = glc.height = ovc.width = ovc.height = w;
  container.style.width = container.style.height = w + 'px';

  _gl = glc.getContext('webgl', { alpha: true });
  if (!_gl) {
    container.innerHTML = '<p class="no-targets" style="border-radius:50%;padding:40px;text-align:center">WebGL not available on this device.</p>';
    return;
  }

  _gl.viewport(0, 0, w, w);
  _compileProgram();
  _setupQuad();
  _loadTexture();
  _addInteraction();
}

function _resizeCanvases() {
  const container = document.getElementById('mapContainer');
  if (!container) return;
  const w = Math.min(container.parentElement.clientWidth, 500);
  if (w === _canvasSize) return;
  _canvasSize = w;
  const glc = document.getElementById('moonGlCanvas');
  const ovc = document.getElementById('moonOverlayCanvas');
  glc.width = glc.height = ovc.width = ovc.height = w;
  container.style.width = container.style.height = w + 'px';
  _gl.viewport(0, 0, w, w);
}


// ── WebGL helpers ──────────────────────────────────────────────────────────

function _compileProgram() {
  const gl = _gl;
  function mkShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.error('Shader compile error:', gl.getShaderInfoLog(s));
    return s;
  }
  const vShader = mkShader(gl.VERTEX_SHADER,   _VERT);
  const fShader = mkShader(gl.FRAGMENT_SHADER, _FRAG);
  const prog = gl.createProgram();
  gl.attachShader(prog, vShader);
  gl.attachShader(prog, fShader);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    document.getElementById('mapContainer').innerHTML =
      '<p class="no-targets" style="border-radius:50%;padding:40px;text-align:center">Shader error — cannot render moon map.</p>';
    return;
  }
  _program = prog;
  gl.useProgram(prog);
  gl.deleteShader(vShader);
  gl.deleteShader(fShader);
  _uniLoc = {
    texture:  gl.getUniformLocation(prog, 'u_texture'),
    zoom:     gl.getUniformLocation(prog, 'u_zoom'),
    pan:      gl.getUniformLocation(prog, 'u_pan'),
    sunLat:   gl.getUniformLocation(prog, 'u_sunLat'),
    sunLon:   gl.getUniformLocation(prog, 'u_sunLon'),
  };
}

function _setupQuad() {
  const gl  = _gl;
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1,  1,-1,  -1,1,
     1,-1,  1, 1,  -1,1,
  ]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(_program, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}

function _loadTexture() {
  const gl  = _gl;
  const tex = gl.createTexture();
  _texture  = tex;

  // Show loading message on overlay canvas while image fetches
  const ctx = document.getElementById('moonOverlayCanvas').getContext('2d');
  ctx.fillStyle = 'rgba(200,200,200,0.6)';
  ctx.font = `${Math.round(_canvasSize * 0.035)}px Cinzel, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Loading\u2026', _canvasSize / 2, _canvasSize / 2);

  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    _textureReady = true;
    _render();
  };
  img.onerror = () => {
    ctx.clearRect(0, 0, _canvasSize, _canvasSize);
    ctx.fillStyle = '#c9a84c';
    ctx.fillText('Image failed to load', _canvasSize / 2, _canvasSize / 2);
  };
  img.src = 'photos/WAC_GLOBAL_O000N0000_032P.jpg';
}


// ── Astronomy uniforms + render ────────────────────────────────────────────

function _computeUniforms() {
  const now   = new Date();
  const lib   = Astronomy.Libration(now);
  const phase = Astronomy.MoonPhase(now);           // 0-360; 0=new, 180=full
  const DEG   = Math.PI / 180;

  // Subsolar selenographic point
  // +180 is critical: at new moon the sun is opposite Earth
  const subsolarLon = (lib.elon - phase + 180) * DEG;
  const subsolarLat = -lib.mlat * 0.30 * DEG;       // scaled from geocentric ecliptic lat

  return { subsolarLat, subsolarLon };
}

function _render() {
  const gl = _gl;
  if (!gl || !_textureReady) return;
  const { subsolarLat, subsolarLon } = _computeUniforms();
  gl.viewport(0, 0, _canvasSize, _canvasSize);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(_program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, _texture);
  gl.uniform1i(_uniLoc.texture,  0);
  gl.uniform1f(_uniLoc.zoom,     _mapZoom * 0.85);
  gl.uniform2f(_uniLoc.pan,      _mapPan.x, _mapPan.y);
  gl.uniform1f(_uniLoc.sunLat,   subsolarLat);
  gl.uniform1f(_uniLoc.sunLon,   subsolarLon);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  _drawOverlay();
}


// ── Overlay helpers ────────────────────────────────────────────────────────

const _DEG = Math.PI / 180;

function _projectFeature(f) {
  const phi = f.lat * _DEG;
  let   lam = f.lon * _DEG;
  if (lam > Math.PI) lam -= 2 * Math.PI; // convert 0–360 to -π…π

  // Visibility: far side check (center of projection is 0,0)
  const cosc = Math.cos(phi) * Math.cos(lam);
  if (cosc <= 0) return null; // far side

  // Forward orthographic projection (center 0,0 — no libration, no rotation)
  const xs = Math.cos(phi) * Math.sin(lam);
  const ys = Math.sin(phi);

  // Apply zoom and pan → clip coords (0.85 matches the disc scale in the shader)
  const vx = xs * _mapZoom * 0.85 + _mapPan.x;
  const vy = ys * _mapZoom * 0.85 + _mapPan.y;
  if (Math.abs(vx) > 1 || Math.abs(vy) > 1) return null; // outside canvas

  // Clip coords → canvas pixels (flip Y: GL Y+ up, canvas Y+ down)
  return {
    x: (vx + 1) / 2 * _canvasSize,
    y: (1 - vy) / 2 * _canvasSize,
  };
}

function _getCurrentQDay() {
  const now = today();
  return daysBetween(findNearestFQ(now), now);
}


// ── Feature overlay ────────────────────────────────────────────────────────

function _drawOverlay() {
  const ovc = document.getElementById('moonOverlayCanvas');
  if (!ovc) return;
  const ctx = ovc.getContext('2d');
  ctx.clearRect(0, 0, _canvasSize, _canvasSize);

  const qday = _getCurrentQDay();
  _dotPositions = [];
  const labelledPositions = []; // for 40px clutter guard

  for (const f of FEATURES) {
    const pt = _projectFeature(f);
    if (!pt) continue;

    const tonight = Math.abs(f.qday - qday) <= 1;
    _dotPositions.push({ feature: f, x: pt.x, y: pt.y, tonight });

    ctx.beginPath();
    if (tonight) {
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle   = '#c9a84c';
      ctx.shadowColor = '#c9a84c';
      ctx.shadowBlur  = 7;
      ctx.fill();
      ctx.shadowBlur  = 0;
    } else {
      ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#555';
      ctx.fill();
    }
  }

  if (_labelsOn) {
    ctx.font      = `${Math.max(9, Math.round(_canvasSize * 0.022))}px Cinzel, serif`;
    ctx.textAlign = 'left';

    for (const { feature: f, x, y, tonight } of _dotPositions) {
      if (!tonight) continue; // only label tonight's features
      const tooClose = labelledPositions.some(
        p => Math.hypot(p.x - x, p.y - y) < 40
      );
      if (tooClose) continue;
      labelledPositions.push({ x, y });
      ctx.fillStyle = '#c9a84c';
      ctx.fillText(f.name, x + 6, y - 4);
    }
  }

  // Reposition active tooltip to follow its feature during pan/zoom
  if (_activeFeature) {
    const dot = _dotPositions.find(d => d.feature === _activeFeature);
    if (dot) _showTooltip(dot.feature, dot.x, dot.y);
    else _hideTooltip();
  }
}

// ── Tooltip ────────────────────────────────────────────────────────────────

function _showTooltip(f, dotX, dotY) {
  const tip  = document.getElementById('mapTooltip');
  const qStr = (f.qday >= 0 ? '+' : '') + f.qday;
  tip.innerHTML = `
    <div class="tip-name">${f.name}</div>
    <div class="tip-desc">${f.desc}</div>
    <div class="tip-meta">Q-Day ${qStr} &middot; ${posLabel(f.pos)}</div>
  `;
  const tipW = 190, tipH = 72;
  let tx = dotX + 12, ty = dotY - 10;
  if (tx + tipW > _canvasSize - 4) tx = dotX - tipW - 8;
  if (ty < 4)                      ty = dotY + 12;
  if (ty + tipH > _canvasSize - 4) ty = _canvasSize - tipH - 4;
  tip.style.left    = Math.round(tx) + 'px';
  tip.style.top     = Math.round(ty) + 'px';
  tip.style.display = 'block';
}

function _hideTooltip() {
  _activeFeature = null;
  const tip = document.getElementById('mapTooltip');
  if (tip) tip.style.display = 'none';
}

function _handleTap(clientX, clientY) {
  const ovc  = document.getElementById('moonOverlayCanvas');
  const rect = ovc.getBoundingClientRect();
  const scale = _canvasSize / rect.width;
  const cx = (clientX - rect.left) * scale;
  const cy = (clientY - rect.top)  * scale;

  let best = null, bestDist = 22 * scale;
  for (const dot of _dotPositions) {
    const d = Math.hypot(dot.x - cx, dot.y - cy);
    if (d < bestDist) { bestDist = d; best = dot; }
  }
  if (best) {
    _activeFeature = best.feature;
    _showTooltip(best.feature, best.x, best.y);
  } else {
    _activeFeature = null;
    _hideTooltip();
  }
}


// ── Interaction ────────────────────────────────────────────────────────────

function _addInteraction() {
  const ovc = document.getElementById('moonOverlayCanvas');

  // ── Touch ───────────────────────────────────────────────────────────────
  let _lastDist = 0, _lastPos = null, _wasDragging = false;

  ovc.addEventListener('touchstart', e => {
    e.preventDefault();
    _wasDragging = false;
    if (e.touches.length === 2) {
      _lastDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    } else {
      _lastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: false });

  ovc.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      _mapZoom = Math.max(1.0, Math.min(8.0, _mapZoom * (d / _lastDist)));
      _clampPan();
      _lastDist = d;
      _wasDragging = true;
      _render();
    } else if (_lastPos) {
      const dx = (e.touches[0].clientX - _lastPos.x) / (_canvasSize / 2);
      const dy = (e.touches[0].clientY - _lastPos.y) / (_canvasSize / 2);
      if (Math.abs(dx) > 0.004 || Math.abs(dy) > 0.004) _wasDragging = true;
      _mapPan.x += dx;
      _mapPan.y -= dy; // flip Y (canvas Y+ down, GL Y+ up)
      _clampPan();
      _lastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      _render();
    }
  }, { passive: false });

  ovc.addEventListener('touchend', e => {
    if (e.changedTouches.length === 1 && !_wasDragging) {
      e.preventDefault();
      _handleTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
    _wasDragging = false;
    _lastPos = null;
  });

  // ── Mouse ────────────────────────────────────────────────────────────────
  let _mDown = false, _mPos = null, _mDragged = false;

  ovc.addEventListener('mousedown', e => {
    _mDown = true; _mPos = { x: e.clientX, y: e.clientY }; _mDragged = false;
  });

  ovc.addEventListener('mousemove', e => {
    if (!_mDown || !_mPos) return;
    const dx = (e.clientX - _mPos.x) / (_canvasSize / 2);
    const dy = (e.clientY - _mPos.y) / (_canvasSize / 2);
    if (Math.abs(dx) > 0.004 || Math.abs(dy) > 0.004) _mDragged = true;
    _mapPan.x += dx;
    _mapPan.y -= dy;
    _clampPan();
    _mPos = { x: e.clientX, y: e.clientY };
    _render();
  });

  ovc.addEventListener('mouseup', e => {
    if (!_mDragged) _handleTap(e.clientX, e.clientY);
    _mDown = false; _mDragged = false;
  });

  ovc.addEventListener('mouseleave', () => { _mDown = false; });

  // ── Scroll wheel ──────────────────────────────────────────────────────────
  ovc.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    _mapZoom = Math.max(1.0, Math.min(8.0, _mapZoom * factor));
    _clampPan();
    _render();
  }, { passive: false });
}
