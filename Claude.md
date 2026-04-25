# CLAUDE.md — Instrukcja projektu FIRE Agent

> Ten plik zawiera pełny kontekst aplikacji dla Claude — czytaj go przed każdą sesją pracy z kodem.

---

## Co to za aplikacja?

**FIRE Agent** to prywatna aplikacja webowa (PWA) dla rodziny Deptuła planującej Fat FIRE. Aplikacja jest po polsku, używa polskiego prawa podatkowego (IKE, podatek Belki, ryczałt od wynajmu), danych na żywo (CoinGecko, Yahoo Finance) i AI doradcy (Claude Sonnet).

**Użytkownicy:** małżeństwo, 2 konta IKE, portfel mieszany (ETF, krypto, nieruchomości).

---

## Stack i architektura

```
Frontend:    Multi-file SPA — index.html + css/ + js/
Hosting:     Cloudflare Pages (auto-deploy z GitHub, branch main)
Workers:     Cloudflare Workers (2 workery — chat i ceny)
Baza:        Supabase (PostgreSQL, Frankfurt)
Auth:        Supabase Auth (email + hasło)
Krypto:      CoinGecko API (publiczne)
ETF/akcje:   Yahoo Finance via fire-prices.adrianxdeptula.workers.dev
AI Chat:     Claude Sonnet via fire-chat.adrianxdeptula.workers.dev
```

**Ważne:** Nie ma Netlify. Netlify zostało zastąpione przez Cloudflare Pages + Workers.

---

## Struktura plików

```
/
├── index.html              # HTML — cały layout, wszystkie panele, modale
├── css/
│   └── styles.css          # Wszystkie style (ciemny motyw, zmienne CSS)
└── js/
    ├── config.js           # Supabase URL/KEY, TICKER_NAMES, MO[]
    ├── state.js            # Globalny stan: A, S, H, portHistory, loans, liabilities, incs, prices, chatH
    ├── helpers.js          # g(), PLN(), pf(), gTP(), gFirePortfel(), gIKE(), gPoza(), getAV(), getETFCur()…
    ├── model.js            # sim(), gP(), calcIkePostFire(), getMRI_IKE(), getMRP(), getINF()
    ├── settings.js         # colS(), apS(), SM{}, uIP(), uPI(), uIkeStrat(), uIkeNetDisplay()
    ├── database.js         # loadDB(), saveA(), sS() (debounced Supabase upsert)
    ├── auth.js             # doLogin(), doLogout(), onLogin()
    ├── prices-client.js    # refP(), loadCachedPrices(), getETFCur(), PRICE_CACHE_KEY
    ├── assets-table.js     # rATbl(), groupAssets(), fmtPrice(), fmtUnits(), renderPag(), paginate()
    ├── assets-modal.js     # openAM(), closeAM(), editA(), saveAsset(), delA(), onTC()
    ├── liabilities.js      # openLiabModal(), saveLiab(), rLiabList(), getTotalLiabilities()
    ├── nier.js             # openNierModal(), renderNierList(), addNierFromModal()
    ├── loans.js            # openLoanModal(), addLoan(), addRepay(), rLoans()
    ├── render.js           # rDash(), rPortfel(), rBud(), rPlan(), getCachedSim(), rA()
    ├── calculators.js      # cM(), cMin(), cWyp(), syncSl(), _simFromState()
    ├── monthly.js          # rMies(), cMies(), rozlicz(), rHist(), zapiszKalk()
    ├── nav.js              # gn(), toggleMore(), closeMore()
    ├── chat.js             # sChat(), WORKER_URL, SYS (system prompt)
    ├── portfel-tabs.js     # swPT(), rPortHist()
    ├── tooltips.js         # initTooltips()
    ├── dialogs.js          # dlgAlert(), dlgConfirm()
    ├── misc.js             # clearAll()
    └── init.js             # DOMContentLoaded, session check, event listeners
```

---

## Globalny stan (`state.js`)

