/* ============================================================================
   Kernel — owner-only bot strip on the home page.
   The strip ships hidden. It un-hides only after /api/owner answers 200 for the
   signed-in Discord id, so every visitor who is not the owner sees the developer
   section exactly as before and cannot learn that the strip exists.
   ========================================================================== */

'use strict';

(function () {
  const bar = document.querySelector('[data-owner-bot]');
  if (!bar) return;

  const auth = window.KernelAuth;
  if (!auth) return;

  const session = auth.session();
  if (!session) return;

  const base = typeof window.KERNEL_API_BASE === 'string' ? window.KERNEL_API_BASE.trim().replace(/\/+$/, '') : '';
  if (!base) return;

  const ui = {
    state: bar.querySelector('[data-owner-bot-state]'),
    uptime: bar.querySelector('[data-owner-bot-uptime]'),
    ping: bar.querySelector('[data-owner-bot-ping]'),
    servers: bar.querySelector('[data-owner-bot-servers]'),
    members: bar.querySelector('[data-owner-bot-members]'),
    version: bar.querySelector('[data-owner-bot-version]'),
    at: bar.querySelector('[data-owner-bot-at]'),
  };
  const number = new Intl.NumberFormat('en');

  function print(el, value) {
    if (el) el.textContent = value;
  }

  function uptime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const days = Math.floor(total / 86400);
    const hours = Math.floor(total / 3600) % 24;
    const minutes = Math.floor(total / 60) % 60;
    if (days) return days + 'd ' + hours + 'h';
    if (hours) return hours + 'h ' + minutes + 'm';
    if (minutes) return minutes + 'm';
    return total + 's';
  }

  function checked() {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function showStatus(data) {
    const ready = data.ready !== false;
    bar.classList.remove('is-bad');
    print(ui.state, ready ? 'Gateway connected' : 'Connected, not ready');
    print(ui.uptime, uptime(data.uptimeSec));
    print(ui.ping, Number.isFinite(data.ping) ? data.ping + ' ms' : '—');
    print(ui.servers, number.format(data.servers || 0));
    print(ui.members, number.format(data.members || 0));
    print(ui.version, data.version || 'unknown');
    print(ui.at, 'checked ' + checked());
  }

  function showDown() {
    bar.classList.add('is-bad');
    print(ui.state, 'API did not answer');
    print(ui.at, 'checked ' + checked());
  }

  async function loadStatus() {
    try {
      const response = await fetch(base + '/api/public/status', {
        cache: 'no-store',
        headers: { 'ngrok-skip-browser-warning': '1' },
      });
      if (!response.ok) throw new Error('status ' + response.status);
      showStatus(await response.json());
    } catch (error) {
      showDown();
    }
  }

  let started = false;
  async function start() {
    if (started) return;
    try {
      const probe = await fetch(base + '/api/owner', {
        cache: 'no-store',
        headers: {
          Authorization: 'Bearer ' + session.accessToken,
          'ngrok-skip-browser-warning': '1',
        },
      });
      if (!probe.ok) return;
      started = true;
      bar.hidden = false;
      await loadStatus();
      setInterval(() => {
        if (!document.hidden) loadStatus();
      }, 30000);
    } catch (error) {
      /* signed out, offline or not the owner: the strip stays hidden */
    }
  }

  start();
})();
