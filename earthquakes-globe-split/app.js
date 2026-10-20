const FEED = (mag, period) => `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${mag}_${period}.geojson`;
const PLATES_URL = 'https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json';
const IMG = 'https://unpkg.com/three-globe@2.31.0/example/img/';
const ISRAEL = [31.77, 35.21]; // Jerusalem
const REFRESH_SEC = 60;
const MAX_ROWS = 300;
const MERGE_ABOVE = 2500; // above this many points, merge geometry for speed (no hover)

const state = {
  features: [], seen: new Set(), newIds: new Map(), first: true,
  period: 'day', minmag: '2.5', colorMode: 'mag', sort: 'time',
  selectedId: null, pings: [], view: 'list'
};

// ---------- helpers ----------
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const MAG_CLASSES = [
  { max: 2.5, label: 'זעירה (מתחת ל-2.5)', v: '--m1' },
  { max: 4.5, label: 'קלה (2.5–4.4)', v: '--m2' },
  { max: 6, label: 'בינונית (4.5–5.9)', v: '--m3' },
  { max: 7, label: 'חזקה (6–6.9)', v: '--m4' },
  { max: Infinity, label: 'חזקה מאוד (7+)', v: '--m5' },
];
const DEPTH_CLASSES = [
  { max: 70, label: 'רדודה (0–70 ק"מ)', short: 'רדודה', v: '--d1' },
  { max: 300, label: 'בינונית (70–300)', short: 'בינונית', v: '--d2' },
  { max: Infinity, label: 'עמוקה (300+)', short: 'עמוקה', v: '--d3' },
];
const magIdx = m => MAG_CLASSES.findIndex(c => (m ?? 0) < c.max);
const depthIdx = d => DEPTH_CLASSES.findIndex(c => (d ?? 0) < c.max);
const magColor = m => css(MAG_CLASSES[magIdx(m)].v);
const depthColor = d => css(DEPTH_CLASSES[depthIdx(d)].v);
const pointColor = f => state.colorMode === 'mag' ? magColor(f.properties.mag) : depthColor(f.geometry.coordinates[2]);
const fmtMag = m => (m == null ? '?' : m.toFixed(1));
const magBadge = (m, sm) => `<span class="mag${sm ? ' sm' : ''}" style="background:${magColor(m)};color:${magColor(m)}"><span>${fmtMag(m)}</span></span>`;
const lat = f => f.geometry.coordinates[1], lng = f => f.geometry.coordinates[0];