```javascript
let A = []          // Aktywa: [{id, type, ticker, units, mv, wynajem, konto, n, cur}]
let S = { ... }     // Ustawienia użytkownika (synchronizowane z Supabase)
let H = []          // Historia miesięczna kalkulatora domowego
let portHistory = []// Historia transakcji portfela (max 500)
let loans = []      // Kredyty wewnętrzne
let liabilities = []// Zobowiązania (kredyty hipoteczne)
let incs = [...]    // Źródła dochodu w kalkulatorze miesięcznym
let prices = {}     // Cache cen {ticker: cena, EURPLN, USDPLN}
let chatH = []      // Historia rozmowy z AI
let user = null     // Zalogowany użytkownik Supabase
let sT = null       // Timer debounce dla saveSettings
```

### Obiekt S — kluczowe pola

```javascript
S = {
  wt:            // Wiek obecny
  wf:            // Docelowy wiek FIRE
  wy:            // Cel wypłaty dziś (zł/mies. realne)
  inv:           // Miesięczna kwota na FIRE
  i1, i2:        // Roczne limity IKE (konto 1, konto 2)
  i1wpl, i2wpl:  // Już wpłacono w tym roku
  ip:            // % limitu IKE wpłacany (0-100)
  brutto:        // Oczekiwany zwrot brutto %
  belka:         // Podatek Belki %
  inf:           // Stopa inflacji %
  ikeRate:       // Zwrot na IKE % (brutto, bez Belki)
  calcBase:      // 'brutto' | 'netto' — podstawa obliczeń poza IKE
  ikeStrat:      // 'stop' | 'A' | 'B' | 'C' | 'D'
  ikePostInvA:   // Opcja A: roczna kwota z portfela poza IKE
  ikePostInvB1:  // Opcja B: % limitu IKE konto 1 z portfela
  ikePostInvB2:  // Opcja B: % limitu IKE konto 2 z portfela
  ikePostInvC:   // Opcja C: roczna kwota ze źródła zewnętrznego
  ikePostInvD1:  // Opcja D: % limitu IKE konto 1 zewnętrzne
  ikePostInvD2:  // Opcja D: % limitu IKE konto 2 zewnętrzne
  invInf:        // '1' jeśli wpłata rośnie z inflacją
}
```

---

## Model symulacji FIRE (`model.js`)

### `sim(params)` — zwraca wynik symulacji

```javascript
sim({
  inv,           // miesięczna wpłata
  ike,           // miesięczny limit IKE
  start,         // portfel startowy (łącznie)
  iS,            // portfel IKE startowy
  wy,            // cel wypłaty dziś (realne zł)
  wiek,          // obecny wiek
  wynajemNetto,  // dochód netto z wynajmu/mies.
  ikeStrat,      // 'stop'|'A'|'B'|'C'|'D'
  ikePostInvA, ikePostInvB1, ikePostInvB2,
  ikePostInvC, ikePostInvD1, ikePostInvD2,
  i1Limit, i2Limit, // roczne limity IKE
  invInf,        // bool — czy wpłata rośnie z inflacją
})
// zwraca:
{
  yr,       // lata do FIRE
  fa,       // wiek przy FIRE
  fy,       // rok FIRE
  tot,      // łączny portfel przy FIRE
  iF,       // IKE przy FIRE
  pF,       // poza IKE przy FIRE
  cy,       // rok CoastFIRE (null jeśli nie osiągnięty)
  i60,      // IKE w wieku 60 lat
  p60,      // poza IKE w wieku 60 lat
  m60,      // miesięczna wypłata od 60 lat (nominalna)
  G,        // cel nominalny portfela
  wyAtFIRE, // nominalna wypłata miesięczna przy FIRE
  infTotal, // skumulowana inflacja jako ułamek
  wynajemNetto,
}
```

### `calcIkePostFire(params)` — wpłata na IKE po FIRE

```javascript
// Zwraca { monthly, fromCapital }
// fromCapital=true → zmniejsza portfel poza IKE
// fromCapital=false → ze źródła zewnętrznego (nie zmniejsza portfela)
```

### Logika warunków FIRE

Symulacja kończy się gdy JEDNOCZEŚNIE:
1. `pI + pP >= G` (portfel ≥ cel nominalny)
2. `pP wystarczy na wypłaty do 60. r.ż.` — weryfikowane przez subsymulację fazy 2

