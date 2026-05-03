// ── SUPABASE ──
function setSS(s) {
  const d = g("sd");
  if (d)
    d.className = "sd" + (s === "sy" ? " sy" : s === "er" ? " er" : "");
}

async function loadDB() {
  if (!user) return;
  setSS("sy");
  // Load assets
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
  // Load settings
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
      // Przywroc wynajem z fallback jesli nie zaladowalo sie z tabeli assets
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

// Zapisuje aktywa do Supabase.
// Uzywa upsert + selektywnego delete zamiast delete-all + insert,
// zeby uniknac utraty danych gdy insert zawiedzie.
async function saveA() {
  if (!user) return;
  setSS("sy");
  try {
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
      // Upsert najpierw — jesli zawiedzie, dane w bazie sa nienaruszone
      const { error } = await sb.from("assets").upsert(rows, { onConflict: "id" });
      if (error) throw new Error(error.message);
      // Usun tylko wiersze ktore nie sa juz w A (nie delete-all!)
      const ids = A.map((a) => a.id);
      await sb
        .from("assets")
        .delete()
        .eq("user_id", user.id)
        .not("id", "in", `(${ids.join(",")})`);
    } else {
      // Portfel pusty — usun wszystko dla tego uzytkownika
      const { error } = await sb.from("assets").delete().eq("user_id", user.id);
      if (error) throw new Error(error.message);
    }
    setSS("ok");
  } catch (e) {
    console.warn("saveA error:", e);
    setSS("er");
  }
}

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
