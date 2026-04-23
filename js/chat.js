// ── CHAT ──
const SYS = `Jesteś ekspertem finansowym i osobistym agentem FIRE dla rodziny Deptuła.
PROFIL: wiek {{W}} lat · małżeństwo · Fat FIRE w wieku {{WF}} lat
PORTFEL FIRE: {{P}} zł (IKE: {{I}} · poza IKE: {{PO}}) · Nieruchomości: {{NIER}} zł · Wynajem netto: {{WYN}} zł/mies.
KREDYT: {{K}} zł · PLAN: {{INV}} zł/mies. na FIRE · IKE limit: {{IKE}} zł/mies.
CEL (nominalny): {{G}} zł · SYMULACJA: FIRE w roku {{RO}} (wiek {{WA}} lat) · od 60 r.ż.: {{M60}} zł/mies.
MODEL: IKE zwrot {{BR}}%/rok brutto · poza IKE netto {{NE}}% · inflacja {{INF}}%/rok · Belka {{BK}}%
IKE: 2 konta · brak podatku Belki · dostępne od 60 r.ż. Strategia po FIRE: {{STRAT}}.
Cel wypłaty dziś: {{WY}} zł/mies. → nominalnie przy FIRE: {{WYNOM}} zł/mies.
Mów po polsku, podawaj liczby, max 3-4 akapity, konkretne rekomendacje.`;

async function sChat() {
  const inp = g("ci"),
    text = inp.value.trim();
  if (!text) return;
  const btn = g("csbtn"),
    msgs = g("chat-m");
  msgs.innerHTML += `<div class="msg u"><div class="msl">Ty</div><div class="mb">${text}</div></div>`;
  inp.value = "";
  btn.disabled = true;
  chatH.push({ role: "user", content: text });
  const tid = "t" + Date.now();
  msgs.innerHTML += `<div class="msg a" id="${tid}"><div class="msl">FIRE Agent</div><div class="mb"><div class="th"><span></span><span></span><span></span></div></div></div>`;
  msgs.scrollTop = msgs.scrollHeight;
  const p = gP(),
    r = p ? getCachedSim() : null,
    f = (n) => new Intl.NumberFormat("pl-PL").format(Math.round(n || 0));
  const br = pf(S.brutto) || 8,
    bk = pf(S.belka) || 19,
    inf = pf(S.inf) || 3.5;
  const ne = (br * (1 - bk / 100)).toFixed(2);
  const wy = pf(S.wy) || 15000,
    wiek = pf(S.wt) || 31,
    wf2 = pf(S.wf) || 50;
  const wyNom = wy * Math.pow(1 + inf / 100, Math.max(0, wf2 - wiek));
  const sys = SYS.replace("{{W}}", S.wt || 31)
    .replace("{{WF}}", S.wf || 50)
    .replace("{{P}}", f(gFirePortfel()))
    .replace("{{I}}", f(gIKE()))
    .replace("{{PO}}", f(gPoza()))
    .replace("{{NIER}}", f(gNierSprzedaz()))
    .replace("{{WYN}}", f(getWynajemNetto()))
    .replace("{{K}}", f(getTotalLiabilities()))
    .replace("{{INV}}", f(S.inv || 0))
    .replace("{{IKE}}", f(getIKEM()))
    .replace("{{G}}", r ? f(r.G) : 0)
    .replace("{{RO}}", r ? Math.round(r.fy) : "—")
    .replace("{{WA}}", r ? Math.round(r.fa) : "—")
    .replace("{{M60}}", r ? f(r.m60) : "—")
    .replace("{{BR}}", br)
    .replace("{{NE}}", ne)
    .replace("{{INF}}", inf)
    .replace("{{BK}}", bk)
    .replace(
      "{{STRAT}}",
      S.ikeStrat === "cont"
        ? `kontynuacja wpłat ${f(pf(S.ikePostInv))} zł/mies.`
        : "brak wpłat po FIRE",
    )
    .replace("{{WY}}", f(wy))
    .replace("{{WYNOM}}", f(wyNom));
  try {
    const res = await fetch("https://fire-chat.adrianxdeptula.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: sys, messages: chatH }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const reply = data.content || data.error || "Przepraszam, wystąpił błąd.";
    chatH.push({ role: "assistant", content: reply });
    g(tid).querySelector(".mb").innerHTML = reply.replace(/\n/g, "<br>");
  } catch (e) {
    g(tid).querySelector(".mb").innerHTML =
      `<span style="color:var(--re)">Błąd połączenia z agentem. Sprawdź czy aplikacja jest na Netlify.</span>`;
  }
  btn.disabled = false;
  msgs.scrollTop = msgs.scrollHeight;
}
