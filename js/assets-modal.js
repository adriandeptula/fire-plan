// ── ASSET MODAL ──
let editingId = null;
const PAG = {
  assets: { page: 0, perPage: 10 },
  hist: { page: 0, perPage: 10 },
};

function resetAM() {
  g("atype").value = "etf:IS3N.DE";
  g("atick").value = "";
  g("aunits").value = "";
  g("awynajem").value = "";
  g("amval").value = "";
  g("anazwa").value = "";
  g("akonto").value = "poza";
  const acurEl = g("acur");
  if (acurEl) acurEl.value = "USD";
  onTC();
}

function openAM() {
  editingId = null;
  resetAM();
  g("am-title").textContent = "Dodaj aktywo";
  g("am-save").textContent = "Dodaj";
  const atypeRow = g("atype-row");
  if (atypeRow) atypeRow.style.display = "block";
  g("am").classList.add("on");
}

function closeAM() {
  g("am").classList.remove("on");
}

function editA(id) {
  const a = A.find((x) => x.id === id);
  if (!a) return;
  editingId = id;
  resetAM();
  g("am-title").textContent = "Edytuj aktywo";
  g("am-save").textContent = "Zapisz zmiany";
  const atypeRow = g("atype-row");
  if (atypeRow) atypeRow.style.display = "none";
  const typeVal =
    a.type === "nier-sprzedaz"
      ? "nier-sprzedaz:NIER"
      : a.type === "nier-wynajem"
        ? "nier-wynajem:NIER"
        : a.type === "manual"
          ? `manual:${a.ticker}`
          : `${a.type}:${a.ticker}`;
  const sel = g("atype");
  let found = false;
  for (const opt of sel.options) {
    if (opt.value === typeVal) { sel.value = typeVal; found = true; break; }
  }
  if (!found) {
    if (a.type === "etf") { sel.value = "etf:OTHER"; g("atick").value = a.ticker; }
    else if (a.type === "crypto") { sel.value = "crypto:OTHER"; g("atick").value = a.ticker; }
    else sel.value = typeVal;
  }
  onTC();
  const isNier = a.type === "nier-sprzedaz" || a.type === "nier-wynajem";
  const isManual = a.type === "manual";
  if (!isNier && !isManual && a.units) g("aunits").value = a.units;
  if (a.wynajem) g("awynajem").value = a.wynajem;
  if (a.mv) g("amval").value = a.mv;
  if (a.n) g("anazwa").value = a.n;
  if (a.konto) g("akonto").value = a.konto;
  if (a.cur && g("acur")) g("acur").value = a.cur;
  g("am").classList.add("on");
}

function onTC() {
  const t = g("atype").value;
  const isOther = t.endsWith(":OTHER"),
    isManual = t.startsWith("manual"),
    isNierSprzedaz = t.startsWith("nier-sprzedaz"),
    isNierWynajem = t.startsWith("nier-wynajem"),
    isNier = isNierSprzedaz || isNierWynajem,
    isStock = t.startsWith("stock");
  g("atrow").style.display = isOther ? "block" : "none";
  g("aurow").style.display = isManual || isNier ? "none" : "block";
  g("awynajem-row").style.display = isNierWynajem ? "block" : "none";
  g("amrow").style.display = isManual || isNierSprzedaz ? "block" : "none";
  g("akonto-row").style.display = isNier ? "none" : "block";
  g("acur-row").style.display = isStock ? "block" : "none";
  if (isManual || isNier) g("aunits").value = "";
  if (!isNierWynajem) g("awynajem").value = "";
  if (!isManual && !isNierSprzedaz) g("amval").value = "";
  if (isStock) g("aulbl").textContent = "Ilość akcji";
  else if (t.startsWith("crypto")) g("aulbl").textContent = "Ilość (np. 0.0002)";
  else g("aulbl").textContent = "Ilość jednostek";
}

function getTickerName(ticker, type) {
  if (type === "nier-sprzedaz") return "Nieruchomość";
  if (type === "nier-wynajem") return "Wynajem";
  if (TICKER_NAMES[ticker]) return TICKER_NAMES[ticker];
  return ticker;
}

function fmtUnits(u) {
  if (u === 0 || u === "" || u === null || u === undefined) return "—";
  const n = parseFloat(u);
  if (isNaN(n) || n === 0) return "—";
  return n % 1 === 0 ? String(n) : parseFloat(n.toFixed(8)).toString();
}

