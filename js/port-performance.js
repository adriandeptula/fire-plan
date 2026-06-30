// ── PORTFOLIO PERFORMANCE TRACKING ──
//
// Struktura snapshotu (v20):
// {
//   id, ts, ym,                  — identyfikator, timestamp, rok-miesiąc ("2025-05")
//   fire, ike, poza, nier,       — wartości portfela w chwili zapisu
//   inv,                         — S.inv w chwili auto-snapshotu (tylko referencja)
//   deposits,                    — REALNE wpłaty w tym miesiącu (edytowalne)
//   depositsEdited,              — true gdy użytkownik ręcznie ustawił deposits
// }
//
// deposits domyślnie = inv (plan), depositsEdited = false.
// Po ręcznej edycji: depositsEdited = true.
// "Zysk rynkowy" = MoM - deposits (realne, nie planowane).

// Backward compat: snapshoty sprzed v20 mogą nie mieć pola deposits
function _snapDeposits(snap) {
  return snap.deposits !== undefined ? snap.deposits : (snap.inv || 0);
}

// ── AUTO-SNAPSHOT (raz na miesiąc, wywoływane w onLogin po refP) ──
function savePortSnapshot(force = false) {
  if (!user) return;
  const fireVal = gFirePortfel();
  if (!fireVal && !force) return;

  const ym = new Date().toISOString().slice(0, 7); // "YYYY-MM" (UTC)
  const idx = portSnapshots.findIndex(s => s.ym === ym);

  if (idx >= 0 && !force) return; // ten miesiąc już zapisany

  const existing = idx >= 0 ? portSnapshots[idx] : null;

  const snap = {
    id:             existing ? existing.id : uuid(),
    ts:             new Date().toISOString(),
    ym,
    fire:           fireVal,
    ike:            gIKE(),
    poza:           gPoza(),
    nier:           gNierSprzedaz(),
    inv:            pf(S.inv) || 0,
    // Zachowaj ręcznie ustawione wpłaty przy force-update
    deposits:       (existing && existing.depositsEdited)
                      ? existing.deposits
                      : (pf(S.inv) || 0),
    depositsEdited: existing ? (existing.depositsEdited || false) : false,
  };

  if (idx >= 0) {
    portSnapshots[idx] = snap;
  } else {
    portSnapshots.push(snap);
  }

  // Max 72 snapshoty (6 lat) — usuń najstarsze
  if (portSnapshots.length > 72) {
    portSnapshots.sort((a, b) => a.ym.localeCompare(b.ym));
    portSnapshots = portSnapshots.slice(-72);
  }

  sS();
}

// ── MODAL: OTWÓRZ (dodawanie lub edycja) ──
async function openSnapModal(id = null) {
  const modal = g('snap-modal');
  if (!modal) return;

  const isEdit = id !== null;
  const snap   = isEdit ? portSnapshots.find(s => s.id === id) : null;

  g('snap-modal-title').textContent = isEdit
    ? 'Edytuj snapshot'
    : 'Dodaj historyczny miesiąc';
  g('snap-id').value = id || '';

  const ymSel    = g('snap-ym');
  ymSel.innerHTML = '';
  ymSel.disabled  = isEdit; // przy edycji miesiąc jest zablokowany

  if (isEdit && snap) {
    const [y, m] = snap.ym.split('-');
    const opt    = document.createElement('option');
    opt.value       = snap.ym;
    opt.textContent = MO[parseInt(m) - 1] + ' ' + y;
    ymSel.appendChild(opt);
  } else {
    // Tryb dodawania: tylko przeszłe miesiące których jeszcze nie ma
    const existing = new Set(portSnapshots.map(s => s.ym));
    const now      = new Date();
    for (let i = 1; i <= 60; i++) {
      const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!existing.has(ym)) {
        const opt       = document.createElement('option');
        opt.value       = ym;
        opt.textContent = MO[d.getMonth()] + ' ' + d.getFullYear();
        ymSel.appendChild(opt);
      }
    }
    if (!ymSel.options.length) {
      await dlgAlert(
        'Wszystkie dostępne miesiące (ostatnie 5 lat) są już dodane.',
        'ℹ️'
      );
      return;
    }
  }

  g('snap-fire').value     = snap ? snap.fire             : '';
  g('snap-ike').value      = (snap && snap.ike)  ? snap.ike  : '';
  g('snap-poza').value     = (snap && snap.poza) ? snap.poza : '';
  g('snap-deposits').value = snap
    ? _snapDeposits(snap)
    : (pf(S.inv) || '');

  modal.classList.add('on');
}

