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
├── css/styles.css      # Wszystkie style (ciemny motyw, zmienne CSS)
└── js/
    ├── config.js       # Supabase URL/KEY, TICKER_NAMES, MO[]
    ├── state.js        # Globalny stan: A, S, H, portHistory, portSnapshots, loans, liabilities, incs, prices, chatH
    ├── helpers.js      # g(), PLN(), pf(), esc(), ymNow(), sameId(), gTP(), getAV() i inne
    ├── model.js        # sim(), gP(), calcIkePostFire(), getMRI_IKE(), getMRP(), getINF()
    ├── settings.js     # colS(), apS(), SM{}, uIP(), uPI(), uIkeStrat(), uIkeNetDisplay()
    ├── database.js     # loadDB() (retry+dbReady), saveA() (zapis różnicowy), commitAssets(), sS(), saveSettingsNow(), kopia w localStorage
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
    ├── portfel-tabs.js # swPT(), rPortHist() — 3 zakładki: assets / hist / perf
    ├── port-performance.js # Śledzenie wyników: savePortSnapshot, rPortPerf, openSnapModal, saveSnap, deleteSnap
    ├── tooltips.js     # initTooltips()
    ├── dialogs.js      # dlgAlert(), dlgConfirm()
    ├── misc.js         # clearAll(), toggleIncognito(), initIncognito()
    └── init.js         # DOMContentLoaded, session check
