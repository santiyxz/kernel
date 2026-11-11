/* ============================================================================
   Kernel 3D background — a reusable, dependency-free particle core.
   Mounts on any element carrying data-scene="core".

   <div class="scene" data-scene="core"
        data-density="high|medium|low"
        data-anchor="right|center|left"
        data-speed="1"></div>

   No libraries, no build step, no network requests.
   ========================================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  var COUNTS = { low: 80, medium: 130, high: 190 };
  var MOBILE_COUNT = 70;
  var MAX_DEGREE = 3;
  var FOCAL = 3.2;
  var TAU = Math.PI * 2;
  var RINGS = [
    { r: 1.12, tiltX: 0.55, tiltZ: 0.22, phase: 0.4, speed: 0.10, dashed: false, alpha: 0.22, width: 0.9 },
    { r: 1.30, tiltX: -0.62, tiltZ: -0.28, phase: 2.2, speed: -0.07, dashed: true, alpha: 0.17, width: 0.7 },
    { r: 0.88, tiltX: 1.28, tiltZ: 0.44, phase: 1.1, speed: 0.14, dashed: false, alpha: 0.13, width: 0.6 }
  ];
  var DIAL = { r: 1.58, tiltX: 0.18, tiltZ: -0.34, phase: 0, speed: 0.03 };

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  /* Evenly spread N points over a unit sphere (Fibonacci lattice). */
  function fibonacci(count) {
    var out = [];
    var golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < count; i++) {
      var y = 1 - (i / Math.max(1, count - 1)) * 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var a = golden * i;
      out.push({ x: Math.cos(a) * r, y: y, z: Math.sin(a) * r });
    }
    return out;
  }

  /* Connect each point to its nearest neighbours, with a degree cap so the
     result reads like a wireframe instead of a ball of yarn. */
  function buildEdges(points) {
    var pairs = [];
    for (var i = 0; i < points.length; i++) {
      for (var j = i + 1; j < points.length; j++) {
        var a = points[i], b = points[j];
        var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        var d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 0.155) pairs.push([i, j, d2]);
      }
    }
    pairs.sort(function (p, q) { return p[2] - q[2]; });

    var degree = new Uint8Array(points.length);
    var edges = [];
    for (var k = 0; k < pairs.length; k++) {
      var u = pairs[k][0], v = pairs[k][1];
      if (degree[u] >= MAX_DEGREE || degree[v] >= MAX_DEGREE) continue;
      degree[u]++; degree[v]++;
      edges.push([u, v]);
    }
    return edges;
  }

  function mount(host) {
    if (!host || host.dataset.sceneReady === '1') return;
    host.dataset.sceneReady = '1';

    var canvas = document.createElement('canvas');
    canvas.className = 'scene-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);

    var ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) { host.classList.add('is-ready'); return; }

    var baseCount = COUNTS[host.dataset.density] || COUNTS.high;
    var speed = parseFloat(host.dataset.speed || '1');
    if (!isFinite(speed) || speed <= 0) speed = 1;
    var anchor = host.dataset.anchor || 'right';

    var count = 0;
    var points = [];
    var edges = [];
    var pulseEdges = [];
    var dust = [];

    var width = 1, height = 1, dpr = 1;
    var cx = 0, cy = 0, radius = 200;
    var spin = Math.random() * Math.PI * 2;
    var tilt = -0.34;
    var targetX = 0, targetY = 0, offX = 0, offY = 0;
    var running = false, visible = false, ready = false;
    var raf = 0, last = 0;

    function reseed(n) {
      count = n;
      points = fibonacci(count);
      edges = buildEdges(points);
      var stride = Math.max(5, Math.round(edges.length / 18));
      pulseEdges = edges.filter(function (_, i) { return i % stride === 0; }).slice(0, 18);
      var motes = Math.round(count * 0.16);
      dust.length = 0;
      for (var i = 0; i < motes; i++) {
        dust.push({
          x: (Math.random() * 2 - 1) * 1.35,
          y: (Math.random() * 2 - 1) * 1.35,
          z: Math.random() * 2 - 1,
          vx: (Math.random() - 0.5) * 0.0009,
          vy: (Math.random() - 0.5) * 0.0009,
        });
      }
    }

    function resize() {
      var rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var want = width < 720 ? MOBILE_COUNT : baseCount;
      if (want !== count) reseed(want);

      var stacked = width < 960;
      if (anchor === 'right' && !stacked) cx = width * 0.74;
      else if (anchor === 'left' && !stacked) cx = width * 0.26;
      else cx = width * 0.5;

      cy = height * (stacked ? 0.3 : 0.48);
      radius = clamp(Math.min(width * 0.34, height * 0.46), 128, 330);

      if (!running) draw(performance.now());
    }

    function draw(now) {
      var t = now * 0.001;

      offX += (targetX - offX) * 0.055;
      offY += (targetY - offY) * 0.055;

      var ay = spin + t * 0.12 * speed + offX * 0.2;
      var ax = tilt + Math.sin(t * 0.16) * 0.1 + offY * 0.16;
      var cosY = Math.cos(ay), sinY = Math.sin(ay);
      var cosX = Math.cos(ax), sinX = Math.sin(ax);
      var R = radius * (1 + Math.sin(t * 0.45) * 0.014);
      var originX = cx + offX * 14;
      var originY = cy + offY * 10;

      function project(x, y, z) {
        var rx = x * cosY + z * sinY;
        var rz = -x * sinY + z * cosY;
        var ry = y * cosX - rz * sinX;
        rz = y * sinX + rz * cosX;
        var scale = (R * FOCAL) / (FOCAL - rz);
        return {
          x: originX + rx * scale,
          y: originY + ry * scale,
          z: rz,
          depth: (rz + 1) / 2,
        };
      }

      var projected = new Array(count);
      for (var i = 0; i < count; i++) projected[i] = project(points[i].x, points[i].y, points[i].z);

      function ringPoint(ring, angle, radius) {
        var r = radius || ring.r;
        var x = Math.cos(angle) * r;
        var z = Math.sin(angle) * r;
        var ct = Math.cos(ring.tiltX), st = Math.sin(ring.tiltX);
        var y1 = -z * st;
        var z1 = z * ct;
        var cz = Math.cos(ring.tiltZ), sz = Math.sin(ring.tiltZ);
        return project(x * cz - y1 * sz, x * sz + y1 * cz, z1);
      }

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      /* core bloom */
      var bloom = ctx.createRadialGradient(originX, originY, 0, originX, originY, R * 1.3);
      bloom.addColorStop(0, 'rgba(255,255,255,0.10)');
      bloom.addColorStop(0.5, 'rgba(255,255,255,0.035)');
      bloom.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, width, height);

      var core = ctx.createRadialGradient(originX, originY, 0, originX, originY, R * 0.42);
      core.addColorStop(0, 'rgba(255,255,255,0.16)');
      core.addColorStop(0.55, 'rgba(255,255,255,0.035)');
      core.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, width, height);

      /* orbital rings give the core a designed scaffold */
      for (var ri = 0; ri < RINGS.length; ri++) {
        var ring = RINGS[ri];
        var a0 = ring.phase + t * ring.speed * speed;
        ctx.lineWidth = ring.width;
        for (var s = 0; s < 120; s++) {
          if (ring.dashed && (s % 4) > 1) continue;
          var rp1 = ringPoint(ring, a0 + (s / 120) * TAU);
          var rp2 = ringPoint(ring, a0 + ((s + 1) / 120) * TAU);
          var rd = (rp1.depth + rp2.depth) / 2;
          ctx.strokeStyle = 'rgba(255,255,255,' + (ring.alpha * (0.32 + rd * 0.95)).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(rp1.x, rp1.y);
          ctx.lineTo(rp2.x, rp2.y);
          ctx.stroke();
        }

        var bead = ringPoint(ring, ring.phase * 1.7 + t * (0.22 + ri * 0.07) * speed);
        var beadA = (0.2 + bead.depth * 0.55).toFixed(3);
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.beginPath();
        ctx.arc(bead.x, bead.y, 5.5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + beadA + ')';
        ctx.beginPath();
        ctx.arc(bead.x, bead.y, 1.7, 0, TAU);
        ctx.fill();
      }

      if (width > 720) {
        var dialA = DIAL.phase + t * DIAL.speed * speed;
        ctx.lineWidth = 0.6;
        for (var k = 0; k < 48; k++) {
          var tickA = dialA + (k / 48) * TAU;
          var isLong = k % 4 === 0;
          var tp1 = ringPoint(DIAL, tickA);
          var tp2 = ringPoint(DIAL, tickA, DIAL.r + (isLong ? 0.075 : 0.035));
          ctx.strokeStyle = 'rgba(255,255,255,' + (isLong ? '0.24' : '0.12') + ')';
          ctx.beginPath();
          ctx.moveTo(tp1.x, tp1.y);
          ctx.lineTo(tp2.x, tp2.y);
          ctx.stroke();
        }

        /* a slow sweep light travelling around the dial */
        var sweep = t * 0.16 * speed;
        for (var q = 0; q < 22; q++) {
          var qa = sweep + q * 0.014;
          var qp1 = ringPoint(DIAL, qa);
          var qp2 = ringPoint(DIAL, qa + 0.014);
          var fade = 1 - q / 22;
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.20 * fade * fade).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(qp1.x, qp1.y);
          ctx.lineTo(qp2.x, qp2.y);
          ctx.stroke();
        }
      }

      /* drifting motes for depth */
      for (var d = 0; d < dust.length; d++) {
        var m = dust[d];
        m.x += m.vx; m.y += m.vy;
        if (m.x > 1.4) m.x = -1.4; else if (m.x < -1.4) m.x = 1.4;
        if (m.y > 1.4) m.y = -1.4; else if (m.y < -1.4) m.y = 1.4;

        var mp = project(m.x, m.y, m.z);
        if (mp.x < -40 || mp.x > width + 40 || mp.y < -40 || mp.y > height + 40) continue;
        var twinkle = 0.55 + 0.45 * Math.sin(t * 1.6 + d * 1.7);
        ctx.fillStyle = 'rgba(255,255,255,' + ((0.035 + mp.depth * 0.15) * twinkle).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(mp.x, mp.y, 0.55 + mp.depth * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      /* wireframe: back half first, then front half */
      for (var pass = 0; pass < 2; pass++) {
        for (var e = 0; e < edges.length; e++) {
          var a = projected[edges[e][0]];
          var b = projected[edges[e][1]];
          var depth = (a.depth + b.depth) / 2;
          if ((depth < 0.5) !== (pass === 0)) continue;
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.03 + depth * 0.16).toFixed(3) + ')';
          ctx.lineWidth = 0.55 + depth * 0.35;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      /* nodes */
      for (var n = 0; n < projected.length; n++) {
        var p = projected[n];
        var size = 0.65 + p.depth * 1.7;
        var alpha = 0.16 + p.depth * 0.72;

        if (n % 23 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.07)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 4.6, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      /* packets travelling along the wireframe */
      for (var pi = 0; pi < pulseEdges.length; pi++) {
        var pe = pulseEdges[pi];
        var u = (t * 0.16 + pi * 0.137) % 1;
        var pa = projected[pe[0]], pb = projected[pe[1]];
        var px = pa.x + (pb.x - pa.x) * u;
        var py = pa.y + (pb.y - pa.y) * u;
        var pd = pa.depth + (pb.depth - pa.depth) * u;
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + (0.22 + pd * 0.55).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(px, py, 1.15 + pd * 0.9, 0, TAU);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';

      if (!ready) {
        ready = true;
        host.classList.add('is-ready');
      }
    }

    function frame(now) {
      if (!running) return;
      var dt = last ? Math.min(now - last, 60) : 16.7;
      last = now;
      if (dt <= 0) dt = 16.7;
      draw(now);
      raf = window.requestAnimationFrame(frame);
    }

    function start() {
      if (running || REDUCED.matches) return;
      running = true;
      last = 0;
      raf = window.requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    }

    var zone = host.closest('section') || host;
    zone.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var r = zone.getBoundingClientRect();
      if (!r.width || !r.height) return;
      targetX = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
      targetY = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
    }, { passive: true });
    zone.addEventListener('pointerleave', function () { targetX = 0; targetY = 0; });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          visible = entry.isIntersecting;
          if (visible) start(); else stop();
        });
      }, { rootMargin: '180px 0px' });
      io.observe(host);
    } else {
      visible = true;
      start();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (visible) start();
    });

    if ('ResizeObserver' in window) {
      var pending = 0;
      new ResizeObserver(function () {
        if (pending) return;
        pending = window.requestAnimationFrame(function () {
          pending = 0;
          resize();
        });
      }).observe(host);
    } else {
      window.addEventListener('resize', resize);
    }

    var onMotionChange = function () {
      if (REDUCED.matches) { stop(); draw(performance.now()); }
      else if (visible) start();
    };
    if (REDUCED.addEventListener) REDUCED.addEventListener('change', onMotionChange);
    else if (REDUCED.addListener) REDUCED.addListener(onMotionChange);

    resize();
    if (REDUCED.matches) draw(performance.now());
  }

  function boot() {
    var nodes = document.querySelectorAll('[data-scene]');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.KernelScene = { mount: mount };
})();
