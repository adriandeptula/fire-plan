// ── LOANS ──
const ACCOUNT_NAMES = {
  glowne: "Konto główne",
  inwestycyjne: "Konto inwestycyjne",
  awaryjne: "Konto wydatków awaryjnych",
  "play-karoliny": "Play Karoliny",
  "play-adriana": "Play Adriana",
  wakacje: "Wspólne wakacje",
};
function openLoanModal() {
  g("loan-modal").classList.add("on");
}
function closeLoanModal() {
  g("loan-modal").classList.remove("on");
}
function openRepayModal() {
  g("repay-modal").classList.add("on");
}
function closeRepayModal() {
  g("repay-modal").classList.remove("on");
}
async function addLoan() {
  const from = g("loan-from").value,
    to = g("loan-to").value;
  if (from === to) {
    await dlgAlert("Konto wierzyciela i dłużnika muszą być różne.", "⚠️");
    return;
  }
  const amt = pf(g("loan-amt").value);
  if (!amt) {
    await dlgAlert("Podaj kwotę pożyczki.", "⚠️");
    return;
  }
  const note = g("loan-note").value;
  loans.push({
    id: uuid(),
    type: "loan",
    from,
    to,
    amt,
    note,
    ts: new Date().toISOString(),
  });
  g("loan-amt").value = "";
  g("loan-note").value = "";
  await sS();
  closeLoanModal();
  rLoans();
}
async function addRepay() {
  const from = g("rep-from").value,
    to = g("rep-to").value;
  if (from === to) {
    await dlgAlert("Konta muszą być różne.", "⚠️");
    return;
  }
  const amt = pf(g("rep-amt").value);
  if (!amt) {
    await dlgAlert("Podaj kwotę spłaty.", "⚠️");
    return;
  }
  const note = g("rep-note").value;
  loans.push({
    id: uuid(),
    type: "repay",
    from,
    to,
    amt,
    note,
    ts: new Date().toISOString(),
  });
  g("rep-amt").value = "";
  g("rep-note").value = "";
  await sS();
  closeRepayModal();
  rLoans();
}
function swLT(tab) {
  g("lt-summary").style.display = tab === "sum" ? "block" : "none";
  g("lt-history").style.display = tab === "hist" ? "block" : "none";
  g("lt-sum").className = "tbn" + (tab === "sum" ? " on" : "");
  g("lt-hist").className = "tbn" + (tab === "hist" ? " on" : "");
}
function rLoans() {
  const balances = {};
  loans.forEach((l) => {
    const key =
      l.type === "loan" ? `${l.from}→${l.to}` : `${l.to}→${l.from}`;
    if (!balances[key])
      balances[key] = {
        from: l.type === "loan" ? l.from : l.to,
        to: l.type === "loan" ? l.to : l.from,
        net: 0,
      };
    balances[key].net += l.type === "loan" ? l.amt : -l.amt;
  });
  const sumEl = g("loans-sum-tbl");
  const active = Object.values(balances).filter((b) => b.net > 0.01);
  if (!active.length) {
    sumEl.innerHTML = `<div class="em"><div class="emi">💸</div><div class="emt">Brak aktywnych pożyczek</div><div class="ems">Dodaj pożyczkę przyciskiem powyżej</div></div>`;
  } else {
    const rows = active
      .map(
        (b) =>
          `<tr><td><strong>${ACCOUNT_NAMES[b.from] || b.from}</strong></td><td style="color:var(--mu)">→</td><td><strong>${ACCOUNT_NAMES[b.to] || b.to}</strong></td><td class="pos">${PLN(b.net)}</td></tr>`,
      )
      .join("");
    const total = active.reduce((s, b) => s + b.net, 0);
    sumEl.innerHTML = `<table><thead><tr><th>Wierzyciel</th><th></th><th>Dłużnik</th><th>Saldo</th></tr></thead><tbody>${rows}<tr style="background:var(--s2)"><td colspan="3" style="font-weight:700">Łącznie w obiegu</td><td class="pos" style="font-weight:700">${PLN(total)}</td></tr></tbody></table>`;
  }
  const histEl = g("loans-hist-tbl");
  if (!loans.length) {
    histEl.innerHTML = `<div class="em"><div class="ems">Brak historii transakcji</div></div>`;
  } else {
    const sorted = [...loans].sort((a, b) => b.ts.localeCompare(a.ts));
    const rows = sorted
      .map((l) => {
        const dt = new Date(l.ts).toLocaleString("pl-PL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const isLoan = l.type === "loan";
        return `<tr><td style="font-size:11px;color:var(--mu);font-family:'JetBrains Mono',monospace">${dt}</td><td>${isLoan ? "📥 Pożyczka" : "📤 Spłata"}</td><td>${ACCOUNT_NAMES[l.from] || l.from}</td><td style="color:var(--mu)">→</td><td>${ACCOUNT_NAMES[l.to] || l.to}</td><td class="pos">${PLN(l.amt)}</td><td style="font-size:11px;color:var(--mu)">${l.note || ""}</td></tr>`;
      })
      .join("");
    histEl.innerHTML = `<table><thead><tr><th>Data</th><th>Typ</th><th>Od</th><th></th><th>Do</th><th>Kwota</th><th>Opis</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
}
