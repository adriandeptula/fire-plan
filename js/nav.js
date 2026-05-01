// ── NAV ──
function gn(id) {
  document
    .querySelectorAll(".ni")
    .forEach((e) => e.classList.remove("on"));
  document
    .querySelectorAll(".panel")
    .forEach((e) => e.classList.remove("on"));
  const nm = [
    "dash",
    "portfel",
    "budzet",
    "budzet-dom",
    "mies",
    "kalk",
    "plan",
    "wykres",
    "agent",
    "loans",
    "ust",
  ];
  const idx = nm.indexOf(id);
  document.querySelectorAll(".ni")[idx]?.classList.add("on");
  g("p-" + id)?.classList.add("on");
  document
    .querySelectorAll(".bni")
    .forEach((e) => e.classList.remove("on"));
  const bnMap = {
    dash: "dash",
    portfel: "portfel",
    budzet: "budzet",
    kalk: "kalk",
    wykres: "wykres",
  };
  const bn = g("bn-" + (bnMap[id] || ""));
  if (bn) bn.classList.add("on");
  else g("bn-more")?.classList.add("on");
  ["budzet-dom", "loans", "mies", "plan", "agent", "ust", "wykres"].forEach((m) => {
    const e = g("mm-" + m);
    if (e) e.classList.toggle("on", m === id);
  });
  window.scrollTo(0, 0);
  if (id === "mies") rMies();
  if (id === "budzet") rBud();
  if (id === "budzet-dom") cWyp();
  if (id === "loans") rLoans();
  if (id === "wykres") rWykres();
  rA();
}
function toggleMore() {
  g("mm")?.classList.toggle("on");
  g("mov")?.classList.toggle("on");
}
function closeMore() {
  g("mm")?.classList.remove("on");
  g("mov")?.classList.remove("on");
}
