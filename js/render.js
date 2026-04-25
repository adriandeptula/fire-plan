// ── RENDER ALL ──
let _simCache = null;
let _simCacheKey = null;
function getCachedSim() {
  const p = gP();
  if (!p) { _simCache = null; _simCacheKey = null; return null; }
  const key =
    JSON.stringify(p) +
    JSON.stringify({
      A: A.map((a) => ({ id: a.id, units: a.units, mv: a.mv, konto: a.konto })),
      prices: Object.keys(prices).length,
    });
  if (key !== _simCacheKey) { _simCache = sim(p); _simCacheKey = key; }
  return _simCache;
}

let _rATimer = null;
function rA() {
  clearTimeout(_rATimer);
  _rATimer = setTimeout(_rAImmediate, 80);
}
function _rAImmediate() {
  _simCacheKey = null;
  uIkeNetDisplay();
  rDash();
  rPortfel();
  rBud();
  rPlan();
  syncSl();
  cM();
  cMin();
  cWyp();
  uIP();
  uPI();
}

// ── DASH ──
function rDash() {
  const de = g("dd");
  if (de) de.textContent = today();

  const t = gTP(), fireP = gFirePortfel(), ike = gIKE(), poza = gPoza();
  const totalLiab = getTotalLiabilities();
  const wy = pf(S.wy) || 15000;
  const wiek = pf(S.wt) || 31;
  const inf = getINF();
  const r = getCachedSim();
  const realYrsToFire = r ? r.yr : Math.max(0, (pf(S.wf) || 50) - wiek);
  const wyNom = wy * Math.pow(1 + inf, realYrsToFire);
  const G = wyNom * 12 * 25;
  const fp = fireP > 0 ? Math.min(100, (fireP / G) * 100) : 0;
  const infPct = ((Math.pow(1 + inf, realYrsToFire) - 1) * 100).toFixed(1);

  // Zobowiązania
  sT2("kk", totalLiab > 0 ? PLN(totalLiab) : "— zł");
  sT2("kk-m", totalLiab > 0 ? PLN(totalLiab) : "— zł");
  const kkCard = g("kk-card");
  const kkMobile = g("kk-mobile-row");
  if (kkCard) kkCard.style.display = totalLiab > 0 ? "block" : "none";
  if (kkMobile) kkMobile.style.display = totalLiab > 0 ? "block" : "none";

  sT2("kp", PLN(fireP));
  sT2("kps", `IKE: ${PLN(ike)} · Poza IKE: ${PLN(poza)}`);
  sT2("kn", PLN(t - totalLiab));
  sT2("kf", pct(fp));
  const b = g("sb-bar");
  if (b) b.style.width = fp + "%";
  sT2("sb-pct", pct(fp));
  sT2("sb-goal", PLN(G));
  sT2("kg", PLN(G));

  // Cel wypłaty — dziś jako główna, nominalna poniżej
  sT2("k-cel-real-val", PLN(wy) + "/mies.");
  sT2("k-cel-nom-sub", PLN(wyNom) + "/mies. przy FIRE");
  const celReal = g("k-cel-real");
  if (celReal)
    celReal.innerHTML = `<span>za ${Math.round(realYrsToFire)} lat · inflacja +${infPct}%</span>`;

  if (r) {
    const fireAchieved = r.yr <= 0;
    const fireBanner = g("fire-achieved-banner");
    if (fireBanner) fireBanner.style.display = fireAchieved ? "flex" : "none";
    sT2("kw", Math.round(r.fa) + " lat");
    const yrsLeft = Math.round(r.yr);
    sT2("kr", yrsLeft <= 0 ? `Rok ${Math.round(r.fy)}` : `Rok ${Math.round(r.fy)} · za ${yrsLeft} lat`);
    sT2("ki", PLN(pf(S.inv)));

    // Miesięczna wypłata przy FIRE — dziś + nominalna
    sT2("k-fire-wyp-real", PLN(wy) + "/mies.");
    sT2("k-fire-wyp-nom", PLN(r.wyAtFIRE) + "/mies. nominalnie");

    // Od 60 — real dziś
    const yrsTo60 = Math.max(0, 60 - wiek);
    const m60Real = r.m60 / Math.pow(1 + inf, yrsTo60);
    sT2("k60-real", PLN(m60Real) + "/mies.");
    sT2("k60-nom-sub", PLN(r.m60) + "/mies. nominalnie");

    sT2("k-poza-fire", PLN(r.pF));
    sT2("k-ike-fire", PLN(r.iF));

    // Portfel w wieku 60 lat — nowy kafelek
    sT2("k-p60-poza", PLN(r.p60));
    sT2("k-p60-ike", PLN(r.i60));
    sT2("k-p60-total", PLN(r.p60 + r.i60));
    sT2("k-p60-wyp-real", PLN(m60Real) + "/mies.");
    sT2("k-p60-wyp-nom", PLN(r.m60) + "/mies. nominalnie");
  } else {
    const fireBanner = g("fire-achieved-banner");
    if (fireBanner) fireBanner.style.display = "none";
    sT2("kw", "—");
    sT2("kr", "Uzupełnij Budżet FIRE");
    sT2("ki", "—");
    sT2("k-fire-wyp-real", "— zł/mies.");
    sT2("k-fire-wyp-nom", "");
    sT2("k60-real", "—");
    sT2("k60-nom-sub", "");
    sT2("k-poza-fire", "—");
    sT2("k-ike-fire", "—");
    sT2("k-p60-poza", "—");
    sT2("k-p60-ike", "—");
    sT2("k-p60-total", "—");
    sT2("k-p60-wyp-real", "— zł/mies.");
    sT2("k-p60-wyp-nom", "");
  }

  const sb2 = g("setup-b");
  if (sb2) sb2.style.display = !A.length || !pf(S.inv) ? "flex" : "none";
  rATbl("dt", false);
}

