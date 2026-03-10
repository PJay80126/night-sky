// ═══════════════════════════════════════════════════════════════════════════
// Night Sky Observer — app.js
// ═══════════════════════════════════════════════════════════════════════════
//
// Sections:
//   1.  App state
//   2.  Photo data (paths, feature→image map, captions)
//   3.  Lunar feature catalogue
//   4.  Moon helpers  (getMoonInfo, findNearestFQ, findNextFQ, getStatus)
//   5.  Moon tab render (render, updateTimeline, updateMoonSVG, targets)
//   6.  Lightbox & photo toggle
//   7.  Observer location
//   8.  Planet data & astronomy helpers
//   9.  Planets tab render (renderPlanets, drawAltitudeGraph)
//  10.  Sky Events tab (computeSkyEvents, loadEvents, filterEvents, visibility)
//  11.  Forecast tab  (fetchForecast, parseForecast, render, canvas charts)
//  12.  Tab switching & resize handler
//  13.  Service worker registration
//
// ═══════════════════════════════════════════════════════════════════════════


// ── 1. App state ─────────────────────────────────────────────────────────
// Shared mutable state replaces scattered window._ globals.
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
};


// ── 2. Photo data ─────────────────────────────────────────────────────────
const PHOTO_BASE = 'photos/';

const PHOTO_DATA = {
  'Apennine_Mountains_Archimedes_and_Eratosthenes':                                                          PHOTO_BASE + 'Apennine_Mountains_Archimedes_and_Eratosthenes.png',
  'Aristoteles_Eudoxus_Alpine_Valley_Alps_Mountains_Cassini_Caucasus_Mountains_Aristillus_Autolycus_Plato':  PHOTO_BASE + 'Aristoteles_Eudoxus_Alpine_Valley_Alps_Mountains_Cassini_Caucasus_Mountains_Aristillus_Autolycus_and_Plato.png',
  'Bessel_Haemus_Mountains_and_Manilius':                                                                    PHOTO_BASE + 'Bessel_Haemus_Mountains_and_Manilius.png',
  'Carpathian_Mountains_Copernicus_Reinhold_and_Lansberg':                                                   PHOTO_BASE + 'Carpathian_Mountains_Copernicus_Reinhold_and_Lansberg.png',
  'Cleomedes_Newcomb_Macrobius_and_Taurus_Mountains':                                                        PHOTO_BASE + 'Cleomedes_Newcomb_Macrobius_and_Taurus_Mountains.png',
  'Endymion_Atlas_and_Hercules':                                                                             PHOTO_BASE + 'Endymion_Atlas_and_Hercules.png',
  'Fracastorius_Piccolomini_Theophilus_Cyrillus_Catharina_and_Altai_Scarp':                                  PHOTO_BASE + 'Fracastorius_Piccolomini_Theophilus_Cyrillus_Catharina_and_Altai_Scarp.png',
  'Gassendi_and_Mersenius':                                                                                  PHOTO_BASE + 'Gassendi_and_Mersenius.png',
  'Herschel_Ptolemaeus_Alphonsus_and_Arzachel':                                                              PHOTO_BASE + 'Herschel_Ptolemaeus_Alphonsus_and_Arzachel.png',
  'Hevelius_and_Grimaldi':                                                                                   PHOTO_BASE + 'Hevelius_and_Grimaldi.png',
  'Hipparchus_Halley_and_Albategnius':                                                                       PHOTO_BASE + 'Hipparchus_Halley_and_Albategnius.png',
  'Julius_Caesar':                                                                                           PHOTO_BASE + 'Julius_Caesar.png',
  'Jura_Mountains':                                                                                          PHOTO_BASE + 'Jura_Mountains.png',
  'Langrenus_Vendelinus_Petavius_Furnerius':                                                                 PHOTO_BASE + 'Langrenus_Vendelinus_Petavius_Furnerius.png',
  'Mare_Humorum_Nubium_Tranquilitatis_Crisium_Fecunditatis_Nectaris':                                        PHOTO_BASE + 'Mare_Humorum_Mare_Nubium_Mare_Tranquilitatis_Mare_Crisium_Mare_Fecunditatis_and_Mare_Nectaris.png',
  'Plato_Teneriffe_Mountains_and_Straight_Range':                                                            PHOTO_BASE + 'Plato_Teneriffe_Mountains_and_Straight_Range.png',
  'Plinius_Ross_Arago_Maskelyne_and_Delambre':                                                               PHOTO_BASE + 'Plinius_Ross_Arago_Maskelyne_and_Delambre.png',
  'Pyrenees_Mountains_and_Cook':                                                                             PHOTO_BASE + 'Pyrenees_Mountains_and_Cook.png',
  'Rheita_Valley_and_Furnerius':                                                                             PHOTO_BASE + 'Rheita_Valley_and_Furnerius.png',
  'Riphaeus_Mountains_and_Bullialdus':                                                                       PHOTO_BASE + 'Riphaeus_Mountains_and_Bullialdus.png',
  'Sinus_Aestuum_Mare_Serenitatis_Lacus_Somniorum_Mare_Vaporum_and_Sinus_Medii':                             PHOTO_BASE + 'Sinus_Aestuum_Mare_Serenitatis_Lacus_Somniorum_Mare_Vaporum_and_Sinus_Medii.png',
  'Sinus_Roris_Sinus_Iridum_Mare_Frigoris_Mare_Imbrium_and_Oceanus_Procellarum':                             PHOTO_BASE + 'Sinus_Roris_Sinus_Iridum_Mare_Frigoris_Mare_Imbrium_and_Oceanus_Procellarum.png',
  'Snellius_Stevinus_Cook_and_Petavius':                                                                     PHOTO_BASE + 'Snellius_Stevinus_Cook_and_Petavius.png',
  'Spitsbergen_Mountains_and_Archimedes':                                                                    PHOTO_BASE + 'Spitsbergen_Mountains_and_Archimedes.png',
  'Straight_Wall':                                                                                           PHOTO_BASE + 'Straight_Wall.png',
  'Taruntius_and_Langrenus':                                                                                 PHOTO_BASE + 'Taruntius_and_Langrenus.png',
  'Taurus_Mountains_and_Posidonius':                                                                         PHOTO_BASE + 'Taurus_Mountains_and_Posidonius.png',
  'Tycho_Maginus_Clavius_Longomontanus_and_Wilhelm':                                                         PHOTO_BASE + 'Tycho_Maginus_Clavius_Longomontanus_and_Wilhelm.png',
};

// Maps each feature name to its image key
const FEATURE_IMAGE_MAP = {
  // Q-Day -5
  'Endymion':              'Endymion_Atlas_and_Hercules',
  'Cleomedes':             'Cleomedes_Newcomb_Macrobius_and_Taurus_Mountains',
  'Langrenus':             'Langrenus_Vendelinus_Petavius_Furnerius',
  'Vendelinus':            'Langrenus_Vendelinus_Petavius_Furnerius',
  'Petavius':              'Snellius_Stevinus_Cook_and_Petavius',
  'Furnerius':             'Rheita_Valley_and_Furnerius',
  'Snellius':              'Snellius_Stevinus_Cook_and_Petavius',
  'Stevinus':              'Snellius_Stevinus_Cook_and_Petavius',
  // Q-Day -4
  'Newcomb':               'Cleomedes_Newcomb_Macrobius_and_Taurus_Mountains',
  'Macrobius':             'Cleomedes_Newcomb_Macrobius_and_Taurus_Mountains',
  'Taruntius':             'Taruntius_and_Langrenus',
  'Mare Fecunditatis':     'Mare_Humorum_Nubium_Tranquilitatis_Crisium_Fecunditatis_Nectaris',
  'Cook':                  'Pyrenees_Mountains_and_Cook',
  'Rheita Valley':         'Rheita_Valley_and_Furnerius',
  // Q-Day -3
  'Atlas':                 'Endymion_Atlas_and_Hercules',
  'Hercules':              'Endymion_Atlas_and_Hercules',
  'Taurus Mountains':      'Cleomedes_Newcomb_Macrobius_and_Taurus_Mountains',
  'Pyrenees Mountains':    'Pyrenees_Mountains_and_Cook',
  'Fracastorius':          'Fracastorius_Piccolomini_Theophilus_Cyrillus_Catharina_and_Altai_Scarp',
  'Piccolomini':           'Fracastorius_Piccolomini_Theophilus_Cyrillus_Catharina_and_Altai_Scarp',
  // Q-Day -2
  'Lacus Somniorum':       'Sinus_Aestuum_Mare_Serenitatis_Lacus_Somniorum_Mare_Vaporum_and_Sinus_Medii',
  'Posidonius':            'Taurus_Mountains_and_Posidonius',
  'Mare Tranquillitatis':  'Mare_Humorum_Nubium_Tranquilitatis_Crisium_Fecunditatis_Nectaris',
  'Plinius':               'Plinius_Ross_Arago_Maskelyne_and_Delambre',
  'Ross':                  'Plinius_Ross_Arago_Maskelyne_and_Delambre',
  'Arago':                 'Plinius_Ross_Arago_Maskelyne_and_Delambre',
  'Maskelyne':             'Plinius_Ross_Arago_Maskelyne_and_Delambre',
  'Theophilus':            'Fracastorius_Piccolomini_Theophilus_Cyrillus_Catharina_and_Altai_Scarp',
  'Cyrillus':              'Fracastorius_Piccolomini_Theophilus_Cyrillus_Catharina_and_Altai_Scarp',
  'Catharina':             'Fracastorius_Piccolomini_Theophilus_Cyrillus_Catharina_and_Altai_Scarp',
  'Mare Nectaris':         'Mare_Humorum_Nubium_Tranquilitatis_Crisium_Fecunditatis_Nectaris',
  'Altai Scarp':           'Fracastorius_Piccolomini_Theophilus_Cyrillus_Catharina_and_Altai_Scarp',
  // Q-Day -1
  'Aristoteles':           'Aristoteles_Eudoxus_Alpine_Valley_Alps_Mountains_Cassini_Caucasus_Mountains_Aristillus_Autolycus_Plato',
  'Eudoxus':               'Aristoteles_Eudoxus_Alpine_Valley_Alps_Mountains_Cassini_Caucasus_Mountains_Aristillus_Autolycus_Plato',
  'Mare Serenitatis':      'Sinus_Aestuum_Mare_Serenitatis_Lacus_Somniorum_Mare_Vaporum_and_Sinus_Medii',
  'Bessel':                'Bessel_Haemus_Mountains_and_Manilius',
  'Haemus Mountains':      'Bessel_Haemus_Mountains_and_Manilius',
  'Manilius':              'Bessel_Haemus_Mountains_and_Manilius',
  'Julius Caesar':         'Julius_Caesar',
  'Delambre':              'Plinius_Ross_Arago_Maskelyne_and_Delambre',
  'Maurolycus':            'Tycho_Maginus_Clavius_Longomontanus_and_Wilhelm',
  // Q-Day 0
  'Alpine Valley':         'Aristoteles_Eudoxus_Alpine_Valley_Alps_Mountains_Cassini_Caucasus_Mountains_Aristillus_Autolycus_Plato',
  'Alps Mountains':        'Aristoteles_Eudoxus_Alpine_Valley_Alps_Mountains_Cassini_Caucasus_Mountains_Aristillus_Autolycus_Plato',
  'Cassini':               'Aristoteles_Eudoxus_Alpine_Valley_Alps_Mountains_Cassini_Caucasus_Mountains_Aristillus_Autolycus_Plato',
  'Caucasus Mountains':    'Aristoteles_Eudoxus_Alpine_Valley_Alps_Mountains_Cassini_Caucasus_Mountains_Aristillus_Autolycus_Plato',
  'Aristillus':            'Aristoteles_Eudoxus_Alpine_Valley_Alps_Mountains_Cassini_Caucasus_Mountains_Aristillus_Autolycus_Plato',
  'Autolycus':             'Aristoteles_Eudoxus_Alpine_Valley_Alps_Mountains_Cassini_Caucasus_Mountains_Aristillus_Autolycus_Plato',
  'Apennine Mountains':    'Apennine_Mountains_Archimedes_and_Eratosthenes',
  'Mare Vaporum':          'Sinus_Aestuum_Mare_Serenitatis_Lacus_Somniorum_Mare_Vaporum_and_Sinus_Medii',
  'Sinus Medii':           'Sinus_Aestuum_Mare_Serenitatis_Lacus_Somniorum_Mare_Vaporum_and_Sinus_Medii',
  'Hipparchus':            'Hipparchus_Halley_and_Albategnius',
  'Halley':                'Hipparchus_Halley_and_Albategnius',
  'Albategnius':           'Hipparchus_Halley_and_Albategnius',
  'Herschel':              'Herschel_Ptolemaeus_Alphonsus_and_Arzachel',
  'Ptolemaeus':            'Herschel_Ptolemaeus_Alphonsus_and_Arzachel',
  'Alphonsus':             'Herschel_Ptolemaeus_Alphonsus_and_Arzachel',
  'Arzachel':              'Herschel_Ptolemaeus_Alphonsus_and_Arzachel',
  // Q-Day 1
  'Plato':                 'Plato_Teneriffe_Mountains_and_Straight_Range',
  'Teneriffe Mountains':   'Plato_Teneriffe_Mountains_and_Straight_Range',
  'Spitzbergen Mountains': 'Spitsbergen_Mountains_and_Archimedes',
  'Archimedes':            'Spitsbergen_Mountains_and_Archimedes',
  'Timocharis':            'Spitsbergen_Mountains_and_Archimedes',
  'Eratosthenes':          'Apennine_Mountains_Archimedes_and_Eratosthenes',
  'Sinus Aestuum':         'Sinus_Aestuum_Mare_Serenitatis_Lacus_Somniorum_Mare_Vaporum_and_Sinus_Medii',
  'Straight Wall':         'Straight_Wall',
  'Tycho':                 'Tycho_Maginus_Clavius_Longomontanus_and_Wilhelm',
  'Maginus':               'Tycho_Maginus_Clavius_Longomontanus_and_Wilhelm',
  'Clavius':               'Tycho_Maginus_Clavius_Longomontanus_and_Wilhelm',
  // Q-Day 2
  'Mare Imbrium':          'Sinus_Roris_Sinus_Iridum_Mare_Frigoris_Mare_Imbrium_and_Oceanus_Procellarum',
  'Carpathian Mountains':  'Carpathian_Mountains_Copernicus_Reinhold_and_Lansberg',
  'Copernicus':            'Carpathian_Mountains_Copernicus_Reinhold_and_Lansberg',
  'Reinhold':              'Carpathian_Mountains_Copernicus_Reinhold_and_Lansberg',
  'Lansberg':              'Carpathian_Mountains_Copernicus_Reinhold_and_Lansberg',
  'Riphaeus Mountains':    'Riphaeus_Mountains_and_Bullialdus',
  'Bullialdus':            'Riphaeus_Mountains_and_Bullialdus',
  'Wilhelm':               'Tycho_Maginus_Clavius_Longomontanus_and_Wilhelm',
  'Longomontanus':         'Tycho_Maginus_Clavius_Longomontanus_and_Wilhelm',
  // Q-Day 3
  'Jura Mountains':        'Jura_Mountains',
  'Sinus Iridum':          'Sinus_Roris_Sinus_Iridum_Mare_Frigoris_Mare_Imbrium_and_Oceanus_Procellarum',
  'Gassendi':              'Gassendi_and_Mersenius',
  'Mersenius':             'Gassendi_and_Mersenius',
  // Q-Day 4
  'Oceanus Procellarum':   'Sinus_Roris_Sinus_Iridum_Mare_Frigoris_Mare_Imbrium_and_Oceanus_Procellarum',
  'Mare Humorum':          'Mare_Humorum_Nubium_Tranquilitatis_Crisium_Fecunditatis_Nectaris',
  // Q-Day 5
  'Sinus Roris':           'Sinus_Roris_Sinus_Iridum_Mare_Frigoris_Mare_Imbrium_and_Oceanus_Procellarum',
  // Q-Day 6
  'Hevelius':              'Hevelius_and_Grimaldi',
  'Grimaldi':              'Hevelius_and_Grimaldi',
};