### Stopy zwrotu

- `getMRI_IKE()` → brutto/12 (IKE — bez Belki zawsze)
- `getMRP()` → brutto/12 (tryb brutto) lub brutto*(1-Belka)/12 (tryb netto)

---

## Strategie IKE po FIRE

| Kod | Opis | fromCapital |
|-----|------|-------------|
| `stop` | Brak wpłat | — |
| `A` | Stała kwota rocznie z portfela poza IKE | `true` |
| `B` | % limitu IKE (indeks. inflacją) z portfela | `true` |
| `C` | Stała kwota rocznie ze źródła zewnętrznego | `false` |
| `D` | % limitu IKE (indeks. inflacją) ze źródła zewn. | `false` |

**Uwaga:** Dla opcji B i D limity IKE są mnożone przez `(1+inf)^yearsFromFire`.

---

## Typy aktywów (`type` w obiekcie Asset)

| type | Opis | Wycena |
|------|------|--------|
| `etf` | ETF (XTB) | Yahoo Finance × kurs walutowy |
| `stock` | Akcje | Yahoo Finance × kurs walutowy |
| `crypto` | Kryptowaluty | CoinGecko × 1 (już w PLN) |
| `manual` | Ręczne (obligacje EDO, inne) | `a.mv` |
| `nier-sprzedaz` | Nieruchomość — wartość rynkowa | `a.mv` |
| `nier-wynajem` | Nieruchomość — wynajem | `a.wynajem` /mies. |

**Kursy ETF:**
- Końcówka `.DE` → EUR × EURPLN
- Końcówka `.UK` lub `.L` → USD × USDPLN (LSE trade in USD)

**Akcje:** kurs zależy od `a.cur` (`USD`/`EUR`/`PLN`)

---

## Workers Cloudflare

### `fire-chat.adrianxdeptula.workers.dev`
- Metoda: `POST`
- Body: `{ system: "...", messages: [{role, content}] }`
- Odpowiedź: `{ content: "odpowiedź asystenta" }`
- **Wymagane Variable:** `ANTHROPIC_KEY = "sk-ant-..."`
- **Wymagane CORS:** `Access-Control-Allow-Origin: *`

### `fire-prices.adrianxdeptula.workers.dev`
- Parametr: `?tickers=["SXR8.DE","BTC",...]` (JSON encoded)
- Odpowiedź: `{ "SXR8.DE": 500.12, "EURPLN": 4.27, "USDPLN": 3.85, ... }`
- Cache po stronie klienta: 12h w localStorage (`fire-prices-cache`)

---

## Baza danych Supabase

### Tabela `assets`
```sql
id          text PRIMARY KEY
user_id     uuid REFERENCES auth.users
type        text    -- 'etf'|'stock'|'crypto'|'manual'|'nier-sprzedaz'|'nier-wynajem'
ticker      text
units       numeric
manual_val  numeric
konto       text    -- 'ike'|'poza'
nazwa       text
cur         text    -- 'USD'|'EUR'|'PLN' (dla akcji)
```

### Tabela `settings`
```sql
user_id     uuid PRIMARY KEY REFERENCES auth.users
data        jsonb   -- cały obiekt S + H, portHistory, loans, liabilities, _savedIncs, _wynajemMap
updated_at  timestamptz
```

---

## Kluczowe funkcje pomocnicze

```javascript
g(id)              // document.getElementById(id)
PLN(n)             // formatuj jako "1 234 567 zł"
pf(v)              // parseFloat(v) || 0
gTP()              // łączna wartość wszystkich aktywów
gFirePortfel()     // portfel FIRE (bez nier-sprzedaz)
gIKE()             // wartość aktywów na IKE
gPoza()            // wartość aktywów poza IKE
getAV(a)           // wartość pojedynczego aktywa
getIKEM()          // miesięczny limit wpłat IKE = (i1+i2)/12 × ip%
getWynajemNetto()  // suma wynajmu × 0.915
getTotalLiabilities() // suma zobowiązań
getCachedSim()     // sim() z cache (invalidate przy każdym rA())
rA()               // debounced re-render całej aplikacji
colS()             // odczyt formularzy → S
apS()              // S → wartości formularzy
sS()               // debounced Supabase save (800ms)
```

