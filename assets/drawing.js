/* ===== איורים ב-SVG: רכב, כוחות ואיורי עזר =====
   כל הפונקציות מחזירות מחרוזת SVG. אותו מנוע ציור משמש גם את השיעורים וגם את הסימולטור. */
const COLORS = {
  G: '#33424F', R: '#6250d6', air: '#2a78d6', roll: '#eb6834', slope: '#1baf7a',
  drive: '#16323A', ink: '#1D2A31', muted: '#7D878B', dim: '#2B5C7E'
};

const fmtN = (v, d = 0) => Number(v).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });

function arrowSVG(x1, y1, x2, y2, color, w = 4, head = 13, cls = '') {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  if (len < 3) return '';
  const ux = dx / len, uy = dy / len;
  const h = Math.min(head, len * 0.6);
  const bx = x2 - ux * h, by = y2 - uy * h;
  const px = -uy * h * 0.45, py = ux * h * 0.45;
  return `<g class="${cls}"><line x1="${x1}" y1="${y1}" x2="${bx}" y2="${by}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>` +
    `<polygon points="${x2},${y2} ${bx + px},${by + py} ${bx - px},${by - py}" fill="${color}"/></g>`;
}

function labelSVG(x, y, txt, color, anchor = 'middle', size = 15) {
  if (!txt) return '';
  return `<text x="${x}" y="${y}" fill="${color}" font-family="IBM Plex Mono,Consolas,monospace" font-size="${size}" font-weight="700" text-anchor="${anchor}" paint-order="stroke" stroke="#fff" stroke-width="4" stroke-linejoin="round">${txt}</text>`;
}

function cgMarker(x, y, r = 9) {
  return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#1D2A31" stroke-width="2"/>` +
    `<path d="M${x},${y} L${x + r},${y} A${r},${r} 0 0,1 ${x},${y + r} Z M${x},${y} L${x - r},${y} A${r},${r} 0 0,1 ${x},${y - r} Z" fill="#1D2A31"/></g>`;
}

function wheelSVG(cx, cy, spinDur) {
  const spokes = [0, 72, 144, 216, 288].map(a => {
    const r = a * Math.PI / 180;
    return `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(r) * 19}" y2="${cy + Math.sin(r) * 19}" stroke="#8D979C" stroke-width="3.5" stroke-linecap="round"/>`;
  }).join('');
  const anim = spinDur ? `class="spin" style="animation-duration:${spinDur}s"` : '';
  return `<g><circle cx="${cx}" cy="${cy}" r="34" fill="#22292E"/><circle cx="${cx}" cy="${cy}" r="33" fill="none" stroke="#3A444A" stroke-width="2" stroke-dasharray="3 5"/>` +
    `<circle cx="${cx}" cy="${cy}" r="22" fill="#C9CED1"/><g ${anim}>${spokes}<circle cx="${cx}" cy="${cy}" r="22" fill="none"/></g>` +
    `<circle cx="${cx}" cy="${cy}" r="6" fill="#56636A"/></g>`;
}

function carBody(color = '#5B8C93') {
  return `<path d="M95,182 L95,150 Q98,132 122,128 L192,121 L250,83 Q262,76 282,76 L368,76 Q388,76 404,87 L456,123 L504,131 Q521,135 523,151 L523,182 Q523,192 511,192 L472,192 A42,42 0 0 0 388,192 L214,192 A42,42 0 0 0 130,192 L107,192 Q95,192 95,182 Z" fill="${color}" stroke="#1D2A31" stroke-width="2.2" stroke-linejoin="round"/>` +
    `<path d="M206,121 L254,90 Q262,85 274,85 L318,85 L318,121 Z" fill="#DCEAF0" stroke="#1D2A31" stroke-width="1.8"/>` +
    `<path d="M328,85 L366,85 Q381,85 393,93 L437,121 L328,121 Z" fill="#DCEAF0" stroke="#1D2A31" stroke-width="1.8"/>` +
    `<line x1="323" y1="80" x2="323" y2="186" stroke="#1D2A31" stroke-width="1.4" opacity=".55"/>` +
    `<line x1="200" y1="124" x2="200" y2="186" stroke="#1D2A31" stroke-width="1.4" opacity=".4"/>` +
    `<rect x="283" y="132" width="22" height="5" rx="2.5" fill="#1D2A31" opacity=".6"/><rect x="390" y="132" width="22" height="5" rx="2.5" fill="#1D2A31" opacity=".6"/>` +
    `<path d="M505,138 L520,140 L520,152 L503,150 Z" fill="#F6E7B8" stroke="#1D2A31" stroke-width="1.4"/>` +
    `<rect x="96" y="138" width="9" height="14" rx="2" fill="#C9564A" stroke="#1D2A31" stroke-width="1.2"/>` +
    `<line x1="100" y1="165" x2="520" y2="165" stroke="#fff" stroke-width="1.2" opacity=".25"/>`;
}