// Maps image key → readable caption
const PHOTO_CAPTIONS = {
  'Endymion_Atlas_and_Hercules': 'Endymion, Atlas & Hercules',
  'Cleomedes_Newcomb_Macrobius_and_Taurus_Mountains': 'Cleomedes, Newcomb, Macrobius & Taurus Mountains',
  'Langrenus_Vendelinus_Petavius_Furnerius': 'The Gang of Four: Langrenus, Vendelinus, Petavius & Furnerius',
  'Snellius_Stevinus_Cook_and_Petavius': 'Snellius, Stevinus, Cook & Petavius',
  'Taruntius_and_Langrenus': 'Taruntius & Langrenus',
  'Rheita_Valley_and_Furnerius': 'Rheita Valley & Furnerius',
  'Taurus_Mountains_and_Posidonius': 'Taurus Mountains & Posidonius',
  'Pyrenees_Mountains_and_Cook': 'Pyrenees Mountains & Cook',
  'Fracastorius_Piccolomini_Theophilus_Cyrillus_Catharina_and_Altai_Scarp': 'Fracastorius, Piccolomini, Theophilus, Cyrillus, Catharina & Altai Scarp',
  'Plinius_Ross_Arago_Maskelyne_and_Delambre': 'Plinius, Ross, Arago, Maskelyne & Delambre',
  'Aristoteles_Eudoxus_Alpine_Valley_Alps_Mountains_Cassini_Caucasus_Mountains_Aristillus_Autolycus_and_Plato': 'Aristoteles, Eudoxus, Alpine Valley, Alps, Cassini, Caucasus Mtns, Aristillus, Autolycus & Plato',
  'Bessel_Haemus_Mountains_and_Manilius': 'Bessel, Haemus Mountains & Manilius',
  'Julius_Caesar': 'Julius Caesar',
  'Maurolycus': 'Maurolycus',
  'Apennine_Mountains_Archimedes_and_Eratosthenes': 'Apennine Mountains, Archimedes & Eratosthenes',
  'Hipparchus_Halley_and_Albategnius': 'Hipparchus, Halley & Albategnius',
  'Herschel_Ptolomaeus_Alphonsus_and_Arzachel': 'Herschel, Ptolemaeus, Alphonsus & Arzachel',
  'Plato_Teneriffe_Mountains_and_Straight_Range': 'Plato, Teneriffe Mountains & Straight Range',
  'Spitsbergen_Mountains_and_Archimedes': 'Spitsbergen Mountains & Archimedes',
  'Timocharis': 'Timocharis',
  'Straight_Wall': 'Straight Wall',
  'Tycho_Maginus_Clavius_Longomontanus_and_Wilhelm': 'Tycho, Maginus, Clavius, Longomontanus & Wilhelm',
  'Carpathian_Mountains_Copernicus_Reinhold_and_Lansberg': 'Carpathian Mountains, Copernicus, Reinhold & Lansberg',
  'Riphaeus_Mountains_and_Bullialdus': 'Riphaeus Mountains & Bullialdus',
  'Bullialdus': 'Bullialdus',
  'Jura_Mountains': 'Jura Mountains & Sinus Iridum',
  'Kepler': 'Kepler',
  'Gassendi_and_Mersenius': 'Gassendi & Mersenius',
  'Schiller': 'Schiller',
  'Aristarchus': 'Aristarchus',
  'Schickard': 'Schickard',
  'Hevelius_and_Grimaldi': 'Hevelius & Grimaldi',
  'Mare_Humorum_Mare_Nubium_Mare_Tranquilitatis_Mare_Crisium_Mare_Fecunditatis_and_Mare_Nectaris': 'Mare Humorum, Mare Nubium, Mare Tranquillitatis, Mare Crisium, Mare Fecunditatis & Mare Nectaris',
  'Sinus_Aestuum_Mare_Serenitatis_Lacus_Somniorum_Mare_Vaporum_and_Sinus_Medii': 'Sinus Aestuum, Mare Serenitatis, Lacus Somniorum, Mare Vaporum & Sinus Medii',
  'Sinus_Roris_Sinus_Iridum_Mare_Frigoris_Mare_Imbrium_and_Oceanus_Procellarum': 'Sinus Roris, Sinus Iridum, Mare Frigoris, Mare Imbrium & Oceanus Procellarum',
};


// ── 3. Lunar feature catalogue ────────────────────────────────────────────
const FEATURES = [
  // Q-Day -5
  {name:'Endymion',             qday:-5, pos:'N', desc:'Large dark-floored crater E of Mare Frigoris'},
  {name:'Cleomedes',            qday:-5, pos:'N', desc:'Prominent eroded crater N of Mare Crisium'},
  {name:'Mare Crisium',         qday:-5, pos:'E', desc:'Spectacular lava-filled basin with impressive wall structures'},
  {name:'Langrenus',            qday:-5, pos:'E', desc:'Crater with twin peaks, terraced walls and ejecta field'},
  {name:'Vendelinus',           qday:-5, pos:'E', desc:'Large, heavily eroded crater'},
  {name:'Petavius',             qday:-5, pos:'S', desc:'Crater with massive complex central peak and floor rifts'},
  {name:'Furnerius',            qday:-5, pos:'S', desc:'Old eroded crater with ejecta on its floor'},
  {name:'Snellius',             qday:-5, pos:'S', desc:'Old eroded crater SW of Petavius'},
  {name:'Stevinus',             qday:-5, pos:'S', desc:'Prominent circular crater with deep-terraced walls'},
  // Q-Day -4
  {name:'Newcomb',              qday:-4, pos:'N', desc:'Midsize crater, part of a complex NE of Taurus Mountains'},
  {name:'Macrobius',            qday:-4, pos:'N', desc:'Well-defined crater with central feature NW of Mare Crisium'},
  {name:'Taruntius',            qday:-4, pos:'E', desc:'Midsized crater at N edge of Mare Fecunditatis'},
  {name:'Mare Fecunditatis',    qday:-4, pos:'E', desc:'Two contiguous round areas of dark basaltic lava'},
  {name:'Cook',                 qday:-4, pos:'E', desc:'Midsized lava-filled crater on SW edge of Mare Fecunditatis'},
  {name:'Rheita Valley',        qday:-4, pos:'S', desc:'Longest lunar valley visible from Earth, W of Furnerius'},
  // Q-Day -3
  {name:'Atlas',                qday:-3, pos:'N', desc:'Prominent crater to E of Hercules'},
  {name:'Hercules',             qday:-3, pos:'N', desc:'Prominent crater on E edge of Mare Frigoris'},
  {name:'Taurus Mountains',     qday:-3, pos:'N', desc:'Mountain range E of Mare Serenitatis'},
  {name:'Pyrenees Mountains',   qday:-3, pos:'S', desc:'Mountain range forming inner ring E of Mare Nectaris'},
  {name:'Fracastorius',         qday:-3, pos:'S', desc:'Lava-filled crater at S tip of Mare Nectaris'},
  {name:'Piccolomini',          qday:-3, pos:'S', desc:'Midsized crater S of Fracastorius at S tip of Altai Scarp'},
  // Q-Day -2
  {name:'Lacus Somniorum',      qday:-2, pos:'N', desc:'Large lava field connected with NE of Mare Serenitatis'},
  {name:'Posidonius',           qday:-2, pos:'N', desc:'Flooded crater with very irregular terrain'},
  {name:'Mare Tranquillitatis', qday:-2, pos:'E', desc:'Large sea on the E side — first lunar landing site'},
  {name:'Plinius',              qday:-2, pos:'E', desc:'Complex crater with multiple central mountains'},
  {name:'Ross',                 qday:-2, pos:'E', desc:'Crater within Mare Tranquillitatis on its W side'},
  {name:'Arago',                qday:-2, pos:'E', desc:'Crater within Mare Tranquillitatis on its W side'},
  {name:'Maskelyne',            qday:-2, pos:'E', desc:'Crater within Mare Tranquillitatis on its S side'},
  {name:'Theophilus',           qday:-2, pos:'E', desc:'Bordering Mare Nectaris, part of trio with Cyrillus & Catharina'},
  {name:'Cyrillus',             qday:-2, pos:'E', desc:'Older than Theophilus, more eroded, overlapped on E wall'},
  {name:'Catharina',            qday:-2, pos:'E', desc:'Eroded crater at N edge of the Altai Scarp'},
  {name:'Mare Nectaris',        qday:-2, pos:'S', desc:'Smallest of the major circular maria, 350 km across'},
  {name:'Altai Scarp',          qday:-2, pos:'S', desc:'Continuous SW outer rim of the Nectaris basin — spectacular at low Sun'},
  // Q-Day -1
  {name:'Aristoteles',          qday:-1, pos:'N', desc:'Crater at S edge of Mare Frigoris'},
  {name:'Eudoxus',              qday:-1, pos:'N', desc:'Neighbour of Aristoteles'},
  {name:'Mare Serenitatis',     qday:-1, pos:'N', desc:'Impact basin filled with Imbrium Era mare material'},
  {name:'Bessel',               qday:-1, pos:'N', desc:'Sharp crater near center of Mare Serenitatis'},
  {name:'Haemus Mountains',     qday:-1, pos:'E', desc:'Raised edge forming SW shore of Mare Serenitatis'},
  {name:'Manilius',             qday:-1, pos:'E', desc:'Large crater in a relatively crater-free area E of Mare Vaporum'},
  {name:'Julius Caesar',        qday:-1, pos:'E', desc:'Lava-filled eroded crater W of Mare Tranquillitatis'},
  {name:'Delambre',             qday:-1, pos:'E', desc:'Sharp crater with terraced rim SW of Mare Tranquillitatis'},
  {name:'Maurolycus',           qday:-1, pos:'S', desc:'Large crater with terraced walls'},
  // Q-Day 0
  {name:'Mare Frigoris',        qday: 0, pos:'N', desc:'Large linear sea at the N limb of the Moon'},
  {name:'Alpine Valley',        qday: 0, pos:'N', desc:'Runs perpendicular to the prominent Alps Mountains'},
  {name:'Alps Mountains',       qday: 0, pos:'N', desc:'Spectacular boundary of the Mare Imbrium basin'},
  {name:'Cassini',              qday: 0, pos:'N', desc:'Mid-sized crater on NE edge of Mare Imbrium with two inner craters'},
  {name:'Caucasus Mountains',   qday: 0, pos:'N', desc:'Mountain chain forming NW shore of Mare Serenitatis'},
  {name:'Aristillus',           qday: 0, pos:'N', desc:'Crater in Mare Imbrium with notable ejecta blanket'},
  {name:'Autolycus',            qday: 0, pos:'N', desc:'Crater directly S of Aristillus'},
  {name:'Apennine Mountains',   qday: 0, pos:'E', desc:'Spectacular mountain range NW of Mare Vaporum'},
  {name:'Mare Vaporum',         qday: 0, pos:'E', desc:'Smaller mare between Mare Imbrium and Mare Serenitatis'},
  {name:'Sinus Medii',          qday: 0, pos:'E', desc:'Lighter-coloured lava feature S of Mare Vaporum'},
  {name:'Hipparchus',           qday: 0, pos:'E', desc:'Old eroded square-ish crater below Sinus Medii'},
  {name:'Halley',               qday: 0, pos:'E', desc:'Small crater touching the S of Hipparchus'},
  {name:'Albategnius',          qday: 0, pos:'E', desc:'Large crater with off-centre peak'},
  {name:'Herschel',             qday: 0, pos:'E', desc:'Smaller crater N of Ptolemaeus'},
  {name:'Ptolemaeus',           qday: 0, pos:'E', desc:'Younger neighbour of Alphonsus'},
  {name:'Alphonsus',            qday: 0, pos:'E', desc:'Prominent crater with central peak, E of Mare Nubium'},
  {name:'Arzachel',             qday: 0, pos:'E', desc:'Crater with sharply-defined, deep-terraced walls'},
  // Q-Day 1
  {name:'Plato',                qday: 1, pos:'N', desc:'Dark-floored crater on margin of Mare Imbrium S of Mare Frigoris'},
  {name:'Teneriffe Mountains',  qday: 1, pos:'N', desc:'Small mountain range in N part of Mare Imbrium'},
  {name:'Spitzbergen Mountains',qday: 1, pos:'N', desc:'Small range in E quadrant of Mare Imbrium'},
  {name:'Archimedes',           qday: 1, pos:'N', desc:'Sharp crater with terraced walls in Mare Imbrium'},
  {name:'Timocharis',           qday: 1, pos:'N', desc:'Prominent crater near middle of Mare Imbrium'},
  {name:'Eratosthenes',         qday: 1, pos:'E', desc:'Large crater at S tip of Montes Apenninus'},
  {name:'Sinus Aestuum',        qday: 1, pos:'E', desc:'Seething Bay — S of Mare Imbrium'},
  {name:'Mare Nubium',          qday: 1, pos:'S', desc:'Southernmost sea directly W of Alphonsus'},
  {name:'Straight Wall',        qday: 1, pos:'S', desc:'Rupes Recta — a cliff on E side of Mare Nubium'},
  {name:'Tycho',                qday: 1, pos:'S', desc:'Recent crater best seen at Full Moon when rays spread across the surface'},
  {name:'Maginus',              qday: 1, pos:'S', desc:'Large old and eroded crater above Clavius'},
  {name:'Clavius',              qday: 1, pos:'S', desc:'Large crater at S end of the Moon'},
  // Q-Day 2
  {name:'Straight Range',       qday: 2, pos:'N', desc:'Montes Recti — small mountain range in N Mare Imbrium'},
  {name:'Mare Imbrium',         qday: 2, pos:'N', desc:'Sea of Rains — large sea S of Mare Frigoris'},
  {name:'Carpathian Mountains', qday: 2, pos:'E', desc:'Large mountain chain forming S edge of Mare Imbrium'},
  {name:'Copernicus',           qday: 2, pos:'E', desc:'Spectacular central peaks surrounded by ejecta and secondary craters'},
  {name:'Reinhold',             qday: 2, pos:'E', desc:'Terraced wall crater with ejecta blanket, N of Mare Cognitum'},
  {name:'Lansberg',             qday: 2, pos:'E', desc:'Deep terraced wall crater SW of Reinhold'},
  {name:'Riphaeus Mountains',   qday: 2, pos:'E', desc:'Mountain range in S part of Oceanus Procellarum'},
  {name:'Bullialdus',           qday: 2, pos:'S', desc:'Exceptional crater with ejecta blanket in W Mare Nubium'},
  {name:'Wilhelm',              qday: 2, pos:'S', desc:'Large crater W of Tycho'},
  {name:'Longomontanus',        qday: 2, pos:'S', desc:'Very large prominent crater in heavily impacted region'},
  // Q-Day 3
  {name:'Jura Mountains',       qday: 3, pos:'N', desc:'High mountain range almost completely encircling Sinus Iridum'},
  {name:'Sinus Iridum',         qday: 3, pos:'N', desc:'Dark-flooded crater on edge of Mare Imbrium'},
  {name:'Kepler',               qday: 3, pos:'E', desc:'Recent impact crater with bright ray system'},
  {name:'Gassendi',             qday: 3, pos:'E', desc:'Eroded crater with system of rilles on its floor'},
  {name:'Schiller',             qday: 3, pos:'S', desc:'Large and elongated crater in SW quadrant'},
  // Q-Day 4
  {name:'Mersenius',            qday: 4, pos:'S', desc:'Large eroded crater W of Mare Humorum'},
  {name:'Aristarchus',          qday: 4, pos:'N', desc:'Bright complex crater near edge of Oceanus Procellarum'},
  {name:'Oceanus Procellarum',  qday: 4, pos:'E', desc:'Ocean of Storms — large lava-covered area W of Mare Imbrium'},
  {name:'Mare Humorum',         qday: 4, pos:'S', desc:'Sea of Moisture — small sea S of Oceanus Procellarum'},
  // Q-Day 5
  {name:'Sinus Roris',          qday: 5, pos:'N', desc:'Bay of Dew — NW bay linking Oceanus Procellarum and Mare Frigoris'},
  {name:'Schickard',            qday: 5, pos:'S', desc:'Very large crater with bright spots in SW quadrant'},
  // Q-Day 6
  {name:'Hevelius',             qday: 6, pos:'E', desc:'Low-rimmed eroded crater N of Grimaldi'},
  {name:'Grimaldi',             qday: 6, pos:'E', desc:'Large round basin with dark floor on W edge of the Moon'},
];


// ── 4. Moon helpers ───────────────────────────────────────────────────────

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

function posLabel(p) { return p === 'N' ? 'North' : p === 'S' ? 'South' : 'Equatorial'; }

function getMoonInfo(date) {
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
  const pct   = Math.round((1 + Math.cos(toRad(illum.phase_angle))) / 2 * 100);

  let q    = Astronomy.SearchMoonQuarter(new Date(date.getTime() - 30 * 86400000));
  let prev = q;
  while (q.time.date <= date) { prev = q; q = Astronomy.NextMoonQuarter(q); }

  const prevQ = prev.quarter; // 0=new, 1=FQ, 2=full, 3=LQ
  const icons = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
  let name, icon;

  switch (prevQ) {
    case 0: name = 'Waxing Crescent'; icon = icons[1]; break;
    case 1: name = 'Waxing Gibbous';  icon = icons[3]; break;
    case 2: name = 'Waning Gibbous';  icon = icons[5]; break;
    case 3: name = 'Waning Crescent'; icon = icons[7]; break;
  }

  const daysFromPrev = (date - prev.time.date) / 86400000;
  const daysToNext   = (q.time.date - date) / 86400000;

  if (daysFromPrev < 0.5) {
    switch (prevQ) {
      case 0: name = 'New Moon';      icon = icons[0]; break;
      case 1: name = 'First Quarter'; icon = icons[2]; break;
      case 2: name = 'Full Moon';     icon = icons[4]; break;
      case 3: name = 'Last Quarter';  icon = icons[6]; break;
    }
  } else if (daysToNext < 0.5) {
    switch (q.quarter) {
      case 0: name = 'New Moon';      icon = icons[0]; break;
      case 1: name = 'First Quarter'; icon = icons[2]; break;
      case 2: name = 'Full Moon';     icon = icons[4]; break;
      case 3: name = 'Last Quarter';  icon = icons[6]; break;
    }
  }

  return { pct, icon, name, label: `${icon} ${name} (${pct}% illuminated)` };
}

