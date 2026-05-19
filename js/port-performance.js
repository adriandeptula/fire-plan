// ── PORTFOLIO PERFORMANCE TRACKING ──
// Auto-saves one snapshot per month on login (after prices load).
// Snapshots stored in settings.data.portSnapshots (max 72 = 6 years).

function savePortSnapshot(force = false) {
  if (!user) return;
  const fireVal = gFirePortfel();
  if (!fireVal && !force) return;

  const ym = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const idx = portSnapshots.findIndex(s => s.ym === ym);

  if (idx >= 0 && !force) return; // already captured this month

  const snap = {
    id: idx >= 0 ? portSnapshots[idx].id : uuid(),
    ts: new Date().toISOString(),
    ym,
    fire: fireVal,
    ike: gIKE(),
    poza: gPoza(),
    nier: gNierSprzedaz(),
    inv: pf(S.inv) || 0,
  };

  if (idx >= 0) {
    portSnapshots[idx] = snap;
  } else {
    portSnapshots.push(snap);
  }

  // Keep max 72 months (6 years), oldest first
  if (portSnapshots.length > 72) {
    portSnapshots.sort((a, b) => a.ym.localeCompare(b.ym));
    portSnapshots = portSnapshots.slice(-72);
  }

  sS();
}

function rPortPerf() {
  const el = g('port-perf-tbl');
  if (!el) return;

  const sorted = [...portSnapshots].sort((a, b) => b.ym.localeCompare(a.ym));

  if (!sorted.length) {
    el.innerHTML = `<div class="em">
      <div class="emi">📈</div>
      <div class="emt">Brak danych historycznych</div>
      <div class="ems">Snapshoty portfela zbierane są automatycznie raz na miesiąc przy logowaniu. Zapisz teraz, żeby zacząć śledzić historię wyników.</div>
    </div>
    <div style="text-align:center;padding:0 0 20px">
      <button class="btn bp bsm" onclick="savePortSnapshot(true);rPortPerf()">📸 Zapisz pierwszy snapshot</button>
    </div>`;
    return;
  }

  const nowFire = gFirePortfel();
  const oldest = sorted[sorted.length - 1];
  const nowYm = new Date().toISOString().slice(0, 7);
  const currentYear = nowYm.slice(0, 4);

  // Total change since tracking started
  const totalChange = nowFire - oldest.fire;
  const totalPct = oldest.fire > 0 ? (totalChange / oldest.fire) * 100 : 0;

  // YTD: compare against last snapshot before current year
  const prevYearSnap = sorted.find(s => s.ym < currentYear + '-01');
  const ytdChange = prevYearSnap ? nowFire - prevYearSnap.fire : null;
  const ytdPct = (ytdChange !== null && prevYearSnap.fire > 0) ? (ytdChange / prevYearSnap.fire) * 100 : null;

  const col = v => v >= 0 ? 'var(--gr)' : 'var(--re)';
  const sign = v => v >= 0 ? '+' : '';

  // ── KPI cards ──
  const kpiHtml = `<div class="g3" style="margin-bottom:14px">
    <div class="card" style="text-align:center">
      <div class="cl">Portfel FIRE teraz</div>
      <div class="cv go">${PLN(nowFire)}</div>
      <div class="cs">IKE: ${PLN(gIKE())} · Poza: ${PLN(gPoza())}</div>
    </div>
    <div class="card" style="text-align:center">
      <div class="cl">YTD ${currentYear}</div>
      ${ytdChange !== null
        ? `<div class="cv" style="color:${col(ytdChange)};font-size:20px">${sign(ytdChange)}${PLN(ytdChange)}</div><div class="cs">${ytdPct !== null ? sign(ytdPct) + ytdPct.toFixed(1) + '% od początku roku' : 'od początku roku'}</div>`
        : `<div class="cv" style="color:var(--mu);font-size:20px">—</div><div class="cs">Brak snapshotu z ${parseInt(currentYear) - 1}</div>`}
    </div>
    <div class="card" style="text-align:center">
      <div class="cl">Od początku śledzenia (${sorted.length} mies.)</div>
      <div class="cv" style="color:${col(totalChange)};font-size:20px">${sign(totalChange)}${PLN(totalChange)}</div>
      <div class="cs">${sign(totalPct)}${totalPct.toFixed(1)}%</div>
    </div>
  </div>`;

  // ── Table rows ──
  const maxFire = Math.max(...sorted.map(s => s.fire), nowFire || 0, 1);

  // Group rows with year separators
  let prevYear = null;
  const tableRows = sorted.map((curr, i) => {
    const prev = sorted[i + 1];
    const [y, mStr] = curr.ym.split('-');
    const label = MO[parseInt(mStr) - 1] + ' ' + y;

    // Year separator row
    let yearSepHtml = '';
    if (prevYear !== null && prevYear !== y) {
      // Compute full-year change: from last snap before this year to last snap of that year
      const prevYrStart = sorted.find(s => s.ym < prevYear + '-01');
      const prevYrEnd = sorted.find(s => s.ym.startsWith(prevYear));
      if (prevYrStart && prevYrEnd) {
        const yGain = prevYrEnd.fire - prevYrStart.fire;
        const yPct = prevYrStart.fire > 0 ? (yGain / prevYrStart.fire) * 100 : 0;
        yearSepHtml = `<tr style="background:var(--s3)">
          <td colspan="2" style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.15em;color:var(--mu);text-transform:uppercase;padding:6px 12px">Łącznie ${prevYear}</td>
          <td class="mn" style="color:${col(yGain)};font-weight:700;padding:6px 12px">${sign(yGain)}${PLN(yGain)}</td>
          <td class="mn" style="color:${col(yGain)};font-weight:700;padding:6px 12px">${sign(yPct)}${yPct.toFixed(1)}%</td>
          <td style="padding:6px 12px"></td>
        </tr>`;
      }
    }
    prevYear = y;

    // MoM
    const momChange = prev ? curr.fire - prev.fire : null;
    const momPct = (momChange !== null && prev.fire > 0) ? (momChange / prev.fire) * 100 : null;

    // Investment gain = MoM change minus planned monthly deposit
    const invGain = momChange !== null ? momChange - curr.inv : null;
    const invGainPct = (invGain !== null && prev && prev.fire > 0) ? (invGain / prev.fire) * 100 : null;

    // YoY: find snapshot from same month last year
    const [cy, cm] = curr.ym.split('-').map(Number);
    const yoySnap = sorted.find(s => {
      const [sy, sm] = s.ym.split('-').map(Number);
      return sy === cy - 1 && sm === cm;
    });
    const yoyChange = yoySnap ? curr.fire - yoySnap.fire : null;
    const yoyPct = (yoyChange !== null && yoySnap.fire > 0) ? (yoyChange / yoySnap.fire) * 100 : null;

    // Mini progress bar width
    const barW = Math.max(2, Math.round((curr.fire / maxFire) * 100));
    const barCol = momChange === null ? 'var(--go)' : momChange >= 0 ? 'var(--gr)' : 'var(--re)';

    const tdChange = (v, p) => {
      if (v === null) return `<td class="mn" style="color:var(--mu)">—</td>`;
      return `<td class="mn" style="color:${col(v)}">${sign(v)}${PLN(v)}<div style="font-size:9px;opacity:.75;margin-top:1px">${p !== null ? sign(p) + p.toFixed(1) + '%' : ''}</div></td>`;
    };

    const isCurrentMonth = curr.ym === nowYm;

    return yearSepHtml + `<tr${isCurrentMonth ? ' style="background:var(--gob)"' : ''}>
      <td>
        <div style="font-weight:600;font-size:12px">${label}${isCurrentMonth ? ' <span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--go);font-weight:400">· teraz</span>' : ''}</div>
        <div style="height:3px;background:var(--b2);border-radius:2px;margin-top:5px;overflow:hidden;max-width:120px">
          <div style="width:${barW}%;height:100%;background:${barCol};border-radius:2px"></div>
        </div>
      </td>
      <td class="mn">${PLN(curr.fire)}<div style="font-size:9px;color:var(--mu);margin-top:1px">IKE ${PLN(curr.ike)}</div></td>
      ${tdChange(momChange, momPct)}
      ${tdChange(invGain, invGainPct)}
      <td class="mn" style="color:${yoyPct !== null ? col(yoyChange) : 'var(--mu)'}">
        ${yoyPct !== null ? sign(yoyPct) + yoyPct.toFixed(1) + '%' : '—'}
      </td>
    </tr>`;
  }).join('');

  el.innerHTML = kpiHtml +
    `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--mu)">Jeden snapshot / miesiąc · zbierany automatycznie przy logowaniu</div>
      <button class="btn bgh bsm" onclick="savePortSnapshot(true);rPortPerf()">📸 Aktualizuj snapshot</button>
    </div>
    <div class="tw">
      <table>
        <thead><tr>
          <th>Miesiąc</th>
          <th>Portfel FIRE</th>
          <th>Zmiana MoM
            <span class="tip-wrap"><span class="tip-ic">i</span><span class="tip-box">Pełna zmiana wartości portfela względem poprzedniego miesiąca — łącznie nowe wpłaty i zmiana wyceny rynkowej.</span></span>
          </th>
          <th>Zysk rynkowy
            <span class="tip-wrap"><span class="tip-ic">i</span><span class="tip-box">Zmiana MoM minus planowana miesięczna wpłata na FIRE (z pola "Łącznie na FIRE"). Przybliżona miara czystego zysku z wyceny — zakłada że wpłaty były zgodne z planem.</span></span>
          </th>
          <th>YoY %
            <span class="tip-wrap"><span class="tip-ic">i</span><span class="tip-box">Zmiana rok do roku — porównanie z tym samym miesiącem rok temu.</span></span>
          </th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    <div class="al alb" style="margin-top:10px">
      <div class="ali">ℹ</div>
      <div>
        <div class="alt">Metodologia</div>
        <div class="alb2"><strong>Zmiana MoM</strong> = pełna zmiana portfela (wpłaty + rynek). <strong>Zysk rynkowy</strong> = Zmiana MoM − ${PLN(pf(S.inv))}/mies. (plan). Jeśli nie masz ustawionej kwoty FIRE, "Zysk rynkowy" = "Zmiana MoM". Wartość dokładna przy stałych wpłatach zgodnych z planem.</div>
      </div>
    </div>`;
  initTooltips();
}
