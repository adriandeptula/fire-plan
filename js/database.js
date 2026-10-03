// ── SUPABASE ──
//
// ZASADY BEZPIECZEŃSTWA DANYCH (v21 — po incydencie z utratą aktywów, 10.2026):
//  1. Zapis do bazy jest dozwolony TYLKO gdy dbReady === true, czyli gdy
//     ostatnie wczytanie (loadDB) zakończyło się w całości powodzeniem.
//     Wcześniej błąd odczytu (np. 503 tuż po wznowieniu projektu Supabase)
//     zostawiał w pamięci pusty stan, a pierwszy zapis nadpisywał nim bazę.
//  2. NIGDY nie kasujemy "wszystkiego i wstawiamy od nowa". saveA() wysyła
//     tylko różnice: INSERT nowych, UPDATE zmienionych, DELETE wskazanych id.
//  3. Przy błędzie zapisu stan lokalny jest cofany (commitAssets) —
//     nie przeładowujemy danych z serwera "na ślepo".
//  4. Po każdym udanym zapisie robimy kopię w localStorage (patrz writeBackup);
//     gdy baza jest nagle pusta, a kopia nie — aplikacja proponuje przywrócenie.

let dbReady = false; // true = dane z bazy wczytane poprawnie, zapis dozwolony
let dbRows = new Map(); // id aktywa -> JSON wiersza, tak jak jest teraz w bazie
let sPending = false; // czeka debounced zapis ustawień

const BACKUP_KEY = "fire-backup-v1";
const DB_RETRY_DELAYS = [0, 1500, 3000, 5000, 8000, 12000]; // ~30 s łącznie

function setSS(s) {
  const d = g("sd");
  if (d)
    d.className = "sd" + (s === "sy" ? " sy" : s === "er" ? " er" : "");
}

// ── Komunikat o stanie bazy (pasek u góry ekranu, tworzony dynamicznie) ──
function showDbNotice(text, { reload = false, kind = "warn" } = {}) {
  let el = g("db-notice");
  if (!el) {
    el = document.createElement("div");
    el.id = "db-notice";
    el.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:9999;padding:10px 14px;" +
      'font:600 12px "Syne",sans-serif;display:flex;gap:10px;align-items:center;' +
      "justify-content:center;flex-wrap:wrap;text-align:center";
    document.body.appendChild(el);
  }
  const bad = kind === "error";
  el.style.background = bad ? "#5a1d26" : "#4a3b12";
  el.style.color = bad ? "#ffb4bd" : "#f0c866";
  el.style.borderBottom = "1px solid " + (bad ? "#e05a6a" : "#d4a843");
  el.innerHTML = "";
  const span = document.createElement("span");
  span.textContent = text;
  el.appendChild(span);
  if (reload) {
    const b = document.createElement("button");
    b.textContent = "↻ Odśwież";
    b.className = "btn bgh bsm";
    b.onclick = () => location.reload();
    el.appendChild(b);
  }
  el.style.display = "flex";
}
function hideDbNotice() {
  const el = g("db-notice");
  if (el) el.style.display = "none";
}

// Blokada zapisu, gdy dane nie zostały poprawnie wczytane.
function requireDb() {
  if (dbReady) return true;
  dlgAlert(
    "Dane z bazy nie zostały poprawnie wczytane, więc zapis jest zablokowany — " +
      "żeby nie nadpisać Twoich zapisanych danych pustymi. " +
      "Odśwież stronę (przy świeżo wznowionej bazie poczekaj minutę).",
    "⛔",
  );
  return false;
}