function findNearestFQ(date) {
  let q    = Astronomy.SearchMoonQuarter(new Date(date.getTime() - 30 * 86400000));
  let best = null, bestDiff = Infinity;
  for (let i = 0; i < 10; i++) {
    if (q.quarter === 1) {
      const diff = Math.abs(q.time.date - date);
      if (diff < bestDiff) { bestDiff = diff; best = q.time.date; }
    }
    q = Astronomy.NextMoonQuarter(q);
    if (q.time.date > new Date(date.getTime() + 30 * 86400000)) break;
  }
  return best;
}

function findNextFQ(date) {
  let q = Astronomy.SearchMoonQuarter(date);
  for (let i = 0; i < 10; i++) {
    if (q.quarter === 1 && q.time.date > date) return q.time.date;
    q = Astronomy.NextMoonQuarter(q);
  }
  return null;
}

function getStatus(q) {
  const { pct } = getMoonInfo(today());
  if (pct > 95)          return { cls:'bad',      text:'Near Full Moon — features will appear washed out and flat.' };
  if (pct > 75)          return { cls:'warn',      text:'Gibbous Moon — some features losing shadow contrast.' };
  if (Math.abs(q) > 10)  return { cls:'inactive',  text:'Outside observing window. Wait for the Moon to return after New Moon.' };
  if (q >= -4 && q <= 4) return { cls:'good',      text:'✦ Prime observing time! The terminator is well-placed for dramatic shadows.' };
  if (q >= -6 && q <= 7) return { cls:'warn',      text:'Decent conditions — some features may be past their best lighting.' };
  return                        { cls:'warn',      text:'Moon is growing — early targets are becoming visible.' };
}

function getTargets(q) {
  if (Math.abs(q) > 10) return [];
  return FEATURES.filter(f => [q-1, q, q+1].includes(f.qday));
}


// ── 5. Moon tab render ────────────────────────────────────────────────────

function updateMoonSVG(q) {
  const shadow = document.getElementById('shadowRect');
  if (!shadow) return;
  const frac = Math.max(0, Math.min(1, (q + 7) / 14));
  shadow.setAttribute('width', Math.round((1 - frac) * 110));
}

function updateTimeline(date) {
  const LUNAR_CYCLE = 29.53059;

  let q = Astronomy.SearchMoonQuarter(new Date(date.getTime() - 32 * 86400000));
  let lastNew = null;
  while (true) {
    if (q.quarter === 0 && q.time.date <= date) lastNew = q.time.date;
    const next = Astronomy.NextMoonQuarter(q);
    if (next.time.date > date) break;
    q = next;
  }

  const moonAge  = lastNew ? (date - lastNew) / 86400000 : 0;
  const FULL_AGE = LUNAR_CYCLE / 2;
  const remapped = (moonAge - FULL_AGE + LUNAR_CYCLE) % LUNAR_CYCLE;
  const pct      = Math.min(100, Math.max(0, (remapped / LUNAR_CYCLE) * 100));

  document.getElementById('timelineFill').style.width   = pct + '%';
  document.getElementById('timelineCursor').style.left  = pct + '%';
}

function render() {
  const now       = today();
  const nearestFQ = findNearestFQ(now);
  const qday      = daysBetween(nearestFQ, now);

  document.getElementById('qdayNum').textContent = (qday >= 0 ? '+' : '') + qday;
  document.getElementById('qdayRef').textContent =
    qday === 0 ? 'First Quarter — Q-Day 0!'
    : qday > 0 ? `${qday} day${qday !== 1 ? 's' : ''} after First Quarter`
    : `${Math.abs(qday)} day${Math.abs(qday) !== 1 ? 's' : ''} before First Quarter`;

  document.getElementById('todayDate').textContent = formatDate(now);
  document.getElementById('nearestFQ').textContent = formatDate(nearestFQ);

  const nextFQDate = findNextFQ(now);
  document.getElementById('nextFQ').textContent    = nextFQDate ? formatDate(nextFQDate) : '—';
  document.getElementById('currentPhase').textContent = getMoonInfo(now).label;

  const st = getStatus(qday);
  document.getElementById('statusDot').className  = 'status-dot ' + st.cls;
  document.getElementById('statusText').textContent = st.text;

  updateTimeline(now);
  updateMoonSVG(qday);

  // Countdown line
  const cdEl           = document.getElementById('countdown');
  const nearestFQDiff  = daysBetween(now, nearestFQ);
  if (nearestFQDiff === 0) {
    cdEl.innerHTML = 'Tonight <span>is</span> First Quarter — best night of the cycle!';
  } else if (nearestFQDiff > 0) {
    cdEl.innerHTML = `First Quarter in <span>${nearestFQDiff} day${nearestFQDiff !== 1 ? 's' : ''}</span>`;
  } else {
    let nq = Astronomy.SearchMoonQuarter(now);
    for (let i = 0; i < 10; i++) {
      if (nq.time.date > now) break;
      nq = Astronomy.NextMoonQuarter(nq);
    }
    const phaseNames  = ['🌑 New Moon', '🌓 First Quarter', '🌕 Full Moon', '🌗 Third Quarter'];
    const daysToNext  = Math.ceil((nq.time.date - now) / 86400000);
    cdEl.innerHTML = `<span>${phaseNames[nq.quarter]}</span> in <span>${daysToNext} day${daysToNext !== 1 ? 's' : ''}</span>`;
  }

  // Targets
  const targets = getTargets(qday);
  const body    = document.getElementById('targetsBody');

  if (targets.length === 0) {
    const { name, pct } = getMoonInfo(now);
    const nextFQ        = findNextFQ(now);
    const daysToNextFQ  = nextFQ ? Math.round((nextFQ - now) / 86400000) : '—';
    let msg = '';
    if (pct > 95) {
      msg = `${name} (${pct}% illuminated) — features appear washed out and flat under near-overhead illumination.<br>Best viewing resumes around Q-Day –6, in approximately ${daysToNextFQ} days.`;
    } else if (pct > 75) {
      msg = `${name} (${pct}% illuminated) — the terminator has passed most listed features and contrast is fading.<br>Best viewing resumes around Q-Day –6, in approximately ${daysToNextFQ} days.`;
    } else if (qday <= -7) {
      msg = `${name} (${pct}% illuminated) — the Moon is a thin crescent and features are not yet well illuminated.<br>Targets start appearing around Q-Day –6.`;
    } else {
      msg = `${name} (${pct}% illuminated) — no targets are listed for Q-Day ${qday >= 0 ? '+' : ''}${qday} in the RASC catalogue.<br>Best window is Q-Day –6 to +6.`;
    }
    body.innerHTML = '<p class="no-targets">' + msg + '</p>';
    return;
  }

  // Group by Q-Day
  const byQday = {};
  for (const t of targets) {
    if (!byQday[t.qday]) byQday[t.qday] = [];
    byQday[t.qday].push(t);
  }

  let html  = '';
  let delay = 0;
  const sortedQdays = Object.keys(byQday).map(Number).sort((a, b) => a - b);

  const hasTonight = targets.some(t => t.qday === qday);
  if (!hasTonight) {
    const edgeLabel = 'Q-Day ' + (qday >= 0 ? '+' : '') + qday + ' — Tonight\'s Best';
    html += '<div class="target-group">'
          + '<div class="target-group-label">' + edgeLabel + '</div>'
          + '<div class="target-item-edge-msg">'
          + 'No features are optimally placed tonight — you\'re at the edge of the observing window. '
          + 'Features from the previous night may still be catchable depending on libration.'
          + '</div></div>';
  }

  for (const q of sortedQdays) {
    const label = q === qday  ? `Q-Day ${q >= 0 ? '+' : ''}${q} — Tonight\'s Best`
                : q < qday   ? `Q-Day ${q >= 0 ? '+' : ''}${q} — Still Visible`
                :               `Q-Day ${q >= 0 ? '+' : ''}${q} — Coming Into View`;
    html += `<div class="target-group"><div class="target-group-label">${label}</div>`;

    for (const t of byQday[q]) {
      const imgKey  = FEATURE_IMAGE_MAP[t.name];
      const panelId = 'panel-' + t.name.replace(/[^a-z0-9]/gi, '_');
      const hasPhoto = imgKey && PHOTO_DATA[imgKey];
      const caption  = imgKey ? (PHOTO_CAPTIONS[imgKey] || imgKey.replace(/_/g, ' ')) : '';

      html += `<div class="target-item" style="animation-delay:${delay}ms">
        <div class="target-item-row">
          <span class="target-bullet">◆</span>
          <div class="target-info">
            <div class="target-name">${t.name}</div>
            <div class="target-desc">${t.desc}</div>
          </div>
          <div class="target-right">
            <span class="target-pos">${posLabel(t.pos)}</span>
            ${hasPhoto ? `<span class="target-photo-btn" onclick="togglePhoto('${t.name}', this)">📷 Photo</span>` : ''}
          </div>
        </div>
        ${hasPhoto ? `
        <div class="photo-panel" id="${panelId}">
          <img src="${PHOTO_DATA[imgKey]}" alt="${caption}" onclick="openLightbox('${PHOTO_DATA[imgKey]}')" loading="lazy"/>
          <div class="photo-caption">${caption} · tap to zoom</div>
        </div>` : ''}
      </div>`;
      delay += 40;
    }
    html += '</div>';
  }

  body.innerHTML = html;
}


// ── 6. Lightbox & photo toggle ────────────────────────────────────────────

function togglePhoto(featureName, btnEl) {
  const panelId = 'panel-' + featureName.replace(/[^a-z0-9]/gi, '_');
  const panel   = document.getElementById(panelId);
  if (!panel) return;
  const isOpen  = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  btnEl.textContent = isOpen ? '📷 Photo' : '✕ Close';
}

function openLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}


// ── 7. Observer location ──────────────────────────────────────────────────

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


// ── 8. Planet data & astronomy helpers ───────────────────────────────────

const PLANETS = [
  { name:'Moon',    icon:'🌙', color:'#e8dfc0' },
  { name:'Mercury', icon:'☿',  color:'#b0a090' },
  { name:'Venus',   icon:'♀',  color:'#e8d898' },
  { name:'Mars',    icon:'♂',  color:'#e08060' },
  { name:'Jupiter', icon:'♃',  color:'#c8b080' },
  { name:'Saturn',  icon:'♄',  color:'#d8c898' },
  { name:'Uranus',  icon:'⛢',  color:'#90d8d8' },
  { name:'Neptune', icon:'♆',  color:'#7090e0' },
];

function getPlanetRiseTransitSet(name, date) {
  const body      = Astronomy.Body[name];
  const observer  = new Astronomy.Observer(State.obsLat, State.obsLon, 0);
  const midnight  = new Date(date); midnight.setHours(0, 0, 0, 0);

  let rise = null, transit = null, set = null;
  try { rise    = Astronomy.SearchRiseSet(body, observer, +1, midnight, 2)?.date; } catch(e) {}
  const transitStart = rise ?? midnight;
  try { transit = Astronomy.SearchHourAngle(body, observer, 0, transitStart, +1)?.time.date; } catch(e) {}
  const setStart = transit ?? rise ?? midnight;
  try { set     = Astronomy.SearchRiseSet(body, observer, -1, setStart, 2)?.date; } catch(e) {}

  if (rise && transit && transit < rise)   transit = null;
  if (transit && set && set < transit)     set     = null;
  if (rise && set && set < rise)           set     = null;

  const fmt = d => {
    if (!d) return '—';
    const t   = d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:false });
    const day = d.toLocaleDateString([], { weekday:'short' });
    return `${t} <span class="time-day-suffix">${day}</span>`;
  };

  return {
    rise, transit, set,
    riseStr:    fmt(rise),
    transitStr: fmt(transit),
    setStr:     fmt(set),
    alwaysUp:   false,
    neverRises: !rise && !set && !transit,
  };
}

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

function getNightWindow(date) {
  const midnight = new Date(date); midnight.setHours(0, 0, 0, 0);
  const observer = new Astronomy.Observer(State.obsLat, State.obsLon, 0);
  let darkStart  = null, darkEnd = null;
  try { darkStart = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, midnight, 1, -18)?.date; } catch(e) {}
  try {
    const searchFrom = darkStart ?? new Date(midnight.getTime() + 20 * 3600000);
    darkEnd = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, +1, searchFrom, 1, -18)?.date;
  } catch(e) {}
  const nightStart = darkStart ?? new Date(midnight.getTime() + 18 * 3600000);
  const nightEnd   = darkEnd   ?? new Date(midnight.getTime() + 30 * 3600000);
  return { nightStart, nightEnd, noTrueDark: !darkStart || !darkEnd };
}

function planetAltitude(name, hour, date) {
  const body     = Astronomy.Body[name];
  const observer = new Astronomy.Observer(State.obsLat, State.obsLon, 0);
  const eq  = Astronomy.Equator(body, date, observer, true, true);
  const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal');
  return hor.altitude;
}

function getVisibility(rts, planetName, date) {
  if (rts.neverRises) return { label:'Below Horizon', cls:'badge-below' };
  if (rts.alwaysUp)   return { label:'Circumpolar',   cls:'badge-good'  };

  const { nightStart, nightEnd, noTrueDark } = getNightWindow(date);
  let peakAlt = -Infinity;
  for (let t = new Date(nightStart); t <= nightEnd; t = new Date(t.getTime() + 30 * 60000)) {
    try {
      const alt = planetAltitude(planetName, t.getHours() + t.getMinutes() / 60, t);
      if (alt > peakAlt) peakAlt = alt;
    } catch(e) {}
  }

  if (noTrueDark)    return { label:'No Dark Sky',   cls:'badge-poor'  };
  if (peakAlt >= 30) return { label:'Prime Viewing', cls:'badge-good'  };
  if (peakAlt >= 15) return { label:'Visible',       cls:'badge-ok'    };
  if (peakAlt >  0)  return { label:'Low Sky',       cls:'badge-poor'  };
  return               { label:'Below Horizon',       cls:'badge-below' };
}


// ── 9. Planets tab render ─────────────────────────────────────────────────

