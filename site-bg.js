/* ============================================================================
   Kernel background — slow silk waves on a near-black field.

   <div class="bg-layer" aria-hidden="true"><canvas data-bg-waves></canvas></div>

   Dependency-free. Renders at 30fps, pauses off-screen/hidden, caps DPR at 2 and
   paints one static frame when the visitor asks for reduced motion.
   ========================================================================== */
(function () {
  'use strict';

  const canvas = document.querySelector('[data-bg-waves]');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const LINES = 64;
  const STEPS = 46;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let running = false;
  let visible = true;
  let last = 0;
  const startedAt = performance.now();

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!running) paint(0);
  }

  function paint(time) {
    const t = time * 0.00016;
    ctx.fillStyle = '#050506';
    ctx.fillRect(0, 0, width, height);

    // Two soft pools of light that drift, so the field never looks frozen.
    const glowA = ctx.createRadialGradient(
      width * (0.24 + Math.sin(t * 0.6) * 0.05), height * (0.18 + Math.cos(t * 0.4) * 0.04), 0,
      width * 0.24, height * 0.18, Math.max(width, height) * 0.62,
    );
    glowA.addColorStop(0, 'rgba(255,255,255,.075)');
    glowA.addColorStop(0.45, 'rgba(255,255,255,.02)');
    glowA.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, width, height);

    const glowB = ctx.createRadialGradient(
      width * (0.78 + Math.cos(t * 0.5) * 0.05), height * (0.72 + Math.sin(t * 0.35) * 0.05), 0,
      width * 0.78, height * 0.72, Math.max(width, height) * 0.55,
    );
    glowB.addColorStop(0, 'rgba(255,255,255,.05)');
    glowB.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width * 0.5, height * 0.5);
    ctx.rotate(-0.36);
    ctx.globalCompositeOperation = 'lighter';
    const spanX = Math.hypot(width, height) * 0.85;
    const spanY = Math.hypot(width, height) * 0.6;
    const band = (spanY * 2) / LINES;

    for (let i = 0; i < LINES; i += 1) {
      const base = -spanY + i * band;
      const depth = i / (LINES - 1);
      const wobble = Math.sin(base * 0.004 + t * 1.1 + depth * 2.2);
      const alpha = 0.018 + depth * 0.045 + Math.abs(wobble) * 0.02;
      ctx.beginPath();
      for (let s = 0; s <= STEPS; s += 1) {
        const x = -spanX + (s / STEPS) * spanX * 2;
        const y =
          base +
          Math.sin(x * 0.0022 + t * 1.4 + depth * 3.1) * (14 + depth * 34) +
          Math.sin(x * 0.0011 - t * 0.9 + depth * 5.3) * (10 + depth * 22) +
          wobble * 10;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();

    // Vignette keeps the edges dark so text stays readable over the brightest band.
    const vignette = ctx.createRadialGradient(
      width * 0.5, height * 0.38, 0,
      width * 0.5, height * 0.38, Math.max(width, height) * 0.78,
    );
    vignette.addColorStop(0, 'rgba(5,5,6,0)');
    vignette.addColorStop(0.55, 'rgba(5,5,6,.55)');
    vignette.addColorStop(1, 'rgba(5,5,6,.95)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function loop(now) {
    if (!running) return;
    frame = window.requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    if (now - last < 33) return;
    last = now;
    paint(now - startedAt);
  }

  function start() {
    if (running) return;
    running = true;
    frame = window.requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  }

  resize();
  if (reduce.matches) {
    paint(0);
  } else {
    start();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      }).observe(canvas);
    }
    reduce.addEventListener('change', () => {
      if (reduce.matches) {
        stop();
        paint(0);
      } else {
        start();
      }
    });
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resize();
      if (!running) paint(performance.now() - startedAt);
    }, 120);
  });
})();
