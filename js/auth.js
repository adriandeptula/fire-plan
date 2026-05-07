// ── AUTH ──

// Jedyne miejsce z domyślnymi wartościami S.
// Używane przez: state.js (init), doLogout(), clearAll() w misc.js.
function blankS() {
  return {
    wt: "31",
    wf: "50",
    wy: "15000",
    inv: "",
    i1: "26019",
    i2: "26019",
    i1wpl: "0",
    i2wpl: "0",
    ip: "100",
    wyd: "",
    roz: "",
    pw: "10",
    pr: "10",
    ks: "",
    kr: "",
    kn: "",
    krt: "8",
    brutto: "7.0",
    belka: "19",
    inf: "3.5",
    ikeRate: "7.0",
    calcBase: "brutto",
    ikeStrat: "stop",
    ikePostInvA: "0",
    ikePostInvB1: "0",
    ikePostInvB2: "0",
    ikePostInvC: "0",
    ikePostInvD1: "0",
    ikePostInvD2: "0",
    invInf: "0",
  };
}

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
    sLE("Błędny email lub hasło");
    b.disabled = false;
    g("lbtxt").textContent = "Zaloguj się";
    return;
  }
  try {
    const incogChk = g("incog-check");
    if (incogChk) localStorage.setItem("fire-incognito", incogChk.checked ? "1" : "0");
  } catch (e2) {}
  user = data.user;
  await onLogin();
}

function sLE(m) {
  const e = g("lerr");
  e.textContent = m;
  e.classList.add("on");
}

async function doLogout() {
  await sb.auth.signOut();
  user = null;
  A = [];
  H = [];
  portHistory = [];
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

async function onLogin() {
  g("LS").classList.add("hide");
  g("APP").style.display = "flex";
  g("ua").textContent = user.email[0].toUpperCase();
  g("ue").textContent = user.email;
  g("s-em").textContent = user.email;
  initIncognito();
  await loadDB();
  await refP();
  initTooltips();

  // Listener change tylko na ustawieniach i budżecie — nie na modalach
  const SETTINGS_SELECTORS = [
    "#p-budzet .fi", "#p-budzet .fs",
    "#p-budzet-dom .fi", "#p-budzet-dom .fs",
    "#p-ust .fi", "#p-ust .fs",
  ].join(",");
  document.querySelectorAll(SETTINGS_SELECTORS).forEach((el) =>
    el.addEventListener("change", () => {
      sS();
      rA();
    })
  );

  // Normalize comma → dot we wszystkich number inputach i .fi
  document.querySelectorAll("input[type=number],.fi").forEach((el) => {
    el.addEventListener("input", () => {
      if (el.value && el.value.includes(","))
        el.value = el.value.replace(/,/g, ".");
    });
  });
}