function renderPlanets() {
  const now  = today();
  const body = document.getElementById('planetsBody');
  const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);

  if (State.obsLat === null || State.obsLon === null) {
    body.innerHTML = locationErrorHTML('planets');
    return;
  }

  const tzLabel = new Date().toLocaleDateString('en-CA', { timeZoneName:'short' }).split(', ')[1] || 'Local';
  const sunset  = getSunsetTime(now);
  const sunrise = getSunriseTime(now);
  const { nightStart, nightEnd } = getNightWindow(now);

  const fmtTime = d => {
    if (!d) return '—';
    const time = d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:false });
    const day  = d.toLocaleDateString([], { weekday:'short' });
    return `${time} <span class="time-day-suffix">${day}</span>`;
  };

  let listHTML = `
    <div class="planets-date">Times in ${tzLabel} &middot; ${now.toLocaleDateString('en-CA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
    <div class="sun-date sun-row-top">🌅 Sunset ${fmtTime(sunset)} &nbsp;·&nbsp; 🌑 Dark ${fmtTime(nightStart)}</div>
    <div class="sun-date sun-row-bottom">🌄 Dawn ${fmtTime(nightEnd)} &nbsp;·&nbsp; 🌞 Sunrise ${fmtTime(sunrise)}</div>`;

  const visiblePlanets = [];
  let delay = 0;

  for (const planet of PLANETS) {
    const rts = getPlanetRiseTransitSet(planet.name, now);
    const vis = getVisibility(rts, planet.name, now);
    let timesHTML;

    if (rts.neverRises) {
      timesHTML = '<span>Not visible today</span>';
    } else if (rts.alwaysUp) {
      timesHTML = '<span>Circumpolar</span>';
      visiblePlanets.push(planet);
    } else {
      timesHTML = `<span>&#x1F305; ${rts.riseStr}</span><span>&#x1F31F; ${rts.transitStr}</span><span>&#x1F307; ${rts.setStr}</span>`;
      const observer       = new Astronomy.Observer(State.obsLat, State.obsLon, 0);
      const riseTime       = Astronomy.SearchRiseSet(Astronomy.Body[planet.name], observer, +1, midnight, 1)?.date;
      const setTime        = Astronomy.SearchRiseSet(Astronomy.Body[planet.name], observer, -1, midnight, 1)?.date;
      const upDuringNight  = (riseTime && riseTime < nightEnd) || (setTime && setTime > nightStart);
      if (upDuringNight) visiblePlanets.push(planet);
    }

    listHTML += `<div class="planet-row" style="animation-delay:${delay}ms">
      <span class="planet-icon" style="color:${planet.color}">${planet.icon}</span>
      <span class="planet-name">${planet.name}</span>
      <span class="planet-times">${timesHTML}</span>
      <span class="planet-badge ${vis.cls}">${vis.label}</span>
    </div>`;
    delay += 70;
  }

  // Build altitude graph for visible planets
  let graphHTML = '';
  if (visiblePlanets.length === 0) {
    graphHTML = '<div class="no-visible">No planets visible in tonight\'s window</div>';
  } else {
    const nsH    = nightStart.getHours() + nightStart.getMinutes() / 60;
    const neH    = nightEnd.getHours()   + nightEnd.getMinutes()   / 60;
    const neNorm = neH < 12 ? neH + 24 : neH;
    const H_START = Math.floor(nsH - 1);
    const H_END   = Math.floor(neNorm + 1);
    const STEPS   = Math.round((H_END - H_START) * 6);

    const datasets = visiblePlanets.map(planet => {
      const points = [];
      for (let i = 0; i <= STEPS; i++) {
        const h          = H_START + (H_END - H_START) * i / STEPS;
        const sampleDate = new Date(midnight.getTime() + h * 3600000);
        points.push(planetAltitude(planet.name, h, sampleDate));
      }
      return { planet, points };
    });

    const fmtH = hNorm => {
      const h = hNorm >= 24 ? hNorm - 24 : hNorm;
      return String(h).padStart(2, '0') + ':00';
    };

    const legendItems = visiblePlanets.map(p =>
      `<div class="legend-item" style="--planet-color:${p.color}">
        <div class="legend-dot legend-dot-bg"></div>
        <span class="legend-color">${p.icon}</span>
        <span>${p.name}</span>
      </div>`
    ).join('') + `<div class="legend-item" id="cloudLegendItem" style="display:${State.cloudNightHours ? 'flex' : 'none'}">
      <div class="legend-dot cloud-legend-dot"></div>
      <span class="cloud-legend-label">&#x2601;</span><span>Cloud cover</span>
    </div>`;

    graphHTML = `
      <div class="altitude-graph-wrap">
        <div class="altitude-graph-title">Altitude above Horizon &mdash; ${fmtH(H_START)} to ${fmtH(H_END)}</div>
        <div class="altitude-graph-container">
          <canvas id="altCanvas" class="altitude-canvas"></canvas>
        </div>
        <div class="altitude-legend">${legendItems}</div>
      </div>`;

    State.altDatasets = datasets;
    State.altSteps    = STEPS;
    State.altHStart   = H_START;
    State.altHEnd     = H_END;
  }

  body.innerHTML = listHTML + graphHTML;

  if (visiblePlanets.length > 0) {
    requestAnimationFrame(() => drawAltitudeGraph(State.altDatasets, State.altSteps, State.altHStart, State.altHEnd));
  }
}

function drawAltitudeGraph(datasets, STEPS, H_START, H_END) {
  H_START = H_START ?? 18;
  H_END   = H_END   ?? 30;
  const canvas = document.getElementById('altCanvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth;
  const H   = Math.round(W * 0.42);
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 32;
  const gW = W - PAD_L - PAD_R;
  const gH = H - PAD_T - PAD_B;

  ctx.fillStyle = '#0d1220';
  ctx.fillRect(0, 0, W, H);

  const skyGrad = ctx.createLinearGradient(PAD_L, PAD_T, PAD_L, PAD_T + gH);
  skyGrad.addColorStop(0, 'rgba(40,60,120,0.4)');
  skyGrad.addColorStop(1, 'rgba(10,15,30,0.2)');
  ctx.fillStyle = skyGrad;
  ctx.beginPath(); ctx.roundRect(PAD_L, PAD_T, gW, gH, 6); ctx.fill();

  const ALT_MIN = 0, ALT_MAX = 90;
  function xOf(i)   { return PAD_L + (i / STEPS) * gW; }
  function yOf(alt) { return PAD_T + gH - ((alt - ALT_MIN) / (ALT_MAX - ALT_MIN)) * gH; }

  // Horizon line
  ctx.strokeStyle = 'rgba(201,168,76,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(PAD_L, yOf(0)); ctx.lineTo(PAD_L + gW, yOf(0)); ctx.stroke();
  ctx.setLineDash([]);

  // Altitude gridlines at 30° and 60°
  for (const alt of [30, 60]) {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD_L, yOf(alt)); ctx.lineTo(PAD_L + gW, yOf(alt)); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(alt + '°', PAD_L - 4, yOf(alt) + 3);
  }
  ctx.fillStyle = 'rgba(201,168,76,0.7)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('0°', PAD_L - 4, yOf(0) + 3);

  // X-axis hour labels
  const altHourPx    = gW / (H_END - H_START);
  const altLabelEvery = Math.max(1, Math.ceil(36 / altHourPx));
  ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  for (let hNorm = H_START; hNorm <= H_END; hNorm++) {
    const x = PAD_L + ((hNorm - H_START) / (H_END - H_START)) * gW;
    if (x < PAD_L + 4 || x > PAD_L + gW - 4) continue;
    const h = hNorm >= 24 ? hNorm - 24 : hNorm;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + gH); ctx.stroke();
    if ((hNorm - H_START) % altLabelEvery !== 0) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(String(h).padStart(2, '0') + ':00', x, H - PAD_B + 14);
  }

  // Planet curves
  for (const { planet, points } of datasets) {
    // Fill
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= STEPS; i++) {
      const x = xOf(i), alt = Math.max(0, points[i]), y = yOf(alt);
      if (!started) { ctx.moveTo(x, yOf(0)); ctx.lineTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(xOf(STEPS), yOf(0));
    ctx.closePath();
    ctx.fillStyle = planet.color + '22';
    ctx.fill();

    // Line (above horizon only)
    ctx.beginPath(); ctx.strokeStyle = planet.color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    let penDown = false;
    for (let i = 0; i <= STEPS; i++) {
      if (points[i] < 0) { penDown = false; continue; }
      const x = xOf(i), y = yOf(points[i]);
      if (!penDown) { ctx.moveTo(x, y); penDown = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Peak icon
    const maxAlt = Math.max(...points);
    if (maxAlt > 0) {
      const peakIdx = points.indexOf(maxAlt);
      ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = planet.color;
      ctx.fillText(planet.icon, xOf(peakIdx), yOf(maxAlt) - 5);
    }
  }

  // Dawn / dusk twilight lines
  const { nightStart, nightEnd } = getNightWindow(today());
  for (const { time, label } of [
    { time: nightStart, label: 'Dark' },
    { time: nightEnd,   label: 'Dawn' },
  ]) {
    if (!time) continue;
    const h     = time.getHours() + time.getMinutes() / 60;
    const hNorm = h < H_START ? h + 24 : h;
    if (hNorm < H_START || hNorm > H_END) continue;
    const x = PAD_L + ((hNorm - H_START) / (H_END - H_START)) * gW;
    ctx.save(); ctx.strokeStyle = 'rgba(100,160,255,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + gH); ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(100,160,255,0.7)'; ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = label === 'Dark' ? 'left' : 'right';
    ctx.fillText(label, x + (label === 'Dark' ? 3 : -3), PAD_T + 10);
  }

  // NOW line
  const nowH     = new Date().getHours() + new Date().getMinutes() / 60;
  const nowHNorm = nowH < H_START ? nowH + 24 : nowH;
  if (nowHNorm >= H_START && nowHNorm <= H_END) {
    const x = PAD_L + ((nowHNorm - H_START) / (H_END - H_START)) * gW;
    ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + gH); ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = x > PAD_L + gW * 0.85 ? 'right' : 'center';
    ctx.fillText('NOW', x, PAD_T - 2);
  }

  // Border
  ctx.strokeStyle = 'rgba(201,168,76,0.15)'; ctx.lineWidth = 1; ctx.setLineDash([]);
  ctx.beginPath(); ctx.roundRect(PAD_L, PAD_T, gW, gH, 6); ctx.stroke();
}


// ── 10. Sky Events tab ───────────────────────────────────────────────────

let _allEvents    = [];
let _eventsLoaded = false;
let _activeFilter = 'all';

const METEOR_SHOWERS = [
  { name:'Quadrantids',   peak:[1,4],   zhr:120, desc:'Strong but brief peak, blue/yellow meteors' },
  { name:'Lyrids',        peak:[4,22],  zhr:18,  desc:'Swift meteors, occasional fireballs' },
  { name:'Eta Aquariids', peak:[5,6],   zhr:50,  desc:'Fast meteors, fragments of Halley\'s Comet' },
  { name:'Perseids',      peak:[8,12],  zhr:100, desc:'Reliable summer shower, swift bright meteors' },
  { name:'Orionids',      peak:[10,21], zhr:20,  desc:'Fast meteors from Halley\'s Comet' },
  { name:'Leonids',       peak:[11,17], zhr:15,  desc:'Very fast meteors, potential storm years' },
  { name:'Geminids',      peak:[12,14], zhr:120, desc:'Best annual shower, colourful slow meteors' },
  { name:'Ursids',        peak:[12,22], zhr:10,  desc:'Quiet shower coinciding with winter solstice' },
];

const PLANET_COLORS = {
  Mercury:'#b0a090', Venus:'#e8d898', Mars:'#e08060',
  Jupiter:'#c8b080', Saturn:'#d8c898', Uranus:'#90d8d8', Neptune:'#7090e0',
};
const PLANET_ICONS = {
  Mercury:'☿', Venus:'♀', Mars:'♂', Jupiter:'♃', Saturn:'♄', Uranus:'⛢', Neptune:'♆',
};

function computeSkyEvents() {
  const events = [];
  const now    = today();
  const end    = new Date(now.getTime() + 90 * 86400000);

  // 1. Moon phases
  let mq = Astronomy.SearchMoonQuarter(new Date());
  for (let i = 0; i < 30; i++) {
    if (mq.time.date > end) break;
    const d = mq.time.date;
    if (d >= now) {
      const names = ['New Moon', 'First Quarter', 'Full Moon', 'Third Quarter'];
      const icons = ['🌑', '🌓', '🌕', '🌗'];
      const descs = [
        'Moon between Earth and Sun — dark skies, ideal for deep sky',
        'Half-lit Moon — Q-Day 0, prime lunar observing begins',
        'Fully illuminated — dramatic naked-eye view, poor for detail',
        'Last quarter — late-night and dawn lunar observing',
      ];
      events.push({ date:d, title:names[mq.quarter], icon:icons[mq.quarter], desc:descs[mq.quarter], type:'lunar', key:'lunar-'+i });
    }
    mq = Astronomy.NextMoonQuarter(mq);
  }

  // 2. Oppositions (outer planets)
  for (const pname of ['Mars','Jupiter','Saturn','Uranus','Neptune']) {
    try {
      let search = new Date(now.getTime() - 10 * 86400000);
      for (let attempt = 0; attempt < 3; attempt++) {
        const opp = Astronomy.SearchRelativeLongitude(Astronomy.Body[pname], 180, search);
        if (!opp) break;
        const d = opp.time.date;
        if (d > end) break;
        if (d >= now) {
          events.push({ date:d, title:`${pname} at Opposition`, icon:PLANET_ICONS[pname],
            desc:`${pname} rises at sunset and is visible all night — largest and brightest of the year`,
            type:'planet', key:'opp-'+pname });
        }
        search = new Date(d.getTime() + 30 * 86400000);
      }
    } catch(e) {}
  }

  // 3. Greatest elongations (Mercury & Venus)
  for (const pname of ['Mercury','Venus']) {
    try {
      let search = new Date(now.getTime() - 5 * 86400000);
      for (let attempt = 0; attempt < 4; attempt++) {
        const el = Astronomy.SearchMaxElongation(Astronomy.Body[pname], search);
        if (!el) break;
        const d = el.time.date;
        if (d > end) break;
        if (d >= now) {
          const dir = el.elongation > 0 ? 'Evening' : 'Morning';
          const deg = Math.abs(el.elongation).toFixed(1);
          events.push({ date:d, title:`${pname} Greatest Elongation`, icon:PLANET_ICONS[pname],
            desc:`${pname} reaches maximum separation from the Sun (${deg}°) — best ${dir.toLowerCase()} sky visibility`,
            type:'planet', key:'elong-'+pname+attempt });
        }
        search = new Date(d.getTime() + 20 * 86400000);
      }
    } catch(e) {}
  }

  // 4. Conjunctions between bright planets
  const conjPairs = [
    ['Venus','Mars'],['Venus','Jupiter'],['Venus','Saturn'],
    ['Mars','Jupiter'],['Mars','Saturn'],['Jupiter','Saturn'],
  ];
  for (const [a, b] of conjPairs) {
    try {
      for (let dayOffset = 0; dayOffset < 90; dayOffset += 3) {
        const d = new Date(now.getTime() + dayOffset * 86400000);
        if (d > end) break;
        const obsNull = new Astronomy.Observer(0, 0, 0);
        const eqA = Astronomy.Equator(Astronomy.Body[a], d, obsNull, false, true);
        const eqB = Astronomy.Equator(Astronomy.Body[b], d, obsNull, false, true);
        const dRa = (eqA.ra - eqB.ra) * 15;
        const dDec = eqA.dec - eqB.dec;
        const sep  = Math.sqrt(dRa * dRa + dDec * dDec);
        if (sep < 2.5) {
          const alreadyAdded = events.some(e => e.key === 'conj-'+a+b && Math.abs(e.date - d) < 5 * 86400000);
          if (!alreadyAdded) {
            events.push({ date:d, title:`${a} & ${b} Conjunction`, icon:'🌟',
              desc:`${a} and ${b} appear just ${sep.toFixed(1)}° apart in the sky — striking in binoculars`,
              type:'planet', key:'conj-'+a+b });
          }
        }
      }
    } catch(e) {}
  }

  // 5. Meteor showers
  const yr = now.getFullYear();
  for (const shower of METEOR_SHOWERS) {
    const [mo, da] = shower.peak;
    for (const y of [yr, yr + 1]) {
      const peakDate = new Date(y, mo - 1, da);
      if (peakDate >= now && peakDate <= end) {
        events.push({ date:peakDate, title:`${shower.name} Meteor Shower`, icon:'☄️',
          desc:`Peak: up to ${shower.zhr} meteors/hr (ZHR). ${shower.desc}`,
          type:'meteor', key:'meteor-'+shower.name+y });
      }
    }
  }

  // 6. Solstices & Equinoxes
  const seasons      = ['Spring Equinox','Summer Solstice','Autumn Equinox','Winter Solstice'];
  const seasonIcons  = ['🌱','☀️','🍂','❄️'];
  const seasonDescs  = [
    'Equal day and night — Sun crosses celestial equator northward',
    'Longest day of the year — Sun reaches its highest point',
    'Equal day and night — Sun crosses celestial equator southward',
    'Shortest day of the year — longest nights for observing',
  ];
  for (let y = yr; y <= yr + 1; y++) {
    for (let q = 0; q < 4; q++) {
      try {
        const s     = Astronomy.Seasons(y);
        const dates = [s.mar_equinox, s.jun_solstice, s.sep_equinox, s.dec_solstice];
        const d     = dates[q].date;
        if (d >= now && d <= end) {
          events.push({ date:d, title:seasons[q], icon:seasonIcons[q], desc:seasonDescs[q], type:'solar', key:'season-'+y+q });
        }
      } catch(e) {}
    }
  }

  events.sort((a, b) => a.date - b.date);
  return events;
}

function filterEvents(filter, chipEl) {
  _activeFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  chipEl.classList.add('active');
  renderEventsList();
  if (State.obsLat !== null && State.obsLon !== null) {
    requestAnimationFrame(() => enrichEventsWithVisibility());
  }
}

function renderEventsList() {
  const body   = document.getElementById('eventsBody');
  const now    = today();
  const events = _activeFilter === 'all'
    ? _allEvents
    : _allEvents.filter(e => e.type === _activeFilter);

  if (events.length === 0) {
    body.innerHTML = '<p class="no-targets no-events-msg">No events of this type in the next 90 days.</p>';
    return;
  }

  let html      = '<div id="eventsLocationNote" class="events-location-note events-location-note--hidden">📍 Enable location for visibility info</div>';
  let lastMonth = '';
  let delay     = 0;

  for (const ev of events) {
    const diffDays = Math.ceil((ev.date - now) / 86400000);
    const isToday  = diffDays <= 0;
    const isSoon   = diffDays <= 7 && diffDays > 0;

    const monthLabel = ev.date.toLocaleDateString('en-CA', { month:'long', year:'numeric' });
    if (monthLabel !== lastMonth) {
      html += `<div class="events-month">${monthLabel}</div>`;
      lastMonth = monthLabel;
    }

    let countdown = '', countdownCls = '';
    if (isToday)          { countdown = 'Tonight!'; countdownCls = 'now'; }
    else if (diffDays === 1) countdown = 'Tomorrow';
    else if (diffDays <= 7)  countdown = `${diffDays} days`;
    else                     countdown = `${diffDays}d`;

    let badge = '';
    if (isToday)     badge = '<span class="event-badge badge-tonight">Tonight</span>';
    else if (isSoon) badge = '<span class="event-badge badge-soon">This Week</span>';

    const cardCls = isToday ? 'today' : isSoon ? 'soon' : '';
    const dateStr = ev.date.toLocaleDateString('en-CA', { weekday:'short', month:'short', day:'numeric' });

    html += `<div class="event-card ${cardCls}" data-key="${ev.key}" style="animation-delay:${delay}ms">
      <div class="event-icon-wrap">${ev.icon}</div>
      <div class="event-body">
        <div class="event-title">${ev.title}</div>
        <div class="event-desc">${ev.desc}</div>
        <div class="event-meta">
          <span class="event-date">${dateStr}</span>
          ${badge}
        </div>
      </div>
      <div class="event-countdown ${countdownCls}">${countdown}</div>
    </div>`;
    delay += 35;
  }

  body.innerHTML = html;
}

function loadEvents() {
  if (_eventsLoaded) return;
  _eventsLoaded = true;
  try {
    _allEvents = computeSkyEvents();
    renderEventsList();
    getLocation(
      () => enrichEventsWithVisibility(),
      ()  => showEventsLocationNote()
    );
  } catch(e) {
    document.getElementById('eventsBody').innerHTML =
      '<p class="no-targets">Could not compute events. Please try again.</p>';
  }
}

function showEventsLocationNote() {
  const note = document.getElementById('eventsLocationNote');
  if (note) note.style.display = 'block';
}

function getEventVisibility(ev) {
  if (State.obsLat === null || State.obsLon === null) return null;

  const date     = ev.date;
  const observer = new Astronomy.Observer(State.obsLat, State.obsLon, 0);
  const fmtT     = d => d ? d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:false }) : '—';

  try {
    if (ev.type === 'planet') {
      const planetNames = Object.keys(PLANET_ICONS).filter(p => ev.title.includes(p));
      if (planetNames.length === 0) return null;

      const results = planetNames.map(pname => {
        try {
          const body    = Astronomy.Body[pname];
          const transit = Astronomy.SearchHourAngle(body, observer, 0, date, +1);
          if (!transit) return null;
          const eq     = Astronomy.Equator(body, transit.time.date, observer, true, true);
          const hor    = Astronomy.Horizon(transit.time.date, observer, eq.ra, eq.dec, 'normal');
          const alt    = Math.round(hor.altitude);
          const sunEq  = Astronomy.Equator(Astronomy.Body.Sun, transit.time.date, observer, true, true);
          const sunHor = Astronomy.Horizon(transit.time.date, observer, sunEq.ra, sunEq.dec, 'normal');
          const atNight = sunHor.altitude < -6;

          if (alt < 0)   return { pname, cls:'poor', text:`${pname} below horizon at transit`,             desc:`${pname} does not rise above the horizon from your location on this date` };
          if (!atNight)  return { pname, cls:'warn', text:`${pname} transits in daytime (${alt}° alt)`,    desc:`${pname} transits at ${alt}° altitude but during daylight hours — not observable` };
          if (alt >= 30) return { pname, cls:'good', text:`${pname} well placed — ${alt}° at transit`,    desc:ev.desc };
          if (alt >= 15) return { pname, cls:'warn', text:`${pname} low but visible — ${alt}° at transit`,desc:`${ev.desc.split('—')[0].trim()} — transits at only ${alt}°, atmospheric haze may reduce clarity` };
          return               { pname, cls:'poor', text:`${pname} very low — ${alt}° at transit`,        desc:`${ev.desc.split('—')[0].trim()} — barely clears the horizon (${alt}°) from your latitude` };
        } catch(e) { return null; }
      }).filter(Boolean);

      if (results.length === 0) return null;
      if (results.length > 1) {
        const order = ['poor','warn','good'];
        results.sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls));
        return { cls:results[0].cls, text:results.map(r => r.text).join(' · '), desc:results[0].desc };
      }
      return results[0];
    }

    if (ev.type === 'meteor') {
      const moonIllum = Astronomy.Illumination(Astronomy.Body.Moon, date);
      const moonPct   = Math.round((1 + Math.cos(moonIllum.phase_angle * Math.PI / 180)) / 2 * 100);
      const { noTrueDark } = getNightWindow(date);
      const base = ev.desc;
      if (noTrueDark)   return { cls:'poor', text:'No astronomical darkness at your latitude',          desc:`${base} — no true dark sky from your location on this date` };
      if (moonPct > 80) return { cls:'poor', text:`Near Full Moon (${moonPct}%) — rates severely reduced`, desc:`${base} — a ${moonPct}% moon will wash out most meteors this year` };
      if (moonPct > 50) return { cls:'warn', text:`Gibbous Moon (${moonPct}%) — some interference`,       desc:`${base} — a ${moonPct}% moon will reduce visible rates` };
      if (moonPct > 25) return { cls:'warn', text:`Quarter Moon (${moonPct}%) — moderate interference`,   desc:`${base} — a ${moonPct}% moon may reduce faint meteors` };
      return                   { cls:'good', text:`Dark skies — Moon only ${moonPct}% illuminated`,       desc:`${base} — excellent conditions, dark skies expected` };
    }

    if (ev.type === 'lunar') {
      const moonRise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, +1, date, 1)?.date;
      const moonSet  = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, date, 1)?.date;
      if (ev.title === 'New Moon')  return { cls:'good', text:'No moon — darkest skies of the cycle', desc:'Moon between Earth and Sun — no moonlight tonight, ideal for deep sky objects' };
      if (ev.title === 'Full Moon') return { cls:'info', text:`Rises ${fmtT(moonRise)} · sets ${fmtT(moonSet)}`, desc:`Fully illuminated — rises ${fmtT(moonRise)}, sets ${fmtT(moonSet)}. Excellent for naked-eye lunar detail` };
      if (moonRise) return { cls:'good', text:`Rises ${fmtT(moonRise)} · sets ${fmtT(moonSet)}`, desc:`${ev.desc} — rises ${fmtT(moonRise)}, sets ${fmtT(moonSet)} from your location` };
      return { cls:'info', text:'Check local moonrise time', desc:ev.desc };
    }

    if (ev.type === 'solar') {
      const { nightStart, nightEnd, noTrueDark } = getNightWindow(date);
      if (noTrueDark) return { cls:'warn', text:'No astronomical darkness — midnight sun', desc:`${ev.desc} — no true astronomical darkness from your latitude on this date` };
      const nightHrs = Math.round((nightEnd - nightStart) / 3600000 * 10) / 10;
      if (ev.title.includes('Winter')) return { cls:'good', text:`Longest night — ${nightHrs}h of darkness`,   desc:`${ev.desc} — ${nightHrs} hours of astronomical darkness from your location` };
      if (ev.title.includes('Summer')) return { cls:'warn', text:`Shortest night — only ${nightHrs}h of darkness`, desc:`${ev.desc} — only ${nightHrs} hours of astronomical darkness from your location` };
      return { cls:'info', text:`${nightHrs}h of astronomical darkness`, desc:`${ev.desc} — ${nightHrs} hours of astronomical darkness from your location` };
    }
  } catch(e) {}
  return null;
}