function closeSnapModal() {
  g('snap-modal')?.classList.remove('on');
}

// ── MODAL: ZAPISZ ──
async function saveSnap() {
  const id      = g('snap-id').value || null;
  const ym      = g('snap-ym').value;
  const fireVal = pf(g('snap-fire').value);
  const ikeVal  = pf(g('snap-ike').value);
  const pozaVal = pf(g('snap-poza').value);
  const depVal  = pf(g('snap-deposits').value);

  if (!ym)      { await dlgAlert('Wybierz miesiąc.', '⚠️');              return; }
  if (!fireVal) { await dlgAlert('Podaj wartość portfela FIRE.', '⚠️');  return; }

  // Znajdź istniejący snapshot dla tego miesiąca (upsert po ym)
  const existing = portSnapshots.find(s => s.ym === ym);

  const snap = {
    id:             id || (existing ? existing.id : uuid()),
    // Historyczne wpisy mają ts w połowie miesiąca (nie mamy realnego czasu)
    ts:             existing ? existing.ts : (ym + '-15T12:00:00.000Z'),
    ym,
    fire:           fireVal,
    ike:            ikeVal,
    poza:           pozaVal || Math.max(0, fireVal - ikeVal),
    nier:           existing ? existing.nier : 0,
    inv:            existing ? existing.inv  : (pf(S.inv) || 0),
    deposits:       depVal,
    depositsEdited: true,
  };

  const idx = portSnapshots.findIndex(s => s.ym === ym);
  if (idx >= 0) {
    portSnapshots[idx] = snap;
  } else {
    portSnapshots.push(snap);
    // Sortuj i przytnij po dodaniu nowego wpisu
    if (portSnapshots.length > 72) {
      portSnapshots.sort((a, b) => a.ym.localeCompare(b.ym));
      portSnapshots = portSnapshots.slice(-72);
    }
  }

  sS();
  closeSnapModal();
  rPortPerf();
}

// ── USUŃ SNAPSHOT ──
async function deleteSnap(id) {
  const ok = await dlgConfirm(
    'Usunąć ten snapshot?', '🗑️', 'Usuń', 'Anuluj', true
  );
  if (!ok) return;
  portSnapshots = portSnapshots.filter(s => s.id !== id);
  sS();
  rPortPerf();
}

