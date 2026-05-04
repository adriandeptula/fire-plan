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

// Zapisuje aktywa do Supabase.
// Strategia: upsert aktualnych wierszy, potem pobierz ID z bazy
// i usun te ktorych nie ma juz w A[]. Bezpieczne — nie uzywamy
// delete-all ktore niszczylo dane gdy insert zawioedl.
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
      const { error } = await sb
        .from("assets")
        .upsert(rows, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }

    // Usun wiersze ktore nie sa juz w A[] — pobieramy ID z bazy
    // i uzywamy .in() (bezpieczny, sprawdzony filtr w supabase-js)
    const { data: existing } = await sb
      .from("assets")
      .select("id")
      .eq("user_id", user.id);
    if (existing) {
      const currentIds = new Set(A.map((a) => a.id));
      const toDelete = existing.map((r) => r.id).filter((id) => !currentIds.has(id));
      if (toDelete.length) {
        await sb.from("assets").delete().in("id", toDelete);
      }
    }

    setSS("ok");
  } catch (e) {
    console.warn("saveA error:", e);
    setSS("er");
  }
}

// Debounced zapis ustawien — uzyj dla zmian inputow (onChange, oninput).
// UWAGA: await sS() nie czeka na faktyczny zapis do Supabase (setTimeout 800ms).
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