/* סצנת הרכב המרכזית
   o.alpha  – זווית שיפוע במעלות (חיובי = עלייה)
   o.aRatio – a/L (מרחק מרכז הכובד מהסרן הקדמי ביחס לבסיס הגלגלים)
   o.show   – אילו כוחות להציג
   o.v      – ערכי הכוחות (ניוטון) לקביעת אורך החיצים
   o.lab    – תוויות טקסט לחיצים
   o.speed  – מהירות (קמ"ש) לאנימציה */
function scene(o = {}) {
  const W = o.w || 640, H = o.h || 360;
  const alpha = o.alpha || 0;
  const th = -alpha * Math.PI / 180;
  const show = Object.assign({ G: false, R: false, dims: false, cg: true, Fa: false, Fr: false, Fs: false, comps: false, Ft: false, wind: false, horizon: true }, o.show || {});
  const v = Object.assign({ G: 12000, Rf: 7200, Rr: 4800, Fa: 900, Fr: 600, Fs: 0, Ft: 0 }, o.v || {});
  const lab = o.lab || {};
  const speed = o.speed || 0;
  const xR = 170, xF = 430, yG = 230, cgY = o.cgY || 150;
  const aR = o.aRatio != null ? o.aRatio : 0.4;
  const xCG = xF - aR * (xF - xR);
  const px = 320, py = o.pivotY || 255;
  const gLen = o.gLen || 105;
  const sc = o.fScale || (1 / 20);
  const maxL = 175;

  const toWorld = (x, y) => {
    const X = x - 300, Y = y - yG;
    return [px + X * Math.cos(th) - Y * Math.sin(th), py + X * Math.sin(th) + Y * Math.cos(th)];
  };
  const tr = `translate(${px},${py}) rotate(${-alpha}) translate(-300,-${yG})`;

  const spinDur = speed > 0 ? Math.max(0.12, Math.min(3, 55 / speed)).toFixed(2) : 0;
  const flowDur = speed > 0 ? Math.max(0.25, Math.min(6, 90 / speed)).toFixed(2) : 0;

  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" direction="ltr" role="img" aria-label="${o.aria || 'איור רכב והכוחות הפועלים עליו'}">`;

  // קו אופק ושיפוע
  if (alpha !== 0 && show.horizon) {
    s += `<line x1="0" y1="${py}" x2="${W}" y2="${py}" stroke="#9AA5A8" stroke-dasharray="6 6" stroke-width="1.3"/>`;
    const r = 215;
    const [ex, ey] = [px - r * Math.cos(th), py - r * Math.sin(th)];
    const sweep = alpha > 0 ? 0 : 1;
    s += `<path d="M${px - r},${py} A${r},${r} 0 0 ${sweep} ${ex},${ey}" fill="none" stroke="#2B5C7E" stroke-width="2"/>`;
    s += labelSVG(px - r - 14, py + (alpha > 0 ? 22 : -10), `α=${Math.abs(alpha).toFixed(1)}°`, '#2B5C7E', 'end', 14);
  }

  s += `<g transform="${tr}">`;
  // כביש
  s += `<rect x="-500" y="${yG}" width="1600" height="400" fill="#D8D2C4"/>`;
  s += `<line x1="-500" y1="${yG}" x2="1100" y2="${yG}" stroke="#6E6A60" stroke-width="3"/>`;
  s += `<line x1="-500" y1="${yG + 9}" x2="1100" y2="${yG + 9}" stroke="#fff" stroke-width="3" stroke-dasharray="30 30" ${flowDur ? `class="flow" style="animation-duration:${flowDur}s"` : ''} opacity=".8"/>`;

  // זרימת אוויר
  if (show.wind) {
    const d = flowDur || 2.2;
    [[70, 470, 680], [100, 520, 700], [128, 530, 720], [160, 535, 690], [55, 300, 700]].forEach(([y, x1, x2], i) => {
      s += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#2a78d6" stroke-width="2" stroke-dasharray="18 22" opacity="${0.35 + 0.1 * (i % 2)}" class="flow" style="animation-duration:${d}s"/>`;
    });
  }

  s += carBody(o.carColor);
  s += wheelSVG(xR, 196, spinDur) + wheelSVG(xF, 196, spinDur);

  // קווי מידה
  if (show.dims) {
    const yd = 38, yd2 = 58;
    const c = COLORS.dim;
    s += `<g stroke="${c}" stroke-width="1.3" fill="none">` +
      `<line x1="${xR}" y1="196" x2="${xR}" y2="${yd - 8}" stroke-dasharray="4 4"/>` +
      `<line x1="${xF}" y1="196" x2="${xF}" y2="${yd - 8}" stroke-dasharray="4 4"/>` +
      `<line x1="${xCG}" y1="${cgY}" x2="${xCG}" y2="${yd2 - 8}" stroke-dasharray="4 4"/></g>`;
    const dimLine = (x1, x2, y, t) => arrowSVG((x1 + x2) / 2, y, x1 + 1, y, c, 1.6, 9) + arrowSVG((x1 + x2) / 2, y, x2 - 1, y, c, 1.6, 9) + labelSVG((x1 + x2) / 2, y - 7, t, c, 'middle', 14);
    s += dimLine(xR, xF, yd, lab.L || 'L');
    s += dimLine(xR, xCG, yd2 + 10, lab.b || 'b');
    s += dimLine(xCG, xF, yd2 + 10, lab.a || 'a');
  }

  // כוחות תגובה (מאונכים לכביש)
  if (show.R) {
    const tot = v.Rf + v.Rr || 1;
    const Gc = v.Gc || tot;
    const lf = gLen * v.Rf / Gc, lr = gLen * v.Rr / Gc;
    s += arrowSVG(xF, yG + lf + 4, xF, yG + 2, COLORS.R, 4.5);
    s += arrowSVG(xR, yG + lr + 4, xR, yG + 2, COLORS.R, 4.5);
    s += labelSVG(xF, yG + Math.max(lf, 30) + 24, lab.Rf || 'R<tspan font-size="11" dy="4">f</tspan>', COLORS.R);
    s += labelSVG(xR, yG + Math.max(lr, 30) + 24, lab.Rr || 'R<tspan font-size="11" dy="4">r</tspan>', COLORS.R);
  }
  // התנגדות לגלגול – בנקודות המגע
  if (show.Fr) {
    const tot = (v.Rf + v.Rr) || 1;
    const lf = Math.min(maxL, v.Fr * sc * v.Rf / tot), lr = Math.min(maxL, v.Fr * sc * v.Rr / tot);
    s += arrowSVG(xF, yG - 5, xF - lf, yG - 5, COLORS.roll, 4);
    s += arrowSVG(xR, yG - 5, xR - lr, yG - 5, COLORS.roll, 4);
    s += labelSVG(xR - Math.max(lr, 20) - 8, yG - 12, lab.Fr || 'F<tspan font-size="11" dy="4">r</tspan>', COLORS.roll, 'end');
  }
  // רכיבי המשקל בשיפוע
  if (show.comps) {
    const a = Math.abs(alpha) * Math.PI / 180;
    const lc = gLen * Math.cos(a), ls = gLen * Math.sin(a) * (alpha >= 0 ? -1 : 1);
    s += `<g opacity=".95">` + arrowSVG(xCG, cgY, xCG, cgY + lc, COLORS.G, 3, 11) + arrowSVG(xCG, cgY, xCG + ls, cgY, COLORS.slope, 4, 12) + `</g>`;
    s += `<polyline points="${xCG + ls},${cgY} ${xCG + ls},${cgY + lc} ${xCG},${cgY + lc}" fill="none" stroke="#9AA5A8" stroke-dasharray="4 4"/>`;
    s += labelSVG(xCG + 12, cgY + lc - 6, lab.Gc || 'G·cosα', COLORS.G, 'start', 14);
    s += labelSVG(xCG + ls - 6, cgY - 12, lab.Gs || 'G·sinα', COLORS.slope, 'end', 14);
  }
  // התנגדות לשיפוע
  if (show.Fs && Math.abs(v.Fs) > 1) {
    const l = Math.min(maxL, Math.abs(v.Fs) * sc) * (v.Fs > 0 ? -1 : 1);
    s += arrowSVG(xCG, cgY - 2, xCG + l, cgY - 2, COLORS.slope, 4.5);
    s += labelSVG(xCG + l + (l < 0 ? -8 : 8), cgY - 10, lab.Fs || 'F<tspan font-size="11" dy="4">s</tspan>', COLORS.slope, l < 0 ? 'end' : 'start');
  }
  // התנגדות האוויר – בחזית הרכב
  if (show.Fa) {
    const l = Math.min(maxL, v.Fa * sc);
    s += arrowSVG(526 + l, 120, 526, 120, COLORS.air, 4.5);
    s += labelSVG(530 + Math.max(l, 30) / 2, 106, lab.Fa || 'F<tspan font-size="11" dy="4">a</tspan>', COLORS.air);
  }
  // כוח הנעה
  if (show.Ft) {
    const l = Math.min(maxL, v.Ft * sc);
    s += arrowSVG(xF, yG + 14, xF + l, yG + 14, COLORS.drive, 5);
    s += labelSVG(xF + l + 8, yG + 20, lab.Ft || 'F<tspan font-size="11" dy="4">t</tspan>', COLORS.drive, 'start');
  }
  if (show.cg) s += cgMarker(xCG, cgY);
  s += `</g>`;

  // משקל – תמיד אנכי כלפי מטה
  if (show.G) {
    const [wx, wy] = toWorld(xCG, cgY);
    s += `<g class="${o.pulseG ? 'pulse' : ''}">` + arrowSVG(wx, wy + 10, wx, wy + gLen, COLORS.G, 5, 15) + `</g>`;
    s += labelSVG(wx - 12, wy + gLen - 8, lab.G || 'G', COLORS.G, 'end', 16);
  }
  s += `</svg>`;
  return s;
}

