/* ============================================================================
   Site search — one overlay, no index service.

   Pages are listed here; command rows and doc sections are read from the pages
   themselves the first time the overlay opens, so the index can never drift
   from what the site actually shows. Ctrl/Cmd+K toggles it.
   ========================================================================== */

'use strict';

(function () {
  if (window.KernelSearch) return;

  const PAGES = [
    { title: 'Home', meta: 'Kernel, 99 commands, one invite', href: 'index.html' },
    { title: 'Commands', meta: 'Every slash command, filterable and copyable', href: 'commands.html' },
    { title: 'Docs', meta: 'Setup, anti-nuke, automod, verification, logging', href: 'docs.html' },
    { title: 'Bots', meta: 'The Kernel family and builds', href: 'bots.html' },
    { title: 'Servers', meta: 'Servers running Kernel', href: 'servers.html' },
    { title: 'Reviews', meta: 'What people say after the honeymoon', href: 'reviews.html' },
    { title: 'Premium', meta: 'Owner-granted tiers and perks', href: 'premium.html' },
    { title: 'Status', meta: 'Live bot and site status', href: 'status.html' },
    { title: 'Contact', meta: 'Reach the owner or a developer', href: 'contact.html' },
    { title: 'Permissions & data', meta: 'What Kernel can touch and what it keeps', href: 'security.html' },
    { title: 'Privacy', meta: 'Every record Kernel keeps', href: 'privacy.html' },
    { title: 'Terms', meta: 'The rules for using Kernel', href: 'terms.html' },
    { title: 'Dashboard', meta: 'Manage a server you administer', href: 'dashboard.html' },
  ];

  const state = { entries: PAGES.slice(), loaded: false, loading: false, results: [], active: -1, opener: null };
  const LIMIT = 12;

  const overlay = document.createElement('div');
  overlay.className = 'site-search';
  overlay.hidden = true;
  overlay.innerHTML = [
    '<div class="site-search-backdrop" data-search-close></div>',
    '<div class="site-search-panel" role="dialog" aria-modal="true" aria-labelledby="site-search-title">',
    '  <h2 id="site-search-title" class="site-search-sr">Search Kernel</h2>',
    '  <div class="site-search-field">',
    '    <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10.4 10.4L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    '    <input type="search" placeholder="Search pages, commands and docs…" aria-label="Search the site" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="site-search-results" aria-autocomplete="list">',
    '    <kbd>Esc</kbd>',
    '  </div>',
    '  <ul class="site-search-results" id="site-search-results" role="listbox" aria-label="Search results"></ul>',
    '  <p class="site-search-hint">Enter opens the highlighted result · ↑ ↓ moves · Ctrl K closes</p>',
    '</div>',
  ].join('');
  document.body.append(overlay);

  const input = overlay.querySelector('input');
  const list = overlay.querySelector('.site-search-results');
  const panel = overlay.querySelector('.site-search-panel');

  function trigger() {
    const actions = document.querySelector('.nav-actions');
    if (!actions || actions.querySelector('[data-search-open]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-search';
    button.setAttribute('data-search-open', '');
    button.setAttribute('aria-label', 'Search the site (Ctrl+K)');
    button.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10.4 10.4L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    button.addEventListener('click', () => open());
    const login = actions.querySelector('.nav-login');
    actions.insertBefore(button, login || actions.firstChild);
  }

  function addEntries(rows) {
    const seen = new Set(state.entries.map((entry) => entry.title.toLowerCase() + '|' + entry.href));
    rows.forEach((row) => {
      const key = row.title.toLowerCase() + '|' + row.href;
      if (seen.has(key) || !row.title) return;
      seen.add(key);
      state.entries.push(row);
    });
  }

  // Command rows and doc sections live in their own pages; reading them once keeps the index
  // honest when either page changes.
  async function loadIndex() {
    if (state.loaded || state.loading) return;
    state.loading = true;
    const fetchPage = (name) => fetch(name, { cache: 'no-store' })
      .then((response) => (response.ok ? response.text() : ''))
      .catch(() => '');

    const [commands, docs, home] = await Promise.all([
      fetchPage('commands.html'),
      fetchPage('docs.html'),
      fetchPage('index.html'),
    ]);
    const parser = new DOMParser();

    if (commands) {
      const page = parser.parseFromString(commands, 'text/html');
      addEntries(Array.from(page.querySelectorAll('[data-cmd]')).map((row) => {
        const code = row.querySelector('dt code');
        const text = row.querySelector('dd');
        const name = code ? code.textContent.trim() : '';
        return {
          title: name,
          meta: text ? text.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : 'Slash command',
          href: 'commands.html?q=' + encodeURIComponent(name),
          kind: 'Command',
        };
      }).filter((row) => row.title));
    }

    if (docs) {
      const page = parser.parseFromString(docs, 'text/html');
      addEntries(Array.from(page.querySelectorAll('.doc-section[id]')).map((section) => {
        const heading = section.querySelector('h2');
        return {
          title: heading ? heading.textContent.trim() : '',
          meta: 'Docs section',
          href: 'docs.html#' + section.id,
          kind: 'Docs',
        };
      }));
    }

    if (home) {
      const page = parser.parseFromString(home, 'text/html');
      addEntries(Array.from(page.querySelectorAll('#faq details')).map((item) => {
        const summary = item.querySelector('summary');
        return {
          title: summary ? summary.textContent.trim() : '',
          meta: 'FAQ',
          href: 'index.html#faq',
          kind: 'FAQ',
        };
      }));
    }

    state.loaded = true;
    state.loading = false;
    if (!overlay.hidden) render();
  }

  function score(entry, query) {
    const title = entry.title.toLowerCase();
    const meta = (entry.meta || '').toLowerCase();
    if (title === query) return 100;
    if (title.startsWith(query)) return 80;
    if (title.includes(query)) return 60;
    if (meta.includes(query)) return 30;
    return 0;
  }

  function render() {
    const query = input.value.trim().toLowerCase();
    state.results = !query
      ? state.entries.slice(0, 8)
      : state.entries
        .map((entry) => ({ entry, points: score(entry, query) }))
        .filter((row) => row.points > 0)
        .sort((a, b) => b.points - a.points || a.entry.title.length - b.entry.title.length)
        .slice(0, LIMIT)
        .map((row) => row.entry);
    state.active = state.results.length ? 0 : -1;

    list.replaceChildren();
    if (!state.results.length) {
      const empty = document.createElement('li');
      empty.className = 'site-search-empty';
      empty.textContent = state.loading
        ? 'Reading commands and docs…'
        : 'Nothing matches “' + input.value.trim() + '”.';
      list.append(empty);
      input.setAttribute('aria-activedescendant', '');
      return;
    }

    state.results.forEach((entry, index) => {
      const item = document.createElement('li');
      item.id = 'site-search-option-' + index;
      item.setAttribute('role', 'option');
      item.className = 'site-search-result' + (index === state.active ? ' is-active' : '');
      item.setAttribute('aria-selected', String(index === state.active));

      const link = document.createElement('a');
      link.href = entry.href;
      const title = document.createElement('b');
      title.textContent = entry.title;
      const meta = document.createElement('span');
      meta.textContent = entry.meta || '';
      link.append(title, meta);
      if (entry.kind) {
        const kind = document.createElement('em');
        kind.textContent = entry.kind;
        link.append(kind);
      }
      item.append(link);
      item.addEventListener('mouseenter', () => setActive(index));
      list.append(item);
    });
    input.setAttribute('aria-activedescendant', state.results.length ? 'site-search-option-' + state.active : '');
  }

  function setActive(index) {
    if (index < 0 || index >= state.results.length) return;
    state.active = index;
    Array.from(list.children).forEach((item, at) => {
      const on = at === index;
      item.classList.toggle('is-active', on);
      item.setAttribute('aria-selected', String(on));
    });
    input.setAttribute('aria-activedescendant', 'site-search-option-' + index);
  }

  function open() {
    if (!overlay.hidden) return;
    state.opener = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add('has-site-search');
    render();
    input.focus();
    input.select();
    loadIndex();
  }

  function close() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove('has-site-search');
    if (state.opener && typeof state.opener.focus === 'function') state.opener.focus();
  }

  function go() {
    const entry = state.results[state.active];
    if (!entry) return;
    window.location.href = entry.href;
  }

  input.addEventListener('input', render);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(Math.min(state.active + 1, state.results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(Math.max(state.active - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });

  overlay.addEventListener('click', (event) => {
    if (event.target.closest('[data-search-close]')) close();
  });

  document.addEventListener('keydown', (event) => {
    const key = String(event.key || '').toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'k') {
      event.preventDefault();
      if (overlay.hidden) open();
      else close();
      return;
    }
    if (event.key === 'Escape' && !overlay.hidden) {
      close();
      return;
    }
    // Keep Tab inside the dialog while it is open.
    if (event.key === 'Tab' && !overlay.hidden) {
      const focusable = [input].concat(Array.from(panel.querySelectorAll('a[href], button')));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === input)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trigger, { once: true });
  } else {
    trigger();
  }

  window.KernelSearch = { open, close, entries: () => state.entries.slice() };
})();
