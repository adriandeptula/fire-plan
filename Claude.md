# CLAUDE.md — Instrukcja projektu FIRE Agent

> Czytaj przed każdą sesją. Zawiera pełny kontekst aplikacji.

---

## Co to za aplikacja?

**FIRE Agent** — prywatna PWA dla rodziny Deptuła planującej Fat FIRE. Interfejs po polsku, polskie prawo podatkowe (IKE, podatek Belki, ryczałt od wynajmu 8,5%), dane live (CoinGecko, Yahoo Finance), AI doradca (Claude Sonnet).

**Użytkownicy:** małżeństwo, 2 konta IKE, portfel mieszany (ETF, krypto, nieruchomości, obligacje).

---

## Stack

```
Frontend:    Multi-file SPA — index.html + styles.css + js/*.js
Hosting:     Cloudflare Pages (auto-deploy, branch main)
Workers:     fire-chat.adrianxdeptula.workers.dev   — AI chat (Claude Sonnet)
             fire-prices.adrianxdeptula.workers.dev — ETF/akcje + kursy walut
Baza:        Supabase (PostgreSQL, Frankfurt)
Auth:        Supabase Auth (email + haslo)
Krypto:      CoinGecko API (publiczne, bez klucza)
```

---

## Struktura plikow

```
/
├── index.html          # Caly layout HTML — panele, modale, nawigacja
├── styles.css          # Wszystkie style (ciemny motyw, zmienne CSS)
└── js/
    ├── config.js       # Supabase URL/KEY, TICKER_NAMES, MO[]
    ├── state.js        # Globalny stan: A, S, H, portHistory, loans, liabilities, incs, prices, chatH
    ├── helpers.js      # g(), PLN(), pf(), gTP(), getAV(), getETFCur() i inne
    ├── model.js        # sim(), gP(), calcIkePostFire(), getMRI_IKE(), getMRP(), getINF()
    ├── settings.js     # colS(), apS(), SM{}, uIP(), uPI(), uIkeStrat(), uIkeNetDisplay()
    ├── database.js     # loadDB(), saveA(), sS() (debounced Supabase upsert)
    ├── auth.js         # doLogin(), doLogout(), onLogin(), blankS()
    ├── prices-client.js # refP(), loadCachedPrices(), getETFCur(), PRICE_CACHE_KEY
    ├── assets-table.js # rATbl(), groupAssets(), fmtPrice(), fmtUnits(), paginate(), renderPag()
    ├── assets-modal.js # openAM(), closeAM(), editA(), saveAsset(), onTC(), PAG{}
    ├── liabilities.js  # openLiabModal(), saveLiab(), rLiabList()
    ├── nier.js         # openNierModal(), renderNierList(), addNierFromModal()
    ├── loans.js        # openLoanModal(), addLoan(), addRepay(), rLoans()
    ├── render.js       # rDash(), rPortfel(), rBud(), rPlan(), getCachedSim(), rA()
    ├── calculators.js  # cM(), cMin(), cWyp(), syncSl(), _simFromState()
    ├── monthly.js      # rMies(), cMies(), rozlicz(), rHist(), zapiszKalk()
    ├── nav.js          # gn(), toggleMore(), closeMore()
    ├── chat.js         # sChat(), WORKER_URL, SYS (system prompt)
    ├── chart.js        # renderChart(), rWykres(), simChartData(), toggleChartSeries()
    ├── portfel-tabs.js # swPT(), rPortHist()
    ├── tooltips.js     # initTooltips()
    ├── dialogs.js      # dlgAlert(), dlgConfirm()
    ├── misc.js         # clearAll(), toggleIncognito(), initIncognito()
    └── init.js         # DOMContentLoaded, session check
```

---

## Globalny stan (state.js)

