/* ============================================================================
   Kernel — owner inbox.
   Same rule as the console: the browser never decides. Every request carries
   the Discord token and the bot answers 404 unless the id is the owner's.
   ========================================================================== */

'use strict';

(function () {
  const auth = window.KernelAuth;

  const ui = {
    loading: document.querySelector('[data-ib-loading]'),
    gate: document.querySelector('[data-ib-gate]'),
    gateError: document.querySelector('[data-ib-gate-error]'),
    login: document.querySelector('[data-ib-login]'),
    denied: document.querySelector('[data-ib-denied]'),
    error: document.querySelector('[data-ib-error]'),
    errorText: document.querySelector('[data-ib-error-text]'),
    retry: document.querySelector('[data-ib-retry]'),
    app: document.querySelector('[data-ib-app]'),
    avatar: document.querySelector('[data-ib-avatar]'),
    identity: document.querySelector('[data-ib-identity]'),
    live: document.querySelector('[data-ib-live]'),
    liveText: document.querySelector('[data-ib-live-text]'),
    refresh: document.querySelector('[data-ib-refresh]'),
    test: document.querySelector('[data-ib-test]'),
    logout: document.querySelector('[data-ib-logout]'),
    alert: document.querySelector('[data-ib-alert]'),
    stats: document.querySelector('[data-ib-stats]'),
    search: document.querySelector('[data-ib-search]'),
    filters: Array.from(document.querySelectorAll('[data-ib-filter]')),
    list: document.querySelector('[data-ib-list]'),
    reader: document.querySelector('[data-ib-reader]'),
    status: document.querySelector('[data-ib-status]'),
  };

  const state = {
    base: '',
    session: null,
    data: null,
    messages: [],
    selected: '',
    filter: 'all',
    query: '',
    timer: 0,
    busy: false,
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

  function relativeTime(ms) {
    const value = Number(ms) || 0;
    if (!value) return 'unknown';
    const diff = Date.now() - value;
    if (diff < 0) return 'just now';
    const minute = 60000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute) return 'just now';
    if (diff < hour) return Math.floor(diff / minute) + ' min ago';
    if (diff < day) return Math.floor(diff / hour) + 'h ago';
    if (diff < 7 * day) return Math.floor(diff / day) + 'd ago';
    const date = new Date(value);
    return date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function fullTime(ms) {
    const date = new Date(Number(ms));
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    return date.toLocaleString('en', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  function initials(name) {
    const parts = String(name || 'K').replace(/[^\w\s]/g, ' ').trim().split(/\s+/);
    return parts.slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'K';
  }

  function reasonText(reason) {
    const key = String(reason || '');
    if (key === 'DMs closed') return 'your Discord privacy settings block DMs from server members';
    if (key === 'no-owner') return 'Kernel does not know your Discord id — set DISCORD_OWNER_ID in the panel environment';
    if (key === 'no-client') return 'the bot is not connected to Discord yet';
    if (key === 'no-user') return 'Discord would not return your user object';
    if (key === 'throttled') return 'another notification went out less than a minute ago';
    return key || 'the send failed';
  }

  /* -------------------------------------------------------------------- api */

  async function request(method, path, body) {
    const headers = {
      Authorization: 'Bearer ' + state.session.accessToken,
      // ngrok's free domains answer browser requests with a warning page without this.
      'ngrok-skip-browser-warning': '1',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(state.base + path, {
      method,
      cache: 'no-store',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
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

  function setStatus(text, tone) {
    if (!ui.status) return;
    ui.status.textContent = text || '';
    ui.status.className = 'ib-status' + (tone ? ' is-' + tone : '');
  }

  function visibleRows() {
    const query = state.query.trim().toLowerCase();
    return state.messages.filter((row) => {
      if (state.filter === 'unread' && row.read) return false;
      if (!query) return true;
      return [row.name, row.email, row.subject, row.body, row.dev]
        .filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }

  function renderStats() {
    if (!ui.stats) return;
    const unread = state.messages.filter((row) => !row.read).length;
    const latest = state.messages.reduce((max, row) => Math.max(max, Number(row.at) || 0), 0);
    const alert = state.data && state.data.alert;
    const dm = !alert ? 'not tried yet' : (alert.ok ? 'delivered' : 'failed');
    const tiles = [
      [numberFormat.format(unread), 'unread'],
      [numberFormat.format(state.messages.length), 'messages kept'],
      [latest ? relativeTime(latest) : '—', 'newest message'],
      [dm, 'Discord notification'],
    ];
    ui.stats.replaceChildren(...tiles.map(([value, label]) => (
      el('div', { className: 'dash-stat' }, el('b', { text: value }), el('span', { text: label }))
    )));
  }

  function renderAlert() {
    if (!ui.alert) return;
    const alert = state.data && state.data.alert;
    if (!alert) {
      ui.alert.hidden = false;
      ui.alert.className = 'ib-alert';
      ui.alert.textContent = 'Discord notifications have not been attempted since the bot started. Use “Test notification” to check the path.';
      return;
    }
    ui.alert.hidden = false;
    ui.alert.className = 'ib-alert ' + (alert.ok ? 'is-ok' : 'is-bad');
    const when = relativeTime(alert.at);
    ui.alert.textContent = alert.ok
      ? 'Last Discord notification delivered ' + when + '.'
      : 'Discord could not deliver the last notification: ' + reasonText(alert.reason) + ' (' + when + '). Messages still arrive here and in data/inbox.json.';
  }

  function renderList() {
    if (!ui.list) return;
    const rows = visibleRows();
    if (!rows.length) {
      ui.list.replaceChildren(el('p', {
        className: 'ib-empty-row',
        text: state.messages.length
          ? 'No message matches that search.'
          : 'No messages yet. Anything sent from the Contact page appears here.',
      }));
      return;
    }

    ui.list.replaceChildren(...rows.map((row) => {
      const button = el('button', {
        className: 'ib-row' + (row.read ? '' : ' is-unread') + (row.id === state.selected ? ' is-active' : ''),
        type: 'button',
      },
      el('span', { className: 'ib-row-top' },
        el('span', { className: 'ib-row-dot', 'aria-hidden': 'true' }),
        el('span', { className: 'ib-row-subject', text: row.subject }),
        el('span', { className: 'ib-row-time', text: relativeTime(row.at) })),
      el('span', { className: 'ib-row-mid' },
        el('span', { className: 'ib-row-name', text: row.name }),
        el('span', { className: 'ib-row-mail', text: row.email })),
      el('span', { className: 'ib-row-preview', text: String(row.body || '').slice(0, 120) + (String(row.body || '').length > 120 ? '…' : '') }),
      row.dev ? el('span', { className: 'ib-row-tag', text: 'via ' + row.dev + ' profile' }) : null);
      button.addEventListener('click', () => select(row.id));
      return button;
    }));
  }

  function emptyReader() {
    if (!ui.reader) return;
    ui.reader.replaceChildren(
      el('div', { className: 'ib-empty' },
        el('span', { className: 'ib-empty-mark', 'aria-hidden': 'true', text: '✉' }),
        el('h2', { text: 'Pick a message' }),
        el('p', { text: 'Everything sent from the Contact page or a developer profile is listed on the left. Replies leave from your own mail app — nothing is sent from this page.' })),
    );
  }

  function renderReader() {
    if (!ui.reader) return;
    const row = state.messages.find((entry) => entry.id === state.selected);
    if (!row) {
      emptyReader();
      return;
    }

    const mailto = 'mailto:' + row.email + '?subject=' + encodeURIComponent('Re: ' + row.subject);
    const toggle = el('button', { className: 'btn btn-dark btn-sm', type: 'button', text: row.read ? 'Mark unread' : 'Mark read' });
    toggle.addEventListener('click', () => mark(row.id, !row.read));

    const remove = el('button', { className: 'btn btn-dark btn-sm', type: 'button', text: 'Delete' });
    remove.addEventListener('click', () => erase(row));

    ui.reader.replaceChildren(
      el('article', { className: 'ib-message' },
        el('header', { className: 'ib-message-head' },
          el('p', { className: 'ib-kicker', text: 'From the website · ' + fullTime(row.at) }),
          el('h2', { text: row.subject }),
          el('p', { className: 'ib-from' },
            el('strong', { text: row.name }),
            ' · ',
            el('a', { href: mailto, text: row.email }),
            row.dev ? ' · via the ' + row.dev + ' profile' : ' · Contact page')),
        el('div', { className: 'ib-body', text: row.body }),
        el('footer', { className: 'ib-actions' },
          el('a', { className: 'btn btn-light btn-sm', href: mailto, text: 'Reply by email' }),
          toggle,
          el('button', { className: 'btn btn-dark btn-sm', type: 'button', text: 'Copy address', 'data-ib-copy': '' }),
          remove)),
    );

    const copy = ui.reader.querySelector('[data-ib-copy]');
    if (copy) {
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(row.email);
          setStatus('Address copied.', 'ok');
        } catch (error) {
          setStatus('Copy blocked by the browser — select the address above.', 'bad');
        }
      });
    }
  }

  function renderAll() {
    renderStats();
    renderAlert();
    renderList();
    renderReader();
  }

  function select(id) {
    const row = state.messages.find((entry) => entry.id === id);
    if (!row) return;
    state.selected = id;
    renderList();
    renderReader();
    if (!row.read) mark(id, true, true);
  }

  async function mark(id, read, quiet) {
    if (!quiet) setStatus(read ? 'Marking read…' : 'Marking unread…');
    try {
      await request('POST', '/api/owner/inbox/read', { id, read });
      const row = state.messages.find((entry) => entry.id === id);
      if (row) row.read = read;
      renderStats();
      renderList();
      if (state.selected === id) renderReader();
      if (!quiet) setStatus(read ? 'Marked read.' : 'Marked unread.', 'ok');
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(error.message, 'bad');
    }
  }

  async function erase(row) {
    if (!window.confirm('Delete "' + row.subject + '" from ' + row.name + '? This cannot be undone.')) return;
    setStatus('Deleting…');
    try {
      await request('POST', '/api/owner/inbox/remove', { id: row.id });
      state.messages = state.messages.filter((entry) => entry.id !== row.id);
      if (state.selected === row.id) state.selected = '';
      renderAll();
      setStatus('Deleted.', 'ok');
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(error.message, 'bad');
    }
  }

  async function load(silent) {
    if (state.busy) return;
    state.busy = true;
    try {
      const data = await request('GET', '/api/owner/inbox');
      state.data = data;
      state.messages = Array.isArray(data.messages) ? data.messages : [];
      if (state.selected && !state.messages.some((row) => row.id === state.selected)) state.selected = '';
      if (!state.selected) {
        const first = state.messages.find((row) => !row.read) || state.messages[0];
        state.selected = first ? first.id : '';
      }
      renderAll();
      if (ui.liveText) ui.liveText.textContent = 'Live';
      if (!silent) setStatus('Updated ' + new Date().toLocaleTimeString('en-GB', { hour12: false }) + '.');
    } finally {
      state.busy = false;
    }
  }

  async function loadIdentity() {
    try {
      const data = await request('GET', '/api/owner');
      const owner = (data && data.owner) || {};
      if (ui.identity) {
        ui.identity.textContent = ['@' + (owner.name || 'owner'), 'owner id ' + (owner.id || 'unknown'), state.messages.length + ' messages'].join(' · ');
      }
      if (ui.avatar && owner.name) ui.avatar.textContent = initials(owner.name);
    } catch (error) {
      /* the inbox call already proved the session; identity is decoration */
    }
  }

  async function start() {
    show('loading');
    try {
      await load(false);
      loadIdentity();
      show('app');
      stopTimer();
      state.timer = setInterval(() => {
        if (document.hidden) return;
        load(true).catch(() => {});
      }, 30000);
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      return fail(error.message || 'Kernel did not answer.');
    }
  }

  async function testNotification() {
    if (!ui.test) return;
    ui.test.disabled = true;
    setStatus('Asking Kernel to DM you…');
    try {
      const result = await request('POST', '/api/owner/inbox/test');
      if (result && result.ok) {
        setStatus('Test DM sent. If Discord is quiet, check your notification settings for this server.', 'ok');
      } else {
        setStatus('Discord refused the DM: ' + reasonText(result && result.reason) + '.', 'bad');
      }
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(error.message, 'bad');
    } finally {
      ui.test.disabled = false;
    }
  }

  /* ------------------------------------------------------------------- init */

  function init() {
    state.base = typeof window.KERNEL_API_BASE === 'string' ? window.KERNEL_API_BASE.trim().replace(/\/+$/, '') : '';

    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());

    // Consume the redirect before building a login link: loginUrl() writes a fresh state,
    // and doing that first makes every real login look forged.
    const callback = auth.consumeCallback();
    if (callback && !callback.ok) {
      gate(callback.description || 'Discord sign-in did not complete. Try again.');
    }

    if (ui.login) ui.login.href = auth.loginUrl('inbox.html');

    if (ui.logout) {
      ui.logout.addEventListener('click', () => {
        auth.clearSession();
        window.location.href = 'index.html';
      });
    }

    if (ui.retry) {
      ui.retry.addEventListener('click', () => {
        if (!state.session) return gate();
        start();
      });
    }

    if (ui.refresh) ui.refresh.addEventListener('click', () => { load(false).catch((error) => { if (error.session) gate('Your Discord session expired. Log in again.'); else if (error.denied) show('denied'); else setStatus(error.message, 'bad'); }); });
    if (ui.test) ui.test.addEventListener('click', testNotification);

    if (ui.search) {
      ui.search.addEventListener('input', () => {
        state.query = ui.search.value;
        renderList();
      });
    }

    ui.filters.forEach((button) => {
      button.addEventListener('click', () => {
        state.filter = button.dataset.ibFilter;
        ui.filters.forEach((other) => other.classList.toggle('is-on', other === button));
        renderList();
      });
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.session && state.data) load(true).catch(() => {});
    });

    if (!state.base) return fail('Kernel’s address is missing from api-config.js, so this page has nobody to ask.');

    state.session = auth.session();
    if (!state.session) return gate();
    start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
