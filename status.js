/* ============================================================================
   Kernel — public status page.
   No login, no token, no server names: it only reads /api/public/status and the
   probe file GitHub Actions writes, both of which anybody could curl.
   ========================================================================== */

'use strict';

(function () {
  const base = typeof window.KERNEL_API_BASE === 'string'
    ? window.KERNEL_API_BASE.trim().replace(/\/+$/, '')
    : '';

  const POLL_MS = 20000;
  const STALE_MS = 90000; // three missed polls before the page calls the API down
  const PROBE_STALE_MS = 45 * 60000;

  const ui = {
    banner: document.querySelector('[data-status-banner]'),
    title: document.querySelector('[data-status-title]'),
    note: document.querySelector('[data-status-note]'),
    badge: document.querySelector('[data-status-badge]'),
    checked: document.querySelector('[data-status-checked]'),
    refresh: document.querySelector('[data-st-refresh]'),
    uptime: document.querySelector('[data-status-uptime]'),
    ping: document.querySelector('[data-status-ping]'),
    servers: document.querySelector('[data-status-servers]'),
    members: document.querySelector('[data-status-members]'),
    commands: document.querySelector('[data-status-commands]'),
    backup: document.querySelector('[data-status-backup]'),
    version: document.querySelector('[data-status-version]'),
    domain: document.querySelector('[data-status-domain]'),
    probeLast: document.querySelector('[data-st-probe-last]'),
    probeTarget: document.querySelector('[data-st-probe-target]'),
    probeState: document.querySelector('[data-st-probe-state]'),
    probeDetail: document.querySelector('[data-st-probe-detail]'),
    probeCount: document.querySelector('[data-st-probe-count]'),
    probeUptime: document.querySelector('[data-st-probe-uptime]'),
    probeStrip: document.querySelector('[data-st-probe-strip]'),
    probeEmpty: document.querySelector('[data-st-probe-empty]'),
    probeStart: document.querySelector('[data-st-probe-start]'),
    probeEnd: document.querySelector('[data-st-probe-end]'),
    probeSummary: document.querySelector('[data-st-probe-summary]'),
    probeWindow: document.querySelector('[data-st-probe-window]'),
  };

  const api = {
    lastOkAt: 0,
    lastTryAt: 0,
    latency: null,
    data: null,
    error: '',
    tried: false,
    failed: false,
    inFlight: false,
  };
  let probe = null;
  let probeError = '';

  const number = new Intl.NumberFormat('en');
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  function setBanner(state, title, note, badge) {
    if (ui.banner) {
      ui.banner.classList.remove('is-ok', 'is-warn', 'is-bad');
      if (state) ui.banner.classList.add('is-' + state);
    }
    if (ui.title) ui.title.textContent = title;
    if (ui.note) ui.note.textContent = note;
    if (ui.badge) ui.badge.textContent = badge;
  }

  function service(name, state, label, stat, note) {
    const pill = document.querySelector('[data-st-svc-state="' + name + '"]');
    if (pill) {
      pill.dataset.state = state;
      pill.textContent = label;
    }
    if (stat !== undefined) {
      const value = document.querySelector('[data-st-svc-stat="' + name + '"]');
      if (value) value.textContent = stat;
    }
    if (note) {
      const meta = document.querySelector('[data-st-svc-note="' + name + '"]');
      if (meta) meta.textContent = note;
    }
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

  function shortAgo(at) {
    const ms = Date.now() - Number(at || 0);
    if (!Number.isFinite(ms) || ms < 0) return 'never';
    if (ms < 5000) return 'just now';
    if (ms < 60000) return Math.floor(ms / 1000) + 's ago';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ' + (minutes % 60) + 'm ago';
    return Math.floor(hours / 24) + 'd ago';
  }

  function clock(ms) {
    return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  function stampText() {
    if (!ui.checked) return;
    ui.checked.textContent = api.lastOkAt ? 'updated ' + shortAgo(api.lastOkAt).replace(' ago', '') : '—';
  }

  function clockText() {
    if (api.lastOkAt) {
      return 'Last answer ' + clock(api.lastOkAt) + (api.latency != null ? ' · ' + api.latency + ' ms' : '');
    }
    return 'No answer yet';
  }

  function gatewayState() {
    const data = api.data || {};
    if (data.ready === false) return 'warn';
    if (!Number.isFinite(data.ping)) return 'warn';
    if (data.ping > 600) return 'warn';
    return 'ok';
  }

  function probeState() {
    if (!probe) return 'idle';
    if (Date.now() - probe.lastAt > PROBE_STALE_MS) return 'warn';
    return probe.lastOk ? 'ok' : 'bad';
  }

  function degradedNote() {
    const reasons = [];
    const gw = gatewayState();
    if ((api.data || {}).ready === false) reasons.push('Discord is still completing the gateway handshake');
    else if (gw === 'warn') reasons.push('Discord has not reported a gateway ping yet');
    if (api.latency != null && api.latency > 1500) reasons.push('the API is answering slowly');
    if (probeState() === 'bad') reasons.push('the last external check failed');
    return reasons;
  }

  function healthySummary() {
    const bits = [];
    const data = api.data || {};
    if (Number.isFinite(data.ping)) bits.push('gateway ping ' + data.ping + ' ms');
    if (api.latency != null) bits.push('API ' + api.latency + ' ms');
    if (probe) bits.push('external check ' + shortAgo(probe.lastAt));
    bits.push('refreshes every 20s');
    return bits.join(' · ');
  }

  function evaluate() {
    if (!api.tried) return;
    if (api.inFlight && !api.lastOkAt) return;

    const age = api.lastOkAt ? Date.now() - api.lastOkAt : Infinity;
    const apiDown = api.failed && age > STALE_MS;
    const apiSlow = api.failed && !apiDown;

    if (apiDown) {
      setBanner(
        'bad',
        'Kernel’s API is not answering',
        (api.lastOkAt ? 'No answer for ' + uptime(age / 1000) + '. ' : 'Nothing has answered since this page loaded. ') +
          'The site is still up; only the bot API is down.',
        'Down',
      );
      service('api', 'bad', 'No answer', '—', 'Last answer ' + shortAgo(api.lastOkAt));
      service('gateway', 'idle', 'Unknown', '—', 'Last known state from the last answer');
      if (ui.checked) ui.checked.textContent = api.lastOkAt ? 'down ' + shortAgo(api.lastOkAt).replace(' ago', '') : '—';
      document.title = 'Kernel API is down — Status';
      return;
    }

    if (apiSlow) {
      setBanner(
        'warn',
        'Kernel’s API missed a check',
        'Retrying now. Last answer ' + shortAgo(api.lastOkAt) + '. A single miss is usually ngrok or a restart.',
        'Retrying',
      );
      service('api', 'warn', 'Retrying', '—', 'Last answer ' + shortAgo(api.lastOkAt));
      document.title = 'Retrying — Kernel status';
      return;
    }

    if (api.failed) {
      setBanner(
        'bad',
        'Kernel’s API did not answer',
        api.error || 'The request failed before reaching the bot. The site stays online.',
        'Down',
      );
      service('api', 'bad', 'No answer', '—');
      document.title = 'Kernel API is down — Status';
      return;
    }

    const reasons = degradedNote();
    if (reasons.length) {
      setBanner('warn', 'Partially degraded', reasons.join(' · ') + '.', 'Degraded');
      document.title = 'Degraded — Kernel status';
    } else if (probeState() === 'warn') {
      setBanner(
        'warn',
        'Monitoring delayed',
        'Gateway and API are answering. External checks are ' + shortAgo(probe.lastAt) +
          ' because GitHub’s scheduled probe has not run; the services themselves are up.',
        'Probe stale',
      );
      document.title = 'Monitoring delayed — Kernel status';
    } else {
      setBanner('ok', 'All systems operational', healthySummary(), 'Live');
      document.title = 'All systems operational — Kernel status';
    }
  }

  function render(data) {
    api.data = data;
    const ready = data.ready !== false;

    if (ui.uptime) ui.uptime.textContent = uptime(data.uptimeSec);
    if (ui.ping) ui.ping.textContent = Number.isFinite(data.ping) ? data.ping + ' ms' : '—';
    if (ui.servers) ui.servers.textContent = number.format(data.servers || 0);
    if (ui.members) ui.members.textContent = number.format(data.members || 0);
    if (ui.commands) ui.commands.textContent = number.format(data.commands || 0);
    if (ui.backup) ui.backup.textContent = data.lastBackupAt ? shortAgo(data.lastBackupAt).replace(' ago', '') : 'none yet';
    if (ui.version) ui.version.textContent = data.version || 'unknown';
    if (ui.domain) ui.domain.textContent = (data.tunnel && data.tunnel.domain) || base || 'not configured';

    if (!ready) {
      service('gateway', 'warn', 'Connecting', '—', 'Connected, waiting for Discord to finish the handshake');
    } else if (!Number.isFinite(data.ping)) {
      service('gateway', 'warn', 'No ping yet', '—', 'Discord has not measured the websocket yet');
    } else if (data.ping > 600) {
      service('gateway', 'warn', 'Slow', data.ping + ' ms', 'Discord round-trip is higher than usual');
    } else {
      service('gateway', 'ok', 'Operational', data.ping + ' ms', 'Websocket round-trip to Discord');
    }
    service('site', 'ok', 'Operational', 'static build', 'This page loaded from the static host');

    evaluate();
    stampText();
  }

  function markApiFailure(message) {
    api.failed = true;
    api.error = message || '';
    service('api', 'warn', 'Retrying', '—', 'Last answer ' + shortAgo(api.lastOkAt));
    evaluate();
    stampText();
  }

  async function load() {
    if (!base) {
      setBanner('warn', 'API address not configured', 'api-config.js has no KERNEL_API_BASE, so this page has nobody to ask.', 'Offline');
      service('api', 'bad', 'Not configured', '—', 'api-config.js has no address');
      service('gateway', 'idle', 'Unknown', '—');
      service('probe', 'idle', 'Unknown', '—');
      return;
    }
    if (api.inFlight) return;
    api.inFlight = true;
    api.lastTryAt = Date.now();
    const started = performance.now();
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), 8000) : 0;

    try {
      const response = await fetch(base + '/api/public/status', {
        cache: 'no-store',
        headers: { 'ngrok-skip-browser-warning': '1' },
        signal: controller ? controller.signal : undefined,
      });
      if (!response.ok) throw new Error('Kernel answered HTTP ' + response.status + '.');
      const data = await response.json();
      if (!data || data.ok === false) throw new Error('Kernel answered without a status payload.');
      api.tried = true;
      api.failed = false;
      api.error = '';
      api.lastOkAt = Date.now();
      api.latency = Math.max(1, Math.round(performance.now() - started));
      service('api', 'ok', 'Operational', api.latency + ' ms', 'Public status endpoint, asked in ' + api.latency + ' ms');
      render(data);
    } catch (error) {
      api.tried = true;
      markApiFailure(
        error && error.name === 'AbortError'
          ? 'The request timed out after 8 seconds.'
          : (error && error.message) || 'The request failed.',
      );
    } finally {
      window.clearTimeout(timer);
      api.inFlight = false;
    }
  }

  // The workflow commits with the repository token, and GitHub does not start the Pages deploy
  // workflow for those commits, so the deployed uptime.json can lag behind the branch. Read the
  // raw file on GitHub once the site runs on a github.io address, then fall back to the deployed
  // copy (and to KERNEL_UPTIME_URL when one is configured).
  function probeUrls() {
    const configured = typeof window.KERNEL_UPTIME_URL === 'string'
      ? window.KERNEL_UPTIME_URL.trim()
      : '';
    const urls = [];
    if (configured) urls.push(configured);
    const host = location.hostname;
    if (/\.github\.io$/i.test(host)) {
      const owner = host.split('.')[0];
      const repo = location.pathname.split('/').filter(Boolean)[0];
      if (owner && repo) {
        urls.push('https://raw.githubusercontent.com/' + owner + '/' + repo + '/main/uptime.json');
      }
    }
    urls.push('uptime.json');
    return urls;
  }

  async function readProbe() {
    let lastError = '';
    for (const url of probeUrls()) {
      try {
        const separator = url.includes('?') ? '&' : '?';
        const response = await fetch(url + separator + 't=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) {
          lastError = 'HTTP ' + response.status;
          continue;
        }
        const data = await response.json();
        if (data && Array.isArray(data.checks) && data.checks.length) return data;
        lastError = 'no checks recorded yet';
      } catch (error) {
        lastError = 'unreachable';
      }
    }
    probeError = lastError;
    return null;
  }

  function emptyProbe() {
    if (ui.probeStrip) ui.probeStrip.replaceChildren();
    if (ui.probeEmpty) ui.probeEmpty.hidden = false;
    if (ui.probeStart) ui.probeStart.textContent = '—';
    if (ui.probeEnd) ui.probeEnd.textContent = '—';
    if (ui.probeSummary) ui.probeSummary.textContent = 'waiting for the workflow';
    if (ui.probeLast) ui.probeLast.textContent = '—';
    if (ui.probeTarget) ui.probeTarget.textContent = '—';
    if (ui.probeState) ui.probeState.textContent = 'No data';
    if (ui.probeDetail) ui.probeDetail.textContent = probeError || 'No checks recorded yet';
    if (ui.probeUptime) ui.probeUptime.textContent = '—';
    if (ui.probeCount) ui.probeCount.textContent = '—';
    service('probe', 'idle', 'No data', '—', 'Waiting for the first external check');
  }

  function renderProbe(data) {
    const checks = data.checks.slice(-96);
    const last = checks[checks.length - 1];
    const okCount = checks.filter((check) => check && check.ok).length;
    const pct = Math.round((okCount / checks.length) * 100);
    const firstAt = Date.parse(checks[0].at) || 0;
    const lastAt = Date.parse(last.at) || 0;
    const spanHours = Math.max(0, (lastAt - firstAt) / 3600000);

    probe = { lastOk: Boolean(last.ok), lastAt, pct, count: checks.length };

    if (ui.probeEmpty) ui.probeEmpty.hidden = true;
    if (ui.probeStrip) {
      ui.probeStrip.replaceChildren();
      checks.forEach((check) => {
        const cell = document.createElement('span');
        cell.className = check && check.ok ? 'is-ok' : 'is-bad';
        cell.title = (check && check.at ? new Date(check.at).toLocaleString() : '') +
          (check && check.ok ? ' · answered' : ' · no answer');
        ui.probeStrip.append(cell);
      });
    }
    if (ui.probeStart) ui.probeStart.textContent = firstAt ? shortAgo(firstAt) : '—';
    if (ui.probeEnd) ui.probeEnd.textContent = lastAt ? shortAgo(lastAt) : '—';
    if (ui.probeSummary) ui.probeSummary.textContent = okCount + ' of ' + checks.length + ' answered · ' + pct + '%';
    if (ui.probeWindow) ui.probeWindow.textContent = spanHours >= 23 ? 'last 24 hours' : 'since the first check';
    if (ui.probeLast) ui.probeLast.textContent = shortAgo(lastAt);
    if (ui.probeTarget) ui.probeTarget.textContent = data.target || 'health endpoint';
    if (ui.probeState) ui.probeState.textContent = last.ok ? 'Answered' : 'No answer';
    if (ui.probeDetail) {
      ui.probeDetail.textContent = last.ok
        ? (Number.isFinite(last.ms) ? last.ms + ' ms · HTTP ' + (last.code || 200) : 'HTTP ' + (last.code || 200))
        : (last.error || 'the endpoint did not answer') + (last.code ? ' · HTTP ' + last.code : '');
    }
    if (ui.probeUptime) ui.probeUptime.textContent = pct + '%';
    if (ui.probeCount) ui.probeCount.textContent = okCount + ' of ' + checks.length + ' answered';

    const state = probeState();
    if (state === 'ok') {
      service('probe', 'ok', 'Operational', shortAgo(lastAt), 'External health check, recorded every 15 minutes');
    } else if (state === 'bad') {
      service('probe', 'bad', 'Failed', shortAgo(lastAt), 'The last external check did not get an answer');
    } else {
      service('probe', 'warn', 'Stale', shortAgo(lastAt), 'The scheduled probe is behind — it usually runs every 15 minutes');
    }
    evaluate();
  }

  async function loadProbe() {
    try {
      const data = await readProbe();
      if (!data) {
        emptyProbe();
        evaluate();
        return;
      }
      renderProbe(data);
    } catch (error) {
      probeError = 'probe file unreadable';
      emptyProbe();
      evaluate();
    }
  }

  function tick() {
    stampText();
    if (ui.refresh && api.lastTryAt) {
      const next = Math.max(0, POLL_MS - (Date.now() - api.lastTryAt));
      ui.refresh.textContent = 'auto-refresh · ' + Math.ceil(next / 1000) + 's';
    }
    if (api.tried && api.lastOkAt && Date.now() - api.lastOkAt > STALE_MS && !api.inFlight) {
      api.failed = true;
      service('api', 'bad', 'No answer', '—', 'Last answer ' + shortAgo(api.lastOkAt));
    }
    evaluate();
  }

  if (!base) {
    service('site', 'ok', 'Operational', 'static build');
    load();
  } else {
    service('site', 'ok', 'Operational', 'static build');
    load();
    window.setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) load();
    });
  }

  loadProbe();
  window.setInterval(() => {
    if (!document.hidden) loadProbe();
  }, 300000);
  window.setInterval(tick, 1000);
})();