---

## Konwencje kodowania

- **Identyfikatory HTML:** krótkie, np. `kw`, `kf`, `kr`, `ki`, `k60-real` — historyczne, nie zmieniaj bez potrzeby
- **Zmienne globalne:** wszystkie w `state.js`, modyfikowane przez funkcje z innych plików
- **Brak frameworków:** czysty vanilla JS — brak React, Vue, jQuery
- **CSS:** zmienne CSS `var(--go)`, `var(--gr)`, `var(--re)`, `var(--bl)` dla kolorów
- **Formatowanie liczb:** zawsze `PLN()` dla złotówek, `pct()` dla procentów
- **Debouncing:** `rA()` (80ms), `sS()` (800ms)
- **Przecinek → kropka:** `normalizeComma()` i globalny listener w `auth.js`

---

## Kolory CSS

```
--go  #d4a843   złoty (primary, FIRE)
--gr  #4eb87a   zielony (zysk, IKE)
--re  #e05a6a   czerwony (ryzyko, dług)
--bl  #5a9ef0   niebieski (poza IKE)
--pu  #9b7fe8   fioletowy (nieruchomości)
--mu  #5a5878   muted (podtytuły, labels)
--t   #e8e6f0   tekst główny
--t2  #a8a4c0   tekst drugorzędny
```

---

## Częste błędy i pułapki

### 1. Worker CORS
Worker `fire-chat` MUSI zwracać:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```
Bez tego przeglądarka blokuje odpowiedź (błąd TypeError, nie HTTP).

### 2. sim() — ikePostInv jest ROCZNA
Dla opcji A i C: `ikePostInvA/C` to kwota **roczna** (zł/rok), model dzieli przez 12 wewnętrznie w `calcIkePostFire()`.

### 3. Cache symulacji
`_simCacheKey` jest invalidowany na początku każdego `_rAImmediate()`. Jeśli chcesz wymusić przeliczenie, wywołaj `rA()`.

### 4. Paginacja
Tabela aktywów (`#at`) używa paginacji. Stan w `PAG.assets` i `PAG.hist`. Reset strony przez `setPagPage('assets', 0)`.

### 5. Wynajem w bazie danych
Kolumna w Supabase to `wynajem_kwota` (LUB `wynajem` — fallback). Przy `loadDB()` aplikacja próbuje obu. Dodatkowy fallback: `_wynajemMap` w settings JSON.

### 6. Dodawanie nowego pola do S
1. Dodaj klucz i wartość domyślną w `state.js` w obiekcie `S`
2. Dodaj mapowanie `html-id: 'klucz'` w `SM` w `settings.js` (jeśli jest input HTML)
3. Dodaj domyślną wartość też w `clearAll()` w `misc.js`

---

## Testowanie zmian

1. Zmień plik w `/home/claude/`, sprawdź logikę
2. Skopiuj do `/mnt/user-data/outputs/` lub dostarcz diff
3. Przetestuj scenariusze:
   - Brak aktywów, brak ustawień
   - Różne strategie IKE (stop/A/B/C/D)
   - FIRE już osiągnięty (yr ≤ 0)
   - Brak połączenia z workerem (sChat)

---

## Changelog ostatnich zmian

| Wersja | Zmiana |
|--------|--------|
| v16 | 4 strategie IKE po FIRE (A/B/C/D + stop), fix ikePostInv roczna vs miesięczna |
| v16 | Nowy kafelek Dashboard: "Portfel w wieku 60 lat" (poza IKE + IKE + łącznie) |
| v16 | Wszystkie kwoty dash: wartość dziś (realna) + nominalna poniżej |
| v16 | Fix chat.js: prawidłowy URL workera, lepsze komunikaty błędów |
| v15 | Strategie IKE: stop + cont (zastąpione przez v16) |
| v15 | Kafelki "Portfel poza IKE przy FIRE" i "Portfel IKE przy FIRE" |
| v15 | Ustawienia: slidery → inputy liczbowe, osobne pole IKE rate |
