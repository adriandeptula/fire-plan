
// ── CALCULATORS ──
function syncSl() {
  const p = gP();
  if (!p) return;
  const sv = (id, v) => {
    const e = g(id);
    if (e && !e.value) e.value = v;
  };
  sv("s1", p.inv || "");
  sv("s2", Math.round(p.ike) || "");
  sv("s3", p.start || "");
}
function cM() {
  const inv = pf(g("s1")?.value),
    ike = pf(g("s2")?.value),
    st = pf(g("s3")?.value),
    wy = pf(g("s4")?.value) || 15000;
  const wiek = pf(S.wt) || 31,
    iS = gIKE();
  // clear hint labels
  sT2("sv1", "");
  sT2("sv2", "");
  sT2("sv3", "");
  sT2("sv4", "");
  if (!inv) {
    return;
  }
  const r = sim({
    inv,
    ike,
    start: st,
    iS,
    wy,
    wiek,
    wynajemNetto: getWynajemNetto(),
    ikeStrat: S.ikeStrat || "stop",
    ikePostInv: pf(S.ikePostInv),
    invInf: S.invInf === "1",
  });

  sT2("r1", Math.round(r.fa) + " lat");
  sT2("r2", "" + Math.round(r.fy));

  // Cel z i bez inflacji
  const celBezInf = wy * 12 * 25;
  sT2("r3", PLN(r.G));
  const r3r = g("r3-real");
  if (r3r) r3r.textContent = `${PLN(celBezInf)} bez inflacji`;

  sT2("r4", PLN(r.pF));
  sT2("r4b", PLN(r.iF));
  sT2("r6", PLN(r.m60) + "/mies.");

  // Sprawdzenie czy poza IKE wystarczy
  const latDo60 = Math.max(0, 60 - r.fa);
  const poza = g("r-poza-check");
  if (poza) {
    if (latDo60 > 0) {
      const potrzeba = r.wyAtFIRE * latDo60 * 12;
      const ok = r.pF >= potrzeba * 0.5;
      poza.innerHTML = `<span style="color:${ok ? "var(--gr)" : "var(--go)"}">${ok ? "✓" : "⚠"}</span> Poza IKE musi pokryć ${Math.round(latDo60)} lat wypłat do 60. r.ż. · szacunkowo ${PLN(potrzeba)} nominalnie`;
    } else poza.innerHTML = "";
  }

  const pM = Math.max(0, inv - ike);
  g("ph-box").innerHTML = `<div class="pg">
    <div class="pb" style="border-color:var(--blc)"><div class="pbn">Faza 1 — Akumulacja</div><div class="pbt" style="color:var(--bl)">Przed FIRE</div><div class="pbr"><span>IKE/mies.</span><span>${PLN(ike)}</span></div><div class="pbr"><span>Poza IKE/mies.</span><span>${PLN(pM)}</span></div></div>
    <div class="pb" style="border-color:var(--rec)"><div class="pbn">Faza 2 — Wypłaty</div><div class="pbt" style="color:var(--re)">FIRE → 60 r.ż.</div><div class="pbr"><span>Tylko poza IKE</span><span>${PLN(r.pF)}</span></div><div class="pbr"><span>IKE rośnie</span><span>${PLN(r.iF)}</span></div></div>
    <div class="pb" style="border-color:var(--grc)"><div class="pbn">Faza 3 — IKE wolne</div><div class="pbt" style="color:var(--gr)">Po 60 r.ż.</div><div class="pbr"><span>IKE</span><span>${PLN(r.i60)}</span></div><div class="pbr"><span>Łącznie/mies.</span><span style="color:var(--gr)">${PLN(r.m60)}</span></div></div>
  </div>`;
  const y = Math.round(r.yr);
  sT2(
    "ri",
    y <= 10
      ? `Świetne tempo! FIRE za ${y} lat w wieku ${Math.round(r.fa)} lat.`
      : y <= 20
        ? `Dobry plan. FIRE w ${Math.round(r.fy)}. Cel nominalny: ${PLN(r.G)} (inflacja +${(r.infTotal * 100).toFixed(0)}%).`
        : `Każde +1 000 zł/mies. skraca horyzont o ~1.5–2 lata.`,
  );
}
function cMin() {
  const wt = pf(g("ms1")?.value) || 50,
    wy = pf(g("ms2")?.value) || 15000,
    wiek = pf(S.wt) || 31;
  sT2("msv1", "");
  sT2("msv2", "");
  if (wt <= wiek) {
    sT2("mr1", "Niemożliwe");
    return;
  }
  const ty = wt - wiek,
    start = gFirePortfel(),
    iS = gIKE(),
    ike = getIKEM();
  let lo = 500,
    hi = 200000,
    found = hi;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const r = sim({
      inv: mid,
      ike,
      start,
      iS,
      wy,
      wiek,
      wynajemNetto: getWynajemNetto(),
      ikeStrat: S.ikeStrat || "stop",
      ikePostInv: pf(S.ikePostInv),
      invInf: S.invInf === "1",
    });
    if (r.yr <= ty) {
      found = mid;
      hi = mid;
    } else lo = mid;
  }
  const r = sim({
    inv: found,
    ike,
    start,
    iS,
    wy,
    wiek,
    wynajemNetto: getWynajemNetto(),
    ikeStrat: S.ikeStrat || "stop",
    ikePostInv: pf(S.ikePostInv),
    invInf: S.invInf === "1",
  });
  sT2("mr1", PLN(Math.ceil(found / 500) * 500));
  sT2("mr2", PLN(r.G));
  sT2("mr3", PLN(ike) + "/mies.");
  sT2("mr4", PLN(r.m60) + "/mies.");
}
function swCT(t) {
  ["m", "min"].forEach((x) => {
    const d = g("ck-" + x);
    if (d) d.style.display = x === t ? "block" : "none";
    const b = g("ct-" + x);
    if (b) b.className = "tbn" + (x === t ? " on" : "");
  });
  if (t === "min") cMin();
}

