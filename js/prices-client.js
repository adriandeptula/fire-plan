// ── PRICES ──
const PRICE_CACHE_KEY = "fire-prices-cache";
const PRICE_CACHE_TTL = 12 * 60 * 60 * 1000;
const PRICE_WORKER_URL = "https://fire-prices.adrianxdeptula.workers.dev/";
// CoinGecko wymaga własnych identyfikatorów (nie tickerów). Dodaj tu kolejne monety.
const COINGECKO_IDS = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", ADA: "cardano", XRP: "ripple",
  DOGE: "dogecoin", DOT: "polkadot", LTC: "litecoin", BNB: "binancecoin",
  AVAX: "avalanche-2", LINK: "chainlink", MATIC: "matic-network", USDT: "tether", USDC: "usd-coin",
};

function sPT(ok, m) {
  sT2("pstat", m);
  sT2("ptxt", m);
  const d = g("pdot");
  if (d) d.style.background = ok ? "var(--gr)" : "var(--re)";
}
function getETFCur(ticker) {
  // Wyjątki per-ticker — mają priorytet nad logiką suffixu
  const EUR_TICKERS = ["EGLN.UK", "EGLN.L"];
  if (EUR_TICKERS.includes(ticker)) return "EUR";
  // LSE tickers (.L lub .UK) — iShares na LSE notowane w USD
  if (ticker.endsWith(".L") || ticker.endsWith(".UK")) return "USD";
  return "EUR";
}

// Które ceny są potrzebne dla aktualnego portfela?
function neededPriceKeys() {
  const keys = [];
  let needFx = false;
  A.forEach((a) => {
    if (a.type === "crypto" || a.type === "etf" || a.type === "stock") keys.push(a.ticker);
    if (a.type === "etf" || a.type === "stock") needFx = true;
  });
  if (needFx) keys.push("EURPLN", "USDPLN");
  return [...new Set(keys)];
}
function missingPriceKeys() {
  return neededPriceKeys().filter((k) => !prices[k]);
}

function readPriceCache() {
  try {
    const raw = localStorage.getItem(PRICE_CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (!ts || !data) return null;
    return { ts, data };
  } catch (e) {
    return null;
  }
}
const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });

// Cache jest używany tylko gdy jest świeży ORAZ zawiera ceny wszystkich posiadanych
// aktywów (wcześniej nowo dodany ticker nie miał ceny przez kolejne 12 godzin).
async function loadCachedPrices() {
  const c = readPriceCache();
  if (!c || Date.now() - c.ts > PRICE_CACHE_TTL) return false;
  const merged = { ...prices, ...c.data };
  if (neededPriceKeys().some((k) => !merged[k])) return false;
  Object.assign(prices, c.data);
  sPT(true, `Z cache ${fmtTime(c.ts)}`);
  rA();
  return true;
}
// Awaryjnie: stare ceny z cache lepsze niż zera w całym portfelu.
function loadStalePrices() {
  const c = readPriceCache();
  if (!c) return false;
  Object.entries(c.data).forEach(([k, v]) => { if (!prices[k]) prices[k] = v; });
  sPT(false, `Ceny nieaktualne (z ${new Date(c.ts).toLocaleString("pl-PL")}) — nie udało się pobrać nowych`);
  return true;
}
function savePricesCache() {
  try {
    localStorage.setItem(
      PRICE_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data: { ...prices } }),
    );
  } catch (e) {}
}

async function fetchJson(url, ms = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

let _refPromise = null;
async function refP(force = false) {
  if (_refPromise) {
    await _refPromise; // trwa odświeżanie — poczekaj
    if (!force) return;
  }
  _refPromise = _refP(force).finally(() => { _refPromise = null; });
  return _refPromise;
}

async function _refP(force) {
  if (!force && (await loadCachedPrices())) return;
  sPT(false, "Pobieranie cen...");
  const failed = [];

  // ── Krypto (CoinGecko) ──
  const cm = {}; // id coingecko -> nasz ticker
  A.forEach((a) => {
    if (a.type === "crypto") {
      const id = COINGECKO_IDS[a.ticker.toUpperCase()] || a.ticker.toLowerCase();
      cm[id] = a.ticker;
    }
  });
  if (Object.keys(cm).length) {
    try {
      const d = await fetchJson(
        `https://api.coingecko.com/api/v3/simple/price?ids=${Object.keys(cm).join(",")}&vs_currencies=pln`,
      );
      Object.entries(cm).forEach(([id, t]) => {
        if (d[id] && d[id].pln) prices[t] = d[id].pln;
      });
    } catch (e) {
      console.warn("[ceny] CoinGecko:", e.message);
      failed.push("krypto");
    }
  }

  // ── ETF / akcje (Cloudflare Worker -> Yahoo Finance) ──
  // Yahoo używa .L dla LSE — konwertujemy .UK -> .L przed wysłaniem,
  // wyniki mapujemy z powrotem na oryginalne klucze .UK
  const ukToL = {};
  const mktTickers = [
    ...new Set(
      A.filter((a) => a.type === "etf" || a.type === "stock").map((a) => {
        if (a.ticker.endsWith(".UK")) {
          const lTicker = a.ticker.replace(/\.UK$/, ".L");
          ukToL[lTicker] = a.ticker;
          return lTicker;
        }
        return a.ticker;
      }),
    ),
  ];
  let fxFallback = false;
  if (mktTickers.length) {
    try {
      const d2 = await fetchJson(
        `${PRICE_WORKER_URL}?tickers=${encodeURIComponent(JSON.stringify(mktTickers))}`,
      );
      Object.entries(d2).forEach(([k, v]) => {
        if (k.startsWith("_")) return; // flagi pomocnicze workera (np. _cur_fallback)
        if (typeof v === "number" && v > 0) prices[ukToL[k] || k] = v;
      });
      fxFallback = !!d2._cur_fallback;
    } catch (e) {
      console.warn("[ceny] Worker:", e.message);
      failed.push("ETF/akcje");
    }
  }

  const missing = missingPriceKeys();
  if (!failed.length && !missing.length) {
    // Cache zapisujemy TYLKO przy kompletnych cenach — inaczej na 12 godzin
    // "zamrażaliśmy" portfel z brakującymi (zerowymi) wycenami.
    savePricesCache();
    if (fxFallback) sPT(false, "⚠ Kursy walut niedostępne — używam przybliżonych (EUR/PLN≈4.27)");
    else sPT(true, `Zaktualizowano ${fmtTime(Date.now())}`);
  } else {
    if (missing.length) loadStalePrices();
    const still = missingPriceKeys();
    if (still.length) sPT(false, `Brak cen: ${still.join(", ")} — sprawdź połączenie`);
    else if (!missing.length)
      sPT(false, `Część cen nieaktualna (${failed.join(", ")}) — nie udało się odświeżyć`);
    // w pozostałym przypadku komunikat "Ceny nieaktualne…" ustawił loadStalePrices()
  }
  rA();
}
