function normalizeComma(el) {
  if (el && el.value) el.value = el.value.replace(/,/g, ".");
}

// ── HELPERS ──
// Słownik skrótów używanych w kodzie:
//   g(id)      → document.getElementById
//   PLN(n)     → formatuj liczbę jako PLN
//   pct(n)     → formatuj jako procent
//   pf(v)      → parseFloat (zwraca 0 dla NaN)
//   sT2(id,v)  → ustaw textContent elementu
//   gTP()      → łączna wartość wszystkich aktywów (Total Portfolio)
//   gFirePortfel() → wartość aktywów wchodzących do FIRE (bez nieruchomości na sprzedaż)
//   gIKE()     → wartość aktywów na koncie IKE
//   gPoza()    → wartość aktywów poza IKE
//   getMRI_IKE() → miesięczna stopa zwrotu IKE (Monthly Rate IKE)
//   getMRP()   → miesięczna stopa zwrotu poza IKE (Monthly Rate Poza)
//   getINF()   → miesięczna stopa inflacji jako ułamek
//   getIKEM()  → miesięczny limit wpłat IKE (IKE Monthly)
//   rA()       → przerenderuj całą aplikację (render All)
//   rDash()    → renderuj Dashboard
//   rBud()     → renderuj Budżet FIRE
//   rPlan()    → renderuj Plan FIRE
//   rPortfel() → renderuj Portfel
//   rATbl(id,del) → renderuj tabelę aktywów (render Assets Table)
//   sS()       → zapisz ustawienia (save Settings, debounced)
//   colS()     → odczytaj pola formularza do S (collect Settings)
//   apS()      → zastosuj S do pól formularza (apply Settings)
//   sim({...}) → symulacja FIRE — zwraca rok FIRE, wartości portfeli itd.
const g = (id) => document.getElementById(id);
const uuid = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); });
const PLN = (n) =>
  isNaN(n)
    ? "—"
    : new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(
        Math.round(n),
      ) + " zł";
const pct = (n) => (isNaN(n) ? "—" : n.toFixed(1) + "%");
const pf = (v) => parseFloat(v) || 0;
const today = () =>
  new Date().toLocaleDateString("pl-PL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
const sT2 = (id, v) => {
  const e = g(id);
  if (e) e.textContent = v;
};
// Miesięczny limit IKE uwzględniający już wpłacone w tym roku
function getIKEM() {
  const i1 = pf(S.i1) || 26019;
  const i2 = pf(S.i2) || 26019;
  const ip = pf(S.ip) / 100 || 1;
  const wpł1 = pf(S.i1wpl) || 0;
  const wpł2 = pf(S.i2wpl) || 0;
  // Ile pozostało do wykorzystania w tym roku (nie mniej niż 0)
  const zostało1 = Math.max(0, i1 - wpł1);
  const zostało2 = Math.max(0, i2 - wpł2);
  // Miesięczna rata z pozostałego limitu (zakładamy że jesteśmy na początku roku)
  // Dla symulacji wieloletniej używamy pełnego limitu obu kont * ip
  return ((i1 + i2) / 12) * ip;
}
// Ile TERAZ (ten miesiąc) można wpłacić na IKE — z uwzględnieniem wpłat w tym roku
function getIKEMNow() {
  const i1 = pf(S.i1) || 26019;
  const i2 = pf(S.i2) || 26019;
  const ip = pf(S.ip) / 100 || 1;
  const wpł1 = pf(S.i1wpl) || 0;
  const wpł2 = pf(S.i2wpl) || 0;
  const zostało = Math.max(0, i1 - wpł1 + (i2 - wpł2));
  return Math.min(((i1 + i2) / 12) * ip, zostało / 12);
}
function getAV(a) {
  if (a.type === "manual") return pf(a.mv);
  if (a.type === "nier-sprzedaz") return pf(a.mv);
  if (a.type === "nier-wynajem") return 0;
  const p = prices[a.ticker];
  if (!p) return 0;
  const u = pf(a.units);
  if (a.type === "crypto") return u * p;
  if (a.type === "stock") {
    const cur = a.cur || "USD";
    if (cur === "PLN") return u * p;
    if (cur === "EUR") return u * p * (prices["EURPLN"] || 4.3);
    return u * p * (prices["USDPLN"] || 3.9); // USD default
  }
  const cur = getETFCur(a.ticker);
  return (
    u *
    p *
    (cur === "EUR" ? prices["EURPLN"] || 4.3 : prices["USDPLN"] || 3.9)
  );
}
function getFireAV(a) {
  if (a.type === "nier-sprzedaz" || a.type === "nier-wynajem") return 0;
  return getAV(a);
}
function getWynajemNetto() {
  return A.filter((a) => a.type === "nier-wynajem").reduce(
    (s, a) => s + pf(a.wynajem) * 0.915,
    0,
  );
}
function getWynajemBrutto() {
  return A.filter((a) => a.type === "nier-wynajem").reduce(
    (s, a) => s + pf(a.wynajem),
    0,
  );
}
function gTP() {
  return A.reduce((s, a) => s + getAV(a), 0);
}
function gFirePortfel() {
  return A.reduce((s, a) => s + getFireAV(a), 0);
}
function gIKE() {
  return A.filter(
    (a) =>
      a.konto === "ike" &&
      a.type !== "nier-sprzedaz" &&
      a.type !== "nier-wynajem",
  ).reduce((s, a) => s + getFireAV(a), 0);
}
function gPoza() {
  return A.filter(
    (a) =>
      a.konto === "poza" &&
      a.type !== "nier-sprzedaz" &&
      a.type !== "nier-wynajem",
  ).reduce((s, a) => s + getFireAV(a), 0);
}
function gNierSprzedaz() {
  return A.filter((a) => a.type === "nier-sprzedaz").reduce(
    (s, a) => s + pf(a.mv),
    0,
  );
}
