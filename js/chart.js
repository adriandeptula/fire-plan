// ── WYKRES PORTFELA ──
const CHART_VIS_KEY = 'fire-chart-vis';
let _chartVis = null;

function getChartVis() {
  if (!_chartVis) {
    try {
      const raw = localStorage.getItem(CHART_VIS_KEY);
      _chartVis = raw ? JSON.parse(raw) : { poza: true, ike: true, total: true };
    } catch (e) { _chartVis = { poza: true, ike: true, total: true }; }
  }
  return _chartVis;
}

function toggleChartSeries(key) {
  const vis = getChartVis();
  vis[key] = !vis[key];
  try { localStorage.setItem(CHART_VIS_KEY, JSON.stringify(vis)); } catch (e) {}
  renderChart();
}

function simChartData() {
  const p = gP();
  if (!p) return null;
  const simResult = getCachedSim();
  if (!simResult) return null;

  const { inv, ike, start, iS, wy, wiek, wynajemNetto = 0,
    ikeStrat, ikePostInvA, ikePostInvB1, ikePostInvB2,
    ikePostInvC, ikePostInvD1, ikePostInvD2, i1Limit, i2Limit, invInf } = p;

  const inf = getINF(), MRI = getMRI_IKE(), MRP = getMRP();
  const ikeArgs = { ikeStrat, ikePostInvA, ikePostInvB1, ikePostInvB2,
    ikePostInvC, ikePostInvD1, ikePostInvD2, i1Limit, i2Limit };

  const fireAge = simResult.fa, fireYr = simResult.yr;
  const nowYear = new Date().getFullYear(), MAX_AGE = 90;
  let pI = iS, pP = Math.max(0, start - iS);
  const data = [];
  data.push({ year: nowYear, age: wiek, pI, pP, phase: 'accum' });

  // Faza 1: Akumulacja
  const fireMonths = Math.max(0, Math.round(fireYr * 12));
  for (let m = 1; m <= fireMonths; m++) {
    const invM = invInf ? inv * Math.pow(1 + inf, Math.floor(m / 12)) : inv;
    const ii = Math.min(invM, ike), pi = Math.max(0, invM - ii);
    pI = pI * (1 + MRI) + ii;
    pP = pP * (1 + MRP) + pi;
    if (m % 12 === 0) {
      const age = wiek + m / 12;
      if (age <= MAX_AGE) data.push({ year: nowYear + m / 12, age, pI, pP, phase: 'accum' });
    }
  }
  if (fireMonths > 0 && fireMonths % 12 !== 0 && fireAge <= MAX_AGE)
    data.push({ year: nowYear + fireYr, age: fireAge, pI, pP, phase: 'accum' });

  // Faza 2: Wypłaty (FIRE → 60)
  // Wynajem indeksowany od dziś do momentu FIRE — spójnie z model.js
  const wynajemAtFire = wynajemNetto * Math.pow(1 + inf, fireYr);
  const wyAtFIRE = wy * Math.pow(1 + inf, fireYr);
  const portWithdrawBase = Math.max(0, wyAtFIRE - wynajemAtFire);
  const monthsTo60 = Math.max(0, Math.round((60 - fireAge) * 12));
  for (let mm = 1; mm <= monthsTo60; mm++) {
    const inflFactor = Math.pow(1 + inf, Math.floor(mm / 12));
    const portWithdraw = portWithdrawBase * inflFactor;
    const { monthly: ikeM, fromCapital } = calcIkePostFire({ ...ikeArgs, inflFactor });
    pI = pI * (1 + MRI) + ikeM;
    pP = pP * (1 + MRP) - portWithdraw - (fromCapital ? ikeM : 0);
    if (pP < 0) pP = 0;
    if (mm % 12 === 0) {
      const age = fireAge + mm / 12;
      if (age <= MAX_AGE) data.push({ year: nowYear + fireYr + mm / 12, age, pI, pP, phase: 'withdrawal' });
    }
  }
  if (monthsTo60 > 0 && monthsTo60 % 12 !== 0 && 60 <= MAX_AGE)
    data.push({ year: nowYear + fireYr + monthsTo60 / 12, age: 60, pI, pP, phase: 'withdrawal' });

  // Faza 3: Po 60. r.ż.
  if (MAX_AGE > 60) {
    // Wynajem indeksowany od dziś do 60. r.ż. (fireYr + y60 = 60 - wiek)
    const wynajemAt60 = wynajemNetto * Math.pow(1 + inf, Math.max(0, 60 - wiek));
    // portWithdrawAt60base: z simResult.m60 odejmujemy wynajem — to co musi pokryć portfel
    const portWithdrawAt60base = Math.max(0, simResult.m60 - wynajemAt60);
    const monthsAfter60 = (MAX_AGE - 60) * 12;
    for (let mm = 1; mm <= monthsAfter60; mm++) {
      const inflFactor = Math.pow(1 + inf, Math.floor(mm / 12));
      const portWithdraw = portWithdrawAt60base * inflFactor;
      const total = pI + pP;
      if (total > 0) {
        const ikeShare = pI / total;
        pI = pI * (1 + MRI) - portWithdraw * ikeShare;
        pP = pP * (1 + MRP) - portWithdraw * (1 - ikeShare);
        if (pI < 0) pI = 0;
        if (pP < 0) pP = 0;
      }
      if (mm % 12 === 0) {
        const age = 60 + mm / 12;
        data.push({ year: nowYear + fireYr + monthsTo60 / 12 + mm / 12, age, pI, pP, phase: 'post60' });
      }
    }
  }
  return { data, fireAge, fireYear: Math.round(nowYear + fireYr), simResult };
}