function enrichEventsWithVisibility() {
  document.querySelectorAll('.event-card[data-key]').forEach(card => {
    const key = card.getAttribute('data-key');
    const ev  = _allEvents.find(e => e.key === key);
    if (!ev) return;
    const vis = getEventVisibility(ev);
    if (!vis) return;

    const descEl = card.querySelector('.event-desc');
    if (descEl && vis.desc) descEl.textContent = vis.desc;

    const existing = card.querySelector('.event-visibility');
    if (existing) existing.remove();
    const visEl = document.createElement('div');
    visEl.className = 'event-visibility';
    visEl.innerHTML = `<span class="vis-dot ${vis.cls}"></span><span class="vis-text ${vis.cls}">${vis.text}</span>`;
    if (descEl) descEl.after(visEl);
  });
  const note = document.getElementById('eventsLocationNote');
  if (note) note.style.display = 'none';
}


// ── 11. Forecast tab ─────────────────────────────────────────────────────

let forecastLoaded = false;

async function fetchForecast(lat, lon) {
  const vars = [
    'cloud_cover','cloud_cover_low','cloud_cover_mid','cloud_cover_high',
    'temperature_2m','relative_humidity_2m','wind_speed_10m',
    'dew_point_2m','precipitation_probability',
  ].join(',');

  const url = `https://api.open-meteo.com/v1/forecast`
    + `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`
    + `&hourly=${vars}&models=gem_seamless&forecast_days=3&timezone=auto`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Open-Meteo returned HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data.hourly || !data.hourly.time) throw new Error('Unexpected response from Open-Meteo.');
  return data;
}

function parseForecast(data) {
  const h = data.hourly;
  return h.time.map((t, i) => ({
    time:        new Date(t),
    localHour:   parseInt(t.slice(11, 13), 10),
    localDate:   t.slice(0, 10),
    tcdc:        h.cloud_cover[i],
    lcdc:        h.cloud_cover_low[i],
    mcdc:        h.cloud_cover_mid[i],
    hcdc:        h.cloud_cover_high[i],
    tmp:         h.temperature_2m[i],
    dewp:        h.dew_point_2m ? h.dew_point_2m[i] : null,
    rh:          h.relative_humidity_2m[i],
    wspd:        h.wind_speed_10m[i],
    precip_prob: h.precipitation_probability[i],
  }));
}

function getForecastNightHours(hours) {
  if (!hours.length) return [];
  const nowH      = new Date().getHours();
  const todayStr  = hours.find(h => h.localHour === nowH)?.localDate || hours[0].localDate;
  const dates     = [...new Set(hours.map(h => h.localDate))].sort();
  const todayIdx  = dates.indexOf(todayStr);
  const eveningStr = nowH < 6 ? (dates[todayIdx - 1] || dates[0]) : todayStr;
  const morningStr = nowH < 6 ? todayStr : (dates[todayIdx + 1] || dates[dates.length - 1]);
  return hours.filter(h =>
    (h.localDate === eveningStr && h.localHour >= 18) ||
    (h.localDate === morningStr && h.localHour <= 6)
  );
}

function getTomorrowNightHours(hours) {
  if (!hours.length) return [];
  const nowH       = new Date().getHours();
  const dates      = [...new Set(hours.map(h => h.localDate))].sort();
  const todayStr   = hours.find(h => h.localHour === nowH)?.localDate || hours[0].localDate;
  const todayIdx   = dates.indexOf(todayStr);
  const eveningIdx = nowH < 6 ? todayIdx : todayIdx + 1;
  const tmrwStr    = dates[eveningIdx]     || dates[dates.length - 1];
  const dayAfterStr= dates[eveningIdx + 1] || dates[dates.length - 1];
  return hours.filter(h =>
    (h.localDate === tmrwStr      && h.localHour >= 18) ||
    (h.localDate === dayAfterStr  && h.localHour <= 6)
  );
}

function getOutlook(nightHours) {
  if (!nightHours.length) return { icon:'❓', label:'No Data', sub:'Forecast unavailable', cls:'partly' };
  const sorted = [...nightHours.map(h => h.tcdc ?? 0)].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (median <= 10) return { icon:'⭐', label:'Clear',         sub:'Excellent — minimal cloud cover expected',   cls:'clear'        };
  if (median <= 30) return { icon:'🌙', label:'Mostly Clear',  sub:'Good — occasional cloud possible',          cls:'mostly-clear' };
  if (median <= 55) return { icon:'⛅', label:'Partly Cloudy', sub:'Mixed — intermittent cloud cover',          cls:'partly'       };
  if (median <= 80) return { icon:'🌥', label:'Mostly Cloudy', sub:'Poor — cloud will interrupt viewing',       cls:'cloudy'       };
  return               { icon:'☁️', label:'Overcast',       sub:'Cloud cover will prevent observing tonight', cls:'cloudy'       };
}

function getSeeingRating(wspd_kmh) {
  if (wspd_kmh === null || wspd_kmh === undefined) return { label:'Unknown', cls:'warn', text:'No wind data' };
  const w = parseFloat(wspd_kmh) / 3.6;
  if (w < 2) return { label:'Excellent', cls:'good', text:`${w.toFixed(1)} m/s — very steady air`   };
  if (w < 5) return { label:'Good',      cls:'good', text:`${w.toFixed(1)} m/s — calm conditions`   };
  if (w < 9) return { label:'Fair',      cls:'warn', text:`${w.toFixed(1)} m/s — some turbulence`   };
  return           { label:'Poor',      cls:'poor', text:`${w.toFixed(1)} m/s — turbulent air`      };
}

function getDewRisk(rh) {
  if (rh === null || rh === undefined) return { label:'Unknown', cls:'warn', text:'No humidity data' };
  const r = parseFloat(rh);
  if (r < 50) return { label:'Low',       cls:'good', text:`${Math.round(r)}% RH` };
  if (r < 70) return { label:'Moderate',  cls:'warn', text:`${Math.round(r)}% RH` };
  if (r < 85) return { label:'High',      cls:'warn', text:`${Math.round(r)}% RH — monitor optics` };
  return             { label:'Very High', cls:'poor', text:`${Math.round(r)}% RH — dew likely` };
}

function drawCloudChart(canvasId, nightHrs) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || nightHrs.length < 2) return;
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth;
  const H   = Math.round(W * 0.32);
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const PAD_L=36, PAD_R=12, PAD_T=12, PAD_B=28;
  const gW = W - PAD_L - PAD_R, gH = H - PAD_T - PAD_B;

  ctx.fillStyle = '#0d1220'; ctx.fillRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(PAD_L, PAD_T, PAD_L, PAD_T + gH);
  bg.addColorStop(0, 'rgba(40,60,120,0.35)'); bg.addColorStop(1, 'rgba(10,15,30,0.15)');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(PAD_L, PAD_T, gW, gH, 6); ctx.fill();

  const tStart = nightHrs[0].time, tEnd = nightHrs[nightHrs.length - 1].time;
  const tRange = (tEnd - tStart) || 1;
  function xT(t) { return PAD_L + ((t - tStart) / tRange) * gW; }
  function yV(v) { return PAD_T + gH - (v / 100) * gH; }

  // Grid lines
  for (const pct of [25, 50, 75, 100]) {
    ctx.strokeStyle = pct === 50 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(PAD_L, yV(pct)); ctx.lineTo(PAD_L + gW, yV(pct)); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(pct + '%', PAD_L - 4, yV(pct) + 3);
  }

  // X-axis labels — adaptive interval
  const approxHourPx = gW / (nightHrs.length > 1 ? nightHrs.length - 1 : 1);
  const labelEvery   = Math.max(1, Math.ceil(36 / approxHourPx));
  ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  for (const h of nightHrs) {
    const x  = xT(h.time);
    const hr = h.localHour;
    if (x < PAD_L + 4 || x > PAD_L + gW - 4) continue;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + gH); ctx.stroke();
    if (hr % labelEvery !== 0) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(String(hr).padStart(2, '0') + ':00', x, H - PAD_B + 12);
  }

  // Filled area
  ctx.beginPath();
  let first = true;
  for (const h of nightHrs) {
    const x = xT(h.time), y = yV(h.tcdc ?? 0);
    if (first) { ctx.moveTo(x, PAD_T + gH); ctx.lineTo(x, y); first = false; } else ctx.lineTo(x, y);
  }
  ctx.lineTo(xT(nightHrs[nightHrs.length - 1].time), PAD_T + gH); ctx.closePath();
  const grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + gH);
  grad.addColorStop(0, 'rgba(120,150,220,0.55)'); grad.addColorStop(1, 'rgba(80,100,180,0.1)');
  ctx.fillStyle = grad; ctx.fill();

  // Line
  ctx.beginPath(); ctx.strokeStyle = 'rgba(140,170,230,0.9)'; ctx.lineWidth = 2;
  ctx.lineJoin = 'round'; ctx.setLineDash([]);
  first = true;
  for (const h of nightHrs) {
    const x = xT(h.time), y = yV(h.tcdc ?? 0);
    if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // NOW line
  const now2 = new Date();
  if (now2 >= tStart && now2 <= tEnd) {
    const x = xT(now2);
    ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + gH); ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = x > PAD_L + gW * 0.85 ? 'right' : 'center';
    ctx.fillText('NOW', x, PAD_T - 2);
  }

  ctx.strokeStyle = 'rgba(201,168,76,0.15)'; ctx.lineWidth = 1; ctx.setLineDash([]);
  ctx.beginPath(); ctx.roundRect(PAD_L, PAD_T, gW, gH, 6); ctx.stroke();
}

