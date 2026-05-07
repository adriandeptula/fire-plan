// ── MONTHLY CALC ──
function rMies() {
  const sel = g("mmies");
  if (sel && sel.options.length === 0) {
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      sel.appendChild(
        new Option(`${MO[d.getMonth()]} ${d.getFullYear()}`, val),
      );
    }
  }
  rIncs();
  cMies();
}
function rIncs() {
  const el = g("inc-list");
  if (!el) return;
  el.innerHTML = incs
    .map(
      (s, i) => `<div style="display:flex;gap:7px;align-items:center;margin-bottom:7px">
    <input class="fi" placeholder="Nazwa (np. Wypłata A)" value="${s.n}" oninput="incs[${i}].n=this.value;cMies()" style="flex:1;min-width:0">
    <div style="position:relative;flex-shrink:0;width:110px"><input class="fi" type="number" placeholder="0" value="${s.k}" oninput="incs[${i}].k=this.value;cMies()" style="padding-right:26px"><span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--mu);pointer-events:none">zł</span></div>
    ${incs.length > 1 ? `<button class="del" onclick="rmInc(${i})">✕</button>` : ""}
  </div>`,
    )
    .join("");
}
function addInc() {
  incs.push({ id: Date.now(), n: "", k: "" });
  rIncs();
}
function rmInc(i) {
  incs.splice(i, 1);
  rIncs();
  cMies();
}
function cMies() {
  const tot = incs.reduce((s, x) => s + pf(x.k), 0);
  sT2("mtot", PLN(tot));
  const wyd = pf(S.wyd),
    roz = pf(S.roz),
    kRa = getTotalLiabilities() / 12,
    pw = pf(S.pw) || 10,
    pr = pf(S.pr) || 10,
    pi = Math.max(0, 100 - pw - pr);
  const st = wyd + roz + kRa,
    nad = Math.max(0, tot - st),
    wak = (nad * pw) / 100,
    rez = (nad * pr) / 100,
    inv = (nad * pi) / 100,
    fi = pf(S.inv) || 0;
  const el = g("msplit");
  if (!el) return;
  if (!tot) {
    el.innerHTML = `<div class="em" style="padding:16px 0"><div class="ems">Wpisz dochody żeby zobaczyć podział</div></div>`;
    return;
  }
  const row = (l, v, c = "var(--t)") =>
    `<div class="ir"><span class="ik">${l}</span><span class="iv" style="color:${c}">${PLN(v)}</span></div>`;
  const fm =
    inv >= fi && fi > 0
      ? `<div style="font-size:10px;color:var(--gr);margin-top:2px">✓ Pokrywa plan FIRE (${PLN(fi)})</div>`
      : fi > 0
        ? `<div style="font-size:10px;color:var(--re);margin-top:2px">⚠ Brakuje ${PLN(fi - inv)} do planu</div>`
        : "";
  el.innerHTML = `${row("Łączny dochód", tot, "var(--gr)")}<hr>${row("− Wydatki", wyd)}${row("− Rozrywka", roz)}${kRa ? row("− Kredyt", kRa) : ""}<hr>${row("= Nadwyżka", nad, "var(--go)")}<hr>${row(`Wakacje (${pw}%)`, wak, "var(--bl)")}${row(`Rezerwa (${pr}%)`, rez, "var(--pu)")}
  <div style="background:var(--gob);border:1px solid var(--goc);border-radius:4px;padding:9px 10px;margin-top:7px"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:700;font-size:12px">🔥 Inwestycje (${pi}%)</span><span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500;color:var(--go)">${PLN(inv)}</span></div>${fm}</div>`;
}
async function rozlicz() {
  const tot = incs.reduce((s, x) => s + pf(x.k), 0);
  if (!tot) {
    await dlgAlert("Wpisz przynajmniej jeden dochód.", "⚠️");
    return;
  }
  const mies = g("mmies")?.value;
  if (!mies) return;
  const ex = H.findIndex((h) => h.k === mies);
  const entry = { k: mies, d: tot, ts: new Date().toISOString() };
  if (ex >= 0) {
    const ok = await dlgConfirm(
      "Ten miesiąc już rozliczony. Nadpisać?",
      "📅",
      "Nadpisz",
      "Anuluj",
    );
    if (!ok) return;
    H[ex] = entry;
  } else H.push(entry);
  await sS();
  incs = [{ id: Date.now(), n: "", k: "" }];
  rIncs();
  cMies();
  const btn = document.querySelector('[onclick="rozlicz()"]');
  if (btn) {
    const o = btn.textContent;
    btn.textContent = "✓ Zapisano!";
    btn.style.background = "var(--gr)";
    setTimeout(() => {
      btn.textContent = o;
      btn.style.background = "";
    }, 2000);
  }
  rHist();
}
function rHist() {
  const sel = g("hrok");
  if (!sel) return;
  const yrs = [...new Set(H.map((h) => h.k.split("-")[0]))]
    .sort()
    .reverse();
  if (!yrs.length) {
    g("htbl").innerHTML =
      `<div class="em"><div class="emi">📅</div><div class="emt">Brak historii</div><div class="ems">Rozlicz pierwszy miesiąc</div></div>`;
    g("hkpi").innerHTML = "";
    return;
  }
  const cy = sel.value || yrs[0];
  sel.innerHTML = yrs
    .map((y) => `<option value="${y}" ${y === cy ? "selected" : ""}>${y}</option>`)
    .join("");
  const yd = H.filter((h) => h.k.startsWith(cy)).sort((a, b) =>
    a.k.localeCompare(b.k),
  );
  const totR = yd.reduce((s, h) => s + h.d, 0),
    avgM = yd.length ? totR / yd.length : 0;
  g("hkpi").innerHTML =
    `<div style="background:var(--s);border:1px solid var(--b);border-radius:5px;padding:8px 12px;text-align:center"><div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--mu);margin-bottom:3px">SUMA ${cy}</div><div style="font-family:'Lora',serif;font-size:16px;font-weight:600;color:var(--go)">${PLN(totR)}</div></div><div style="background:var(--s);border:1px solid var(--b);border-radius:5px;padding:8px 12px;text-align:center"><div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--mu);margin-bottom:3px">ŚREDNIA</div><div style="font-family:'Lora',serif;font-size:16px;font-weight:600">${PLN(avgM)}</div></div><div style="background:var(--s);border:1px solid var(--b);border-radius:5px;padding:8px 12px;text-align:center"><div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--mu);margin-bottom:3px">MIESIĘCY</div><div style="font-family:'Lora',serif;font-size:16px;font-weight:600">${yd.length}/12</div></div>`;
  const rows = Array.from({ length: 12 }, (_, i) => {
    const key = `${cy}-${String(i + 1).padStart(2, "0")}`;
    const e = yd.find((h) => h.k === key);
    return `<tr><td style="font-weight:600">${MO[i]}</td><td class="mn">${e ? PLN(e.d) : '<span style="color:var(--mu)">—</span>'}</td><td>${e ? `<button class="del" onclick="delM('${key}')">✕</button>` : ""}</td></tr>`;
  }).join("");
  const sumR = `<tr style="background:var(--s2)"><td style="font-weight:700">SUMA</td><td class="mn" style="color:var(--go);font-weight:700">${PLN(totR)}</td><td></td></tr>`;
  g("htbl").innerHTML =
    `<table><thead><tr><th>Miesiąc</th><th>Dochód</th><th></th></tr></thead><tbody>${rows}${sumR}</tbody></table>`;
}
async function delM(key) {
  const ok = await dlgConfirm(
    "Usunąć ten miesiąc z historii?",
    "🗑️",
    "Usuń",
    "Anuluj",
    true,
  );
  if (!ok) return;
  H = H.filter((h) => h.k !== key);
  await sS();
  rHist();
}
function swMT(t) {
  g("mt-kalk").style.display = t === "k" ? "block" : "none";
  g("mt-hist").style.display = t === "h" ? "block" : "none";
  g("mt-k").className = "tbn" + (t === "k" ? " on" : "");
  g("mt-h").className = "tbn" + (t === "h" ? " on" : "");
  if (t === "h") rHist();
  if (t === "k") rMies();
}

// ── KALKULATOR SAVE ──
async function zapiszKalk() {
  S._savedIncs = JSON.parse(JSON.stringify(incs));
  await sS();
  const btn = document.querySelector('[onclick="zapiszKalk()"]');
  if (btn) {
    const o = btn.textContent;
    btn.textContent = "✓ Zapisano!";
    btn.style.background = "var(--gr)";
    setTimeout(() => {
      btn.textContent = o;
      btn.style.background = "";
    }, 2000);
  }
}