// ── PORTFEL ──
function rPortfel() {
  sT2("pt", PLN(gFirePortfel()));
  sT2("pike", PLN(gIKE()));
  sT2("ppoza", PLN(gPoza()));
  const nier = gNierSprzedaz(), wyn = getWynajemBrutto();
  let extra = "";
  if (nier > 0)
    extra += `<div class="card" style="margin-bottom:10px"><div class="cl">Nieruchomości — wartość rynkowa</div><div class="cv" style="color:var(--pu)">${PLN(nier)}</div></div>`;
  if (wyn > 0)
    extra += `<div class="card" style="margin-bottom:10px"><div class="cl">Nieruchomości — wynajem</div><div class="cv" style="color:#e8935a">${PLN(wyn)}/mies. brutto · netto ${PLN(wyn * 0.915)}/mies.</div></div>`;
  const xe = g("p-extra");
  if (xe) xe.innerHTML = extra;
  rATbl("at", true);
  rLiabList();
}

// ── BUDŻET FIRE ──
function rBud() {
  uIP();
  uPI();
  uIkeStrat();
  uIkeNetDisplay();

  const inv = pf(S.inv),
    i1 = pf(S.i1) || 26019,
    i2 = pf(S.i2) || 26019,
    ip = (pf(S.ip) || 100) / 100;
  const ikM = ((i1 + i2) / 12) * ip, pM = Math.max(0, inv - ikM);
  const wpł1 = pf(S.i1wpl) || 0, wpł2 = pf(S.i2wpl) || 0;
  const zostało = Math.max(0, i1 - wpł1 + (i2 - wpł2));
  const zostałoInfo =
    wpł1 + wpł2 > 0
      ? `<div class="ir" style="border:none"><span class="ik" style="color:var(--go)">⚠ Już wpłacono w tym roku</span><span class="iv" style="color:var(--go)">${PLN(wpł1 + wpł2)} · zostało ${PLN(zostało)}</span></div>`
      : "";

  const el = g("ike-prev");
  if (!el) return;
  if (!inv) {
    el.innerHTML = `<div class="em" style="padding:14px 0"><div class="ems">Wpisz kwotę miesięczną na FIRE</div></div>`;
    return;
  }
  const bar = Math.min(100, (ikM / inv) * 100);
  el.innerHTML = `<div class="cl" style="margin-bottom:7px">Struktura ${PLN(inv)}/mies.</div>
    <div class="ikebar"><div style="width:${bar}%;background:var(--gr);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--bg);font-weight:700;transition:width .5s;min-width:${bar > 0 ? "8px" : "0"}">IKE</div><div style="flex:1;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--t2)">ETF/inne</div></div>
    <div class="ir"><span class="ik">🏦 Na IKE (${Math.round(ip * 100)}% limitu)</span><span class="iv" style="color:var(--gr)">${PLN(ikM)}/mies.</span></div>
    <div class="ir"><span class="ik">📈 Poza IKE (ETF, crypto…)</span><span class="iv" style="color:var(--bl)">${PLN(pM)}/mies.</span></div>
    <div class="ir"><span class="ik">Max IKE (oba konta)</span><span class="iv">${PLN((i1 + i2) / 12)}/mies.</span></div>${zostałoInfo}`;

  const wy = pf(S.wy), wiek = pf(S.wt) || 31, wf = pf(S.wf) || 50, inf2 = getINF();
  const latDoFIRE = Math.max(0, wf - wiek);
  const wyNom = wy * Math.pow(1 + inf2, latDoFIRE);
  const infPct2 = ((Math.pow(1 + inf2, latDoFIRE) - 1) * 100).toFixed(1);
  const nomEl = g("bwy-nom");
  if (nomEl && wy > 0)
    nomEl.innerHTML = `<span>= ${PLN(wyNom)}/mies. w roku ${new Date().getFullYear() + latDoFIRE}</span> · inflacja +${infPct2}%`;
  else if (nomEl) nomEl.innerHTML = "";
}

