
// ── INIT ──
document.addEventListener("DOMContentLoaded", async () => {
  window.addEventListener("resize", rA);
  // Ustaw domyślne wartości pól ustawień
  const defFields = {
    "s-brutto": "7.0",
    "s-belka": "19",
    "s-inf": "3.5",
    "s-ike-net-input": "7.0",
  };
  Object.entries(defFields).forEach(([id, v]) => {
    const e = g(id);
    if (e && !e.value) e.value = v;
  });
  uIkeNetDisplay();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (session?.user) {
    user = session.user;
    await onLogin();
  }
  g("lem")?.focus();
});
