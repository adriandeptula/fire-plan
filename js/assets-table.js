
// ── ASSET TABLE ──
// Point 7: badge label for NIER
function assetBadge(a) {
  if (a.type === "nier-sprzedaz")
    return '<span class="bg" style="background:rgba(155,127,232,.1);color:var(--pu);border:1px solid rgba(155,127,232,.25);white-space:nowrap">NIERUCHOMOŚCI</span>';
  if (a.type === "nier-wynajem")
    return '<span class="bg" style="background:rgba(232,147,90,.1);color:#e8935a;border:1px solid rgba(232,147,90,.25);white-space:nowrap">WYNAJEM</span>';
  return a.konto === "ike"
    ? '<span class="bg bgg">IKE</span>'
    : '<span class="bg bgb">Poza IKE</span>';
}
// Point 8: display name logic
function dispAssetName(a) {
  if (a.type === "nier-sprzedaz") {
    // If multiple nier-sprzedaz entries exist with no user name, show "Nieruchomości"
    const sameType = A.filter((x) => x.type === "nier-sprzedaz");
    if (sameType.length > 1 && !a.n) return "Nieruchomości";
    return a.n || "Nieruchomość";
  }
  if (a.type === "nier-wynajem")
    return a.n ? `Wynajem — ${a.n}` : "Wynajem";
  return (
    a.n ||
    (TICKER_NAMES && TICKER_NAMES[a.ticker]) ||
    a.ticker ||
    "Aktywo"
  );
}
function getAssetValue2(a) {
  if (a.type === "nier-wynajem") {
    const tot =
      a.totalWynajem !== undefined ? a.totalWynajem : pf(a.wynajem);
    return `${PLN(tot)}/mies. brutto`;
  }
  if (a.type === "nier-sprzedaz") {
    return PLN(a.totalMv !== undefined ? a.totalMv : pf(a.mv));
  }
  return PLN(getAV(a));
}
function groupAssets(assets) {
  const groups = {};
  assets.forEach((a) => {
    if (a.type === "nier-sprzedaz") {
      // Group all nier-sprzedaz together
      const key = "nier-sprzedaz";
      if (!groups[key])
        groups[key] = {
          ...a,
          type: "nier-sprzedaz",
          totalMv: 0,
          totalCount: 0,
          ids: [],
          members: [],
        };
      groups[key].totalMv += pf(a.mv);
      groups[key].totalCount++;
      groups[key].ids.push(a.id);
      groups[key].members.push(a);
      return;
    }
    if (a.type === "nier-wynajem") {
      // Group all nier-wynajem together
      const key = "nier-wynajem";
      if (!groups[key])
        groups[key] = {
          ...a,
          type: "nier-wynajem",
          totalWynajem: 0,
          totalCount: 0,
          ids: [],
          members: [],
        };
      groups[key].totalWynajem += pf(a.wynajem);
      groups[key].totalCount++;
      groups[key].ids.push(a.id);
      groups[key].members.push(a);
      return;
    }
    const key = `${a.type}:${a.ticker}:${a.konto}`;
    if (!groups[key])
      groups[key] = {
        ...a,
        totalUnits: pf(a.units),
        totalMv: pf(a.mv),
        ids: [a.id],
        members: [a],
      };
    else {
      groups[key].totalUnits += pf(a.units);
      groups[key].totalMv += pf(a.mv);
      groups[key].ids.push(a.id);
      groups[key].members.push(a);
    }
  });
  return Object.values(groups);
}
function fmtPrice(a) {
  const p = prices[a.ticker];
  if (!p) return "—";
  // Format with dot as decimal separator
  const fmt = (n, decimals = 2) => {
    return n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };
  const cur =
    a.type === "stock"
      ? a.cur || "USD"
      : a.type === "etf"
        ? getETFCur(a.ticker)
        : null;
  if (cur === "USD") return fmt(p) + " USD";
  if (cur === "EUR") return fmt(p) + " EUR";
  return PLN(p);
}
// ── PAGINATION HELPERS ──
function paginate(items, key) {
  const state = PAG[key];
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / state.perPage));
  state.page = Math.min(state.page, pages - 1);
  const start = state.page * state.perPage;
  const slice = items.slice(start, start + state.perPage);
  return { slice, total, pages, start, state };
}
function renderPag(key, total, pages, start, perPage, renderFn) {
  const end = Math.min(start + perPage, total);
  const perPageOpts = [10, 15, 20, 100]
    .map(
      (n) =>
        `<option value="${n}" ${perPage === n ? "selected" : ""}>${n}</option>`,
    )
    .join("");
  return `<div class="pag-wrap">
    <span class="pag-info">Wyświetlam ${start + 1}–${end} z ${total}</span>
    <div class="pag-ctrl">
      <label style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--mu)">Na stronie:
        <select class="pag-perpage" onchange="setPagPerPage('${key}',+this.value)">${perPageOpts}</select>
      </label>
      <button class="pag-btn" onclick="setPagPage('${key}',0)" ${start === 0 ? "disabled" : ""}>«</button>
      <button class="pag-btn" onclick="setPagPage('${key}',${PAG[key].page - 1})" ${PAG[key].page === 0 ? "disabled" : ""}>‹</button>
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--t2)">${PAG[key].page + 1}/${pages}</span>
      <button class="pag-btn" onclick="setPagPage('${key}',${PAG[key].page + 1})" ${PAG[key].page >= pages - 1 ? "disabled" : ""}>›</button>
      <button class="pag-btn" onclick="setPagPage('${key}',${pages - 1})" ${PAG[key].page >= pages - 1 ? "disabled" : ""}>»</button>
    </div>
  </div>`;
}
function setPagPage(key, page) {
  PAG[key].page = page;
  if (key === "assets") rPortfel();
  if (key === "hist") rPortHist();
}
function setPagPerPage(key, n) {
  PAG[key].perPage = n;
  PAG[key].page = 0;
  if (key === "assets") rPortfel();
  if (key === "hist") rPortHist();
}
// Generuje wiersz HTML dla pojedynczej nieruchomości (member) wewnątrz grupy.
// Wydzielona z rATbl żeby uniknąć zagnieżdżonej funkcji — łatwiejsze testowanie.
function renderMemberRow(member, parentId, isMob) {
  const nameStr =
    member.n || TICKER_NAMES[member.ticker] || member.ticker || "Pozycja";
  const valStr =
    member.type === "nier-wynajem"
      ? `${PLN(pf(member.wynajem))}/mies. brutto`
      : PLN(pf(member.mv));
  const editBtn = `<button class="del" onclick="editA('${member.id}')" style="color:var(--go)" title="Edytuj">✎</button>
      <button class="del" onclick="delGroup(['${member.id}'])" title="Usuń">✕</button>`;
  if (isMob) {
    return `<div style="padding:8px 13px 8px 28px;border-bottom:1px solid var(--b);background:var(--bg2);display:flex;align-items:center;gap:8px">
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600">${nameStr}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--mu)">${valStr}</div>
        </div>
        <div style="display:flex;gap:4px">${editBtn}</div>
      </div>`;
  }
  return `<tr style="background:var(--bg2)">
      <td style="padding-left:28px;font-size:12px">↳ ${nameStr}</td>
      <td></td><td class="mn">—</td><td>—</td>
      <td class="pos" style="font-size:12px">${valStr}</td>
      <td style="display:flex;gap:4px">${editBtn}</td>
    </tr>`;
}