function drawTempDewChart(canvasId, hours48) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || hours48.length < 2) return;
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth;
  const H   = Math.round(W * 0.38);
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const PAD_L=42, PAD_R=12, PAD_T=16, PAD_B=32;
  const gW = W - PAD_L - PAD_R, gH = H - PAD_T - PAD_B;

  ctx.fillStyle = '#0d1220'; ctx.fillRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(PAD_L, PAD_T, PAD_L, PAD_T + gH);
  bg.addColorStop(0, 'rgba(40,50,80,0.35)'); bg.addColorStop(1, 'rgba(10,15,30,0.15)');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(PAD_L, PAD_T, gW, gH, 6); ctx.fill();

  const temps   = hours48.map(h => h.tmp).filter(v => v !== null && v !== undefined);
  const dews    = hours48.map(h => h.dewp).filter(v => v !== null && v !== undefined);
  const allVals = [...temps, ...dews];
  if (!allVals.length) return;

  const minV  = Math.floor(Math.min(...allVals) / 5) * 5 - 2;
  const maxV  = Math.ceil(Math.max(...allVals) / 5) * 5 + 2;
  const range = maxV - minV || 1;

  const tStart = hours48[0].time, tEnd = hours48[hours48.length - 1].time;
  const tRange = (tEnd - tStart) || 1;
  function xT(t) { return PAD_L + ((t - tStart) / tRange) * gW; }
  function yV(v) { return PAD_T + gH - ((v - minV) / range) * gH; }

  // Temp gridlines
  const step = range <= 20 ? 2 : range <= 40 ? 5 : 10;
  for (let v = Math.ceil(minV / step) * step; v <= maxV; v += step) {
    ctx.strokeStyle = v === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = v === 0 ? 1 : 0.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(PAD_L, yV(v)); ctx.lineTo(PAD_L + gW, yV(v)); ctx.stroke();
    ctx.fillStyle = v === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)';
    ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(v + '°', PAD_L - 4, yV(v) + 3);
  }

  // Dew/temp spread shading
  const hasDew = hours48.some(h => h.dewp !== null && h.dewp !== undefined);
  if (hasDew) {
    ctx.beginPath();
    for (let i = 0; i < hours48.length; i++) {
      const h = hours48[i];
      if (h.tmp === null || h.dewp === null) continue;
      const x = xT(h.time);
      if (i === 0) ctx.moveTo(x, yV(h.tmp)); else ctx.lineTo(x, yV(h.tmp));
    }
    for (let i = hours48.length - 1; i >= 0; i--) {
      const h = hours48[i];
      if (h.tmp === null || h.dewp === null) continue;
      ctx.lineTo(xT(h.time), yV(h.dewp));
    }
    ctx.closePath(); ctx.fillStyle = 'rgba(160,180,220,0.15)'; ctx.fill();
  }

  // Night shading bands
  const mn = new Date(tStart); mn.setHours(0, 0, 0, 0);
  for (let d = 0; d <= 3; d++) {
    const nightS = new Date(mn.getTime() + (d * 86400000) + 18 * 3600000);
    const nightE = new Date(mn.getTime() + (d * 86400000) + 30 * 3600000);
    if (nightE < tStart || nightS > tEnd) continue;
    ctx.fillStyle = 'rgba(0,0,40,0.18)';
    ctx.fillRect(xT(Math.max(nightS, tStart)), PAD_T, xT(Math.min(nightE, tEnd)) - xT(Math.max(nightS, tStart)), gH);
  }

  // X-axis labels
  const sixHourPx    = (6 / 48) * gW;
  const tmpLabelInterval = sixHourPx < 40 ? 12 : 6;
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  for (const h of hours48) {
    const x  = xT(h.time);
    const hr = h.localHour;
    if (x < PAD_L + 4 || x > PAD_L + gW - 4) continue;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + gH); ctx.stroke();
    if (hr !== 0 && hr % tmpLabelInterval !== 0) continue;
    const label = hr === 0
      ? new Date(h.localDate + 'T12:00').toLocaleDateString('en-CA', { month:'short', day:'numeric' })
      : String(hr).padStart(2, '0') + ':00';
    ctx.fillStyle = hr === 0 ? 'rgba(201,168,76,0.8)' : 'rgba(255,255,255,0.4)';
    ctx.fillText(label, x, H - PAD_B + 12);
    ctx.strokeStyle = hr === 0 ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + gH); ctx.stroke();
  }

  // Temperature line
  ctx.beginPath(); ctx.strokeStyle = 'rgba(224,128,96,0.95)'; ctx.lineWidth = 2;
  ctx.lineJoin = 'round'; ctx.setLineDash([]);
  let first = true;
  for (const h of hours48) {
    if (h.tmp === null || h.tmp === undefined) { first = true; continue; }
    const x = xT(h.time), y = yV(h.tmp);
    if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Dew point line (dashed)
  if (hasDew) {
    ctx.beginPath(); ctx.strokeStyle = 'rgba(96,176,216,0.85)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]); ctx.lineJoin = 'round';
    first = true;
    for (const h of hours48) {
      if (h.dewp === null || h.dewp === undefined) { first = true; continue; }
      const x = xT(h.time), y = yV(h.dewp);
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }

  // NOW line
  const now3 = new Date();
  if (now3 >= tStart && now3 <= tEnd) {
    const x = xT(now3);
    ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.5)'; ctx.shadowBlur = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + gH); ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = x > PAD_L + gW * 0.85 ? 'right' : 'center';
    ctx.fillText('NOW', x, PAD_T - 2);
  }

  ctx.strokeStyle = 'rgba(201,168,76,0.15)'; ctx.lineWidth = 1; ctx.setLineDash([]);
  ctx.beginPath(); ctx.roundRect(PAD_L, PAD_T, gW, gH, 6); ctx.stroke();
}

// ── Forecast rendering helpers ────────────────────────────────────────────
// Each helper builds one card's worth of HTML. renderForecast() assembles them.

/** Returns the median value of a numeric field across an array of hour objects. */
function forecastMedian(arr, key) {
  const vals = arr.map(h => h[key]).filter(v => v !== null && v !== undefined);
  if (!vals.length) return null;
  const s = [...vals].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Builds the "Current Conditions" card HTML. */
function buildCurrentConditionsHTML(currentHr) {
  const fmtTmp = v => v !== null && v !== undefined ? Math.round(v) + '°C' : '—';
  const fmtCld = v => v !== null && v !== undefined ? Math.round(v) + '%'  : '—';
  const fmtWnd = v => v !== null && v !== undefined ? (parseFloat(v) / 3.6).toFixed(1) + ' m/s' : '—';

  const cldNow  = currentHr.tcdc ?? null;
  const cldDesc = cldNow === null ? '—'
    : cldNow <= 10 ? 'Clear'
    : cldNow <= 30 ? 'Mostly Clear'
    : cldNow <= 55 ? 'Partly Cloudy'
    : cldNow <= 80 ? 'Mostly Cloudy'
    : 'Overcast';
  const cldCls = cldNow === null ? '' : cldNow <= 30 ? 'good' : cldNow <= 55 ? 'warn' : 'poor';
  const spread  = currentHr.tmp !== null && currentHr.dewp !== null
    ? Math.round(currentHr.tmp - currentHr.dewp) + '°C' : '—';
  const nowLabel = currentHr.time.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:false });

  return `
    <div class="fc-chart-card fc-current-card">
      <div class="fc-chart-header">
        <span>📍</span>
        <h3>Current Conditions</h3>
        <span class="fc-header-timestamp">as of ${nowLabel}</span>
      </div>
      <div class="fc-current-grid">
        <div class="fc-stat-box">
          <div class="fc-stat-label">Temp</div>
          <div class="fc-stat-value">${fmtTmp(currentHr.tmp)}</div>
          <div class="fc-stat-sub">2 m above ground</div>
        </div>
        <div class="fc-stat-box">
          <div class="fc-stat-label">Dew Point</div>
          <div class="fc-stat-value">${fmtTmp(currentHr.dewp)}</div>
          <div class="fc-stat-sub">spread: ${spread}</div>
        </div>
        <div class="fc-stat-box">
          <div class="fc-stat-label">Cloud</div>
          <div class="fc-stat-value">${fmtCld(currentHr.tcdc)}</div>
          <div class="fc-stat-sub fc-cond-rating ${cldCls} fc-stat-sub-badge">${cldDesc}</div>
        </div>
        <div class="fc-stat-box fc-stat-box-last">
          <div class="fc-stat-label">Wind</div>
          <div class="fc-stat-value">${fmtWnd(currentHr.wspd)}</div>
          <div class="fc-stat-sub">10 m surface wind</div>
        </div>
      </div>
    </div>`;
}

/** Builds the "Tonight's Outlook" card HTML. */
function buildOutlookHTML(outlook, medians, tzLabel) {
  const fmt1 = v => v !== null ? Math.round(v) + '%'  : '—';
  const fmtT = v => v !== null ? Math.round(v) + '°C' : '—';
  const fmtW = v => v !== null ? (parseFloat(v) / 3.6).toFixed(1) + ' m/s' : '—';

  return `
    <div class="fc-outlook-card">
      <div class="fc-outlook-row">
        <div class="fc-outlook-icon">${outlook.icon}</div>
        <div class="fc-outlook-text">
          <div class="fc-outlook-label">Tonight's Outlook · 18:00–06:00 ${tzLabel}</div>
          <div class="fc-outlook-value ${outlook.cls}">${outlook.label}</div>
          <div class="fc-outlook-sub">${outlook.sub}</div>
        </div>
      </div>
      <div class="fc-stats-grid">
        <div class="fc-stat-box"><div class="fc-stat-label">Cloud</div><div class="fc-stat-value">${fmt1(medians.tcdc)}</div><div class="fc-stat-sub">median tonight</div></div>
        <div class="fc-stat-box"><div class="fc-stat-label">Temp</div><div class="fc-stat-value">${fmtT(medians.tmp)}</div><div class="fc-stat-sub">2 m above ground</div></div>
        <div class="fc-stat-box"><div class="fc-stat-label">Humidity</div><div class="fc-stat-value">${fmt1(medians.rh)}</div><div class="fc-stat-sub">relative humidity</div></div>
        <div class="fc-stat-box"><div class="fc-stat-label">Wind</div><div class="fc-stat-value">${fmtW(medians.wspd)}</div><div class="fc-stat-sub">10 m surface wind</div></div>
      </div>
    </div>`;
}

/** Builds the "Astronomy Conditions" (seeing / dew / precip) card HTML. */
function buildAstroConditionsHTML(seeing, dew, precipMed) {
  const precipCls = (precipMed ?? 0) < 20 ? 'good' : (precipMed ?? 0) < 50 ? 'warn' : 'poor';
  const precipLbl = (precipMed ?? 0) < 20 ? 'Low'  : (precipMed ?? 0) < 50 ? 'Moderate' : 'High';

  return `
    <div class="fc-layers-card">
      <div class="section-header"><span>✨</span><h2>Astronomy Conditions</h2></div>
      <div class="fc-cond-grid">
        <div class="fc-cond-box">
          <div class="fc-cond-icon">🌬</div>
          <div class="fc-cond-label">Seeing</div>
          <div class="fc-cond-value">${seeing.text}</div>
          <div class="fc-cond-rating ${seeing.cls}">${seeing.label}</div>
        </div>
        <div class="fc-cond-box">
          <div class="fc-cond-icon">💧</div>
          <div class="fc-cond-label">Dew Risk</div>
          <div class="fc-cond-value">${dew.text}</div>
          <div class="fc-cond-rating ${dew.cls}">${dew.label}</div>
        </div>
        <div class="fc-cond-box">
          <div class="fc-cond-icon">☔</div>
          <div class="fc-cond-label">Precip. Chance</div>
          <div class="fc-cond-value">${precipMed !== null ? Math.round(precipMed) + '%' : '—'} chance</div>
          <div class="fc-cond-rating ${precipCls}">${precipLbl}</div>
        </div>
      </div>
    </div>`;
}

/** Builds the "Temperature & Dew Point — 48 Hours" chart card HTML. */
function buildTempDewCardHTML() {
  return `
    <div class="fc-chart-card">
      <div class="fc-chart-header"><span>🌡</span><h3>Temperature &amp; Dew Point — 48 Hours</h3></div>
      <div class="fc-chart-body">
        <div class="fc-canvas-wrap"><canvas id="tempDewCanvas" class="fc-canvas"></canvas></div>
        <div class="chart-legend">
          <div class="chart-legend-item">
            <div class="chart-legend-swatch-line fc-legend-temp"></div>
            <span class="fc-legend-temp-label">Temperature</span>
          </div>
          <div class="chart-legend-item">
            <div class="chart-legend-swatch-line fc-legend-dew"></div>
            <span class="fc-legend-dew-label">Dew Point</span>
          </div>
          <div class="chart-legend-item">
            <div class="chart-legend-swatch-box fc-legend-spread"></div>
            <span>Spread (dew risk)</span>
          </div>
        </div>
      </div>
    </div>`;
}

/** Builds the "Tomorrow Night" chart card HTML. */
function buildTomorrowCardHTML(tmrwOutlook, tmrwHrs) {
  const tmrwDate   = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { weekday:'long', month:'short', day:'numeric' });
  const badgeCls   = (tmrwOutlook.cls === 'clear' || tmrwOutlook.cls === 'mostly-clear') ? 'good'
                   : tmrwOutlook.cls === 'cloudy' ? 'poor' : 'warn';
  const chartOrMsg = tmrwHrs.length >= 2
    ? `<div class="fc-canvas-wrap"><canvas id="cloudCanvasTmrw" class="fc-canvas"></canvas></div>
       <p class="fc-chart-sub">${tmrwOutlook.sub}</p>`
    : `<p class="no-targets fc-no-data">Forecast data unavailable for tomorrow night.</p>`;

  return `
    <div class="fc-chart-card">
      <div class="fc-chart-header">
        <span>🔮</span>
        <h3>Tomorrow Night · ${tmrwDate}</h3>
        <span class="fc-tmrw-badge ${badgeCls}">${tmrwOutlook.label}</span>
      </div>
      <div class="fc-chart-body">${chartOrMsg}</div>
    </div>`;
}

// ── renderForecast ────────────────────────────────────────────────────────

function renderForecast() {
  const container = document.getElementById('fcContent');

  if (State.obsLat === null || State.obsLon === null) {
    container.innerHTML = locationErrorHTML('forecast', 'Enable location access then tap Retry.');
    return;
  }

  container.innerHTML = `<div class="fc-loading"><div class="fc-spinner"></div>Fetching forecast for your location…</div>`;

  fetchForecast(State.obsLat, State.obsLon)
    .then(data => {
      const allHours  = parseForecast(data);
      const modelName = data.model || 'gem_seamless';
      const nightHrs  = getForecastNightHours(allHours);
      const tmrwHrs   = getTomorrowNightHours(allHours);

      // Share cloud data with planet altitude chart overlay
      State.cloudNightHours = nightHrs;
      if (State.altDatasets) {
        requestAnimationFrame(() => {
          drawAltitudeGraph(State.altDatasets, State.altSteps, State.altHStart, State.altHEnd);
          const leg = document.getElementById('cloudLegendItem');
          if (leg) leg.style.display = 'flex';
        });
      }

      // Compute medians for tonight's window
      const medians = {
        tcdc: forecastMedian(nightHrs, 'tcdc'),
        tmp:  forecastMedian(nightHrs, 'tmp'),
        rh:   forecastMedian(nightHrs, 'rh'),
        wspd: forecastMedian(nightHrs, 'wspd'),
      };
      const precipMed = forecastMedian(nightHrs, 'precip_prob');

      const outlook     = getOutlook(nightHrs);
      const tmrwOutlook = getOutlook(tmrwHrs);
      const seeing      = getSeeingRating(medians.wspd);
      const dew         = getDewRisk(medians.rh);

      // Current hour — data point closest to right now
      const nowMs     = Date.now();
      const currentHr = allHours.reduce((best, h) =>
        Math.abs(h.time - nowMs) < Math.abs(best.time - nowMs) ? h : best
      , allHours[0]);

      const tzLabel = new Date().toLocaleDateString('en-CA', { timeZoneName:'short' }).split(', ')[1] || 'local';
      const locStr  = `${Math.abs(State.obsLat).toFixed(2)}°${State.obsLat >= 0 ? 'N' : 'S'}, `
                    + `${Math.abs(State.obsLon).toFixed(2)}°${State.obsLon >= 0 ? 'E' : 'W'}`;

      // Assemble page from helper-built cards
      container.innerHTML =
        buildCurrentConditionsHTML(currentHr)      +
        buildOutlookHTML(outlook, medians, tzLabel) +
        `<div class="fc-chart-card">
          <div class="fc-chart-header"><span>☁️</span><h3>Hourly Cloud Cover — Tonight</h3></div>
          <div class="fc-chart-body"><div class="fc-canvas-wrap"><canvas id="cloudCanvas" class="fc-canvas"></canvas></div></div>
        </div>`                                    +
        buildAstroConditionsHTML(seeing, dew, precipMed) +
        buildTempDewCardHTML()                     +
        buildTomorrowCardHTML(tmrwOutlook, tmrwHrs)+
        `<p class="fc-footer">Location: ${locStr} · Model: ${modelName} via Open-Meteo</p>`;

      // 48-hr window for temp/dew chart
      const now48   = new Date();
      const hours48 = allHours.filter(h => h.time >= now48 && h.time <= new Date(now48.getTime() + 48 * 3600000));

      State.fcNightHrs = nightHrs;
      State.fcTmrwHrs  = tmrwHrs.length >= 2 ? tmrwHrs : null;
      State.fcHours48  = hours48.length >= 2 ? hours48 : null;

      requestAnimationFrame(() => {
        drawCloudChart('cloudCanvas', nightHrs);
        if (tmrwHrs.length >= 2) drawCloudChart('cloudCanvasTmrw', tmrwHrs);
        if (hours48.length >= 2) drawTempDewChart('tempDewCanvas', hours48);
      });
    })
    .catch(err => {
      console.error('Forecast fetch error:', err);
      container.innerHTML = `
        <div class="fc-error">
          <strong>Could not load forecast</strong><br>${err.message}<br><br>
          <span class="fc-error-detail">Check your internet connection and try again.</span>
        </div>`;
    });
}



