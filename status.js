/* ============================================================================
   Kernel — public status page.
   No login, no token, no server names: it only reads /api/public/status, the
   same aggregate payload anybody could curl.
   ========================================================================== */

'use strict';

(function () {
  const base = typeof window.KERNEL_API_BASE === 'string'
    ? window.KERNEL_API_BASE.trim().replace(/\/+$/, '')
    : '';

  const ui = {
    banner: document.querySelector('[data-status-banner]'),
    title: document.querySelector('[data-status-title]'),
    note: document.querySelector('[data-status-note]'),
    checked: document.querySelector('[data-status-checked]'),
    uptime: document.querySelector('[data-status-uptime]'),
    ping: document.querySelector('[data-status-ping]'),
    servers: document.querySelector('[data-status-servers]'),
    members: document.querySelector('[data-status-members]'),
    commands: document.querySelector('[data-status-commands]'),
    backup: document.querySelector('[data-status-backup]'),
    version: document.querySelector('[data-status-version]'),
    domain: document.querySelector('[data-status-domain]'),
  };

  const number = new Intl.NumberFormat('en');
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  function setBanner(state, title, note) {
    if (!ui.banner) return;
    ui.banner.classList.remove('is-ok', 'is-warn', 'is-bad');
    if (state) ui.banner.classList.add('is-' + state);
    if (ui.title) ui.title.textContent = title;
    if (ui.note) ui.note.textContent = note;
  }

  function setChecked(at) {
    if (!ui.checked) return;
    ui.checked.textContent = at ? 'checked ' + new Date(at).toLocaleTimeString('en-GB', { hour12: false }) : '—';
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

  function ago(at) {
    const ms = Date.now() - Number(at || 0);
    if (!Number.isFinite(ms) || ms < 0) return 'never';
    if (ms < 60000) return 'just now';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ' + (minutes % 60) + 'm ago';
    return Math.floor(hours / 24) + 'd ago';
  }

  function render(data) {
    const ready = data.ready !== false;
    setBanner(
      ready ? 'ok' : 'warn',
      ready ? data.name + ' is online' : data.name + ' is connected but not ready',
      ready ? 'The gateway is connected and the API answered this request.' : 'Discord may still be completing the first connection.',
    );
    setChecked(Number(data.at) || Date.now());

    if (ui.uptime) ui.uptime.textContent = uptime(data.uptimeSec);
    if (ui.ping) ui.ping.textContent = Number.isFinite(data.ping) ? data.ping + ' ms' : '—';
    if (ui.servers) ui.servers.textContent = number.format(data.servers || 0);
    if (ui.members) ui.members.textContent = number.format(data.members || 0);
    if (ui.commands) ui.commands.textContent = number.format(data.commands || 0);
    if (ui.backup) ui.backup.textContent = data.lastBackupAt ? ago(data.lastBackupAt).replace(' ago', '') : 'none yet';
    if (ui.version) ui.version.textContent = data.version || 'unknown';
    if (ui.domain) ui.domain.textContent = (data.tunnel && data.tunnel.domain) || base || 'not configured';
  }

  function offline(message) {
    setBanner('bad', 'Kernel’s API did not answer', message || 'The bot may be restarting. This site stays online either way.');
    setChecked(Date.now());
  }

  async function load() {
    if (!base) {
      setBanner('warn', 'API address not configured', 'api-config.js has no KERNEL_API_BASE, so this page has nobody to ask.');
      return;
    }
    try {
      const response = await fetch(base + '/api/public/status', {
        cache: 'no-store',
        headers: { 'ngrok-skip-browser-warning': '1' },
      });
      if (!response.ok) throw new Error('Kernel answered ' + response.status + '.');
      render(await response.json());
    } catch (error) {
      offline(error.message || 'The request failed.');
    }
  }

  load();
  setInterval(() => {
    if (!document.hidden) load();
  }, 30000);
})();