// Renderuje tabelę aktywów w elemencie #id.
// del=true → pokaż przyciski edycji/usunięcia (widok Portfel)
// del=false → tylko podgląd (widok Dashboard)
function rATbl(id, del) {
  const el = g(id);
  if (!el) return;
  if (!A.length) {
    el.innerHTML = `<div class="em"><div class="emi">📊</div><div class="emt">Brak aktywów</div><div class="ems">Dodaj aktywa w zakładce Portfel</div></div>`;
    return;
  }
  const grouped = groupAssets(A);
  const usePag = id === "at";
  let displayGroups = grouped;
  let pagHtml = "";
  if (usePag) {
    // Paginacja zawsze widoczna (fix 6)
    const { slice, total, pages, start, state } = paginate(
      grouped,
      "assets",
    );
    displayGroups = slice;
    pagHtml = renderPag("assets", total, pages, start, state.perPage);
  }
  const mob = window.innerWidth <= 768;

  if (mob) {
    el.innerHTML =
      displayGroups
        .map((a) => {
          const isNierGroup =
            (a.type === "nier-sprzedaz" || a.type === "nier-wynajem") &&
            a.members &&
            a.members.length > 0;
          const v = getAssetValue2(a);
          const count = isNierGroup ? a.members.length : null;

          // Nier: count w info, nie w nazwie
          let nameStrMob;
          if (a.type === "nier-sprzedaz")
            nameStrMob =
              count === 1
                ? a.members[0].n || "Nieruchomość"
                : "Nieruchomości";
          else if (a.type === "nier-wynajem")
            nameStrMob =
              count === 1
                ? a.members[0].n
                  ? `Wynajem — ${a.members[0].n}`
                  : "Wynajem"
                : "Wynajem";
          else nameStrMob = dispAssetName(a);

          const unitsInfoMob = isNierGroup
            ? count + " szt."
            : !a.totalUnits || a.type === "manual"
              ? ""
              : fmtUnits(a.totalUnits);

          let actionBtns = "";
          if (isNierGroup && count > 1 && del) {
            actionBtns = `<button class="del" onclick="openNierModal('${a.type}')" style="color:var(--go)" title="Zarządzaj">✎</button>`;
          }

          let main = `<div style="padding:11px 13px;border-bottom:1px solid var(--b);display:flex;align-items:center;gap:9px">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:wrap"><strong style="font-size:13px">${nameStrMob}</strong>${assetBadge(a)}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--mu)">${unitsInfoMob}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:500;color:var(--gr)">${v}</div>
        </div>
        ${actionBtns}
      </div>`;

          if (isNierGroup && count === 1 && del) {
            main = main.replace(
              "</div>\n            </div>",
              `</div>\n              <div style="display:flex;gap:4px"><button class="del" onclick="editA('${a.members[0].id}')" style="color:var(--go)">✎</button><button class="del" onclick="delGroup(['${a.members[0].id}'])">✕</button></div>\n            </div>`,
            );
          }
          return main;
        })
        .join("") + pagHtml;
  } else {
    const dh = del ? "<th>Akcje</th>" : "";
    const rows = displayGroups
      .map((a) => {
        const isNierGroup =
          (a.type === "nier-sprzedaz" || a.type === "nier-wynajem") &&
          a.members &&
          a.members.length > 0;
        const count = isNierGroup ? a.members.length : null;
        const v = getAssetValue2(a);

        // Nier: nie pokazuj (count) w nazwie — count jest w kolumnie Ilość
        let nameStr;
        if (a.type === "nier-sprzedaz")
          nameStr =
            count === 1
              ? a.members[0].n || "Nieruchomość"
              : "Nieruchomości";
        else if (a.type === "nier-wynajem")
          nameStr =
            count === 1
              ? a.members[0].n
                ? `Wynajem — ${a.members[0].n}`
                : "Wynajem"
              : "Wynajem";
        else nameStr = dispAssetName(a);

        const pi =
          a.type === "manual" || a.type === "nier-sprzedaz"
            ? '<span style="color:var(--mu);font-size:11px">ręczna</span>'
            : a.type === "nier-wynajem"
              ? '<span style="color:var(--mu);font-size:11px">wynajem</span>'
              : prices[a.ticker]
                ? `<span class="mn">${fmtPrice(a)}</span>`
                : '<span style="color:var(--mu)">—</span>';

        const unitsDisp =
          a.type === "nier-wynajem" || a.type === "nier-sprzedaz"
            ? count > 1
              ? count + " szt."
              : "1 szt."
            : a.type === "manual"
              ? "—"
              : fmtUnits(a.totalUnits);

        let actionCell = "";
        if (del) {
          if (isNierGroup && count > 1) {
            actionCell = `<td style="display:flex;gap:4px"><button class="del" onclick="openNierModal('${a.type}')" style="color:var(--go)" title="Zarządzaj">✎</button></td>`;
          } else if (isNierGroup && count === 1) {
            actionCell = `<td style="display:flex;gap:4px"><button class="del" onclick="editA('${a.members[0].id}')" style="color:var(--go)" title="Edytuj">✎</button><button class="del" onclick="delGroup(['${a.members[0].id}'])" title="Usuń">✕</button></td>`;
          } else {
            const idsAttr2 = JSON.stringify(a.ids).replace(
              /'/g,
              "&apos;",
            );
            actionCell = `<td style="display:flex;gap:4px"><button class="del" onclick="editA('${a.ids[0]}')" style="color:var(--go)" title="Edytuj">✎</button><button class="del" onclick="delGroupById(this)" data-ids='${idsAttr2}' title="Usuń">✕</button></td>`;
          }
        }

        const mainRow = `<tr><td><strong>${nameStr}</strong><div style="font-size:10px;color:var(--mu)">${isNierGroup ? "" : a.ticker || ""}</div></td><td>${assetBadge(a)}</td><td class="mn">${unitsDisp}</td><td>${pi}</td><td class="pos">${v}</td>${actionCell}</tr>`;
        return mainRow;
      })
      .join("");
    el.innerHTML = `<table><thead><tr><th>Aktywo</th><th>Konto</th><th>Ilość (szt.)</th><th>Cena/szt.</th><th>Wartość</th>${dh}</tr></thead><tbody>${rows}</tbody></table>${pagHtml}`;
  }
}
async function delGroup(ids) {
  const ok = await dlgConfirm(
    "Usunąć to aktywo?",
    "🗑️",
    "Usuń",
    "Anuluj",
    true,
  );
  if (!ok) return;
  const idSet = new Set(ids);
  A = A.filter((a) => !idSet.has(a.id));
  await saveA();
  rA();
}
async function delGroupById(btn) {
  const ids = JSON.parse(btn.getAttribute("data-ids"));
  await delGroup(ids);
}
