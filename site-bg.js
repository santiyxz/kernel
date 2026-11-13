/* ============================================================================
   Kernel background — liquid silver silk flowing over a near-black field.

   <div class="bg-layer" aria-hidden="true"><canvas data-bg-waves></canvas></div>

   Four folded sheets are painted as stacked thin strokes on a reduced-size
   canvas, then stretched back up. The downscale/upscale is the blur, so the
   folds read as soft metal without a per-pixel filter. 30fps, pauses off-screen
   or hidden, caps DPR at 2, paints one still frame for reduced motion.
   ========================================================================== */
(function () {
  'use strict';

  const canvas = document.querySelector('[data-bg-waves]');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  const MAX_WORK = 760;
  const FIELD_TOP = '#0a0a0c';
  const FIELD_BOTTOM = '#050506';

  // base / slope place the sheet in the frame; the two waves give it its folds.
  // thick is the distance between the front and back edge of the sheet.
  const SHEETS = [
    { base: 0.12, slope: -0.42, amp: 0.09, freq: 1.15, amp2: 0.026, freq2: 3.3, thick: 0.5,
      speed: 0.13, phase: 0.2, alpha: 0.7, lines: 15 },
    { base: 0.46, slope: -0.3, amp: 0.11, freq: 0.85, amp2: 0.032, freq2: 2.4, thick: 0.62,
      speed: -0.1, phase: 2.3, alpha: 0.9, lines: 17 },
    { base: 0.72, slope: -0.36, amp: 0.08, freq: 1.6, amp2: 0.024, freq2: 4.2, thick: 0.46,
      speed: 0.17, phase: 4.1, alpha: 0.6, lines: 13 },
    { base: 1.0, slope: -0.2, amp: 0.065, freq: 1.25, amp2: 0.02, freq2: 2.8, thick: 0.38,
      speed: -0.14, phase: 5.4, alpha: 0.4, lines: 11 },
  ];

  const work = document.createElement('canvas');
  const wctx = work.getContext('2d');
  if (!wctx) return;

  let width = 0;
  let height = 0;
  let ww = 1;
  let wh = 1;
  let dpr = 1;
  let scale = 0.5;
  let frame = 0;
  let running = false;
  let visible = true;
  let last = 0;
  let field = null;
  let grain = null;
  let pointerX = 0;
  let pointerY = 0;
  let aimX = 0;
  let aimY = 0;
  const startedAt = performance.now();

  function makeGrain() {
    const tile = document.createElement('canvas');
    tile.width = 96;
    tile.height = 96;
    const g = tile.getContext('2d');
    if (!g) return null;
    const image = g.createImageData(96, 96);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = 118 + Math.random() * 74;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v + 2;
      image.data[i + 3] = 255;
    }
    g.putImageData(image, 0, 0);
    return ctx.createPattern(tile, 'repeat');
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

    scale = Math.min(0.62, MAX_WORK / Math.max(width, height));
    ww = Math.max(2, Math.round(width * scale));
    wh = Math.max(2, Math.round(height * scale));
    work.width = ww;
    work.height = wh;

    field = wctx.createLinearGradient(0, 0, 0, wh);
    field.addColorStop(0, FIELD_TOP);
    field.addColorStop(0.55, '#070708');
    field.addColorStop(1, FIELD_BOTTOM);
    if (!grain) grain = makeGrain();
    if (!running) paint(0);
  }

  function sheetGradient(sheet, t) {
    const g = wctx.createLinearGradient(0, 0, ww, 0);
    const swing = 0.5 + 0.5 * Math.sin(t * 0.05 + sheet.phase * 1.3);
    const stops = [
      [0, 10],
      [0.14 + swing * 0.05, 62],
      [0.3 + swing * 0.08, 226],
      [0.44, 24],
      [0.6 + swing * 0.06, 108],
      [0.78, 40],
      [0.92, 74],
      [1, 12],
    ];
    stops.forEach(([pos, level], i) => {
      const at = Math.min(1, Math.max(0, pos));
      const lift = 2 + (i % 2);
      g.addColorStop(at, 'rgb(' + level + ',' + (level + 2) + ',' + (level + lift) + ')');
    });
    return g;
  }

  function foldedY(sheet, nx, t, v) {
    const wave =
      Math.sin(nx * sheet.freq * TAU + t * sheet.speed + sheet.phase) * sheet.amp +
      Math.sin(nx * sheet.freq2 * TAU - t * sheet.speed * 0.72 + sheet.phase * 1.7) * sheet.amp2;
    const base = sheet.base + sheet.slope * (nx - 0.5) + wave;
    const drift = Math.sin(t * 0.05 + sheet.phase) * 0.012;
    return (base + drift + v * sheet.thick * 0.5) * wh;
  }

  function foldLight(v) {
    const a = Math.exp(-Math.pow((v + 0.4) / 0.22, 2));
    const b = Math.exp(-Math.pow((v - 0.34) / 0.14, 2)) * 0.92;
    const c = 0.015 + 0.025 * Math.cos(v * 6.1 + 0.4);
    return Math.max(0, a * 0.85 + b + c);
  }

  function drawSheet(sheet, t) {
    const line = sheetGradient(sheet, t);

    // The body of the sheet is one wide, dim stroke; the folds are stacked on top.
    wctx.globalAlpha = 0.06 + sheet.alpha * 0.05;
    wctx.strokeStyle = line;
    wctx.lineWidth = sheet.thick * wh * 0.9;
    wctx.beginPath();
    for (let x = -12; x <= ww + 12; x += 14) {
      const nx = x / ww;
      const y = foldedY(sheet, nx, t, 0);
      if (x === -12) wctx.moveTo(x, y);
      else wctx.lineTo(x, y);
    }
    wctx.stroke();

    // Fine striations read as silk threads once the canvas is scaled back up.
    for (let j = 0; j < sheet.lines; j += 1) {
      const v = (j / (sheet.lines - 1) - 0.5) * 2;
      const light = foldLight(v);
      if (light < 0.04) continue;
      wctx.globalAlpha = Math.min(0.5, light * sheet.alpha * 0.245);
      wctx.lineWidth = (sheet.thick * wh / (sheet.lines - 1)) * 1.55;
      const wobble = 0.0022 + Math.abs(v) * 0.0016;
      wctx.beginPath();
      for (let x = -12; x <= ww + 12; x += 7) {
        const nx = x / ww;
        const y = foldedY(sheet, nx, t, v) +
          Math.sin(nx * 46 + j * 1.7 + t * 0.5) * wh * wobble;
        if (x === -12) wctx.moveTo(x, y);
        else wctx.lineTo(x, y);
      }
      wctx.stroke();
    }

    // The crest of the front fold catches the light hardest.
    wctx.globalAlpha = Math.min(0.55, sheet.alpha * 0.4);
    wctx.lineWidth = 2.2;
    wctx.beginPath();
    for (let x = -12; x <= ww + 12; x += 8) {
      const nx = x / ww;
      const y = foldedY(sheet, nx, t, 0.34);
      if (x === -12) wctx.moveTo(x, y);
      else wctx.lineTo(x, y);
    }
    wctx.stroke();
  }

  function drawSheen(t) {
    const drift = (t * 0.03) % 1;
    const g = wctx.createLinearGradient(0, wh * 0.05, ww, wh * 0.95);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(Math.min(0.9, 0.2 + drift * 0.6), 'rgba(255,255,255,.05)');
    g.addColorStop(Math.min(1, 0.36 + drift * 0.6), 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    wctx.globalAlpha = 1;
    wctx.fillStyle = g;
    wctx.fillRect(0, 0, ww, wh);
  }

  function paint(time) {
    const t = time * 0.001;

    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.globalCompositeOperation = 'source-over';
    wctx.fillStyle = field;
    wctx.fillRect(0, 0, ww, wh);
    wctx.globalCompositeOperation = 'lighter';

    wctx.save();
    wctx.translate(pointerX * 26 * scale, pointerY * 16 * scale);
    for (let i = 0; i < SHEETS.length; i += 1) drawSheet(SHEETS[i], t);
    drawSheen(t);
    wctx.restore();

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = FIELD_BOTTOM;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(work, 0, 0, width, height);

    if (grain) {
      ctx.globalAlpha = 0.035;
      ctx.fillStyle = grain;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }

    // Vignette and floor keep type readable over the brightest fold.
    const vignette = ctx.createRadialGradient(
      width * 0.52, height * 0.3, Math.min(width, height) * 0.08,
      width * 0.52, height * 0.3, Math.max(width, height) * 0.86,
    );
    vignette.addColorStop(0, 'rgba(5,5,6,0)');
    vignette.addColorStop(0.56, 'rgba(5,5,6,.26)');
    vignette.addColorStop(1, 'rgba(5,5,6,.84)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    const floor = ctx.createLinearGradient(0, height * 0.66, 0, height);
    floor.addColorStop(0, 'rgba(5,5,6,0)');
    floor.addColorStop(1, 'rgba(5,5,6,.7)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, height * 0.66, width, height * 0.34);
  }

  function loop(now) {
    if (!running) return;
    frame = window.requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    if (now - last < 33) return;
    last = now;
    const ease = reduce.matches ? 1 : 0.045;
    pointerX += (aimX - pointerX) * ease;
    pointerY += (aimY - pointerY) * ease;
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
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      aimX = (event.clientX / Math.max(1, width) - 0.5) * 2;
      aimY = (event.clientY / Math.max(1, height) - 0.5) * 2;
    }, { passive: true });
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
    }, 140);
  });
})();