```javascript
let A = []           // Aktywa: [{id, type, ticker, units, mv, wynajem, konto, n, cur}]
let S = { ... }      // Ustawienia uzytkownika (sync z Supabase)
let H = []           // Historia miesieczna kalkulatora domowego
let portHistory = [] // Historia transakcji portfela (max 500 wpisow)
let loans = []       // Kredyty wewnetrzne miedzy kontami
let liabilities = [] // Zobowiazania zewnetrzne (kredyty hipoteczne itp.)
let incs = [...]     // Zrodla dochodu w kalkulatorze miesiecznym
let prices = {}      // Cache cen {ticker: cena, EURPLN, USDPLN}
let chatH = []       // Historia rozmowy z AI (max 10 par = CHAT_MAX_PAIRS)
let user = null      // Zalogowany uzytkownik Supabase
let sT = null        // Timer debounce dla sS()
```

### Obiekt S — wszystkie pola

```javascript
S = {
  wt, wf,           // wiek obecny, docelowy wiek FIRE (poglądowy)
  wy,               // cel wyplaty dzis (zl/mies., realna sila nabywcza)
  inv,              // miesieczna kwota na FIRE
  invInf,           // '1' = wplata rosnie z inflacja co roku

  i1, i2,           // roczne limity IKE konto 1 i 2 (zl/rok)
  i1wpl, i2wpl,     // juz wplacono w tym roku
  ip,               // % limitu IKE faktycznie wplacany (0-100)
  ikeRate,          // zwrot na IKE %/rok (brutto, bez Belki)

  brutto,           // oczekiwany zwrot brutto %/rok
  belka,            // podatek Belki (domyslnie 19%)
  inf,              // stopa inflacji %/rok
  calcBase,         // 'brutto' | 'netto' — podstawa obliczen poza IKE

  wyd, roz,         // wydatki zyciowe, rozrywka (zl/mies.)
  pw, pr,           // % nadwyzki na wakacje, rezerwe

  ks, kr, kn, krt,  // kredyt: saldo, rata, nazwa, oprocentowanie (legacy)

  ikeStrat,         // 'stop' | 'A' | 'B' | 'C' | 'D'
  ikePostInvA,      // A: roczna kwota z portfela poza IKE (zl/rok)
  ikePostInvB1,     // B: % limitu IKE konto 1, z portfela
  ikePostInvB2,     // B: % limitu IKE konto 2, z portfela
  ikePostInvC,      // C: roczna kwota ze zrodla zewnetrznego (zl/rok)
  ikePostInvD1,     // D: % limitu IKE konto 1, zewnetrzne
  ikePostInvD2,     // D: % limitu IKE konto 2, zewnetrzne
}
```

### Zasada — dodawanie nowego pola S (checklist)

Przy kazdy nowym polu zaktualizuj WSZYSTKIE cztery miejsca:

1. `state.js` — domyslna wartosc w `let S = {...}`
2. `misc.js clearAll()` — ta sama wartosc domyslna
3. `auth.js blankS()` — ta sama wartosc domyslna
4. `settings.js SM{}` — mapowanie `"html-id": "klucz"` (jesli jest input HTML)

---

## Typy aktywow

| type | Opis | Wycena |
|------|------|--------|
| `etf` | ETF (XTB) | Yahoo Finance x kurs walutowy |
| `stock` | Akcje | Yahoo Finance x kurs walutowy |
| `crypto` | Kryptowaluty | CoinGecko (odpowiedz juz w PLN) |
| `manual` | Reczne (obligacje EDO, inne) | a.mv (PLN) |
| `nier-sprzedaz` | Nieruchomosc — wartosc rynkowa | a.mv (PLN) |
| `nier-wynajem` | Nieruchomosc — wynajem | a.wynajem zl/mies. brutto |

**Kursy ETF — getETFCur(ticker) w prices-client.js:**
- suffix `.DE` => EUR x EURPLN
- suffix `.UK` lub `.L` => USD x USDPLN
- Wyjatki (priorytet nad suffixem): EGLN.UK, EGLN.L => EUR

**Akcje:** kurs wg a.cur ('USD' / 'EUR' / 'PLN')

---

