// ── STATE ──
// Cały mutowalny stan aplikacji w zmiennych globalnych.
// A           → lista aktywów (assets) — obiekt: {id,type,ticker,units,mv,wynajem,konto,n,cur}
// S           → ustawienia użytkownika (settings) — synchronizowane z Supabase
// H           → historia miesięczna kalkulatora domowego (history)
// portHistory → historia transakcji portfela (ograniczona do 500 wpisów)
// loans       → transakcje kredytów wewnętrznych
// liabilities → zobowiązania (kredyty hipoteczne itp.)
// incs        → tymczasowe źródła dochodu w kalkulatorze miesięcznym
// prices      → cache cen z API {ticker: cena, EURPLN, USDPLN}
// chatH       → historia rozmowy z Agentem AI
// user        → zalogowany użytkownik Supabase
// sT          → timer debounce dla saveSettings
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
    ikeStrat: "stop",
    ikePostInv: "0",
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