/* ---------- איורי עזר ---------- */
function vectorFig() {
  return `<svg viewBox="0 0 560 200" direction="ltr" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="560" height="200" fill="#F8F7F3"/>
  <g stroke="#E3DED3">${Array.from({ length: 14 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="200"/>`).join('')}${Array.from({ length: 5 }, (_, i) => `<line x1="0" y1="${i * 40 + 20}" x2="560" y2="${i * 40 + 20}"/>`).join('')}</g>
  <circle cx="110" cy="120" r="8" fill="#C7861F"/>
  ${arrowSVG(110, 120, 420, 120, '#16323A', 6, 22)}
  <line x1="110" y1="150" x2="420" y2="150" stroke="#2B5C7E" stroke-width="1.5"/>
  <line x1="110" y1="143" x2="110" y2="157" stroke="#2B5C7E" stroke-width="1.5"/><line x1="420" y1="143" x2="420" y2="157" stroke="#2B5C7E" stroke-width="1.5"/>
  <text x="265" y="175" text-anchor="middle" font-size="16" fill="#2B5C7E" font-weight="700">גודל – אורך החץ (N)</text>
  <text x="110" y="92" text-anchor="middle" font-size="16" fill="#C7861F" font-weight="700">נקודת פעולה</text>
  <text x="470" y="126" text-anchor="middle" font-size="16" fill="#16323A" font-weight="700">כיוון</text>
  <text x="265" y="104" text-anchor="middle" font-size="22" fill="#16323A" font-weight="700" font-family="IBM Plex Mono,monospace">F</text>
