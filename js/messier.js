// ═══════════════════════════════════════════════════════════════════════════
// Night Sky Observer — messier.js
// Messier catalogue, DSO helpers, render, filters
// ═══════════════════════════════════════════════════════════════════════════


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

// Fast altitude for a fixed sidereal object, given pre-computed GAST (hours).
// Avoids creating an Observer / calling Horizon on every sample.
function _dsoAltFast(raHours, decDeg, gast, sinLat, cosLat, lonHours) {
  const ha = (gast + lonHours - raHours) * 15 * Math.PI / 180; // hour angle (rad)
  const decR = decDeg * Math.PI / 180;
  const sinAlt = sinLat * Math.sin(decR) + cosLat * Math.cos(decR) * Math.cos(ha);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180 / Math.PI;
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

// Nautical twilight (sun alt < -12°) window for tonight.
function _nauticalNight(date) {
  const midnight = new Date(date); midnight.setHours(0, 0, 0, 0);
  const observer = new Astronomy.Observer(State.obsLat, State.obsLon, 0);
  let start = null, end = null;
  try { start = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, midnight, 1, -12)?.date; } catch(e) {}
  try {
    const from = start ?? new Date(midnight.getTime() + 20 * 3600000);
    end = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, +1, from, 1, -12)?.date;
  } catch(e) {}
  return {
    nightStart: start ?? new Date(midnight.getTime() + 18 * 3600000),
    nightEnd:   end   ?? new Date(midnight.getTime() + 30 * 3600000),
    hasTrueDark: !!(start && end),
  };
}

// Conservative minimum aperture (mm) for a meaningful view.
// Based on magnitude; dimmer = bigger scope needed.
function _recommendAperture(obj) {
  if (obj.mag <= 4.0)  return 50;   // binocular-easy
  if (obj.mag <= 6.0)  return 70;
  if (obj.mag <= 7.5)  return 100;
  if (obj.mag <= 9.0)  return 130;
  if (obj.mag <= 10.0) return 150;
  return 200;
}

// Recommended magnification range [low, high] — divide by your scope focal
// length to pick an eyepiece (e.g. 100× on a 1000mm scope = 10mm eyepiece).
function _recommendMagnification(obj) {
  switch (obj.subtype) {
    case 'Planetary Nebula':  return [100, 250];
    case 'Globular Cluster':  return [80, 200];
    case 'Emission Nebula':   return [30, 100];
    case 'Supernova Remnant': return [50, 120];
    case 'Reflection Nebula': return [30, 100];
    case 'Spiral Galaxy':
    case 'Elliptical Galaxy':
    case 'Lenticular Galaxy':
    case 'Irregular Galaxy':  return obj.mag <= 7 ? [30, 100] : [60, 150];
    case 'Open Cluster':      return obj.mag <= 5 ? [20, 60]  : [40, 100];
    case 'Star Cloud':        return [10, 40];
    case 'Double Star':       return [50, 150];
    case 'Asterism':          return [20, 60];
    default:                  return [50, 120];
  }
}

