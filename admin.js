/* ============================================================================
   Kernel — owner console.
   The browser never decides whether it may be here: every call goes to the
   bot, and the bot answers 404 unless the logged-in Discord id is the owner.
   ========================================================================== */

'use strict';

(function () {
  const auth = window.KernelAuth;

  const ui = {
    loading: document.querySelector('[data-ad-loading]'),
    gate: document.querySelector('[data-ad-gate]'),
    gateError: document.querySelector('[data-ad-gate-error]'),
    login: document.querySelector('[data-ad-login]'),
    denied: document.querySelector('[data-ad-denied]'),
    error: document.querySelector('[data-ad-error]'),
    errorText: document.querySelector('[data-ad-error-text]'),
    retry: document.querySelector('[data-ad-retry]'),
    app: document.querySelector('[data-ad-app]'),
    avatar: document.querySelector('[data-ad-avatar]'),
    identity: document.querySelector('[data-ad-identity]'),
    live: document.querySelector('[data-ad-live]'),
    liveText: document.querySelector('[data-ad-live-text]'),
    refresh: document.querySelector('[data-ad-refresh]'),
    logout: document.querySelector('[data-ad-logout]'),
    stats: document.querySelector('[data-ad-stats]'),
    tunnel: document.querySelector('[data-ad-tunnel]'),
    fleet: document.querySelector('[data-ad-fleet]'),
    fleetCount: document.querySelector('[data-ad-fleet-count]'),
    log: document.querySelector('[data-ad-log]'),
    filters: Array.from(document.querySelectorAll('[data-ad-filter]')),
  };

  const state = {
    base: '',
    session: null,
    overview: null,
    logs: [],
    filter: 'all',
    timer: 0,
  };

  const numberFormat = new Intl.NumberFormat('en');

  /* ------------------------------------------------------------------ utils */

  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    Object.keys(props || {}).forEach((key) => {
      const value = props[key];
      if (value === null || value === undefined) return;
      if (key === 'text') node.textContent = value;
      else if (key === 'className') node.className = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else node.setAttribute(key, value);
    });
    children.forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function formatUptime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (days) return days + 'd ' + hours + 'h';
    if (hours) return hours + 'h ' + minutes + 'm';
    if (minutes) return minutes + 'm ' + (total % 60) + 's';
    return total + 's';
  }

  function formatDate(ms) {
    const date = new Date(Number(ms));
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTime(ms) {
    const date = new Date(Number(ms));
    if (Number.isNaN(date.getTime())) return '--:--:--';
    return date.toLocaleTimeString('en-GB', { hour12: false });
  }

  function initials(name) {
    const parts = String(name || 'K').replace(/[^\w\s]/g, ' ').trim().split(/\s+/);
    return parts.slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'K';
  }

  function hue(name) {
    let sum = 0;
    for (const char of String(name || '')) sum = (sum + char.charCodeAt(0)) % 360;
    return sum;
  }

  function show(which) {
    ui.loading.hidden = which !== 'loading';
    ui.gate.hidden = which !== 'gate';
    ui.denied.hidden = which !== 'denied';
    ui.error.hidden = which !== 'error';
    ui.app.hidden = which !== 'app';
  }

  function stopTimer() {
    if (state.timer) clearInterval(state.timer);
    state.timer = 0;
  }

  /* -------------------------------------------------------------------- api */

  async function get(path) {
    const response = await fetch(state.base + path, {
      cache: 'no-store',
      headers: {
        Authorization: 'Bearer ' + state.session.accessToken,
        // ngrok's free domains answer browser requests with a warning page without this.
        'ngrok-skip-browser-warning': '1',
      },
    });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (response.status === 401) {
      auth.clearSession();
      const expired = new Error('Your Discord session expired.');
      expired.session = true;
      throw expired;
    }
    if (response.status === 404) {
      const denied = new Error('Not available.');
      denied.denied = true;
      throw denied;
    }
    if (!response.ok) {
      const message = data && data.error && data.error.message ? data.error.message : 'Kernel answered ' + response.status + '.';
      throw new Error(message);
    }
    return data;
  }

  /* ------------------------------------------------------------------ views */

  function fail(message) {
    stopTimer();
    ui.errorText.textContent = message;
    show('error');
  }

  function gate(message) {
    stopTimer();
    if (message) {
      ui.gateError.textContent = message;
      ui.gateError.hidden = false;
    }
    show('gate');
  }

  function renderOverview() {
    const data = state.overview;
    const bot = data.bot || {};
    const owner = data.owner || {};

    if (bot.avatar) {
      ui.avatar.replaceChildren(el('img', { src: bot.avatar, alt: '' }));
    }
    const handle = ['@' + (owner.name || 'owner'), 'owner id ' + (owner.id || 'unknown'), owner.source === 'DISCORD_OWNER_ID' ? 'set in environment' : 'application owner'];
    ui.identity.textContent = handle.join(' · ');

    const tiles = [
      [numberFormat.format(bot.guilds || 0), 'servers'],
      [numberFormat.format(bot.members || 0), 'members'],
      [formatUptime(bot.uptimeSec), 'uptime'],
      [bot.ping === null || bot.ping === undefined ? '—' : Math.round(bot.ping) + ' ms', 'gateway ping'],
      [bot.heapMb + ' MB', 'heap · ' + bot.rssMb + ' MB rss'],
      [numberFormat.format(bot.commands || 0), 'commands'],
    ];
    ui.stats.replaceChildren(
      ...tiles.map(([value, label]) => el('div', { className: 'dash-stat' }, el('b', { text: value }), el('span', { text: label }))),
    );

    const tunnel = data.tunnel || {};
    if (tunnel.enabled && tunnel.domain) {
      ui.tunnel.textContent = 'Public address https://' + tunnel.domain + ' — that is the address the website calls.';
    } else if (tunnel.enabled) {
      ui.tunnel.textContent = 'The tunnel key is set, but no fixed domain: ngrok assigns a new address every boot, so the site will not find Kernel.';
    } else {
      ui.tunnel.textContent = 'No tunnel key. The site can only reach Kernel on the panel’s plain address, which an HTTPS page cannot call.';
    }

    renderFleet(data.guilds || []);
  }

  function renderFleet(guilds) {
    ui.fleetCount.textContent = guilds.length ? numberFormat.format(guilds.length) + ' total' : 'none';

    if (!guilds.length) {
      ui.fleet.replaceChildren(el('div', { className: 'dash-empty' }, el('p', { text: 'Kernel is not in any server right now.' })));
      return;
    }

    const rows = guilds.map((guild) => {
      const icon = el('span', { className: 'dash-server-icon', 'aria-hidden': 'true' });
      if (guild.icon) icon.append(el('img', { src: guild.icon, alt: '' }));
      else {
        icon.textContent = initials(guild.name);
        icon.style.setProperty('--hue', hue(guild.name));
      }

      const meta = [
        numberFormat.format(guild.memberCount || 0) + ' members',
        guild.joinedAt ? 'joined ' + (formatDate(guild.joinedAt) || 'recently') : null,
        guild.youManage ? 'you manage this server' : 'not a member',
      ].filter(Boolean).join(' · ');

      const badges = el('div', { className: 'ad-badges' });
      const on = [
        [guild.welcome, 'welcome'],
        [guild.goodbye, 'goodbye'],
        [guild.logs, 'logs'],
        [guild.verification, 'verify'],
        [guild.antiNuke, 'anti-nuke'],
      ].filter(([active]) => active);
      on.forEach(([, label]) => badges.append(el('span', { className: 'dash-badge is-on', text: label })));
      if (!guild.configured) badges.append(el('span', { className: 'dash-badge', text: 'no settings yet' }));

      const side = guild.youManage
        ? el('a', { className: 'btn btn-dark btn-sm', href: 'manage.html?guild=' + encodeURIComponent(guild.id) }, 'Settings')
        : el('span', { className: 'dash-server-state is-dim', text: 'Settings need Manage Server' });

      return el(
        'div',
        { className: 'dash-server' },
        icon,
        el('div', { className: 'dash-server-info' }, el('h3', null, guild.name), el('p', { text: meta }), badges),
        el('div', { className: 'ad-server-side' }, side),
      );
    });

    ui.fleet.replaceChildren(...rows);
  }

  function renderLogs() {
    const wanted = state.logs.filter((entry) => state.filter === 'all' || entry.level === state.filter);

    if (!wanted.length) {
      const text = state.logs.length
        ? 'No ' + (state.filter === 'warn' ? 'warnings' : 'errors') + ' in this window.'
        : 'Nothing has been logged since Kernel started.';
      ui.log.replaceChildren(el('p', { className: 'ad-empty', text }));
      return;
    }

    ui.log.replaceChildren(
      ...wanted.map((entry) => {
        const level = entry.level === 'warn' || entry.level === 'error' ? entry.level : 'info';
        return el(
          'div',
          { className: 'ad-line is-' + level },
          el('span', { className: 'ad-time', text: formatTime(entry.at) }),
          el('span', { className: 'ad-lvl', text: level === 'info' ? 'info' : level }),
          el('span', { className: 'ad-text', text: entry.text }),
        );
      }),
    );
  }

  /* ------------------------------------------------------------------- load */

  async function loadLogs() {
    const data = await get('/api/owner/logs?limit=200');
    state.logs = Array.isArray(data.entries) ? data.entries : [];
    renderLogs();
  }

  function markLive(quiet) {
    ui.live.classList.toggle('is-quiet', Boolean(quiet));
    ui.liveText.textContent = quiet
      ? 'Reconnecting…'
      : 'Live · ' + new Date().toLocaleTimeString('en-GB', { hour12: false });
  }

  async function refresh(silent) {
    try {
      state.overview = await get('/api/owner');
      renderOverview();
      await loadLogs();
      markLive(false);
      show('app');
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      if (silent && state.overview) return markLive(true);
      return fail(error.message || 'Kernel did not answer.');
    }
  }

  function schedule() {
    stopTimer();
    state.timer = setInterval(() => {
      if (document.hidden) return;
      refresh(true);
    }, 15000);
  }

  async function start() {
    show('loading');
    await refresh(false);
    schedule();
  }

  /* ------------------------------------------------------------------- init */

  function init() {
    state.base = typeof window.KERNEL_API_BASE === 'string' ? window.KERNEL_API_BASE.trim().replace(/\/+$/, '') : '';

    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());

    // Consume the redirect before building a login link: loginUrl() stores a fresh state, and
    // doing that first made every real login look like a forged one.
    const callback = auth.consumeCallback();
    if (callback && !callback.ok) {
      gate(callback.description || 'Discord sign-in did not complete. Try again.');
    }

    if (ui.login) ui.login.href = auth.loginUrl('admin.html');

    ui.logout.addEventListener('click', () => {
      auth.clearSession();
      window.location.href = 'dashboard.html';
    });

    ui.retry.addEventListener('click', () => {
      if (!state.session) return gate();
      start();
    });

    ui.refresh.addEventListener('click', () => {
      if (!state.session) return gate();
      refresh(false);
    });

    ui.filters.forEach((button) => {
      button.addEventListener('click', () => {
        state.filter = button.dataset.adFilter;
        ui.filters.forEach((other) => other.classList.toggle('is-on', other === button));
        renderLogs();
      });
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.session && state.overview) refresh(true);
    });

    if (!state.base) return fail('Kernel’s address is missing from api-config.js, so this page has nobody to ask.');

    state.session = auth.session();
    if (!state.session) return gate();
    start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
