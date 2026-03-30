// ═══════════════════════════════════════════════════════════════════════════
// Night Sky Observer — events.js
// Sky Events tab: computeSkyEvents, loadEvents, filterEvents, visibility
// ═══════════════════════════════════════════════════════════════════════════


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