function _fmtTimeShort(d) {
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function _fmtDuration(ms) {
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
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
function _loadIntPref(key, min, max) {
  const v = parseInt(localStorage.getItem(key), 10);
  return Number.isFinite(v) && v >= min && v <= max ? v : null;
}

let _scopeFL       = _loadIntPref('nightsky.scopeFL', 100, 5000);
let _scopeAperture = _loadIntPref('nightsky.scopeAperture', 40, 800);
let _bortle        = _loadIntPref('nightsky.bortle', 1, 9);

function _initScopeInput() {
  const fl = document.getElementById('scopeFL');
  if (fl && _scopeFL !== null && fl.value === '') fl.value = _scopeFL;
  const ap = document.getElementById('scopeAperture');
  if (ap && _scopeAperture !== null && ap.value === '') ap.value = _scopeAperture;
  const b  = document.getElementById('bortle');
  if (b  && _bortle !== null && b.value === '')  b.value  = _bortle;
}

function _setIntPref(key, value, min, max, setter) {
  const v = parseInt(value, 10);
  if (Number.isFinite(v) && v >= min && v <= max) {
    setter(v);
    localStorage.setItem(key, String(v));
  } else {
    setter(null);
    localStorage.removeItem(key);
  }
  if (_messierLoaded) _renderMessierResults();
}

function setScopeFL(value)       { _setIntPref('nightsky.scopeFL',       value, 100, 5000, v => _scopeFL = v); }
function setScopeAperture(value) { _setIntPref('nightsky.scopeAperture', value, 40,  800,  v => _scopeAperture = v); }
function setBortle(value)        { _setIntPref('nightsky.bortle',        value, 1,   9,    v => _bortle = v); }

// Naked-eye limiting magnitude by Bortle class (rough table).
const _NELM = { 1: 7.8, 2: 7.3, 3: 6.8, 4: 6.3, 5: 5.8, 6: 5.3, 7: 4.8, 8: 4.3, 9: 4.0 };

// Telescope limiting magnitude = NELM + 5*log10(aperture / pupil_mm).
// Uses 7mm dark-adapted pupil. Returns null if either input is missing.
function _limitingMag() {
  if (_bortle === null || _scopeAperture === null) return null;
  const nelm = _NELM[_bortle];
  return nelm + 5 * Math.log10(_scopeAperture / 7);
}

// Composite "ease" score for an object given current settings.
// Higher = easier/better target tonight. Returns null if not visible.
function _scoreObject(obj) {
  if (obj.peakAlt < 20) return null;
  const limit = _limitingMag();
  if (limit !== null && obj.mag > limit - 0.5) return null; // need ≥0.5 mag margin
  const altScore     = obj.peakAlt;                                       // 20–90
  const windowScore  = Math.min(120, obj.winDurMs / 60000) / 4;           // 0–30
  const magMargin    = limit !== null ? Math.max(0, limit - obj.mag) : 5; // 0–10ish
  return altScore + windowScore + magMargin * 4;
}

// Format the magnification range as either "low–high×" (no scope) or
// "lo–hi mm (low–high×)" if the user has set a scope focal length.
function _fmtMag(bestMag) {
  const [lo, hi] = bestMag;
  if (_scopeFL === null) return `✨ ${lo}–${hi}×`;
  // Higher magnification = shorter eyepiece. Round to nearest mm.
  const epHigh = Math.max(2, Math.round(_scopeFL / hi));
  const epLow  = Math.max(2, Math.round(_scopeFL / lo));
  return `✨ ${epHigh}–${epLow}mm eyepiece (${lo}–${hi}×)`;
}

function renderMessier() {
  const body = document.getElementById('messierBody');
  _initScopeInput();

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
  const { nightStart, nightEnd } = _nauticalNight(now);

  // Pre-sample the nautical-twilight night at 5-minute steps.
  // GAST (Greenwich apparent sidereal time) is cached per sample so each
  // object only pays trig cost, not an Astronomy.Horizon call.
  const samples = [];
  const step = 5 * 60000;
  for (let t = nightStart.getTime(); t <= nightEnd.getTime(); t += step) {
    const d = new Date(t);
    samples.push({ time: d, gast: Astronomy.SiderealTime(d) });
  }
  const latRad   = State.obsLat * Math.PI / 180;
  const sinLat   = Math.sin(latRad);
  const cosLat   = Math.cos(latRad);
  const lonHours = State.obsLon / 15;
  const ALT_MIN  = 20;

  _messierResults = MESSIER.map(obj => {
    let peakAlt = -Infinity, peakTime = null;
    let curStart = null, winStart = null, winEnd = null, winDurMs = 0;

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const alt = _dsoAltFast(obj.ra, obj.dec, s.gast, sinLat, cosLat, lonHours);
      if (alt > peakAlt) { peakAlt = alt; peakTime = s.time; }
      if (alt >= ALT_MIN) {
        if (curStart === null) curStart = s.time;
      } else if (curStart !== null) {
        const dur = samples[i - 1].time - curStart;
        if (dur > winDurMs) { winDurMs = dur; winStart = curStart; winEnd = samples[i - 1].time; }
        curStart = null;
      }
    }
    if (curStart !== null && samples.length) {
      const last = samples[samples.length - 1].time;
      const dur = last - curStart;
      if (dur > winDurMs) { winDurMs = dur; winStart = curStart; winEnd = last; }
    }

    return {
      ...obj,
      raDeg: obj.ra * 15,
      peakAlt,
      peakTime,
      winStart,
      winEnd,
      winDurMs,
      minAperture: _recommendAperture(obj),
      bestMag:     _recommendMagnification(obj),
    };
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
  const { nightStart, nightEnd } = _nauticalNight(now);

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

  // ── Tonight's Best ────────────────────────────────────────────────────
  if (_messierFilter === 'all' && visible.length > 0) {
    const ranked = visible
      .map(o => ({ o, score: _scoreObject(o) }))
      .filter(x => x.score !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    if (ranked.length) {
      const limit = _limitingMag();
      const ctx   = limit !== null
        ? `Ranked for your ${_scopeAperture}mm scope under Bortle ${_bortle} skies (limit ≈ mag ${limit.toFixed(1)})`
        : `Ranked by altitude & viewing window. Set aperture and Bortle for personalised picks.`;
      html += `<div class="best-section">
        <div class="best-header">⭐ Tonight's Best</div>
        <div class="best-context">${ctx}</div>
        <ol class="best-list">`;
      for (const { o } of ranked) {
        html += `<li><span class="best-id">${o.id}</span> <span class="best-name">${o.subtype} in ${o.con}</span> <span class="best-meta">${Math.round(o.peakAlt)}° · mag ${o.mag} · ${_fmtTimeShort(o.winStart)}–${_fmtTimeShort(o.winEnd)}</span></li>`;
      }
      html += '</ol></div>';
    }
  }

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
        const winTxt = obj.winStart
          ? `🕐 ${_fmtTimeShort(obj.winStart)}–${_fmtTimeShort(obj.winEnd)} (${_fmtDuration(obj.winDurMs)})`
          : `🕐 below 20° tonight`;
        const apTxt  = `🔭 ≥${obj.minAperture}mm`;
        const magTxt = _fmtMag(obj.bestMag);
        html += `<div class="planet-row messier-row" style="animation-delay:${delay}ms">
          <span class="messier-id">${obj.id}</span>
          <span class="messier-icon">${icon}</span>
          <div class="messier-info">
            <div class="messier-name">${obj.subtype} <span class="messier-con">in ${obj.con}</span></div>
            <div class="messier-desc">${obj.desc}</div>
            <div class="messier-obs">${apTxt} · ${magTxt} · ${winTxt}</div>
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