async function saveAsset() {
  const op = g("aop")?.value || "buy";
  const t = g("atype").value,
    [tg, td] = t.split(":");
  const ticker = td === "OTHER" ? g("atick").value.trim().toUpperCase() : td;
  const isNier = tg === "nier-sprzedaz" || tg === "nier-wynajem";
  const isManual = tg === "manual";
  const units = isNier ? 1 : isManual ? 0 : pf(g("aunits").value);
  const wynajem = pf(g("awynajem").value);
  const mv = pf(g("amval").value);
  const konto = isNier ? "poza" : g("akonto").value;
  const stockCur = tg === "stock" ? g("acur")?.value || "USD" : null;
  const userNazwa = g("anazwa").value.trim();
  const n = userNazwa || getTickerName(ticker, tg);

  // Walidacja
  if (!ticker && !isNier) { await dlgAlert("Podaj ticker aktywa.", "⚠️"); return; }
  if (!isNier && !isManual && units <= 0) { await dlgAlert("Podaj ilość jednostek większą od 0.", "⚠️"); return; }
  if (tg === "nier-wynajem" && !wynajem) { await dlgAlert("Podaj kwotę wynajmu miesięcznego.", "⚠️"); return; }
  if ((isManual || tg === "nier-sprzedaz") && !mv) { await dlgAlert("Podaj wartość rynkową.", "⚠️"); return; }

  // ── SPRZEDAŻ ──
  if (op === "sell" && !editingId) {
    if (isManual) {
      // Odejmuj od wpisów po kolei — obsługuje wiele wpisów (duplikaty legacy)
      let rem = mv;
      const matching = A.filter(a => a.type === tg && a.ticker === ticker && a.konto === konto);
      if (!matching.length) {
        await dlgAlert("Nie znaleziono aktywa do sprzedaży. Sprawdź ticker i konto.", "⚠️");
        return;
      }
      for (const a of matching) {
        if (rem <= 0) break;
        const reduce = Math.min(pf(a.mv), rem);
        a.mv = pf(a.mv) - reduce;
        rem -= reduce;
      }
      A = A.filter(a => !(a.type === tg && a.ticker === ticker && a.konto === konto && pf(a.mv) <= 0));
    } else {
      // ETF / stock / crypto — odejmuj units od wpisów po kolei
      let rem = units;
      const matching = A.filter(a => a.ticker === ticker && a.konto === konto && a.type === tg);
      if (!matching.length) {
        await dlgAlert("Nie znaleziono aktywa do sprzedaży. Sprawdź ticker i konto (IKE / Poza IKE).", "⚠️");
        return;
      }
      for (const a of matching) {
        if (rem <= 0) break;
        const reduce = Math.min(pf(a.units), rem);
        a.units = pf(a.units) - reduce;
        rem -= reduce;
      }
      // Usuń wpisy z zerową ilością
      A = A.filter(a => !(a.ticker === ticker && a.konto === konto && a.type === tg && pf(a.units) <= 0));
    }

    portHistory.push({
      id: uuid(), op: "sell", type: tg, ticker, n, units, mv, wynajem, konto,
      ts: new Date().toISOString(),
    });
    if (portHistory.length > 500) portHistory = portHistory.slice(-500);

    await saveA();
    sS();
    closeAM();
    rA();
    try { localStorage.removeItem(PRICE_CACHE_KEY); } catch (e) {}
    await refP(true);
    return;
  }

  // ── KUPNO / EDYCJA ──
  if (editingId) {
    // Edycja: zamień istniejący wpis
    const asset = { id: editingId, type: tg, ticker, units, mv, wynajem, konto, n, cur: stockCur };
    A = A.map((a) => (a.id === editingId ? asset : a));
    portHistory.push({
      id: uuid(), op: "edit", type: tg, ticker, n, units, mv, wynajem, konto,
      ts: new Date().toISOString(),
    });
  } else if (isManual) {
    // Obligacje / inne ręczne — scal wartość z istniejącym wpisem
    const existing = A.find(a => a.type === tg && a.ticker === ticker && a.konto === konto);
    if (existing) {
      existing.mv = pf(existing.mv) + mv;
      if (userNazwa) existing.n = userNazwa;
    } else {
      A.push({ id: Date.now().toString(), type: tg, ticker, units: 0, mv, wynajem: 0, konto, n, cur: null });
    }
    portHistory.push({
      id: uuid(), op: "buy", type: tg, ticker, n, units: 0, mv, wynajem: 0, konto,
      ts: new Date().toISOString(),
    });
  } else {
    // ETF / stock / crypto — scal units z istniejącym wpisem (ten sam ticker + konto)
    const existing = A.find(a => a.type === tg && a.ticker === ticker && a.konto === konto);
    if (existing) {
      existing.units = pf(existing.units) + units;
      if (userNazwa) existing.n = userNazwa;
      // Zachowaj cur jeśli ustawione
      if (stockCur) existing.cur = stockCur;
    } else {
      A.push({ id: Date.now().toString(), type: tg, ticker, units, mv: 0, wynajem: 0, konto, n, cur: stockCur });
    }
    portHistory.push({
      id: uuid(), op: "buy", type: tg, ticker, n, units, mv: 0, wynajem, konto,
      ts: new Date().toISOString(),
    });
  }

  if (portHistory.length > 500) portHistory = portHistory.slice(-500);

  await saveA();
  sS();
  closeAM();
  rA();
  try { localStorage.removeItem(PRICE_CACHE_KEY); } catch (e) {}
  await refP(true);
}

async function delA(id) {
  const ok = await dlgConfirm("Usunąć to aktywo?", "🗑️", "Usuń", "Anuluj", true);
  if (!ok) return;
  A = A.filter((a) => a.id !== id);
  await saveA();
  sS();
  rA();
}
