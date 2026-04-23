
// ── CUSTOM DIALOGS ──
function dlgAlert(msg, icon = "ℹ️") {
  return new Promise((resolve) => {
    const bg = g("dlg-bg"),
      box = g("dlg-box");
    g("dlg-icon").textContent = icon;
    g("dlg-title").textContent = "";
    g("dlg-msg").textContent = msg;
    g("dlg-btns").innerHTML =
      `<button class="btn bp" id="dlg-ok">OK</button>`;
    bg.classList.add("on");
    g("dlg-ok").onclick = () => {
      bg.classList.remove("on");
      resolve();
    };
  });
}
function dlgConfirm(
  msg,
  icon = "⚠️",
  confirmLabel = "Tak",
  cancelLabel = "Anuluj",
  danger = false,
) {
  return new Promise((resolve) => {
    const bg = g("dlg-bg");
    g("dlg-icon").textContent = icon;
    g("dlg-title").textContent = "";
    g("dlg-msg").textContent = msg;
    const confirmStyle = danger
      ? 'background:var(--re);color:#fff;border:none;border-radius:5px;padding:8px 14px;font-family:"Syne",sans-serif;font-size:12px;font-weight:600;cursor:pointer'
      : "";
    g("dlg-btns").innerHTML = `
      <button class="btn bgh" id="dlg-cancel">${cancelLabel}</button>
      <button class="btn ${danger ? "" : "bp"}" id="dlg-confirm" style="${confirmStyle}">${confirmLabel}</button>`;
    bg.classList.add("on");
    g("dlg-cancel").onclick = () => {
      bg.classList.remove("on");
      resolve(false);
    };
    g("dlg-confirm").onclick = () => {
      bg.classList.remove("on");
      resolve(true);
    };
  });
}