// ── PLAN ──
function rPlan() {
  const el = g("plan-c");
  if (!el) return;
  const p = gP();
  if (!p) {
    el.innerHTML = `<div class="al alg"><div class="ali">⚙</div><div><div class="alt">Uzupełnij Budżet FIRE</div><div class="alb2">Wpisz miesięczną kwotę inwestycji.</div></div></div>`;
    return;
  }
  const r = getCachedSim(), fY = Math.round(r.fy), fA = Math.round(r.fa), now = new Date().getFullYear();
  const infPct = (r.infTotal * 100).toFixed(1);
  const celDzis = pf(S.wy) * 12 * 25;
  const wiek = pf(S.wt) || 31;
  const m60Dzis = r.m60 / Math.pow(1 + getINF(), Math.max(0, 60 - wiek));

  el.innerHTML = `<div class="g3" style="margin-bottom:14px">
    <div class="card"><div class="ct" style="background:var(--go)"></div>
      <div class="cl">Cel FIRE (w cenach dziś)</div>
      <div class="cv go">${PLN(celDzis)}</div>
      <div class="cs inf-badge"><span>${PLN(r.G)} nominalnie · +${infPct}%</span></div>
    </div>
    <div class="card"><div class="ct" style="background:var(--gr)"></div>
      <div class="cl">Rok FIRE</div>
      <div class="cv gr">${fY}</div>
      <div class="cs">Za ${Math.round(r.yr)} lat · wiek ${fA} lat</div>
    </div>
    <div class="card"><div class="ct" style="background:var(--pu)"></div>
      <div class="cl">Od 60. roku życia (dziś)</div>
      <div class="cv" style="color:var(--pu)">${PLN(m60Dzis)}/mies.</div>
      <div class="cs">${PLN(r.m60)}/mies. nominalnie</div>
    </div>
  </div>
  <div class="g2" style="margin-bottom:14px">
    <div class="card"><div class="cl">Portfel poza IKE przy FIRE</div><div class="cv bl">${PLN(r.pF)}</div><div class="cs">Pokrywa wypłaty do 60. roku życia</div></div>
    <div class="card"><div class="cl">Portfel IKE przy FIRE</div><div class="cv gr">${PLN(r.iF)}</div><div class="cs">Rośnie do 60. roku życia bez wypłat</div></div>
  </div>
  <div class="st" style="margin-bottom:8px">Kamienie milowe</div>
  <div class="card"><div class="tl">
    <div class="ti"><div class="td now"></div><div class="ty">${now} · TERAZ</div><div class="tt">Start planu FIRE</div><div class="tdc">Portfel: ${PLN(gTP())} · IKE: ${PLN(gIKE())} · Wpłata/mies.: ${PLN(p.inv)} · Na IKE: ${PLN(p.ike)}${p.invInf ? " · wpłata rośnie z inflacją" : ""}</div></div>
    ${r.cy ? `<div class="ti"><div class="td"></div><div class="ty">${r.cy} · CoastFIRE</div><div class="tt">Portfel pracuje sam</div><div class="tdc">Od tego roku portfel urośnie do celu bez żadnych nowych wpłat.</div></div>` : ""}
    <div class="ti"><div class="td"></div><div class="ty">${fY} · 🔥 FIRE</div><div class="tt">Fat FIRE — wolność finansowa</div><div class="tdc">Portfel łącznie: ${PLN(r.tot)} · Wypłata: ${PLN(pf(S.wy))}/mies. dziś = ${PLN(r.wyAtFIRE)}/mies. nominalnie · Wiek ${fA} lat<br>Poza IKE: ${PLN(r.pF)} · IKE (zamrożone): ${PLN(r.iF)}</div></div>
    <div class="ti"><div class="td"></div><div class="ty">WIEK 60 · IKE odblokowane</div><div class="tt">Pełna siła portfela</div><div class="tdc">IKE: ${PLN(r.i60)} · Poza: ${PLN(r.p60)} · Łącznie: ${PLN(m60Dzis)}/mies. dziś = ${PLN(r.m60)}/mies. nominalnie</div></div>
  </div></div>`;
}
