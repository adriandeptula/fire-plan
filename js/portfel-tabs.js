
// ── PORTFEL TABS ──
function swPT(tab) {
  g("pt-assets").style.display = tab === "assets" ? "block" : "none";
  g("pt-hist").style.display = tab === "hist" ? "block" : "none";
  g("pt-tab-assets").className = "tbn" + (tab === "assets" ? " on" : "");
  g("pt-tab-hist").className = "tbn" + (tab === "hist" ? " on" : "");
  if (tab === "hist") rPortHist();
}
function rPortHist() {
  const el = g("port-hist-tbl");
  if (!el) return;
  if (!portHistory.length) {
    el.innerHTML = `<div class="em"><div class="emi">📋</div><div class="emt">Brak historii</div><div class="ems">Historia pojawi się po dodaniu lub sprzedaży aktywów</div></div>`;
    return;
  }
  const sorted = [...portHistory].sort((a, b) =>
    b.ts.localeCompare(a.ts),
  );
  const opLabel = {
    buy: "📥 Kupno",
    sell: "📤 Sprzedaż",
    edit: "✏️ Edycja",
  };
  const pagKey = "hist";
  const { slice, total, pages, start, state } = paginate(sorted, pagKey);
  const rows = slice
    .map((h) => {
      const dt = new Date(h.ts).toLocaleString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const name =
        h.n ||
        (TICKER_NAMES && TICKER_NAMES[h.ticker]) ||
        h.ticker ||
        "Aktywo";
      const badge =
        h.konto === "ike"
          ? '<span class="bg bgg">IKE</span>'
          : '<span class="bg bgb">Poza IKE</span>';
      const val =
        h.type === "nier-wynajem"
          ? PLN(pf(h.wynajem)) + "/mies."
          : h.type === "nier-sprzedaz" || h.type === "manual"
            ? PLN(pf(h.mv))
            : h.units > 0
              ? pf(h.units).toFixed(4) + " szt."
              : "—";
      return `<tr><td style="font-size:11px;color:var(--mu);font-family:'JetBrains Mono',monospace">${dt}</td><td>${opLabel[h.op] || h.op}</td><td><strong>${name}</strong><div style="font-size:10px;color:var(--mu)">${h.ticker}</div></td><td>${badge}</td><td class="mn">${val}</td></tr>`;
    })
    .join("");
  const pagHtml =
    total > state.perPage
      ? renderPag(pagKey, total, pages, start, state.perPage)
      : "";
  el.innerHTML = `<table><thead><tr><th>Data i godzina</th><th>Operacja</th><th>Aktywo</th><th>Konto</th><th>Ilość / Wartość</th></tr></thead><tbody>${rows}</tbody></table>${pagHtml}`;
}
