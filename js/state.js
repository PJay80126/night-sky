// ═══════════════════════════════════════════════════════════════════════════
// Night Sky Observer — state.js
// Shared state, utilities, location, and astronomy helpers
// ═══════════════════════════════════════════════════════════════════════════


// ── App state ───────────────────────────────────────────────────────────
const State = {
  // Location
  obsLat: null,
  obsLon: null,

  // Planet altitude chart data (needed for resize redraws)
  altDatasets: null,
  altSteps:    null,
  altHStart:   null,
  altHEnd:     null,

  // Forecast chart data (needed for resize redraws)
  fcNightHrs:  null,
  fcTmrwHrs:   null,
  fcHours48:   null,

  // Cloud cover overlay on planet chart
  cloudNightHours: null,

  // Tab load guards
  planetsLoaded:  false,
  forecastLoaded: false,
  moonmapLoaded:  false,

  // Active tab + freshness tracking (see refreshStaleData in main.js)
  activeTab: 'moon',
  forecastFetchedAt: null,
};


// ── Shared utilities ────────────────────────────────────────────────────

function toRad(deg) { return deg * Math.PI / 180; }

/** Returns midnight-normalised Date for today. */
function today() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function daysBetween(a, b) { return Math.round((b - a) / 86400000); }

function formatDate(d) {
  return d.toLocaleDateString('en-CA', { year:'numeric', month:'long', day:'numeric' });
}


// ── Observer location ───────────────────────────────────────────────────

function getLocation(onSuccess, onFail) {
  if (!navigator.geolocation) { onFail(); return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      State.obsLat = pos.coords.latitude;
      State.obsLon = pos.coords.longitude;
      onSuccess();
    },
    () => onFail(),
    { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
  );
}

/**
 * Builds a standardised "location unavailable" message with a Retry button.
 * @param {string} tabName  - the tab to re-trigger on retry ('planets'|'forecast'|'messier')
 * @param {string} [detail] - optional extra line of context
 */
function locationErrorHTML(tabName, detail) {
  const extra = detail ? `<p class="loc-error-detail">${detail}</p>` : '';
  return `
    <div class="loc-error-card">
      <div class="loc-error-icon">📍</div>
      <p class="loc-error-msg">Location unavailable — please enable location services in your browser.</p>
      ${extra}
      <button class="loc-retry-btn" onclick="retryLocation('${tabName}')">
        ↺ Retry Location
      </button>
    </div>`;
}

/** Called by the Retry button — clears load guards so the tab re-fetches. */
function retryLocation(tabName) {
  if (tabName === 'planets') {
    State.planetsLoaded = false;
    document.getElementById('planetsBody').innerHTML =
      '<p class="no-targets">Requesting location…</p>';
    getLocation(() => renderPlanets(), () => {
      document.getElementById('planetsBody').innerHTML = locationErrorHTML('planets');
    });
  } else if (tabName === 'forecast') {
    State.forecastLoaded = false;
    document.getElementById('fcContent').innerHTML =
      '<div class="fc-loading"><div class="fc-spinner"></div>Requesting location…</div>';
    getLocation(() => renderForecast(), () => {
      document.getElementById('fcContent').innerHTML = locationErrorHTML('forecast');
    });
  } else if (tabName === 'messier') {
    _messierLoaded = false;
    document.getElementById('messierBody').innerHTML =
      '<p class="no-targets">Requesting location…</p>';
    getLocation(() => renderMessier(), () => {
      document.getElementById('messierBody').innerHTML = locationErrorHTML('messier');
    });
  }
}


// ── Shared astronomy helpers ────────────────────────────────────────────

function getSunsetTime(date) {
  const midnight = new Date(date); midnight.setHours(0, 0, 0, 0);
  const observer = new Astronomy.Observer(State.obsLat, State.obsLon, 0);
  try { return Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, midnight, 1)?.date; } catch(e) { return null; }
}

function getSunriseTime(date) {
  const noon     = new Date(date); noon.setHours(12, 0, 0, 0);
  const observer = new Astronomy.Observer(State.obsLat, State.obsLon, 0);
  try { return Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, noon, 1)?.date; } catch(e) { return null; }
}

// Generalized twilight-window search. sunAltDeg is the sun-altitude
// threshold that defines "dark" (-18 astronomical, -12 nautical, -6 civil).
// Falls back to a fixed 18:00/06:00 clock window when SearchAltitude can't
// find a crossing (e.g. high-latitude summer with no true dark).
function getTwilightWindow(date, sunAltDeg) {
  const midnight = new Date(date); midnight.setHours(0, 0, 0, 0);
  const observer = new Astronomy.Observer(State.obsLat, State.obsLon, 0);
  let start = null, end = null;
  try { start = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, midnight, 1, sunAltDeg)?.date; } catch(e) {}
  try {
    const from = start ?? new Date(midnight.getTime() + 20 * 3600000);
    end = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, +1, from, 1, sunAltDeg)?.date;
  } catch(e) {}
  return {
    nightStart:  start ?? new Date(midnight.getTime() + 18 * 3600000),
    nightEnd:    end   ?? new Date(midnight.getTime() + 30 * 3600000),
    hasTrueDark: !!(start && end),
  };
}

// Astronomical twilight (-18°) window for tonight — used by Planets/Events
// for faint-object visibility timing.
function getNightWindow(date) {
  const w = getTwilightWindow(date, -18);
  return { nightStart: w.nightStart, nightEnd: w.nightEnd, noTrueDark: !w.hasTrueDark };
}
