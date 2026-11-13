/* ============================================================================
   Server detail — reads /api/public/servers and shows one guild from the same
   payload the showcase uses. Public fields only; a missing server says so
   instead of inventing numbers.
   ========================================================================== */

'use strict';

(function () {
  const name = document.querySelector('[data-srv-name]');
  if (!name) return;

  const base = typeof window.KERNEL_API_BASE === 'string'
    ? window.KERNEL_API_BASE.trim().replace(/\/+$/, '')
    : '';
  const id = new URLSearchParams(location.search).get('id') || '';
  const number = new Intl.NumberFormat('en');

  const el = (selector) => document.querySelector(selector);
  const ui = {
    banner: el('[data-srv-banner]'),
    icon: el('[data-srv-icon]'),
    tag: el('[data-srv-tag]'),
    tier: el('[data-srv-tier]'),
    name,
    meta: el('[data-srv-meta]'),
    members: el('[data-srv-members]'),
    boosts: el('[data-srv-boosts]'),
    boostTier: el('[data-srv-boost-tier]'),
    created: el('[data-srv-created]'),
    locale: el('[data-srv-locale]'),
    about: el('[data-srv-about]'),
    stats: el('[data-srv-stats]'),
    content: el('[data-srv-content]'),
    moreWrap: el('[data-srv-more-wrap]'),
    more: el('[data-srv-more]'),
    crumb: el('[data-srv-crumb]'),
    error: el('[data-srv-error]'),
    errorTitle: el('[data-srv-error-title]'),
    errorNote: el('[data-srv-error-note]'),
    retry: el('[data-srv-retry]'),
    copy: el('[data-srv-copy]'),
  };

  function initials(value) {
    return String(value || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  function safeUrl(value) {
    return typeof value === 'string' && /^https:\/\//i.test(value) ? value : '';
  }

  function missing(title, note) {
    if (ui.icon) ui.icon.textContent = '?';
    if (ui.stats) ui.stats.hidden = true;
    if (ui.content) ui.content.hidden = true;
    if (ui.moreWrap) ui.moreWrap.hidden = true;
    if (ui.error) ui.error.hidden = false;
    if (ui.errorTitle) ui.errorTitle.textContent = title;
    if (ui.errorNote) ui.errorNote.textContent = note;
  }

  function paintIcon(server, target) {
    if (!target) return;
    target.replaceChildren();
    const src = safeUrl(server.icon);
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        img.remove();
        target.textContent = initials(server.name);
      }, { once: true });
      target.append(img);
    } else {
      target.textContent = initials(server.name);
    }
  }

  function displayLocale(raw) {
    if (!raw) return '—';
    try {
      const language = new Intl.DisplayNames(['en'], { type: 'language' });
      return language.of(String(raw).split('-')[0]) || raw;
    } catch (error) {
      return raw;
    }
  }

  function created(server) {
    const date = Date.parse(server.createdAt);
    if (!Number.isFinite(date)) return '—';
    return new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function miniCard(server) {
    const link = document.createElement('a');
    link.className = 'srv-mini';
    link.href = 'server.html?id=' + encodeURIComponent(server.id);

    const icon = document.createElement('span');
    icon.className = 'srv-mini-icon';
    paintIcon(server, icon);

    const text = document.createElement('span');
    const title = document.createElement('b');
    title.textContent = server.name;
    const sub = document.createElement('small');
    sub.textContent = (Number(server.memberCount) || 0).toLocaleString('en') + ' members';
    text.append(title, sub);

    link.append(icon, text);
    return link;
  }

  // The breadcrumb trail describes the page that actually loaded, not a guessed title.
  function paintBreadcrumb(guildName) {
    if (ui.crumb) ui.crumb.textContent = guildName;
    // Written only once the guild is known, so the page never ships an empty JSON-LD block.
    let node = document.querySelector('script[data-server-ld]');
    if (!node) {
      node = document.createElement('script');
      node.type = 'application/ld+json';
      node.setAttribute('data-server-ld', '');
      document.head.append(node);
    }
    node.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: location.origin + location.pathname.replace(/server\.html$/, 'index.html') },
        { '@type': 'ListItem', position: 2, name: 'Servers', item: location.origin + location.pathname.replace(/server\.html$/, 'servers.html') },
        { '@type': 'ListItem', position: 3, name: guildName, item: location.origin + location.pathname + '?id=' + encodeURIComponent(id) },
      ],
    });
  }

  function render(server, all) {
    if (ui.stats) ui.stats.hidden = false;
    if (ui.content) ui.content.hidden = false;
    if (ui.error) ui.error.hidden = true;

    document.title = server.name + ' — Kernel';
    ui.name.textContent = server.name;
    paintBreadcrumb(server.name);
    paintIcon(server, ui.icon);

    const banner = safeUrl(server.banner);
    if (ui.banner) {
      ui.banner.replaceChildren();
      ui.banner.classList.toggle('is-empty', !banner);
      if (banner) {
        const img = document.createElement('img');
        img.src = banner;
        img.alt = '';
        img.decoding = 'async';
        img.addEventListener('error', () => img.remove(), { once: true });
        ui.banner.append(img);
      }
    }

    const members = Number(server.memberCount) || 0;
    // Older builds publish only id, name, icon and memberCount. Missing optional fields stay
    // blank instead of turning into a false "0 boosts / Tier 0".
    const boosts = Number.isFinite(Number(server.boostCount)) && server.boostCount !== null ? Number(server.boostCount) : null;
    const tier = Number.isFinite(Number(server.boostTier)) && server.boostTier !== null ? Number(server.boostTier) : null;
    const createdText = created(server);

    if (ui.meta) {
      const parts = [number.format(members) + ' members'];
      if (boosts !== null) parts.push(number.format(boosts) + ' boosts');
      if (createdText !== '—') parts.push('created ' + createdText);
      ui.meta.textContent = parts.join(' · ');
    }
    if (ui.members) ui.members.textContent = number.format(members);
    if (ui.boosts) ui.boosts.textContent = boosts === null ? '—' : number.format(boosts);
    if (ui.boostTier) ui.boostTier.textContent = tier === null ? '—' : 'Tier ' + tier;
    if (ui.tier) ui.tier.textContent = tier === null ? 'Boost tier not published' : 'Boost tier ' + tier;
    if (ui.created) ui.created.textContent = createdText;
    if (ui.locale) ui.locale.textContent = displayLocale(server.locale);
    if (ui.tag) ui.tag.textContent = 'Kernel is here';

    const description = typeof server.description === 'string' ? server.description.trim() : '';
    if (ui.about) {
      ui.about.textContent = description
        ? description
        : 'This server does not publish a description. Kernel only sees the name, icon, member count, boosts, creation date and locale that Discord exposes.';
    }

    const others = (Array.isArray(all) ? all : [])
      .filter((item) => item && item.id && String(item.id) !== String(server.id) && !String(item.id).startsWith('example-'))
      .slice(0, 3);
    if (ui.more && ui.moreWrap) {
      ui.more.replaceChildren();
      if (others.length) {
        others.forEach((item) => ui.more.append(miniCard(item)));
        ui.moreWrap.hidden = false;
      } else {
        ui.moreWrap.hidden = true;
      }
    }
  }

  async function load() {
    if (!id) {
      if (ui.name) ui.name.textContent = 'No server selected';
      if (ui.meta) ui.meta.textContent = 'Open the showcase and pick a server, or scan the QR code on a shared link.';
      missing('No server in this link', 'This page needs ?id=… from the server list. Start from the showcase to get a working link.');
      return;
    }
    if (!base) {
      missing('Kernel’s API is not configured', 'api-config.js has no KERNEL_API_BASE, so this page has nowhere to read from.');
      return;
    }

    if (ui.error) ui.error.hidden = true;
    if (ui.name) ui.name.textContent = 'Loading this server…';
    if (ui.meta) ui.meta.textContent = 'Reading the public server list from Kernel.';
    if (ui.icon) ui.icon.textContent = '…';

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), 8000) : 0;
    try {
      const response = await fetch(base + '/api/public/servers', {
        cache: 'no-store',
        headers: { 'ngrok-skip-browser-warning': '1' },
        signal: controller ? controller.signal : undefined,
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (!data || data.sample !== false || !Array.isArray(data.servers)) {
        throw new Error('Kernel is not publishing a live list right now.');
      }
      const server = data.servers.find((item) => item && String(item.id) === String(id));
      if (!server) {
        if (ui.name) ui.name.textContent = 'Server not listed';
        missing(
          'That server is not in Kernel’s list',
          'Kernel may have left it, or the link may be from an older build. The showcase only lists servers Kernel is in right now.',
        );
        return;
      }
      render(server, data.servers);
    } catch (error) {
      if (ui.name) ui.name.textContent = 'Server unavailable';
      missing(
        'Kernel could not load this server',
        error && error.name === 'AbortError'
          ? 'The request timed out after 8 seconds. The bot may be restarting.'
          : (error && error.message) || 'The request failed before reaching the bot.',
      );
    } finally {
      window.clearTimeout(timer);
    }
  }

  if (ui.retry) ui.retry.addEventListener('click', load);

  if (ui.copy) {
    ui.copy.addEventListener('click', async () => {
      const before = ui.copy.textContent;
      try {
        await navigator.clipboard.writeText(location.href);
        ui.copy.textContent = 'Link copied';
      } catch (error) {
        ui.copy.textContent = 'Copy failed — select the address bar';
      }
      window.setTimeout(() => {
        ui.copy.textContent = before;
      }, 1800);
    });
  }

  load();
})();
