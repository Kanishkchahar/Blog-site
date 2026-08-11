// Minimal typing effect for the homepage terminal hero.
// No-ops entirely if the element isn't present or the user prefers reduced motion.
(function () {
  var el = document.querySelector('[data-typewriter]');
  if (!el) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var full = el.getAttribute('data-typewriter');

  if (prefersReducedMotion) {
    el.textContent = full;
    return;
  }

  el.textContent = '';
  var i = 0;
  function tick() {
    if (i <= full.length) {
      el.textContent = full.slice(0, i);
      i++;
      setTimeout(tick, 28);
    }
  }
  tick();
})();
