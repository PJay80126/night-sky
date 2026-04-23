// ═══════════════════════════════════════════════════════════════════════════
// Night Sky Observer — forecast.js
// Forecast tab: fetch, parse, charts, render
// ═══════════════════════════════════════════════════════════════════════════


// Surface-level variables used by every model path.
const _SURFACE_VARS = [
  'cloud_cover','cloud_cover_low','cloud_cover_mid','cloud_cover_high',
  'temperature_2m','relative_humidity_2m','wind_speed_10m',
  'dew_point_2m','precipitation_probability',
];
// Upper-air variables needed for Richardson-Number seeing. HRDPS only.
const _UPPER_AIR_VARS = [
  // Winds at four pressure levels (speed + direction)
  'wind_speed_250hPa','wind_speed_500hPa','wind_speed_850hPa','wind_speed_1000hPa',
  'wind_direction_250hPa','wind_direction_500hPa','wind_direction_850hPa','wind_direction_1000hPa',
  // Temperatures at all four levels (need 250 and 1000 for end-of-column Ri pairs)
  'temperature_250hPa','temperature_500hPa','temperature_850hPa','temperature_1000hPa',
  // Geopotential heights — real layer thicknesses, not standard-atmosphere estimates
  'geopotential_height_250hPa','geopotential_height_500hPa','geopotential_height_850hPa','geopotential_height_1000hPa',
  // Still used by transparency scoring
  'relative_humidity_500hPa','cape',
];