## Tabela aktywow (assets-table.js)

**groupAssets(A)** — grupuje po kluczu `type:ticker:konto`.
Wyjatki: nier-sprzedaz i nier-wynajem grupowane osobno, z polami `totalMv`/`totalWynajem` i `members[]`.

**rATbl(id, del)** — renderuje tabele. `del=true` = przyciski edit/delete (widok Portfel).
Nier-grupy z count > 1 otwieraja `openNierModal()`. count === 1 = bezposredni edit.

**fmtPrice(a)** — cena w prawidlowej walucie. ETF: getETFCur() => "123.45 USD" / "98.20 EUR".
Akcje: a.cur. Pozostale: PLN(p).

**fmtUnits(u)** — ilosc bez trailing zeros, bez "szt." (szt. jest w naglowku kolumny).

---

## Model symulacji FIRE (model.js)

### sim(params) => wynik

Wejscie: inv, ike, start, iS, wy, wiek, wynajemNetto, ikeStrat, ikePostInv*, i1Limit, i2Limit, invInf

Wyjscie:
```javascript
{ yr, fa, fy,         // lata do FIRE, wiek FIRE, rok FIRE
  tot, iF, pF,        // portfel lacznie/IKE/pozaIKE przy FIRE
  cy,                 // rok CoastFIRE (null jesli nieosiagniety)
  i60, p60, m60,      // portfele i wyplata miesieczna od 60 lat
  G,                  // cel nominalny (tylko do UI)
  wyAtFIRE,           // nominalna wyplata przy FIRE
  infTotal,           // skumulowana inflacja jako ulamek
  wynajemNetto }
```

### Trigger FIRE (v17 — oparty wylacznie na pP)

IKE jest zablokowane do 60. r.z. i nie moze pokryc wyplat w fazie 2:

```javascript
const potrzebaBase = Math.max(0, wyNom - wynajemNetto);
if (potrzebaBase === 0 || pP >= potrzebaBase) {
  // subsymulacja fazy 2: czy pP nie zejdzie do zera przed 60. r.z.?
  // + weryfikacja: m60 >= wyNom x inflAt60
  if (wystarczy) break; // FIRE osiagniety
}
```

**G — wylacznie do UI** (pasek postepu, kafelki, CoastFIRE). Nie decyduje o triggerze:
```
G = max(0, wy - wynajemNetto) x (1+inf)^yr x 12 x 25
```

### Trzy fazy

**Faza 1 — Akumulacja:** pI i pP rosna o wplaty i odsetki co miesiac.
**Faza 2 — Wyplaty (FIRE -> 60):** wyplaty z pP rosna z inflacja (portWithdrawBase x inflFactor). pI rosnie + opcjonalne wplaty wg strategii IKE.
**Faza 3 — Po 60 (IKE odblokowane):** m60 = (i60+p60) x 4%/12 + wynajemAt60

### Stopy zwrotu

- getMRI_IKE() — ikeRate/100/12 (zawsze brutto)
- getMRP() — brutto/100/12 (tryb brutto) lub brutto*(1-belka)/100/12 (tryb netto)
- getINF() — inf/100

---

## Strategie IKE po FIRE

| Kod | Zrodlo | Kwota | fromCapital |
|-----|--------|-------|-------------|
| stop | — | Brak wplat | — |
| A | Portfel poza IKE | ikePostInvA zl/rok (stala) | true |
| B | Portfel poza IKE | (i1*B1% + i2*B2%) x inflFactor / 12 | true |
| C | Zrodlo zewnetrzne | ikePostInvC zl/rok (stala) | false |
| D | Zrodlo zewnetrzne | (i1*D1% + i2*D2%) x inflFactor / 12 | false |

fromCapital=true => kwota odejmowana od pP w danym miesiacu.
Dla B i D limity IKE indeksowane inflacja od momentu FIRE.
ikePostInvA i ikePostInvC to kwoty ROCZNE — calcIkePostFire() dzieli przez 12.

