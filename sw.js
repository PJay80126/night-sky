const CACHE = 'night-sky-v52';
// Cross-context state for nightly notifications (written by forecast.js,
// read here). NOT a versioned asset cache — must survive activate cleanup.
const NOTIFY_CACHE = 'night-sky-notify';
const NOTIFY_KEY   = './notify-state';
const ASSETS = [
  '.',
  'index.html',
  'styles.css',
  'js/state.js',
  'js/moon.js',
  'js/moonmap.js',
  'js/planets.js',
  'js/events.js',
  'js/messier.js',
  'js/forecast.js',
  'js/main.js',
  'astronomy.browser.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'fonts/cinzel-v26-latin-regular.woff2',
  'fonts/cinzel-v26-latin-600.woff2',
  'fonts/cinzel-v26-latin-700.woff2',
  'fonts/crimson-pro-v28-latin-300.woff2',
  'fonts/crimson-pro-v28-latin-300italic.woff2',
  'fonts/crimson-pro-v28-latin-italic.woff2',
  'fonts/crimson-pro-v28-latin-regular.woff2',  
  'photos/Apennine_Mountains_Archimedes_and_Eratosthenes.png',
  'photos/Aristoteles_Eudoxus_Alpine_Valley_Alps_Mountains_Cassini_Caucasus_Mountains_Aristillus_Autolycus_and_Plato.png',
  'photos/Bessel_Haemus_Mountains_and_Manilius.png',
  'photos/Carpathian_Mountains_Copernicus_Reinhold_and_Lansberg.png',
  'photos/Cleomedes_Newcomb_Macrobius_and_Taurus_Mountains.png',
  'photos/Endymion_Atlas_and_Hercules.png',
  'photos/Fracastorius_Piccolomini_Theophilus_Cyrillus_Catharina_and_Altai_Scarp.png',
  'photos/Gassendi_and_Mersenius.png',
  'photos/Herschel_Ptolemaeus_Alphonsus_and_Arzachel.png',
  'photos/Hevelius_and_Grimaldi.png',
  'photos/Hipparchus_Halley_and_Albategnius.png',
  'photos/Julius_Caesar.png',
  'photos/Jura_Mountains.png',
  'photos/Langrenus_Vendelinus_Petavius_Furnerius.png',
  'photos/Mare_Humorum_Mare_Nubium_Mare_Tranquilitatis_Mare_Crisium_Mare_Fecunditatis_and_Mare_Nectaris.png',
  'photos/Plato_Teneriffe_Mountains_and_Straight_Range.png',
  'photos/Plinius_Ross_Arago_Maskelyne_and_Delambre.png',
  'photos/Pyrenees_Mountains_and_Cook.png',
  'photos/Rheita_Valley_and_Furnerius.png',
  'photos/Riphaeus_Mountains_and_Bullialdus.png',
  'photos/Sinus_Aestuum_Mare_Serenitatis_Lacus_Somniorum_Mare_Vaporum_and_Sinus_Medii.png',
  'photos/Sinus_Roris_Sinus_Iridum_Mare_Frigoris_Mare_Imbrium_and_Oceanus_Procellarum.png',
  'photos/Snellius_Stevinus_Cook_and_Petavius.png',
  'photos/Spitsbergen_Mountains_and_Archimedes.png',
  'photos/Straight_Wall.png',
  'photos/Taruntius_and_Langrenus.png',
  'photos/Taurus_Mountains_and_Posidonius.png',
  'photos/Tycho_Maginus_Clavius_Longomontanus_and_Wilhelm.png',
  'photos/WAC_GLOBAL_O000N0000_032P.jpg',
];

// Install: cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: delete old caches (but never the notification-state cache)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== NOTIFY_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fall back to network. A cache miss with the
// network down (e.g. an uncached URL while offline) must still resolve to
// a controlled response — navigations get the cached app shell, anything
// else a 503 the page code can handle like a normal HTTP failure.
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request))
      .catch(() => e.request.mode === 'navigate'
        ? caches.match('index.html').then(r => r || new Response('Offline', { status: 503 }))
        : new Response('Offline', { status: 503 }))
  );
});


// ── Nightly heads-up (background path) ────────────────────────────────────
// Periodic Background Sync wakes this worker roughly daily on installed
// Android PWAs. If it is afternoon/evening and we have not notified today,
// fetch a lightweight cloud+precip forecast and post tonight's verdict.
// The page keeps coords + twilight clock times fresh in NOTIFY_CACHE
// (see forecast.js); we re-anchor those clock times to the current date.

