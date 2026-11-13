/* ============================================================================
   Kernel background — soft smoke drifting across a near-black field.

   <div class="bg-layer" aria-hidden="true"><canvas data-bg-waves></canvas></div>

   The pools are painted on a quarter-size offscreen canvas and stretched up, so
   the gradients stay smooth and the cost stays low. 30fps, pauses off-screen or
   hidden, caps DPR at 2, paints one still frame for reduced motion.
   ========================================================================== */
(function () {
  'use strict';

  const canvas = document.querySelector('[data-bg-waves]');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SCALE = 0.28;
  const FIELD = '#050506';

  // nx / ny are the resting position as a fraction of the viewport, r the pool
  // radius against the longest side, flat squashes it into a wide wisp.
  const BLOBS = [
    { nx: 0.16, ny: 0.2, r: 0.62, flat: 0.5, rot: -0.7, alpha: 0.16, sx: 0.019, sy: 0.014, phase: 0.0 },
    { nx: 0.82, ny: 0.26, r: 0.5, flat: 0.62, rot: 0.5, alpha: 0.1, sx: 0.014, sy: 0.021, phase: 2.1 },
    { nx: 0.34, ny: 0.76, r: 0.72, flat: 0.44, rot: 0.24, alpha: 0.11, sx: 0.012, sy: 0.017, phase: 4.4 },
    { nx: 0.9, ny: 0.84, r: 0.54, flat: 0.58, rot: -0.32, alpha: 0.085, sx: 0.022, sy: 0.012, phase: 1.2 },
    { nx: 0.52, ny: 0.48, r: 0.84, flat: 0.7, rot: 1.1, alpha: 0.06, sx: 0.009, sy: 0.011, phase: 3.3 },
    { nx: 0.04, ny: 0.62, r: 0.46, flat: 0.52, rot: -1.2, alpha: 0.07, sx: 0.017, sy: 0.016, phase: 5.6 },
  ];

  const glow = document.createElement('canvas');
  const gctx = glow.getContext('2d');
  if (!gctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let gw = 1;
  let gh = 1;
  let frame = 0;
  let running = false;
  let visible = true;
  let last = 0;
  const startedAt = performance.now();

  function sizeGlow() {
    gw = Math.max(2, Math.round(width * SCALE));
    gh = Math.max(2, Math.round(height * SCALE));
    glow.width = gw;
    glow.height = gh;
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sizeGlow();
    if (!running) paint(0);
  }

  function drawFields(t) {
    const unit = Math.max(width, height);
    const drift = t * 0.001;
    gctx.setTransform(1, 0, 0, 1, 0, 0);
    gctx.globalCompositeOperation = 'source-over';
    gctx.fillStyle = FIELD;
    gctx.fillRect(0, 0, gw, gh);
    gctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < BLOBS.length; i += 1) {
      const blob = BLOBS[i];
      const cx = (blob.nx + Math.sin(drift * blob.sx * 60 + blob.phase) * 0.1) * gw;
      const cy = (blob.ny + Math.cos(drift * blob.sy * 60 + blob.phase * 1.4) * 0.09) * gh;
      const breathe = 1 + Math.sin(drift * (blob.sx + blob.sy) * 34 + blob.phase) * 0.12;
      const rx = blob.r * unit * SCALE * breathe;
      const ry = rx * blob.flat;

      gctx.save();
      gctx.translate(cx, cy);
      gctx.rotate(blob.rot + Math.sin(drift * 0.05 + blob.phase) * 0.14);
      gctx.scale(1, ry / rx);
      const pool = gctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      pool.addColorStop(0, 'rgba(255,255,255,' + blob.alpha + ')');
      pool.addColorStop(0.42, 'rgba(232,236,242,' + (blob.alpha * 0.42).toFixed(3) + ')');
      pool.addColorStop(1, 'rgba(255,255,255,0)');
      gctx.fillStyle = pool;
      gctx.beginPath();
      gctx.arc(0, 0, rx, 0, Math.PI * 2);
      gctx.fill();
      gctx.restore();
    }
  }

  function paint(time) {
    drawFields(time);

    ctx.fillStyle = FIELD;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(glow, 0, 0, width, height);

    // Vignette keeps the corners dark so type stays readable over the brightest wisp.
    const vignette = ctx.createRadialGradient(
      width * 0.5, height * 0.36, Math.min(width, height) * 0.1,
      width * 0.5, height * 0.36, Math.max(width, height) * 0.82,
    );
    vignette.addColorStop(0, 'rgba(5,5,6,0)');
    vignette.addColorStop(0.58, 'rgba(5,5,6,.42)');
    vignette.addColorStop(1, 'rgba(5,5,6,.9)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    const floor = ctx.createLinearGradient(0, height * 0.72, 0, height);
    floor.addColorStop(0, 'rgba(5,5,6,0)');
    floor.addColorStop(1, 'rgba(5,5,6,.72)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, height * 0.72, width, height * 0.28);
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
