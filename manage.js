/* ============================================================================
   Kernel — server settings console.
   Reads and writes the bot's own settings through its settings API. The page
   is useless without a Discord session: every request carries the visitor's
   OAuth token and the bot checks Manage Server on its side.
   ========================================================================== */

'use strict';

(function () {
  const auth = window.KernelAuth;
  if (!auth) return;

  const API_STORE = 'kernel.apiBase';
  const NEXT_KEY = 'kernel.next';
  const MAX_PINGS = 3;
  const MAX_TEXT = 1800;

  const DEFAULT_WELCOME = 'Welcome {mention} to **{server}**! You are member #{members} - say hi.';
  const DEFAULT_GOODBYE = '**{user}** left us. {server} now has {members} members.';
  const DEFAULT_PANEL = [
    'Welcome to **{server}**.',
    '',
    'Press **{button}**, answer one short question, and Kernel gives you the **{role}** role so the rest of the server opens up.',
    '',
    'Stuck? Ask a moderator in {channel} — the question changes on every click.',
  ].join('\n');

  const CHANNEL_TYPES = { 0: 'Text', 2: 'Voice', 5: 'Announcements', 13: 'Stage', 15: 'Forum' };
  const GREETING_TYPES = [0, 2, 5, 13, 15];
  const TEXT_TYPES = [0, 5, 15];

  const state = {
    api: '',
    guildId: '',
    guild: null,
    data: null,
    guilds: [],
    channels: [],
    roles: [],
    forms: {},
    tab: 'welcome',
    dirty: false,
    busy: false,
    toastTimer: 0,
  };

  const ui = {
    loading: document.querySelector('[data-mg-loading]'),
    gate: document.querySelector('[data-mg-gate]'),
    gateError: document.querySelector('[data-mg-gate-error]'),
    login: document.querySelector('[data-mg-login]'),
    connect: document.querySelector('[data-mg-connect]'),
    connectForm: document.querySelector('[data-mg-connect-form]'),
    connectError: document.querySelector('[data-mg-connect-error]'),
    error: document.querySelector('[data-mg-error]'),
    errorText: document.querySelector('[data-mg-error-text]'),
    retry: document.querySelector('[data-mg-retry]'),
    app: document.querySelector('[data-mg-app]'),
    icon: document.querySelector('[data-mg-icon]'),
    name: document.querySelector('[data-mg-name]'),
    meta: document.querySelector('[data-mg-meta]'),
    picker: document.querySelector('[data-mg-picker]'),
    tabs: Array.prototype.slice.call(document.querySelectorAll('[data-mg-tab]')),
    panels: document.querySelector('[data-mg-panels]'),
    status: document.querySelector('[data-mg-status]'),
    preview: document.querySelector('[data-mg-preview]'),
  };

  /* --------------------------------------------------------------- helpers */

  function el(tag, attrs) {
    const node = document.createElement(tag);
    const settings = attrs || {};
    for (const key of Object.keys(settings)) {
      const value = settings[key];
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key === 'onclick') node.addEventListener('click', value);
      else if (key === 'oninput') node.addEventListener('input', value);
      else if (key === 'onchange') node.addEventListener('change', value);
      else node.setAttribute(key, value === true ? '' : String(value));
    }
    for (let i = 2; i < arguments.length; i += 1) {
      const child = arguments[i];
      if (child === null || child === undefined || child === false) continue;
      if (Array.isArray(child)) {
        child.forEach((item) => item && node.append(item));
      } else {
        node.append(child);
      }
    }
    return node;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
  }

  function formatText(value) {
    return escapeHtml(value)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function channelById(id) {
    return state.channels.find((channel) => channel.id === id) || null;
  }

  function channelName(id) {
    const channel = channelById(id);
    return channel ? '#' + channel.name : 'the channel';
  }

  function roleName(id) {
    const role = state.roles.find((entry) => entry.id === id);
    return role ? role.name : 'Verified';
  }

  function iconUrl(id, hash, size) {
    if (!hash || !/^\d+$/.test(String(id))) return '';
    return 'https://cdn.discordapp.com/icons/' + id + '/' + hash + '.' + (hash.indexOf('a_') === 0 ? 'gif' : 'png') + '?size=' + (size || 128);
  }

  function normalizeBase(value) {
    if (!value) return '';
    let base = String(value).trim().replace(/\/+$/, '');
    if (!/^https?:\/\/[^\s]+$/i.test(base)) return '';
    if (/\/api$/i.test(base)) base = base.slice(0, -4);
    return base;
  }

  /* ------------------------------------------------------------------- api */

  function resolveApi() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = normalizeBase(params.get('api'));
    if (fromQuery) {
      try { window.localStorage.setItem(API_STORE, fromQuery); } catch (error) { /* ignore */ }
      return fromQuery;
    }
    const configured = normalizeBase(window.KERNEL_API_BASE);
    if (configured) return configured;
    try { return normalizeBase(window.localStorage.getItem(API_STORE)); } catch (error) { return ''; }
  }

  async function request(method, path, body) {
    const session = auth.session();
    if (!session) {
      const error = new Error('Your Discord session ended. Log in again.');
      error.status = 401;
      throw error;
    }

    const headers = { Authorization: 'Bearer ' + session.accessToken };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    // ngrok's free domains answer browser requests with a warning page instead of the API's
    // JSON unless this header is present.
    headers['ngrok-skip-browser-warning'] = '1';

    const response = await fetch(state.api + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });

    let data = null;
    try { data = await response.json(); } catch (error) { /* not json */ }

    if (!response.ok) {
      const message = data && data.error && data.error.message;
      const error = new Error(message || 'Kernel could not do that.');
      error.status = response.status;
      error.code = data && data.error ? data.error.code : '';
      if (response.status === 401) auth.clearSession();
      throw error;
    }

    return data || {};
  }

  /* ------------------------------------------------------------------- ui */

  function show(which) {
    if (!ui.loading) return;
    ui.loading.hidden = which !== 'loading';
    ui.gate.hidden = which !== 'gate';
    ui.connect.hidden = which !== 'connect';
    ui.error.hidden = which !== 'error';
    ui.app.hidden = which !== 'app';
  }

  function toast(message, tone) {
    if (!ui.status) return;
    ui.status.textContent = message;
    ui.status.className = 'mg-status is-' + (tone || 'ok');
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      ui.status.textContent = '';
      ui.status.className = 'mg-status';
    }, 6500);
  }

  function showError(message) {
    if (ui.errorText) ui.errorText.textContent = message;
    show('error');
  }

  function showGate(message) {
    if (ui.gateError) {
      ui.gateError.textContent = message || '';
      ui.gateError.hidden = !message;
    }
    if (ui.login) ui.login.href = auth.loginUrl();
    show('gate');
  }

  function markDirty() {
    state.dirty = true;
  }

  function handleLoadError(error) {
    if (error.status === 401) {
      showGate('Your Discord session expired. Log in again to keep editing.');
      return;
    }
    if (error.status === 404 && error.code === 'bot_not_installed') {
      showError('Kernel is not in that server yet. Invite it from the dashboard, then come back.');
      return;
    }
    showError(error.message || 'Kernel could not load that server. Try again in a moment.');
  }

  function handleActionError(error) {
    if (error.status === 401) {
      showGate('Your Discord session expired. Log in again to keep editing.');
      return;
    }
    toast(error.message || 'Kernel could not save that.', 'error');
  }

  /* --------------------------------------------------------------- loading */

  async function bootstrap() {
    show('loading');

    const api = resolveApi();
    if (!api) {
      show('connect');
      return;
    }
    state.api = api;

    if (!auth.session()) {
      showGate();
      return;
    }

    try {
      const result = await request('GET', '/api/me/guilds');
      const guilds = Array.isArray(result.guilds) ? result.guilds : [];
      state.guilds = guilds;

      if (!guilds.length) {
        showError('Kernel is in none of the servers where you have Manage Server. Invite it to a server you control, then reload.');
        return;
      }

      const wanted = new URLSearchParams(window.location.search).get('guild');
      const picked = guilds.find((guild) => guild.id === wanted) || guilds.find((guild) => guild.bot) || guilds[0];

      if (!picked.bot) {
        showError('Kernel is not in that server yet. Invite it from the dashboard, then come back.');
        return;
      }

      await openGuild(picked.id);
    } catch (error) {
      handleLoadError(error);
    }
  }

  async function openGuild(guildId) {
    show('loading');
    try {
      const data = await request('GET', '/api/guilds/' + encodeURIComponent(guildId));
      state.data = data;
      state.guild = data.guild;
      state.guildId = data.guild.id;
      state.channels = Array.isArray(data.channels) ? data.channels : [];
      state.roles = Array.isArray(data.roles) ? data.roles : [];

      window.history.replaceState(null, '', 'manage.html?guild=' + encodeURIComponent(state.guildId));
      document.title = data.guild.name + ' — Kernel settings';

      renderHeader();
      renderPicker();
      buildPanels();
      switchTab('welcome');
      show('app');
      if (ui.name) ui.name.focus({ preventScroll: true });
    } catch (error) {
      handleLoadError(error);
    }
  }

  function renderHeader() {
    if (ui.name) ui.name.textContent = state.guild.name;
    if (ui.meta) {
      const count = Number(state.guild.memberCount || 0);
      ui.meta.textContent = count.toLocaleString('en-US') + ' members · changes save to the bot';
    }
    if (!ui.icon) return;
    ui.icon.replaceChildren();
    ui.icon.textContent = String(state.guild.name || 'K').trim().charAt(0).toUpperCase();

    const url = iconUrl(state.guild.id, state.guild.icon, 128);
    if (!url) return;
    const img = new Image();
    img.alt = '';
    img.src = url;
    img.addEventListener('error', () => img.remove(), { once: true });
    ui.icon.append(img);
  }

  function renderPicker() {
    if (!ui.picker) return;
    ui.picker.replaceChildren();
    state.guilds.forEach((guild) => {
      const option = el('option', { value: guild.id, text: guild.name + (guild.bot ? '' : ' (Kernel not added)') });
      option.disabled = !guild.bot;
      ui.picker.append(option);
    });
    ui.picker.value = state.guildId;
  }

  /* ---------------------------------------------------------------- forms */

  function field(label, control, help) {
    return el('label', { class: 'mg-field' },
      el('span', { text: label }),
      control,
      help ? el('small', { text: help }) : null,
    );
  }

  function textInput(name, value, maxlength, placeholder) {
    const input = el('input', { type: 'text', name, maxlength: String(maxlength || 200), placeholder: placeholder || '' });
    input.value = value || '';
    return input;
  }

  function switchField(name, label, help, checked) {
    const input = el('input', { type: 'checkbox', name });
    input.checked = Boolean(checked);
    const node = el('label', { class: 'mg-switch' },
      input,
      el('span', { class: 'mg-switch-track', 'aria-hidden': 'true' }),
      el('span', { class: 'mg-switch-copy' },
        el('b', { text: label }),
        help ? el('small', { text: help }) : null,
      ),
    );
    return { node, input };
  }

  function channelSelect(name, value, types, noneLabel) {
    const select = el('select', { name });
    select.append(el('option', { value: '', text: noneLabel || 'No channel' }));
    state.channels
      .filter((channel) => types.indexOf(channel.type) !== -1)
      .forEach((channel) => {
        const label = (channel.type === 0 || channel.type === 15 ? '#' : '') + channel.name + (channel.type === 5 ? ' · Announcements' : channel.type === 2 ? ' · Voice' : '');
        select.append(el('option', { value: channel.id, text: label }));
      });
    select.value = value || '';
    return select;
  }

  function colorField(labelText, value) {
    const initial = typeof value === 'number' ? '#' + value.toString(16).padStart(6, '0') : '';
    const text = el('input', { type: 'text', name: 'color', placeholder: '#5865f2', maxlength: '7', class: 'mg-color-text' });
    text.value = initial;
    const picker = el('input', { type: 'color', class: 'mg-color', value: initial || '#5865f2', 'aria-label': labelText });
    picker.value = initial || '#5865f2';

    picker.addEventListener('input', () => {
      text.value = picker.value;
      markDirty();
      renderPreview();
    });
    text.addEventListener('input', () => {
      if (/^#[0-9a-f]{6}$/i.test(text.value.trim())) picker.value = text.value.trim();
      markDirty();
      renderPreview();
    });

    const row = el('div', { class: 'mg-color-row' }, picker, text);
    return { node: field(labelText, row, 'Leave empty for Discord’s default grey.'), text };
  }

  function panelShell(id, title, blurb) {
    return el('section', {
      class: 'mg-panel',
      id: 'panel-' + id,
      'data-panel': id,
      role: 'tabpanel',
      'aria-labelledby': 'tab-' + id,
      hidden: true,
    },
      el('header', { class: 'mg-panel-head' },
        el('h2', { text: title }),
        el('p', { text: blurb }),
      ),
    );
  }

  function actionRow(note, buttons) {
    return el('div', { class: 'mg-actions' },
      el('span', { class: 'mg-actions-note', text: note }),
      el('div', { class: 'mg-actions-buttons' }, buttons),
    );
  }

  function buildPanels() {
    state.forms = {};
    const built = [
      buildGreeting('welcome'),
      buildGreeting('goodbye'),
      buildAnnouncements(),
      buildLogs(),
      buildVerification(),
    ];
    ui.panels.replaceChildren.apply(ui.panels, built);
  }

  /* -------------------------------------------------------------- greeting */

  function buildGreeting(kind) {
    const conf = state.data.config[kind];
    const welcome = kind === 'welcome';
    const panel = panelShell(
      kind,
      welcome ? 'Welcome' : 'Goodbye',
      welcome
        ? 'The card a new member sees when they join. It posts in the channel you choose and updates the moment you save.'
        : 'What Kernel posts when someone leaves. Same design controls as the welcome card, with its own text.',
    );

    const f = {};

    const enabled = switchField(
      'enabled',
      welcome ? 'Welcome new members' : 'Post when members leave',
      welcome ? 'Turn the card off without deleting its design.' : 'Keep the design saved but stop posting it.',
      conf.enabled,
    );
    f.enabled = enabled.input;
    panel.append(el('div', { class: 'mg-card' }, enabled.node));

    const channel = channelSelect('channelId', conf.channelId, GREETING_TYPES, 'No channel');
    f.channel = channel;
    panel.append(el('div', { class: 'mg-card' },
      el('h3', { text: 'Destination' }),
      field('Channel', channel, welcome ? 'Text, announcement, forum or voice channel.' : 'Where the goodbye card lands.'),
    ));

    const text = el('textarea', {
      name: 'text',
      rows: '5',
      maxlength: String(MAX_TEXT),
      placeholder: welcome ? DEFAULT_WELCOME : DEFAULT_GOODBYE,
    });
    text.value = conf.text || '';
    f.text = text;
    panel.append(el('div', { class: 'mg-card' },
      el('h3', { text: 'Message' }),
      field('Text', text, 'Placeholders: {mention} {user} {tag} {server} {members} {id} {age} {channel} {ping}'),
    ));

    const card = el('select', { name: 'card' });
    card.append(el('option', { value: 'plain', text: 'Plain text — one line, no card' }));
    card.append(el('option', { value: 'embed', text: 'Embed card — banner, icon, colour' }));
    card.value = conf.design.card === 'embed' ? 'embed' : 'plain';
    f.card = card;

    const title = textInput('title', conf.design.title || '', 256, 'Welcome to the server');
    const author = textInput('author', conf.design.author, 256, 'Kernel');
    const thumbnail = textInput('thumbnail', conf.design.thumbnail, 500, 'https://…/icon.png');
    const image = textInput('image', conf.design.image, 500, 'https://…/banner.png');
    const footer = textInput('footer', conf.design.footer, 600, 'See you inside');
    const footerIcon = textInput('footerIcon', conf.design.footerIcon, 500, 'https://…/tiny.png');
    const color = colorField('Accent colour', conf.design.color);
    const timestamp = switchField('timestamp', 'Timestamp', 'Show when the card was posted.', conf.design.timestamp);

    f.title = title;
    f.author = author;
    f.thumbnail = thumbnail;
    f.image = image;
    f.footer = footer;
    f.footerIcon = footerIcon;
    f.color = color.text;
    f.timestamp = timestamp.input;

    panel.append(el('div', { class: 'mg-card' },
      el('h3', { text: 'Card style' }),
      field('How it is drawn', card, 'Plain text ignores the design fields below.'),
      el('div', { class: 'mg-design' },
        el('div', { class: 'mg-design-head' },
          el('h4', { text: 'Embed design' }),
          el('p', { text: 'Banner = the wide image, icon = the small square image.' }),
        ),
        el('div', { class: 'mg-grid-2' },
          field('Title', title),
          field('Author', author),
        ),
        color.node,
        el('div', { class: 'mg-grid-2' },
          field('Icon (thumbnail) URL', thumbnail, 'Direct image link.'),
          field('Banner image URL', image, 'Direct image link.'),
        ),
        el('div', { class: 'mg-grid-2' },
          field('Footer', footer),
          field('Footer icon URL', footerIcon),
        ),
        timestamp.node,
      ),
    ));

    const pingBox = el('div', { class: 'mg-role-list' });
    const selected = new Set(conf.design.pingRoles || []);
    state.roles.forEach((role) => {
      const box = el('input', { type: 'checkbox', value: role.id });
      box.checked = selected.has(role.id);
      box.addEventListener('change', () => {
        if (box.checked && selected.size >= MAX_PINGS) {
          box.checked = false;
          toast('Up to ' + MAX_PINGS + ' ping roles on one card.', 'error');
          return;
        }
        if (box.checked) selected.add(role.id);
        else selected.delete(role.id);
        markDirty();
        renderPreview();
      });
      const dot = el('span', { class: 'mg-role-dot', 'aria-hidden': 'true' });
      dot.style.background = role.color || '#99aab5';
      pingBox.append(el('label', { class: 'mg-role' }, box, dot, el('span', { text: role.name })));
    });
    f.pingRoles = selected;

    panel.append(el('div', { class: 'mg-card' },
      el('h3', { text: 'Pings' }),
      el('p', { class: 'mg-help', text: 'Roles pinged when the card posts. Up to ' + MAX_PINGS + '.' }),
      pingBox,
    ));

    panel.append(actionRow(
      'Saving applies to the next ' + (welcome ? 'join' : 'leave') + '.',
      [
        el('button', { class: 'btn btn-dark btn-sm', type: 'button', text: 'Save', onclick: () => saveGreeting(kind, false) }),
        el('button', { class: 'btn btn-light btn-sm', type: 'button', text: 'Save & send test', onclick: () => saveGreeting(kind, true) }),
      ],
    ));

    panel.addEventListener('input', () => { markDirty(); renderPreview(); });
    panel.addEventListener('change', () => { markDirty(); renderPreview(); });

    state.forms[kind] = f;
    return panel;
  }

  function greetingPayload(kind) {
    const f = state.forms[kind];
    return {
      enabled: f.enabled.checked,
      channelId: f.channel.value || null,
      text: f.text.value,
      design: {
        title: f.title.value,
        author: f.author.value,
        color: f.color.value.trim() || null,
        thumbnail: f.thumbnail.value,
        image: f.image.value,
        footer: f.footer.value,
        footerIcon: f.footerIcon.value,
        timestamp: f.timestamp.checked,
        card: f.card.value,
        pingRoles: Array.from(f.pingRoles),
      },
    };
  }

  async function saveGreeting(kind, test) {
    if (state.busy) return;
    if (test && !state.forms[kind].channel.value) {
      toast('Pick a channel first — the test card needs somewhere to go.', 'error');
      return;
    }
    state.busy = true;
    try {
      const payload = greetingPayload(kind);
      const result = await request('PUT', '/api/guilds/' + state.guildId + '/greetings/' + kind, payload);
      state.data.config[kind] = result.greeting;
      state.dirty = false;
      toast('Saved. New ' + (kind === 'welcome' ? 'joins' : 'leaves') + ' will use this card.', 'ok');

      if (test) {
        const sent = await request('POST', '/api/guilds/' + state.guildId + '/test/greeting', { kind });
        toast('Saved and sent a test card to ' + channelName(sent.message.channelId) + '.', 'ok');
      }
    } catch (error) {
      handleActionError(error);
    } finally {
      state.busy = false;
    }
  }

  /* --------------------------------------------------------- announcements */

  function buildAnnouncements() {
    const conf = state.data.config.announcements;
    const panel = panelShell(
      'announcements',
      'Announcements',
      'Post a one-off announcement as Kernel, and choose where level-up announcements land.',
    );

    const levelUps = switchField('levelUps', 'Level-up announcements', 'Send a message when someone levels up.', conf.levelUps);
    const levelChannel = channelSelect('levelUpChannelId', conf.levelUpChannelId, TEXT_TYPES, 'Same channel as the message');

    state.forms.announcements = { levelUps: levelUps.input, levelChannel };

    panel.append(el('div', { class: 'mg-card' },
      el('h3', { text: 'Level-ups' }),
      levelUps.node,
      field('Level-up channel', levelChannel, 'Leave empty to answer where the member was talking.'),
      el('div', { class: 'mg-actions' },
        el('span', { class: 'mg-actions-note', text: 'Save applies immediately.' }),
        el('div', { class: 'mg-actions-buttons' },
          el('button', { class: 'btn btn-dark btn-sm', type: 'button', text: 'Save', onclick: saveAnnouncementSettings }),
        ),
      ),
    ));

    const channel = channelSelect('announceChannel', '', [0, 5], 'Pick a channel');
    const text = el('textarea', { name: 'announceText', rows: '5', maxlength: '2000', placeholder: 'A new update is live. Here is what changed…' });
    const embedTitle = textInput('embedTitle', '', 256, 'Optional embed title');
    const embedColor = colorField('Embed colour', null);
    const embedImage = textInput('embedImage', '', 500, 'https://…/image.png');
    const embedFooter = textInput('embedFooter', '', 600, 'Optional footer');
    const pin = switchField('pin', 'Pin it', 'Pin the post in that channel.', false);
    const publish = switchField('publish', 'Publish to followers', 'Only works in an Announcements channel.', false);

    state.forms.announcements.composer = {
      channel,
      text,
      embedTitle,
      embedColor: embedColor.text,
      embedImage,
      embedFooter,
      pin: pin.input,
      publish: publish.input,
    };

    const status = el('p', { class: 'mg-send-status', role: 'status', 'aria-live': 'polite' });

    panel.append(el('div', { class: 'mg-card' },
      el('h3', { text: 'Write an announcement' }),
      field('Channel', channel, 'Announcements channels can also be published to followers.'),
      field('Message', text, 'Up to 2,000 characters. Sent by Kernel, not by you.'),
      el('div', { class: 'mg-grid-2' },
        field('Embed title', embedTitle, 'Optional. Turns the post into a card.'),
        embedColor.node,
      ),
      el('div', { class: 'mg-grid-2' },
        field('Image URL', embedImage, 'Optional wide image.'),
        field('Footer', embedFooter, 'Optional small line.'),
      ),
      el('div', { class: 'mg-switch-row' }, pin.node, publish.node),
      el('div', { class: 'mg-actions' },
        el('span', { class: 'mg-actions-note', text: 'This posts immediately.' }),
        el('div', { class: 'mg-actions-buttons' },
          el('button', { class: 'btn btn-light btn-sm', type: 'button', text: 'Send announcement', onclick: sendAnnouncement }),
        ),
      ),
      status,
    ));

    panel.addEventListener('input', () => { markDirty(); renderPreview(); });
    panel.addEventListener('change', () => { markDirty(); renderPreview(); });

    return panel;
  }

  async function saveAnnouncementSettings() {
    if (state.busy) return;
    state.busy = true;
    try {
      const f = state.forms.announcements;
      const result = await request('PUT', '/api/guilds/' + state.guildId + '/announcements', {
        levelUps: f.levelUps.checked,
        levelUpChannelId: f.levelChannel.value || null,
      });
      state.data.config.announcements = result.announcements;
      state.dirty = false;
      toast('Announcement settings saved.', 'ok');
    } catch (error) {
      handleActionError(error);
    } finally {
      state.busy = false;
    }
  }

  async function sendAnnouncement() {
    if (state.busy) return;
    const f = state.forms.announcements.composer;
    const text = f.text.value.trim();
    const title = f.embedTitle.value.trim();
    if (!text && !title) {
      toast('Write the announcement first.', 'error');
      return;
    }
    if (!f.channel.value) {
      toast('Pick a channel for the announcement.', 'error');
      return;
    }

    state.busy = true;
    try {
      const result = await request('POST', '/api/guilds/' + state.guildId + '/announce', {
        channelId: f.channel.value,
        text,
        pin: f.pin.checked,
        publish: f.publish.checked,
        embed: title || f.embedColor.value.trim() || f.embedImage.value.trim() || f.embedFooter.value.trim()
          ? {
            title,
            color: f.embedColor.value.trim() || null,
            image: f.embedImage.value.trim(),
            footer: f.embedFooter.value,
          }
          : null,
      });

      const note = result.message && result.message.url
        ? 'Sent to ' + channelName(f.channel.value) + '. '
        : 'Sent. ';
      const link = result.message && result.message.url
        ? el('a', { href: result.message.url, target: '_blank', rel: 'noopener noreferrer', text: 'Open in Discord' })
        : null;
      const status = ui.panels.querySelector('.mg-send-status');
      if (status) {
        status.replaceChildren(document.createTextNode(note), link || document.createTextNode(''));
      }
      toast('Announcement posted.', 'ok');
      f.text.value = '';
      f.embedTitle.value = '';
      f.embedImage.value = '';
      f.embedFooter.value = '';
      renderPreview();
    } catch (error) {
      handleActionError(error);
    } finally {
      state.busy = false;
    }
  }

  /* ------------------------------------------------------------------ logs */

  function buildLogs() {
    const conf = state.data.config.logs;
    const panel = panelShell(
      'logs',
      'Logs',
      'Where Kernel reports moderation cases, message edits and security alerts. Every destination is optional.',
    );

    const logChannel = channelSelect('logChannelId', conf.logChannelId, TEXT_TYPES, 'No log channel');
    const antiNuke = channelSelect('antiNukeAlerts', conf.antiNukeAlerts, TEXT_TYPES, 'Use the log channel');
    const tokenGuard = channelSelect('tokenGuardAlerts', conf.tokenGuardAlerts, TEXT_TYPES, 'Use the log channel');
    const antiLink = channelSelect('antiLinkAlerts', conf.antiLinkAlerts, TEXT_TYPES, 'Use the log channel');

    const messageLog = switchField('messageLog', 'Message edits and deletes', 'Needs the Message Content intent.', conf.messageLog);
    const joins = switchField('joins', 'Join and leave detail', 'A staff-facing line in the log channel.', conf.joins);

    state.forms.logs = {
      logChannel,
      antiNuke,
      tokenGuard,
      antiLink,
      messageLog: messageLog.input,
      joins: joins.input,
    };

    panel.append(el('div', { class: 'mg-card' },
      el('h3', { text: 'Main log' }),
      field('Log channel', logChannel, 'Moderation cases and server events.'),
      el('div', { class: 'mg-switch-row' }, messageLog.node, joins.node),
    ));

    panel.append(el('div', { class: 'mg-card' },
      el('h3', { text: 'Security alerts' }),
      el('p', { class: 'mg-help', text: 'Leave a channel empty to send the alert to the main log channel.' }),
      el('div', { class: 'mg-grid-2' },
        field('Anti-nuke', antiNuke),
        field('Token guard', tokenGuard),
      ),
      field('Link filter', antiLink),
    ));

    panel.append(actionRow('Saving applies immediately.', [
      el('button', { class: 'btn btn-dark btn-sm', type: 'button', text: 'Save', onclick: saveLogs }),
    ]));

    panel.addEventListener('input', () => { markDirty(); renderPreview(); });
    panel.addEventListener('change', () => { markDirty(); renderPreview(); });

    return panel;
  }

  async function saveLogs() {
    if (state.busy) return;
    state.busy = true;
    try {
      const f = state.forms.logs;
      const result = await request('PUT', '/api/guilds/' + state.guildId + '/logs', {
        logChannelId: f.logChannel.value || null,
        antiNukeAlerts: f.antiNuke.value || null,
        tokenGuardAlerts: f.tokenGuard.value || null,
        antiLinkAlerts: f.antiLink.value || null,
        messageLog: f.messageLog.checked,
        joins: f.joins.checked,
      });
      state.data.config.logs = result.logs;
      state.dirty = false;
      toast('Log settings saved.', 'ok');
    } catch (error) {
      handleActionError(error);
    } finally {
      state.busy = false;
    }
  }

  /* ---------------------------------------------------------- verification */

  function buildVerification() {
    const conf = state.data.config.verification;
    const panel = panelShell(
      'verification',
      'Verification',
      'The message on the verify gate. The channel and role are locked in by /verification setup, so the gate keeps working while you edit the wording.',
    );

    const enabled = switchField('enabled', 'Verification gate', 'Turn the gate off without deleting it.', conf.enabled);
    const minutes = el('input', { type: 'number', name: 'minutes', min: '1', max: '60', step: '1' });
    minutes.value = String(conf.minutes || 3);
    const label = textInput('buttonLabel', conf.buttonLabel || 'Verify me', 80, 'Verify me');
    const text = el('textarea', { name: 'panelText', rows: '6', maxlength: '2000', placeholder: DEFAULT_PANEL });
    text.value = conf.panelText || '';

    state.forms.verification = { enabled: enabled.input, minutes, label, text };

    const channel = conf.channelId ? channelName(conf.channelId) : 'not set up yet';
    const role = conf.roleId ? roleName(conf.roleId) : 'not set up yet';

    panel.append(el('div', { class: 'mg-card' },
      el('div', { class: 'mg-locked' },
        el('div', null,
          el('span', { class: 'mg-locked-label', text: 'Gate channel' }),
          el('b', { text: channel }),
        ),
        el('div', null,
          el('span', { class: 'mg-locked-label', text: 'Verified role' }),
          el('b', { text: role }),
        ),
      ),
      el('p', { class: 'mg-help', text: 'Use /verification setup in Discord to change the channel or role. This page edits the panel itself.' }),
    ));

    panel.append(el('div', { class: 'mg-card' },
      el('h3', { text: 'Panel' }),
      enabled.node,
      el('div', { class: 'mg-grid-2' },
        field('Button label', label),
        field('Answer window (minutes)', minutes, 'How long a member has to answer.'),
      ),
      field('Panel text', text, 'Placeholders: {server} {role} {channel} {button}'),
    ));

    panel.append(actionRow('The posted gate is edited in place.', [
      el('button', { class: 'btn btn-dark btn-sm', type: 'button', text: 'Save', onclick: saveVerification }),
    ]));

    panel.addEventListener('input', () => { markDirty(); renderPreview(); });
    panel.addEventListener('change', () => { markDirty(); renderPreview(); });

    return panel;
  }

  async function saveVerification() {
    if (state.busy) return;
    state.busy = true;
    try {
      const f = state.forms.verification;
      const result = await request('PUT', '/api/guilds/' + state.guildId + '/verification', {
        enabled: f.enabled.checked,
        minutes: Number(f.minutes.value),
        panelText: f.text.value,
        buttonLabel: f.label.value,
      });
      state.data.config.verification = result.verification;
      state.dirty = false;

      const panel = result.panel || {};
      if (panel.updated) toast('Verification panel saved and updated in Discord.', 'ok');
      else if (panel.skipped) toast('Saved. No posted panel to edit yet — run /verification setup in Discord.', 'ok');
      else if (panel.error) toast('Saved, but Discord could not edit the posted panel: ' + panel.error, 'error');
      else toast('Verification settings saved.', 'ok');
    } catch (error) {
      handleActionError(error);
    } finally {
      state.busy = false;
    }
  }

  /* --------------------------------------------------------------- preview */

  function sampleGreeting(kind, text) {
    const template = text && text.trim() ? text : kind === 'welcome' ? DEFAULT_WELCOME : DEFAULT_GOODBYE;
    const count = Number(state.guild && state.guild.memberCount ? state.guild.memberCount : 0);
    return template
      .replace(/\{mention\}/g, '@newmember')
      .replace(/\{user\}/g, 'newmember')
      .replace(/\{tag\}/g, 'newmember')
      .replace(/\{server\}/g, state.guild ? state.guild.name : 'your server')
      .replace(/\{members\}/g, String(count + 1))
      .replace(/\{id\}/g, '123456789012345678')
      .replace(/\{age\}/g, '7 months ago')
      .replace(/\{channel\}/g, '#welcome')
      .replace(/\{ping\}/g, '');
  }

  function messageShell() {
    return el('div', { class: 'dc-message' },
      el('div', { class: 'dc-app', text: 'Kernel ' }),
      el('div', { class: 'dc-row' },
        el('span', { class: 'dc-avatar', text: 'K' }),
        el('div', { class: 'dc-content' },
          el('div', { class: 'dc-name' },
            'Kernel ',
            el('span', { class: 'dc-bot', text: 'BOT' }),
            el('span', { class: 'dc-time', text: 'Today at 12:00' }),
          ),
        ),
      ),
    );
  }

  function greetingPreview(kind) {
    const f = state.forms[kind];
    const conf = greetingPayload(kind);
    const message = messageShell();
    const content = message.querySelector('.dc-content');

    const pings = Array.from(f.pingRoles).map((id) => roleName(id));
    if (pings.length) {
      content.append(el('div', { class: 'dc-pings' }, pings.map((name) => el('span', { class: 'dc-ping', text: '@' + name }))));
    }

    if (conf.design.card !== 'embed') {
      content.append(el('div', { class: 'dc-plain', html: formatText(sampleGreeting(kind, conf.text)) }));
      return message;
    }

    const accent = conf.design.color && /^#[0-9a-f]{6}$/i.test(conf.design.color) ? conf.design.color : '#4f545c';
    const embed = el('div', { class: 'dc-embed' });
    embed.style.setProperty('--dc-accent', accent);

    const main = el('div', { class: 'dc-embed-main' });
    if (conf.design.author) main.append(el('div', { class: 'dc-author', text: conf.design.author }));
    if (conf.design.title) main.append(el('div', { class: 'dc-title', text: conf.design.title }));
    main.append(el('div', { class: 'dc-desc', html: formatText(sampleGreeting(kind, conf.text)) }));

    if (validImage(conf.design.image)) {
      const img = new Image();
      img.className = 'dc-image';
      img.alt = '';
      img.src = conf.design.image;
      img.addEventListener('error', () => img.remove(), { once: true });
      main.append(img);
    }

    embed.append(main);

    if (validImage(conf.design.thumbnail)) {
      const thumb = new Image();
      thumb.className = 'dc-thumb';
      thumb.alt = '';
      thumb.src = conf.design.thumbnail;
      thumb.addEventListener('error', () => thumb.remove(), { once: true });
      embed.append(thumb);
    }

    if (conf.design.footer || conf.design.timestamp) {
      const footer = el('div', { class: 'dc-footer' });
      if (validImage(conf.design.footerIcon)) {
        const icon = new Image();
        icon.className = 'dc-footer-icon';
        icon.alt = '';
        icon.src = conf.design.footerIcon;
        icon.addEventListener('error', () => icon.remove(), { once: true });
        footer.append(icon);
      }
      if (conf.design.footer) footer.append(el('span', { text: conf.design.footer }));
      if (conf.design.timestamp) footer.append(el('span', { text: (conf.design.footer ? ' • ' : '') + 'Today at 12:00' }));
      embed.append(footer);
    }

    content.append(embed);
    return message;
  }

  function validImage(url) {
    return typeof url === 'string' && /^https?:\/\/\S+$/i.test(url.trim());
  }

  function announcementPreview() {
    const f = state.forms.announcements ? state.forms.announcements.composer : null;
    const message = messageShell();
    const content = message.querySelector('.dc-content');

    if (!f) return message;

    if (f.text.value.trim()) content.append(el('div', { class: 'dc-plain', html: formatText(f.text.value) }));

    const title = f.embedTitle.value.trim();
    const color = f.embedColor.value.trim();
    const image = f.embedImage.value.trim();
    const footer = f.embedFooter.value.trim();

    if (title || color || image || footer) {
      const embed = el('div', { class: 'dc-embed' });
      embed.style.setProperty('--dc-accent', /^#[0-9a-f]{6}$/i.test(color) ? color : '#4f545c');
      const main = el('div', { class: 'dc-embed-main' });
      if (title) main.append(el('div', { class: 'dc-title', text: title }));
      if (validImage(image)) {
        const img = new Image();
        img.className = 'dc-image';
        img.alt = '';
        img.src = image;
        img.addEventListener('error', () => img.remove(), { once: true });
        main.append(img);
      }
      embed.append(main);
      if (footer) embed.append(el('div', { class: 'dc-footer' }, el('span', { text: footer })));
      content.append(embed);
    }

    if (!content.querySelector('.dc-plain') && !content.querySelector('.dc-embed')) {
      content.append(el('div', { class: 'dc-empty', text: 'Your announcement preview appears here.' }));
    }

    return message;
  }

  function verificationPreview() {
    const f = state.forms.verification;
    const conf = state.data.config.verification;
    const message = messageShell();
    const content = message.querySelector('.dc-content');

    const label = f.label.value.trim() || 'Verify me';
    const template = f.text.value.trim() || DEFAULT_PANEL;
    const text = template
      .replace(/\{server\}/gi, state.guild.name)
      .replace(/\{role\}/gi, conf.roleId ? roleName(conf.roleId) : 'Verified')
      .replace(/\{channel\}/gi, conf.channelId ? channelName(conf.channelId) : '#verify')
      .replace(/\{button\}/gi, label);

    const embed = el('div', { class: 'dc-embed' });
    embed.style.setProperty('--dc-accent', '#8b5cf6');
    const main = el('div', { class: 'dc-embed-main' });
    main.append(el('div', { class: 'dc-title', text: '🔐 Member verification' }));
    main.append(el('div', { class: 'dc-desc', html: formatText(text) }));
    embed.append(main);
    embed.append(el('div', { class: 'dc-footer' }, el('span', { text: 'Kernel verification gate' })));
    content.append(embed);

    content.append(el('div', { class: 'dc-buttons' },
      el('span', { class: 'dc-button', text: '✅ ' + label }),
    ));

    return message;
  }

  function logsPreview() {
    const f = state.forms.logs;
    const rows = [
      ['Moderation cases', f.logChannel.value ? channelName(f.logChannel.value) : 'off'],
      ['Message edits and deletes', f.messageLog.checked ? (f.logChannel.value ? channelName(f.logChannel.value) : 'log channel') : 'off'],
      ['Join and leave detail', f.joins.checked ? (f.logChannel.value ? channelName(f.logChannel.value) : 'log channel') : 'off'],
      ['Anti-nuke alerts', f.antiNuke.value ? channelName(f.antiNuke.value) : f.logChannel.value ? 'log channel' : 'off'],
      ['Token guard alerts', f.tokenGuard.value ? channelName(f.tokenGuard.value) : f.logChannel.value ? 'log channel' : 'off'],
      ['Link filter alerts', f.antiLink.value ? channelName(f.antiLink.value) : f.logChannel.value ? 'log channel' : 'off'],
    ];

    return el('div', { class: 'mg-preview-card' },
      el('h4', { text: 'Where Kernel reports' }),
      el('ul', { class: 'mg-preview-list' },
        rows.map(([label, value]) => el('li', null,
          el('span', { text: label }),
          el('b', { class: value === 'off' ? 'is-off' : '', text: value }),
        )),
      ),
      el('p', { class: 'mg-preview-note', text: 'Security alerts use the main log channel unless you choose another.' }),
    );
  }

  function renderPreview() {
    if (!state.data || !ui.preview) return;
    const tab = state.tab;
    let node = null;

    if (tab === 'welcome' || tab === 'goodbye') node = greetingPreview(tab);
    else if (tab === 'announcements') node = announcementPreview();
    else if (tab === 'logs') node = logsPreview();
    else if (tab === 'verification') node = verificationPreview();

    ui.preview.replaceChildren();
    if (node) ui.preview.append(node);
  }

  /* ------------------------------------------------------------------ tabs */

  function switchTab(tab) {
    state.tab = tab;
    ui.tabs.forEach((button) => {
      button.setAttribute('aria-selected', String(button.dataset.mgTab === tab));
    });
    ui.panels.querySelectorAll('.mg-panel').forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tab;
    });
    renderPreview();
  }

  /* ------------------------------------------------------------------ init */

  function init() {
    if (!ui.app) return;

    ui.tabs.forEach((button) => {
      button.id = 'tab-' + button.dataset.mgTab;
      button.addEventListener('click', () => switchTab(button.dataset.mgTab));
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        const index = ui.tabs.indexOf(button);
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const next = ui.tabs[(index + step + ui.tabs.length) % ui.tabs.length];
        next.focus();
        switchTab(next.dataset.mgTab);
      });
    });

    if (ui.login) {
      ui.login.addEventListener('click', (event) => {
        event.preventDefault();
        try { window.sessionStorage.setItem(NEXT_KEY, window.location.href); } catch (error) { /* ignore */ }
        window.location.href = auth.loginUrl();
      });
    }

    if (ui.retry) ui.retry.addEventListener('click', bootstrap);

    if (ui.picker) {
      ui.picker.addEventListener('change', () => {
        if (state.dirty && !window.confirm('Discard unsaved changes?')) {
          ui.picker.value = state.guildId;
          return;
        }
        window.location.href = 'manage.html?guild=' + encodeURIComponent(ui.picker.value);
      });
    }

    if (ui.connectForm) {
      ui.connectForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const input = ui.connectForm.querySelector('input[name="api"]');
        const base = normalizeBase(input.value);
        if (!base) {
          ui.connectError.textContent = 'Use a full http:// or https:// address, for example https://kernel-api.example.com.';
          ui.connectError.hidden = false;
          return;
        }

        ui.connectError.hidden = true;
        try {
          const response = await fetch(base + '/api/health', {
            cache: 'no-store',
            headers: { 'ngrok-skip-browser-warning': '1' },
          });
          const data = await response.json().catch(() => null);
          if (!response.ok || !data || !data.ok) throw new Error('bad answer');
          try { window.localStorage.setItem(API_STORE, base); } catch (error) { /* ignore */ }
          bootstrap();
        } catch (error) {
          ui.connectError.textContent = 'Kernel did not answer at that address. Check the panel URL and that the site uses https if this page is https.';
          ui.connectError.hidden = false;
        }
      });
    }

    window.addEventListener('beforeunload', (event) => {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    });

    bootstrap();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
