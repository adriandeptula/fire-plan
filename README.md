# 🔥 FIRE Agent — Twój osobisty planer wolności finansowej

> **Zbuduj majątek. Oblicz cel. Osiągnij niezależność finansową.**  
> Aplikacja PWA dla Polaków planujących **Fat FIRE** — uwzględnia polskie podatki, IKE i realia rynkowe.

🔗 **[https://ak47-fire-plan.pages.dev/](https://ak47-fire-plan.pages.dev/)**

[![Status](https://img.shields.io/badge/status-aktywny-brightgreen?style=flat-square)](https://ak47-fire-plan.pages.dev/)
[![Deployed on](https://img.shields.io/badge/deployed%20on-Cloudflare%20Pages-F6821F?style=flat-square&logo=cloudflare)](https://pages.cloudflare.com)
[![Data](https://img.shields.io/badge/dane-Supabase-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![AI](https://img.shields.io/badge/AI-Claude%20Sonnet-orange?style=flat-square)](https://anthropic.com)

---

## 🤔 Co to jest FIRE?

**FIRE** *(Financial Independence, Retire Early)* to strategia życiowa, której celem jest zgromadzenie takiego majątku, żeby **nie trzeba było już pracować dla pieniędzy**.

**Fat FIRE** to wersja z wyższym standardem życia — celem jest wygodne życie bez liczenia każdej złotówki.

```
💡 Prosta zasada: jeśli Twój majątek wynosi 25× Twoje roczne wydatki,
   możesz wypłacać 4% rocznie i statystycznie nigdy nie skończy Ci się kasa.
   
   Przykład: wydajesz 15 000 zł/mies. → potrzebujesz ~4 500 000 zł
```

---

## 🚀 Funkcje aplikacji

| Funkcja | Opis |
|--------|------|
| 📊 **Dashboard FIRE** | Postęp, wiek FIRE, portfel w wieku 60 lat, wypłaty dziś i nominalne |
| 💼 **Portfel** | Krypto live (CoinGecko), ETF/akcje live (Yahoo Finance via Cloudflare Worker) |
| 📅 **Symulator FIRE** | Trójfazowa symulacja: akumulacja → wypłaty → IKE odblokowane |
| 💰 **Budżet** | Planowanie wpłat, limity IKE, strategie po FIRE (4 opcje) |
| 🏠 **Nieruchomości** | Wartość rynkowa + wynajem netto (ryczałt 8,5%) |
| 🏦 **Kredyty wewnętrzne** | Przepływy między 6 sub-kontami |
| 🤖 **AI Doradca** | Claude Sonnet zna Twój portfel i plan FIRE |

---

## 📐 Jak działa symulator?

### Faza 1: Akumulacja (teraz → wiek FIRE)

```
Co miesiąc:
  Portfel IKE   = IKE   × (1 + 7%/12) + wpłata_IKE
  Portfel poza  = poza  × (1 + 7%/12) + wpłata_poza
  
  Opcjonalnie: wpłata rośnie o inflację co rok
```

Symulacja kończy się gdy portfel ≥ cel nominalny ORAZ portfel poza IKE wystarczy na wypłaty do 60. r.ż.

### Faza 2: Wolność finansowa (wiek FIRE → 60 lat)

```
Co miesiąc:
  Portfel poza IKE rośnie o stopę zwrotu
  Wypłacasz cel_wypłaty_nominalny / 12 (minus dochód z wynajmu)
  IKE rośnie samodzielnie (lub z wpłatami wg wybranej strategii)
```

### Faza 3: Od 60. roku życia (IKE odblokowane)

```
Dostęp do IKE bez podatku Belki!
Łączna wypłata = 4% × (portfel_poza + IKE) / 12 + wynajem_netto
```

---

## 🏛️ Polskie realia podatkowe

### IKE (Indywidualne Konto Emerytalne)
- **Limit wpłat:** ~26 000–28 000 zł/rok na osobę (aktualizuj co roku)
- **Korzyść:** brak podatku Belki (19%) przy wypłacie po 60. roku życia
- **W aplikacji:** 2 konta IKE (Ty + Żona), % limitu który faktycznie wpłacasz

### Podatek Belki (19%)
- Na IKE: **0%** — ogromna korzyść przy dużych kwotach
- Poza IKE: odliczany rocznie (tryb netto) lub na końcu (tryb brutto)

### Wynajem
- Ryczałt 8,5% → netto = brutto × 91,5%
- Dochód z wynajmu wliczany do wypłat FIRE przed 60. r.ż.

---

## 🔧 Strategie IKE po FIRE

Po przejściu na FIRE masz 4 opcje (+ brak wpłat):

| Opcja | Źródło | Kwota |
|-------|--------|-------|
| **A** | Portfel poza IKE | Stała roczna kwota |
| **B** | Portfel poza IKE | % limitu IKE (indeksowany inflacją) |
| **C** | Zewnętrzne (praca, wynajem) | Stała roczna kwota |
| **D** | Zewnętrzne | % limitu IKE (indeksowany inflacją) |

Opcja D jest optymalna — portfel FIRE pozostaje nienaruszony, a IKE rośnie szybciej.

---

## 🛠️ Stack technologiczny

```
Frontend:    HTML / CSS / JavaScript (multi-file, single-page)
Hosting:     Cloudflare Pages (git push → deploy automatyczny)
Backend:     Cloudflare Workers:
               • fire-chat.adrianxdeptula.workers.dev  → AI chat (Claude Sonnet)
               • fire-prices.adrianxdeptula.workers.dev → ETF/akcje (Yahoo Finance + kursy walut)
Baza danych: Supabase (PostgreSQL) — region Frankfurt
Ceny krypto: CoinGecko API (publiczne, bez klucza)
AI:          Claude Sonnet via Cloudflare Worker (klucz ANTHROPIC_KEY w Cloudflare Variables)
```

---

## 📦 Struktura projektu

```
/
├── index.html          # Struktura HTML
├── css/
│   └── styles.css      # Wszystkie style
└── js/
    ├── config.js       # Supabase config, TICKER_NAMES, stałe
    ├── state.js        # Globalny stan aplikacji (A, S, H, loans…)
    ├── helpers.js      # Funkcje pomocnicze (PLN, pf, gTP…)
    ├── model.js        # Symulacja FIRE (sim()), calcIkePostFire()
    ├── settings.js     # Odczyt/zapis ustawień, colS(), apS()
    ├── database.js     # Supabase: loadDB(), saveA(), sS()
    ├── auth.js         # Login/logout Supabase
    ├── prices-client.js# Pobieranie cen ETF/krypto, cache 12h
    ├── assets-table.js # Tabela aktywów, fmtPrice(), grupowanie
    ├── assets-modal.js # Modal dodawania/edycji aktywów
    ├── liabilities.js  # Zobowiązania (kredyty hipoteczne)
    ├── nier.js         # Modal zarządzania nieruchomościami
    ├── loans.js        # Kredyty wewnętrzne
    ├── render.js       # rDash(), rPortfel(), rBud(), rPlan()
    ├── calculators.js  # cM(), cMin(), cWyp()
    ├── monthly.js      # Kalkulator miesięczny, historia
    ├── nav.js          # Nawigacja (gn(), toggleMore())
    ├── chat.js         # AI Agent (sChat(), Worker URL)
    ├── portfel-tabs.js # Zakładki portfela, historia transakcji
    ├── tooltips.js     # Pozycjonowanie tooltipów
    ├── dialogs.js      # Niestandardowe dialogi (dlgAlert, dlgConfirm)
    ├── misc.js         # clearAll()
    └── init.js         # DOMContentLoaded, sesja Supabase
```

---

## 🚀 Deployment

### Cloudflare Pages
1. Push do GitHub → Cloudflare Pages buduje automatycznie
2. Branch: `main` → produkcja
3. Build command: brak (statyczny HTML)
4. Output directory: `/`

### Cloudflare Workers
Dwa workery — oba w dashboard Cloudflare:

**fire-chat** (AI Agent):
```javascript
// Wymagane Variables w Worker Settings:
ANTHROPIC_KEY = "sk-ant-..."

// Worker oczekuje POST z body:
{ system: "...", messages: [{role, content}] }
// Zwraca: { content: "odpowiedź" }
// Worker MUSI zwracać nagłówki CORS:
// Access-Control-Allow-Origin: *
```

**fire-prices** (ceny ETF/akcje):
```
// Pobiera z Yahoo Finance
// Zwraca kursy walut (EUR/PLN, USD/PLN)
// Cache po stronie klienta: 12h localStorage
```

### Supabase
Tabele:
- `assets` — aktywa portfela
- `settings` — wszystkie ustawienia + historia (JSON blob)

---

## ⚙️ Konfiguracja użytkownika

| Parametr | Opis |
|----------|------|
| Wiek obecny | Wiek startowy do symulacji |
| Wiek FIRE | Docelowy wiek (poglądowy — symulacja liczy realny) |
| Cel wypłaty (dziś) | Miesięczna wypłata w dzisiejszych złotych |
| Kwota miesięczna | Ile co miesiąc na FIRE |
| Rośnie z inflacją | Czy wpłata co roku rośnie o inflację |
| Zwrot brutto | Zakładany roczny zwrot z inwestycji (domyślnie 7%) |
| Zwrot IKE | Zwrot na kontach IKE (domyślnie 7%) |
| Podstawa obliczeń | Brutto (ETF akumulujący) lub netto (Belka rocznie) |
| Inflacja | Zakładana inflacja (domyślnie 3.5%) |
| Limity IKE | Roczny limit na każde konto IKE |
| % limitu IKE | Ile faktycznie wpłacasz (0–100%) |
| Strategia po FIRE | Stop / A / B / C / D |

---

## 🗺️ Roadmapa

- [x] Dashboard z projekcją FIRE i kafelkiem "Portfel w wieku 60 lat"
- [x] Portfel inwestycyjny (krypto + ETF na żywo)
- [x] Symulator trzyfazowy (akumulacja → wypłaty → IKE)
- [x] 4 strategie IKE po FIRE (A/B/C/D + stop)
- [x] Wyświetlanie kwot dziś + nominalnych (inflacja)
- [x] Kalkulator budżetu miesięcznego
- [x] Tracker pożyczek wewnętrznych
- [x] Nieruchomości (wartość + wynajem)
- [x] AI Doradca (Claude Sonnet via Cloudflare Worker)
- [ ] Dual-login (partner + partnerka osobno)
- [ ] PPK (Pracownicze Plany Kapitałowe)
- [ ] Eksport do PDF / raport miesięczny
- [ ] Tryb demo (bez Supabase)

---

<p align="center">
  Zbudowane z ☕ i obsesją na punkcie wolności finansowej<br>
  <em>„Nie chodzi o to, żeby przestać pracować. Chodzi o to, żeby móc nie pracować."</em>
</p>
