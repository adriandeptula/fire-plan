// ── STATE ──
let A = [],
  S = {
    wt: "31",
    wf: "50",
    wy: "15000",
    inv: "",
    i1: "26019",
    i2: "26019",
    i1wpl: "0",
    i2wpl: "0",
    ip: "100",
    wyd: "",
    roz: "",
    pw: "10",
    pr: "10",
    ks: "",
    kr: "",
    kn: "",
    krt: "8",
    brutto: "7.0",
    belka: "19",
    inf: "3.5",
    ikeRate: "7.0",
    calcBase: "brutto",
    // IKE po FIRE — nowe 4 opcje (A/B/C/D) + stop
    ikeStrat: "stop",
    ikePostInvA: "0",   // A: roczna kwota z portfela poza IKE
    ikePostInvB1: "0",  // B: % limitu IKE konto 1 z portfela poza IKE
    ikePostInvB2: "0",  // B: % limitu IKE konto 2 z portfela poza IKE
    ikePostInvC: "0",   // C: roczna kwota ze źródła zewnętrznego
    ikePostInvD1: "0",  // D: % limitu IKE konto 1 ze źródła zewnętrznego
    ikePostInvD2: "0",  // D: % limitu IKE konto 2 ze źródła zewnętrznego
    invInf: "0",
  },
  H = [],
  portHistory = [],
  loans = [],
  liabilities = [],
  incs = [{ id: 1, n: "", k: "" }],
  prices = {},
  chatH = [],
  user = null,
  sT = null;

function getTotalLiabilities() {
  if (!liabilities.length) return pf(S.ks) || 0;
  return liabilities.reduce((s, l) => s + pf(l.amount), 0);
}
