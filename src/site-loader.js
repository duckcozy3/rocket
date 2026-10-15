import "./site-loader.css";

export function initSiteLoader(page) {
  if (["admin", "ctv"].includes(page)) return;
  const key = "locketgold-intro-seen";
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* Still usable without session storage. */ }
  const overlay = document.createElement("div");
  overlay.className = "site-loader";
  overlay.innerHTML = `<div aria-hidden="true"><span class="site-loader-decoration">🎀</span><span class="site-loader-decoration">👑</span><span class="site-loader-decoration">✨</span><span class="site-loader-decoration">💗</span><span class="site-loader-decoration">⚡</span></div><div class="site-loader-content"><h2 class="site-loader-brand">Locket Gold</h2><p class="site-loader-caption">Một chút dễ thương đang bay đến bạn…</p><div class="site-loader-track" role="progressbar" aria-label="Đang chuẩn bị trang web" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="site-loader-fill"></span><span class="site-loader-kitty" aria-hidden="true"><img src="/images/loading-kitty.svg" width="160" height="150" alt=""></span></div><div class="site-loader-meta"><span class="site-loader-message">Đang chuẩn bị trang web…</span><strong class="site-loader-percent">0%</strong></div><button class="site-loader-skip" type="button">Vào trang ngay →</button></div>`;
  document.body.append(overlay);
  document.body.classList.add("site-is-loading");
  const app = document.querySelector("#app");
  const wasInert = app?.inert;
  if (app) app.inert = true;
  const bar = overlay.querySelector('[role="progressbar"]');
  const percent = overlay.querySelector(".site-loader-percent");
  const message = overlay.querySelector(".site-loader-message");
  const started = performance.now();
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });
  let closed = false;
  let current = 0;
  let done = false;
  let frame;
  let finalTimer;
  const controller = new AbortController();
  const images = [...document.images].filter((img) => !overlay.contains(img) && img.loading !== "lazy");
  let loadedImages = images.filter((img) => img.complete).length;
  let fontsReady = !document.fonts;
  let windowReady = document.readyState === "complete";
  const close = () => {
    if (closed) return;
    closed = true; cancelAnimationFrame(frame); clearTimeout(timeout); clearTimeout(finalTimer); controller.abort();
    document.body.classList.remove("site-is-loading");
    if (app) app.inert = wasInert;
    const focused = overlay.contains(document.activeElement);
    overlay.classList.add("is-finished");
    if (focused) document.activeElement.blur();
    setTimeout(() => { overlay.remove(); resolveReady(); }, 160);
  };
  const timeout = setTimeout(close, 1800);
  overlay.querySelector("button").addEventListener("click", close, { signal: controller.signal });
  for (const img of images.filter((image) => !image.complete)) {
    let counted = false;
    const ready = () => { if (!counted) { counted = true; loadedImages++; } };
    img.addEventListener("load", ready, { once: true, signal: controller.signal });
    img.addEventListener("error", ready, { once: true, signal: controller.signal });
    if (img.complete) ready();
  }
  window.addEventListener("load", () => { windowReady = true; }, { once: true, signal: controller.signal });
  document.fonts?.ready.then(() => { fontsReady = true; }).catch(() => { fontsReady = true; });
  const tick = () => {
    if (closed) return;
    const ready = loadedImages >= images.length && fontsReady && windowReady;
    const target = ready ? 100 : Math.min(94, 15 + (images.length ? loadedImages / images.length : 1) * 65 + (fontsReady ? 10 : 0) + (windowReady ? 10 : 0));
    current = Math.min(target, current + Math.max(.5, (target - current) * .16));
    const value = current > 99.5 ? 100 : Math.floor(current);
    overlay.style.setProperty("--loader-progress", `${current}%`);
    percent.textContent = `${value}%`; bar.setAttribute("aria-valuenow", String(value));
    message.textContent = value >= 85 ? "Đang hoàn tất chuẩn bị…" : "Đang chuẩn bị trang web…";
    if (value === 100 && performance.now() - started > 350 && !done) {
      done = true; message.textContent = "Sẵn sàng! Chào mừng bạn ♡";
      finalTimer = setTimeout(close, 80);
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  window.addEventListener("pagehide", close, { once: true, signal: controller.signal });
  return ready;
}