// ── Mapowanie aktywo <-> wiersz tabeli assets ──
function rowToAsset(r) {
  return {
    id: r.id,
    type: r.type,
    ticker: r.ticker,
    units: r.units,
    mv: r.manual_val,
    wynajem: r.wynajem_kwota || r.wynajem || 0,
    konto: r.konto,
    n: r.nazwa,
    cur: r.cur || null,
  };
}
function assetToRow(a) {
  return {
    type: a.type,
    ticker: a.ticker,
    units: a.units,
    manual_val: a.mv,
    wynajem_kwota: a.wynajem || 0,
    konto: a.konto,
    nazwa: a.n,
    cur: a.cur || null,
  };
}

// Zapytanie z ponowieniami. Tuż po wznowieniu projektu PostgREST przez chwilę
// zwraca 503 (PGRST002 "Could not query the database for the schema cache").
async function withRetry(label, fn) {
  let last = null;
  for (let i = 0; i < DB_RETRY_DELAYS.length; i++) {
    if (DB_RETRY_DELAYS[i]) await new Promise((r) => setTimeout(r, DB_RETRY_DELAYS[i]));
    if (i > 0)
      showDbNotice(
        `Łączenie z bazą (${label})… próba ${i + 1}/${DB_RETRY_DELAYS.length}. Jeśli projekt był uśpiony, to normalne.`,
      );
    let res;
    try {
      res = await fn();
    } catch (e) {
      res = { data: null, error: { message: String(e && e.message || e) }, status: 0 };
    }
    if (!res.error) return res;
    last = res;
    const st = res.status || 0;
    const retryable = st === 0 || st >= 500 || st === 408 || st === 429;
    console.warn(`[db] ${label}: próba ${i + 1} nieudana`, st, res.error.message);
    if (!retryable) break; // np. 401/403 — ponawianie nic nie da
  }
  const err = new Error(last?.error?.message || "Błąd bazy danych");
  err.status = last?.status || 0;
  throw err;
}

// ── KOPIA ZAPASOWA W PRZEGLĄDARCE ──
function settingsPayload() {
  return {
    ...S,
    H,
    portHistory,
    portSnapshots,
    loans,
    liabilities,
    _wynajemMap: A.filter((a) => a.wynajem).map((a) => [a.id, a.wynajem]),
  };
}
function readBackup() {
  try {
    const raw = JSON.parse(localStorage.getItem(BACKUP_KEY) || "{}");
    const bk = raw.lastNonEmpty;
    if (bk && user && bk.uid === user.id && Array.isArray(bk.A) && bk.A.length) return bk;
  } catch (e) {}
  return null;
}
// clearIfEmpty = true tylko po UDANYM zapisie aktywów wykonanym przez użytkownika:
// pusta lista oznacza wtedy świadome usunięcie, więc stara kopia nie jest już potrzebna.
function writeBackup(clearIfEmpty = false) {
  if (!user || !dbReady) return;
  try {
    const raw = JSON.parse(localStorage.getItem(BACKUP_KEY) || "{}");
    const cur = {
      uid: user.id,
      ts: new Date().toISOString(),
      A: A.map((a) => ({ ...a })),
      settings: settingsPayload(),
    };
    raw.latest = cur;
    if (A.length) raw.lastNonEmpty = cur;
    else if (clearIfEmpty) delete raw.lastNonEmpty;
    localStorage.setItem(BACKUP_KEY, JSON.stringify(raw));
  } catch (e) {}
}
function clearBackup() {
  try { localStorage.removeItem(BACKUP_KEY); } catch (e) {}
}

