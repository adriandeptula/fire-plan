function getCalcBase() {
  return S.calcBase || "brutto";
}
function getMRI() {
  // For IKE: always brutto (no Belka)
  return getMRI_IKE();
}
function getMRP() {
  // For poza IKE: depends on calcBase setting
  const b = pf(S.brutto) || 7,
    bk = (pf(S.belka) || 19) / 100;
  if (getCalcBase() === "brutto") {
    // brutto mode: no annual Belka deduction (ETF accumulating, no yearly sell)
    return b / 100 / 12;
  }
  // netto mode: deduct Belka annually
  return (b * (1 - bk)) / 100 / 12;
}
function getINF() {
  return (pf(S.inf) || 3.5) / 100;
}
function getMRI_IKE() {
  return (pf(S.ikeRate) || 7) / 100 / 12;
}

// ── FIRE SIMULATION (nowa logika dwufazowa) ──
// Parametry: inv=miesięczna wpłata, ike=limit IKE/mies, start=portfel startowy, iS=IKE startowe,
// wy=cel wypłaty dziś (real), wiek=obecny wiek, wynajemNetto=dochód pasywny,
// ikeStrat='stop'|'cont', ikePostInv=wpłata na IKE po FIRE
function sim({
  inv,
  ike,
  start,
  iS,
  wy,
  wiek,
  wynajemNetto = 0,
  ikeStrat = "stop",
  ikePostInv = 0,
  invInf = false,
}) {
  const inf = getINF();
  const MRI = getMRI_IKE(); // IKE: brutto (brak Belki)
  const MRP = getMRP(); // poza IKE: netto po Belce

  // Cel nominalny: wy w dzisiejszych PLN → przeliczamy na nominalne przy FIRE
  // Nie znamy roku FIRE z góry, więc cel iterujemy razem z symulacją
  // Użyjemy uproszczenia: cel = wy_realne * (1+inf)^lat * 12 * 25
  // Ale liczymy iteracyjnie więc sprawdzamy: czy poza IKE >= potrzeba_do_60 I łącznie >= cel_nominalny

  let pI = iS,
    pP = Math.max(0, start - iS),
    m = 0,
    cm = -1;

  // Sprawdź warunek FIRE PRZED pętlą — jeśli już na FIRE, zostań w m=0
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
        // potrzebaM jest już kwotą miesięczną — nie dziel przez 12
        pPtest = pPtest * (1 + MRP) - potrzebaM;
        if (pPtest < 0) {
          wystarczy = false;
          break;
        }
      }
      if (wystarczy) alreadyFire = true;
    }
  }

  while (!alreadyFire && m < 60 * 12) {
    const yr = m / 12;
    const wiekTeraz = wiek + yr;

    // Wpłata miesięczna — opcjonalnie rosnąca z inflacją co rok
    const invM = invInf
      ? inv * Math.pow(1 + inf, Math.floor(m / 12))
      : inv;
    const ii = Math.min(invM, ike);
    const pi = Math.max(0, invM - ii);

    pI = pI * (1 + MRI) + ii;
    pP = pP * (1 + MRP) + pi;
    m++;

    // Cel nominalny w tym momencie
    const latDoFIRE = yr; // ile lat minęło od startu
    const wyNom = wy * Math.pow(1 + inf, latDoFIRE); // nominalna wypłata w tym roku
    const G = wyNom * 12 * 25;

    // CoastFIRE: portfel urośnie do celu G bez dalszych wpłat
    // Formuła: portfel >= G / (1 + roczny_zwrot)^lat_do_FIRE
    // Używamy docelowego wieku FIRE z ustawień jako horyzontu
    if (cm === -1) {
      const annualReturn = (pf(S.brutto) || 7) / 100;
      const latDoFIRETarget = Math.max(0, (pf(S.wf) || 50) - wiek);
      const rem = Math.max(0, latDoFIRETarget - m / 12);
      if (rem > 0 && pI + pP >= G / Math.pow(1 + annualReturn, rem)) cm = m;
    }

    // Warunek FIRE dwufazowy:
    // 1. Łącznie >= cel nominalny
    // 2. poza IKE >= potrzeba do 60 (wypłaty z poza IKE przez latDo60 lat)
    if (pI + pP >= G) {
      const latDo60 = Math.max(0, 60 - wiekTeraz);
      // Symuluj czy pP wystarczy na latDo60 lat wypłat (wy_nom/mies - wynajem)
      const potrzebaM = Math.max(0, wyNom - wynajemNetto);
      let pPtest = pP;
      let wystarczy = true;
      for (let mm = 0; mm < latDo60 * 12; mm++) {
        // jeśli opcja cont — IKE dalej dostaje wpłaty
        // potrzebaM jest już kwotą miesięczną — nie dziel przez 12
        pPtest = pPtest * (1 + MRP) - potrzebaM;
        if (pPtest < 0) {
          wystarczy = false;
          break;
        }
      }
      if (wystarczy) break;
      // jeśli nie wystarczy — kontynuuj akumulację
    }
  }

  const yr = m / 12,
    fa = wiek + yr,
    fy = new Date().getFullYear() + yr;
  const cy =
    cm > 0 ? Math.round(new Date().getFullYear() + cm / 12) : null;

  // Wyznacz cel nominalny przy FIRE
  const wyAtFIRE = wy * Math.pow(1 + inf, yr);
  const G = wyAtFIRE * 12 * 25;
  const infTotal = Math.pow(1 + inf, yr) - 1; // skumulowana inflacja %

  // Po FIRE: ile będzie w 60 latach
  const y60 = Math.max(0, 60 - fa);
  let i60 = pI,
    p60 = pP;
  const wyAtFIRENom = wyAtFIRE; // nominalna przy FIRE

  // IKE po FIRE: rośnie bez wypłat (lub z wpłatami jeśli cont)
  // poza IKE: wypłacamy (wyAtFIRE - wynajemNetto) /mies
  // portWithdraw jest już kwotą miesięczną
  const portWithdraw = Math.max(0, wyAtFIRENom - wynajemNetto);
  for (let mm = 0; mm < y60 * 12; mm++) {
    if (ikeStrat === "cont") i60 = i60 * (1 + MRI) + ikePostInv / 12;
    else i60 = i60 * (1 + MRI);
    p60 = p60 * (1 + MRP) - portWithdraw;
    if (p60 < 0) p60 = 0;
  }
  const m60 = ((i60 + p60) * 0.04) / 12 + wynajemNetto;

  return {
    yr,
    fa,
    fy,
    tot: pI + pP,
    iF: pI,
    pF: pP,
    cy,
    i60,
    p60,
    m60,
    G,
    wyAtFIRE,
    infTotal,
    wynajemNetto,
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
  const wynajemNetto = getWynajemNetto();
  const ikeStrat = S.ikeStrat || "stop";
  const ikePostInv = pf(S.ikePostInv) || 0;
  const invInf = S.invInf === "1";
  return {
    inv,
    ike,
    start,
    iS,
    wy,
    wiek,
    wynajemNetto,
    ikeStrat,
    ikePostInv,
    invInf,
  };
}

// ── RENDER ALL ──
