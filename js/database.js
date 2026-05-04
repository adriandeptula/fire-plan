// ── SUPABASE ──
function setSS(s) {
  const d = g("sd");
  if (d)
    d.className = "sd" + (s === "sy" ? " sy" : s === "er" ? " er" : "");
}

async function loadDB() {
  if (!user) return;
  setSS("sy");
  try {
    const { data: a, error: ae } = await sb
      .from("assets")
      .select("*")
      .eq("user_id", user.id);
    if (ae) console.warn("Assets load error:", ae.message);
    if (a)
      A = a.map((r) => ({
        id: r.id,
        type: r.type,
        ticker: r.ticker,
        units: r.units,
        mv: r.manual_val,
        wynajem: r.wynajem_kwota || r.wynajem || 0,
        konto: r.konto,
        n: r.nazwa,
        cur: r.cur || null,
      }));
  } catch (e) {
    console.warn("Assets fetch failed:", e);
  }
  try {
    const { data: s, error: se } = await sb
      .from("settings")
      .select("data")
      .eq("user_id", user.id)
      .single();
    if (se && se.code !== "PGRST116")
      console.warn("Settings load error:", se.message);
    if (s?.data) {
      const d = s.data;
      if (d.H) { H = d.H; delete d.H; }
      if (d.portHistory) { portHistory = d.portHistory; delete d.portHistory; }
      if (d.loans) { loans = d.loans; delete d.loans; }
      if (d.liabilities) { liabilities = d.liabilities; delete d.liabilities; }
      if (d._savedIncs) { incs = d._savedIncs; delete d._savedIncs; }
      if (d._wynajemMap) {
        d._wynajemMap.forEach(([id, val]) => {
          const asset = A.find((a) => a.id === id);
          if (asset && !asset.wynajem) asset.wynajem = val;
        });
        delete d._wynajemMap;
      }
      S = { ...S, ...d };
      apS();
    }
  } catch (e) {
    console.warn("Settings fetch failed:", e);
  }
  setSS("ok");
  rA();
}

// Zapisuje A[] do Supabase.
// Oryginalny pattern (delete + insert) przywrocony — upsert powodowal problemy
// z politikami RLS w Supabase. Fix wzgledem oryginalu: blad insertu teraz
// rzuca wyjatek (throw) zamiast tylko logowac — setSS("er") sie wywoluje
// i dane sa ponownie pobierane z bazy zeby przywrocic poprawny stan UI.
async function saveA() {
  if (!user) return;
  setSS("sy");
  try {
    const { error: delErr } = await sb
      .from("assets")
      .delete()
      .eq("user_id", user.id);
    if (delErr) throw new Error("Delete failed: " + delErr.message);

    if (A.length) {
      const rows = A.map((a) => ({
        id: a.id,
        user_id: user.id,
        type: a.type,
        ticker: a.ticker,
        units: a.units,
        manual_val: a.mv,
        wynajem_kwota: a.wynajem || 0,
        konto: a.konto,
        nazwa: a.n,
        cur: a.cur || null,
      }));
      const { error: insErr } = await sb.from("assets").insert(rows);
      if (insErr) throw new Error("Insert failed: " + insErr.message);
    }

    setSS("ok");
  } catch (e) {
    console.error("saveA error:", e.message);
    setSS("er");
    // Przywroc stan z bazy — lokalny A[] moze byc niezsynchronizowany
    await loadDB();
  }
}

// Debounced zapis ustawien (800ms) — uzyj dla zmian inputow.
// UWAGA: await sS() nie czeka na faktyczny zapis do Supabase.
async function sS() {
  colS();
  if (!user) return;
  clearTimeout(sT);
  sT = setTimeout(async () => {
    setSS("sy");
    try {
      await sb.from("settings").upsert(
        {
          user_id: user.id,
          data: {
            ...S,
            H,
            portHistory,
            loans,
            liabilities,
            _wynajemMap: A.filter((a) => a.wynajem).map((a) => [a.id, a.wynajem]),
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      setSS("ok");
    } catch (e) {
      setSS("er");
    }
  }, 800);
}

// Natychmiastowy zapis ustawien bez debounce.
// Uzyj gdy zapis musi byc gwarantowany (clearAll, wylogowanie).
async function saveSettingsNow() {
  colS();
  if (!user) return;
  clearTimeout(sT);
  setSS("sy");
  try {
    await sb.from("settings").upsert(
      {
        user_id: user.id,
        data: {
          ...S,
          H,
          portHistory,
          loans,
          liabilities,
          _wynajemMap: A.filter((a) => a.wynajem).map((a) => [a.id, a.wynajem]),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    setSS("ok");
  } catch (e) {
    setSS("er");
  }
}