</svg>`;
}

function seesawFig() {
  return `<svg viewBox="0 0 560 230" direction="ltr" xmlns="http://www.w3.org/2000/svg">
  <rect width="560" height="230" fill="#F8F7F3"/>
  <polygon points="280,150 255,200 305,200" fill="#33424F"/>
  <rect x="70" y="140" width="420" height="10" rx="3" fill="#C9A66B" stroke="#7a5f30"/>
  <rect x="100" y="98" width="44" height="42" rx="4" fill="#5B8C93" stroke="#1D2A31"/>
  <text x="122" y="125" text-anchor="middle" fill="#fff" font-weight="700" font-family="IBM Plex Mono,monospace" font-size="13">400N</text>
  <rect x="356" y="86" width="56" height="54" rx="4" fill="#33424F" stroke="#1D2A31"/>
  <text x="384" y="118" text-anchor="middle" fill="#fff" font-weight="700" font-family="IBM Plex Mono,monospace" font-size="13">600N</text>
  ${arrowSVG(122, 60, 122, 96, '#33424F', 3, 10)}${arrowSVG(384, 40, 384, 84, '#33424F', 3, 10)}
  <g stroke="#2B5C7E" stroke-width="1.4">
    <line x1="122" y1="172" x2="280" y2="172"/><line x1="280" y1="172" x2="384" y2="172"/>
    <line x1="122" y1="165" x2="122" y2="179"/><line x1="280" y1="165" x2="280" y2="179"/><line x1="384" y1="165" x2="384" y2="179"/>
  </g>
  <text x="200" y="192" text-anchor="middle" fill="#2B5C7E" font-weight="700" font-family="IBM Plex Mono,monospace" font-size="14">1.5 m</text>
  <text x="332" y="192" text-anchor="middle" fill="#2B5C7E" font-weight="700" font-family="IBM Plex Mono,monospace" font-size="14">1.0 m</text>
  <text x="280" y="222" text-anchor="middle" fill="#1D2A31" font-size="15" font-family="IBM Plex Mono,monospace">400×1.5 = 600 = 600×1.0  ✓</text>
  <text x="280" y="140" text-anchor="middle" fill="#7D878B" font-size="12">ציר</text>
