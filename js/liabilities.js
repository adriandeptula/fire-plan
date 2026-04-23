
// ── LIABILITIES ──
function openLiabModal() {
  const op = g("liab-op");
  if (op) op.value = "add";
  const nm = g("liab-name");
  if (nm) nm.value = "";
  const amt = g("liab-amt");
  if (amt) amt.value = "";
  onLiabOp();
  g("liab-modal").classList.add("on");
}
function closeLiabModal() {
  g("liab-modal").classList.remove("on");
}
function onLiabOp() {
  const op = g("liab-op")?.value;
  const nr = g("liab-name-row");
  if (nr) nr.style.display = op === "add" ? "block" : "none";
}
async function saveLiab() {
  const op = g("liab-op")?.value || "add";
  const name = g("liab-name")?.value.trim() || "";
  const amt = pf(g("liab-amt")?.value);
  if (!amt) {
    await dlgAlert("Podaj kwotę.", "⚠️");
    return;
  }
  if (op === "add") {
    // Migruj S.ks do liabilities przy pierwszym użyciu
    if (!liabilities.length && pf(S.ks)) {
      liabilities.push({
        id: "ks-legacy",
        name: "Kredyt hipoteczny",
        amount: pf(S.ks),
      });
      S.ks = "";
    }
    liabilities.push({
      id: uuid(),
      name: name || "Zobowiązanie",
      amount: amt,
    });
  } else {
    let rem = amt;
    for (let l of liabilities) {
      if (rem <= 0) break;
      const reduce = Math.min(l.amount, rem);
      l.amount -= reduce;
      rem -= reduce;
    }
    liabilities = liabilities.filter((l) => l.amount > 0.01);
  }
  closeLiabModal();
  await sS();
  rLiabList();
  rA();
}
function rLiabList() {
  const el = g("liab-list-wrap");
  if (!el) return;
  const items = [...liabilities];
  if (!items.length && pf(S.ks))
    items.push({
      id: "ks-legacy",
      name: "Kredyt hipoteczny",
      amount: pf(S.ks),
    });
  if (!items.length) {
    el.innerHTML = "";
    return;
  }
  const total = items.reduce((s, l) => s + pf(l.amount), 0);
  el.innerHTML = `<div class="tw"><table><thead><tr><th>Zobowiązanie</th><th>Kwota</th><th></th></tr></thead><tbody>
    ${items.map((l) => `<tr><td>${l.name}</td><td class="mn">${PLN(l.amount)}</td><td><button class="del" onclick="delLiab('${l.id}')">✕</button></td></tr>`).join("")}
    <tr style="background:var(--s2)"><td style="font-weight:700">Łącznie</td><td class="mn" style="color:var(--re);font-weight:700">${PLN(total)}</td><td></td></tr>
  </tbody></table></div>`;
}
async function delLiab(id) {
  const ok = await dlgConfirm(
    "Usunąć to zobowiązanie?",
    "🗑️",
    "Usuń",
    "Anuluj",
    true,
  );
  if (!ok) return;
  if (id === "ks-legacy") {
    S.ks = "";
  } else {
    liabilities = liabilities.filter((l) => l.id !== id);
  }
  await sS();
  rLiabList();
  rA();
}
