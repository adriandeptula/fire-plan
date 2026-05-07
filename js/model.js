function getCalcBase() {
  return S.calcBase || "brutto";
}
function getMRP() {
  const b = pf(S.brutto) || 7,
    bk = (pf(S.belka) || 19) / 100;
  if (getCalcBase() === "brutto") return b / 100 / 12;
  return (b * (1 - bk)) / 100 / 12;
}
function getINF() {
  return (pf(S.inf) || 3.5) / 100;
}
function getMRI_IKE() {
  return (pf(S.ikeRate) || 7) / 100 / 12;
}

// ── Obliczenie miesięcznej wpłaty na IKE po FIRE ──
// Zwraca { monthly, fromCapital }
function calcIkePostFire({
  ikeStrat,
  ikePostInvA, ikePostInvB1, ikePostInvB2,
  ikePostInvC, ikePostInvD1, ikePostInvD2,
  i1Limit, i2Limit,
  inflFactor,
}) {
  switch (ikeStrat) {
    case "A":
      return { monthly: ikePostInvA / 12, fromCapital: true };
    case "B": {
      const yr = ((i1Limit * ikePostInvB1 / 100) + (i2Limit * ikePostInvB2 / 100)) * inflFactor;
      return { monthly: yr / 12, fromCapital: true };
    }
    case "C":
      return { monthly: ikePostInvC / 12, fromCapital: false };
    case "D": {
      const yr = ((i1Limit * ikePostInvD1 / 100) + (i2Limit * ikePostInvD2 / 100)) * inflFactor;
      return { monthly: yr / 12, fromCapital: false };
    }
    default:
      return { monthly: 0, fromCapital: false };
  }
}

