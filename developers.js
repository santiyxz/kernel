'use strict';

// Developer cards and profile pages, fed by Lanyard (https://github.com/Phineas/lanyard).
//
// Lanyard only answers for Discord accounts that joined https://discord.gg/lanyard.
// Leave an id blank to keep that card exactly as written in index.html; a 404, a
// timeout or a blocked network never fabricates a presence.
//
// How to fill this in:
//   1. Join https://discord.gg/lanyard with each developer account (one per card id).
//   2. Discord → Settings → Advanced → Developer Mode, then right-click the account
//      → Copy User ID.
//   3. Paste the id next to the matching entry below and re-upload this file.
//   4. Edit the matching entry in `profiles` for the public profile page: name,
//      handle, contributions, apps and links. Leave `email` blank to hide the
//      mail button (the chat box on the profile works either way).
window.KERNEL_DEVELOPERS = {
  rest: 'https://api.lanyard.rest/v1/users/',
  socket: 'wss://api.lanyard.rest/socket',
  users: [
    { card: 'founder', dev: 'founder', id: '1318483518262743072' },
    { card: 'teammate', dev: 'teammate', id: '' },
  ],
  profiles: {
    founder: {
      name: 'intelnito',
      handle: '@py.ex',
      initials: 'IN',
      badge: 'Maintainer',
      role: 'Founder',
      tagline: 'Built the anti-nuke engine, the case ledger and this site.',
      bio: 'One person, a text editor and a stubborn belief that a moderation bot should be able to prove what it did. I answer the messages this page sends.',
      email: '',
      contributions: [
        { title: 'Anti-nuke snapshot & restore', detail: 'Takes a copy of channels, roles and permissions, compares it after an incident and can put the server back.' },
        { title: 'Hash-chained case ledger', detail: 'Every moderation case carries the hash of the one before it, so an edited history does not verify.' },
        { title: 'Owner console', detail: 'A Discord-ID-gated panel for broadcasts, backups, the watchlist, scheduled jobs and release rollbacks.' },
        { title: '99 slash commands and this site', detail: 'Moderation, automod, tickets, verification, economy and utilities — plus the static site you are reading.' },
      ],
      apps: [
        { name: 'Kernel bot', detail: 'discord.js · 99 slash commands · JSON you own', href: 'https://santiyxz.github.io/kernel/' },
        { name: 'Kernel site', detail: 'Plain HTML, CSS and JavaScript on GitHub Pages', href: 'https://santiyxz.github.io/kernel/' },
        { name: 'Owner console', detail: 'Owner-only · opens after a Discord login', href: 'admin.html' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/santiyxz' },
      ],
    },
    teammate: {
      name: 'Team Member',
      handle: '@teammate',
      initials: 'TM',
      badge: 'Developer',
      role: 'Developer',
      tagline: 'Commands, automod and the economy pack.',
      bio: 'Helps keep the command surface small enough to explain and the edge cases covered. Edit this profile in developers.js.',
      email: '',
      contributions: [
        { title: 'Slash commands', detail: 'Wires new commands through the same permission and cooldown checks as the rest of the bot.' },
        { title: 'Automod', detail: 'Filters, escalation and the rules that decide when a warning becomes a timeout.' },
        { title: 'Economy pack', detail: 'Currency, shop and the commands that make a server feel lived-in.' },
      ],
      apps: [
        { name: 'Kernel bot', detail: 'Commands and automod', href: 'https://santiyxz.github.io/kernel/' },
      ],
      links: [],
    },
  },
};

// Shared by the cards on index.html and the profile pages. Keeping the presence
// parsing in one place means a profile and a card can never disagree.
window.KernelDev = (function () {
  const config = window.KERNEL_DEVELOPERS || {};
  const STATUS = {
    online: 'Online',
    idle: 'Idle',
    dnd: 'Do not disturb',
    offline: 'Offline',
  };
  const VERB = { 0: 'Playing', 1: 'Streaming', 2: 'Listening to', 3: 'Watching', 5: 'Competing in' };

  function idFor(key) {
    const entry = (Array.isArray(config.users) ? config.users : []).find((row) => row && row.dev === key);
    const id = String((entry && entry.id) || '').trim();
    return /^\d{15,22}$/.test(id) ? id : '';
  }

  function profileFor(key) {
    const profiles = config.profiles || {};
    return Object.prototype.hasOwnProperty.call(profiles, key) ? profiles[key] : null;
  }

  function avatarUrl(user, size) {
    if (!user || !user.avatar) return null;
    const animated = String(user.avatar).startsWith('a_');
    return 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.' + (animated ? 'gif' : 'png') + '?size=' + (size || 96);
  }

  function statusLabel(status) {
    return STATUS[status] || 'Offline';
  }

  // Lanyard can report a lone Hangul jamo or a zero-width tag, which paints as an empty
  // status line. Treat anything with no visible characters as no activity at all.
  const INVISIBLE = /[\u1100-\u11ff\u200b-\u200f\u202a-\u202e\u2060-\u206f\u2800\u3164\ua960-\ua97f\ud7b0-\ud7ff\ufe00-\ufe0f\uffa0]/g;
  function visible(value) {
    return String(value || '').replace(INVISIBLE, '').trim();
  }

  function activityLine(presence) {
    if (!presence) return null;
    if (presence.listening_to_spotify && presence.spotify) {
      const track = [presence.spotify.song, presence.spotify.artist].filter(Boolean).join(' — ');
      return track ? { spotify: true, text: 'Spotify · ' + track, art: presence.spotify.album_art_url || null } : null;
    }
    const activity = (presence.activities || []).find((item) => item && item.type !== 4 && visible(item.name));
    if (!activity) return null;
    const verb = VERB[activity.type] || 'Playing';
    const detail = visible(activity.details || activity.state);
    return {
      spotify: false,
      text: verb + ' ' + visible(activity.name) + (detail ? ' · ' + detail : ''),
      art: activity.assets && activity.assets.large_image && /^https:\/\//.test(activity.assets.large_image) ? activity.assets.large_image : null,
    };
  }

  function customStatus(presence) {
    if (!presence) return '';
    const activity = (presence.activities || []).find((item) => item && item.type === 4);
    if (!activity) return '';
    const emoji = activity.emoji && activity.emoji.name ? activity.emoji.name + ' ' : '';
    return (emoji + visible(activity.state)).trim();
  }

  async function fetchPresence(id) {
    if (!id) return null;
    const response = await fetch(config.rest + id, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const body = await response.json();
    return body && body.success && body.data ? body.data : null;
  }

  return { config, idFor, profileFor, avatarUrl, statusLabel, activityLine, customStatus, fetchPresence };
})();

(function () {
  const dev = window.KernelDev;
  const cards = new Map();
  document.querySelectorAll('[data-dev-card]').forEach((card) => cards.set(card.getAttribute('data-dev-card'), card));

  const watched = (Array.isArray(dev.config.users) ? dev.config.users : [])
    .map((entry) => ({
      entry,
      id: dev.idFor(entry && entry.dev),
      card: cards.get(entry && entry.card),
    }))
    .filter((row) => row.id && row.card);

  if (!watched.length) return;
  const byId = new Map(watched.map((row) => [row.id, row]));

  function slot(card, name) {
    return card.querySelector('[data-dev-slot="' + name + '"]');
  }

  function paint(card, presence) {
    const user = presence.discord_user;
    if (!user) return;

    const name = user.display_name || user.global_name || user.username;
    const nameEl = slot(card, 'name');
    const handleEl = slot(card, 'handle');
    if (nameEl && name) nameEl.textContent = name;
    if (handleEl && user.username) handleEl.textContent = '@' + user.username;

    const avatar = slot(card, 'avatar');
    const url = dev.avatarUrl(user, 96);
    if (avatar && url) {
      avatar.replaceChildren();
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.loading = 'lazy';
      img.width = 44;
      img.height = 44;
      img.addEventListener('error', () => {
        img.remove();
        const initials = slot(card, 'initials');
        if (initials) initials.hidden = false;
      });
      avatar.append(img);
    }

    const status = presence.discord_status || 'offline';
    const statusEl = slot(card, 'status');
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.className = 'dev-status is-' + status;
      statusEl.replaceChildren();
      const dot = document.createElement('span');
      dot.className = 'dev-dot';
      dot.setAttribute('aria-hidden', 'true');
      statusEl.append(dot, document.createTextNode(dev.statusLabel(status)));
      const custom = dev.customStatus(presence);
      if (custom) statusEl.append(document.createTextNode(' · ' + custom));
    }

    const activityEl = slot(card, 'activity');
    if (activityEl) {
      const line = status === 'offline' ? null : dev.activityLine(presence);
      activityEl.hidden = !line;
      if (line) {
        activityEl.textContent = line.text;
        activityEl.className = 'dev-activity' + (line.spotify ? ' is-spotify' : '');
      }
    }

    card.classList.add('is-live');
    if (status === 'offline') card.classList.add('is-offline');
    else card.classList.remove('is-offline');
  }

  async function fetchOne(row) {
    try {
      const presence = await dev.fetchPresence(row.id);
      if (presence) paint(row.card, presence);
    } catch (error) {
      /* offline or blocked: the static card is already on screen */
    }
  }

  function fetchAll() {
    watched.forEach(fetchOne);
  }

  let socket = null;
  let heartbeat = null;
  let retry = 0;
  let retryTimer = null;
  let pollTimer = null;

  function stopSocket() {
    clearInterval(heartbeat);
    heartbeat = null;
    if (socket) {
      socket.onclose = null;
      try { socket.close(); } catch (error) { /* already closed */ }
      socket = null;
    }
  }

  function scheduleReconnect() {
    stopSocket();
    retry = Math.min(retry + 1, 5);
    const wait = Math.min(2000 * Math.pow(2, retry - 1), 60000);
    clearTimeout(retryTimer);
    retryTimer = setTimeout(connect, wait);
  }

  function connect() {
    if (typeof WebSocket !== 'function') return;
    if (document.hidden) return;
    stopSocket();
    try {
      socket = new WebSocket(dev.config.socket || 'wss://api.lanyard.rest/socket');
    } catch (error) {
      scheduleReconnect();
      return;
    }

    socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch (error) { return; }

      if (message.op === 1) {
        retry = 0;
        const interval = Number(message.d && message.d.heartbeat_interval) || 30000;
        clearInterval(heartbeat);
        heartbeat = setInterval(() => {
          if (socket && socket.readyState === 1) socket.send(JSON.stringify({ op: 3 }));
        }, interval);
        socket.send(JSON.stringify({ op: 2, d: { subscribe_to_ids: watched.map((row) => row.id) } }));
        return;
      }

      if (message.t === 'INIT_STATE' && message.d) {
        Object.keys(message.d).forEach((id) => {
          const row = byId.get(id);
          if (row && message.d[id]) paint(row.card, message.d[id]);
        });
        return;
      }

      if (message.t === 'PRESENCE_UPDATE' && message.d && message.d.discord_user) {
        const row = byId.get(message.d.discord_user.id);
        if (row) paint(row.card, message.d);
      }
    });

    socket.addEventListener('close', scheduleReconnect);
    socket.addEventListener('error', () => {
      try { socket.close(); } catch (error) { /* close schedules the retry */ }
    });
  }

  // The cards are already painted from HTML; only the presence arrives late.
  const start = () => {
    fetchAll();
    connect();
    clearInterval(pollTimer);
    pollTimer = setInterval(fetchAll, 90000);
  };
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1500 });
  else setTimeout(start, 0);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopSocket();
      clearInterval(pollTimer);
    } else {
      fetchAll();
      connect();
    }
  });
})();