// ── WCZYTANIE ──
// Zwraca true tylko gdy WSZYSTKO wczytano poprawnie. Stan globalny (A, S, H…)
// jest podmieniany dopiero na końcu, więc nieudane wczytanie niczego nie psuje.
async function loadDB() {
  if (!user) return false;
  dbReady = false;
  setSS("sy");
  let rowsRes, setRes;
  try {
    rowsRes = await withRetry("aktywa", () =>
      sb.from("assets").select("*").eq("user_id", user.id),
    );
    setRes = await withRetry("ustawienia", () =>
      sb.from("settings").select("data").eq("user_id", user.id).maybeSingle(),
    );
  } catch (e) {
    console.error("[db] loadDB nieudane:", e);
    setSS("er");
    showDbNotice(
      "Nie udało się wczytać danych z bazy (" + e.message + "). Twoje dane w bazie NIE zostały zmienione, " +
        "a zapis jest zablokowany. Odśwież stronę za chwilę.",
      { reload: true, kind: "error" },
    );
    return false;
  }

  const dbAssets = (rowsRes.data || []).map(rowToAsset);
  let d = setRes.data && setRes.data.data ? JSON.parse(JSON.stringify(setRes.data.data)) : null;
  let newA = dbAssets;
  let restore = null;

  // Baza bez aktywów, a w przeglądarce jest niepusta kopia → coś usunęło dane
  // spoza aplikacji (albo incydent jak ten z 10.2026). Zaproponuj przywrócenie.
  const bk = readBackup();
  if (!dbAssets.length && bk) {
    const when = new Date(bk.ts).toLocaleString("pl-PL");
    const ok = await dlgConfirm(
      `Baza nie zawiera żadnych aktywów, ale ta przeglądarka ma kopię zapasową z ${when} (${bk.A.length} pozycji). Przywrócić ją do bazy?`,
      "♻️",
      "Przywróć",
      "Nie teraz",
    );
    if (ok) {
      restore = bk;
      newA = bk.A.map((a) => ({ ...a }));
      const bs = bk.settings || {};
      if (!d) d = { ...bs };
      else
        for (const k of ["H", "portHistory", "portSnapshots", "loans", "liabilities", "_savedIncs"])
          if ((!d[k] || !d[k].length) && bs[k] && bs[k].length) d[k] = bs[k];
    }
  }

  // Wszystko wczytane — dopiero teraz podmieniamy stan globalny.
  dbRows = new Map(dbAssets.map((a) => [String(a.id), JSON.stringify(assetToRow(a))]));
  A = newA;
  if (d) {
    if (d.H) { H = d.H; delete d.H; }
    if (d.portHistory) { portHistory = d.portHistory; delete d.portHistory; }
    if (d.portSnapshots) { portSnapshots = d.portSnapshots; delete d.portSnapshots; }
    if (d.loans) { loans = d.loans; delete d.loans; }
    if (d.liabilities) { liabilities = d.liabilities; delete d.liabilities; }
    // _savedIncs zostaje w S (żeby kolejne zapisy ustawień go nie kasowały!)
    if (d._savedIncs) incs = JSON.parse(JSON.stringify(d._savedIncs));
    if (d._wynajemMap) {
      d._wynajemMap.forEach(([id, val]) => {
        const asset = A.find((a) => sameId(a.id, id));
        if (asset && !asset.wynajem) asset.wynajem = val;
      });
      delete d._wynajemMap;
    }
    // Migracja: stary _curMap -> pole cur w aktywie
    if (d._curMap) {
      d._curMap.forEach(([id, cur]) => {
        const asset = A.find((a) => sameId(a.id, id));
        if (asset && !asset.cur) asset.cur = cur;
      });
      delete d._curMap;
    }
    S = { ...S, ...d };
  }
  apS(); // zawsze: wpisuje S do pól formularza (także domyślne wartości nowego konta)

  dbReady = true;
  hideDbNotice();
  setSS("ok");
  if (restore) {
    await saveA();
    await saveSettingsNow();
  } else if (A.length) {
    writeBackup();
  }
  rA();
  return true;
}

