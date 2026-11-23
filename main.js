const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Gyroscope parallax on footer wordmark
(function () {
  const wordmark = document.querySelector('.footer-wordmark');
  const footer = document.querySelector('footer');
  if (!wordmark || !footer) return;

  const MAX_SHIFT = 40; // px
  const SENSITIVITY = 0.6; // degrees-to-px multiplier
  let targetX = 0;
  let currentX = 0;
  let rafId = null;

  function applyParallax(gamma) {
    // gamma: left/right tilt, -90 to 90
    const clamped = Math.max(-60, Math.min(60, gamma));
    targetX = clamped * SENSITIVITY;
    targetX = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, targetX));

    if (!rafId) {
      rafId = requestAnimationFrame(function tick() {
        currentX += (targetX - currentX) * 0.12; // lerp for smoothness
        wordmark.style.setProperty('--wordmark-x', `${currentX.toFixed(2)}px`);
        rafId = Math.abs(targetX - currentX) > 0.05
          ? requestAnimationFrame(tick)
          : null;
      });
    }
  }

  function onOrientation(e) {
    if (e.gamma !== null && !reducedMotion.matches) applyParallax(e.gamma);
  }

  // Reduced motion turned on mid-visit: settle the wordmark back in place
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) applyParallax(0);
  });

  // Only listen while the footer is on screen
  function startListening() {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        window.addEventListener('deviceorientation', onOrientation);
      } else {
        window.removeEventListener('deviceorientation', onOrientation);
      }
    }).observe(footer);
  }

  // The footer sits under <main> until the page is scrolled to the end, so
  // the browser thinks a focused footer link is already on screen and
  // doesn't scroll to it. Reveal the footer when focus enters it.
  footer.addEventListener('focusin', () => {
    window.scrollTo({ top: document.documentElement.scrollHeight });
  });

  // iOS 13+ requires permission
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    // Request on first user interaction
    document.addEventListener('touchstart', function request() {
      DeviceOrientationEvent.requestPermission()
        .then(state => { if (state === 'granted') startListening(); })
        .catch(() => {});
      document.removeEventListener('touchstart', request);
    }, { once: true });
  } else if (typeof DeviceOrientationEvent !== 'undefined') {
    startListening();
  }
})();

function createScramble(element, { speed = 45, iterations = 10 } = {}) {
  const original = element.textContent;
  let interval = null;
  let count = 0;

  function tick() {
    count++;
    if (count >= iterations) {
      clearInterval(interval);
      interval = null;
      element.textContent = original;
      return;
    }
    element.textContent = original
      .split('')
      .map(ch => (ch === ' ' || ch === ',') ? ch : CHARS[Math.floor(Math.random() * CHARS.length)])
      .join('');
  }

  return {
    start() {
      if (reducedMotion.matches) return;
      if (interval) clearInterval(interval);
      count = 0;
      interval = setInterval(tick, speed);
    },
    stop() {
      clearInterval(interval);
      interval = null;
      element.textContent = original;
    },
  };
}

document.querySelectorAll('td:first-child a').forEach(link => {
  const br = link.querySelector('br');
  if (!br) return;
  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.textContent = '↗';
  arrow.setAttribute('aria-hidden', 'true');
  br.parentNode.insertBefore(arrow, br);
});

// On phones the rows are display: block (date under title), which makes
// browsers drop their table semantics. Restore them explicitly.
document.querySelectorAll('table').forEach(table => {
  table.querySelectorAll('thead, tbody').forEach(el => el.setAttribute('role', 'rowgroup'));
  table.querySelectorAll('tr').forEach(el => el.setAttribute('role', 'row'));
  table.querySelectorAll('th').forEach(el => el.setAttribute('role', 'columnheader'));
  table.querySelectorAll('td').forEach(el => el.setAttribute('role', 'cell'));
});

// Tell screen reader users which links open a new tab
document.querySelectorAll('a[target="_blank"]').forEach(link => {
  const note = document.createElement('span');
  note.className = 'sr-only';
  note.textContent = ' (opens in a new tab)';
  link.append(note);
});

// Scramble dates on hover only where there's a pointer that hovers: a tap on
// a touchscreen fires mouseenter too
const canHover = matchMedia('(hover: hover)').matches;

if (canHover) document.querySelectorAll('table tr').forEach(row => {
  const dateCell = row.querySelector('td:last-child');
  if (!dateCell) return;
  const effect = createScramble(dateCell, { speed: 80, iterations: 7 });
  row.addEventListener('mouseenter', () => effect.start());
  row.addEventListener('mouseleave', () => effect.stop());
});
