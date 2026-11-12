/* ============================================================================
   Kernel — developer profile page.
   Renders the static profile from developers.js, then layers live Discord
   presence from Lanyard. A missing id, a 404 or a dead network never invents a
   presence: the live card says so instead.
   ========================================================================== */

'use strict';

(function () {
  const dev = window.KernelDev;
  if (!dev) return;

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  const key = String(new URLSearchParams(window.location.search).get('dev') || '').trim().toLowerCase();
  const profile = dev.profileFor(key);
  const page = document.querySelector('[data-pr-page]');
  const missing = document.querySelector('[data-pr-missing]');

  function text(name, value) {
    document.querySelectorAll('[data-pr-' + name + ']').forEach((el) => {
      el.textContent = value == null ? '' : String(value);
    });
  }

  if (!profile) {
    if (page) page.hidden = true;
    if (missing) missing.hidden = false;
    document.title = 'Profile not found — Kernel';
    return;
  }

  const id = dev.idFor(key);
  const name = profile.name || profile.handle || 'Developer';

  document.title = name + ' — Kernel';
  text('name', name);
  text('handle', profile.handle || '');
  text('badge', profile.badge || profile.role || 'Developer');
  text('tagline', profile.tagline || '');
  text('bio', profile.bio || '');
  text('initials', profile.initials || name.slice(0, 2).toUpperCase());

  const form = document.querySelector('[data-contact-form]');
  if (form) form.dataset.dev = key;

  /* -------------------------------------------------------------- contributions */
  const contrib = document.querySelector('[data-pr-contrib]');
  if (contrib) {
    const rows = Array.isArray(profile.contributions) ? profile.contributions.filter(Boolean) : [];
    contrib.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement('li');
      empty.className = 'pr-contrib-empty';
      empty.textContent = 'Nothing listed yet.';
      contrib.append(empty);
    }
    rows.forEach((row, index) => {
      const item = document.createElement('li');
      const num = document.createElement('span');
      num.className = 'pr-num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = String(index + 1).padStart(2, '0');
      const main = document.createElement('div');
      const title = document.createElement('b');
      title.textContent = row.title || 'Contribution';
      main.append(title);
      if (row.detail) {
        const detail = document.createElement('p');
        detail.textContent = row.detail;
        main.append(detail);
      }
      item.append(num, main);
      contrib.append(item);
    });
  }

  /* -------------------------------------------------------------------- apps */
  const apps = document.querySelector('[data-pr-apps]');
  if (apps) {
    const rows = Array.isArray(profile.apps) ? profile.apps.filter(Boolean) : [];
    apps.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'pr-card-note';
      empty.textContent = 'No linked apps yet.';
      apps.append(empty);
    }
    rows.forEach((row) => {
      const external = /^https?:\/\//i.test(String(row.href || ''));
      const card = document.createElement(external ? 'a' : 'div');
      card.className = 'pr-app';
      if (external) {
        card.href = row.href;
        card.target = '_blank';
        card.rel = 'noopener';
      } else if (row.href) {
        card.href = row.href;
      }
      const title = document.createElement('b');
      title.textContent = row.name || 'App';
      card.append(title);
      if (row.detail) {
        const detail = document.createElement('span');
        detail.textContent = row.detail;
        card.append(detail);
      }
      apps.append(card);
    });
  }

  /* ------------------------------------------------------------------- links */
  const links = document.querySelector('[data-pr-links]');
  const linksNote = document.querySelector('[data-pr-links-note]');
  if (links) {
    const rows = (Array.isArray(profile.links) ? profile.links : [])
      .filter((row) => row && row.label && /^https?:\/\//i.test(String(row.href || '')));
    // The Discord link is real only because the Lanyard id is real.
    if (id) rows.unshift({ label: 'Discord', href: 'https://discord.com/users/' + id });
    links.replaceChildren(...rows.map((row) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = row.href;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = row.label;
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      link.append(arrow);
      item.append(link);
      return item;
    }));
    if (linksNote) linksNote.hidden = rows.length > 0;
  }

  /* -------------------------------------------------------------------- mail */
  const mail = document.querySelector('[data-pr-mail]');
  const mailLink = document.querySelector('[data-pr-mail-link]');
  if (mail && mailLink && typeof profile.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(profile.email.trim())) {
    mailLink.href = 'mailto:' + profile.email.trim() + '?subject=' + encodeURIComponent('Hello from the Kernel site');
    mail.hidden = false;
  }

  /* ------------------------------------------------------------------- live */
  const live = document.querySelector('[data-pr-live]');
  const statusEl = document.querySelector('[data-pr-status]');
  const statusText = document.querySelector('[data-pr-status-text]');
  const activityEl = document.querySelector('[data-pr-activity]');
  const activityArt = document.querySelector('[data-pr-activity-art]');
  const activityText = document.querySelector('[data-pr-activity-text]');
  const liveNote = document.querySelector('[data-pr-live-note]');
  const avatarEl = document.querySelector('[data-pr-avatar]');
  const initialsEl = document.querySelector('[data-pr-initials]');

  function paintAvatar(user) {
    const url = dev.avatarUrl(user, 256);
    if (!avatarEl || !url) return;
    const fallback = profile.initials || name.slice(0, 2).toUpperCase();
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.width = 96;
    img.height = 96;
    img.addEventListener('error', () => {
      img.remove();
      if (!avatarEl.querySelector('span')) {
        const span = document.createElement('span');
        span.textContent = fallback;
        avatarEl.append(span);
      }
    });
    if (initialsEl) initialsEl.hidden = true;
    avatarEl.replaceChildren(img);
  }

  function note(value) {
    if (liveNote) liveNote.textContent = value;
  }

  function paintPresence(presence) {
    const user = presence && presence.discord_user;
    if (!user) return;

    const shown = user.display_name || user.global_name || user.username;
    if (shown) {
      text('name', shown);
      document.title = shown + ' — Kernel';
    }
    if (user.username) text('handle', '@' + user.username);
    paintAvatar(user);

    const status = presence.discord_status || 'offline';
    if (statusEl) statusEl.className = 'pr-status is-' + status;
    if (statusText) {
      const custom = dev.customStatus(presence);
      statusText.textContent = dev.statusLabel(status) + (custom ? ' · ' + custom : '');
    }

    const line = status === 'offline' ? null : dev.activityLine(presence);
    if (activityEl) activityEl.hidden = !line;
    if (line) {
      if (activityEl) activityEl.classList.toggle('is-spotify', Boolean(line.spotify));
      if (activityText) activityText.textContent = line.text;
      if (activityArt) {
        activityArt.hidden = !line.art;
        if (line.art) activityArt.src = line.art;
      }
    }

    note(status === 'offline'
      ? 'Offline right now. The message box still reaches me.'
      : 'Live from Lanyard · updated ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  }

  function unavailable(reason) {
    if (statusEl) statusEl.className = 'pr-status is-offline';
    if (statusText) statusText.textContent = 'Not shown';
    if (activityEl) activityEl.hidden = true;
    note(reason);
  }

  async function loadPresence() {
    if (!live) return;
    if (!id) {
      unavailable('Live status is not linked yet: the Discord id for this profile is blank in developers.js.');
      return;
    }
    try {
      const presence = await dev.fetchPresence(id);
      if (presence) paintPresence(presence);
      else unavailable('Lanyard could not read this account yet. That usually means it has not joined discord.gg/lanyard.');
    } catch (error) {
      unavailable('Presence is unreachable right now. The rest of this page still works.');
    }
  }

  loadPresence();
  setInterval(() => {
    if (!document.hidden) loadPresence();
  }, 30000);
})();