// ── 11b. Messier Catalogue ────────────────────────────────────────────────

// Full 110-object Messier catalogue with RA (hours), Dec (degrees), type, mag, constellation, description
const MESSIER = [
  {id:'M1',  ra:5.5755,  dec:22.0145,  type:'nebula',  subtype:'Supernova Remnant', mag:8.4,  con:'Taurus',       desc:'Crab Nebula — remnant of a supernova seen in 1054 AD'},
  {id:'M2',  ra:21.5578, dec:-0.8233,  type:'cluster', subtype:'Globular Cluster',  mag:6.5,  con:'Aquarius',     desc:'One of the largest and richest globular clusters'},
  {id:'M3',  ra:13.7033, dec:28.3775,  type:'cluster', subtype:'Globular Cluster',  mag:6.2,  con:'Canes Venatici',desc:'Arguably the finest globular cluster in the northern sky'},
  {id:'M4',  ra:16.3933, dec:-26.5258, type:'cluster', subtype:'Globular Cluster',  mag:5.9,  con:'Scorpius',     desc:'Nearest globular cluster to Earth, ~7,200 light-years'},
  {id:'M5',  ra:15.3097, dec:2.0817,   type:'cluster', subtype:'Globular Cluster',  mag:5.7,  con:'Serpens',      desc:'One of the oldest and most massive globular clusters'},
  {id:'M6',  ra:17.6672, dec:-32.2125, type:'cluster', subtype:'Open Cluster',      mag:4.2,  con:'Scorpius',     desc:'Butterfly Cluster — loose open cluster of ~80 stars'},
  {id:'M7',  ra:17.8978, dec:-34.8417, type:'cluster', subtype:'Open Cluster',      mag:3.3,  con:'Scorpius',     desc:'Ptolemy\'s Cluster — large, bright open cluster visible to naked eye'},
  {id:'M8',  ra:18.0631, dec:-24.3833, type:'nebula',  subtype:'Emission Nebula',   mag:5.8,  con:'Sagittarius',  desc:'Lagoon Nebula — large active star-forming region'},
  {id:'M9',  ra:17.3197, dec:-18.5158, type:'cluster', subtype:'Globular Cluster',  mag:7.9,  con:'Ophiuchus',    desc:'Compact globular near the galactic centre'},
  {id:'M10', ra:16.9528, dec:-4.1008,  type:'cluster', subtype:'Globular Cluster',  mag:6.4,  con:'Ophiuchus',    desc:'Bright globular with a loose, irregular core'},
  {id:'M11', ra:18.8511, dec:-6.2672,  type:'cluster', subtype:'Open Cluster',      mag:5.8,  con:'Scutum',       desc:'Wild Duck Cluster — one of the richest open clusters known'},
  {id:'M12', ra:16.7872, dec:-1.9483,  type:'cluster', subtype:'Globular Cluster',  mag:6.7,  con:'Ophiuchus',    desc:'Looser than nearby M10, with fewer concentrated stars'},
  {id:'M13', ra:16.6947, dec:36.4603,  type:'cluster', subtype:'Globular Cluster',  mag:5.8,  con:'Hercules',     desc:'Great Hercules Cluster — the showpiece northern globular'},
  {id:'M14', ra:17.6267, dec:-3.2458,  type:'cluster', subtype:'Globular Cluster',  mag:7.6,  con:'Ophiuchus',    desc:'Large, oblate globular with a rich stellar population'},
  {id:'M15', ra:21.4997, dec:12.1672,  type:'cluster', subtype:'Globular Cluster',  mag:6.3,  con:'Pegasus',      desc:'One of the most dense globulars; contains a planetary nebula'},
  {id:'M16', ra:18.3133, dec:-13.7922, type:'nebula',  subtype:'Emission Nebula',   mag:6.4,  con:'Serpens',      desc:'Eagle Nebula — home of the iconic "Pillars of Creation"'},
  {id:'M17', ra:18.3467, dec:-16.1758, type:'nebula',  subtype:'Emission Nebula',   mag:6.0,  con:'Sagittarius',  desc:'Omega/Swan Nebula — one of the brightest star-forming regions'},
  {id:'M18', ra:18.3317, dec:-17.1411, type:'cluster', subtype:'Open Cluster',      mag:7.5,  con:'Sagittarius',  desc:'Loose open cluster lying between M17 and M24'},
  {id:'M19', ra:17.0433, dec:-26.2683, type:'cluster', subtype:'Globular Cluster',  mag:7.2,  con:'Ophiuchus',    desc:'One of the most oblate (flattened) globular clusters known'},
  {id:'M20', ra:18.0439, dec:-23.0333, type:'nebula',  subtype:'Emission Nebula',   mag:5.2,  con:'Sagittarius',  desc:'Trifid Nebula — divided into three lobes by dark dust lanes'},
  {id:'M21', ra:18.0744, dec:-22.5003, type:'cluster', subtype:'Open Cluster',      mag:6.5,  con:'Sagittarius',  desc:'Open cluster just 0.7° NE of the Trifid Nebula'},
  {id:'M22', ra:18.6061, dec:-23.9047, type:'cluster', subtype:'Globular Cluster',  mag:5.1,  con:'Sagittarius',  desc:'One of the finest southern globulars, easily seen with naked eye'},
  {id:'M23', ra:17.9489, dec:-19.0158, type:'cluster', subtype:'Open Cluster',      mag:6.9,  con:'Sagittarius',  desc:'Rich, scattered open cluster near the Sagittarius star clouds'},
  {id:'M24', ra:18.2831, dec:-18.5500, type:'other',   subtype:'Star Cloud',        mag:4.6,  con:'Sagittarius',  desc:'Sagittarius Star Cloud — dense window into the Milky Way core'},
  {id:'M25', ra:18.5275, dec:-19.1167, type:'cluster', subtype:'Open Cluster',      mag:4.6,  con:'Sagittarius',  desc:'Large, scattered open cluster with a wide range of star brightnesses'},
  {id:'M26', ra:18.7547, dec:-9.3836,  type:'cluster', subtype:'Open Cluster',      mag:8.0,  con:'Scutum',       desc:'Sparse open cluster; less spectacular than nearby M11'},
  {id:'M27', ra:19.9936, dec:22.7208,  type:'nebula',  subtype:'Planetary Nebula',  mag:7.4,  con:'Vulpecula',    desc:'Dumbbell Nebula — the largest and brightest planetary nebula in the sky'},
  {id:'M28', ra:18.4092, dec:-24.8697, type:'cluster', subtype:'Globular Cluster',  mag:6.9,  con:'Sagittarius',  desc:'Compact globular cluster near the bright star Kaus Borealis'},
  {id:'M29', ra:20.3994, dec:38.5236,  type:'cluster', subtype:'Open Cluster',      mag:7.1,  con:'Cygnus',       desc:'Small, sparse open cluster embedded in a rich Milky Way field'},
  {id:'M30', ra:21.6728, dec:-23.1800, type:'cluster', subtype:'Globular Cluster',  mag:7.2,  con:'Capricornus',  desc:'Core-collapsed globular cluster with a highly concentrated centre'},
  {id:'M31', ra:0.7122,  dec:41.2689,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:3.4,  con:'Andromeda',    desc:'Andromeda Galaxy — our nearest large galactic neighbour, ~2.5 Mly'},
  {id:'M32', ra:0.7114,  dec:40.8658,  type:'galaxy',  subtype:'Elliptical Galaxy', mag:8.7,  con:'Andromeda',    desc:'Compact elliptical satellite galaxy of M31'},
  {id:'M33', ra:1.5636,  dec:30.6603,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:5.7,  con:'Triangulum',   desc:'Triangulum Galaxy — third-largest in the Local Group; needs dark skies'},
  {id:'M34', ra:2.7019,  dec:42.7422,  type:'cluster', subtype:'Open Cluster',      mag:5.5,  con:'Perseus',      desc:'Bright, loose open cluster, easily resolved with binoculars'},
  {id:'M35', ra:6.1481,  dec:24.3333,  type:'cluster', subtype:'Open Cluster',      mag:5.3,  con:'Gemini',       desc:'Rich open cluster; companion cluster NGC 2158 visible in background'},
  {id:'M36', ra:5.5994,  dec:34.1369,  type:'cluster', subtype:'Open Cluster',      mag:6.0,  con:'Auriga',       desc:'One of three showpiece Auriga open clusters; hot, young stars'},
  {id:'M37', ra:5.8728,  dec:32.5522,  type:'cluster', subtype:'Open Cluster',      mag:5.6,  con:'Auriga',       desc:'Richest of the three Auriga clusters, containing ~500 stars'},
  {id:'M38', ra:5.4783,  dec:35.8519,  type:'cluster', subtype:'Open Cluster',      mag:7.4,  con:'Auriga',       desc:'Open cluster with a cross or pi-shaped pattern of stars'},
  {id:'M39', ra:21.5331, dec:48.4325,  type:'cluster', subtype:'Open Cluster',      mag:4.6,  con:'Cygnus',       desc:'Very loose, large open cluster; best seen with binoculars'},
  {id:'M40', ra:12.3717, dec:58.0833,  type:'other',   subtype:'Double Star',       mag:8.4,  con:'Ursa Major',   desc:'Winnecke 4 — a wide double star; Messier\'s only such entry'},
  {id:'M41', ra:6.7664,  dec:-20.7433, type:'cluster', subtype:'Open Cluster',      mag:4.5,  con:'Canis Major',  desc:'Large open cluster south of Sirius, visible to naked eye'},
  {id:'M42', ra:5.5881,  dec:-5.3897,  type:'nebula',  subtype:'Emission Nebula',   mag:4.0,  con:'Orion',        desc:'Great Orion Nebula — the nearest massive star-forming region'},
  {id:'M43', ra:5.5928,  dec:-5.2694,  type:'nebula',  subtype:'Emission Nebula',   mag:9.0,  con:'Orion',        desc:'De Mairan\'s Nebula — separated from M42 by a dark dust lane'},
  {id:'M44', ra:8.6703,  dec:19.9825,  type:'cluster', subtype:'Open Cluster',      mag:3.7,  con:'Cancer',       desc:'Beehive Cluster / Praesepe — one of the nearest open clusters'},
  {id:'M45', ra:3.7908,  dec:24.1050,  type:'cluster', subtype:'Open Cluster',      mag:1.6,  con:'Taurus',       desc:'Pleiades / Seven Sisters — the most famous open cluster in the sky'},
  {id:'M46', ra:7.6961,  dec:-14.8158, type:'cluster', subtype:'Open Cluster',      mag:6.1,  con:'Puppis',       desc:'Rich open cluster; contains planetary nebula NGC 2438 in foreground'},
  {id:'M47', ra:7.6097,  dec:-14.4869, type:'cluster', subtype:'Open Cluster',      mag:4.4,  con:'Puppis',       desc:'Loose, bright open cluster just west of M46'},
  {id:'M48', ra:8.2278,  dec:-5.7994,  type:'cluster', subtype:'Open Cluster',      mag:5.5,  con:'Hydra',        desc:'Large, scattered open cluster; one of Messier\'s \'missing\' objects'},
  {id:'M49', ra:12.4961, dec:8.0006,   type:'galaxy',  subtype:'Elliptical Galaxy', mag:8.4,  con:'Virgo',        desc:'Brightest galaxy in the Virgo Cluster; dominates its subcluster'},
  {id:'M50', ra:7.0325,  dec:-8.3333,  type:'cluster', subtype:'Open Cluster',      mag:6.3,  con:'Monoceros',    desc:'Rich open cluster with a heart-shaped star pattern'},
  {id:'M51', ra:13.4978, dec:47.1950,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:8.4,  con:'Canes Venatici',desc:'Whirlpool Galaxy — classic face-on spiral with companion NGC 5195'},
  {id:'M52', ra:23.4047, dec:61.5933,  type:'cluster', subtype:'Open Cluster',      mag:7.3,  con:'Cassiopeia',   desc:'Rich, compressed open cluster; one corner notably brighter'},
  {id:'M53', ra:13.2153, dec:18.1683,  type:'cluster', subtype:'Globular Cluster',  mag:7.6,  con:'Coma Berenices',desc:'One of the more remote globulars; lies ~60,000 light-years away'},
  {id:'M54', ra:18.9178, dec:-30.4783, type:'cluster', subtype:'Globular Cluster',  mag:7.7,  con:'Sagittarius',  desc:'Belongs to the Sagittarius Dwarf Galaxy, not the Milky Way'},
  {id:'M55', ra:19.6667, dec:-30.9653, type:'cluster', subtype:'Globular Cluster',  mag:6.3,  con:'Sagittarius',  desc:'Large, loose globular; often described as an easy target'},
  {id:'M56', ra:19.2764, dec:30.1847,  type:'cluster', subtype:'Globular Cluster',  mag:8.3,  con:'Lyra',         desc:'Compact globular cluster between Albireo and Gamma Lyrae'},
  {id:'M57', ra:18.8931, dec:33.0289,  type:'nebula',  subtype:'Planetary Nebula',  mag:8.8,  con:'Lyra',         desc:'Ring Nebula — textbook planetary nebula; smoke ring in a telescope'},
  {id:'M58', ra:12.6281, dec:11.8181,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:9.7,  con:'Virgo',        desc:'One of the brightest spirals in the Virgo Cluster'},
  {id:'M59', ra:12.7008, dec:11.6469,  type:'galaxy',  subtype:'Elliptical Galaxy', mag:9.6,  con:'Virgo',        desc:'Massive elliptical galaxy in the core of the Virgo Cluster'},
  {id:'M60', ra:12.7278, dec:11.5533,  type:'galaxy',  subtype:'Elliptical Galaxy', mag:8.8,  con:'Virgo',        desc:'Elliptical giant with companion NGC 4647 seemingly overlapping it'},
  {id:'M61', ra:12.3656, dec:4.4739,   type:'galaxy',  subtype:'Spiral Galaxy',     mag:9.7,  con:'Virgo',        desc:'Face-on barred spiral at the edge of the Virgo Cluster'},
  {id:'M62', ra:17.0200, dec:-30.1122, type:'cluster', subtype:'Globular Cluster',  mag:6.6,  con:'Ophiuchus',    desc:'Asymmetric globular; one of the closest to the galactic centre'},
  {id:'M63', ra:13.2644, dec:42.0294,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:8.6,  con:'Canes Venatici',desc:'Sunflower Galaxy — multi-armed spiral with patchy structure'},
  {id:'M64', ra:12.9456, dec:21.6831,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:8.5,  con:'Coma Berenices',desc:'Black Eye Galaxy — dark band of dust in front of a bright nucleus'},
  {id:'M65', ra:11.3153, dec:13.0922,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:9.3,  con:'Leo',          desc:'Leo Triplet member; a tightly wound spiral with strong dust lanes'},
  {id:'M66', ra:11.3367, dec:12.9914,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:8.9,  con:'Leo',          desc:'Leo Triplet member; asymmetric arms distorted by gravitational interaction'},
  {id:'M67', ra:8.8556,  dec:11.8147,  type:'cluster', subtype:'Open Cluster',      mag:6.1,  con:'Cancer',       desc:'One of the oldest known open clusters, ~3.2 billion years old'},
  {id:'M68', ra:12.6572, dec:-26.7444, type:'cluster', subtype:'Globular Cluster',  mag:7.8,  con:'Hydra',        desc:'Southern globular with a relatively loose, extended halo'},
  {id:'M69', ra:18.5231, dec:-32.3481, type:'cluster', subtype:'Globular Cluster',  mag:7.7,  con:'Sagittarius',  desc:'Compact, metal-rich globular near the galactic centre'},
  {id:'M70', ra:18.7206, dec:-32.2928, type:'cluster', subtype:'Globular Cluster',  mag:8.1,  con:'Sagittarius',  desc:'Similar to M69 in size and distance; core-collapsed'},
  {id:'M71', ra:19.8956, dec:18.7789,  type:'cluster', subtype:'Globular Cluster',  mag:6.1,  con:'Sagitta',      desc:'Dense globular sometimes classified as a very rich open cluster'},
  {id:'M72', ra:20.8911, dec:-12.5378, type:'cluster', subtype:'Globular Cluster',  mag:9.3,  con:'Aquarius',     desc:'Small, faint globular south of the celestial equator'},
  {id:'M73', ra:20.9811, dec:-12.6322, type:'other',   subtype:'Asterism',          mag:9.0,  con:'Aquarius',     desc:'A Y-shaped group of 4 stars; probable asterism, not a true cluster'},
  {id:'M74', ra:1.6114,  dec:15.7836,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:9.4,  con:'Pisces',       desc:'Perfect face-on grand design spiral; notoriously faint surface brightness'},
  {id:'M75', ra:20.1014, dec:-21.9217, type:'cluster', subtype:'Globular Cluster',  mag:8.6,  con:'Sagittarius',  desc:'One of the most remote Messier globulars at ~58,000 light-years'},
  {id:'M76', ra:1.7017,  dec:51.5753,  type:'nebula',  subtype:'Planetary Nebula',  mag:10.1, con:'Perseus',      desc:'Little Dumbbell Nebula — faintest Messier object, a bipolar PN'},
  {id:'M77', ra:2.7119,  dec:-0.0133,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:8.9,  con:'Cetus',        desc:'Brightest Seyfert galaxy in the sky; active galactic nucleus'},
  {id:'M78', ra:5.7792,  dec:0.0789,   type:'nebula',  subtype:'Reflection Nebula', mag:8.3,  con:'Orion',        desc:'Brightest reflection nebula in the sky; blue glow from hot stars'},
  {id:'M79', ra:5.4028,  dec:-24.5239, type:'cluster', subtype:'Globular Cluster',  mag:7.7,  con:'Lepus',        desc:'Distant globular in a winter constellation; may have an extragalactic origin'},
  {id:'M80', ra:16.2844, dec:-22.9758, type:'cluster', subtype:'Globular Cluster',  mag:7.3,  con:'Scorpius',     desc:'Very dense, compact globular in the heart of Scorpius'},
  {id:'M81', ra:9.9256,  dec:69.0653,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:6.9,  con:'Ursa Major',   desc:'Bode\'s Galaxy — bright spiral and finest galaxy pair with M82'},
  {id:'M82', ra:9.9278,  dec:69.6797,  type:'galaxy',  subtype:'Irregular Galaxy',  mag:8.4,  con:'Ursa Major',   desc:'Cigar Galaxy — starburst galaxy with dramatic red hydrogen jets'},
  {id:'M83', ra:13.6169, dec:-29.8658, type:'galaxy',  subtype:'Spiral Galaxy',     mag:7.5,  con:'Hydra',        desc:'Southern Pinwheel — face-on barred spiral with multiple supernova sightings'},
  {id:'M84', ra:12.4194, dec:12.8872,  type:'galaxy',  subtype:'Elliptical Galaxy', mag:9.1,  con:'Virgo',        desc:'Giant elliptical in the Virgo Cluster core, near the chain of M86'},
  {id:'M85', ra:12.4228, dec:18.1911,  type:'galaxy',  subtype:'Elliptical Galaxy', mag:9.1,  con:'Coma Berenices',desc:'Northernmost Virgo Cluster member; interacting with NGC 4394'},
  {id:'M86', ra:12.4361, dec:12.9461,  type:'galaxy',  subtype:'Elliptical Galaxy', mag:8.9,  con:'Virgo',        desc:'Approaching us (blueshifted) — rare for a galaxy outside the Local Group'},
  {id:'M87', ra:12.5136, dec:12.3911,  type:'galaxy',  subtype:'Elliptical Galaxy', mag:8.6,  con:'Virgo',        desc:'Virgo A — giant elliptical with famous relativistic jet; first black hole imaged'},
  {id:'M88', ra:12.5319, dec:14.4197,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:9.6,  con:'Coma Berenices',desc:'Multi-armed spiral in the Virgo Cluster, seen nearly edge-on'},
  {id:'M89', ra:12.5942, dec:12.5564,  type:'galaxy',  subtype:'Elliptical Galaxy', mag:9.8,  con:'Virgo',        desc:'Nearly perfectly round elliptical galaxy in the Virgo Cluster'},
  {id:'M90', ra:12.6136, dec:13.1628,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:9.5,  con:'Virgo',        desc:'Approaching us — one of few galaxies with a blueshift in Messier\'s list'},
  {id:'M91', ra:12.5939, dec:14.4964,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:10.2, con:'Coma Berenices',desc:'Barred spiral in the Virgo Cluster; long listed as a "missing" Messier object'},
  {id:'M92', ra:17.2853, dec:43.1358,  type:'cluster', subtype:'Globular Cluster',  mag:6.4,  con:'Hercules',     desc:'Overlooked cousin of M13; impressive globular in its own right'},
  {id:'M93', ra:7.7419,  dec:-23.8503, type:'cluster', subtype:'Open Cluster',      mag:6.2,  con:'Puppis',       desc:'Arrowhead-shaped open cluster; one of Messier\'s best southern clusters'},
  {id:'M94', ra:12.8481, dec:41.1197,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:8.2,  con:'Canes Venatici',desc:'Cat\'s Eye Galaxy — bright starburst ring around a compact nucleus'},
  {id:'M95', ra:10.7325, dec:11.7036,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:9.7,  con:'Leo',          desc:'Barred spiral in the Leo I Group; bar and inner ring structure visible'},
  {id:'M96', ra:10.7797, dec:11.8200,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:9.2,  con:'Leo',          desc:'Brightest member of the Leo I Group; asymmetric arms and offset nucleus'},
  {id:'M97', ra:11.2486, dec:55.0194,  type:'nebula',  subtype:'Planetary Nebula',  mag:9.9,  con:'Ursa Major',   desc:'Owl Nebula — large, low surface brightness planetary nebula'},
  {id:'M98', ra:12.2289, dec:14.9003,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:10.1, con:'Coma Berenices',desc:'Fast-approaching edge-on spiral at the edge of the Virgo Cluster'},
  {id:'M99', ra:12.3133, dec:14.4169,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:9.9,  con:'Coma Berenices',desc:'Nearly face-on spiral with high star-formation rate'},
  {id:'M100',ra:12.3819, dec:15.8228,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:9.3,  con:'Coma Berenices',desc:'Grand design face-on spiral; one of the first galaxies photographed'},
  {id:'M101',ra:14.0531, dec:54.3489,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:7.9,  con:'Ursa Major',   desc:'Pinwheel Galaxy — large face-on spiral; asymmetric due to interactions'},
  {id:'M102',ra:15.1139, dec:55.7636,  type:'galaxy',  subtype:'Lenticular Galaxy', mag:9.9,  con:'Draco',        desc:'Spindle Galaxy (NGC 5866) — edge-on lenticular with prominent dust lane'},
  {id:'M103',ra:1.5578,  dec:60.6567,  type:'cluster', subtype:'Open Cluster',      mag:7.4,  con:'Cassiopeia',   desc:'Compact triangular open cluster in a rich Milky Way field'},
  {id:'M104',ra:12.6661, dec:-11.6231, type:'galaxy',  subtype:'Spiral Galaxy',     mag:8.0,  con:'Virgo',        desc:'Sombrero Galaxy — edge-on spiral with large central bulge and dust lane'},
  {id:'M105',ra:10.7983, dec:12.5819,  type:'galaxy',  subtype:'Elliptical Galaxy', mag:9.8,  con:'Leo',          desc:'Brightest elliptical in the Leo I Group; likely harbours a massive black hole'},
  {id:'M106',ra:12.3161, dec:47.3039,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:8.4,  con:'Canes Venatici',desc:'Seyfert galaxy with anomalous spiral arms created by a water maser jet'},
  {id:'M107',ra:16.5419, dec:-13.0531, type:'cluster', subtype:'Globular Cluster',  mag:7.9,  con:'Ophiuchus',    desc:'Loose, open-structured globular cluster in Ophiuchus'},
  {id:'M108',ra:11.1906, dec:55.6739,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:10.0, con:'Ursa Major',   desc:'Edge-on spiral near the Owl Nebula M97; lacks a distinct nucleus'},
  {id:'M109',ra:11.9578, dec:53.3744,  type:'galaxy',  subtype:'Spiral Galaxy',     mag:9.8,  con:'Ursa Major',   desc:'Barred spiral near Gamma Ursae Majoris (Phecda) in the Big Dipper'},
  {id:'M110',ra:0.6725,  dec:41.6853,  type:'galaxy',  subtype:'Elliptical Galaxy', mag:8.5,  con:'Andromeda',    desc:'Satellite galaxy of M31; large, diffuse elliptical companion to Andromeda'},
];

