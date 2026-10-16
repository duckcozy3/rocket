import "./site-loader.css";

export function initSiteLoader(page) {
  if (["admin", "ctv"].includes(page)) return;
  try {
    if (sessionStorage.getItem("locketgold:site-loader-seen") === "1") return;
    sessionStorage.setItem("locketgold:site-loader-seen", "1");
  } catch {
    // If storage is unavailable, still skip the loader on internal navigation.
    try {
      if (document.referrer && new URL(document.referrer).origin === location.origin) return;
    } catch { /* An invalid referrer should not prevent the page from opening. */ }
  }
  const overlay = document.createElement("div");
  overlay.className = "site-loader";
  overlay.innerHTML = `<div aria-hidden="true"><span class="site-loader-decoration">🎀</span><span class="site-loader-decoration">👑</span><span class="site-loader-decoration">✨</span><span class="site-loader-decoration">💗</span><span class="site-loader-decoration">⚡</span></div><div class="site-loader-content"><img class="site-loader-logo" src="/images/logo.png" alt="Locketgold.info Hello Kitty" width="1536" height="1024" fetchpriority="high" decoding="async"><p class="site-loader-caption">Một chút dễ thương đang bay đến bạn…</p><div class="site-loader-track" role="progressbar" aria-label="Đang chuẩn bị trang web" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="site-loader-fill"></span><span class="site-loader-kitty" aria-hidden="true"><img src="/images/loading-kitty.svg" width="160" height="150" alt=""></span></div><div class="site-loader-meta"><span class="site-loader-message">Đang chuẩn bị trang web…</span><strong class="site-loader-percent">0%</strong></div><button class="site-loader-skip" type="button">Vào trang ngay →</button></div>`;
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
  const duration = 3000;
  let lastValue = -1;
  let done = false;
  let frame;
  let finalTimer;
  const controller = new AbortController();
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
  const timeout = setTimeout(close, duration + 500);
  overlay.querySelector("button").addEventListener("click", close, { signal: controller.signal });
  const tick = (now) => {
    if (closed) return;
    // Animate only on the first public page opened in this tab session.
    const current = Math.min(100, Math.max(0, (now - started) / duration) * 100);
    const value = Math.floor(current);
    overlay.style.setProperty("--loader-progress", String(current / 100));
    if (value !== lastValue) {
      lastValue = value;
      percent.textContent = `${value}%`; bar.setAttribute("aria-valuenow", String(value));
      message.textContent = value >= 85 ? "Đang hoàn tất chuẩn bị…" : "Đang chuẩn bị trang web…";
    }
    if (value === 100 && !done) {
      done = true; message.textContent = "Sẵn sàng! Chào mừng bạn ♡";
      finalTimer = setTimeout(close, 80);
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  window.addEventListener("pagehide", close, { once: true, signal: controller.signal });
  return ready;
}
