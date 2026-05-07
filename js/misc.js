// ── MISC ──

// ── INCOGNITO MODE ──
function toggleIncognito() {
  const on = document.body.classList.toggle("incognito");
  try { localStorage.setItem("fire-incognito", on ? "1" : "0"); } catch (e) {}
  const btn = g("incog-btn");
  if (btn) {
    btn.textContent = on ? "🙈" : "👁";
    btn.title = on ? "Wyłącz tryb incognito" : "Włącz tryb incognito";
  }
}

function initIncognito() {
  try {
    const on = localStorage.getItem("fire-incognito") === "1";
    document.body.classList.toggle("incognito", on);
    const btn = g("incog-btn");
    if (btn) {
      btn.textContent = on ? "🙈" : "👁";
      btn.title = on ? "Wyłącz tryb incognito" : "Włącz tryb incognito";
    }
  } catch (e) {}
}

async function clearAll() {
  const ok = await dlgConfirm(
    "Usunąć wszystkie dane? Tej operacji nie można cofnąć.",
    "🗑️",
    "Usuń wszystko",
    "Anuluj",
    true,
  );
  if (!ok) return;

  A = [];
  H = [];
  portHistory = [];
  loans = [];
  liabilities = [];
  // blankS() zdefiniowane w auth.js — jedyne źródło domyślnych wartości S
  S = blankS();

  // apS() musi być PRZED zapisem — sS/saveSettingsNow wywołują colS()
  // które odczytuje formularze. Jeśli formularze mają stare wartości,
  // stare dane wracają do S przed zapisem do Supabase.
  apS();
  await saveA();
  await saveSettingsNow();
  rA();
}