</svg>`;
}

function wrenchFig() {
  return `<svg viewBox="0 0 560 220" direction="ltr" xmlns="http://www.w3.org/2000/svg">
  <rect width="560" height="220" fill="#F8F7F3"/>
  <polygon points="110,95 128,85 146,95 146,115 128,125 110,115" fill="#8D979C" stroke="#1D2A31" stroke-width="2"/>
  <circle cx="128" cy="105" r="30" fill="none" stroke="#56636A" stroke-width="10"/>
  <rect x="150" y="96" width="290" height="18" rx="9" fill="#56636A"/>
  ${arrowSVG(430, 30, 430, 92, '#B8443A', 5, 15)}
  <text x="446" y="50" fill="#B8443A" font-weight="700" font-family="IBM Plex Mono,monospace" font-size="18">F</text>
  <g stroke="#2B5C7E" stroke-width="1.5"><line x1="128" y1="150" x2="430" y2="150"/><line x1="128" y1="142" x2="128" y2="158"/><line x1="430" y1="142" x2="430" y2="158"/><line x1="430" y1="114" x2="430" y2="150" stroke-dasharray="4 4"/></g>
  <text x="280" y="175" text-anchor="middle" fill="#2B5C7E" font-weight="700" font-family="IBM Plex Mono,monospace" font-size="16">d  (זרוע)</text>
  <path d="M86,70 A50,50 0 0 1 170,62" fill="none" stroke="#C7861F" stroke-width="3"/>
  ${arrowSVG(160, 56, 172, 64, '#C7861F', 3, 10)}
  <text x="128" y="45" text-anchor="middle" fill="#C7861F" font-weight="700" font-family="IBM Plex Mono,monospace" font-size="16">M = F·d</text>
