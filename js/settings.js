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
  "ike-post-inv": "ikePostInv",
  "s-ike-net-input": "ikeRate",
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
  const row = g("ike-cont-row");
  if (row) row.style.display = v === "cont" ? "block" : "none";
  const info = g("ike-strat-info");
  if (info)
    info.textContent =
      v === "cont"
        ? "Model zakłada kontynuację wpłat na IKE z zewnętrznego źródła nawet po przejściu na FIRE. Portfel poza IKE nadal musi pokryć wypłaty do 60. roku życia."
        : "Model wymaga, aby portfel poza IKE samodzielnie pokrył wszystkie wypłaty do 60. roku życia. IKE rośnie w tym czasie bez wypłat.";
}
function uIkeNetDisplay() {
  const brutto = pf(g("s-brutto")?.value) || 7;
  const belka = (pf(g("s-belka")?.value) || 19) / 100;
  const netto = brutto * (1 - belka);
  // Display netto read-only
  const el = g("s-netto-display");
  if (el) el.textContent = netto.toFixed(2) + "%/rok";
  // Update netto tooltip
  const tip = g("netto-tip");
  if (tip && netto > 0)
    tip.textContent = `Wartość ${netto.toFixed(2)}% zakłada natychmiastową wypłatę. Przy trzymaniu inwestycji przez wiele lat bez sprzedaży, realny roczny zysk netto będzie wyższy dzięki odroczeniu podatku Belki na sam koniec.`;
  // IKE rate label in portfel
  const ikeRate = pf(g("s-ike-net-input")?.value) || 7;
  const pr = g("port-ike-rate");
  if (pr) pr.textContent = ikeRate.toFixed(1);
  const pp = g("port-poza-rate");
  if (pp) pp.textContent = netto.toFixed(2);
  // legacy id support
  const oldIkeNet = g("s-ike-net");
  if (oldIkeNet)
    oldIkeNet.textContent =
      ikeRate.toFixed(1) + "%/rok (brutto, bez Belki)";
}
