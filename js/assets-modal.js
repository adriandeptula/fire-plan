// ── ASSET MODAL ──
let editingId = null;
let editingGroup = []; // wszystkie wpisy edytowanej pozycji (duplikaty tego samego tickera/konta)
const EPS = 1e-9; // tolerancja na błędy zmiennoprzecinkowe przy sprzedaży
const PAG = {
  assets: { page: 0, perPage: 10 },
  hist: { page: 0, perPage: 10 },
};

function newAssetId() {
  let id = Date.now();
  while (A.some((a) => sameId(a.id, id))) id++;
  return String(id);
}

function resetAM() {
  const aop = g("aop");
  if (aop) aop.value = "buy"; // wcześniej zostawała poprzednia operacja (np. "Sprzedaż")
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
  editingGroup = [];
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
  const a = A.find((x) => sameId(x.id, id));
  if (!a) return;
  editingId = a.id;
  const isNier = a.type === "nier-sprzedaz" || a.type === "nier-wynajem";
  // Nieruchomości edytujemy pojedynczo; reszta to jedna pozycja tabeli = wszystkie
  // wpisy o tym samym typie/tickerze/koncie (po zapisie scalą się w jeden).
  editingGroup = isNier
    ? [a]
    : A.filter((x) => x.type === a.type && x.ticker === a.ticker && x.konto === a.konto);
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
        : `${a.type}:${a.ticker}`;
  const sel = g("atype");
  let found = false;
  for (const opt of sel.options) {
    if (opt.value === typeVal) { sel.value = typeVal; found = true; break; }
  }
  if (!found) {
    // Ticker spoza listy: ETF / akcja / krypto -> "Inny ..." z wpisanym tickerem.
    // (Wcześniej brakowało akcji — edycja np. MSFT zapisywała aktywo z pustym typem.)
    if (a.type === "etf" || a.type === "stock" || a.type === "crypto") {
      sel.value = `${a.type}:OTHER`;
      g("atick").value = a.ticker;
    } else if (a.type === "manual") {
      sel.value = "manual:INNE";
    }
  }
  onTC();
  const isManual = a.type === "manual";
  const totalUnits = editingGroup.reduce((s, x) => s + pf(x.units), 0);
  const totalMv = editingGroup.reduce((s, x) => s + pf(x.mv), 0);
  if (!isNier && !isManual && totalUnits) g("aunits").value = parseFloat(totalUnits.toFixed(10));
  if (a.wynajem) g("awynajem").value = a.wynajem;
  if (isManual) { if (totalMv) g("amval").value = totalMv; }
  else if (a.mv) g("amval").value = a.mv;
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
  if (!requireDb()) return;
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
  if (!tg || !t.includes(":")) { await dlgAlert("Wybierz typ aktywa.", "⚠️"); return; }
  if (!ticker && !isNier) { await dlgAlert("Podaj ticker aktywa.", "⚠️"); return; }
  if (!isNier && !isManual && units <= 0) { await dlgAlert("Podaj ilość jednostek większą od 0.", "⚠️"); return; }
  if (tg === "nier-wynajem" && !wynajem) { await dlgAlert("Podaj kwotę wynajmu miesięcznego.", "⚠️"); return; }
  if ((isManual || tg === "nier-sprzedaz") && !mv) { await dlgAlert("Podaj wartość rynkową.", "⚠️"); return; }

  const histEntry = (opName) => ({
    id: uuid(), op: opName, type: tg, ticker, n, units: isManual ? 0 : units,
    mv: isManual || tg === "nier-sprzedaz" ? mv : 0,
    wynajem: tg === "nier-wynajem" ? wynajem : 0, konto,
    ts: new Date().toISOString(),
  });
  const pushHistory = (entry) => {
    portHistory.push(entry);
    if (portHistory.length > 500) portHistory = portHistory.slice(-500);
  };

  // ── SPRZEDAŻ ──
  if (op === "sell" && !editingId) {
    if (isNier) {
      await dlgAlert("Nieruchomość usuń przyciskiem ✕ przy jej wpisie w tabeli.", "ℹ️");
      return;
    }
    const matching = A.filter((a) => a.type === tg && a.ticker === ticker && a.konto === konto);
    if (!matching.length) {
      await dlgAlert("Nie znaleziono aktywa do sprzedaży. Sprawdź ticker i konto (IKE / Poza IKE).", "⚠️");
      return;
    }
    const held = matching.reduce((s, a) => s + pf(isManual ? a.mv : a.units), 0);
    const want = isManual ? mv : units;
    if (want > held + EPS) {
      await dlgAlert(
        `Próbujesz sprzedać więcej niż masz (${isManual ? PLN(held) : fmtUnits(held)}).`,
        "⚠️",
      );
      return;
    }
    const ok = await commitAssets(() => {
      // Odejmuj od wpisów po kolei — obsługuje wiele wpisów (duplikaty legacy)
      let rem = want;
      for (const a of matching) {
        if (rem <= EPS) break;
        const field = isManual ? "mv" : "units";
        const reduce = Math.min(pf(a[field]), rem);
        a[field] = pf(a[field]) - reduce;
        rem -= reduce;
      }
      const field = isManual ? "mv" : "units";
      A = A.filter((a) => !(a.type === tg && a.ticker === ticker && a.konto === konto && pf(a[field]) <= EPS));
      pushHistory(histEntry("sell"));
    });
    if (!ok) return;
    closeAM();
    await refP(true);
    return;
  }

  // ── KUPNO / EDYCJA ──
  const ok = await commitAssets(() => {
    if (editingId) {
      // Edycja: pierwszy wpis grupy dostaje nowe wartości, pozostałe duplikaty znikają
      const gids = editingGroup.map((x) => String(x.id));
      const old = A.find((a) => sameId(a.id, editingId));
      const asset = { id: editingId, type: tg, ticker, units, mv, wynajem, konto, n, cur: stockCur };
      if (!old) { A.push(asset); }
      else
        A = A.filter((a) => !gids.includes(String(a.id)) || sameId(a.id, editingId)).map((a) =>
          sameId(a.id, editingId) ? asset : a,
        );
      pushHistory(histEntry("edit"));
    } else if (isNier) {
      // Każda nieruchomość to osobny wpis (wcześniej kolejna była "scalana" z pierwszą
      // i jej wartość / czynsz były gubione).
      A.push({
        id: newAssetId(), type: tg, ticker: "NIER", units: 1,
        mv: tg === "nier-sprzedaz" ? mv : 0,
        wynajem: tg === "nier-wynajem" ? wynajem : 0,
        konto: "poza", n, cur: null,
      });
      pushHistory(histEntry("buy"));
    } else if (isManual) {
      // Obligacje / inne ręczne — scal wartość z istniejącym wpisem
      const existing = A.find((a) => a.type === tg && a.ticker === ticker && a.konto === konto);
      if (existing) {
        existing.mv = pf(existing.mv) + mv;
        if (userNazwa) existing.n = userNazwa;
      } else {
        A.push({ id: newAssetId(), type: tg, ticker, units: 0, mv, wynajem: 0, konto, n, cur: null });
      }
      pushHistory(histEntry("buy"));
    } else {
      // ETF / stock / crypto — scal units z istniejącym wpisem (ten sam typ + ticker + konto)
      const existing = A.find((a) => a.type === tg && a.ticker === ticker && a.konto === konto);
      if (existing) {
        existing.units = pf(existing.units) + units;
        if (userNazwa) existing.n = userNazwa;
        if (stockCur) existing.cur = stockCur;
      } else {
        A.push({ id: newAssetId(), type: tg, ticker, units, mv: 0, wynajem: 0, konto, n, cur: stockCur });
      }
      pushHistory(histEntry("buy"));
    }
  });
  if (!ok) return;
  closeAM();
  await refP(true);
}

async function delA(id) {
  const ok = await dlgConfirm("Usunąć to aktywo?", "🗑️", "Usuń", "Anuluj", true);
  if (!ok) return;
  await commitAssets(() => {
    A = A.filter((a) => !sameId(a.id, id));
  });
}
