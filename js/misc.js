// ── MISC ──

// ── INCOGNITO MODE ──
function toggleIncognito() {
  const on = document.body.classList.toggle('incognito');
  try { localStorage.setItem('fire-incognito', on ? '1' : '0'); } catch(e) {}
  const btn = g('incog-btn');
  if (btn) {
    btn.textContent = on ? '🙈' : '👁';
    btn.title = on ? 'Wyłącz tryb incognito' : 'Włącz tryb incognito';
  }
}
function initIncognito() {
  try {
    const on = localStorage.getItem('fire-incognito') === '1';
    document.body.classList.toggle('incognito', on);
    const btn = g('incog-btn');
    if (btn) {
      btn.textContent = on ? '🙈' : '👁';
      btn.title = on ? 'Wyłącz tryb incognito' : 'Włącz tryb incognito';
    }
  } catch(e) {}
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
  S = {
    wt: "31",
    wf: "50",
    wy: "15000",
    inv: "",
    i1: "26019",
    i2: "26019",
    i1wpl: "0",
    i2wpl: "0",
    ip: "100",
    wyd: "",
    roz: "",
    pw: "10",
    pr: "10",
    ks: "",
    kr: "",
    kn: "",
    krt: "8",
    brutto: "7.0",
    belka: "19",
    inf: "3.5",
    ikeRate: "7.0",
    calcBase: "brutto",
    ikeStrat: "stop",
    ikePostInvA: "0",
    ikePostInvB1: "0",
    ikePostInvB2: "0",
    ikePostInvC: "0",
    ikePostInvD1: "0",
    ikePostInvD2: "0",
    invInf: "0",
  };
  await saveA();
  await sS();
  apS();
  rA();
}