</svg>`;
}

function tireFig() {
  const tire = (cx, flat, label, f) => `
    <g><ellipse cx="${cx}" cy="${128 + flat / 2}" rx="${58 + flat / 2}" ry="${58 - flat / 2}" fill="#22292E"/>
    <rect x="${cx - 14 - flat * 2.4}" y="178" width="${28 + flat * 4.8}" height="8" fill="#22292E"/>
    <circle cx="${cx}" cy="${128 + flat / 2}" r="32" fill="#C9CED1"/><circle cx="${cx}" cy="${128 + flat / 2}" r="8" fill="#56636A"/>
    <line x1="${cx - 14 - flat * 2.4}" y1="192" x2="${cx + 14 + flat * 2.4}" y2="192" stroke="#eb6834" stroke-width="5" stroke-linecap="round"/>
    <text x="${cx}" y="215" text-anchor="middle" font-size="15" fill="#1D2A31" font-weight="700">${label}</text>
    <text x="${cx}" y="236" text-anchor="middle" font-size="14" fill="#eb6834" font-family="IBM Plex Mono,monospace" font-weight="700">${f}</text></g>`;
  return `<svg viewBox="0 0 560 250" direction="ltr" xmlns="http://www.w3.org/2000/svg">
  <rect width="560" height="250" fill="#F8F7F3"/>
  <line x1="0" y1="186" x2="560" y2="186" stroke="#6E6A60" stroke-width="3"/>
  ${tire(150, 0, 'לחץ אוויר תקין', 'משטח מגע קטן ← f נמוך')}
  ${tire(410, 14, 'לחץ אוויר נמוך', 'משטח מגע גדול ← f גבוה')}
</svg>`;
}

function slopeTriFig() {
  return `<svg viewBox="0 0 560 240" direction="ltr" xmlns="http://www.w3.org/2000/svg">
  <rect width="560" height="240" fill="#F8F7F3"/>
  <polygon points="60,190 480,190 480,95" fill="#E3EFED" stroke="#1F6F6B" stroke-width="2.5"/>
  <rect x="466" y="176" width="14" height="14" fill="none" stroke="#1F6F6B"/>
  <path d="M140,190 A80,80 0 0 0 138,172" fill="none" stroke="#2B5C7E" stroke-width="2.5"/>
  <text x="152" y="182" fill="#2B5C7E" font-weight="700" font-size="16">α</text>
  <text x="270" y="215" text-anchor="middle" font-size="15" font-weight="700" fill="#1D2A31">מרחק אופקי = 100 m</text>
  <text x="492" y="148" font-size="15" font-weight="700" fill="#1D2A31">h</text>
  <text x="260" y="128" text-anchor="middle" font-size="15" fill="#1D2A31" transform="rotate(-12.8 260 128)">דרך משופעת</text>
  <text x="280" y="40" text-anchor="middle" font-size="17" font-weight="700" fill="#16323A" font-family="IBM Plex Mono,monospace">s% = (h / 100) × 100</text>
  <text x="280" y="64" text-anchor="middle" font-size="14" fill="#4A5961">לדוגמה: עלייה של 8 m לכל 100 m אופקיים ← שיפוע 8%</text>
