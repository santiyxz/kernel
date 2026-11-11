/* ============================================================================
   Kernel — dashboard.
   Nothing here renders until Discord returns a valid user token.
   ========================================================================== */

'use strict';

(function () {
  const auth = window.KernelAuth;
  if (!auth) return;

  const ui = {
    loading: document.querySelector('[data-dash-loading]'),
    gate: document.querySelector('[data-dash-gate]'),
    gateError: document.querySelector('[data-dash-gate-error]'),
    login: document.querySelector('[data-oauth-login]'),
    app: document.querySelector('[data-dash-app]'),
    error: document.querySelector('[data-dash-error]'),
    errorText: document.querySelector('[data-dash-error-text]'),
    retry: document.querySelector('[data-dash-retry]'),
    relogin: document.querySelector('[data-dash-relogin]'),
    avatar: document.querySelector('[data-dash-avatar]'),
    name: document.querySelector('[data-dash-name]'),
    handle: document.querySelector('[data-dash-handle]'),
    managed: document.querySelector('[data-dash-managed]'),
    installed: document.querySelector('[data-dash-installed]'),
    presenceNote: document.querySelector('[data-dash-presence-note]'),
    servers: document.querySelector('[data-dash-servers]'),
    empty: document.querySelector('[data-dash-empty]'),
    logout: document.querySelector('[data-dash-logout]'),
    command: document.querySelector('[data-dash-command]'),
    copy: document.querySelector('[data-dash-copy]'),
    copyState: document.querySelector('[data-dash-copy-state]'),
  };

  const MANAGE = 32n;
  const ADMINISTRATOR = 8n;
  let copyTimer = 0;

  function show(which) {
    if (!ui.loading) return;
    ui.loading.hidden = which !== 'loading';
    ui.gate.hidden = which !== 'gate';
    ui.app.hidden = which !== 'app';
    ui.error.hidden = which !== 'error';
  }

  function showGate(message) {
    if (message && ui.gateError) {
      ui.gateError.textContent = message;
      ui.gateError.hidden = false;
    } else if (ui.gateError) {
      ui.gateError.hidden = true;
    }
    if (ui.login) ui.login.href = auth.loginUrl();
    show('gate');
  }

  function showError(message) {
    if (ui.errorText) ui.errorText.textContent = message;
    show('error');
  }

  function initials(name) {
    const words = String(name || '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return 'K';
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }

  function hueFor(id) {
    const text = String(id || '');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return hash % 360;
  }

  function iconHash(value) {
    return typeof value === 'string' && /^[a-z0-9_]+$/i.test(value) ? value : '';
  }

  function canManage(guild) {
    if (!guild) return false;
    if (guild.owner === true) return true;
    try {
      const permissions = BigInt(guild.permissions || '0');
      return (permissions & MANAGE) !== 0n || (permissions & ADMINISTRATOR) !== 0n;
    } catch (error) {
      return false;
    }
  }

  function inviteHref() {
    const link = document.querySelector('a[data-link="invite"]');
    return link && /^https?:/i.test(link.href) ? link.href : '';
  }

  async function loadBotGuilds() {
    try {
      const response = await fetch('servers.json', { cache: 'no-store' });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data || data.sample !== false || !Array.isArray(data.servers)) return null;
      const ids = data.servers.map((server) => String(server.id || '')).filter(Boolean);
      return new Set(ids);
    } catch (error) {
      return null;
    }
  }

  function renderAvatar(me) {
    if (!ui.avatar) return;
    ui.avatar.replaceChildren();
    ui.avatar.textContent = initials(me.global_name || me.username);

    const hash = iconHash(me.avatar);
    if (!hash || !/^\d+$/.test(String(me.id))) return;

    const img = new Image();
    img.alt = '';
    img.src =
      'https://cdn.discordapp.com/avatars/' +
      me.id +
      '/' +
      hash +
      '.' +
      (hash.startsWith('a_') ? 'gif' : 'png') +
      '?size=128';
    img.addEventListener('error', () => img.remove(), { once: true });
    ui.avatar.append(img);
  }

  function renderServer(guild, botGuilds) {
    const row = document.createElement('article');
    row.className = 'dash-server';

    const icon = document.createElement('span');
    icon.className = 'dash-server-icon';
    icon.style.setProperty('--hue', String(hueFor(guild.id)));
    icon.textContent = initials(guild.name);

    const hash = iconHash(guild.icon);
    if (hash && /^\d+$/.test(String(guild.id))) {
      const img = new Image();
      img.alt = '';
      img.loading = 'lazy';
      img.src =
        'https://cdn.discordapp.com/icons/' +
        guild.id +
        '/' +
        hash +
        '.' +
        (hash.startsWith('a_') ? 'gif' : 'png') +
        '?size=128';
      img.addEventListener('error', () => img.remove(), { once: true });
      icon.append(img);
    }

    const info = document.createElement('div');
    info.className = 'dash-server-info';

    const title = document.createElement('h3');
    title.append(document.createTextNode(String(guild.name || 'Unnamed server')));

    const manageable = canManage(guild);
    const installed = botGuilds ? botGuilds.has(String(guild.id)) : null;

    if (guild.owner === true) title.append(badge('Owner'));
    if (installed === true) title.append(badge('Kernel installed', 'is-on'));
    if (!manageable) title.append(badge('No manage access'));

    const meta = document.createElement('p');
    const role = guild.owner === true ? 'Owner' : manageable ? 'Manage Server' : 'Member';
    meta.textContent =
      role +
      (installed === true ? ' · Kernel is in this server' : installed === false ? ' · Kernel is not in this server' : '');

    info.append(title, meta);

    const state = document.createElement('span');
    state.className = 'dash-server-state';

    if (!manageable) {
      state.textContent = 'Read only';
      state.classList.add('is-dim');
    } else if (installed === false) {
      const invite = inviteHref();
      if (invite) {
        const link = document.createElement('a');
        link.className = 'dash-server-link';
        link.href = invite;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Invite Kernel';
        state.append(link);
      } else {
        state.textContent = 'Invite Kernel from Discord';
        state.classList.add('is-dim');
      }
    } else {
      const link = document.createElement('a');
      link.className = 'dash-server-link';
      link.href = 'manage.html?guild=' + encodeURIComponent(guild.id);
      link.textContent = 'Manage settings';
      state.append(link);
    }

    row.append(icon, info, state);
    return row;
  }

  function badge(text, variant) {
    const span = document.createElement('span');
    span.className = 'dash-badge' + (variant ? ' ' + variant : '');
    span.textContent = text;
    return span;
  }

  function render(me, guilds, botGuilds) {
    if (ui.name) ui.name.textContent = me.global_name || me.username || 'Discord user';
    if (ui.handle) ui.handle.textContent = '@' + (me.username || 'unknown');
    renderAvatar(me);

    const manageable = guilds.filter(canManage);
    if (ui.managed) ui.managed.textContent = String(manageable.length);

    if (ui.installed) {
      if (botGuilds) {
        const installed = manageable.filter((guild) => botGuilds.has(String(guild.id))).length;
        ui.installed.textContent = String(installed);
      } else {
        ui.installed.textContent = '—';
      }
    }

    if (ui.presenceNote) {
      ui.presenceNote.hidden = Boolean(botGuilds);
      ui.presenceNote.textContent =
        'Kernel’s public server list has not been generated yet, so installation status is hidden.';
    }

    const sorted = guilds.slice().sort((a, b) => {
      const aManage = canManage(a);
      const bManage = canManage(b);
      if (aManage !== bManage) return aManage ? -1 : 1;
      if (botGuilds) {
        const aIn = botGuilds.has(String(a.id));
        const bIn = botGuilds.has(String(b.id));
        if (aIn !== bIn) return aIn ? -1 : 1;
      }
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    if (ui.servers) {
      const fragment = document.createDocumentFragment();
      sorted.forEach((guild) => fragment.append(renderServer(guild, botGuilds)));
      ui.servers.replaceChildren(fragment);
    }

    if (ui.empty) ui.empty.hidden = manageable.length > 0;
  }

  async function load(session) {
    show('loading');
    try {
      const [me, guilds] = await Promise.all([
        auth.api('/users/@me', session.accessToken),
        auth.api('/users/@me/guilds', session.accessToken),
      ]);
      const botGuilds = await loadBotGuilds();
      render(me, Array.isArray(guilds) ? guilds : [], botGuilds);
      show('app');
      if (ui.name) ui.name.focus({ preventScroll: true });
      resumeSettingsPage();
    } catch (error) {
      if (error.status === 401) {
        auth.clearSession();
        showGate('Your Discord session expired. Log in again to load your servers.');
        return;
      }
      if (error.status === 403) {
        showError('Discord did not share your server list. Log in again and approve the server-list permission.');
        return;
      }
      showError('Kernel could not read your Discord servers right now. Try again in a moment.');
    }
  }

  /* A login started from the settings page lands back here, because dashboard.html is the only
     registered redirect. Send the person back to the page they were editing instead of making
     them find the server again. */
  function resumeSettingsPage() {
    let next = '';
    try {
      next = window.sessionStorage.getItem('kernel.next') || '';
      if (!next) return;
      window.sessionStorage.removeItem('kernel.next');
    } catch (error) {
      return;
    }

    let url;
    try {
      url = new URL(next, window.location.href);
    } catch (error) {
      return;
    }

    if (url.origin !== window.location.origin) return;
    if (!/\/manage\.html$/.test(url.pathname)) return;
    window.location.replace(url.href);
  }

  async function copyCommand() {
    if (!ui.command) return;
    const text = ui.command.textContent.trim();
    let message = 'Copied';

    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      message = 'Select the command and press Ctrl+C';
    }

    if (ui.copyState) {
      ui.copyState.textContent = message;
      window.clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => {
        ui.copyState.textContent = '';
      }, 2600);
    }
  }

  function init() {
    if (!ui.gate) return;

    if (ui.retry) ui.retry.addEventListener('click', () => window.location.reload());
    if (ui.relogin) {
      ui.relogin.addEventListener('click', () => {
        auth.clearSession();
        window.location.href = auth.loginUrl();
      });
    }
    if (ui.logout) {
      ui.logout.addEventListener('click', () => {
        auth.clearSession();
        showGate();
        if (ui.gate) {
          const title = ui.gate.querySelector('h1');
          if (title) title.focus({ preventScroll: false });
        }
      });
    }
    if (ui.copy) ui.copy.addEventListener('click', copyCommand);

    const callback = auth.consumeCallback();

    if (callback && callback.error) {
      const message =
        callback.error === 'access_denied'
          ? 'You cancelled the Discord login. Nothing was shared.'
          : callback.description || 'Discord returned an error. Try again.';
      showGate(message);
      return;
    }

    if (window.location.protocol === 'file:') {
      ui.login.href = '#';
      ui.login.addEventListener('click', (event) => {
        event.preventDefault();
        showGate('Discord login needs the site served over http or https. Upload it to your host first.');
      });
      showGate();
      return;
    }

    const session = auth.session();

    if (callback && callback.ok && !session) {
      showGate('This browser is blocking session storage, so the login cannot be kept. Allow site data and try again.');
      return;
    }

    if (session) {
      load(session);
      return;
    }

    showGate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
