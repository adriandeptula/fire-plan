// ── CONFIG ──
const SU = "https://zeveovqtyykteapneaiw.supabase.co";
const SK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldmVvdnF0eXlrdGVhcG5lYWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDUyNTQsImV4cCI6MjA5MDQ4MTI1NH0.NihR3CzxzECHJMXRFScwuLGPA9wItrKOtzCrrqSmVCE";
const sb = supabase.createClient(SU, SK);

const TICKER_NAMES = {
  "IS3N.DE": "MSCI EM IMI",
  "IGLN.UK": "Gold (USD)",
  "EUNL.DE": "MSCI World",
  "SXR8.DE": "S&P 500",
  "EGLN.UK": "Gold (EUR)",
  NVDA: "Nvidia",
  AAPL: "Apple",
  BTC: "Bitcoin",
  ETH: "Ethereum",
  NIER: "Nieruchomość",
  OBL: "Obligacje EDO",
};
const MO = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];