// ── ZAPIS AKTYWÓW (tylko różnice) ──
let _saveChain = Promise.resolve();
function saveA() {
  // kolejkujemy zapisy, żeby dwa naraz nie wchodziły sobie w drogę
  const run = _saveChain.then(_saveAInner);
  _saveChain = run.catch(() => {});
  return run;
}
async function _saveAInner() {
  if (!user || !dbReady) return false;
  setSS("sy");
  try {
    const current = new Map();
    A.forEach((a) => current.set(String(a.id), a));

    const toInsert = [], toUpdate = [], toDelete = [];
    current.forEach((a, id) => {
      const row = assetToRow(a);
      const json = JSON.stringify(row);
      if (!dbRows.has(id)) toInsert.push({ a, id, row, json });
      else if (dbRows.get(id) !== json) toUpdate.push({ a, id, row, json });
    });
    dbRows.forEach((_, id) => { if (!current.has(id)) toDelete.push(id); });

    if (toInsert.length) {
      const { error } = await sb
        .from("assets")
        .insert(toInsert.map((x) => ({ id: x.a.id, user_id: user.id, ...x.row })));
      if (error) throw new Error("Insert: " + error.message);
      toInsert.forEach((x) => dbRows.set(x.id, x.json));
    }
    for (const x of toUpdate) {
      const { error } = await sb
        .from("assets")
        .update(x.row)
        .eq("id", x.a.id)
        .eq("user_id", user.id);
      if (error) throw new Error("Update: " + error.message);
      dbRows.set(x.id, x.json);
    }
    if (toDelete.length) {
      const { error } = await sb
        .from("assets")
        .delete()
        .in("id", toDelete)
        .eq("user_id", user.id);
      if (error) throw new Error("Delete: " + error.message);
      toDelete.forEach((id) => dbRows.delete(id));
    }

    setSS("ok");
    hideDbNotice();
    writeBackup(true);
    return true;
  } catch (e) {
    console.error("saveA error:", e.message);
    setSS("er");
    return false;
  }
}

// Zmiana aktywów "jak transakcja": mutate() modyfikuje A / portHistory,
// potem zapis. Jeśli zapis się nie uda — stan lokalny wraca do poprzedniego,
// a użytkownik dostaje komunikat (nic nie znika po cichu).
async function commitAssets(mutate) {
  if (!requireDb()) return false;
  const A0 = A.map((a) => ({ ...a }));
  const PH0 = portHistory.slice();
  mutate();
  const ok = await saveA();
  if (!ok) {
    A = A0;
    portHistory = PH0;
    rA();
    await dlgAlert(
      "Nie udało się zapisać zmian w bazie. Cofnąłem zmianę na ekranie — Twoje dane w bazie są bezpieczne. " +
        "Sprawdź połączenie / zaloguj się ponownie i spróbuj jeszcze raz.",
      "⚠️",
    );
    return false;
  }
  await saveSettingsNow(); // historia transakcji (portHistory) leży w settings
  rA();
  return true;
}

// ── ZAPIS USTAWIEŃ ──
async function persistSettings() {
  if (!user || !dbReady) return false;
  setSS("sy");
  const { error } = await sb.from("settings").upsert(
    {
      user_id: user.id,
      data: settingsPayload(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("settings save error:", error.message);
    setSS("er");
    showDbNotice("Nie udało się zapisać ustawień w bazie: " + error.message, { kind: "error" });
    return false;
  }
  setSS("ok");
  hideDbNotice();
  writeBackup();
  return true;
}

// Debounced zapis ustawień (800 ms). Zwraca od razu — NIE czeka na zapis.
// Gdy zapis musi być pewny (zobowiązania, pożyczki, historia) użyj saveSettingsNow().
function sS() {
  colS();
  if (!user || !dbReady) return;
  clearTimeout(sT);
  sPending = true;
  sT = setTimeout(async () => {
    sPending = false;
    await persistSettings();
  }, 800);
}

// Natychmiastowy zapis ustawień bez debounce. Zwraca true/false.
async function saveSettingsNow() {
  colS();
  if (!user || !dbReady) return false;
  clearTimeout(sT);
  sPending = false;
  return persistSettings();
}

// Nie gub zmian, gdy ktoś zamyka kartę w ciągu 800 ms od edycji.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && sPending) saveSettingsNow();
});
