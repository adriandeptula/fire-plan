
// ── TOOLTIP POSITIONING ──
function initTooltips() {
  document.querySelectorAll(".tip-wrap").forEach((wrap) => {
    const ic = wrap.querySelector(".tip-ic");
    const box = wrap.querySelector(".tip-box");
    if (!ic || !box) return;
    if (wrap.dataset.tipInit) return; // initTooltips() jest wołane wielokrotnie — nie dubluj listenerów
    wrap.dataset.tipInit = "1";
    ic.addEventListener("mouseenter", () => {
      const r = ic.getBoundingClientRect();
      box.style.display = "block";
      const bw = box.offsetWidth || 240;
      let left = r.left + r.width / 2 - bw / 2;
      // clamp to viewport
      left = Math.max(8, Math.min(left, window.innerWidth - bw - 8));
      let top = r.top - box.offsetHeight - 8;
      if (top < 8) top = r.bottom + 8;
      box.style.left = left + "px";
      box.style.top = top + "px";
    });
    ic.addEventListener("mouseleave", () => {
      box.style.display = "none";
    });
  });
}
