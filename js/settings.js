// ── SETTINGS ──
const SM = {
  bwt: "wt",
  bwf: "wf",
  bwy: "wy",
  binv: "inv",
  bike1: "i1",
  bike2: "i2",
  bikep: "ip",
  "bike1-wpł": "i1wpl",
  "bike2-wpł": "i2wpl",
  bwyd: "wyd",
  broz: "roz",
  bpw: "pw",
  bpr: "pr",
  "s-brutto": "brutto",
  "s-belka": "belka",
  "s-inf": "inf",
  "s-ike-net-input": "ikeRate",
  // IKE po FIRE — nowe pola
  "ike-post-inv-a":  "ikePostInvA",
  "ike-post-inv-b1": "ikePostInvB1",
  "ike-post-inv-b2": "ikePostInvB2",
  "ike-post-inv-c":  "ikePostInvC",
  "ike-post-inv-d1": "ikePostInvD1",
  "ike-post-inv-d2": "ikePostInvD2",
};

function colS() {
  Object.entries(SM).forEach(([id, k]) => {
    const e = g(id);
    if (e) S[k] = e.value;
  });
  const strat = g("ike-strategy");
  if (strat) S.ikeStrat = strat.value;
  const cb = g("binv-inf");
  if (cb) S.invInf = cb.checked ? "1" : "0";
  const cb2 = g("s-calc-base");
  if (cb2) S.calcBase = cb2.value;
}

function apS() {
  Object.entries(SM).forEach(([id, k]) => {
    const e = g(id);
    if (e && S[k] !== undefined) e.value = S[k];
  });
  const strat = g("ike-strategy");
  if (strat) strat.value = S.ikeStrat || "stop";
  const cb = g("binv-inf");
  if (cb) cb.checked = S.invInf === "1";
  const cb2 = g("s-calc-base");
  if (cb2) cb2.value = S.calcBase || "brutto";
  uIP();
  uPI();
  uIkeStrat();
  uIkeNetDisplay();
}

function uIP() {
  const v = g("bikep")?.value || 100;
  const e = g("ikepl");
  if (e) e.textContent = v + "%";
}

function uPI() {
  const w = pf(g("bpw")?.value) || 10,
    r = pf(g("bpr")?.value) || 10;
  const e = g("bpi");
  if (e) e.value = Math.max(0, 100 - w - r);
}

function uIkeStrat() {
  const v = g("ike-strategy")?.value || "stop";
  const rows = ["A", "B", "C", "D"];
  rows.forEach(x => {
    const el = g("ike-strat-" + x);
    if (el) el.style.display = v === x ? "block" : "none";
  });
  const info = g("ike-strat-info");
  if (!info) return;
  const msgs = {
    stop: "IKE rośnie samodzielnie przez cały okres do 60. roku życia bez żadnych dodatkowych wpłat. Portfel poza IKE pokrywa wypłaty.",
    A: "Kwota roczna pochodzi z portfela poza IKE — zmniejsza dostępny kapitał na wypłaty do 60. r.ż. IKE rośnie szybciej dzięki dodatkowym wpłatom.",
    B: "Procent aktualnego limitu IKE (indeksowanego o inflację co rok) pochodzi z portfela poza IKE. System automatycznie liczy rosnący limit.",
    C: "Wpłaty na IKE finansowane są ze źródła zewnętrznego (praca dorywcza, wynajem itp.) — nie zmniejszają portfela FIRE. Idealny scenariusz.",
    D: "Procent limitu IKE ze źródła zewnętrznego. Limit rośnie co roku o inflację. Portfel FIRE pozostaje nienaruszony przez wpłaty na IKE.",
  };
  info.textContent = msgs[v] || msgs.stop;
}

function uIkeNetDisplay() {
  const brutto = pf(g("s-brutto")?.value) || 7;
  const belka = (pf(g("s-belka")?.value) || 19) / 100;
  const netto = brutto * (1 - belka);
  const el = g("s-netto-display");
  if (el) el.textContent = netto.toFixed(2) + "%/rok";
  const tip = g("netto-tip");
  if (tip && netto > 0)
    tip.textContent = `Wartość ${netto.toFixed(2)}% zakłada natychmiastową wypłatę. Przy trzymaniu inwestycji przez wiele lat bez sprzedaży, realny roczny zysk netto będzie wyższy dzięki odroczeniu podatku Belki na sam koniec.`;
  const ikeRate = pf(g("s-ike-net-input")?.value) || 7;
  const pr = g("port-ike-rate");
  if (pr) pr.textContent = ikeRate.toFixed(1);
  const pp = g("port-poza-rate");
  if (pp) pp.textContent = netto.toFixed(2);
  const oldIkeNet = g("s-ike-net");
  if (oldIkeNet)
    oldIkeNet.textContent = ikeRate.toFixed(1) + "%/rok (brutto, bez Belki)";
}