async function fetchForecast(lat, lon) {
  const base = `https://api.open-meteo.com/v1/forecast`
    + `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`
    + `&forecast_days=3&timezone=auto`;

  // Try HRDPS first — 2.5 km Canadian high-res model, gives us pressure-level data
  // for a proper Clear-Sky-Chart-style seeing score.
  try {
    const vars = [..._SURFACE_VARS, ..._UPPER_AIR_VARS].join(',');
    const resp = await fetch(`${base}&hourly=${vars}&models=gem_hrdps_continental`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.hourly && data.hourly.time && _hasPressureData(data.hourly)) {
        data._model    = 'HRDPS (2.5 km)';
        data._highRes  = true;
        return data;
      }
    }
  } catch (e) {
    // network/parse error — fall through to global fallback
  }

  // Fallback: GEM seamless (global). No pressure-level data — seeing/transparency
  // will degrade to a surface-only estimate.
  const resp = await fetch(`${base}&hourly=${_SURFACE_VARS.join(',')}&models=gem_seamless`);
  if (!resp.ok) throw new Error(`Open-Meteo returned HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data.hourly || !data.hourly.time) throw new Error('Unexpected response from Open-Meteo.');
  data._model   = 'GEM Seamless';
  data._highRes = false;
  return data;
}

function _hasPressureData(hourly) {
  const jet = hourly.wind_speed_250hPa;
  return Array.isArray(jet) && jet.some(v => v !== null && v !== undefined);
}

function parseForecast(data) {
  const h = data.hourly;
  const get = (key, i) => (h[key] ? h[key][i] : null);
  return h.time.map((t, i) => ({
    time:        new Date(t),
    localHour:   parseInt(t.slice(11, 13), 10),
    localDate:   t.slice(0, 10),
    tcdc:        get('cloud_cover', i),
    lcdc:        get('cloud_cover_low', i),
    mcdc:        get('cloud_cover_mid', i),
    hcdc:        get('cloud_cover_high', i),
    tmp:         get('temperature_2m', i),
    dewp:        get('dew_point_2m', i),
    rh:          get('relative_humidity_2m', i),
    wspd:        get('wind_speed_10m', i),
    precip_prob: get('precipitation_probability', i),
    // HRDPS pressure-level fields — null when in fallback mode.
    // Winds in km/h, temperatures in °C, RH in %.
    wind250:     get('wind_speed_250hPa', i),
    wind500:     get('wind_speed_500hPa', i),
    wind850:     get('wind_speed_850hPa', i),
    temp500:     get('temperature_500hPa', i),
    temp850:     get('temperature_850hPa', i),
    rh500:       get('relative_humidity_500hPa', i),
    cape:        get('cape', i),
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

// ── Atmospheric stability scoring ───────────────────────────────────────
// Clear-Sky-Chart-style weighting (Rahill/CMC convention):
//   Seeing       = 50% jet stream (250hPa) + 15% mid wind (500hPa)
//                + 20% lapse rate (850-500hPa) + 15% surface wind
//   Transparency = 40% mid-atmos RH (500hPa) + 35% low/mid cloud
//                + 25% surface dew-point spread
// All scores on a 0-100 scale (higher = better). Null inputs are skipped
// via _weightedScore so the model degrades gracefully when HRDPS is
// unavailable and only surface data is present.

function _scoreJetWind(kmh) {
  if (kmh == null) return null;
  // Thresholds in knots: <20 excellent, <30 good, <50 avg, <80 poor, else very poor.
  if (kmh < 37)  return 100;  // <20 kt
  if (kmh < 56)  return 80;   // <30 kt
  if (kmh < 93)  return 60;   // <50 kt
  if (kmh < 148) return 40;   // <80 kt
  return 20;
}

function _scoreMidWind(kmh) {
  if (kmh == null) return null;
  if (kmh < 30) return 100;
  if (kmh < 55) return 75;
  if (kmh < 80) return 50;
  return 25;
}

function _scoreLapseRate(t850, t500) {
  if (t850 == null || t500 == null) return null;
  // Altitude delta 850hPa→500hPa ≈ 4.1 km. Standard atmos = 6.5°C/km, dry
  // adiabatic = 9.8°C/km. Steeper lapse = more convective turbulence aloft.
  const lapse = (t850 - t500) / 4.1;
  if (lapse < 5) return 100;
  if (lapse < 7) return 70;
  if (lapse < 9) return 40;
  return 20;
}

function _scoreSurfaceWind(kmh) {
  if (kmh == null) return null;
  if (kmh < 11) return 100;  // <3 m/s
  if (kmh < 18) return 80;   // <5 m/s
  if (kmh < 29) return 50;   // <8 m/s
  return 30;
}

function _scoreMidRH(pct) {
  if (pct == null) return null;
  if (pct < 30) return 100;
  if (pct < 50) return 80;
  if (pct < 70) return 50;
  if (pct < 90) return 25;
  return 10;
}

function _scoreCloud(lowMidPct) {
  if (lowMidPct == null) return null;
  if (lowMidPct < 20) return 100;
  if (lowMidPct < 40) return 75;
  if (lowMidPct < 60) return 50;
  if (lowMidPct < 80) return 30;
  return 10;
}

function _scoreDewSpread(deltaC) {
  if (deltaC == null) return null;
  if (deltaC > 10) return 100;
  if (deltaC > 5)  return 75;
  if (deltaC > 3)  return 50;
  if (deltaC > 1)  return 30;
  return 10;
}

function _weightedScore(entries) {
  const valid = entries.filter(e => e.score != null);
  if (!valid.length) return null;
  const totalW = valid.reduce((s, e) => s + e.weight, 0);
  return valid.reduce((s, e) => s + e.score * e.weight, 0) / totalW;
}

function _scoreBucket(score) {
  if (score == null)   return { label:'Unknown',   cls:'warn' };
  if (score >= 85)     return { label:'Excellent', cls:'good' };
  if (score >= 70)     return { label:'Good',      cls:'good' };
  if (score >= 50)     return { label:'Fair',      cls:'warn' };
  if (score >= 30)     return { label:'Poor',      cls:'poor' };
  return                    { label:'Very Poor', cls:'poor' };
}

function computeSeeing(nightHrs) {
  const jet   = forecastMedian(nightHrs, 'wind250');
  const mid   = forecastMedian(nightHrs, 'wind500');
  const t850  = forecastMedian(nightHrs, 'temp850');
  const t500  = forecastMedian(nightHrs, 'temp500');
  const sfc   = forecastMedian(nightHrs, 'wspd');

  const score = _weightedScore([
    { score: _scoreJetWind(jet),          weight: 0.50 },
    { score: _scoreMidWind(mid),          weight: 0.15 },
    { score: _scoreLapseRate(t850, t500), weight: 0.20 },
    { score: _scoreSurfaceWind(sfc),      weight: 0.15 },
  ]);

  const bucket = _scoreBucket(score);
  const hasUpperAir = jet != null || mid != null || (t850 != null && t500 != null);

  let text;
  if (score == null) {
    text = 'No data';
  } else if (jet != null) {
    const kt = Math.round(jet / 1.852);
    text = `Jet stream ${kt} kt`;
  } else if (sfc != null) {
    const ms = (sfc / 3.6).toFixed(1);
    text = `Surface wind ${ms} m/s · surface-only`;
  } else {
    text = 'Limited data';
  }
  return { ...bucket, text, score, hasUpperAir };
}

function computeTransparency(nightHrs) {
  const rh500  = forecastMedian(nightHrs, 'rh500');
  const lowCld = forecastMedian(nightHrs, 'lcdc');
  const midCld = forecastMedian(nightHrs, 'mcdc');
  const lowMid = (lowCld != null || midCld != null)
    ? Math.max(lowCld ?? 0, midCld ?? 0)
    : null;
  const tmp    = forecastMedian(nightHrs, 'tmp');
  const dewp   = forecastMedian(nightHrs, 'dewp');
  const spread = (tmp != null && dewp != null) ? (tmp - dewp) : null;

  const score = _weightedScore([
    { score: _scoreMidRH(rh500),      weight: 0.40 },
    { score: _scoreCloud(lowMid),     weight: 0.35 },
    { score: _scoreDewSpread(spread), weight: 0.25 },
  ]);

  const bucket = _scoreBucket(score);

  let text;
  if (score == null) {
    text = 'No data';
  } else if (rh500 != null) {
    text = `Mid-atmos RH ${Math.round(rh500)}%`;
  } else if (spread != null) {
    text = `Dew spread ${spread.toFixed(1)}°C · surface-only`;
  } else {
    text = 'Limited data';
  }
  return { ...bucket, text, score, hasUpperAir: rh500 != null };
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


// ── Forecast rendering helpers ──────────────────────────────────────────

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

/** Builds the "Astronomy Conditions" card HTML — seeing, transparency, dew, precip. */
function buildAstroConditionsHTML(seeing, transparency, dew, precipMed) {
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
          <div class="fc-cond-icon">🔭</div>
          <div class="fc-cond-label">Transparency</div>
          <div class="fc-cond-value">${transparency.text}</div>
          <div class="fc-cond-rating ${transparency.cls}">${transparency.label}</div>
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


// ── renderForecast ──────────────────────────────────────────────────────

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
      const modelName = data._model || 'gem_seamless';
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

      const outlook      = getOutlook(nightHrs);
      const tmrwOutlook  = getOutlook(tmrwHrs);
      const seeing       = computeSeeing(nightHrs);
      const transparency = computeTransparency(nightHrs);
      const dew          = getDewRisk(medians.rh);

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
        buildAstroConditionsHTML(seeing, transparency, dew, precipMed) +
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