// ── FIRE SIMULATION ──
function sim({
  inv, ike, start, iS, wy, wiek,
  wynajemNetto = 0,
  ikeStrat = "stop",
  ikePostInvA = 0, ikePostInvB1 = 0, ikePostInvB2 = 0,
  ikePostInvC = 0, ikePostInvD1 = 0, ikePostInvD2 = 0,
  i1Limit = 26019, i2Limit = 26019,
  invInf = false,
}) {
  const inf = getINF();
  const MRI = getMRI_IKE();
  const MRP = getMRP();

  const ikeArgs = {
    ikeStrat, ikePostInvA, ikePostInvB1, ikePostInvB2,
    ikePostInvC, ikePostInvD1, ikePostInvD2,
    i1Limit, i2Limit,
  };

  let pI = iS,
    pP = Math.max(0, start - iS),
    m = 0,
    cm = -1;

  // Pomocnicza: sprawdza trigger FIRE przy danych pI, pP, yr (lata od dziś)
  function checkFireTrigger(pI, pP, yr) {
    const wiekTeraz = wiek + yr;
    const wyNom = wy * Math.pow(1 + inf, yr);
    // Wynajem indeksowany do momentu FIRE — spójny z wyNom
    const wynajemAtFire = wynajemNetto * Math.pow(1 + inf, yr);
    const potrzebaBase = Math.max(0, wyNom - wynajemAtFire);
    if (potrzebaBase > 0 && pP < potrzebaBase) return false;

    const latDo60 = Math.max(0, 60 - wiekTeraz);
    let pPtest = pP, pItest = pI;
    for (let mm = 0; mm < latDo60 * 12; mm++) {
      const inflFactor = Math.pow(1 + inf, Math.floor(mm / 12));
      const potrzebaM = potrzebaBase * inflFactor;
      const { monthly: ikeM, fromCapital } = calcIkePostFire({ ...ikeArgs, inflFactor });
      pItest = pItest * (1 + MRI) + ikeM;
      pPtest = pPtest * (1 + MRP) - potrzebaM - (fromCapital ? ikeM : 0);
      if (pPtest < 0) return false;
    }
    // Weryfikacja: czy w wieku 60 lat 4% portfela + wynajem ≥ cel?
    const inflAt60 = Math.pow(1 + inf, latDo60);
    // Wynajem od dziś do 60. r.ż. = yr + latDo60 = 60 - wiek
    const wynajemAt60 = wynajemNetto * Math.pow(1 + inf, Math.max(0, 60 - wiek));
    const m60check = ((Math.max(0, pPtest) + pItest) * 0.04) / 12 + wynajemAt60;
    const wyAt60 = wyNom * inflAt60;
    return m60check >= wyAt60;
  }

  // Sprawdź FIRE już przy starcie
  if (checkFireTrigger(pI, pP, 0)) {
    // m=0, yr=0 — liczymy wyniki bezpośrednio
  } else {
    while (m < 60 * 12) {
      const yr = m / 12;
      const invM = invInf ? inv * Math.pow(1 + inf, Math.floor(m / 12)) : inv;
      const ii = Math.min(invM, ike);
      const pi = Math.max(0, invM - ii);
      pI = pI * (1 + MRI) + ii;
      pP = pP * (1 + MRP) + pi;
      m++;

      // CoastFIRE: czy portfel urośnie do celu bez dalszych wpłat?
      if (cm === -1) {
        const annualReturn = (pf(S.brutto) || 7) / 100;
        const latDoFIRETarget = Math.max(0, (pf(S.wf) || 50) - wiek);
        const rem = Math.max(0, latDoFIRETarget - m / 12);
        const G_fire = Math.max(0, wy - wynajemNetto) * Math.pow(1 + inf, latDoFIRETarget) * 12 * 25;
        if (rem > 0 && pI + pP >= G_fire / Math.pow(1 + annualReturn, rem)) cm = m;
      }

      if (checkFireTrigger(pI, pP, m / 12)) break;
    }
  }

  const yr = m / 12,
    fa = wiek + yr,
    fy = new Date().getFullYear() + yr;
  const cy = cm > 0 ? Math.round(new Date().getFullYear() + cm / 12) : null;
  const wyAtFIRE = wy * Math.pow(1 + inf, yr);
  // G tylko do UI (pasek postępu, kafelki)
  const G = Math.max(0, wy - wynajemNetto) * Math.pow(1 + inf, yr) * 12 * 25;
  const infTotal = Math.pow(1 + inf, yr) - 1;

  // Faza 2: od FIRE do 60. r.ż.
  const y60 = Math.max(0, 60 - fa);
  let i60 = pI, p60 = pP;
  // Wynajem przy FIRE — indeksowany od dziś do momentu FIRE
  const wynajemAtFire = wynajemNetto * Math.pow(1 + inf, yr);
  const portWithdrawBase = Math.max(0, wyAtFIRE - wynajemAtFire);

  for (let mm = 0; mm < y60 * 12; mm++) {
    const inflFactor = Math.pow(1 + inf, Math.floor(mm / 12));
    const portWithdraw = portWithdrawBase * inflFactor;
    const { monthly: ikeM, fromCapital } = calcIkePostFire({ ...ikeArgs, inflFactor });
    i60 = i60 * (1 + MRI) + ikeM;
    p60 = p60 * (1 + MRP) - portWithdraw - (fromCapital ? ikeM : 0);
    if (p60 < 0) p60 = 0;
  }

  // Wynajem w wieku 60 lat — indeksowany od dziś (yr + y60 = 60 - wiek)
  const wynajemAt60 = wynajemNetto * Math.pow(1 + inf, yr + y60);
  const m60 = ((i60 + p60) * 0.04) / 12 + wynajemAt60;

  return {
    yr, fa, fy, tot: pI + pP,
    iF: pI, pF: pP,
    cy, i60, p60, m60,
    G, wyAtFIRE, infTotal, wynajemNetto,
  };
}

function gP() {
  colS();
  const inv = pf(S.inv);
  if (!inv) return null;
  const ike = getIKEM(),
    start = gFirePortfel(),
    iS = gIKE(),
    wy = pf(S.wy) || 15000,
    wiek = pf(S.wt) || 31;
  return {
    inv, ike, start, iS, wy, wiek,
    wynajemNetto: getWynajemNetto(),
    ikeStrat: S.ikeStrat || "stop",
    ikePostInvA: pf(S.ikePostInvA),
    ikePostInvB1: pf(S.ikePostInvB1),
    ikePostInvB2: pf(S.ikePostInvB2),
    ikePostInvC: pf(S.ikePostInvC),
    ikePostInvD1: pf(S.ikePostInvD1),
    ikePostInvD2: pf(S.ikePostInvD2),
    i1Limit: pf(S.i1) || 26019,
    i2Limit: pf(S.i2) || 26019,
    invInf: S.invInf === "1",
  };
}
