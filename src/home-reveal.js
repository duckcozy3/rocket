// Enhance only the home page; content stays visible when motion is disabled.
export function initHomeReveal() {
  const root = document.querySelector('body[data-page="home"] main');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!root || reducedMotion.matches || !('IntersectionObserver' in window)) return () => {};

  const seen = new WeakSet();
  const pending = new Set();
  const reveal = (element) => {
    element.classList.remove('home-reveal--pending');
    observer.unobserve(element);
    pending.delete(element);
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) reveal(target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

  const refresh = () => {
    if (reducedMotion.matches) return;
    root.querySelectorAll('.feature-strip .container > span, .section-heading, .image-benefit, .price-card, .two-col > div, .step-list > li, .post-card, .section .center').forEach((element) => {
      if (seen.has(element)) return;
      seen.add(element);
      // Keep the initial viewport and restored scroll position immediately readable.
      if (element.getBoundingClientRect().top < window.innerHeight) return;
      const index = [...element.parentElement.children].indexOf(element);
      element.style.setProperty('--reveal-delay', Math.min(index, 3) * 65 + 'ms');
      element.classList.add('home-reveal', 'home-reveal--pending');
      pending.add(element);
      observer.observe(element);
    });
  };
  root.addEventListener('focusin', (event) => {
    const element = event.target.closest('.home-reveal--pending');
    if (element) reveal(element);
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) pending.forEach(reveal);
  });
  window.addEventListener('beforeprint', () => pending.forEach(reveal));
  refresh();
  return refresh;
}
