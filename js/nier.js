// ── NIER MANAGER MODAL ──
let nierModalType = "nier-sprzedaz";

function openNierModal(type) {
  nierModalType = type;
  const title = g("nier-modal-title");
  const sub = g("nier-modal-sub");
  if (title)
    title.textContent =
      type === "nier-wynajem"
        ? "Nieruchomości — wynajem"
        : "Nieruchomości — wartość rynkowa";
  if (sub)
    sub.textContent =
      type === "nier-wynajem"
        ? "Zarządzaj nieruchomościami na wynajem"
        : "Zarządzaj nieruchomościami o wartości rynkowej";
  renderNierList();
  g("nier-modal").classList.add("on");
}

function closeNierModal() {
  g("nier-modal").classList.remove("on");
}

function renderNierList() {
  const el = g("nier-list");
  if (!el) return;
  const items = A.filter((a) => a.type === nierModalType);
  if (!items.length) {
    el.innerHTML = `<div style="text-align:center;padding:16px;color:var(--mu);font-size:13px">Brak wpisów — dodaj pierwszą</div>`;
    return;
  }
  el.innerHTML = items
    .map((a) => {
      const val =
        nierModalType === "nier-wynajem"
          ? PLN(pf(a.wynajem)) + "/mies."
          : PLN(pf(a.mv));
      const name = a.n || (nierModalType === "nier-wynajem" ? "Wynajem" : "Nieruchomość");
      return `<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--b)">
      <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">${name}</div><div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mu)">${val}</div></div>
      <button class="del" onclick="editNierItem('${a.id}')" style="color:var(--go)">✎</button>
      <button class="del" onclick="delNierItem('${a.id}')">✕</button>
    </div>`;
    })
    .join("");
}

function editNierItem(id) {
  closeNierModal();
  editA(id);
}

async function delNierItem(id) {
  const ok = await dlgConfirm(
    "Usunąć tę nieruchomość?",
    "🗑️",
    "Usuń",
    "Anuluj",
    true,
  );
  if (!ok) return;
  const asset = A.find((a) => a.id === id);
  if (asset) {
    portHistory.push({
      id: uuid(), op: "sell", type: asset.type, ticker: asset.ticker,
      n: asset.n, units: asset.units, mv: asset.mv,
      wynajem: asset.wynajem, konto: asset.konto,
      ts: new Date().toISOString(),
    });
    if (portHistory.length > 500) portHistory = portHistory.slice(-500);
  }
  A = A.filter((a) => a.id !== id);
  await saveA();
  sS(); // zapisz portHistory
  renderNierList();
  rA();
  if (A.filter((a) => a.type === nierModalType).length > 0)
    g("nier-modal").classList.add("on");
}

function addNierFromModal() {
  closeNierModal();
  openAM();
  const sel = g("atype");
  if (sel) {
    sel.value =
      nierModalType === "nier-wynajem"
        ? "nier-wynajem:NIER"
        : "nier-sprzedaz:NIER";
    onTC();
  }
}
