function getCalcBase() {
  return S.calcBase || "brutto";
}
function getMRI() {
  return getMRI_IKE();
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
// fromCapital=true → kwota pochodzi z portfela poza IKE (strategie A, B)
// fromCapital=false → kwota ze źródła zewnętrznego (strategie C, D)
function calcIkePostFire({
  ikeStrat,
  ikePostInvA, ikePostInvB1, ikePostInvB2,
  ikePostInvC, ikePostInvD1, ikePostInvD2,
  i1Limit, i2Limit,
  inflFactor,  // (1+inf)^yearsSinceFire
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
    default: // stop
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

  // Sprawdź warunek FIRE PRZED pętlą
  let alreadyFire = false;
  {
    const wyNow = wy;
    const GNow = wyNow * 12 * 25;
    if (pI + pP >= GNow) {
      const latDo60 = Math.max(0, 60 - wiek);
      const potrzebaM = Math.max(0, wyNow - wynajemNetto);
      let pPtest = pP;
      let wystarczy = true;
      for (let mm = 0; mm < latDo60 * 12; mm++) {
        const inflFactor = Math.pow(1 + inf, Math.floor(mm / 12));
        const { monthly: ikeM, fromCapital } = calcIkePostFire({ ...ikeArgs, inflFactor });
        const totalOut = potrzebaM + (fromCapital ? ikeM : 0);
        pPtest = pPtest * (1 + MRP) - totalOut;
        if (pPtest < 0) { wystarczy = false; break; }
      }
      if (wystarczy) alreadyFire = true;
    }
  }

  while (!alreadyFire && m < 60 * 12) {
    const yr = m / 12;
    const wiekTeraz = wiek + yr;
    const invM = invInf ? inv * Math.pow(1 + inf, Math.floor(m / 12)) : inv;
    const ii = Math.min(invM, ike);
    const pi = Math.max(0, invM - ii);

    pI = pI * (1 + MRI) + ii;
    pP = pP * (1 + MRP) + pi;
    m++;

    const latDoFIRE = yr;
    const wyNom = wy * Math.pow(1 + inf, latDoFIRE);
    const G = wyNom * 12 * 25;

    // CoastFIRE check
    if (cm === -1) {
      const annualReturn = (pf(S.brutto) || 7) / 100;
      const latDoFIRETarget = Math.max(0, (pf(S.wf) || 50) - wiek);
      const rem = Math.max(0, latDoFIRETarget - m / 12);
      if (rem > 0 && pI + pP >= G / Math.pow(1 + annualReturn, rem)) cm = m;
    }

    // Warunek FIRE
    if (pI + pP >= G) {
      const latDo60 = Math.max(0, 60 - wiekTeraz);
      const potrzebaM = Math.max(0, wyNom - wynajemNetto);
      let pPtest = pP;
      let wystarczy = true;
      for (let mm = 0; mm < latDo60 * 12; mm++) {
        const inflFactor = Math.pow(1 + inf, Math.floor(mm / 12));
        const { monthly: ikeM, fromCapital } = calcIkePostFire({ ...ikeArgs, inflFactor });
        const totalOut = potrzebaM + (fromCapital ? ikeM : 0);
        pPtest = pPtest * (1 + MRP) - totalOut;
        if (pPtest < 0) { wystarczy = false; break; }
      }
      if (wystarczy) break;
    }
  }

  const yr = m / 12,
    fa = wiek + yr,
    fy = new Date().getFullYear() + yr;
  const cy = cm > 0 ? Math.round(new Date().getFullYear() + cm / 12) : null;
  const wyAtFIRE = wy * Math.pow(1 + inf, yr);
  const G = wyAtFIRE * 12 * 25;
  const infTotal = Math.pow(1 + inf, yr) - 1;

  // Symulacja po FIRE — faza 2: od FIRE do 60. r.ż.
  const y60 = Math.max(0, 60 - fa);
  let i60 = pI, p60 = pP;
  const portWithdraw = Math.max(0, wyAtFIRE - wynajemNetto);

  for (let mm = 0; mm < y60 * 12; mm++) {
    const inflFactor = Math.pow(1 + inf, Math.floor(mm / 12));
    const { monthly: ikeM, fromCapital } = calcIkePostFire({ ...ikeArgs, inflFactor });
    i60 = i60 * (1 + MRI) + ikeM;
    const totalOut = portWithdraw + (fromCapital ? ikeM : 0);
    p60 = p60 * (1 + MRP) - totalOut;
    if (p60 < 0) p60 = 0;
  }

  const m60 = ((i60 + p60) * 0.04) / 12 + wynajemNetto;

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
