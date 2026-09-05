import { useEffect } from 'react';

/* Adds .is-in to every .reveal element inside `ref` as it enters the viewport.
   Rows already on screen are revealed at once, so the page never depends on
   the observer firing; the observer only handles what is still below the fold.
   Each element is revealed once and then released. */
export function useReveal(ref, deps = []) {
  useEffect(() => {
    // Opt the stylesheet's hidden state in only now that JS is running.
    document.documentElement.classList.add('js');

    const root = ref.current;
    if (!root) return;

    const targets = [...root.querySelectorAll('.reveal:not(.is-in)')];
    if (targets.length === 0) return;

    const vh = window.innerHeight;
    const pending = targets.filter((t) => {
      const { top } = t.getBoundingClientRect();
      if (top < vh * 0.92) {
        t.classList.add('is-in');
        return false;
      }
      return true;
    });

    if (pending.length === 0 || typeof IntersectionObserver === 'undefined') {
      pending.forEach((t) => t.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
    );
    pending.forEach((t) => io.observe(t));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