</svg>`;
}

function speedSquareFig() {
  const bars = [[1, '36'], [2, '72'], [3, '108']];
  let s = `<svg viewBox="0 0 560 250" direction="ltr" xmlns="http://www.w3.org/2000/svg"><rect width="560" height="250" fill="#F8F7F3"/>`;
  s += `<line x1="70" y1="200" x2="520" y2="200" stroke="#c3c2b7" stroke-width="1.5"/>`;
  bars.forEach(([k, kmh], i) => {
    const h = k * k * 17, x = 110 + i * 140;
    s += `<rect x="${x}" y="${200 - h}" width="70" height="${h}" rx="4" fill="#2a78d6"/>`;
    s += `<text x="${x + 35}" y="${192 - h}" text-anchor="middle" font-size="16" font-weight="700" fill="#1D2A31" font-family="IBM Plex Mono,monospace">×${k * k}</text>`;
    s += `<text x="${x + 35}" y="222" text-anchor="middle" font-size="14" fill="#4A5961" font-family="IBM Plex Mono,monospace">${kmh} km/h</text>`;
    s += `<text x="${x + 35}" y="240" text-anchor="middle" font-size="12.5" fill="#7D878B">מהירות ×${k}</text>`;
  });
  s += `<text x="40" y="30" font-size="14" fill="#4A5961">התנגדות האוויר</text></svg>`;
  return s;
}

function shapesFig() {
  const items = [
    ['רכב ספורט', '0.28', 'M20,62 Q40,40 80,36 L120,36 Q150,40 170,58 L172,66 L18,66 Z'],
    ['רכב משפחתי', '0.32', 'M18,64 L20,48 L52,44 L72,26 L128,26 L148,44 L172,50 L172,66 L18,66 Z'],
    ['רכב שטח', '0.40', 'M18,66 L18,30 Q20,22 30,22 L140,22 L162,40 L172,42 L172,66 Z'],
    ['משאית', '0.75', 'M18,66 L18,10 L120,10 L120,66 Z M122,66 L122,26 L160,26 L172,44 L172,66 Z']
  ];
  let s = `<svg viewBox="0 0 800 150" direction="ltr" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="150" fill="#F8F7F3"/>`;
  items.forEach(([n, cd, d], i) => {
    const x = 10 + i * 198;
    s += `<g transform="translate(${x},16)"><path d="${d}" fill="#5B8C93" stroke="#1D2A31" stroke-width="2"/>` +
      `<circle cx="45" cy="68" r="10" fill="#22292E"/><circle cx="145" cy="68" r="10" fill="#22292E"/>` +
      `<text x="95" y="104" text-anchor="middle" font-size="15" font-weight="700" fill="#1D2A31">${n}</text>` +
      `<text x="95" y="126" text-anchor="middle" font-size="15" fill="#2a78d6" font-weight="700" font-family="IBM Plex Mono,monospace">Cd ≈ ${cd}</text></g>`;
  });
  return s + `</svg>`;
}

function logoSVG() {
  return `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="11" fill="#1F6F6B"/>
  <circle cx="24" cy="24" r="13" fill="none" stroke="#fff" stroke-width="3.5"/><circle cx="24" cy="24" r="4" fill="#fff"/>
  <g stroke="#fff" stroke-width="2.4" stroke-linecap="round"><line x1="24" y1="11" x2="24" y2="20"/><line x1="12.6" y1="30.5" x2="20.5" y2="26"/><line x1="35.4" y1="30.5" x2="27.5" y2="26"/></g>
  <path d="M36,6 L44,6 L44,14" fill="none" stroke="#F0C27A" stroke-width="3" stroke-linecap="round"/><line x1="44" y1="6" x2="34" y2="16" stroke="#F0C27A" stroke-width="3" stroke-linecap="round"/></svg>`;
}

const ICONS = {
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/><path d="M9 7h6"/></svg>',
  sim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/></svg>',
  exam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3h6v3H9z"/><path d="M9 12l2 2 4-4"/><path d="M9 17h6"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 7.2a3 3 0 0 0-2-2C18.2 4.7 12 4.7 12 4.7s-6.2 0-8 .5a3 3 0 0 0-2 2A31 31 0 0 0 1.5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2 2c1.8.5 8 .5 8 .5s6.2 0 8-.5a3 3 0 0 0 2-2 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM10 15.2V8.8l5.3 3.2z"/></svg>',
  film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="#2E7D4F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>',
  bad: '<svg viewBox="0 0 24 24" fill="none" stroke="#B8443A" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/></svg>',
  retry: '<svg viewBox="0 0 24 24" fill="none" stroke="#C7861F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v6"/><path d="M12 16.5v.5"/></svg>',
  tip: '<svg viewBox="0 0 24 24" fill="none" stroke="#C7861F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z"/></svg>',
  read: '<svg viewBox="0 0 48 48" fill="none" stroke="#1F6F6B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="40" height="40" rx="10" fill="#E3EFED" stroke="none"/><path d="M14 16h20M14 23h20M14 30h12"/></svg>',
  watch: '<svg viewBox="0 0 48 48" fill="none" stroke="#1F6F6B" stroke-width="2.5" stroke-linejoin="round"><rect x="4" y="4" width="40" height="40" rx="10" fill="#E3EFED" stroke="none"/><rect x="11" y="14" width="26" height="20" rx="3"/><path d="M21 19l7 5-7 5z" fill="#1F6F6B"/></svg>',
  check: '<svg viewBox="0 0 48 48" fill="none" stroke="#1F6F6B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="40" height="40" rx="10" fill="#E3EFED" stroke="none"/><path d="M15 24l6 6 12-13"/></svg>'
};

/* טקסט עברי בתוך SVG: כיוון RTL כדי שמספרים ויחידות יוצגו בסדר הנכון */
function fixSvgText(svg) {
  return svg.replace(/<text([^>]*text-anchor="middle"[^>]*)>([^<]*[\u0590-\u05FF][^<]*)<\/text>/g, '<text$1 direction="rtl">$2</text>');
}