// ── PRICES ──
const PRICE_CACHE_KEY = "fire-prices-cache";
const PRICE_CACHE_TTL = 12 * 60 * 60 * 1000;
function sPT(ok, m) {
  sT2("pstat", m);
  sT2("ptxt", m);
  const d = g("pdot");
  if (d) d.style.background = ok ? "var(--gr)" : "var(--re)";
}
function getETFCur(ticker) {
  // London Stock Exchange tickers (.L or .UK) - iShares on LSE trade in USD (like IGLN, EGLN)
  if (ticker.endsWith(".L") || ticker.endsWith(".UK")) return "USD";
  return "EUR";
}
async function loadCachedPrices() {
  try {
    const raw = localStorage.getItem(PRICE_CACHE_KEY);
    if (!raw) return false;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > PRICE_CACHE_TTL) return false;
    Object.assign(prices, data);
    const t = new Date(ts).toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });
    sPT(true, `Z cache ${t}`);
    rA();
    return true;
  } catch (e) {
    return false;
  }
}
function savePricesCache() {
  try {
    localStorage.setItem(
      PRICE_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data: { ...prices } }),
    );
  } catch (e) {}
}
async function refP(force = false) {
  if (!force) {
    const cached = await loadCachedPrices();
    if (cached) return;
  }
  sPT(false, "Pobieranie cen...");
  try {
    const cm = {};
    A.forEach((a) => {
      if (a.type === "crypto") {
        const id =
          a.ticker === "BTC"
            ? "bitcoin"
            : a.ticker === "ETH"
              ? "ethereum"
              : a.ticker.toLowerCase();
        cm[id] = a.ticker;
      }
    });
    if (Object.keys(cm).length) {
      const r = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${[...new Set(Object.keys(cm))].join(",")}&vs_currencies=pln`,
      );
      const d = await r.json();
      Object.entries(cm).forEach(([id, t]) => {
        if (d[id]) prices[t] = d[id].pln;
      });
    }
    const mktTickers = [
      ...new Set(
        A.filter((a) => a.type === "etf" || a.type === "stock").map(
          (a) => a.ticker,
        ),
      ),
    ];
    const r2 = await fetch(
      `https://fire-prices.adrianxdeptula.workers.dev/?tickers=${encodeURIComponent(JSON.stringify(mktTickers))}`,
    );
    if (r2.ok) {
      const d2 = await r2.json();
      Object.assign(prices, d2);
      if (d2._cur_fallback) {
        sPT(
          false,
          "⚠ Kursy walut niedostępne — używam przybliżonych (EUR/PLN≈4.27)",
        );
      }
    }
    savePricesCache();
    sPT(
      true,
      `Zaktualizowano ${new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`,
    );
  } catch (e) {
    sPT(false, "Błąd cen — sprawdź połączenie");
  }
  rA();
}