---

## Wykres portfela (chart.js)

- rWykres() / renderChart() — rysuje interaktywny SVG w #chart-wrap
- simChartData() — dane dla wszystkich 3 faz (uzywa getCachedSim())
- 3 serie: Lacznie (#d4a843), IKE (#4eb87a), Poza IKE (#5a9ef0)
- toggleChartSeries(key) — widocznosc serii, stan w localStorage (fire-chart-vis)
- Hover tooltip z wartosciami dla najblizszego roku
- Tlo faz: akumulacja (niebieski), wyplaty (czerwony), IKE otwarte (zielony)

---

## Incognito mode (misc.js)

- toggleIncognito() — przelacza body.incognito, stan w localStorage (fire-incognito)
- initIncognito() — przywraca stan przy kazdym logowaniu
- Checkbox na ekranie logowania (mozna wlaczyc przed zalogowaniem)
- CSS: wartosci finansowe zamazane filter:blur(8px) + pointer-events:none
- Przycisk oczu w sidebarze i na ekranie logowania

---

## Workers Cloudflare

### fire-chat.adrianxdeptula.workers.dev
- POST {system, messages} => {content}
- Wymaga Variable: ANTHROPIC_KEY
- Musi zwracac CORS: Access-Control-Allow-Origin: * + Allow-Methods: POST, OPTIONS
- Brak CORS => blad TypeError w przegladarce (nie HTTP 4xx/5xx!)

### fire-prices.adrianxdeptula.workers.dev
- GET ?tickers=["SXR8.DE","BTC",...] => {"SXR8.DE": 500.12, "EURPLN": 4.27, ...}
- Tickers .UK konwertowane do .L przed zapytaniem, mapowane z powrotem po odpowiedzi
- Cache klienta: 12h w localStorage (PRICE_CACHE_KEY = fire-prices-cache)

---

## Baza danych Supabase

### Tabela assets

Rzeczywisty schemat (zweryfikowany):

```
id            text              PRIMARY KEY
user_id       uuid              REFERENCES auth.users
type          text              -- etf|stock|crypto|manual|nier-sprzedaz|nier-wynajem
ticker        text
units         double precision  -- UWAGA: double precision, nie numeric
manual_val    double precision  -- a.mv w aplikacji; double precision, nie numeric
konto         text              -- ike|poza
nazwa         text              -- a.n w aplikacji
created_at    timestamptz       -- auto
cur           text              -- USD|EUR|PLN (tylko dla type=stock); dodana recznie ALTER TABLE
wynajem_kwota numeric           -- a.wynajem w aplikacji; dodana recznie ALTER TABLE
```

> **Tworzenie od zera** — po utworzeniu tabeli `assets` w Supabase uruchom:
> ```sql
> ALTER TABLE assets
>   ADD COLUMN IF NOT EXISTS cur           text    DEFAULT NULL,
>   ADD COLUMN IF NOT EXISTS wynajem_kwota numeric DEFAULT 0;
> ```
> Supabase tworzy domyslnie id/user_id/type/ticker/units/manual_val/konto/nazwa/created_at.
> `cur` i `wynajem_kwota` wymagaja recznego dodania.

### Tabela settings
```
user_id     uuid PK   REFERENCES auth.users
data        jsonb     -- S + H + portHistory + loans + liabilities + _savedIncs + _wynajemMap
updated_at  timestamptz
```

`data` zawiera rowniez `_wynajemMap: [[id, kwota], ...]` — fallback gdy `wynajem_kwota`
nie zaladuje sie z assets (starsza kompatybilnosc).

---

## Kluczowe funkcje

```javascript
// Formatowanie
g(id)               // document.getElementById(id)
PLN(n)              // "1 234 567 zl" (zaokraglone)
pct(n)              // "12.3%"
pf(v)               // parseFloat(v) || 0
fmtUnits(u)         // "12.5" bez trailing zeros
fmtPrice(a)         // "123.45 USD" | "98.20 EUR" | "450 zl"
sT2(id, v)          // skrot: el.textContent = v

// Portfel
gTP()               // suma wszystkich aktywow
gFirePortfel()      // bez nier-sprzedaz i nier-wynajem
gIKE() / gPoza()    // IKE / poza IKE (bez nier)
gNierSprzedaz()     // suma mv nieruchomosci
getWynajemNetto()   // suma wynajem x 0.915
getTotalLiabilities() // suma liabilities[] || S.ks (legacy fallback)
getAV(a)            // wartosc jednego aktywa w PLN
getIKEM()           // miesieczny limit IKE = (i1+i2)/12 x ip/100

// Symulacja
sim(params)         // glowna symulacja FIRE
gP()                // buduje params do sim() z S i portfela
getCachedSim()      // sim() z cache (invalidowany przy rA())
calcIkePostFire(p)  // miesieczna wplata IKE po FIRE => {monthly, fromCapital}

// Render
rA()                // debounced re-render wszystkiego (80ms)
_rAImmediate()      // natychmiastowy render, invaliduje _simCacheKey

// Dane
colS() / apS()      // formularze <=> S
sS()                // debounced (800ms) zapis do Supabase
blankS()            // fabryka pustego S (auth.js)
```

---

## Konwencje

- Brak frameworkow — vanilla JS
- Zmienne globalne — w state.js, modyfikowane bezposrednio
- HTML IDs — krotkie historyczne (kw, kf, kr) — nie zmieniaj
- Style — wylacznie w styles.css, zero znacznikow style w HTML
- Kolory CSS: --go zloty, --gr zielony, --re czerwony, --bl niebieski, --pu fioletowy, --mu muted
- Przecinek => kropka: normalizeComma() + globalny listener w auth.js onLogin()

---

## Weryfikacja po zmianie

```bash
grep -c '<body'    index.html   # => 1
grep -c '<style'   index.html   # => 0
grep -c 'viewport' index.html   # => 1
```

---

## Changelog

| Wersja | Zmiana |
|--------|--------|
| v18 | Odkryto: kolumny `cur` i `wynajem_kwota` nie istnialy w schemacie Supabase — insert zawsze failowal (blad byl tylko logowany), aktywa nigdy nie trafialy do bazy |
| v18 | Fix saveA(): blad insert/delete teraz rzuca throw zamiast console.warn — setSS("er") + loadDB() przy bledzie |
| v18 | Fix saveA(): `cur` nie jest juz w insert rows gdy kolumna nie istnieje; migracja przez _curMap w settings |
| v18 | Fix doLogout() — pelny sync S z ikeRate, calcBase, ikeStrat, 6x ikePostInv*, invInf |
| v18 | Refaktoryzacja: blankS() w auth.js — jedno miejsce dla domyslnych wartosci S |
| v18 | Usunieto dead code: renderMemberRow() w assets-table.js (nigdy niecallowana) |
| v18 | Fix: podwojny meta viewport w index.html |
| v18 | Fix: duplikat display:flex w .pag-wrap (styles.css) |
| v17 | BREAKING: Trigger FIRE oparty wylacznie na pP — IKE nie moze pokryc wyplat fazy 2 |
| v17 | G wylacznie do UI — zredukowane o wynajemNetto, nie decyduje o triggerze |
| v17 | Wyplaty fazy 2 indeksowane inflacja (portWithdrawBase x inflFactor) |
| v17 | Wynajem indeksowany inflacja w fazie 2, m60 i subsymulacjach |
| v17 | Subsymulacje z pItest + weryfikacja m60check w wieku 60 lat |
| v16 | 4 strategie IKE po FIRE (A/B/C/D + stop) |
| v16 | Kafelek Portfel w wieku 60 lat na Dashboard |
| v16 | Kwoty Dashboard: wartosc dzis (realna) + nominalna ponizej |
| v15 | Ustawienia: slidery => inputy liczbowe; osobne pole IKE rate; calcBase |