async function _notifyState() {
  try {
    const c = await caches.open(NOTIFY_CACHE);
    const r = await c.match(NOTIFY_KEY);
    return r ? await r.json() : null;
  } catch (e) { return null; }
}

async function _saveNotifyState(state) {
  try {
    const c = await caches.open(NOTIFY_CACHE);
    await c.put(NOTIFY_KEY, new Response(JSON.stringify(state)));
  } catch (e) {}
}

// Simplified nightly verdict — median-cloud bucket (same 10/30/55/80
// thresholds and labels as the page's getOutlook) plus the same
// best-window scan (cloud <= 40, precip < 40). Deliberate small
// duplication: the worker cannot reuse the page pipeline (no DOM, no
// shared scope), and a one-line notification does not need the full
// Richardson machinery. hours: [{time: Date, cloud, precip}].
function _swNightVerdict(hours) {
  const fmt = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const clouds = hours.map(h => h.cloud).filter(v => v != null).sort((a, b) => a - b);
  if (!clouds.length) return null;
  const median = clouds[Math.floor(clouds.length / 2)];
  const [icon, label] =
    median <= 10 ? ['⭐', 'Clear'] :
    median <= 30 ? ['🌙', 'Mostly Clear'] :
    median <= 55 ? ['⛅', 'Partly Cloudy'] :
    median <= 80 ? ['🌥', 'Mostly Cloudy'] : ['☁️', 'Overcast'];

  let best = null, run = null;
  for (const h of hours) {
    if ((h.cloud ?? 100) <= 40 && (h.precip ?? 0) < 40) {
      (run ??= []).push(h);
    } else if (run) {
      if (!best || run.length > best.length) best = run;
      run = null;
    }
  }
  if (run && (!best || run.length > best.length)) best = run;

  const body = best
    ? `Best window ${fmt(best[0].time)}–${fmt(new Date(best[best.length - 1].time.getTime() + 3600000))}`
    : 'No clear window expected';
  return { title: `${icon} ${label} tonight`, body };
}

// Abort a stalled Open-Meteo request after 15 s (mirrors forecast.js —
// separate context, so the small helper is duplicated by design).
function _fetchTimeoutOpts() {
  return (typeof AbortSignal !== 'undefined' && AbortSignal.timeout)
    ? { signal: AbortSignal.timeout(15000) } : {};
}

// Re-anchor a stored twilight instant's clock time onto the current date.
// Dusk lands today; dawn lands on the first moment after dusk.
function _anchorTonight(iso, duskAnchored) {
  const src = new Date(iso);
  const d = new Date();
  d.setHours(src.getHours(), src.getMinutes(), 0, 0);
  if (duskAnchored && d <= duskAnchored) d.setDate(d.getDate() + 1);
  return d;
}

async function _nightlyOutlook() {
  const state = await _notifyState();
  if (!state || !state.enabled || state.lat == null) return;

  const now = new Date();
  if (now.getHours() < 12 || now.getHours() >= 22) return;   // only pre-observing hours
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (state.lastNotified === todayKey) return;

  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${(+state.lat).toFixed(4)}&longitude=${(+state.lon).toFixed(4)}`
    + '&hourly=cloud_cover,precipitation_probability&forecast_days=2&timezone=auto';
  const resp = await fetch(url, _fetchTimeoutOpts());
  if (!resp.ok) return;
  const data = await resp.json();
  if (!data.hourly || !data.hourly.time) return;

  const dusk = state.nightStartIso ? _anchorTonight(state.nightStartIso, null) : (() => { const d = new Date(); d.setHours(18, 0, 0, 0); return d; })();
  const dawn = state.nightEndIso   ? _anchorTonight(state.nightEndIso, dusk)   : new Date(dusk.getTime() + 12 * 3600000);

  const hours = data.hourly.time
    .map((t, i) => ({ time: new Date(t), cloud: data.hourly.cloud_cover[i], precip: data.hourly.precipitation_probability[i] }))
    .filter(h => h.time >= dusk && h.time <= dawn);
  const verdict = _swNightVerdict(hours);
  if (!verdict) return;

  await _saveNotifyState({ ...state, lastNotified: todayKey });
  await self.registration.showNotification(verdict.title, {
    body: verdict.body, tag: 'nightly-outlook',
    icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
  });
}

self.addEventListener('periodicsync', e => {
  if (e.tag === 'nightly-outlook') e.waitUntil(_nightlyOutlook().catch(() => {}));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus();
      return clients.openWindow('.');
    })
  );
});
