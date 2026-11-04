// Progressive enhancement: content remains readable without JavaScript or motion.
export function initHomeReveal() {
  const root = document.querySelector('main');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!root || ['admin', 'ctv'].includes(document.body.dataset.page) || reducedMotion.matches || !('IntersectionObserver' in window)) return () => {};

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
    root.querySelectorAll('.feature-strip .container > span, .section-heading, .image-benefit, .price-card, .two-col > div, .step-list > li, .post-card, .section .center, .trust-grid > *, .metric-grid > *, .contact-grid > *, .guide-extra > *, .pricing-video').forEach((element) => {
      if (seen.has(element) || element.closest('[hidden]')) return;
      // Avoid nesting reveal animations inside another animated container.
      if (element.parentElement.closest('.home-reveal')) return;
      seen.add(element);
      if (element.getBoundingClientRect().top < window.innerHeight) return;
      const index = [...element.parentElement.children].indexOf(element);
      element.style.setProperty('--reveal-delay', Math.min(index, 3) * 60 + 'ms');
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
