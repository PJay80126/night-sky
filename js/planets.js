// ═══════════════════════════════════════════════════════════════════════════
// Night Sky Observer — planets.js
// Planet data, astronomy helpers, render, altitude graph
// ═══════════════════════════════════════════════════════════════════════════


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


// ── Planets tab render ──────────────────────────────────────────────────

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
