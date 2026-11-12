'use strict';

// Live developer cards, fed by Lanyard (https://github.com/Phineas/lanyard).
//
// Lanyard only answers for Discord accounts that joined https://discord.gg/lanyard.
// Leave an id blank to keep that card exactly as written in index.html; a 404, a
// timeout or a blocked network never fabricates a presence.
//
// How to fill this in:
//   1. Join https://discord.gg/lanyard with each developer account (one per card id).
//   2. Discord → Settings → Advanced → Developer Mode, then right-click the account
//      → Copy User ID.
//   3. Paste the id next to the matching card key and re-upload this file.
window.KERNEL_DEVELOPERS = {
  rest: 'https://api.lanyard.rest/v1/users/',
  socket: 'wss://api.lanyard.rest/socket',
  users: [
    { card: 'founder', id: '1318483518262743072' },
    { card: 'teammate', id: '' },
  ],
};

(function () {
  const config = window.KERNEL_DEVELOPERS || {};
  const cards = new Map();
  document.querySelectorAll('[data-dev-card]').forEach((card) => cards.set(card.getAttribute('data-dev-card'), card));

  const watched = (Array.isArray(config.users) ? config.users : [])
    .map((entry) => ({ entry, id: String((entry && entry.id) || '').trim() }))
    .filter((row) => /^\d{15,22}$/.test(row.id) && cards.has(row.entry.card))
    .map((row) => ({ ...row, card: cards.get(row.entry.card) }));

  if (!watched.length) return;
  const byId = new Map(watched.map((row) => [row.id, row]));

  const STATUS = {
    online: 'Online',
    idle: 'Idle',
    dnd: 'Do not disturb',
    offline: 'Offline',
  };
  const VERB = { 0: 'Playing', 1: 'Streaming', 2: 'Listening to', 3: 'Watching', 5: 'Competing in' };

  function slot(card, name) {
    return card.querySelector('[data-dev-slot="' + name + '"]');
  }

  function avatarUrl(user) {
    if (!user || !user.avatar) return null;
    const animated = String(user.avatar).startsWith('a_');
    return 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.' + (animated ? 'gif' : 'png') + '?size=96';
  }

  function activityLine(presence) {
    if (presence.listening_to_spotify && presence.spotify) {
      const track = [presence.spotify.song, presence.spotify.artist].filter(Boolean).join(' — ');
      return track ? { spotify: true, text: 'Spotify · ' + track } : null;
    }
    const activity = (presence.activities || []).find((item) => item && item.type !== 4);
    if (!activity) return null;
    const verb = VERB[activity.type] || 'Playing';
    const detail = activity.details || activity.state || '';
    return { spotify: false, text: verb + ' ' + activity.name + (detail ? ' · ' + detail : '') };
  }

  function customStatus(presence) {
    const activity = (presence.activities || []).find((item) => item && item.type === 4);
    if (!activity) return '';
    const emoji = activity.emoji && activity.emoji.name ? activity.emoji.name + ' ' : '';
    return (emoji + (activity.state || '')).trim();
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
    const url = avatarUrl(user);
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
      statusEl.append(dot, document.createTextNode(STATUS[status] || 'Offline'));
      const custom = customStatus(presence);
      if (custom) statusEl.append(document.createTextNode(' · ' + custom));
    }

    const activityEl = slot(card, 'activity');
    if (activityEl) {
      const line = status === 'offline' ? null : activityLine(presence);
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
      const response = await fetch(config.rest + row.id, { headers: { Accept: 'application/json' } });
      // 404 = that account never joined discord.gg/lanyard, so its static card stays put.
      if (!response.ok) return;
      const body = await response.json();
      if (body && body.success && body.data) paint(row.card, body.data);
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
      socket = new WebSocket(config.socket || 'wss://api.lanyard.rest/socket');
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
