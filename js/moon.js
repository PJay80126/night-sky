// ═══════════════════════════════════════════════════════════════════════════
// Night Sky Observer — moon.js
// Photo data, lunar feature catalogue, moon helpers, render, lightbox
// ═══════════════════════════════════════════════════════════════════════════


// ── Photo data ──────────────────────────────────────────────────────────
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


// ── Lunar feature catalogue ─────────────────────────────────────────────
const FEATURES = [
  // Q-Day -5
  {name:'Endymion',             qday:-5, lat:53.6067, lon:56.4832, pos:'N', desc:'Large dark-floored crater E of Mare Frigoris'},
  {name:'Cleomedes',            qday:-5, lat:27.6005, lon:55.5005, pos:'N', desc:'Prominent eroded crater N of Mare Crisium'},
  {name:'Mare Crisium',         qday:-5, lat:16.1774, lon:59.1037, pos:'E', desc:'Spectacular lava-filled basin with impressive wall structures'},
  {name:'Langrenus',            qday:-5, lat:-8.8604, lon:61.038, pos:'E', desc:'Crater with twin peaks, terraced walls and ejecta field'},
  {name:'Vendelinus',           qday:-5, lat:-16.4576, lon:61.5456, pos:'E', desc:'Large, heavily eroded crater'},
  {name:'Petavius',             qday:-5, lat:-25.3914, lon:60.7776, pos:'S', desc:'Crater with massive complex central peak and floor rifts'},
  {name:'Furnerius',            qday:-5, lat:-36.0038, lon:60.5383, pos:'S', desc:'Old eroded crater with ejecta on its floor'},
  {name:'Snellius',             qday:-5, lat:-29.3332, lon:55.7048, pos:'S', desc:'Old eroded crater SW of Petavius'},
  {name:'Stevinus',             qday:-5, lat:-32.4902, lon:54.1372, pos:'S', desc:'Prominent circular crater with deep-terraced walls'},
  // Q-Day -4
  {name:'Newcomb',              qday:-4, lat:29.7623, lon:43.6666, pos:'N', desc:'Midsize crater, part of a complex NE of Taurus Mountains'},
  {name:'Macrobius',            qday:-4, lat:21.2556, lon:45.9702, pos:'N', desc:'Well-defined crater with central feature NW of Mare Crisium'},
  {name:'Taruntius',            qday:-4, lat:5.5022, lon:46.5426, pos:'E', desc:'Midsized crater at N edge of Mare Fecunditatis'},
  {name:'Mare Fecunditatis',    qday:-4, lat:-7.835, lon:53.6691, pos:'E', desc:'Two contiguous round areas of dark basaltic lava'},
  {name:'Cook',                 qday:-4, lat:-17.4975, lon:48.8072, pos:'E', desc:'Midsized lava-filled crater on SW edge of Mare Fecunditatis'},
  {name:'Rheita Valley',        qday:-4, lat:-42.5126, lon:51.654, pos:'S', desc:'Longest lunar valley visible from Earth, W of Furnerius'},
  // Q-Day -3
  {name:'Atlas',                qday:-3, lat:46.7403, lon:44.3816, pos:'N', desc:'Prominent crater to E of Hercules'},
  {name:'Hercules',             qday:-3, lat:46.8219, lon:39.2135, pos:'N', desc:'Prominent crater on E edge of Mare Frigoris'},
  {name:'Taurus Mountains',     qday:-3, lat:27.3232, lon:40.3355, pos:'N', desc:'Mountain range E of Mare Serenitatis'},
  {name:'Pyrenees Mountains',   qday:-3, lat:-14.048, lon:41.5097, pos:'S', desc:'Mountain range forming inner ring E of Mare Nectaris'},
  {name:'Fracastorius',         qday:-3, lat:-21.3587, lon:33.0703, pos:'S', desc:'Lava-filled crater at S tip of Mare Nectaris'},
  {name:'Piccolomini',          qday:-3, lat:-29.6998, lon:32.1986, pos:'S', desc:'Midsized crater S of Fracastorius at S tip of Altai Scarp'},
  // Q-Day -2
  {name:'Lacus Somniorum',      qday:-2, lat:37.5622, lon:30.8046, pos:'N', desc:'Large lava field connected with NE of Mare Serenitatis'},
  {name:'Posidonius',           qday:-2, lat:31.8783, lon:29.9913, pos:'N', desc:'Flooded crater with very irregular terrain'},
  {name:'Mare Tranquillitatis', qday:-2, lat:8.3487, lon:30.8346, pos:'E', desc:'Large sea on the E side — first lunar landing site'},
  {name:'Plinius',              qday:-2, lat:15.3569, lon:23.6067, pos:'E', desc:'Complex crater with multiple central mountains'},
  {name:'Ross',                 qday:-2, lat:11.669, lon:21.7375, pos:'E', desc:'Crater within Mare Tranquillitatis on its W side'},
  {name:'Arago',                qday:-2, lat:6.1487, lon:21.4261, pos:'E', desc:'Crater within Mare Tranquillitatis on its W side'},
  {name:'Maskelyne',            qday:-2, lat:2.1558, lon:30.0437, pos:'E', desc:'Crater within Mare Tranquillitatis on its S side'},
  {name:'Theophilus',           qday:-2, lat:-11.4524, lon:26.2847, pos:'E', desc:'Bordering Mare Nectaris, part of trio with Cyrillus & Catharina'},
  {name:'Cyrillus',             qday:-2, lat:-13.2913, lon:24.0655, pos:'E', desc:'Older than Theophilus, more eroded, overlapped on E wall'},
  {name:'Catharina',            qday:-2, lat:-17.9802, lon:23.5521, pos:'E', desc:'Eroded crater at N edge of the Altai Scarp'},
  {name:'Mare Nectaris',        qday:-2, lat:-15.1852, lon:34.6021, pos:'S', desc:'Smallest of the major circular maria, 350 km across'},
  {name:'Altai Scarp',          qday:-2, lat:-24.3176, lon:23.124, pos:'S', desc:'Continuous SW outer rim of the Nectaris basin — spectacular at low Sun'},
  // Q-Day -1
  {name:'Aristoteles',          qday:-1, lat:50.243, lon:17.32, pos:'N', desc:'Crater at S edge of Mare Frigoris'},
  {name:'Eudoxus',              qday:-1, lat:44.2656, lon:16.2257, pos:'N', desc:'Neighbour of Aristoteles'},
  {name:'Mare Serenitatis',     qday:-1, lat:27.2879, lon:18.3596, pos:'N', desc:'Impact basin filled with Imbrium Era mare material'},
  {name:'Bessel',               qday:-1, lat:21.7342, lon:17.9204, pos:'N', desc:'Sharp crater near center of Mare Serenitatis'},
  {name:'Haemus Mountains',     qday:-1, lat:17.1071, lon:12.0308, pos:'E', desc:'Raised edge forming SW shore of Mare Serenitatis'},
  {name:'Manilius',             qday:-1, lat:14.452, lon:9.0737, pos:'E', desc:'Large crater in a relatively crater-free area E of Mare Vaporum'},
  {name:'Julius Caesar',        qday:-1, lat:9.1665, lon:15.2105, pos:'E', desc:'Lava-filled eroded crater W of Mare Tranquillitatis'},
  {name:'Delambre',             qday:-1, lat:-1.9391, lon:17.394, pos:'E', desc:'Sharp crater with terraced rim SW of Mare Tranquillitatis'},
  {name:'Maurolycus',           qday:-1, lat:-41.7719, lon:13.9201, pos:'S', desc:'Large crater with terraced walls'},
  // Q-Day 0
  {name:'Mare Frigoris',        qday: 0, lat:57.5923, lon:359.9936, pos:'N', desc:'Large linear sea at the N limb of the Moon'},
  {name:'Alpine Valley',        qday: 0, lat:49.2088, lon:3.6314, pos:'N', desc:'Runs perpendicular to the prominent Alps Mountains'},
  {name:'Alps Mountains',       qday: 0, lat:48.36, lon:359.42, pos:'N', desc:'Spectacular boundary of the Mare Imbrium basin'},
  {name:'Cassini',              qday: 0, lat:40.2503, lon:4.6437, pos:'N', desc:'Mid-sized crater on NE edge of Mare Imbrium with two inner craters'},
  {name:'Caucasus Mountains',   qday: 0, lat:37.5188, lon:9.9311, pos:'N', desc:'Mountain chain forming NW shore of Mare Serenitatis'},
  {name:'Aristillus',           qday: 0, lat:33.8808, lon:1.2075, pos:'N', desc:'Crater in Mare Imbrium with notable ejecta blanket'},
  {name:'Autolycus',            qday: 0, lat:30.6757, lon:1.4858, pos:'N', desc:'Crater directly S of Aristillus'},
  {name:'Apennine Mountains',   qday: 0, lat:19.8714, lon:0.0253, pos:'E', desc:'Spectacular mountain range NW of Mare Vaporum'},
  {name:'Mare Vaporum',         qday: 0, lat:13.1967, lon:4.0862, pos:'E', desc:'Smaller mare between Mare Imbrium and Mare Serenitatis'},
  {name:'Sinus Medii',          qday: 0, lat:1.6337, lon:1.0269, pos:'E', desc:'Lighter-coloured lava feature S of Mare Vaporum'},
  {name:'Hipparchus',           qday: 0, lat:-5.3565, lon:4.9133, pos:'E', desc:'Old eroded square-ish crater below Sinus Medii'},
  {name:'Halley',               qday: 0, lat:-8.0492, lon:5.7298, pos:'E', desc:'Small crater touching the S of Hipparchus'},
  {name:'Albategnius',          qday: 0, lat:-11.24, lon:4.0092, pos:'E', desc:'Large crater with off-centre peak'},
  {name:'Herschel',             qday: 0, lat:-5.686, lon:357.9146, pos:'E', desc:'Smaller crater N of Ptolemaeus'},
  {name:'Ptolemaeus',           qday: 0, lat:-9.1605, lon:358.1627, pos:'E', desc:'Younger neighbour of Alphonsus'},
  {name:'Alphonsus',            qday: 0, lat:-13.3879, lon:357.1537, pos:'E', desc:'Prominent crater with central peak, E of Mare Nubium'},
  {name:'Arzachel',             qday: 0, lat:-18.2643, lon:358.0696, pos:'E', desc:'Crater with sharply-defined, deep-terraced walls'},
  // Q-Day 1
  {name:'Plato',                qday: 1, lat:51.6192, lon:350.6175, pos:'N', desc:'Dark-floored crater on margin of Mare Imbrium S of Mare Frigoris'},
  {name:'Teneriffe Mountains',  qday: 1, lat:47.8908, lon:346.8128, pos:'N', desc:'Small mountain range in N part of Mare Imbrium'},
  {name:'Spitzbergen Mountains',qday: 1, lat:34.4724, lon:354.7865, pos:'N', desc:'Small range in E quadrant of Mare Imbrium'},
  {name:'Archimedes',           qday: 1, lat:29.7172, lon:356.0069, pos:'N', desc:'Sharp crater with terraced walls in Mare Imbrium'},
  {name:'Timocharis',           qday: 1, lat:26.7172, lon:346.8998, pos:'N', desc:'Prominent crater near middle of Mare Imbrium'},
  {name:'Eratosthenes',         qday: 1, lat:14.4737, lon:348.6838, pos:'E', desc:'Large crater at S tip of Montes Apenninus'},
  {name:'Sinus Aestuum',        qday: 1, lat:12.0976, lon:351.6604, pos:'E', desc:'Seething Bay — S of Mare Imbrium'},
  {name:'Mare Nubium',          qday: 1, lat:-20.5894, lon:342.7128, pos:'S', desc:'Southernmost sea directly W of Alphonsus'},
  {name:'Straight Wall',        qday: 1, lat:-21.6748, lon:352.2981, pos:'S', desc:'Rupes Recta — a cliff on E side of Mare Nubium'},
  {name:'Tycho',                qday: 1, lat:-43.2958, lon:348.7847, pos:'S', desc:'Recent crater best seen at Full Moon when rays spread across the surface'},
  {name:'Maginus',              qday: 1, lat:-50.0337, lon:354.0163, pos:'S', desc:'Large old and eroded crater above Clavius'},
  {name:'Clavius',              qday: 1, lat:-58.6228, lon:345.2725, pos:'S', desc:'Large crater at S end of the Moon'},
  // Q-Day 2
  {name:'Straight Range',       qday: 2, lat:48.2957, lon:340.2761, pos:'N', desc:'Montes Recti — small mountain range in N Mare Imbrium'},
  {name:'Mare Imbrium',         qday: 2, lat:34.7244, lon:345.0914, pos:'N', desc:'Sea of Rains — large sea S of Mare Frigoris'},
  {name:'Carpathian Mountains', qday: 2, lat:14.5677, lon:336.3755, pos:'E', desc:'Large mountain chain forming S edge of Mare Imbrium'},
  {name:'Copernicus',           qday: 2, lat:9.6209, lon:339.9214, pos:'E', desc:'Spectacular central peaks surrounded by ejecta and secondary craters'},
  {name:'Reinhold',             qday: 2, lat:3.2815, lon:337.1375, pos:'E', desc:'Terraced wall crater with ejecta blanket, N of Mare Cognitum'},
  {name:'Lansberg',             qday: 2, lat:-0.3118, lon:333.3727, pos:'E', desc:'Deep terraced wall crater SW of Reinhold'},
  {name:'Riphaeus Mountains',   qday: 2, lat:-7.4829, lon:332.3975, pos:'E', desc:'Mountain range in S part of Oceanus Procellarum'},
  {name:'Bullialdus',           qday: 2, lat:-20.7477, lon:337.7368, pos:'S', desc:'Exceptional crater with ejecta blanket in W Mare Nubium'},
  {name:'Wilhelm',              qday: 2, lat:-43.2127, lon:339.0594, pos:'S', desc:'Large crater W of Tycho'},
  {name:'Longomontanus',        qday: 2, lat:-49.5516, lon:338.1207, pos:'S', desc:'Very large prominent crater in heavily impacted region'},
  // Q-Day 3
  {name:'Jura Mountains',       qday: 3, lat:47.4935, lon:323.889, pos:'N', desc:'High mountain range almost completely encircling Sinus Iridum'},
  {name:'Sinus Iridum',         qday: 3, lat:45.0101, lon:328.3347, pos:'N', desc:'Dark-flooded crater on edge of Mare Imbrium'},
  {name:'Kepler',               qday: 3, lat:8.121, lon:321.9913, pos:'E', desc:'Recent impact crater with bright ray system'},
  {name:'Gassendi',             qday: 3, lat:-17.5546, lon:320.0363, pos:'E', desc:'Eroded crater with system of rilles on its floor'},
  {name:'Schiller',             qday: 3, lat:-51.7244, lon:320.216, pos:'S', desc:'Large and elongated crater in SW quadrant'},
  // Q-Day 4
  {name:'Mersenius',            qday: 4, lat:-21.4928, lon:310.6638, pos:'S', desc:'Large eroded crater W of Mare Humorum'},
  {name:'Aristarchus',          qday: 4, lat:23.7299, lon:312.5099, pos:'N', desc:'Bright complex crater near edge of Oceanus Procellarum'},
  {name:'Oceanus Procellarum',  qday: 4, lat:20.6714, lon:303.3226, pos:'E', desc:'Ocean of Storms — large lava-covered area W of Mare Imbrium'},
  {name:'Mare Humorum',         qday: 4, lat:-24.4785, lon:321.4284, pos:'S', desc:'Sea of Moisture — small sea S of Oceanus Procellarum'},
  // Q-Day 5
  {name:'Sinus Roris',          qday: 5, lat:50.2613, lon:309.1412, pos:'N', desc:'Bay of Dew — NW bay linking Oceanus Procellarum and Mare Frigoris'},
  {name:'Schickard',            qday: 5, lat:-44.3793, lon:304.8948, pos:'S', desc:'Very large crater with bright spots in SW quadrant'},
  // Q-Day 6
  {name:'Hevelius',             qday: 6, lat:2.1952, lon:292.5374, pos:'E', desc:'Low-rimmed eroded crater N of Grimaldi'},
  {name:'Grimaldi',             qday: 6, lat:-5.38, lon:291.64, pos:'E', desc:'Large round basin with dark floor on W edge of the Moon'},
];


// ── Moon helpers ────────────────────────────────────────────────────────

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


// ── Moon tab render ─────────────────────────────────────────────────────

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

function renderMoon() {
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


// ── Lightbox & photo toggle ─────────────────────────────────────────────

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