function cWyp() {
  const kw = pf(g("wyp-kwota")?.value);
  const p1 = +g("wyp-s1").value,
    p2 = +g("wyp-s2").value;
  const p3 = Math.max(0, 100 - p1 - p2);
  sT2("wyp-sv1", p1 + "%");
  sT2("wyp-sv2", p2 + "%");
  sT2("wyp-sv3", p3 + "%");
  const s3 = g("wyp-s3");
  if (s3) s3.value = p3;
  const el = g("wyp-res");
  if (!el) return;
  if (!kw) {
    el.innerHTML = `<div style="text-align:center;padding:16px;color:var(--mu);font-size:12px">Wpisz kwotę do rozliczenia</div>`;
    return;
  }
  const wak = (kw * p1) / 100,
    wyd = (kw * p2) / 100,
    inv = (kw * p3) / 100;
  const firePlan = pf(S.inv) || 0;
  const fireMatch =
    inv >= firePlan && firePlan > 0
      ? `<div style="font-size:10px;color:var(--gr);margin-top:3px">✓ Pokrywa plan FIRE (${PLN(firePlan)})</div>`
      : firePlan > 0
        ? `<div style="font-size:10px;color:var(--re);margin-top:3px">⚠ Brakuje ${PLN(firePlan - inv)} do planu FIRE</div>`
        : "";
  el.innerHTML = `<div class="rg" style="margin-top:0">
    <div class="ri"><div class="rl">Wakacje (${p1}%)</div><div class="rn" style="color:var(--bl)">${PLN(wak)}</div></div>
    <div class="ri"><div class="rl">Wydatki niepl. (${p2}%)</div><div class="rn" style="color:var(--pu)">${PLN(wyd)}</div></div>
    <div class="ri"><div class="rl">Inwestycje (${p3}%)</div><div class="rn" style="color:var(--go)">${PLN(inv)}</div></div>
  </div>${fireMatch}`;
}