function fmtChartY(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 10e6 ? 0 : 1) + ' M';
  if (n >= 1e3) return Math.round(n / 1e3) + ' k';
  return Math.round(n) + '';
}

const CHART_SERIES = [
  { key: 'total', label: 'Łącznie',  color: '#d4a843', dash: '',    area: 'rgba(212,168,67,0.07)' },
  { key: 'ike',   label: 'IKE',      color: '#4eb87a', dash: '5,3', area: 'rgba(78,184,122,0.06)' },
  { key: 'poza',  label: 'Poza IKE', color: '#5a9ef0', dash: '2,3', area: 'rgba(90,158,240,0.06)' },
];

function renderChart() {
  const el = g('chart-wrap');
  if (!el) return;
  const p = gP();
  if (!p) {
    el.innerHTML = '<div class="em"><div class="emi">📊</div><div class="emt">Uzupełnij Budżet FIRE</div><div class="ems">Wpisz miesięczną kwotę inwestycji w zakładce Budżet FIRE</div></div>';
    return;
  }
  const cd = simChartData();
  if (!cd || !cd.data.length) return;

  const vis = getChartVis();
  const { data, fireAge, fireYear, simResult } = cd;
  const W = 880, H = 390, ml = 76, mr = 16, mt = 26, mb = 52;
  const pw = W - ml - mr, ph = H - mt - mb;
  const ages = data.map(d => d.age);
  const minAge = ages[0], maxAge = ages[ages.length - 1];

  const allVals = data.flatMap(d => {
    const v = [];
    if (vis.poza) v.push(d.pP);
    if (vis.ike) v.push(d.pI);
    if (vis.total) v.push(d.pI + d.pP);
    return v;
  });
  const maxVal = Math.max(...allVals, 1);
  const xS = age => ml + ((age - minAge) / (maxAge - minAge)) * pw;
  const yS = val => mt + ph - Math.min(1, val / maxVal) * ph;

  const pts = key => data.map(d => {
    const v = key === 'total' ? d.pI + d.pP : key === 'ike' ? d.pI : d.pP;
    return xS(d.age).toFixed(1) + ',' + yS(v).toFixed(1);
  }).join(' ');

  const areaPath = key => {
    const by = yS(0).toFixed(1);
    return 'M' + xS(data[0].age).toFixed(1) + ',' + by + ' ' +
      data.map(d => {
        const v = key === 'total' ? d.pI + d.pP : key === 'ike' ? d.pI : d.pP;
        return 'L' + xS(d.age).toFixed(1) + ',' + yS(v).toFixed(1);
      }).join(' ') +
      ' L' + xS(data[data.length - 1].age).toFixed(1) + ',' + by + ' Z';
  };

  const rawStep = maxVal / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep = Math.ceil(rawStep / mag) * mag;
  const yTicks = [];
  for (let v = 0; v <= maxVal * 1.05; v += niceStep) yTicks.push(v);

  const ageRange = maxAge - minAge;
  const ageTick = ageRange > 55 ? 10 : ageRange > 25 ? 5 : 2;
  const firstTick = Math.ceil((minAge + 1) / ageTick) * ageTick;
  const xTicks = [];
  for (let a = firstTick; a <= maxAge; a += ageTick) xTicks.push(a);

  const fireX = xS(fireAge);
  const age60X = fireAge < 60 ? xS(60) : null;
  const phase1W = Math.max(0, fireX - ml);
  const phase2W = age60X ? Math.max(0, age60X - fireX) : 0;
  const phase3X = age60X || (ml + pw);
  const phase3W = Math.max(0, ml + pw - phase3X);

  const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block" id="chart-svg">' +
  '<defs><clipPath id="chart-clip"><rect x="' + ml + '" y="' + mt + '" width="' + pw + '" height="' + ph + '"/></clipPath></defs>' +
  '<rect x="' + ml + '" y="' + mt + '" width="' + phase1W.toFixed(1) + '" height="' + ph + '" fill="rgba(90,158,240,0.04)"/>' +
  (age60X ? '<rect x="' + fireX.toFixed(1) + '" y="' + mt + '" width="' + phase2W.toFixed(1) + '" height="' + ph + '" fill="rgba(224,90,106,0.04)"/>' : '') +
  (age60X ? '<rect x="' + phase3X.toFixed(1) + '" y="' + mt + '" width="' + phase3W.toFixed(1) + '" height="' + ph + '" fill="rgba(78,184,122,0.04)"/>' : '') +
  yTicks.map(v => '<line x1="' + ml + '" y1="' + yS(v).toFixed(1) + '" x2="' + (ml + pw) + '" y2="' + yS(v).toFixed(1) + '" stroke="#21212e" stroke-width="1"/>').join('') +
  xTicks.map(a => '<line x1="' + xS(a).toFixed(1) + '" y1="' + mt + '" x2="' + xS(a).toFixed(1) + '" y2="' + (mt + ph) + '" stroke="#1a1a28" stroke-width="1"/>').join('') +
  '<g clip-path="url(#chart-clip)">' +
  CHART_SERIES.map(s => vis[s.key] ? '<path d="' + areaPath(s.key) + '" fill="' + s.area + '"/>' : '').join('') +
  CHART_SERIES.map(s => vis[s.key] ? '<polyline points="' + pts(s.key) + '" fill="none" stroke="' + s.color + '" stroke-width="2" ' + (s.dash ? 'stroke-dasharray="' + s.dash + '"' : '') + ' stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>' : '').join('') +
  '</g>' +
  yTicks.map(v => '<text x="' + (ml - 6) + '" y="' + (yS(v) + 3.5).toFixed(1) + '" text-anchor="end" font-family="JetBrains Mono,monospace" font-size="9" fill="#5a5878">' + fmtChartY(v) + '</text>').join('') +
  xTicks.map(a => '<line x1="' + xS(a).toFixed(1) + '" y1="' + (mt + ph) + '" x2="' + xS(a).toFixed(1) + '" y2="' + (mt + ph + 5) + '" stroke="#2a2a3e" stroke-width="1"/><text x="' + xS(a).toFixed(1) + '" y="' + (mt + ph + 15) + '" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="#5a5878">' + a + ' lat</text>').join('') +
  '<line x1="' + ml + '" y1="' + mt + '" x2="' + ml + '" y2="' + (mt + ph) + '" stroke="#36365a" stroke-width="1"/>' +
  '<line x1="' + ml + '" y1="' + (mt + ph) + '" x2="' + (ml + pw) + '" y2="' + (mt + ph) + '" stroke="#36365a" stroke-width="1"/>' +
  '<line x1="' + fireX.toFixed(1) + '" y1="' + mt + '" x2="' + fireX.toFixed(1) + '" y2="' + (mt + ph) + '" stroke="#d4a843" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.8"/>' +
  '<rect x="' + (fireX - 26).toFixed(1) + '" y="' + (mt - 18) + '" width="54" height="15" rx="3" fill="rgba(212,168,67,0.15)"/>' +
  '<text x="' + fireX.toFixed(1) + '" y="' + (mt - 6) + '" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8.5" fill="#d4a843" font-weight="600">🔥 ' + fireYear + '</text>' +
  (age60X ? '<line x1="' + age60X.toFixed(1) + '" y1="' + mt + '" x2="' + age60X.toFixed(1) + '" y2="' + (mt + ph) + '" stroke="#4eb87a" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.8"/><rect x="' + (age60X - 23).toFixed(1) + '" y="' + (mt - 18) + '" width="46" height="15" rx="3" fill="rgba(78,184,122,0.12)"/><text x="' + age60X.toFixed(1) + '" y="' + (mt - 6) + '" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8.5" fill="#4eb87a" font-weight="600">IKE 60</text>' : '') +
  '<text x="' + ((ml + Math.min(fireX, ml + pw)) / 2).toFixed(1) + '" y="' + (mt + ph + 32) + '" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(90,158,240,0.5)" letter-spacing="0.08em">AKUMULACJA</text>' +
  (age60X && phase2W > 50 ? '<text x="' + ((fireX + age60X) / 2).toFixed(1) + '" y="' + (mt + ph + 32) + '" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(224,90,106,0.5)" letter-spacing="0.08em">WYPŁATY</text>' : '') +
  (age60X && phase3W > 50 ? '<text x="' + ((phase3X + ml + pw) / 2).toFixed(1) + '" y="' + (mt + ph + 32) + '" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" fill="rgba(78,184,122,0.5)" letter-spacing="0.08em">IKE OTWARTE</text>' : '') +
  '<line id="chart-hover-line" x1="0" y1="' + mt + '" x2="0" y2="' + (mt + ph) + '" stroke="rgba(232,230,240,0.2)" stroke-width="1" style="display:none" pointer-events="none"/>' +
  '<rect id="chart-hover-zone" x="' + ml + '" y="' + mt + '" width="' + pw + '" height="' + ph + '" fill="transparent" style="cursor:crosshair"/>' +
  '</svg>';

  const toggles = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center">' +
    '<span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--mu);letter-spacing:.15em;text-transform:uppercase;margin-right:2px">Serie:</span>' +
    CHART_SERIES.map(s => {
      const on = vis[s.key];
      const line = '<svg width="20" height="10" style="display:inline-block;vertical-align:middle;margin-right:6px;flex-shrink:0"><line x1="0" y1="5" x2="20" y2="5" stroke="' + (on ? s.color : '#5a5878') + '" stroke-width="2"' + (s.dash ? ' stroke-dasharray="' + s.dash + '"' : '') + '/></svg>';
      return '<button onclick="toggleChartSeries(\'' + s.key + '\')" style="display:inline-flex;align-items:center;padding:5px 11px;border-radius:4px;border:1px solid ' + (on ? s.color : 'var(--b2)') + ';background:' + (on ? s.color + '18' : 'transparent') + ';cursor:pointer;font-family:\'JetBrains Mono\',monospace;font-size:10px;color:' + (on ? s.color : 'var(--mu)') + ';transition:all .15s;line-height:1">' + line + s.label + '</button>';
    }).join('') + '</div>';

  const inf2 = getINF();
  const wiek2 = p.wiek || 31;
  const m60real = simResult.m60 / Math.pow(1 + inf2, Math.max(0, 60 - wiek2));
  const stats = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px">' +
    '<div style="background:var(--s2);border:1px solid var(--b);border-radius:5px;padding:9px 12px;text-align:center"><div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--mu);letter-spacing:.15em;text-transform:uppercase;margin-bottom:3px">FIRE ' + fireYear + '</div><div style="font-family:\'Lora\',serif;font-size:15px;font-weight:600;color:var(--go)">' + PLN(simResult.tot) + '</div><div style="font-size:10px;color:var(--mu);margin-top:1px">portfel łącznie</div></div>' +
    '<div style="background:var(--s2);border:1px solid var(--b);border-radius:5px;padding:9px 12px;text-align:center"><div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--mu);letter-spacing:.15em;text-transform:uppercase;margin-bottom:3px">WIEK 60 LAT</div><div style="font-family:\'Lora\',serif;font-size:15px;font-weight:600;color:var(--gr)">' + PLN(simResult.i60 + simResult.p60) + '</div><div style="font-size:10px;color:var(--mu);margin-top:1px">portfel łącznie</div></div>' +
    '<div style="background:var(--s2);border:1px solid var(--b);border-radius:5px;padding:9px 12px;text-align:center"><div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--mu);letter-spacing:.15em;text-transform:uppercase;margin-bottom:3px">WYPŁATA PO 60</div><div style="font-family:\'Lora\',serif;font-size:15px;font-weight:600;color:var(--go)">' + PLN(m60real) + '/mies.</div><div style="font-size:10px;color:var(--mu);margin-top:1px">w dzisiejszych zł</div></div>' +
    '</div>';

  el.innerHTML = toggles +
    '<div style="position:relative"><div id="chart-tooltip" style="display:none;position:absolute;pointer-events:none;background:var(--s3);border:1px solid var(--b2);border-radius:6px;padding:9px 13px;font-size:11px;z-index:10;min-width:170px;box-shadow:0 4px 20px rgba(0,0,0,.6)"></div>' +
    '<div style="background:var(--s);border:1px solid var(--b);border-radius:6px;overflow:hidden;padding:12px 8px 6px">' + svg + '</div></div>' + stats;

  const svgEl = g('chart-svg'), hoverZone = g('chart-hover-zone');
  const hoverLine = g('chart-hover-line'), tooltip = g('chart-tooltip');
  if (!svgEl || !hoverZone) return;

  hoverZone.addEventListener('mousemove', e => {
    const rect = svgEl.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const age = minAge + ((mx - ml) / pw) * (maxAge - minAge);
    let nearest = data[0], minDist = Infinity;
    data.forEach(d => { const dist = Math.abs(d.age - age); if (dist < minDist) { minDist = dist; nearest = d; } });
    const nx = xS(nearest.age);
    hoverLine.setAttribute('x1', nx.toFixed(1)); hoverLine.setAttribute('x2', nx.toFixed(1));
    hoverLine.style.display = 'block';
    const phaseLabel = { accum: 'Akumulacja', withdrawal: 'Wypłaty FIRE', post60: 'Po 60. roku życia' }[nearest.phase];
    let html = '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--mu);margin-bottom:4px;letter-spacing:.08em">WIEK ' + Math.round(nearest.age) + ' lat · ' + Math.round(nearest.year) + '</div>';
    html += '<div style="font-size:10px;color:var(--t2);margin-bottom:7px">' + phaseLabel + '</div>';
    if (vis.total) html += '<div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:3px"><span style="color:#d4a843">Łącznie</span><span style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:#d4a843">' + PLN(nearest.pI + nearest.pP) + '</span></div>';
    if (vis.ike)   html += '<div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:3px"><span style="color:#4eb87a">IKE</span><span style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:#4eb87a">' + PLN(nearest.pI) + '</span></div>';
    if (vis.poza)  html += '<div style="display:flex;justify-content:space-between;gap:14px"><span style="color:#5a9ef0">Poza IKE</span><span style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:#5a9ef0">' + PLN(nearest.pP) + '</span></div>';
    tooltip.innerHTML = html; tooltip.style.display = 'block';
    const tipW = 180, rawLeft = (nx / W) * rect.width;
    tooltip.style.left = (rawLeft + 14 + tipW > rect.width ? rawLeft - tipW - 14 : rawLeft + 14) + 'px';
    tooltip.style.top = '14px';
  });
  hoverZone.addEventListener('mouseleave', () => { hoverLine.style.display = 'none'; tooltip.style.display = 'none'; });
}

function rWykres() { renderChart(); }
