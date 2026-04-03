// ── Tab switching ─────────────────────────────────────────────────────────

function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  document.getElementById('tab-'   + name).classList.add('active');

  // Move indicator bar
  const btn       = document.getElementById('tab-' + name);
  const bar       = document.getElementById('tabBar');
  const indicator = document.getElementById('tabIndicator');
  const btnRect   = btn.getBoundingClientRect();
  const barRect   = bar.getBoundingClientRect();
  indicator.style.left  = (btnRect.left - barRect.left) + 'px';
  indicator.style.width = btnRect.width + 'px';

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
    if (State.fcNightHrs) drawCloudChart('cloudCanvas',      State.fcNightHrs);
    if (State.fcTmrwHrs)  drawCloudChart('cloudCanvasTmrw',  State.fcTmrwHrs);
    if (State.fcHours48)  drawTempDewChart('tempDewCanvas',  State.fcHours48);
    if (State.moonmapLoaded) resizeMoonMap();
  }, 150);
});


// ── Service worker ────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}


// ── Boot ──────────────────────────────────────────────────────────────────
renderMoon();
