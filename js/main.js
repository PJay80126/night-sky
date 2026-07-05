// ── Tab switching ─────────────────────────────────────────────────────────

function switchTab(name) {
  State.activeTab = name;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
  document.getElementById('panel-' + name).classList.add('active');
  const activeBtn = document.getElementById('tab-' + name);
  activeBtn.classList.add('active');
  activeBtn.setAttribute('aria-selected', 'true');

  // Move indicator bar
  const btn       = document.getElementById('tab-' + name);
  const bar       = document.getElementById('tabBar');
  const indicator = document.getElementById('tabIndicator');
  const btnRect   = btn.getBoundingClientRect();
  const barRect   = bar.getBoundingClientRect();
  indicator.style.left  = (btnRect.left - barRect.left) + 'px';
  indicator.style.width = btnRect.width + 'px';

  if (name === 'moonmap') {
    initMoonMap();
    requestAnimationFrame(() => resizeMoonMap());
  }

  if (name === 'planets' && !State.planetsLoaded) {
    State.planetsLoaded = true;
    getLocation(() => renderPlanets(), () => renderPlanets());
  }

  if (name === 'events') {
    loadEvents();
  }

  if (name === 'messier') {
    getLocation(() => renderMessier(), () => renderMessier());
  }

  if (name === 'forecast' && !State.forecastLoaded) {
    State.forecastLoaded = true;
    getLocation(() => renderForecast(), () => renderForecast());
  }

  // Redraw planet canvas if returning to that tab
  if (name === 'planets' && State.altDatasets) {
    requestAnimationFrame(() => drawAltitudeGraph(State.altDatasets, State.altSteps, State.altHStart, State.altHEnd));
  }
}

// Arrow-key navigation across the tablist (Left/Right, wrapping)
document.getElementById('tabBar').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const tabs = [...document.querySelectorAll('.tab-btn')];
  const idx  = tabs.findIndex(t => t === document.activeElement);
  if (idx === -1) return;
  e.preventDefault();
  const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
  next.focus();
  next.click();
});

// Initialise tab indicator position after page load
window.addEventListener('load', () => {
  const btn       = document.getElementById('tab-moon');
  const bar       = document.getElementById('tabBar');
  const indicator = document.getElementById('tabIndicator');
  if (btn && bar && indicator) {
    const btnRect = btn.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    indicator.style.left  = (btnRect.left - barRect.left) + 'px';
    indicator.style.width = btnRect.width + 'px';
  }
});

// Redraw canvases on resize / zoom (debounced)
let _resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    if (State.altDatasets) {
      drawAltitudeGraph(State.altDatasets, State.altSteps, State.altHStart, State.altHEnd);
    }
    if (State.fcNightHrs) drawCloudChart('cloudCanvas',      State.fcNightHrs, State.fcBestWin);
    if (State.fcTmrwHrs)  drawCloudChart('cloudCanvasTmrw',  State.fcTmrwHrs);
    if (State.fcHours48)  drawTempDewChart('tempDewCanvas',  State.fcHours48);
    if (State.moonmapLoaded) resizeMoonMap();
  }, 150);
});


// ── Freshness ─────────────────────────────────────────────────────────────
// Recompute stale data when the app resurfaces or a timer ticks. Three
// tiers: (1) calendar-date rollover -> recompute everything, (2) forecast
// older than an hour -> re-fetch, (3) >5 min since last chart draw ->
// redraw so NOW lines stay honest. The Moon Map self-refreshes its Q-Day
// dots and terminator on every render, so tier 3's resizeMoonMap() covers it.
let _lastActiveDate = today().getTime();
let _lastChartDraw  = Date.now();

function _redrawCharts() {
  _lastChartDraw = Date.now();
  if (State.altDatasets) drawAltitudeGraph(State.altDatasets, State.altSteps, State.altHStart, State.altHEnd);
  if (State.fcNightHrs)  drawCloudChart('cloudCanvas',     State.fcNightHrs, State.fcBestWin);
  if (State.fcTmrwHrs)   drawCloudChart('cloudCanvasTmrw', State.fcTmrwHrs);
  if (State.fcHours48)   drawTempDewChart('tempDewCanvas', State.fcHours48);
  if (State.moonmapLoaded) resizeMoonMap();
}

function refreshStaleData() {
  if (document.hidden) return;

  if (today().getTime() !== _lastActiveDate) {
    _lastActiveDate = today().getTime();
    renderMoon();
    State.planetsLoaded  = false;
    State.forecastLoaded = false;
    _messierLoaded       = false;
    _eventsLoaded        = false;
    switchTab(State.activeTab);
    _lastChartDraw = Date.now();
    return;
  }

  if (State.forecastFetchedAt && Date.now() - State.forecastFetchedAt > 60 * 60000) {
    State.forecastLoaded = false;
    if (State.activeTab === 'forecast') { switchTab('forecast'); return; }
  }

  if (Date.now() - _lastChartDraw > 5 * 60000) _redrawCharts();
}

document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshStaleData(); });
setInterval(refreshStaleData, 5 * 60000);


// ── Service worker ────────────────────────────────────────────────────────

// Anchor the fixed tab bar to the *visual* viewport bottom so Chrome Android's
// dynamic URL bar never overlaps it (especially on short tabs like Moon where
// the page doesn't scroll enough to retract the URL bar).
(function trackVisualViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  const update = () => {
    const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--vv-bottom-offset', offset + 'px');
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  update();
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}


// ── Night-vision mode ─────────────────────────────────────────────────────

function _applyNightMode(on) {
  document.body.classList.toggle('night-mode', on);
  const btn = document.getElementById('nightModeToggle');
  if (btn) btn.textContent = on ? '☀️' : '🌙';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', on ? '#1a0000' : '#06090f');
}

function toggleNightMode() {
  const on = !document.body.classList.contains('night-mode');
  localStorage.setItem('nightsky.nightMode', on ? '1' : '0');
  _applyNightMode(on);
}

// Apply saved preference before first paint
_applyNightMode(localStorage.getItem('nightsky.nightMode') === '1');


// ── Boot ──────────────────────────────────────────────────────────────────
renderMoon();
