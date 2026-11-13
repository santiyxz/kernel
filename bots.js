/* ============================================================================
   Bots page — fills the stable card with the same public status payload the
   status page reads. Nothing here is invented: a failed request leaves dashes
   and says the build could not be checked.
   ========================================================================== */

'use strict';

(function () {
  const pill = document.querySelector('[data-bot-live]');
  if (!pill) return;

  const base = typeof window.KERNEL_API_BASE === 'string'
    ? window.KERNEL_API_BASE.trim().replace(/\/+$/, '')
    : '';
  const label = pill.querySelector('[data-bot-live-text]');
  const fields = {
    version: document.querySelector('[data-bot-version]'),
    ping: document.querySelector('[data-bot-ping]'),
    servers: document.querySelector('[data-bot-servers]'),
    members: document.querySelector('[data-bot-members]'),
  };
  const number = new Intl.NumberFormat('en');

  function set(state, text) {
    pill.dataset.state = state;
    if (label) label.textContent = text;
  }

  function write(name, value) {
    if (fields[name]) fields[name].textContent = value;
  }

  async function load() {
    if (!base) {
      set('idle', 'Status endpoint not configured');
      return;
    }
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), 8000) : 0;
    try {
      const response = await fetch(base + '/api/public/status', {
        cache: 'no-store',
        headers: { 'ngrok-skip-browser-warning': '1' },
        signal: controller ? controller.signal : undefined,
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (!data || data.ok === false) throw new Error('no payload');
      set(data.ready === false ? 'idle' : 'ok', data.ready === false ? 'Connected, finishing startup' : 'Stable build is live');
      write('version', data.version || 'unknown');
      write('ping', Number.isFinite(data.ping) ? data.ping + ' ms' : 'not measured yet');
      write('servers', number.format(data.servers || 0));
      write('members', number.format(data.members || 0));
    } catch (error) {
      set('bad', 'Stable build did not answer');
      write('version', 'unknown');
      write('ping', '—');
    } finally {
      window.clearTimeout(timer);
    }
  }

  load();
})();
