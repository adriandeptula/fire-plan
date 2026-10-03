// ── AUTH ──
async function doLogin() {
  const e = g("lem").value.trim(),
    p = g("lpw").value;
  if (!e || !p) {
    sLE("Wpisz email i hasło");
    return;
  }
  const b = g("lbtn");
  b.disabled = true;
  g("lbtxt").textContent = "Logowanie...";
  g("lerr").classList.remove("on");
  const { data, error } = await sb.auth.signInWithPassword({
    email: e,
    password: p,
  });
  if (error) {
    // 400 = złe dane logowania; reszta (0 / 5xx) = problem z połączeniem lub bazą
    const net = !error.status || error.status >= 500;
    sLE(
      net
        ? "Brak połączenia z serwerem logowania — spróbuj za chwilę"
        : "Błędny email lub hasło",
    );
    b.disabled = false;
    g("lbtxt").textContent = "Zaloguj się";
    return;
  }
  // Zapisz preferencję trybu incognito z formularza logowania
  try {
    const incogChk = g('incog-check');
    if (incogChk) localStorage.setItem('fire-incognito', incogChk.checked ? '1' : '0');
  } catch(e2) {}
  user = data.user;
  await onLogin();
}
function sLE(m) {
  const e = g("lerr");
  e.textContent = m;
  e.classList.add("on");
}
function blankS() {
  return {
    wt: "31", wf: "50", wy: "15000", inv: "",
    i1: "26019", i2: "26019", i1wpl: "0", i2wpl: "0", ip: "100",
    wyd: "", roz: "", pw: "10", pr: "10",
    ks: "", kr: "", kn: "", krt: "8",
    brutto: "7.0", belka: "19", inf: "3.5",
    ikeRate: "7.0", calcBase: "brutto",
    ikeStrat: "stop",
    ikePostInvA: "0", ikePostInvB1: "0", ikePostInvB2: "0",
    ikePostInvC: "0", ikePostInvD1: "0", ikePostInvD2: "0",
    invInf: "0",
  };
}
async function doLogout() {
  // Dopisz oczekującą zmianę ustawień (debounce 800 ms), ale tylko gdy dane
  // były poprawnie wczytane — inaczej nie wolno nic zapisywać.
  if (user && dbReady && sPending) await saveSettingsNow();
  await sb.auth.signOut();
  user = null;
  dbReady = false;
  dbRows = new Map();
  clearBackup(); // wylogowanie = kopia z tej przeglądarki znika (urządzenia współdzielone)
  hideDbNotice();
  A = [];
  H = [];
  portHistory = [];
  portSnapshots = [];
  loans = [];
  liabilities = [];
  chatH = [];
  incs = [{ id: 1, n: "", k: "" }];
  prices = {};
  S = blankS();
  g("APP").style.display = "none";
  g("LS").classList.remove("hide");
  g("lpw").value = "";
  g("lbtn").disabled = false;
  g("lbtxt").textContent = "Zaloguj się";
}

let _loginListenersBound = false;
async function onLogin() {
  g("LS").classList.add("hide");
  g("APP").style.display = "flex";
  g("ua").textContent = user.email[0].toUpperCase();
  g("ue").textContent = user.email;
  g("s-em").textContent = user.email;
  initIncognito();
  const loaded = await loadDB();
  if (!loaded) return; // komunikat i blokada zapisu ustawia loadDB(); nic nie nadpisujemy
  await refP();
  savePortSnapshot(); // auto snapshot raz na miesiąc po załadowaniu cen
  initTooltips();
  // Listenery podpinamy tylko raz (wcześniej mnożyły się przy każdym logowaniu).
  if (_loginListenersBound) return;
  _loginListenersBound = true;
  document.querySelectorAll(".fi,.fs").forEach((el) =>
    el.addEventListener("change", () => {
      sS();
      rA();
    }),
  );
  // Przecinek -> kropka we wszystkich polach liczbowych
  document.querySelectorAll("input[type=number],.fi").forEach((el) => {
    el.addEventListener("input", () => {
      if (el.value && el.value.includes(","))
        el.value = el.value.replace(/,/g, ".");
    });
  });
}