// ── RENDER ZAKŁADKI WYNIKI ──
function rPortPerf() {
  const el = g('port-perf-tbl');
  if (!el) return;

  // Posortuj malejąco (najnowsze na górze)
  const sorted = [...portSnapshots].sort((a, b) => b.ym.localeCompare(a.ym));

  // ── PUSTY STAN ──
  if (!sorted.length) {
    el.innerHTML = `
      <div class="em">
        <div class="emi">📈</div>
        <div class="emt">Brak danych historycznych</div>
        <div class="ems">Snapshoty zbierane są automatycznie raz na miesiąc przy logowaniu.
          Możesz też dodać poprzednie miesiące ręcznie.</div>
      </div>
      <div style="text-align:center;padding:0 0 20px;display:flex;gap:8px;
                  justify-content:center;flex-wrap:wrap">
        <button class="btn bp bsm"
          onclick="savePortSnapshot(true);rPortPerf()">📸 Zapisz snapshot teraz</button>
        <button class="btn bgh bsm"
          onclick="openSnapModal()">+ Dodaj historyczny miesiąc</button>
      </div>`;
    initTooltips();
    return;
  }

  // ── ZMIENNE POMOCNICZE ──
  const nowFire     = gFirePortfel();
  const oldest      = sorted[sorted.length - 1];
  const nowYm       = new Date().toISOString().slice(0, 7);
  const currentYear = nowYm.slice(0, 4);

  const totalChange = nowFire - oldest.fire;
  const totalPct    = oldest.fire > 0 ? (totalChange / oldest.fire) * 100 : 0;

  const prevYearSnap = sorted.find(s => s.ym < currentYear + '-01');
  const ytdChange    = prevYearSnap ? nowFire - prevYearSnap.fire : null;
  const ytdPct       = (ytdChange !== null && prevYearSnap.fire > 0)
    ? (ytdChange / prevYearSnap.fire) * 100 : null;

  const col  = v => v >= 0 ? 'var(--gr)' : 'var(--re)';
  const sign = v => v >= 0 ? '+' : '';

  // ── KPI KARTY ──
  const kpiHtml = `
    <div class="g3" style="margin-bottom:14px">
      <div class="card" style="text-align:center">
        <div class="cl">Portfel FIRE teraz</div>
        <div class="cv go">${PLN(nowFire)}</div>
        <div class="cs">IKE: ${PLN(gIKE())} · Poza: ${PLN(gPoza())}</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="cl">YTD ${currentYear}</div>
        ${ytdChange !== null
          ? `<div class="cv" style="color:${col(ytdChange)};font-size:20px">
               ${sign(ytdChange)}${PLN(ytdChange)}</div>
             <div class="cs">
               ${ytdPct !== null
                 ? sign(ytdPct) + ytdPct.toFixed(1) + '% od początku roku'
                 : 'od początku roku'}</div>`
          : `<div class="cv" style="color:var(--mu);font-size:20px">—</div>
             <div class="cs">Brak snapshotu z ${parseInt(currentYear) - 1}</div>`}
      </div>
      <div class="card" style="text-align:center">
        <div class="cl">Od początku śledzenia (${sorted.length} mies.)</div>
        <div class="cv" style="color:${col(totalChange)};font-size:20px">
          ${sign(totalChange)}${PLN(totalChange)}</div>
        <div class="cs">${sign(totalPct)}${totalPct.toFixed(1)}%</div>
      </div>
    </div>`;

  // ── WIERSZE TABELI ──
  // 7 kolumn: Miesiąc | Portfel FIRE | Zmiana MoM | Wpłaty | Zysk rynkowy | YoY% | [akcje]
  const maxFire = Math.max(...sorted.map(s => s.fire), nowFire || 0, 1);

  const tdChange = (v, p) => {
    if (v === null) return `<td class="mn" style="color:var(--mu)">—</td>`;
    return `<td class="mn" style="color:${col(v)}">
      ${sign(v)}${PLN(v)}
      <div style="font-size:9px;opacity:.75;margin-top:1px">
        ${p !== null ? sign(p) + p.toFixed(1) + '%' : ''}
      </div>
    </td>`;
  };

  let prevYear = null;

  const tableRows = sorted.map((curr, i) => {
    const prev         = sorted[i + 1];
    const [y, mStr]    = curr.ym.split('-');
    const label        = MO[parseInt(mStr) - 1] + ' ' + y;

    // ── SEPARATOR ROCZNY ──
    // Wstawiany gdy przechodzimy do starszego roku w tabeli
    let yearSepHtml = '';
    if (prevYear !== null && prevYear !== y) {
      const prevYrStart = sorted.find(s => s.ym < prevYear + '-01');
      const prevYrEnd   = sorted.find(s => s.ym.startsWith(prevYear));
      if (prevYrStart && prevYrEnd) {
        const yGain = prevYrEnd.fire - prevYrStart.fire;
        const yPct  = prevYrStart.fire > 0
          ? (yGain / prevYrStart.fire) * 100 : 0;
        // colspan(2) + 1 + colspan(4) = 7 kolumn ✓
        yearSepHtml = `
          <tr style="background:var(--s3)">
            <td colspan="2" style="font-family:'JetBrains Mono',monospace;font-size:9px;
                letter-spacing:.15em;color:var(--mu);text-transform:uppercase;
                padding:6px 12px">Łącznie ${prevYear}</td>
            <td class="mn" style="color:${col(yGain)};font-weight:700;padding:6px 12px">
              ${sign(yGain)}${PLN(yGain)}</td>
            <td colspan="4" style="padding:6px 12px">
              <span class="mn" style="color:${col(yGain)};font-weight:700">
                ${sign(yPct)}${yPct.toFixed(1)}%</span></td>
          </tr>`;
      }
    }
    prevYear = y;

    // ── OBLICZENIA ──
    const momChange  = prev ? curr.fire - prev.fire : null;
    const momPct     = (momChange !== null && prev.fire > 0)
      ? (momChange / prev.fire) * 100 : null;

    const deposits   = _snapDeposits(curr);
    const invGain    = momChange !== null ? momChange - deposits : null;
    const invGainPct = (invGain !== null && prev && prev.fire > 0)
      ? (invGain / prev.fire) * 100 : null;

    const [cy, cm]   = curr.ym.split('-').map(Number);
    const yoySnap    = sorted.find(s => {
      const [sy, sm] = s.ym.split('-').map(Number);
      return sy === cy - 1 && sm === cm;
    });
    const yoyChange  = yoySnap ? curr.fire - yoySnap.fire : null;
    const yoyPct     = (yoyChange !== null && yoySnap.fire > 0)
      ? (yoyChange / yoySnap.fire) * 100 : null;

    // ── WIZUALIZACJA ──
    const barW   = Math.max(2, Math.round((curr.fire / maxFire) * 100));
    const barCol = momChange === null
      ? 'var(--go)' : momChange >= 0 ? 'var(--gr)' : 'var(--re)';
    const isNow  = curr.ym === nowYm;

    // Wpłaty: szacunkowe (szary + "szac.") vs ręcznie wpisane (normalny kolor)
    const depositsCell = curr.depositsEdited
      ? `<td class="mn" style="color:var(--t2)">${PLN(deposits)}</td>`
      : `<td class="mn" style="color:var(--mu)">${PLN(deposits)}
           <div style="font-size:9px;margin-top:1px">szac.</div></td>`;

    return yearSepHtml + `
      <tr${isNow ? ' style="background:var(--gob)"' : ''}>
        <td>
          <div style="font-weight:600;font-size:12px">${label}${isNow
            ? ` <span style="font-family:'JetBrains Mono',monospace;font-size:9px;
                color:var(--go);font-weight:400">· teraz</span>` : ''}</div>
          <div style="height:3px;background:var(--b2);border-radius:2px;margin-top:5px;
               overflow:hidden;max-width:120px">
            <div style="width:${barW}%;height:100%;background:${barCol};
                 border-radius:2px"></div>
          </div>
        </td>
        <td class="mn">${PLN(curr.fire)}
          <div style="font-size:9px;color:var(--mu);margin-top:1px">
            IKE ${PLN(curr.ike)}</div></td>
        ${tdChange(momChange, momPct)}
        ${depositsCell}
        ${tdChange(invGain, invGainPct)}
        <td class="mn" style="color:${yoyPct !== null ? col(yoyChange) : 'var(--mu)'}">
          ${yoyPct !== null ? sign(yoyPct) + yoyPct.toFixed(1) + '%' : '—'}
        </td>
        <td style="white-space:nowrap">
          <button class="del" style="color:var(--go)" title="Edytuj"
            onclick="openSnapModal('${curr.id}')">✎</button>
          <button class="del" title="Usuń"
            onclick="deleteSnap('${curr.id}')">✕</button>
        </td>
      </tr>`;
  }).join('');

  // ── ZŁOŻENIE HTML ──
  el.innerHTML = kpiHtml + `
    <div style="display:flex;justify-content:space-between;align-items:center;
                margin-bottom:10px;flex-wrap:wrap;gap:8px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--mu)">
        Jeden snapshot / miesiąc · zbierany automatycznie przy logowaniu</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn bgh bsm" onclick="openSnapModal()">+ Dodaj historyczny</button>
        <button class="btn bgh bsm"
          onclick="savePortSnapshot(true);rPortPerf()">📸 Aktualizuj snapshot</button>
      </div>
    </div>
    <div class="tw">
      <table>
        <thead><tr>
          <th>Miesiąc</th>
          <th>Portfel FIRE</th>
          <th>Zmiana MoM
            <span class="tip-wrap"><span class="tip-ic">i</span>
              <span class="tip-box">Pełna zmiana wartości portfela — łącznie wpłaty
                i zmiana wyceny rynkowej.</span></span></th>
          <th>Wpłaty
            <span class="tip-wrap"><span class="tip-ic">i</span>
              <span class="tip-box">Realne wpłaty w danym miesiącu.
                "szac." = szacunek z planu FIRE — kliknij ✎ żeby wpisać
                rzeczywistą kwotę.</span></span></th>
          <th>Zysk rynkowy
            <span class="tip-wrap"><span class="tip-ic">i</span>
              <span class="tip-box">Zmiana MoM minus realne wpłaty.
                Czysty zysk z wyceny rynkowej bez nowych środków.</span></span></th>
          <th>YoY %
            <span class="tip-wrap"><span class="tip-ic">i</span>
              <span class="tip-box">Zmiana rok do roku — porównanie
                z tym samym miesiącem rok temu.</span></span></th>
          <th></th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    <div class="al alb" style="margin-top:10px">
      <div class="ali">ℹ</div>
      <div>
        <div class="alt">Metodologia</div>
        <div class="alb2">
          <strong>Zmiana MoM</strong> = pełna zmiana portfela (wpłaty + rynek).
          <strong>Zysk rynkowy</strong> = Zmiana MoM − Wpłaty realne.
          <strong>szac.</strong> = wpłaty wg planu FIRE — edytuj przez ✎
          żeby wpisać rzeczywiste. Historyczne miesiące dodasz przez
          "+ Dodaj historyczny".
        </div>
      </div>
    </div>`;

  initTooltips();
}
