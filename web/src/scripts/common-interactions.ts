/**
 * Behavior shared by all three visual themes: sticky-nav shadow on scroll,
 * reveal-on-scroll for `.reveal` elements, and a magnetic hover effect for
 * `.magnetic` CTAs. Each theme's own script layers its bespoke bits
 * (counters, pipe fills, coast drawing, scrollytelling) on top of this.
 */
export function initCommonInteractions(root: ParentNode = document) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const nav = root.querySelector('[data-natura-nav]');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 8);
    });
  }

  if (!reduced) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2 },
    );
    root.querySelectorAll('.reveal').forEach((el) => io.observe(el));

    root.querySelectorAll<HTMLElement>('.magnetic').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.22}px, ${y * 0.32}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0,0)';
      });
    });
  }

  return { reduced };
}