```

---

## Globalny stan (state.js)

```javascript
let A = []              // Aktywa
let S = { ... }         // Ustawienia uzytkownika (sync z Supabase)
let H = []              // Historia miesieczna kalkulatora domowego
let portHistory = []    // Historia transakcji portfela (max 500)
let portSnapshots = []  // Miesięczne snapshoty portfela — wyniki MoM/YoY (max 72)
let loans = []
let liabilities = []
let incs = [...]
let prices = {}
let chatH = []
let user = null
let sT = null
```

### Obiekt S — wszystkie pola

```javascript
S = {
  wt, wf, wy, inv, invInf,
  i1, i2, i1wpl, i2wpl, ip, ikeRate,
  brutto, belka, inf, calcBase,
  wyd, roz, pw, pr,
  ks, kr, kn, krt,
  ikeStrat,
  ikePostInvA, ikePostInvB1, ikePostInvB2,
  ikePostInvC, ikePostInvD1, ikePostInvD2,
}
```

### Struktura portSnapshots[] (v20)

```javascript
portSnapshots = [{
  id:             uuid(),        // unikalny identyfikator
  ts:             ISO string,    // timestamp zapisu (UTC)
  ym:             "2025-05",     // klucz rok-miesiąc — deduplicacja 1/miesiąc
  fire:           Number,        // gFirePortfel() — IKE + Poza IKE
  ike:            Number,        // gIKE()
  poza:           Number,        // gPoza()
  nier:           Number,        // gNierSprzedaz()
  inv:            Number,        // S.inv w chwili auto-snapshotu (tylko referencja)
  deposits:       Number,        // REALNE wpłaty w tym miesiącu (edytowalne)
  depositsEdited: Boolean,       // true = użytkownik ręcznie ustawił deposits
}]
// Max 72 (6 lat). Zapisywane w settings.data.portSnapshots.
// Auto-zapis raz na miesiąc w onLogin() po await refP().
// deposits domyślnie = inv, depositsEdited = false.
// Użytkownik edytuje przez ✎ w tabeli Wyniki → depositsEdited = true.
```

### "Zysk rynkowy" — metodologia

```
Zysk rynkowy = (curr.fire − prev.fire) − deposits
```

- Używa `_snapDeposits(snap)` dla backward compat (stare snapshoty bez deposits)
- `deposits = inv` gdy `depositsEdited = false` → oznaczone "szac." w tabeli
- Dokładny gdy użytkownik wpisze realne wpłaty przez modal

### ZASADY ZAPISU DO BAZY (v21 — NIE ŁAMAĆ)

Incydent 10.2026: po wznowieniu uśpionego projektu Supabase API zwracało 503 (PGRST002),
a stary kod potrafił skasować aktywa (`delete` wszystkich + `insert`) lub nadpisać ustawienia pustym stanem.

1. Zapis tylko gdy `dbReady === true` (ustawia go `loadDB()` po PEŁNYM, udanym wczytaniu aktywów i ustawień).
   Każda funkcja zapisu woła `requireDb()` lub jest chroniona w `database.js`.
2. `loadDB()` ponawia zapytania (503/sieć), a stan globalny podmienia dopiero na końcu. Zwraca true/false.
3. NIGDY `delete().eq("user_id")` na całej tabeli. `saveA()` wysyła tylko różnice (INSERT/UPDATE/DELETE po id)
   względem `dbRows` (to co wiemy, że jest w bazie).
4. Zmiany aktywów i historii robimy przez `commitAssets(() => { ...mutacja A / portHistory... })` —
   przy błędzie zapisu stan lokalny jest cofany, a użytkownik dostaje komunikat. Nie wołać `loadDB()` "na ślepo" po błędzie.
5. Zapis musi być pewny (zobowiązania, pożyczki, historia miesięczna) → `await saveSettingsNow()`; `sS()` jest debounced i nie czeka.
6. Kopia zapasowa w localStorage (`fire-backup-v1`): po udanym zapisie; gdy baza ma 0 aktywów, a kopia niepustą — pytanie o przywrócenie.
7. Teksty użytkownika do innerHTML zawsze przez `esc()`.
8. Supabase Free NIE ma kopii zapasowych — raz na jakiś czas wyeksportuj tabele (Table Editor → Export CSV) albo przejdź na Pro.

### Zasada — dodawanie nowej tablicy stanu

Przy każdej nowej tablicy zaktualizuj 5 miejsc:
1. `state.js` — `let nazwaTab = []`
2. `auth.js doLogout()` — `nazwaTab = []`
3. `misc.js clearAll()` — `nazwaTab = []`
4. `database.js loadDB()` — `if (d.nazwaTab) { nazwaTab = d.nazwaTab; delete d.nazwaTab; }`
5. `database.js settingsPayload()` — dodaj `nazwaTab,` do zwracanego obiektu (jedno miejsce, używa go sS i saveSettingsNow)

---

## Typy aktywow

| type | Opis | Wycena |
|------|------|--------|
| `etf` | ETF (XTB) | Yahoo Finance x kurs walutowy |
| `stock` | Akcje | Yahoo Finance x kurs walutowy |
| `crypto` | Kryptowaluty | CoinGecko (PLN) |
| `manual` | Reczne (obligacje EDO, inne) | a.mv (PLN) |
| `nier-sprzedaz` | Nieruchomosc — wartosc rynkowa | a.mv (PLN) |
| `nier-wynajem` | Nieruchomosc — wynajem | a.wynajem zl/mies. brutto |

---

## Zakładki portfela (portfel-tabs.js)

`swPT(tab)` — 3 zakładki:
- `assets` — tabela aktywów (domyślna)
- `hist` — historia transakcji (`rPortHist()`)
- `perf` — wyniki portfela MoM/YoY (`rPortPerf()`)

---

## Śledzenie wyników portfela (port-performance.js)

### Funkcje

```javascript
_snapDeposits(snap)        // backward compat: deposits ?? inv ?? 0
savePortSnapshot(force)    // auto-snapshot raz na miesiąc (onLogin po refP)
openSnapModal(id = null)   // otwiera modal: null = dodaj, id = edytuj
closeSnapModal()           // zamyka modal
saveSnap()                 // zapisuje snapshot z modala (upsert po ym)
deleteSnap(id)             // usuwa snapshot po potwierdzeniu
rPortPerf()                // renderuje zakładkę Wyniki
```

### Tabela Wyniki — 7 kolumn

| Kolumna | Formuła | Uwagi |
|---------|---------|-------|
| Miesiąc | ym → MO[] + rok | minibar proporcjonalny do maxFire |
| Portfel FIRE | curr.fire | + IKE breakdown |
| Zmiana MoM | curr.fire − prev.fire | pełna zmiana |
| Wpłaty | `_snapDeposits(curr)` | szary + "szac." gdy !depositsEdited |
| Zysk rynkowy | MoM − Wpłaty | czysty zysk z rynku |
| YoY % | (curr − yearAgo) / yearAgo | ten sam miesiąc rok temu |
| Akcje | ✎ edit + ✕ delete | openSnapModal(id) / deleteSnap(id) |

### Modal snapshotu (snap-modal w index.html)

Pola:
- `snap-id` (hidden) — id edytowanego snapshotu lub pusty dla nowego
- `snap-ym` (select) — tylko przeszłe miesiące bez istniejących (add) / locked (edit)
- `snap-fire` — wartość portfela FIRE łącznie
- `snap-ike` / `snap-poza` — opcjonalny podział (poza = fire − ike jeśli puste)
- `snap-deposits` — realne wpłaty (domyślnie S.inv)

### Separatory roczne

Wstawiane przy zmianie roku w malejącej tabeli:
```
colspan(2) label "Łącznie YYYY" | gain PLN | colspan(4) gain% | —
= 2+1+4 = 7 kolumn ✓
```

---

## Model symulacji FIRE (model.js)

### Trigger FIRE (v17 — oparty wylacznie na pP)

```javascript
const potrzebaBase = Math.max(0, wyNom - wynajemNetto);
if (potrzebaBase === 0 || pP >= potrzebaBase) {
  // subsymulacja fazy 2 + weryfikacja m60
  if (wystarczy) break;
}
```

G = max(0, wy − wynajemNetto) × (1+inf)^yr × 12 × 25 — tylko do UI

### Trzy fazy

- **Faza 1 Akumulacja:** pI i pP rosną o wplaty i odsetki
- **Faza 2 Wypłaty (FIRE→60):** wypłaty z pP rosną z inflacją, pI rośnie + opcjonalne wpłaty wg strategii IKE
- **Faza 3 Po 60:** m60 = (i60+p60) × 4%/12 + wynajemAt60

---

## Strategie IKE po FIRE

| Kod | Źródło | fromCapital |
|-----|--------|-------------|
| stop | brak wpłat | — |
| A | portfel poza IKE, stała kwota | true |
| B | portfel poza IKE, % limitu × inflFactor | true |
| C | zewnętrzne, stała kwota | false |
| D | zewnętrzne, % limitu × inflFactor | false |

---

## Workers Cloudflare

### fire-chat.adrianxdeptula.workers.dev
- POST {system, messages} → {content}
- Wymaga: ANTHROPIC_KEY w Variables

### fire-prices.adrianxdeptula.workers.dev
- GET ?tickers=[...] → {ticker: price, EURPLN, USDPLN}
- Cache klienta: 12h localStorage (PRICE_CACHE_KEY)

---

## Baza danych Supabase

### Tabela assets
```
id, user_id, type, ticker, units (double), manual_val (double),
konto, nazwa, created_at, cur (text, ręcznie), wynajem_kwota (numeric, ręcznie)
```
RLS musi być włączone na `assets` i `settings` (polityka: `user_id = auth.uid()`) — klucz anon jest publiczny w config.js.

### Tabela settings
```
user_id PK, updated_at,
data jsonb: S + H + portHistory + portSnapshots + loans + liabilities + _wynajemMap
```

---

## Kluczowe funkcje

```javascript
// Port performance
_snapDeposits(snap)     // backward compat getter dla deposits
savePortSnapshot(force) // auto-snapshot (onLogin po refP)
openSnapModal(id)       // modal dodaj/edytuj
saveSnap()              // zapis z modala
deleteSnap(id)          // usuń z potwierdzeniem
rPortPerf()             // render zakładki Wyniki

