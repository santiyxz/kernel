/* Owner-edited website copy, fetched from the bot once per page load.

   The bot is the source of truth (/api/public/site), so changing the hero or switching on a
   maintenance banner never needs a redeploy. Everything here fails open: if the bot is asleep the
   page keeps the copy that shipped in the HTML. */

(function () {
  'use strict';

  const BASE =
    typeof window.KERNEL_API_BASE === 'string' ? window.KERNEL_API_BASE.trim().replace(/\/+$/, '') : '';
  const DISMISS_KEY = 'kernel.site.banner.dismissed';
  const FETCH_TIMEOUT = 4000;

  const state = { content: null };

  function safeHref(value) {
    const raw = String(value || '').trim();
    if (/^https:\/\/[^\s]+$/i.test(raw)) return raw;
    if (/^\/[^\s]*$/.test(raw) || /^[a-z0-9-]+\.html(#[\w-]+)?$/i.test(raw)) return raw;
    return '';
  }

  function applyHero(content) {
    const hero = content && content.hero ? content.hero : null;
    if (!hero) return;
    const fields = { pill: hero.pill, title: hero.title, sub: hero.sub };
    Object.keys(fields).forEach((key) => {
      const node = document.querySelector('[data-site="' + key + '"]');
      if (node && fields[key]) node.textContent = fields[key];
    });
  }

  function applyBanner(content) {
    const banner = content && content.banner ? content.banner : null;
    if (!banner || !banner.enabled || !banner.text) return;
    if (sessionStorage.getItem(DISMISS_KEY) === banner.text) return;
    if (document.querySelector('[data-site-banner]')) return;

    const bar = document.createElement('div');
    bar.className = 'site-banner';
    bar.setAttribute('data-site-banner', '');
    bar.setAttribute('role', 'status');

    const dot = document.createElement('span');
    dot.className = 'site-banner-dot';
    dot.setAttribute('aria-hidden', 'true');
    bar.append(dot);

    const href = safeHref(banner.href);
    const text = document.createElement(href ? 'a' : 'span');
    text.className = 'site-banner-text';
    text.textContent = banner.text;
    if (href) {
      text.setAttribute('href', href);
      if (/^https:/i.test(href)) {
        text.setAttribute('target', '_blank');
        text.setAttribute('rel', 'noopener');
      }
    }
    bar.append(text);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'site-banner-close';
    close.setAttribute('aria-label', 'Dismiss this notice');
    close.textContent = '×';
    close.addEventListener('click', () => {
      sessionStorage.setItem(DISMISS_KEY, banner.text);
      bar.remove();
    });
    bar.append(close);

    document.body.append(bar);
    document.body.classList.add('has-site-banner');
  }

  const ready = (async () => {
    if (!BASE) return null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      const response = await fetch(BASE + '/api/public/site', {
        cache: 'no-store',
        signal: controller.signal,
        headers: { 'ngrok-skip-browser-warning': '1' },
      });
      clearTimeout(timer);
      if (!response.ok) return null;
      const data = await response.json();
      const content = data && data.ok && data.content ? data.content : null;
      if (!content) return null;
      state.content = content;
      applyHero(content);
      applyBanner(content);
      return content;
    } catch (error) {
      return null;
    }
  })();

  window.KernelSite = {
    ready,
    content: () => state.content,
    // app.js uses this for the showcase; hiding every server falls back to showing all.
    showcase(servers) {
      const rules = state.content && state.content.showcase ? state.content.showcase : null;
      if (!rules || !Array.isArray(servers)) return servers;
      const hidden = new Set(Array.isArray(rules.hidden) ? rules.hidden : []);
      const order = Array.isArray(rules.order) ? rules.order : [];
      const rank = new Map(order.map((id, index) => [id, index]));
      const kept = servers.filter((server) => !hidden.has(String(server.id)));
      if (!kept.length) return servers;
      return kept
        .map((server, index) => ({ server, index }))
        .sort((a, b) => {
          const ra = rank.has(String(a.server.id)) ? rank.get(String(a.server.id)) : Infinity;
          const rb = rank.has(String(b.server.id)) ? rank.get(String(b.server.id)) : Infinity;
          return ra === rb ? a.index - b.index : ra - rb;
        })
        .map((entry) => entry.server);
    },
  };
})();