function distKm([lat1, lon1], [lat2, lon2]) {
  const r = Math.PI / 180, a = Math.sin((lat2 - lat1) * r / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}
const dIsr = f => distKm(ISRAEL, [lat(f), lng(f)]);
const fmtTime = ms => new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ms);
function ago(ms) {
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return 'לפני פחות מדקה';
  const m = Math.round(s / 60); if (m < 60) return `לפני ${m} דק'`;
  const h = Math.round(m / 60); if (h < 24) return `לפני ${h} שע'`;
  return `לפני ${Math.round(h / 24)} ימים`;
}
function hexToRgb(hex) { const n = parseInt(hex.replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }

// Region name (in Hebrew when known) from USGS "place" text
const US_STATES = { CA: 'California', AK: 'Alaska', HI: 'Hawaii', NV: 'Nevada', WA: 'Washington', OR: 'Oregon', UT: 'Utah', MT: 'Montana', ID: 'Idaho', WY: 'Wyoming', TX: 'Texas', OK: 'Oklahoma', NM: 'New Mexico', AZ: 'Arizona', CO: 'Colorado', KS: 'Kansas', TN: 'Tennessee', MO: 'Missouri', AR: 'Arkansas', SC: 'South Carolina' };
const HE = { 'Japan': 'יפן', 'Indonesia': 'אינדונזיה', 'Chile': "צ'ילה", 'Alaska': 'אלסקה', 'California': 'קליפורניה', 'Hawaii': 'הוואי', 'Turkey': 'טורקיה', 'Türkiye': 'טורקיה', 'Greece': 'יוון', 'Italy': 'איטליה', 'Iran': 'איראן', 'Mexico': 'מקסיקו', 'Peru': 'פרו', 'Philippines': 'הפיליפינים', 'Papua New Guinea': 'פפואה גינאה החדשה', 'Tonga': 'טונגה', 'Fiji': "פיג'י", 'New Zealand': 'ניו זילנד', 'Taiwan': 'טייוואן', 'China': 'סין', 'Puerto Rico': 'פוארטו ריקו', 'Nevada': 'נבדה', 'Argentina': 'ארגנטינה', 'Vanuatu': 'ונואטו', 'Russia': 'רוסיה', 'Afghanistan': 'אפגניסטן', 'Pakistan': 'פקיסטן', 'India': 'הודו', 'Nepal': 'נפאל', 'Israel': 'ישראל', 'Cyprus': 'קפריסין', 'Egypt': 'מצרים', 'Jordan': 'ירדן', 'Syria': 'סוריה', 'Lebanon': 'לבנון', 'Saudi Arabia': 'ערב הסעודית', 'Ecuador': 'אקוודור', 'Colombia': 'קולומביה', 'Guatemala': 'גואטמלה', 'El Salvador': 'אל סלבדור', 'Nicaragua': 'ניקרגואה', 'Costa Rica': 'קוסטה ריקה', 'Panama': 'פנמה', 'Bolivia': 'בוליביה', 'Solomon Islands': 'איי שלמה', 'Iceland': 'איסלנד', 'Washington': 'וושינגטון', 'Oregon': 'אורגון', 'Utah': 'יוטה', 'Montana': 'מונטנה', 'Texas': 'טקסס', 'Oklahoma': 'אוקלהומה', 'Idaho': 'איידהו', 'Wyoming': 'ויומינג', 'Kermadec Islands': 'איי קרמדק', 'Mid-Atlantic Ridge': 'הרכס המרכז-אטלנטי', 'Canada': 'קנדה', 'Myanmar': 'מיאנמר', 'Tajikistan': "טג'יקיסטן", 'Kyrgyzstan': 'קירגיזסטן', 'Kazakhstan': 'קזחסטן', 'Albania': 'אלבניה', 'Croatia': 'קרואטיה', 'Romania': 'רומניה', 'Spain': 'ספרד', 'Portugal': 'פורטוגל', 'Morocco': 'מרוקו', 'Algeria': "אלג'יריה", 'Ethiopia': 'אתיופיה', 'Dominican Republic': 'הרפובליקה הדומיניקנית', 'Haiti': 'האיטי', 'Cuba': 'קובה', 'Venezuela': 'ונצואלה', 'South Sandwich Islands': "איי סנדוויץ' הדרומיים", 'Northern Mariana Islands': 'איי מריאנה הצפוניים', 'Guam': 'גואם', 'Samoa': 'סמואה', 'American Samoa': 'סמואה האמריקנית', 'Timor Leste': 'מזרח טימור', 'Kuril Islands': 'איי קוריל', 'Aleutian Islands': 'איי אלאוטיים', 'New Mexico': 'ניו מקסיקו', 'Arizona': 'אריזונה', 'Colorado': 'קולורדו', 'Kansas': 'קנזס', 'U.S. Virgin Islands': 'איי הבתולה (ארה"ב)', 'British Virgin Islands': 'איי הבתולה הבריטיים' };
function regionOf(place) {
  if (!place) return 'לא ידוע';
  let r = place.includes(',') ? place.split(',').pop().trim() : place.replace(/^.*\bof\s+(the\s+)?/i, '').replace(/\s+region$/i, '').trim();
  if (US_STATES[r]) r = US_STATES[r];
  if (/^B\.?C\.?$/.test(r)) r = 'Canada';
  if (HE[r]) return HE[r];
  for (const k of Object.keys(HE)) if (r.endsWith(' ' + k) || r.startsWith(k + ' ')) return HE[k];
  return r;
}

// ---------- globe ----------
const SKINS = { day: IMG + 'earth-blue-marble.jpg', night: IMG + 'earth-night.jpg' };
const globe = new Globe($('globe'), { rendererConfig: { antialias: true, alpha: false } })
  .globeImageUrl(SKINS.day)
  .bumpImageUrl(IMG + 'earth-topology.png')
  .backgroundImageUrl(IMG + 'night-sky.png')
  .showAtmosphere(true).atmosphereColor('#7cc4ff').atmosphereAltitude(0.2)
  .pointLat(lat).pointLng(lng)
  .pointColor(pointColor)
  .pointRadius(f => 0.18 + Math.max(f.properties.mag ?? 0, 0) * 0.07)
  .pointResolution(10)
  .pointsTransitionDuration(700)
  .pointLabel(f => tipHtml(f))
  .onPointClick(f => select(f.id, true))
  .onPointHover(f => { $('globe').style.cursor = f ? 'pointer' : ''; })
  .ringLat(d => d.lat).ringLng(d => d.lng)
  .ringColor(d => { const [r, g, b] = hexToRgb(d.color); return t => `rgba(${r},${g},${b},${1 - t})`; })
  .ringMaxRadius(d => d.maxR).ringPropagationSpeed(d => d.speed).ringRepeatPeriod(d => d.period)
  .pathPoints(f => f.geometry.coordinates).pathPointLat(p => p[1]).pathPointLng(p => p[0])
  .pathPointAlt(0.002).pathColor(() => css('--plate')).pathTransitionDuration(0)
  .onGlobeReady(() => setTimeout(() => $('loading').classList.add('done'), 300));

setPointAltitude();
globe.pointOfView({ lat: 25, lng: 35, altitude: 2.4 }, 0);
const controls = globe.controls();
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;
controls.addEventListener('start', () => setRotate(false));

// Keep the globe centred in the space left of the rail and the open drawer
function resize() {
  globe.width(window.innerWidth).height(window.innerHeight);
  const wide = window.innerWidth > 820, open = !$('drawer').classList.contains('closed');
  const covered = wide ? 72 + (open ? $('drawer').offsetWidth + 12 : 0) : 0;
  globe.globeOffset([-covered / 2, 0]);
}
window.addEventListener('resize', resize); resize();

let plateData = [];
fetch(PLATES_URL).then(r => r.json()).then(d => { plateData = d.features; drawPlates(); }).catch(() => console.warn('plate boundaries failed to load'));
function drawPlates() { globe.pathsData($('plates').checked ? plateData : []); }

function setPointAltitude() {
  globe.pointAltitude($('bars3d').checked ? f => 0.004 + Math.pow(Math.max(f.properties.mag ?? 0, 0), 2) * 0.0045 : 0.003);
}

function tipHtml(f) {
  const p = f.properties, depth = f.geometry.coordinates[2];
  return `<div class="tip"><b>${fmtMag(p.mag)} · ${esc(regionOf(p.place))}</b><br>
    <span style="color:#9aa0a6">${ago(p.time)} · עומק ${depth.toFixed(0)} ק"מ (${DEPTH_CLASSES[depthIdx(depth)].short})</span><br>
    <span style="color:#9aa0a6">${Math.round(dIsr(f)).toLocaleString('he-IL')} ק"מ מירושלים</span>
    ${p.tsunami ? '<br>🌊 <b>דגל צונאמי – בדקו הודעות רשמיות</b>' : ''}</div>`;
}

function drawPoints() {
  const merge = state.features.length > MERGE_ABOVE;
  globe.pointsMerge(merge).pointsData(state.features);
  $('listNote').textContent = merge ? 'יש הרבה רעידות, ולכן כדי שהגלובוס ירוץ חלק מושבתות הלחיצה והריחוף על העמודות. בחרו רעידה מהרשימה.' : '';
}

function drawRings() {
  const now = Date.now();
  state.pings = state.pings.filter(p => now - p.at < 90000);
  const rings = state.pings.map(p => ({ ...p }));
  const sel = state.features.find(f => f.id === state.selectedId);
  if (sel) rings.push({ lat: lat(sel), lng: lng(sel), color: '#8ab4f8', maxR: 4, speed: 2, period: 900 });
  globe.ringsData(rings);
}

function drawLegend() {
  const cls = state.colorMode === 'mag' ? MAG_CLASSES : DEPTH_CLASSES;
  $('legend').innerHTML = `<b>${state.colorMode === 'mag' ? 'מגניטודה' : 'עומק המוקד'}</b>` +
    cls.map(c => `<div><span class="swatch" style="background:${css(c.v)}"></span>${c.label}</div>`).join('') +
    `<div><span class="pl"></span>גבול לוחות</div>`;
}

// ---------- drawer ----------
const TITLES = { list: 'רעידות אדמה', stats: 'נתונים ומגמות', layers: 'שכבות והגדרות', learn: 'פינת הלמידה' };
function openView(v) {
  const drawer = $('drawer');
  if (state.view === v && !drawer.classList.contains('closed')) { closeDrawer(); return; }
  state.view = v;
  drawer.classList.remove('closed');
  drawer.classList.toggle('wide', v === 'learn');
  $('dTitle').textContent = TITLES[v];
  document.querySelectorAll('.view').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
  setRailOn(v);
  resize();
}
function closeDrawer() { $('drawer').classList.add('closed'); setRailOn(null); resize(); }
function setRailOn(v) { document.querySelectorAll('.rail button').forEach(b => b.classList.toggle('on', b.dataset.view === v)); }
document.querySelectorAll('.rail button').forEach(b => b.onclick = () => openView(b.dataset.view));
$('dClose').onclick = closeDrawer;

// ---------- list ----------
function sorted() {
  const arr = [...state.features];
  if (state.sort === 'mag') arr.sort((a, b) => (b.properties.mag ?? -9) - (a.properties.mag ?? -9));
  else if (state.sort === 'israel') arr.sort((a, b) => dIsr(a) - dIsr(b));
  else arr.sort((a, b) => b.properties.time - a.properties.time);
  return arr;
}
function drawList() {
  const arr = sorted(), rows = arr.slice(0, MAX_ROWS);
  $('rows').innerHTML = rows.length ? rows.map(f => {
    const p = f.properties, depth = f.geometry.coordinates[2];
    const isNew = state.newIds.has(f.id) && Date.now() - state.newIds.get(f.id) < 10 * 60000;
    const sub = state.sort === 'israel' ? `${Math.round(dIsr(f)).toLocaleString('he-IL')} ק"מ מירושלים` : `עומק ${depth.toFixed(0)} ק"מ`;
    return `<div class="q${f.id === state.selectedId ? ' sel' : ''}" data-id="${esc(f.id)}">
      ${magBadge(p.mag)}
      <div style="min-width:0"><div class="region">${esc(regionOf(p.place))}${isNew ? '<span class="tag-new">חדש!</span>' : ''}${p.tsunami ? '<span class="tag-ts" title="דגל צונאמי">🌊</span>' : ''}</div>
        <div class="place">${esc(p.place)}</div></div>
      <div class="when">${ago(p.time)}<br>${sub}</div></div>`;
  }).join('') : '<div class="muted small">אין רעידות בטווח שנבחר. נסו טווח זמן ארוך יותר או עוצמה נמוכה יותר בלשונית "שכבות".</div>';
  if (!$('listNote').textContent && arr.length > MAX_ROWS) $('listNote').textContent = `מוצגות ${MAX_ROWS} מתוך ${arr.length.toLocaleString('he-IL')} (כולן מופיעות על הגלובוס)`;
}
$('rows').addEventListener('click', e => { const q = e.target.closest('.q[data-id]'); if (q) select(q.dataset.id, true); });
document.querySelectorAll('#sortbar .pill').forEach(b => b.onclick = () => {
  document.querySelectorAll('#sortbar .pill').forEach(x => x.classList.toggle('on', x === b));
  state.sort = b.dataset.sort; drawList();
});

function select(id, fly) {
  const f = state.features.find(x => x.id === id);
  if (!f) return;
  state.selectedId = id;
  setRotate(false);
  if (fly) globe.pointOfView({ lat: lat(f), lng: lng(f), altitude: 0.9 }, 1600);
  drawRings();
  if ($('drawer').classList.contains('closed') || state.view !== 'list') openView('list');
  document.querySelectorAll('#rows .q').forEach(q => q.classList.toggle('sel', q.dataset.id === id));
  const el = document.querySelector(`#rows .q[data-id="${CSS.escape(id)}"]`);
  if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ---------- stats ----------
function bars(el, rows) {
  const max = Math.max(1, ...rows.map(r => r.n));
  $(el).innerHTML = rows.map(r => `<div class="bar-row"><span>${esc(r.label)}</span>
    <div class="bar-track"><div class="bar" style="width:${(r.n / max * 100).toFixed(1)}%;background:${r.color}"></div></div>
    <span class="bar-n">${r.n.toLocaleString('he-IL')}</span></div>`).join('');
}
const PERIOD_TXT = { hour: 'בשעה האחרונה', day: 'ב-24 השעות האחרונות', week: 'בשבוע האחרון', month: 'בחודש האחרון' };
function drawStats() {
  const fs = state.features, n = fs.length;
  const strongest = fs.reduce((a, b) => (b.properties.mag ?? -9) > (a?.properties.mag ?? -9) ? b : a, null);
  const nearest = fs.reduce((a, b) => !a || dIsr(b) < dIsr(a) ? b : a, null);
  const shallow = fs.filter(f => f.geometry.coordinates[2] < 70).length;
  const tsunami = fs.filter(f => f.properties.tsunami).length;
  const card = (k, v, s) => `<div class="card"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  $('cards').innerHTML =
    card('מספר רעידות', n.toLocaleString('he-IL'), PERIOD_TXT[state.period]) +
    card('החזקה ביותר', strongest ? fmtMag(strongest.properties.mag) : '—', strongest ? esc(regionOf(strongest.properties.place)) : '') +
    card('הקרובה לישראל', nearest ? Math.round(dIsr(nearest)).toLocaleString('he-IL') + ' <span style="font-size:.9rem">ק"מ</span>' : '—', nearest ? `${esc(regionOf(nearest.properties.place))} · ${fmtMag(nearest.properties.mag)}` : '') +
    card('רעידות רדודות', n ? Math.round(shallow / n * 100) + '%' : '—', 'עומק של פחות מ-70 ק"מ') +
    card('דגלי צונאמי', tsunami, tsunami ? 'בדקו הודעות רשמיות' : 'אין בטווח שנבחר') +
    card('הממוצע לשעה', n ? (n / { hour: 1, day: 24, week: 168, month: 720 }[state.period]).toFixed(1) : '—', 'רעידות בשעה');
  bars('chMag', MAG_CLASSES.map((c, i) => ({ label: c.label, n: fs.filter(f => magIdx(f.properties.mag) === i).length, color: css(c.v) })));
  bars('chDepth', DEPTH_CLASSES.map((c, i) => ({ label: c.label, n: fs.filter(f => depthIdx(f.geometry.coordinates[2]) === i).length, color: css(c.v) })));
  const counts = {};
  fs.forEach(f => { const r = regionOf(f.properties.place); counts[r] = (counts[r] || 0) + 1; });
  bars('chRegion', Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, n]) => ({ label, n, color: css('--accent') })));

  $('topChipText').textContent = strongest ? `החזקה: ${fmtMag(strongest.properties.mag)} · ${regionOf(strongest.properties.place)}` : '—';
  $('topChip').onclick = () => strongest && select(strongest.id, true);
}

// ---------- new-quake banners ----------
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(), o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880; g.gain.setValueAtTime(.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .5);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + .5);
  } catch (e) { }
}
function toast(f, demo = false) {
  const p = f.properties, depth = f.geometry.coordinates[2], color = magColor(p.mag);
  const el = document.createElement('div');
  el.className = 'toast glass';
  el.style.setProperty('--c', color);
  el.innerHTML = `<button class="icon-btn close" aria-label="סגירה"><span class="ms" style="font-size:18px">close</span></button>
    <div class="t-title"><span class="ms" style="font-size:18px">notifications_active</span>${demo ? 'הדגמה: ' : ''}רעידת אדמה חדשה!</div>
    <div class="t-body">${magBadge(p.mag)}<div><div class="region">${esc(regionOf(p.place))}</div>
    <div class="muted small">${ago(p.time)} · עומק ${depth.toFixed(0)} ק"מ</div>
    <div class="small" style="color:var(--accent);margin-top:2px">לחצו כדי לטוס לרעידה ←</div></div></div>
    <div class="bar-life"></div>`;
  el.querySelector('.close').onclick = e => { e.stopPropagation(); el.remove(); };
  el.onclick = () => { select(f.id, true); el.remove(); };
  const box = $('toasts');
  box.prepend(el);
  while (box.children.length > 4) box.lastChild.remove();
  setTimeout(() => el.remove(), 20000);
  state.pings.push({ lat: lat(f), lng: lng(f), color, maxR: 3 + Math.max(p.mag ?? 0, 0) * 1.2, speed: 3, period: 1100, at: Date.now() });
  drawRings();
  if ($('sound').checked) beep();
}
$('demoToast').onclick = () => {
  const latest = [...state.features].sort((a, b) => b.properties.time - a.properties.time)[0];
  if (latest) toast(latest, true);
};

// ---------- data loading ----------
let countdown = REFRESH_SEC, lastOk = null;
async function load() {
  countdown = REFRESH_SEC;
  try {
    const res = await fetch(FEED(state.minmag, state.period), { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    // USGS also lists quarry blasts and explosions; keep only earthquakes
    const fresh = data.features.filter(f => f.properties.type === 'earthquake');
    if (!state.first) {
      fresh.filter(f => !state.seen.has(f.id)).sort((a, b) => a.properties.time - b.properties.time).forEach(f => {
        state.newIds.set(f.id, Date.now());
        setTimeout(() => toast(f), 50);
      });
    }
    fresh.forEach(f => state.seen.add(f.id));
    state.features = fresh;
    state.first = false;
    lastOk = Date.now();
    $('liveDot').classList.remove('err');
    drawPoints(); drawList(); drawStats(); drawRings();
  } catch (e) {
    $('liveDot').classList.add('err');
    $('liveText').textContent = 'אין חיבור לנתונים – מנסה שוב בעוד דקה';
  }
}
function resetAndLoad() { state.first = true; state.seen.clear(); state.newIds.clear(); state.selectedId = null; state.pings = []; load(); }

setInterval(() => {
  countdown--;
  if (countdown <= 0) load();
  const t = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  $('clock').textContent = 'שעון ישראל ' + t.format(Date.now());
  if (lastOk && !$('liveDot').classList.contains('err'))
    $('liveText').textContent = `חי · רענון בעוד ${countdown} שנ'`;
}, 1000);

// ---------- settings wiring ----------
document.querySelectorAll('.opts').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('.opt'); if (!b) return;
  g.querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === b));
  const v = b.dataset.v;
  switch (g.dataset.name) {
    case 'period': state.period = v; resetAndLoad(); break;
    case 'minmag': state.minmag = v; resetAndLoad(); break;
    case 'color': state.colorMode = v; globe.pointColor(pointColor); drawLegend(); break;
    case 'skin': globe.globeImageUrl(SKINS[v]); break;
  }
}));
$('plates').onchange = drawPlates;
$('bars3d').onchange = setPointAltitude;
$('rotate').onchange = e => setRotate(e.target.checked);
function setRotate(on) {
  controls.autoRotate = on;
  $('rotate').checked = on;
  $('rotateBtn').classList.toggle('on', on);
}
$('rotateBtn').onclick = () => setRotate(!controls.autoRotate);
const zoom = k => { const p = globe.pointOfView(); globe.pointOfView({ ...p, altitude: Math.min(Math.max(p.altitude * k, 0.15), 5) }, 500); };
$('zoomIn').onclick = () => zoom(0.6);
$('zoomOut').onclick = () => zoom(1 / 0.6);
$('viewWorld').onclick = () => globe.pointOfView({ lat: 20, lng: 35, altitude: 2.4 }, 1500);
$('viewIsrael').onclick = () => { setRotate(false); globe.pointOfView({ lat: 31.5, lng: 35, altitude: 0.45 }, 1800); };

document.querySelectorAll('#chips .pill').forEach(b => b.onclick = () => {
  document.querySelectorAll('#chips .pill').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.lesson').forEach(l => l.classList.toggle('on', l.id === b.dataset.l));
});
function calc() {
  const a = parseFloat($('cA').value), b = parseFloat($('cB').value);
  if (isNaN(a) || isNaN(b)) { $('cRes').textContent = '—'; return; }
  const r = Math.pow(10, 1.5 * (a - b));
  $('cRes').textContent = r >= 1 ? Math.round(r).toLocaleString('he-IL') : r.toPrecision(2);
}
$('cA').oninput = $('cB').oninput = calc;
calc();
drawLegend();
if (window.innerWidth <= 820) closeDrawer(); // on phones start with the globe visible
load();
// fallback in case onGlobeReady never fires (e.g. texture blocked)
setTimeout(() => $('loading').classList.add('done'), 8000);