// Type icons for display
const MESSIER_ICONS = {
  'Globular Cluster':  '⚫',
  'Open Cluster':      '✦',
  'Emission Nebula':   '🌫',
  'Planetary Nebula':  '💫',
  'Reflection Nebula': '🔵',
  'Supernova Remnant': '💥',
  'Spiral Galaxy':     '🌀',
  'Elliptical Galaxy': '⭕',
  'Irregular Galaxy':  '✨',
  'Lenticular Galaxy': '💠',
  'Star Cloud':        '☁️',
  'Double Star':       '⭐',
  'Asterism':          '✴️',
};

// Compute altitude of a deep-sky object from RA (hours) and Dec (degrees)
function dsoAltitude(raDeg, decDeg, date) {
  const observer = new Astronomy.Observer(State.obsLat, State.obsLon, 0);
  const hor = Astronomy.Horizon(date, observer, raDeg / 15, decDeg, 'normal');
  return hor.altitude;
}

// Find peak altitude during the night window for an object
function dsoPeakAlt(raDeg, decDeg, nightStart, nightEnd) {
  let peak = -Infinity;
  const step = 20 * 60000; // 20-minute steps
  for (let t = nightStart.getTime(); t <= nightEnd.getTime(); t += step) {
    try {
      const alt = dsoAltitude(raDeg, decDeg, new Date(t));
      if (alt > peak) peak = alt;
    } catch(e) {}
  }
  return peak;
}

// Altitude quality badge
function dsoAltBadge(peakAlt) {
  if (peakAlt >= 60) return { label: 'Excellent',     cls: 'badge-good'  };
  if (peakAlt >= 40) return { label: 'Prime Viewing', cls: 'badge-good'  };
  if (peakAlt >= 20) return { label: 'Visible',       cls: 'badge-ok'    };
  if (peakAlt >  0)  return { label: 'Low Sky',       cls: 'badge-poor'  };
  return                    { label: 'Below Horizon', cls: 'badge-below' };
}

let _messierLoaded  = false;
let _messierResults = [];   // cached computed objects with peakAlt
let _messierFilter  = 'all';

function renderMessier() {
  const body = document.getElementById('messierBody');

  if (State.obsLat === null || State.obsLon === null) {
    body.innerHTML = locationErrorHTML('messier');
    return;
  }

  if (!_messierLoaded) {
    body.innerHTML = '<p class="no-targets">Computing altitudes for 110 objects…</p>';
    // Run async so the UI can update first
    setTimeout(() => _computeMessier(), 50);
    return;
  }

  _renderMessierResults();
}

function _computeMessier() {
  const now  = today();
  const { nightStart, nightEnd } = getNightWindow(now);

  _messierResults = MESSIER.map(obj => {
    const raDeg  = obj.ra * 15; // RA in degrees
    const peakAlt = dsoPeakAlt(raDeg, obj.dec, nightStart, nightEnd);
    return { ...obj, raDeg, peakAlt };
  });

  // Sort: visible objects first by peak altitude (desc), then below-horizon by altitude (desc)
  _messierResults.sort((a, b) => {
    const aVis = a.peakAlt > 0;
    const bVis = b.peakAlt > 0;
    if (aVis && !bVis) return -1;
    if (!aVis && bVis) return 1;
    return b.peakAlt - a.peakAlt;
  });

  _messierLoaded = true;
  _renderMessierResults();
}

function _renderMessierResults() {
  const body = document.getElementById('messierBody');
  const now  = today();
  const { nightStart, nightEnd } = getNightWindow(now);

  const fmtTime = d => {
    if (!d) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const tzLabel = new Date().toLocaleDateString('en-CA', { timeZoneName:'short' }).split(', ')[1] || 'local';

  // Filter
  const filtered = _messierResults.filter(obj => {
    if (_messierFilter === 'all')     return true;
    if (_messierFilter === 'galaxy')  return obj.type === 'galaxy';
    if (_messierFilter === 'nebula')  return obj.type === 'nebula';
    if (_messierFilter === 'cluster') return obj.type === 'cluster';
    if (_messierFilter === 'other')   return obj.type === 'other';
    return true;
  });

  const visible   = filtered.filter(o => o.peakAlt > 0);
  const invisible = filtered.filter(o => o.peakAlt <= 0);

  if (filtered.length === 0) {
    body.innerHTML = '<p class="no-targets">No objects match this filter.</p>';
    return;
  }

  let html = `<div class="planets-date">Times in ${tzLabel} &middot; ${now.toLocaleDateString('en-CA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
    <div class="sun-date sun-row-top">🌑 Dark ${fmtTime(nightStart)} &nbsp;·&nbsp; 🌅 Dawn ${fmtTime(nightEnd)}</div>
    <div class="messier-summary">
      <span class="messier-count-good">${visible.length} visible tonight</span>
      <span class="messier-count-dim"> · ${invisible.length} below horizon</span>
    </div>`;

  // Visible objects grouped by quality tier
  if (visible.length > 0) {
    const tiers = [
      { label: '⭐ Excellent (60°+)',     min: 60,  objects: [] },
      { label: '✅ Prime Viewing (40–60°)', min: 40, objects: [] },
      { label: '🔶 Visible (20–40°)',      min: 20,  objects: [] },
      { label: '🔸 Low Sky (0–20°)',       min: 0,   objects: [] },
    ];
    for (const obj of visible) {
      if      (obj.peakAlt >= 60) tiers[0].objects.push(obj);
      else if (obj.peakAlt >= 40) tiers[1].objects.push(obj);
      else if (obj.peakAlt >= 20) tiers[2].objects.push(obj);
      else                        tiers[3].objects.push(obj);
    }

    for (const tier of tiers) {
      if (tier.objects.length === 0) continue;
      html += `<div class="target-group"><div class="target-group-label">${tier.label}</div>`;
      let delay = 0;
      for (const obj of tier.objects) {
        const icon  = MESSIER_ICONS[obj.subtype] || '◆';
        const badge = dsoAltBadge(obj.peakAlt);
        html += `<div class="planet-row messier-row" style="animation-delay:${delay}ms">
          <span class="messier-id">${obj.id}</span>
          <span class="messier-icon">${icon}</span>
          <div class="messier-info">
            <div class="messier-name">${obj.subtype} <span class="messier-con">in ${obj.con}</span></div>
            <div class="messier-desc">${obj.desc}</div>
          </div>
          <div class="messier-right">
            <span class="planet-badge ${badge.cls}">${Math.round(obj.peakAlt)}°</span>
            <span class="messier-mag">mag ${obj.mag}</span>
          </div>
        </div>`;
        delay += 30;
      }
      html += '</div>';
    }
  }

  // Below horizon — collapsed by default, shown as a summary
  if (invisible.length > 0) {
    html += `<div class="target-group messier-below-group">
      <div class="target-group-label" onclick="toggleMessierBelow(this)" style="cursor:pointer">
        ⬇️ Below Horizon Tonight (${invisible.length}) <span class="messier-toggle-hint">tap to expand</span>
      </div>
      <div class="messier-below-list" style="display:none">`;
    for (const obj of invisible) {
      const icon = MESSIER_ICONS[obj.subtype] || '◆';
      html += `<div class="planet-row messier-row messier-row-below">
        <span class="messier-id messier-id-below">${obj.id}</span>
        <span class="messier-icon">${icon}</span>
        <div class="messier-info">
          <div class="messier-name">${obj.subtype} <span class="messier-con">in ${obj.con}</span></div>
        </div>
        <span class="planet-badge badge-below">Below</span>
      </div>`;
    }
    html += `</div></div>`;
  }

  body.innerHTML = html;
}

function filterMessier(filter, btn) {
  _messierFilter = filter;
  document.querySelectorAll('#messierFilter .filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  if (_messierLoaded) _renderMessierResults();
}

function toggleMessierBelow(headerEl) {
  const list = headerEl.nextElementSibling;
  const hint = headerEl.querySelector('.messier-toggle-hint');
  const isHidden = list.style.display === 'none';
  list.style.display = isHidden ? 'block' : 'none';
  if (hint) hint.textContent = isHidden ? 'tap to collapse' : 'tap to expand';
}




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
  }, 150);
});


// ── 13. Service worker ────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}


// ── Boot ──────────────────────────────────────────────────────────────────
render();