// Portfel
gTP()                   // suma wszystkich aktywów
gFirePortfel()          // bez nier
gIKE() / gPoza()
gNierSprzedaz()
getWynajemNetto()
getTotalLiabilities()
getAV(a)
getIKEM()

// Symulacja
sim(params)
gP()
getCachedSim()
calcIkePostFire(p)

// Render
rA()                    // debounced 80ms re-render
colS() / apS()
sS()                    // debounced 800ms Supabase save
saveSettingsNow()       // natychmiastowy zapis
```

---

## Konwencje

- Vanilla JS, brak frameworków
- Zmienne globalne w state.js, modyfikowane bezpośrednio
- Style wyłącznie w styles.css
- Kolory: --go złoty, --gr zielony, --re czerwony, --bl niebieski, --pu fioletowy, --mu muted
- Przecinek→kropka: normalizeComma() + globalny listener w onLogin()

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
| v21 | FIX KRYTYCZNY: koniec z "delete all + insert" w saveA(); zapis różnicowy; flaga dbReady; retry po 503; commitAssets z rollbackiem; kopia w localStorage |
| v21 | FIX: monthly.js był kopią assets-table.js (od 7.05) — przywrócony kalkulator domowy i historia z commita 11745c7 |
| v21 | FIX: _savedIncs znikały z bazy po pierwszym zapisie ustawień; edycja akcji spoza listy zapisywała pusty typ; druga nieruchomość była scalana z pierwszą |
| v21 | FIX: ceny — cache nie zapisuje się przy niekompletnych danych, fallback na stare ceny; auto-snapshot tylko przy kompletnych cenach; przyciski ✎/✕ na mobile; podświetlenie menu; kolejka dialogów; esc() |
| v20 | Śledzenie wyników: realne wpłaty per miesiąc (deposits, depositsEdited) zamiast szacunku z S.inv |
| v20 | Modal snapshotu: dodawanie historycznych miesięcy, edycja, usuwanie |
| v20 | "Zysk rynkowy" = MoM − deposits (realne), nie MoM − inv (plan) |
| v20 | Backward compat: _snapDeposits() dla snapshots sprzed v20 |
| v20 | Separator roczny: zaktualizowany colspan dla 7 kolumn (2+1+4=7) |
| v19 | Nowa funkcja: śledzenie wyników portfela MoM/YoY — zakładka "Wyniki" |
| v19 | Nowy plik: js/port-performance.js |
| v19 | Nowa tablica stanu: portSnapshots[] w state.js (max 72 = 6 lat) |
| v19 | database.js: portSnapshots w settings.data |
| v19 | auth.js: portSnapshots=[] w doLogout; savePortSnapshot() w onLogin po refP |
| v19 | misc.js: portSnapshots=[] w clearAll |
| v19 | portfel-tabs.js: trzecia zakładka perf |
| v18 | Fix saveA(): throw zamiast console.warn; setSS("er") + loadDB() przy błędzie |
| v18 | Fix doLogout(): pełny sync S |
| v18 | Refaktoryzacja: blankS() w auth.js — jedyne źródło domyślnych wartości S |
| v17 | BREAKING: Trigger FIRE oparty wyłącznie na pP |
| v17 | Wypłaty fazy 2 indeksowane inflacją |
| v16 | 4 strategie IKE po FIRE (A/B/C/D + stop) |
| v15 | Ustawienia: osobne pole IKE rate; calcBase |
