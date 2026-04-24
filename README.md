# 🔥 FIRE Agent — Twój osobisty planer wolności finansowej

> **Zbuduj majątek. Oblicz cel. Osiągnij niezależność finansową.**
> Aplikacja PWA dla Polaków planujących **Fat FIRE** — uwzględnia polskie podatki, IKE/IKZE i realia rynkowe.

[![Status](https://img.shields.io/badge/status-aktywny-brightgreen?style=flat-square)](https://ak47-fire.netlify.app)
[![Deployed on](https://img.shields.io/badge/deployed%20on-Netlify-00C7B7?style=flat-square&logo=netlify)](https://ak47-fire.netlify.app)
[![Data](https://img.shields.io/badge/dane-Supabase-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![AI](https://img.shields.io/badge/AI-Claude%20Sonnet-orange?style=flat-square)](https://anthropic.com)

---

## 🤔 Co to jest FIRE?

**FIRE** *(Financial Independence, Retire Early)* to strategia życiowa, której celem jest zgromadzenie takiego majątku, żeby **nie trzeba było już pracować dla pieniędzy** — można pracować, bo się chce, albo nie pracować wcale.

**Fat FIRE** to wersja FIRE z wyższym standardem życia — celem jest nie tylko przeżycie, ale wygodne i dostatnie życie bez konieczności liczenia każdej złotówki.

```
💡 Prosta zasada: jeśli Twój majątek wynosi 25× Twoje roczne wydatki,
   to możesz wypłacać 4% rocznie i statystycznie nigdy nie skończy Ci się kasa.
   
   Przykład: wydajesz 15 000 zł/mies. → potrzebujesz ~4 500 000 zł
```

---

## 🚀 Do czego służy ta aplikacja?

FIRE Agent to **prywatna aplikacja PWA** (działa jak apka na telefonie, ale to strona internetowa), która:

| Funkcja | Co robi? |
|--------|----------|
| 📊 **Dashboard FIRE** | Pokazuje Twój aktualny postęp, kiedy osiągniesz FIRE i ile będziesz mieć co miesiąc |
| 💼 **Portfel inwestycyjny** | Śledzi kryptowaluty (na żywo z CoinGecko), ETF-y i akcje (na żywo z Yahoo Finance) |
| 📅 **Symulator FIRE** | Oblicza dokładnie, kiedy osiągniesz cel, uwzględniając inflację, podatki i IKE |
| 💰 **Budżet miesięczny** | Planuje ile odkładasz, ile wydajesz, bilans przychodów vs. kosztów |
| 🏦 **Pożyczki wewnętrzne** | Zarządza przepływami między Twoimi sub-kontami (np. IKE, gotówka, inwestycje) |
| 🤖 **AI Doradca** | Asystent AI, który zna Twój portfel i odpowiada na pytania finansowe |

---

## 📐 Jak działa symulator? (po ludzku)

### Faza 1: Budowanie majątku (teraz → wiek FIRE)

Co miesiąc odkładasz ustaloną kwotę. Aplikacja symuluje:

```
Każdy miesiąc:
  Portfel = Portfel × (1 + 7%/12)    ← rośnie jak giełda
           + wpłata miesięczna        ← Twoje oszczędności
           + inflacja na wpłatę       ← opcjonalnie rośnie z inflacją
```

Symulacja trwa aż portfel osiągnie **cel FIRE** (domyślnie obliczony ze wzoru 25× roczne wydatki, skorygowanego o inflację).

### Faza 2: Wolność finansowa (wiek FIRE → 60 lat)

```
Każdy miesiąc:
  Portfel (poza IKE) rośnie o 7%/rok
  Wypłacasz 4% rocznie ÷ 12 miesięcy
  
  Wynik: portfel powoli rośnie lub jest stabilny,
         bo wzrost (7%) > wypłaty (~4-5%)
```

> ⚠️ **Ważne:** IKE **nie jest ruszane** w tej fazie — rośnie nietkniete przez te kilka lat!

### Faza 3: Od 60. roku życia (IKE odblokowane)

```
Od 60 r.ż.:
  Dostęp do IKE bez podatku Belki (19%)! 
  Całkowita pula = portfel poza IKE + portfel IKE
  Nowa wypłata = 4% × całkowita pula ÷ 12
```

---

## 🏛️ Polskie realia podatkowe — co aplikacja uwzględnia?

Większość zagranicznych kalkulatorów FIRE nie uwzględnia polskiego systemu podatkowego. FIRE Agent robi to za Ciebie:

### 🔵 IKE (Indywidualne Konto Emerytalne)
- **Limit wpłat:** ~28 260 zł/rok (na osobę)
- **Korzyść:** brak podatku Belki (19%) przy wypłacie po 60. roku życia
- **W aplikacji:** możesz ustawić, ile % limitu faktycznie wykorzystujesz i czy kontynuujesz wpłaty po przejściu na FIRE

### 🟡 Podatek Belki (19%)
- Normalnie: od każdego zysku z inwestycji płacisz 19%
- Na IKE: **0%** — to ogromna korzyść przy dużych kwotach
- Aplikacja oblicza Twoje zyski z uwzględnieniem tej różnicy

### 🏠 Wynajem i kredyt hipoteczny
- Obsługa ryczałtu od wynajmu (8,5% / 12,5%)
- Fazy kredytu hipotecznego (zmienne raty w czasie)
- Przychód z wynajmu włączany do bilansu FIRE

---

## 📊 Główny ekran — Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  🎯 WIEK FIRE          📈 POSTĘP DO FIRE                     │
│  54 lata               1.6% (cel: 9 870 758 zł)             │
├─────────────────────────────────────────────────────────────┤
│  💵 CEL WYPŁATY FIRE   🏖️ OD 60. ROKU ŻYCIA                 │
│  15 000 zł/mies.       15 056 zł/mies.                      │
│  (32 903 zł nominalnie przy FIRE)  (40 831 zł nominalnie)   │
├─────────────────────────────────────────────────────────────┤
│  💸 MIESIĘCZNIE NA FIRE  🏦 PORTFEL POZA IKE  🔐 IKE        │
│  10 000 zł               7 934 416 zł         1 927 848 zł  │
├─────────────────────────────────────────────────────────────┤
│  📦 PORTFEL INWESTYCYJNY   🧾 MAJĄTEK NETTO                 │
│  161 415 zł                161 415 zł                       │
└─────────────────────────────────────────────────────────────┘
```

**Jak czytać dashboard:**
- **Wiek FIRE** — kiedy Twoje inwestycje osiągną cel (nie to, kiedy chcesz przejść, ale kiedy *realnie* możesz)
- **Postęp do FIRE** — jaki % celu już masz
- **Cel wypłaty FIRE** — tyle będziesz wypłacać miesięcznie (w dzisiejszych złotówkach, aplikacja przelicza z inflacją)
- **Od 60. roku życia** — ile możesz wypłacać *po* odblokowaniu IKE — często podobna kwota, bo IKE rośnie przez lata nieruszone!
- **Portfel poza IKE** — to finansuje Twoje życie między wiekiem FIRE a 60 rokiem życia
- **Portfel IKE** — niedostępny do 60 r.ż., ale rośnie przez cały czas

---

## 💼 Śledzenie portfela na żywo

Aplikacja pobiera aktualne ceny automatycznie:

```
Kryptowaluty    → CoinGecko API (BTC, ETH, inne)
ETF-y i akcje   → Yahoo Finance API (przez Netlify Function)
Pozostałe       → wartości ręczne + Supabase
```

Portfel podzielony jest na:
- **IKE** — inwestycje w ramach konta emerytalnego
- **Poza IKE** — regularne konto maklerskie

---

## 🤖 AI Doradca Finansowy

Wbudowany asystent AI (Claude Sonnet), który:
- **Zna Twój portfel** — widzisz te same liczby co on
- **Zna Twój plan FIRE** — rozumie Twoje cele i horyzont
- **Odpowiada po polsku** — nie musisz tłumaczyć terminologii
- **Daje konkretne rady** — nie ogólniki, ale odpowiedzi do Twojej sytuacji

Przykładowe pytania:
> *„Co zrobić z premią 20 000 zł — nadpłacić kredyt czy zainwestować?"*
> *„Czy powinienem maksymalizować IKE przed innymi inwestycjami?"*
> *„Czy idę w dobrym kierunku?"*

---

## 🛠️ Stack technologiczny

```
Frontend:   HTML / CSS / JavaScript (single-file PWA)
Backend:    Netlify Functions (proxy do API cen)
Baza:       Supabase (PostgreSQL) — Frankfurt
AI:         Claude Sonnet via Cloudflare Worker
Hosting:    Netlify (ak47-fire.netlify.app)
```

---

## ⚙️ Konfiguracja (ustawienia użytkownika)

Aplikacja jest w pełni konfigurowalna:

| Parametr | Opis |
|----------|------|
| Aktualny wiek | Twój wiek startowy |
| Cel FIRE (wiek) | Kiedy *chcesz* przejść na FIRE (poglądowe) |
| Cel wypłaty FIRE | Ile chcesz wypłacać miesięcznie (w dzisiejszych zł) |
| Kwota miesięczna | Ile co miesiąc odkładasz na FIRE |
| Inflacja kwoty | Czy wpłata rośnie co roku razem z inflacją |
| Stopa zwrotu | Zakładany roczny zwrot z inwestycji (domyślnie 7%) |
| Inflacja | Zakładana roczna inflacja (domyślnie 2.5%) |
| Limit IKE | Roczny limit wpłat na IKE |
| % limitu IKE | Ile faktycznie wpłacasz (50% = 1 pełny limit/rok) |
| Wpłaty IKE po FIRE | Czy kontynuujesz wpłaty na IKE po przejściu na FIRE |
| Kwota wpłat IKE po FIRE | Ile wpłacasz na IKE po FIRE (z zewn. źródła) |

---

## 🗺️ Roadmapa

- [x] Dashboard FIRE z projekcją
- [x] Portfel inwestycyjny (krypto + ETF na żywo)
- [x] Symulator faz FIRE (akumulacja → emerytura → IKE)
- [x] Kalkulator budżetu miesięcznego
- [x] Tracker pożyczek wewnętrznych (6 sub-kont)
- [x] AI Doradca finansowy
- [ ] Tryb demo (bez Supabase)
- [ ] Dual-login (dwie osoby — partner + partnerka)
- [ ] Refinansowanie kredytu (WIBOR)
- [ ] PPK (Pracownicze Plany Kapitałowe)
- [ ] Eksport do PDF / raport miesięczny

---

## 📄 Licencja

Projekt prywatny. Kod udostępniony do wglądu i inspiracji.

---

<p align="center">
  Zbudowane z ☕ i obsesją na punkcie wolności finansowej<br>
  <em>„Nie chodzi o to, żeby przestać pracować. Chodzi o to, żeby móc nie pracować."</em>
</p>
