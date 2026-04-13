const CACHE = 'night-sky-v33';
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

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
