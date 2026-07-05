// Night Sky Observer — smoke test harness.
//
// Loads the REAL production files into a Node vm sandbox (no build step, no
// dependencies) and drives the actual astronomy/forecast pipeline. Run with:
//
//   node tests/smoke.js
//
// Exits non-zero on any failure. Extend this when changing scoring, twilight,
// Q-Day, location, or cache logic.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }

// ── Sandbox with minimal DOM/browser stubs ──────────────────────────────
const _store = new Map();
const sandbox = {
  console,
  document: {
    getElementById: () => ({ innerHTML: '', style: {}, getContext: () => null, offsetWidth: 800 }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
  },
  navigator: {},   // no geolocation — exercises the manual fallback
  window: {},
  localStorage: {
    getItem: (k) => (_store.has(k) ? _store.get(k) : null),
    setItem: (k, v) => _store.set(k, String(v)),
    removeItem: (k) => _store.delete(k),
  },
  requestAnimationFrame: () => {},
  setInterval: () => 0,
  setTimeout: () => 0,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['astronomy.browser.js', 'js/state.js', 'js/moon.js', 'js/messier.js', 'js/forecast.js']) {
  vm.runInContext(read(f), sandbox, { filename: f });
}
vm.runInContext('State.obsLat = 45.4215; State.obsLon = -75.6972;', sandbox); // Ottawa

const results = [];
function check(name, cond, detail) { results.push({ name, pass: !!cond, detail }); }

// ── Twilight windows ────────────────────────────────────────────────────
const tw12 = vm.runInContext('getTwilightWindow(new Date(), -12)', sandbox);
const tw18 = vm.runInContext('getTwilightWindow(new Date(), -18)', sandbox);
const nw   = vm.runInContext('getNightWindow(new Date())', sandbox);
const nn   = vm.runInContext('_nauticalNight(new Date())', sandbox);
check('Twilight: -12 window ordered', tw12.nightStart < tw12.nightEnd, JSON.stringify(tw12));
check('Twilight: -18 window nests inside -12',
  tw18.nightStart >= tw12.nightStart && tw18.nightEnd <= tw12.nightEnd,
  JSON.stringify({ tw12, tw18 }));
check('Twilight: getNightWindow keeps legacy shape', 'noTrueDark' in nw && !!nw.nightStart);
check('Twilight: _nauticalNight delegates to -12',
  nn.nightStart.getTime() === tw12.nightStart.getTime() && nn.nightEnd.getTime() === tw12.nightEnd.getTime());

// ── Q-Day / moon math ───────────────────────────────────────────────────
const fq = vm.runInContext(`findNearestFQ(new Date('2026-07-10T00:00:00'))`, sandbox);
check('QDay: findNearestFQ returns a Date within 15 days',
  fq && Math.abs(fq - new Date('2026-07-10')) < 15 * 86400000, String(fq));
const fqGap = vm.runInContext(`
  (() => {
    const a = findNextFQ(new Date('2026-07-01T00:00:00'));
    const b = findNextFQ(new Date(a.getTime() + 86400000));
    return (b - a) / 86400000;
  })()
`, sandbox);
check('QDay: consecutive first quarters ~29-30 days apart', fqGap > 28 && fqGap < 31, `gap=${fqGap}`);
const mi = vm.runInContext('getMoonInfo(new Date())', sandbox);
check('Moon: getMoonInfo sane shape',
  mi.pct >= 0 && mi.pct <= 100 && !!mi.name && !!mi.icon && !!mi.label, JSON.stringify(mi));

// ── Manual location fallback ────────────────────────────────────────────
_store.set('nightsky.manualLat', '44.0');
_store.set('nightsky.manualLon', '-76.0');
const manualResult = vm.runInContext(`
  (() => {
    let out = null;
    getLocation(() => { out = 'ok'; }, () => { out = 'fail'; });
    return { out, lat: State.obsLat, lon: State.obsLon, src: State.locationSource };
  })()
`, sandbox);
check('Location: manual coords used when geolocation missing',
  manualResult.out === 'ok' && manualResult.lat === 44.0 && manualResult.lon === -76.0 && manualResult.src === 'manual',
  JSON.stringify(manualResult));
_store.set('nightsky.manualLat', '999');   // invalid
const badManual = vm.runInContext(`
  (() => { let out = null; getLocation(() => { out = 'ok'; }, () => { out = 'fail'; }); return out; })()
`, sandbox);
check('Location: invalid stored coords fall through to onFail', badManual === 'fail', String(badManual));
_store.delete('nightsky.manualLat');
_store.delete('nightsky.manualLon');
vm.runInContext('State.obsLat = 45.4215; State.obsLon = -75.6972;', sandbox); // restore

// ── Forecast cache round-trip ───────────────────────────────────────────
check('Cache: empty -> null', vm.runInContext('_readForecastCache()', sandbox) === null);
_store.set('nightsky.fcCache', JSON.stringify({ ts: 123, lat: 10, lon: 10, data: { hourly: { time: [] } } }));
check('Cache: far-away coords -> null', vm.runInContext('_readForecastCache()', sandbox) === null);
_store.set('nightsky.fcCache', JSON.stringify({ ts: 123, lat: 45.5, lon: -75.7, data: { hourly: { time: [] } } }));
const cacheHit = vm.runInContext('_readForecastCache()', sandbox);
check('Cache: nearby coords round-trip', cacheHit && cacheHit.ts === 123, JSON.stringify(cacheHit));
_store.delete('nightsky.fcCache');

// ── forecastMax helper ──────────────────────────────────────────────────
check('forecastMax: empty -> null', vm.runInContext(`forecastMax([], 'x')`, sandbox) === null);
check('forecastMax: nulls dropped, max found',
  vm.runInContext(`forecastMax([{p:null},{p:10},{p:80},{p:null}], 'p')`, sandbox) === 80);

// ── getOutlook ──────────────────────────────────────────────────────────
const allNull = vm.runInContext(`getOutlook(Array.from({length:10}, () => ({tcdc:null, precip_prob:0})))`, sandbox);
check('Outlook: all-null cloud -> No Data', allNull.label === 'No Data', JSON.stringify(allNull));

const mixedNull = vm.runInContext(`getOutlook([...Array.from({length:6},()=>({tcdc:null,precip_prob:0})), ...Array.from({length:6},()=>({tcdc:90,precip_prob:0}))])`, sandbox);
check('Outlook: mixed-null cloud -> nulls dropped, median undiluted (Overcast)',
  mixedNull.label === 'Overcast', JSON.stringify(mixedNull));

const spike = vm.runInContext(`getOutlook([...Array.from({length:11},()=>({tcdc:5,precip_prob:0})), {tcdc:5,precip_prob:80}])`, sandbox);
check('Outlook: single-hour 80% precip spike over clear night -> Unsettled "Up to 80%"',
  spike.label === 'Unsettled' && spike.sub.includes('Up to 80%'), JSON.stringify(spike));

const dryClear = vm.runInContext(`getOutlook(Array.from({length:12},()=>({tcdc:5,precip_prob:10})))`, sandbox);
check('Outlook: dry clear night still -> Clear', dryClear.label === 'Clear', JSON.stringify(dryClear));

const cloudyWet = vm.runInContext(`getOutlook(Array.from({length:12},()=>({tcdc:90,precip_prob:80})))`, sandbox);
check('Outlook: overcast + wet -> stays Overcast (cross-check only fires on clear verdicts)',
  cloudyWet.label === 'Overcast', JSON.stringify(cloudyWet));

const variable = vm.runInContext(`getOutlook([...Array.from({length:6},()=>({tcdc:5,precip_prob:0})), ...Array.from({length:6},()=>({tcdc:90,precip_prob:0}))])`, sandbox);
check('Outlook: half/half -> Variable sub-text', variable.sub.startsWith('Variable') || variable.label === 'Overcast',
  JSON.stringify(variable));

// ── getDewRisk ──────────────────────────────────────────────────────────
const dawnCollapse = vm.runInContext(`getDewRisk([...Array.from({length:8},(_,i)=>({tmp:15-i, dewp:7})), {tmp:7.5, dewp:7}])`, sandbox);
check('DewRisk: spread collapsing to 0.5C at dawn -> Very High',
  dawnCollapse.label === 'Very High' && dawnCollapse.text.includes('0.5'), JSON.stringify(dawnCollapse));

const drySpread = vm.runInContext(`getDewRisk(Array.from({length:10},()=>({tmp:20, dewp:8})))`, sandbox);
check('DewRisk: steady 12C spread -> Low', drySpread.label === 'Low', JSON.stringify(drySpread));

const rhFallback = vm.runInContext(`getDewRisk(Array.from({length:10},(_,i)=>({tmp:null, dewp:null, rh:70+i*3})))`, sandbox);
check('DewRisk: no spread data, RH peaking at 97% -> Very High (fallback path)',
  rhFallback.label === 'Very High' && rhFallback.text.includes('97'), JSON.stringify(rhFallback));

check('DewRisk: empty -> Unknown', vm.runInContext(`getDewRisk([])`, sandbox).label === 'Unknown');

// ── computeSeeing ───────────────────────────────────────────────────────
vm.runInContext(`
  function __mkHour(o) {
    return Object.assign({
      temp250:-45, temp500:-20, temp850:5, temp1000:14,
      wind250:80, wind500:50, wind850:20, wind1000:10,
      wdir250:270, wdir500:260, wdir850:250, wdir1000:240,
      z250:10500, z500:5500, z850:1400, z1000:100,
    }, o);
  }
`, sandbox);

const seeingConst = vm.runInContext(`computeSeeing(Array.from({length:12}, () => __mkHour({})))`, sandbox);
check('Seeing: constant HRDPS night computes on upper-air path',
  seeingConst.hasUpperAir === true && seeingConst.text.includes('Min Ri'), JSON.stringify(seeingConst));

const wrapSeeing = vm.runInContext(`
  computeSeeing(Array.from({length:12}, (_, i) => __mkHour({
    wind250: 60, wdir250: i % 2 ? 350 : 10,
    wind500: 55, wdir500: i % 2 ? 355 : 5,
  })))
`, sandbox);
check('Seeing: wind directions oscillating around north do not manufacture shear',
  wrapSeeing.hasUpperAir === true && wrapSeeing.score > 0.25, JSON.stringify(wrapSeeing));

const laminar = vm.runInContext(`
  computeSeeing(Array.from({length:5}, () => __mkHour({
    wind250:30, wind500:30, wind850:30, wind1000:30,
    wdir250:270, wdir500:270, wdir850:270, wdir1000:270,
  })))
`, sandbox);
check('Seeing: zero-shear night -> Ri infinity handled (Excellent, no NaN)',
  laminar.label === 'Excellent' && laminar.text.includes('∞'), JSON.stringify(laminar));

const sfcOnly = vm.runInContext(`computeSeeing(Array.from({length:6}, () => ({wspd: 12})))`, sandbox);
check('Seeing: no pressure data -> surface-only fallback',
  sfcOnly.hasUpperAir === false && sfcOnly.text.includes('surface-only'), JSON.stringify(sfcOnly));

// ── Full pipeline: parse -> night filter -> compute -> render HTML ──────
function synthHourly(startDate, days) {
  const H = {};
  const cols = ['cloud_cover','cloud_cover_low','cloud_cover_mid','cloud_cover_high','temperature_2m',
    'relative_humidity_2m','wind_speed_10m','dew_point_2m','precipitation_probability',
    'wind_speed_250hPa','wind_speed_500hPa','wind_speed_850hPa','wind_speed_1000hPa',
    'wind_direction_250hPa','wind_direction_500hPa','wind_direction_850hPa','wind_direction_1000hPa',
    'temperature_250hPa','temperature_500hPa','temperature_850hPa','temperature_1000hPa',
    'geopotential_height_250hPa','geopotential_height_500hPa','geopotential_height_850hPa','geopotential_height_1000hPa',
    'relative_humidity_500hPa','cape'];
  H.time = [];
  for (const c of cols) H[c] = [];
  const start = new Date(startDate); start.setHours(0,0,0,0);
  const pad = n => String(n).padStart(2,'0');
  const vals = { cloud_cover:20, cloud_cover_low:10, cloud_cover_mid:10, cloud_cover_high:10,
    temperature_2m:15, relative_humidity_2m:60, wind_speed_10m:10, dew_point_2m:8, precipitation_probability:5,
    wind_speed_250hPa:80, wind_speed_500hPa:50, wind_speed_850hPa:20, wind_speed_1000hPa:10,
    wind_direction_250hPa:270, wind_direction_500hPa:260, wind_direction_850hPa:250, wind_direction_1000hPa:240,
    temperature_250hPa:-45, temperature_500hPa:-20, temperature_850hPa:5, temperature_1000hPa:14,
    geopotential_height_250hPa:10500, geopotential_height_500hPa:5500, geopotential_height_850hPa:1400, geopotential_height_1000hPa:100,
    relative_humidity_500hPa:40, cape:100 };
  for (let h = 0; h < days*24; h++) {
    const d = new Date(start.getTime() + h*3600000);
    H.time.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`);
    for (const c of cols) H[c].push(vals[c]);
  }
  return { hourly: H };
}

sandbox.__synth = synthHourly(new Date(), 3);
const allHours = vm.runInContext('parseForecast(__synth)', sandbox);
sandbox.__allHours = allHours;
const nightHrs = vm.runInContext('getForecastNightHours(__allHours)', sandbox);
sandbox.__nightHrs = nightHrs;
check('Pipeline: getForecastNightHours non-empty', nightHrs.length > 0, `count=${nightHrs.length}`);
check('Pipeline: getTomorrowNightHours non-empty',
  vm.runInContext('getTomorrowNightHours(__allHours).length', sandbox) > 0);

const pOutlook = vm.runInContext('getOutlook(__nightHrs)', sandbox);
const pSeeing = vm.runInContext('computeSeeing(__nightHrs)', sandbox);
const pTransp = vm.runInContext('computeTransparency(__nightHrs)', sandbox);
const pDew = vm.runInContext('getDewRisk(__nightHrs)', sandbox);
const pPeak = vm.runInContext(`forecastMax(__nightHrs, 'precip_prob')`, sandbox);
check('Pipeline: outlook/seeing/transparency/dew all compute',
  !!pOutlook.label && pSeeing.hasUpperAir === true && !!pTransp.label && !!pDew.label,
  JSON.stringify({ pOutlook, pSeeing, pTransp, pDew }));
check('Pipeline: dew uses min spread (15-8=7C -> Low)', pDew.label === 'Low' && pDew.text.includes('7.0'), JSON.stringify(pDew));

const outlookHtml = vm.runInContext(
  `buildOutlookHTML(${JSON.stringify(pOutlook)}, {tcdc:20,tmp:15,rh:60,wspd:10}, 'EDT', __nightHrs)`, sandbox);
check('HTML: Outlook card emits real window label + info panel',
  /Tonight's Outlook · \d{2}:\d{2}–\d{2}:\d{2} EDT/.test(outlookHtml) &&
  outlookHtml.includes(`aria-controls="outlookInfo"`) &&
  /<div class="fc-info-panel" id="outlookInfo" hidden>/.test(outlookHtml),
  outlookHtml.match(/Tonight's Outlook.*?<\/div>/)?.[0]);
const astroHtml = vm.runInContext(
  `buildAstroConditionsHTML(${JSON.stringify(pSeeing)}, ${JSON.stringify(pTransp)}, ${JSON.stringify(pDew)}, ${pPeak})`, sandbox);
check('HTML: Astronomy card shows peak precip + info panel',
  astroHtml.includes('peak tonight') && astroHtml.includes(`aria-controls="astroInfo"`) &&
  /<div class="fc-info-panel" id="astroInfo" hidden>/.test(astroHtml));

// ── fcToggleInfo against a stubbed DOM (keep last — replaces document stubs) ──
const fakePanel = {
  attrs: { hidden: '' },
  hasAttribute(n) { return n in this.attrs; },
  removeAttribute(n) { delete this.attrs[n]; },
  setAttribute(n, v) { this.attrs[n] = v; },
};
const fakeBtn = { attrs: { 'aria-expanded': 'false' }, setAttribute(n, v) { this.attrs[n] = v; } };
sandbox.document.getElementById = (id) => id === 'outlookInfo' ? fakePanel : null;
sandbox.document.querySelector = (sel) => sel.includes('outlookInfo') ? fakeBtn : null;
vm.runInContext(`fcToggleInfo('outlookInfo')`, sandbox);
check('InfoBtn: first toggle opens panel + aria-expanded=true',
  !('hidden' in fakePanel.attrs) && fakeBtn.attrs['aria-expanded'] === 'true');
vm.runInContext(`fcToggleInfo('outlookInfo')`, sandbox);
check('InfoBtn: second toggle closes panel + aria-expanded=false',
  ('hidden' in fakePanel.attrs) && fakeBtn.attrs['aria-expanded'] === 'false');
vm.runInContext(`fcToggleInfo('missingPanel')`, sandbox); // must not throw
check('InfoBtn: missing panel id is a no-op', true);

// ── Report ──────────────────────────────────────────────────────────────
let failCount = 0;
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'} - ${r.name}${r.pass ? '' : ' :: ' + (r.detail || '')}`);
  if (!r.pass) failCount++;
}
console.log(`\n${results.length - failCount}/${results.length} checks passed.`);
process.exit(failCount ? 1 : 0);
