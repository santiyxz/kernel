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
    jobs: document.querySelector('[data-ad-jobs]'),
    jobsCount: document.querySelector('[data-ad-jobs-count]'),
    gaps: document.querySelector('[data-ad-gaps]'),
    gapsCount: document.querySelector('[data-ad-gaps-count]'),
    gapsNote: document.querySelector('[data-ad-gaps-note]'),
    joinsGuild: document.querySelector('[data-ad-joins-guild]'),
    joins: document.querySelector('[data-ad-joins]'),
    joinsNote: document.querySelector('[data-ad-joins-note]'),
    joinsRefresh: document.querySelector('[data-ad-joins-refresh]'),
    presenceForm: document.querySelector('[data-ad-presence-form]'),
    presenceLines: document.querySelector('[data-ad-presence-lines]'),
    presenceRotate: document.querySelector('[data-ad-presence-rotate]'),
    presenceSeconds: document.querySelector('[data-ad-presence-seconds]'),
    presenceNow: document.querySelector('[data-ad-presence-now]'),
    presenceSource: document.querySelector('[data-ad-presence-source]'),
    presenceStatus: document.querySelector('[data-ad-presence-status]'),
    presenceReset: document.querySelector('[data-ad-presence-reset]'),
    testForm: document.querySelector('[data-ad-test-form]'),
    testGuild: document.querySelector('[data-ad-test-guild]'),
    testText: document.querySelector('[data-ad-test-text]'),
    testStatus: document.querySelector('[data-ad-test-status]'),
    testOut: document.querySelector('[data-ad-test-out]'),
    adminState: document.querySelector('[data-ad-admin-state]'),
    adminGuild: document.querySelector('[data-ad-admin-guild]'),
    adminSave: document.querySelector('[data-ad-admin-save]'),
    adminStatus: document.querySelector('[data-ad-admin-status]'),
    routes: document.querySelector('[data-ad-routes]'),
    boardNote: document.querySelector('[data-ad-board-note]'),
    boardRefresh: document.querySelector('[data-ad-board-refresh]'),
    switchGuild: document.querySelector('[data-ad-switch-guild]'),
    switchList: document.querySelector('[data-ad-switch-list]'),
    switchStatus: document.querySelector('[data-ad-switch-status]'),
    blockConfirm: document.querySelector('[data-ad-block-confirm]'),
    block: document.querySelector('[data-ad-block]'),
    resyncGuild: document.querySelector('[data-ad-resync-guild]'),
    resyncStatus: document.querySelector('[data-ad-resync-status]'),
    resyncOut: document.querySelector('[data-ad-resync-out]'),
    resyncButtons: Array.from(document.querySelectorAll('[data-ad-resync]')),
    settingsGuild: document.querySelector('[data-ad-settings-guild]'),
    settingsField: document.querySelector('[data-ad-settings-field]'),
    settingsValueSlot: document.querySelector('[data-ad-settings-value-slot]'),
    settingsHint: document.querySelector('[data-ad-settings-hint]'),
    settingsStatus: document.querySelector('[data-ad-settings-status]'),
    settingsSave: document.querySelector('[data-ad-settings-save]'),
    audit: document.querySelector('[data-ad-audit]'),
    auditCount: document.querySelector('[data-ad-audit-count]'),
    auditRefresh: document.querySelector('[data-ad-audit-refresh]'),
    broadcastForm: document.querySelector('[data-ad-broadcast-form]'),
    broadcastTitle: document.querySelector('[data-ad-broadcast-title-input]'),
    broadcastDesc: document.querySelector('[data-ad-broadcast-desc]'),
    broadcastColor: document.querySelector('[data-ad-broadcast-color]'),
    broadcastFooter: document.querySelector('[data-ad-broadcast-footer]'),
    broadcastConfirm: document.querySelector('[data-ad-broadcast-confirm]'),
    broadcastStatus: document.querySelector('[data-ad-broadcast-status]'),
    broadcastGuilds: document.querySelector('[data-ad-broadcast-guilds]'),
    broadcastOut: document.querySelector('[data-ad-broadcast-out]'),
    embedTitle: document.querySelector('[data-ad-embed-title]'),
    embedDesc: document.querySelector('[data-ad-embed-desc]'),
    embedFooter: document.querySelector('[data-ad-embed-footer]'),
    backups: document.querySelector('[data-ad-backups]'),
    backupsCount: document.querySelector('[data-ad-backups-count]'),
    backupNow: document.querySelector('[data-ad-backup-now]'),
    backupStatus: document.querySelector('[data-ad-backup-status]'),
    restoreConfirm: document.querySelector('[data-ad-restore-confirm]'),
    diag: document.querySelector('[data-ad-diag]'),
    diagRun: document.querySelector('[data-ad-diag-run]'),
    diagStatus: document.querySelector('[data-ad-diag-status]'),
    errors: document.querySelector('[data-ad-errors]'),
    errorsCount: document.querySelector('[data-ad-errors-count]'),
    errorsClear: document.querySelector('[data-ad-errors-clear]'),
    errorsStatus: document.querySelector('[data-ad-errors-status]'),
    doctor: document.querySelector('[data-ad-doctor]'),
    doctorRun: document.querySelector('[data-ad-doctor-run]'),
    doctorStatus: document.querySelector('[data-ad-doctor-status]'),
    scorecard: document.querySelector('[data-ad-scorecard]'),
    scoreAverage: document.querySelector('[data-ad-score-average]'),
    scoreRun: document.querySelector('[data-ad-score-run]'),
    scoreStatus: document.querySelector('[data-ad-score-status]'),
    digestGuild: document.querySelector('[data-ad-digest-guild]'),
    digest: document.querySelector('[data-ad-digest]'),
    digestStatus: document.querySelector('[data-ad-digest-status]'),
    ecoGuild: document.querySelector('[data-ad-eco-guild]'),
    ecoCount: document.querySelector('[data-ad-eco-count]'),
    ecoRows: document.querySelector('[data-ad-eco-rows]'),
    ecoUser: document.querySelector('[data-ad-eco-user]'),
    ecoAction: document.querySelector('[data-ad-eco-action]'),
    ecoAmount: document.querySelector('[data-ad-eco-amount]'),
    ecoReason: document.querySelector('[data-ad-eco-reason]'),
    ecoConfirm: document.querySelector('[data-ad-eco-confirm]'),
    ecoApply: document.querySelector('[data-ad-eco-apply]'),
    ecoStatus: document.querySelector('[data-ad-eco-status]'),
    layoutGuild: document.querySelector('[data-ad-layout-guild]'),
    layoutCount: document.querySelector('[data-ad-layout-count]'),
    layout: document.querySelector('[data-ad-layout]'),
    layoutSave: document.querySelector('[data-ad-layout-save]'),
    layoutRestore: document.querySelector('[data-ad-layout-restore]'),
    layoutConfirm: document.querySelector('[data-ad-layout-confirm]'),
    layoutStatus: document.querySelector('[data-ad-layout-status]'),
    rehearse: document.querySelector('[data-ad-rehearse]'),
    rehearsal: document.querySelector('[data-ad-rehearsal]'),
    schedCount: document.querySelector('[data-ad-sched-count]'),
    schedList: document.querySelector('[data-ad-sched-list]'),
    schedRefresh: document.querySelector('[data-ad-sched-refresh]'),
    schedAt: document.querySelector('[data-ad-sched-at]'),
    schedTitle: document.querySelector('[data-ad-sched-title-input]'),
    schedDesc: document.querySelector('[data-ad-sched-desc]'),
    schedFooter: document.querySelector('[data-ad-sched-footer]'),
    schedNote: document.querySelector('[data-ad-sched-note]'),
    schedConfirm: document.querySelector('[data-ad-sched-confirm]'),
    schedAdd: document.querySelector('[data-ad-sched-add]'),
    schedGuilds: document.querySelector('[data-ad-sched-guilds]'),
    schedStatus: document.querySelector('[data-ad-sched-status]'),
    watchCount: document.querySelector('[data-ad-watch-count]'),
    watchList: document.querySelector('[data-ad-watch-list]'),
    watchHits: document.querySelector('[data-ad-watch-hits]'),
    watchUser: document.querySelector('[data-ad-watch-user]'),
    watchReason: document.querySelector('[data-ad-watch-reason]'),
    watchAction: document.querySelector('[data-ad-watch-action]'),
    watchScope: document.querySelector('[data-ad-watch-scope]'),
    watchGuild: document.querySelector('[data-ad-watch-guild]'),
    watchConfirm: document.querySelector('[data-ad-watch-confirm]'),
    watchAdd: document.querySelector('[data-ad-watch-add]'),
    watchStatus: document.querySelector('[data-ad-watch-status]'),
    buildCount: document.querySelector('[data-ad-build-count]'),
    builds: document.querySelector('[data-ad-builds]'),
    buildSave: document.querySelector('[data-ad-build-save]'),
    buildConfirm: document.querySelector('[data-ad-build-confirm]'),
    buildStatus: document.querySelector('[data-ad-build-status]'),
    inboxCount: document.querySelector('[data-ad-inbox-count]'),
    inboxList: document.querySelector('[data-ad-inbox-list]'),
    inboxRefresh: document.querySelector('[data-ad-inbox-refresh]'),
    inboxStatus: document.querySelector('[data-ad-inbox-status]'),
    usageCount: document.querySelector('[data-ad-usage-count]'),
    growth: document.querySelector('[data-ad-growth]'),
    usageRows: document.querySelector('[data-ad-usage]'),
    unusedRows: document.querySelector('[data-ad-unused]'),
    usageRefresh: document.querySelector('[data-ad-usage-refresh]'),
    usageStatus: document.querySelector('[data-ad-usage-status]'),
    adoptCount: document.querySelector('[data-ad-adopt-count]'),
    adoption: document.querySelector('[data-ad-adoption]'),
    adoptRefresh: document.querySelector('[data-ad-adopt-refresh]'),
    adoptStatus: document.querySelector('[data-ad-adopt-status]'),
  };

  const state = {
    base: '',
    session: null,
    overview: null,
    logs: [],
    filter: 'all',
    timer: 0,
    presenceTouched: false,
    adminGuildTouched: false,
    control: null,
    settings: null,
    settingsGuildTouched: false,
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

  function get(path) {
    return request('GET', path);
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

  function populateToolSelects() {
    const guilds = state.overview && Array.isArray(state.overview.guilds) ? state.overview.guilds : [];
    fillGuildSelect(ui.joinsGuild, guilds);
    fillGuildSelect(ui.testGuild, guilds);
    fillGuildSelect(ui.resyncGuild, guilds);
    fillGuildSelect(ui.settingsGuild, guilds);
    fillGuildSelect(ui.digestGuild, guilds);
    fillGuildSelect(ui.ecoGuild, guilds);
    fillGuildSelect(ui.layoutGuild, guilds);
    fillGuildSelect(ui.watchGuild, guilds);
    if (ui.watchGuild && ui.watchScope && ui.watchScope.value !== 'one') ui.watchGuild.disabled = true;
    renderBroadcastGuilds();
    renderSchedGuilds();
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

  function relativeTime(ms) {
    const diff = Number(ms) - Date.now();
    const abs = Math.abs(diff);
    let text;
    if (abs < 60000) text = Math.max(1, Math.round(abs / 1000)) + 's';
    else if (abs < 3600000) text = Math.round(abs / 60000) + 'm';
    else if (abs < 86400000) {
      const hours = Math.floor(abs / 3600000);
      const minutes = Math.round(abs / 60000) % 60;
      text = hours + 'h' + (minutes ? ' ' + minutes + 'm' : '');
    } else {
      const days = Math.floor(abs / 86400000);
      const hours = Math.floor(abs / 3600000) % 24;
      text = days + 'd' + (hours ? ' ' + hours + 'h' : '');
    }
    return diff >= 0 ? 'in ' + text : text + ' ago';
  }

  function stateTag(on) {
    return el('span', { className: 'ad-tag ' + (on ? 'is-on' : 'is-off'), text: on ? 'on' : 'off' });
  }

  function fillGuildSelect(select, guilds) {
    if (!select) return;
    const previous = select.value;
    if (!guilds.length) {
      select.replaceChildren(el('option', { value: '', text: 'Kernel is not in any server' }));
      select.disabled = true;
      return;
    }
    select.disabled = false;
    select.replaceChildren(...guilds.map((guild) => el('option', {
      value: guild.id,
      text: guild.name + ' · ' + numberFormat.format(guild.memberCount || 0),
    })));
    if (guilds.some((guild) => guild.id === previous)) select.value = previous;
  }

  function renderJobs(data) {
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    ui.jobsCount.textContent = jobs.length ? numberFormat.format(jobs.length) + ' queued' : 'none';

    if (!jobs.length) {
      ui.jobs.replaceChildren(el('p', { className: 'ad-empty', text: 'Nothing is scheduled right now.' }));
      return;
    }

    const now = Number(data.now) || Date.now();
    ui.jobs.replaceChildren(
      ...jobs.map((job) => {
        const overdue = job.at <= now;
        const cancel = el('button', { className: 'btn btn-dark btn-sm', type: 'button', text: 'Cancel' });
        cancel.addEventListener('click', () => cancelJob(job));
        const meta = [
          job.guildName,
          relativeTime(job.at),
          overdue ? 'overdue' : null,
          job.installed ? null : 'bot not in server',
          job.payloadKeys && job.payloadKeys.length ? job.payloadKeys.join(', ') : null,
        ].filter(Boolean).join(' · ');

        return el(
          'div',
          { className: 'ad-job' + (overdue ? ' is-overdue' : '') },
          el('div', { className: 'ad-row-main' },
            el('div', { className: 'ad-job-kind', text: job.kind }),
            el('div', { className: 'ad-row-meta', text: meta })),
          el('div', { className: 'ad-row-side' }, cancel),
        );
      }),
    );
  }

  function renderCoverage(data) {
    const missing = Array.isArray(data.missing) ? data.missing : [];
    ui.gapsCount.textContent = missing.length ? missing.length + ' missing' : 'all covered';
    ui.gapsNote.textContent = numberFormat.format(data.installed || 0) + ' of '
      + numberFormat.format(data.managed || 0) + ' servers you can manage run Kernel.';

    if (!missing.length) {
      ui.gaps.replaceChildren(el('p', { className: 'ad-empty', text: 'Every server you manage already has Kernel.' }));
      return;
    }

    ui.gaps.replaceChildren(
      ...missing.map((guild) => el(
        'div',
        { className: 'ad-row' },
        el('div', { className: 'ad-row-main' },
          el('div', { className: 'ad-row-name', text: guild.name }),
          el('div', { className: 'ad-row-meta', text: (guild.owner ? 'you own it · ' : '') + guild.id })),
        el('div', { className: 'ad-row-side' },
          el('a', {
            className: 'btn btn-light btn-sm',
            href: data.invite || 'index.html#support',
            target: data.invite ? '_blank' : null,
            rel: data.invite ? 'noopener' : null,
          }, 'Invite')),
      )),
    );
  }

  function renderJoins(data) {
    const rows = Array.isArray(data.rows) ? data.rows : [];
    ui.joinsNote.textContent = data.partial
      ? 'Showing ' + numberFormat.format(data.cached) + ' of ' + numberFormat.format(data.memberCount)
        + ' members — Kernel only lists members it has seen since its last start.'
      : numberFormat.format(data.cached) + ' members cached.';

    if (!rows.length) {
      ui.joins.replaceChildren(el('p', { className: 'ad-empty', text: 'No members cached for this server yet.' }));
      return;
    }

    ui.joins.replaceChildren(
      ...rows.map((member) => {
        const icon = el('span', { className: 'ad-row-icon' });
        if (member.avatar) icon.append(el('img', { src: member.avatar, alt: '' }));
        else icon.textContent = initials(member.display);

        const young = member.accountDays !== null && member.accountDays < 7;
        const meta = [
          '@' + member.name,
          member.joinedAt ? 'joined ' + relativeTime(member.joinedAt) : null,
          member.accountDays === null ? null : 'account ' + member.accountDays + 'd old',
          member.roles === null ? null : member.roles === 1 ? '1 role' : member.roles + ' roles',
          member.verified === null ? null : member.verified ? 'verified' : 'not verified',
        ].filter(Boolean).join(' · ');

        const tags = el('div', { className: 'ad-badges' });
        if (member.bot) tags.append(el('span', { className: 'dash-badge', text: 'bot' }));
        if (young) tags.append(el('span', { className: 'dash-badge is-warn', text: 'new account' }));

        return el(
          'div',
          { className: 'ad-row' },
          icon,
          el('div', { className: 'ad-row-main' },
            el('div', { className: 'ad-row-name', text: member.display }),
            el('div', { className: 'ad-row-meta', text: meta }),
            tags),
        );
      }),
    );
  }

  function renderPresence(data) {
    if (!data) return;
    ui.presenceSource.textContent = data.source === 'panel' ? 'edited here' : 'from environment';
    const stateText = [
      'Now showing: ' + data.current.name,
      data.rotating ? 'rotation every ' + Math.round(data.everyMs / 1000) + 's' : 'rotation off',
      data.rotating && !data.active ? 'not ticking' : null,
    ].filter(Boolean).join(' · ');
    ui.presenceNow.textContent = stateText;

    if (state.presenceTouched) return;
    ui.presenceLines.value = (Array.isArray(data.editable) ? data.editable : []).join('\n');
    ui.presenceRotate.checked = Boolean(data.rotating);
    ui.presenceSeconds.value = Math.max(5, Math.round(Number(data.everyMs || 20000) / 1000));
  }

  function channelName(data, id) {
    const found = (data.channels || []).find((channel) => channel.id === id);
    return found ? '#' + found.name : null;
  }

  function renderAdmin(data) {
    if (ui.adminState) {
      ui.adminState.textContent = data.guildId
        ? (data.guildName || data.guildId)
        : (data.source === 'ADMIN_GUILD_ID' ? 'set in environment' : 'not set');
    }

    if (ui.adminGuild) {
      fillGuildSelect(ui.adminGuild, state.overview ? state.overview.guilds : []);
      if (!state.adminGuildTouched && data.guildId) ui.adminGuild.value = data.guildId;
    }

    if (ui.routes) {
      const channels = Array.isArray(data.channels) ? data.channels : [];
      const kinds = Array.isArray(data.kinds) ? data.kinds : [];

      if (!data.guildId) {
        ui.routes.replaceChildren(el('p', {
          className: 'ad-empty',
          text: 'Pick the administration server above and press “Use this server” first.',
        }));
      } else if (!data.guildAvailable) {
        ui.routes.replaceChildren(el('p', {
          className: 'ad-empty',
          text: 'Kernel is no longer in that server. Pick another one.',
        }));
      } else if (!channels.length) {
        ui.routes.replaceChildren(el('p', {
          className: 'ad-empty',
          text: 'That server has no text channels Kernel can see.',
        }));
      } else {
        ui.routes.replaceChildren(...kinds.map((kind) => {
          const select = el('select', { 'aria-label': kind.label + ' channel' });
          select.append(el('option', { value: '', text: '— console only —' }));
          channels.forEach((channel) => select.append(el('option', { value: channel.id, text: '#' + channel.name })));
          if (kind.channelId && !channels.some((channel) => channel.id === kind.channelId)) {
            select.append(el('option', { value: kind.channelId, text: 'missing channel ' + kind.channelId }));
          }
          select.value = kind.channelId || '';
          select.addEventListener('change', () => saveRoute(kind, select.value));

          const test = el('button', { className: 'btn btn-dark btn-sm', type: 'button', text: 'Test' });
          test.disabled = !kind.channelId;
          test.addEventListener('click', () => testRoute(kind));

          return el(
            'div',
            { className: 'ad-route' },
            el('div', { className: 'ad-route-main' },
              el('div', { className: 'ad-route-name' }, kind.label),
              el('div', { className: 'ad-row-meta', text: kind.hint })),
            el('div', { className: 'ad-route-side' }, select, test),
          );
        }));
      }
    }

    if (ui.boardNote) {
      const status = (data.kinds || []).find((kind) => kind.key === 'status');
      const where = status && status.channelId ? channelName(data, status.channelId) : null;
      const when = data.board && data.board.at ? ' Last updated ' + relativeTime(data.board.at) + '.' : '';
      ui.boardNote.textContent = data.board && data.board.messageId
        ? 'Board message is live in ' + (where || 'the status channel') + '.' + when
        : 'Choose a channel for “Status board”, then post it once. Kernel keeps editing that one message every minute.';
    }
  }

  async function saveRoute(kind, channelId) {
    ui.adminStatus.className = 'ad-status';
    ui.adminStatus.textContent = 'Saving…';
    try {
      const data = await request('PUT', '/api/owner/admin', { channels: { [kind.key]: channelId } });
      renderAdmin(data);
      ui.adminStatus.className = 'ad-status is-ok';
      ui.adminStatus.textContent = channelId
        ? kind.label + ' now posts to a channel.'
        : kind.label + ' is console-only.';
    } catch (error) {
      ui.adminStatus.className = 'ad-status is-bad';
      ui.adminStatus.textContent = error.message;
    }
  }

  async function testRoute(kind) {
    ui.adminStatus.className = 'ad-status';
    ui.adminStatus.textContent = 'Sending a test to ' + kind.label + '…';
    try {
      const data = await request('POST', '/api/owner/admin/test?kind=' + encodeURIComponent(kind.key));
      ui.adminStatus.className = 'ad-status is-ok';
      ui.adminStatus.textContent = data.message || 'Test post delivered.';
    } catch (error) {
      ui.adminStatus.className = 'ad-status is-bad';
      ui.adminStatus.textContent = error.message;
    }
  }

  function renderTest(data) {
    const blocks = [];
    const output = (title, on) => {
      const block = el('div', { className: 'ad-test-block' });
      block.append(el('h4', null, title, stateTag(on)));
      return block;
    };

    const responders = data.responders || {};
    const ar = output('Autoresponder', responders.enabled);
    if (!responders.enabled) ar.append(el('p', { text: 'Off in this server, so nothing would reply.' }));
    else if (responders.excluded) ar.append(el('p', { text: 'This channel is excluded from autoresponders.' }));
    else if (responders.matched) {
      ar.append(el('p', { text: 'First matching rule: “' + responders.matched.trigger + '” (' + responders.matched.mode + ')' + (responders.matched.dm ? ' · also DMs the author' : '') }));
      ar.append(el('p', { className: 'ad-quote', text: responders.matched.reply }));
      const others = (responders.candidates || []).filter((rule) => rule.shadowed);
      if (others.length) {
        ar.append(el('p', { text: 'Never reached, because the first rule already matches: ' + others.map((rule) => '“' + rule.trigger + '”').join(', ') }));
      }
    } else {
      ar.append(el('p', { text: 'No rule matches this message, so nothing would reply.' }));
    }
    const stale = responders.stale || [];
    if (stale.length) {
      ar.append(el('p', { text: 'Rules with no hits in 30+ days: ' + stale.map((rule) => '“' + rule.trigger + '”').join(', ') }));
    }
    if (responders.total) ar.append(el('p', { className: 'ad-row-meta', text: responders.total + ' rule(s) configured.' }));
    blocks.push(ar);

    const link = data.antiLink || {};
    const guard = output('Invite guard', link.enabled);
    if (!link.enabled) guard.append(el('p', { text: 'Off in this server.' }));
    else if (link.excluded) guard.append(el('p', { text: 'This channel is excluded from the invite guard.' }));
    else {
      const found = (link.invites || []).map((row) => row.hit + (row.allowed ? ' — allowed' : ' — blocked'));
      if (found.length) guard.append(el('ul', null, ...found.map((row) => el('li', { text: row }))));
      if ((link.urls || []).length) guard.append(el('p', { text: 'Links found: ' + link.urls.join(', ') }));
      if (!found.length && !(link.urls || []).length) guard.append(el('p', { text: 'Nothing in this message would be caught.' }));
      guard.append(el('p', { text: link.wouldAct ? 'Kernel would ' + link.action + ' this message.' : 'Kernel would leave this message alone.' }));
    }
    blocks.push(guard);

    const embed = data.autoEmbed || {};
    const cards = output('Link cards', embed.enabled);
    if (!embed.enabled) cards.append(el('p', { text: 'Off in this server.' }));
    else if (!embed.url) cards.append(el('p', { text: 'Only a message that is just one link gets a card; this message would not.' }));
    else if (embed.service) cards.append(el('p', { text: 'Would build a ' + embed.service + ' card for ' + embed.host + '.' }));
    else cards.append(el('p', { text: 'That host is not turned on (' + embed.host + '), so no card.' }));
    blocks.push(cards);

    ui.testOut.replaceChildren(...blocks);
  }

  /* ---------------------------------------------------------------- control */

  function setStatus(node, text, kind) {
    if (!node) return;
    node.className = 'ad-status' + (kind ? ' is-' + kind : '');
    node.textContent = text;
  }

  function actionLabel(action) {
    return {
      broadcast: 'Broadcast',
      'settings.set': 'Setting changed',
      'feature.switch': 'Feature switch',
      'guild.block': 'Server blocked',
      'guild.unblock': 'Server unblocked',
      'commands.resync': 'Command resync',
      'backup.create': 'Backup taken',
      'backup.restore': 'Backup restored',
      'errors.clear': 'Error inbox cleared',
      'economy.adjust': 'Balance changed',
      'layout.save': 'Restore point saved',
      'layout.restore': 'Layout rebuilt',
      'broadcasts.schedule': 'Broadcast scheduled',
      'broadcasts.cancel': 'Scheduled post cancelled',
      'broadcasts.skip': 'Scheduled post skipped',
      'broadcast.scheduled': 'Scheduled broadcast sent',
      'builds.save': 'Build saved',
      'builds.restore': 'Build restored',
      'builds.delete': 'Build deleted',
    }[action] || action;
  }

  function controlGuild() {
    const guilds = state.control && Array.isArray(state.control.guilds) ? state.control.guilds : [];
    return guilds.find((row) => row.guildId === ui.switchGuild.value) || guilds[0] || null;
  }

  function renderControl(data) {
    state.control = data;
    const guilds = (data && Array.isArray(data.guilds) ? data.guilds : []).filter((row) => row.installed);
    if (ui.switchGuild) {
      const previous = ui.switchGuild.value;
      ui.switchGuild.replaceChildren(...guilds.map((row) => el('option', { value: row.guildId, text: row.name })));
      if (guilds.some((row) => row.guildId === previous)) ui.switchGuild.value = previous;
      ui.switchGuild.disabled = !guilds.length;
    }

    const row = controlGuild();
    if (!ui.switchList) return;
    if (!row) {
      ui.switchList.replaceChildren(el('p', { className: 'ad-empty', text: 'Kernel is not in any server.' }));
      return;
    }

    const toggles = row.features.map((feature) => {
      const button = el('button', {
        className: 'ad-switch' + (feature.enabled ? ' is-on' : ''),
        type: 'button',
        'aria-pressed': String(feature.enabled),
      });
      button.append(
        el('span', { className: 'ad-switch-name', text: feature.label }),
        el('span', { className: 'ad-switch-state', text: feature.enabled ? 'on' : 'off' }),
      );
      button.addEventListener('click', () => switchFeature(row.guildId, feature));
      return button;
    });
    if (row.blocked) toggles.unshift(el('p', { className: 'ad-tool-note', text: 'This server is blocked: commands and events are ignored until you unblock it.' }));
    ui.switchList.replaceChildren(...toggles);

    if (ui.block) {
      ui.block.textContent = row.blocked ? 'Unblock server' : 'Block server';
      ui.block.className = 'btn btn-sm ' + (row.blocked ? 'btn-light' : 'btn-danger');
    }
    if (ui.blockConfirm) ui.blockConfirm.placeholder = row.blocked ? 'Type UNBLOCK to confirm' : 'Type BLOCK to confirm';
  }

  async function switchFeature(guildId, feature) {
    setStatus(ui.switchStatus, 'Saving…');
    try {
      const data = await request('PUT', '/api/owner/control', { guildId, feature: feature.key, enabled: !feature.enabled });
      renderControl(data);
      loadAudit();
      setStatus(ui.switchStatus, feature.label + ' is ' + (feature.enabled ? 'off' : 'on') + ' now.', 'ok');
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.switchStatus, error.message, 'bad');
    }
  }

  async function toggleBlock() {
    const row = controlGuild();
    if (!row) return;
    const word = row.blocked ? 'UNBLOCK' : 'BLOCK';
    if (String(ui.blockConfirm.value || '').trim().toUpperCase() !== word) {
      setStatus(ui.switchStatus, 'Type ' + word + ' in the box first.', 'bad');
      return;
    }
    setStatus(ui.switchStatus, row.blocked ? 'Unblocking…' : 'Blocking…');
    try {
      const data = await request('PUT', '/api/owner/control', { guildId: row.guildId, blocked: !row.blocked });
      ui.blockConfirm.value = '';
      renderControl(data);
      loadAudit();
      setStatus(ui.switchStatus, row.blocked ? 'Server unblocked.' : 'Server blocked. Kernel will ignore it.', 'ok');
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.switchStatus, error.message, 'bad');
    }
  }

  function renderAudit(data) {
    const entries = Array.isArray(data.entries) ? data.entries : [];
    if (ui.auditCount) ui.auditCount.textContent = entries.length ? entries.length + ' recent' : 'none';
    if (!entries.length) {
      ui.audit.replaceChildren(el('p', { className: 'ad-empty', text: 'No owner actions recorded yet.' }));
      return;
    }
    ui.audit.replaceChildren(...entries.slice(0, 40).map((entry) => {
      const bits = [];
      if (entry.guild) bits.push(entry.guild);
      if (entry.path) bits.push(entry.path);
      if (entry.guilds !== undefined && entry.sent !== undefined) bits.push(entry.sent + '/' + entry.guilds + ' delivered');
      if (entry.scope) bits.push(entry.scope);
      if (entry.to !== undefined && entry.to !== null && typeof entry.to !== 'object') bits.push('→ ' + String(entry.to).slice(0, 40));
      return el('div', { className: 'ad-audit-row' },
        el('div', null,
          el('strong', { text: actionLabel(entry.action) }),
          el('span', { className: 'ad-row-meta', text: bits.join(' · ') })),
        el('span', { className: 'ad-audit-time', text: relativeTime(entry.at) }));
    }));
  }

  async function loadControl() {
    try {
      renderControl(await get('/api/owner/control'));
    } catch (error) {
      if (error.session) throw error;
      if (ui.switchList) toolMissing(ui.switchList, 'The server switchboard');
    }
  }

  async function loadAudit() {
    try {
      renderAudit(await get('/api/owner/audit?limit=50'));
    } catch (error) {
      if (error.session) throw error;
      if (ui.audit) toolMissing(ui.audit, 'The audit trail');
    }
  }

  function settingsField() {
    const fields = state.settings && Array.isArray(state.settings.fields) ? state.settings.fields : [];
    return fields.find((field) => field.path === ui.settingsField.value) || null;
  }

  function settingsValue() {
    const control = ui.settingsValueSlot ? ui.settingsValueSlot.querySelector('select, input') : null;
    if (!control) return null;
    const field = settingsField();
    if (!field) return null;
    if (field.type === 'boolean') return control.value === 'true';
    if (field.type === 'number') return control.value === '' ? null : Number(control.value);
    if (field.type === 'channel' || field.type === 'role') return control.value || null;
    return control.value === '' ? null : control.value;
  }

  function renderSettingsValue() {
    const field = settingsField();
    if (!ui.settingsValueSlot) return;
    if (!field) {
      ui.settingsValueSlot.replaceChildren(el('p', { className: 'ad-empty', text: 'No editable settings.' }));
      return;
    }

    let control;
    if (field.type === 'boolean') {
      control = el('select');
      control.append(el('option', { value: 'true', text: 'on' }), el('option', { value: 'false', text: 'off' }));
      control.value = field.value ? 'true' : 'false';
    } else if (field.type === 'enum') {
      control = el('select');
      control.append(...(field.options || []).map((option) => el('option', { value: option, text: option })));
      control.value = field.value || (field.options || [])[0] || '';
    } else if (field.type === 'channel' || field.type === 'role') {
      control = el('select');
      control.append(el('option', { value: '', text: '— unset —' }));
      const types = field.channelTypes || [0, 5];
      const options = field.type === 'role'
        ? (state.settings.roles || [])
        : (state.settings.channels || []).filter((channel) => types.includes(Number(channel.type)));
      control.append(...options.map((option) => el('option', { value: option.id, text: (field.type === 'channel' ? '#' : '@') + option.name })));
      control.value = field.value || '';
    } else {
      control = el('input', { type: field.type === 'number' ? 'number' : 'text', spellcheck: 'false' });
      if (field.type === 'number') {
        if (field.min !== null && field.min !== undefined) control.min = String(field.min);
        if (field.max !== null && field.max !== undefined) control.max = String(field.max);
      }
      control.value = field.value === null || field.value === undefined ? '' : String(field.value);
    }
    control.dataset.adSettingsValue = '';
    ui.settingsValueSlot.replaceChildren(control);

    const hints = {
      boolean: 'On or off.',
      number: 'Whole number' + (field.min !== null && field.min !== undefined ? ' between ' + field.min : '') + (field.max !== null && field.max !== undefined ? ' and ' + field.max : '') + '.',
      enum: 'One of: ' + (field.options || []).join(', ') + '.',
      channel: 'Pick a channel from this server. Blank clears it.',
      role: 'Pick a role from this server. Blank clears it.',
      text: 'Free text. Blank clears it.',
    };
    if (ui.settingsHint) ui.settingsHint.textContent = hints[field.type] || '';
  }

  async function loadSettings() {
    const guildId = ui.settingsGuild ? ui.settingsGuild.value : '';
    if (!guildId) return;
    try {
      const data = await get('/api/owner/settings?guild=' + encodeURIComponent(guildId));
      state.settings = data;
      const previous = ui.settingsField.value;
      const fields = Array.isArray(data.fields) ? data.fields : [];
      const groups = [];
      fields.forEach((field) => {
        let group = groups.find((row) => row.name === field.group);
        if (!group) { group = { name: field.group, fields: [] }; groups.push(group); }
        group.fields.push(field);
      });
      ui.settingsField.replaceChildren(...groups.map((group) => {
        const holder = el('optgroup', { label: group.name });
        holder.append(...group.fields.map((field) => el('option', { value: field.path, text: field.label })));
        return holder;
      }));
      if (fields.some((field) => field.path === previous)) ui.settingsField.value = previous;
      else ui.settingsField.value = fields.length ? fields[0].path : '';
      renderSettingsValue();
    } catch (error) {
      if (error.session) throw error;
      if (ui.settingsValueSlot) toolMissing(ui.settingsValueSlot, 'The settings editor');
    }
  }

  async function saveSetting() {
    const field = settingsField();
    if (!field) return;
    setStatus(ui.settingsStatus, 'Saving…');
    try {
      const data = await request('PUT', '/api/owner/settings', {
        guildId: ui.settingsGuild.value,
        path: field.path,
        value: settingsValue(),
      });
      field.value = data.field.value;
      setStatus(ui.settingsStatus, field.label + ' saved.', 'ok');
      loadAudit();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.settingsStatus, error.message, 'bad');
    }
  }

  function renderBroadcastGuilds() {
    if (!ui.broadcastGuilds) return;
    const guilds = state.overview && Array.isArray(state.overview.guilds) ? state.overview.guilds : [];
    if (!guilds.length) {
      ui.broadcastGuilds.replaceChildren(el('p', { className: 'ad-empty', text: 'Kernel is not in any server.' }));
      return;
    }

    const all = el('label', { className: 'ad-check is-all' },
      el('input', { type: 'checkbox' }),
      el('span', { text: 'Select all ' + guilds.length + ' server(s)' }));
    all.querySelector('input').addEventListener('change', (event) => {
      ui.broadcastGuilds.querySelectorAll('input[data-ad-broadcast-guild]').forEach((box) => { box.checked = event.target.checked; });
    });

    const rows = guilds.map((guild) => el('label', { className: 'ad-check' },
      el('input', { type: 'checkbox', dataset: { adBroadcastGuild: guild.id } }),
      el('span', { text: guild.name + ' · ' + numberFormat.format(guild.memberCount || 0) })));
    ui.broadcastGuilds.replaceChildren(all, ...rows);
  }

  function updatePreview() {
    if (!ui.embedTitle) return;
    const title = String(ui.broadcastTitle.value || '').trim() || 'Untitled broadcast';
    const desc = String(ui.broadcastDesc.value || '').trim() || 'Your description appears here.';
    ui.embedTitle.textContent = title;
    ui.embedDesc.textContent = desc;
    ui.embedFooter.textContent = String(ui.broadcastFooter.value || '').trim() || 'Kernel owner console';
    const color = String(ui.broadcastColor.value || '').trim();
    if (ui.embedTitle.parentElement) {
      ui.embedTitle.parentElement.style.borderLeftColor = /^#[0-9a-f]{6}$/i.test(color) ? color : '#5865f2';
    }
  }

  async function sendBroadcast(event) {
    event.preventDefault();
    const boxes = Array.from(ui.broadcastGuilds.querySelectorAll('input[data-ad-broadcast-guild]'))
      .filter((box) => box.checked)
      .map((box) => box.dataset.adBroadcastGuild);
    if (!boxes.length) {
      setStatus(ui.broadcastStatus, 'Tick at least one server.', 'bad');
      return;
    }
    setStatus(ui.broadcastStatus, 'Sending…');
    try {
      const data = await request('POST', '/api/owner/broadcast', {
        guildIds: boxes,
        title: ui.broadcastTitle.value.trim(),
        description: ui.broadcastDesc.value.trim(),
        footer: ui.broadcastFooter.value.trim(),
        color: ui.broadcastColor.value.trim(),
        confirm: ui.broadcastConfirm.value.trim(),
      });
      setStatus(ui.broadcastStatus, data.sent + ' delivered, ' + data.failed + ' failed.', data.failed ? 'bad' : 'ok');
      ui.broadcastOut.hidden = false;
      ui.broadcastOut.textContent = data.results
        .map((row) => (row.ok ? '✓ ' : '✗ ') + row.name + (row.ok ? ' → #' + row.channelName : ' — ' + row.reason))
        .join('\n');
      loadAudit();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.broadcastStatus, error.message, 'bad');
    }
  }

  async function resync(scope) {
    setStatus(ui.resyncStatus, 'Registering…');
    try {
      const body = { scope };
      if (scope === 'guild') body.guildId = ui.resyncGuild.value;
      const data = await request('POST', '/api/owner/commands/resync', body);
      const result = data.result || {};
      const summary = result.wrote !== undefined
        ? 'wrote ' + result.wrote + ' command(s) to this server'
        : result.mode
          ? result.mode + ' · placed ' + (result.placed || 0) + ' · skipped ' + (result.skipped || 0) + (result.note ? ' · ' + result.note : '')
          : (result.ok ? 'registered' : result.error);
      ui.resyncOut.hidden = false;
      ui.resyncOut.textContent = (data.ok ? '✓ ' : '✗ ') + summary;
      setStatus(ui.resyncStatus, data.ok ? 'Done.' : 'See the result below.', data.ok ? 'ok' : 'bad');
      loadAudit();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.resyncStatus, error.message, 'bad');
    }
  }

  /* -------------------------------------------------------------- safeguards */

  function formatBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB';
    if (n >= 1024) return Math.round(n / 1024) + ' KB';
    return n + ' B';
  }

  function stateTag(state) {
    return el('span', { className: 'ad-state is-' + state, text: state === 'ok' ? 'ok' : state === 'warn' ? 'warn' : 'fail' });
  }

  function renderBackups(data) {
    const rows = data && Array.isArray(data.backups) ? data.backups : [];
    if (ui.backupsCount) ui.backupsCount.textContent = rows.length ? rows.length + ' saved' : 'none';
    if (!ui.backups) return;
    if (!rows.length) {
      ui.backups.replaceChildren(el('p', { className: 'ad-empty', text: 'No backups yet. Press “Back up now” before the next deploy.' }));
      return;
    }
    ui.backups.replaceChildren(...rows.map((row) => {
      const download = el('button', { className: 'btn btn-dark btn-sm', type: 'button', text: 'Download' });
      download.addEventListener('click', () => downloadBackup(row.name));
      const restore = el('button', { className: 'btn btn-dark btn-sm', type: 'button', text: 'Restore' });
      restore.addEventListener('click', () => restoreBackup(row.name));
      const meta = [row.safety ? 'pre-restore safety copy' : 'backup', formatBytes(row.bytes), relativeTime(row.at)];
      return el('div', { className: 'ad-row ad-backup-row' },
        el('div', { className: 'ad-row-main' },
          el('div', { className: 'ad-row-name', text: row.name }),
          el('div', { className: 'ad-row-meta', text: meta.join(' · ') })),
        el('div', { className: 'ad-row-side' }, download, restore));
    }));
  }

  async function loadBackups() {
    try {
      renderBackups(await get('/api/owner/backups'));
    } catch (error) {
      if (error.session) throw error;
      if (ui.backups) toolMissing(ui.backups, 'The backup list');
    }
  }

  async function createBackup() {
    setStatus(ui.backupStatus, 'Copying settings…');
    try {
      const data = await request('POST', '/api/owner/backups', { post: true });
      const note = data.posted || !data.postNote || /no admin server|no channel is set/i.test(data.postNote) ? '' : ' · ' + data.postNote;
      setStatus(ui.backupStatus, data.name + ' saved (' + formatBytes(data.bytes) + ')' + note, 'ok');
      loadBackups();
      loadAudit();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.backupStatus, error.message, 'bad');
    }
  }

  async function downloadBackup(name) {
    setStatus(ui.backupStatus, 'Preparing ' + name + '…');
    try {
      const response = await fetch(state.base + '/api/owner/backups/download?name=' + encodeURIComponent(name), {
        cache: 'no-store',
        headers: {
          Authorization: 'Bearer ' + state.session.accessToken,
          'ngrok-skip-browser-warning': '1',
        },
      });
      if (response.status === 401) {
        auth.clearSession();
        return gate('Your Discord session expired. Log in again.');
      }
      if (response.status === 404) return show('denied');
      if (!response.ok) throw new Error('Kernel answered ' + response.status + '.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setStatus(ui.backupStatus, 'Downloaded ' + name + '.', 'ok');
    } catch (error) {
      setStatus(ui.backupStatus, error.message, 'bad');
    }
  }

  async function restoreBackup(name) {
    const word = String(ui.restoreConfirm ? ui.restoreConfirm.value : '').trim().toUpperCase();
    if (word !== 'RESTORE') {
      setStatus(ui.backupStatus, 'Type RESTORE in the box first.', 'bad');
      return;
    }
    setStatus(ui.backupStatus, 'Restoring ' + name + '…');
    try {
      const data = await request('POST', '/api/owner/backups/restore', { name, confirm: word });
      if (ui.restoreConfirm) ui.restoreConfirm.value = '';
      setStatus(ui.backupStatus, data.restored + ' restored · safety copy ' + data.safety + ' · ' + data.guilds + ' server(s).', 'ok');
      await loadBackups();
      await refresh();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.backupStatus, error.message, 'bad');
    }
  }

  function diagGroup(title, rows) {
    return el('div', { className: 'ad-diag-group' },
      el('div', { className: 'ad-diag-head' }, el('span', { text: title }), el('span', { className: 'ad-count', text: String(rows.length) })),
      ...rows);
  }

  function diagRow(text, state) {
    return el('div', { className: 'ad-diag-row' },
      el('div', { className: 'ad-row-main' }, el('div', { className: 'ad-row-meta', text })),
      stateTag(state));
  }

  function renderDiagnostics(data) {
    const drift = (data && data.drift) || {};
    const health = (data && data.health) || {};
    const blocks = [];

    const adminIssues = Array.isArray(drift.admin) ? drift.admin : [];
    if (adminIssues.length) blocks.push(diagGroup('Admin server', adminIssues.map((issue) => diagRow(issue.detail, 'bad'))));

    for (const row of drift.guilds || []) {
      if (!row.issues.length && !row.warnings.length) continue;
      const lines = [
        ...row.issues.map((issue) => diagRow(issue.detail, 'bad')),
        ...row.warnings.map((issue) => diagRow(issue.detail, 'warn')),
      ];
      blocks.push(diagGroup(row.name, lines));
    }

    for (const row of health.guilds || []) {
      const broken = (row.checks || []).filter((check) => check.state !== 'ok');
      if (!broken.length) continue;
      blocks.push(diagGroup('Permissions · ' + row.name, broken.map((check) => diagRow(check.label + ' — ' + check.detail, check.state))));
    }

    if (ui.diag) {
      if (!blocks.length) {
        ui.diag.replaceChildren(el('p', { className: 'ad-empty', text: 'Nothing broken: every saved channel and role exists, and each switched-on module has its permissions.' }));
      } else {
        ui.diag.replaceChildren(...blocks);
      }
    }

    const issues = Number(drift.issueCount) || 0;
    const warns = Number(drift.warnCount) || 0;
    setStatus(ui.diagStatus, issues || warns ? issues + ' broken reference(s), ' + warns + ' warning(s).' : 'All references and permissions look right.', issues ? 'bad' : warns ? 'warn' : 'ok');
  }

  async function loadDiagnostics() {
    setStatus(ui.diagStatus, 'Checking…');
    try {
      renderDiagnostics(await get('/api/owner/diagnostics'));
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      if (ui.diag) toolMissing(ui.diag, 'The diagnostics check');
      setStatus(ui.diagStatus, error.message, 'bad');
    }
  }

  function renderErrors(data) {
    const rows = data && Array.isArray(data.entries) ? data.entries : [];
    if (ui.errorsCount) ui.errorsCount.textContent = rows.length ? rows.length + ' grouped' : 'none';
    if (!ui.errors) return;
    if (!rows.length) {
      ui.errors.replaceChildren(el('p', { className: 'ad-empty', text: 'No crashes recorded. This is the good state.' }));
      return;
    }
    ui.errors.replaceChildren(...rows.map((row) => {
      const details = el('details', null,
        el('summary', { text: 'stack' }),
        el('pre', { text: row.sample || row.message }));
      return el('div', { className: 'ad-error-row' },
        el('div', { className: 'ad-row-main' },
          el('div', { className: 'ad-row-name', text: row.message }),
          el('div', { className: 'ad-row-meta', text: row.source + ' · seen ' + row.count + '× · last ' + relativeTime(row.lastAt) }),
          details),
        stateTag(row.count > 20 ? 'bad' : row.count > 1 ? 'warn' : 'ok'));
    }));
  }

  async function loadErrors() {
    try {
      renderErrors(await get('/api/owner/errors?limit=40'));
    } catch (error) {
      if (error.session) throw error;
      if (ui.errors) toolMissing(ui.errors, 'The error inbox');
    }
  }

  async function clearErrors() {
    setStatus(ui.errorsStatus, 'Clearing…');
    try {
      await request('POST', '/api/owner/errors/clear', {});
      setStatus(ui.errorsStatus, 'Inbox cleared.', 'ok');
      loadErrors();
      loadAudit();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.errorsStatus, error.message, 'bad');
    }
  }

  function renderDoctor(data) {
    const rows = data && Array.isArray(data.checks) ? data.checks : [];
    if (ui.doctor) {
      ui.doctor.replaceChildren(...rows.map((row) => el('div', { className: 'ad-doctor-row' },
        el('div', { className: 'ad-row-main' },
          el('div', { className: 'ad-row-name', text: row.label }),
          el('div', { className: 'ad-row-meta', text: row.detail })),
        stateTag(row.state))));
    }
    const bad = rows.filter((row) => row.state === 'bad').length;
    const warn = rows.filter((row) => row.state === 'warn').length;
    setStatus(ui.doctorStatus, bad ? bad + ' check(s) failed.' : warn ? warn + ' warning(s), nothing blocking.' : 'Every check passed.', bad ? 'bad' : warn ? 'warn' : 'ok');
  }

  async function runDoctor() {
    setStatus(ui.doctorStatus, 'Checking the deployment…');
    try {
      renderDoctor(await get('/api/owner/doctor'));
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      if (ui.doctor) toolMissing(ui.doctor, 'The deployment doctor');
      setStatus(ui.doctorStatus, error.message, 'bad');
    }
  }

  /* --------------------------------------------------------------- insights */

  async function jumpToSetting(guildId, path) {
    if (ui.settingsGuild) ui.settingsGuild.value = guildId;
    await loadSettings();
    const hasPath = ui.settingsField && Array.from(ui.settingsField.options).some((option) => option.value === path);
    if (hasPath) {
      ui.settingsField.value = path;
      renderSettingsValue();
    }
    const card = ui.settingsGuild ? ui.settingsGuild.closest('.ad-tool') : null;
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setStatus(
      ui.settingsStatus,
      hasPath ? 'Picked ' + path + ' — change it, then press Save setting.' : 'That finding is not a simple setting; fix it with the action named in the scorecard.',
      hasPath ? 'warn' : 'bad',
    );
  }

  function renderScorecard(data) {
    const guilds = data && Array.isArray(data.guilds) ? data.guilds : [];
    if (ui.scoreAverage) {
      ui.scoreAverage.textContent = guilds.length
        ? 'avg ' + data.average + '/100 · ' + data.ready + '/' + guilds.length + ' ready'
        : 'no servers';
    }
    if (!ui.scorecard) return;
    if (!guilds.length) {
      ui.scorecard.replaceChildren(el('p', { className: 'ad-empty', text: 'Kernel is not in any server, so there is nothing to score.' }));
      return;
    }
    ui.scorecard.replaceChildren(...guilds.map((row) => {
      const bar = el('span', { className: 'ad-score-bar is-' + row.state },
        el('span', { style: 'width:' + Math.min(100, Math.max(0, Number(row.score) || 0)) + '%' }));
      const head = el('div', { className: 'ad-score-head' },
        el('div', { className: 'ad-row-main' },
          el('div', { className: 'ad-row-name', text: row.name }),
          el('div', { className: 'ad-row-meta', text: (row.counts ? row.counts.members + ' member(s) · ' + row.counts.admins + ' admin holder(s) · ' + row.counts.holders + ' with dangerous permissions' : '') })),
        bar,
        el('span', { className: 'ad-row-meta', text: row.score + '/100' }),
        stateTag(row.state));

      const findings = (row.findings || []).filter((finding) => finding.level !== 'ok');
      const list = el('ul', { className: 'ad-findings' }, ...findings.map((finding) => {
        const text = el('span', { className: 'ad-finding-text' },
          el('b', { text: finding.title }),
          ' — ' + finding.detail);
        const side = [];
        if (finding.fix && finding.fix.type === 'setting') {
          const fix = el('button', { className: 'btn btn-dark btn-sm', type: 'button', text: 'Fix' });
          fix.addEventListener('click', () => {
            jumpToSetting(row.id, finding.fix.path).catch((error) => {
              if (error.session) return gate('Your Discord session expired. Log in again.');
              setStatus(ui.scoreStatus, error.message, 'bad');
            });
          });
          side.push(fix);
        } else if (finding.fix && finding.fix.type === 'command') {
          side.push(el('span', { className: 'ad-row-meta', text: finding.fix.text }));
        }
        return el('li', { className: 'ad-finding' }, stateTag(finding.level === 'danger' ? 'bad' : 'warn'), text, ...side);
      }));
      if (!findings.length) {
        list.append(el('li', { className: 'ad-finding' }, stateTag('ok'), el('span', { className: 'ad-finding-text', text: 'No blocking findings.' })));
      }
      return el('div', { className: 'ad-score-row' }, head, list);
    }));

    const bad = guilds.filter((row) => row.state === 'bad').length;
    const warn = guilds.filter((row) => row.state === 'warn').length;
    setStatus(
      ui.scoreStatus,
      bad ? bad + ' server(s) could not fully respond to an attack.' : warn ? warn + ' server(s) are ready but have weak points.' : 'Every server is ready.',
      bad ? 'bad' : warn ? 'warn' : 'ok',
    );
  }

  async function loadScorecard() {
    setStatus(ui.scoreStatus, 'Scoring…');
    try {
      renderScorecard(await get('/api/owner/scorecard'));
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      if (ui.scorecard) toolMissing(ui.scorecard, 'The scorecard');
      setStatus(ui.scoreStatus, error.message, 'bad');
    }
  }

  function renderDigest(data) {
    if (!ui.digest) return;
    const embed = data && data.embed ? data.embed : null;
    if (!embed) {
      ui.digest.replaceChildren(el('p', { className: 'ad-empty', text: 'Kernel did not return a digest for this server.' }));
      setStatus(ui.digestStatus, 'Nothing to preview.', 'bad');
      return;
    }
    const color = embed.color === undefined || embed.color === null ? '#5865f2' : '#' + Number(embed.color).toString(16).padStart(6, '0');
    const nodes = [el('strong', { text: embed.title || 'Weekly protection report' })];
    if (embed.description) nodes.push(el('p', { text: embed.description }));
    for (const field of embed.fields || []) {
      nodes.push(el('p', { text: field.name + '\n' + field.value }));
    }
    nodes.push(el('span', { text: (embed.footer && embed.footer.text) || '' }));
    ui.digest.style.borderLeftColor = color;
    ui.digest.replaceChildren(...nodes);

    const where = data.channel ? '#' + data.channel.name : 'no postable channel';
    setStatus(
      ui.digestStatus,
      (data.enabled ? 'Scheduled · ' : 'Not scheduled · ') + where + (data.nextAt ? ' · next ' + relativeTime(data.nextAt) : ''),
      data.enabled && data.channel ? (data.ready ? 'ok' : 'warn') : 'warn',
    );
  }

  async function loadDigest() {
    const guildId = ui.digestGuild ? ui.digestGuild.value : '';
    if (!guildId) return;
    setStatus(ui.digestStatus, 'Building the preview…');
    try {
      renderDigest(await get('/api/owner/digest/preview?guild=' + encodeURIComponent(guildId)));
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      if (ui.digest) toolMissing(ui.digest, 'The digest preview');
      setStatus(ui.digestStatus, error.message, 'bad');
    }
  }

  function renderEconomy(data) {
    const rows = data && Array.isArray(data.rows) ? data.rows : [];
    const totals = (data && data.totals) || {};
    if (ui.ecoCount) {
      ui.ecoCount.textContent = totals.accounts
        ? totals.accounts + ' wallet(s) · ' + numberFormat.format(totals.cash || 0) + ' coins'
        : 'no wallets';
    }
    if (!ui.ecoRows) return;
    if (!rows.length) {
      ui.ecoRows.replaceChildren(el('p', { className: 'ad-empty', text: 'Nobody has earned coins in this server yet.' }));
      return;
    }
    ui.ecoRows.replaceChildren(...rows.map((row, index) => {
      const avatar = row.avatar
        ? el('img', { className: 'ad-eco-avatar', src: row.avatar, alt: '', loading: 'lazy' })
        : el('span', { className: 'ad-eco-avatar' });
      return el('div', { className: 'ad-eco-row' },
        el('span', { className: 'ad-eco-rank', text: String(index + 1) }),
        avatar,
        el('div', { className: 'ad-eco-name' },
          row.name,
          el('small', { text: 'streak ' + row.dailyStreak + ' · ' + numberFormat.format(row.xp) + ' XP' + (row.inGuild ? '' : ' · left the server') })),
        el('span', { className: 'ad-eco-cash', text: numberFormat.format(row.cash) }));
    }));
    if (data.more) ui.ecoRows.append(el('p', { className: 'ad-empty', text: 'and ' + data.more + ' more wallet(s)' }));
  }

  async function loadEconomy() {
    const guildId = ui.ecoGuild ? ui.ecoGuild.value : '';
    if (!guildId) return;
    try {
      renderEconomy(await get('/api/owner/economy?guild=' + encodeURIComponent(guildId)));
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      if (ui.ecoRows) toolMissing(ui.ecoRows, 'The economy view');
      setStatus(ui.ecoStatus, error.message, 'bad');
    }
  }

  async function applyEconomy() {
    const action = ui.ecoAction ? ui.ecoAction.value : 'add';
    const body = {
      guildId: ui.ecoGuild ? ui.ecoGuild.value : '',
      userId: ui.ecoUser ? ui.ecoUser.value.trim() : '',
      action,
      amount: ui.ecoAmount && ui.ecoAmount.value !== '' ? Number(ui.ecoAmount.value) : NaN,
      reason: ui.ecoReason ? ui.ecoReason.value.trim() : '',
    };
    if (action === 'set') body.confirm = ui.ecoConfirm ? ui.ecoConfirm.value.trim().toUpperCase() : '';
    setStatus(ui.ecoStatus, 'Writing the change…');
    try {
      const result = await request('POST', '/api/owner/economy', body);
      const moved = result.applied > 0 ? '+' : '';
      const clamped = result.clamped ? ' (capped to available balance)' : '';
      setStatus(ui.ecoStatus, 'Balance ' + numberFormat.format(result.before) + ' → ' + numberFormat.format(result.after) + ' (' + moved + numberFormat.format(result.applied) + ')' + clamped + '.', 'ok');
      if (ui.ecoAmount) ui.ecoAmount.value = '';
      if (ui.ecoReason) ui.ecoReason.value = '';
      if (ui.ecoConfirm) ui.ecoConfirm.value = '';
      await loadEconomy();
      loadAudit();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.ecoStatus, error.message, 'bad');
    }
  }

  function renderLayout(data, quiet) {
    if (ui.layoutCount) {
      ui.layoutCount.textContent = data.takenAt
        ? data.channels + ' ch · ' + data.roles + ' roles'
        : 'no restore point';
    }
    if (!ui.layout) return;
    if (!data.takenAt) {
      ui.layout.replaceChildren(el('p', { className: 'ad-empty', text: 'No restore point yet. Press “Save restore point” before anything can be rebuilt.' }));
      if (!quiet) setStatus(ui.layoutStatus, 'Kernel has never snapshotted this server.', 'warn');
      return;
    }

    const auto = data.auto || {};
    const rows = [
      el('div', { className: 'ad-row' },
        el('div', { className: 'ad-row-main' },
          el('div', { className: 'ad-row-name', text: 'Restore point taken ' + relativeTime(data.takenAt) }),
          el('div', { className: 'ad-row-meta', text: data.channels + ' channel(s), ' + data.roles + ' role(s) remembered · auto-save ' + (auto.enabled ? 'on, every ' + auto.intervalMinutes + 'm or ' + auto.threshold + ' change(s)' : 'off') })),
        stateTag(data.canChannels || data.canRoles ? 'ok' : 'bad')),
    ];

    const missing = [];
    if (data.missingChannels.length) missing.push(data.missingChannels.length + ' channel(s): ' + data.missingChannels.map((row) => '#' + row.name).join(', '));
    if (data.missingRoles.length) missing.push(data.missingRoles.length + ' role(s): ' + data.missingRoles.map((row) => '@' + row.name).join(', '));
    rows.push(el('div', { className: 'ad-row' },
      el('div', { className: 'ad-row-main' },
        el('div', { className: 'ad-row-name', text: missing.length ? 'A rebuild would recreate' : 'Nothing is missing right now' }),
        el('div', { className: 'ad-row-meta', text: missing.length
          ? missing.join(' · ') + ' · up to ' + data.willRecreateChannels + ' channel(s) and ' + data.willRecreateRoles + ' role(s) per run'
          : 'The live server still matches the restore point for everything Kernel can see.' })),
      stateTag(missing.length ? 'warn' : 'ok')));

    if (!data.canChannels || !data.canRoles) {
      rows.push(el('div', { className: 'ad-row' },
        el('div', { className: 'ad-row-main' }, el('div', { className: 'ad-row-meta', text: 'A rebuild needs ' + [data.canChannels ? '' : 'Manage Channels', data.canRoles ? '' : 'Manage Roles'].filter(Boolean).join(' and ') + '.' })),
        stateTag('bad')));
    }

    rows.push(el('p', { className: 'ad-note', text: 'Never rebuilt: ' + (data.never || []).join(', ') + '.' }));
    ui.layout.replaceChildren(...rows);
    if (!quiet) setStatus(ui.layoutStatus, missing.length ? 'Restore point is here, ' + missing.length + ' group(s) missing.' : 'Restore point is ready.', missing.length ? 'warn' : 'ok');
  }

  async function loadLayout(quiet) {
    const guildId = ui.layoutGuild ? ui.layoutGuild.value : '';
    if (!guildId) return;
    try {
      renderLayout(await get('/api/owner/layout?guild=' + encodeURIComponent(guildId)), quiet);
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      if (ui.layout) toolMissing(ui.layout, 'The layout view');
      setStatus(ui.layoutStatus, error.message, 'bad');
    }
  }

  async function saveLayoutPoint() {
    const guildId = ui.layoutGuild ? ui.layoutGuild.value : '';
    setStatus(ui.layoutStatus, 'Snapping the live layout…');
    try {
      const data = await request('POST', '/api/owner/layout/save?guild=' + encodeURIComponent(guildId), {});
      setStatus(ui.layoutStatus, 'Restore point saved: ' + data.channels + ' channel(s), ' + data.roles + ' role(s).', 'ok');
      await loadLayout(true);
      loadAudit();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.layoutStatus, error.message, 'bad');
    }
  }

  async function restoreLayout() {
    const guildId = ui.layoutGuild ? ui.layoutGuild.value : '';
    const word = String(ui.layoutConfirm ? ui.layoutConfirm.value : '').trim().toUpperCase();
    if (word !== 'RESTORE') {
      setStatus(ui.layoutStatus, 'Type RESTORE in the box first.', 'bad');
      return;
    }
    setStatus(ui.layoutStatus, 'Rebuilding missing channels and roles…');
    try {
      const data = await request('POST', '/api/owner/layout/restore', { guildId, confirm: word });
      if (ui.layoutConfirm) ui.layoutConfirm.value = '';
      const failed = data.failed && data.failed.length ? ' · ' + data.failed.length + ' failed' : '';
      const skipped = data.skipped ? ' · ' + data.skipped : '';
      setStatus(ui.layoutStatus, data.channels.length + ' channel(s) and ' + data.roles.length + ' role(s) recreated' + failed + skipped + '.', failed ? 'warn' : 'ok');
      await loadLayout(true);
      loadAudit();
      loadScorecard();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.layoutStatus, error.message, 'bad');
    }
  }

  function renderRehearsal(data) {
    if (!ui.rehearsal) return;
    const findings = (data.findings || []).filter((finding) => finding.level !== 'ok');
    const steps = el('ol', { className: 'ad-findings' }, ...(data.steps || []).map((step) => el('li', { className: 'ad-finding' }, el('span', { className: 'ad-finding-text', text: step }))));
    ui.rehearsal.replaceChildren(
      el('div', { className: 'ad-row' },
        el('div', { className: 'ad-row-main' },
          el('div', { className: 'ad-row-name', text: 'If an attack started now: ' + data.trigger }),
          el('div', { className: 'ad-row-meta', text: data.ready ? 'Kernel could respond fully · score ' + data.score + '/100' : 'Kernel could not respond fully · score ' + data.score + '/100' })),
        stateTag(data.ready ? 'ok' : 'bad')),
      steps,
      findings.length
        ? el('p', { className: 'ad-note', text: 'Blocking or weak: ' + findings.map((finding) => finding.title).join('; ') + '.' })
        : el('p', { className: 'ad-note', text: 'No red or orange findings behind this plan.' }),
      el('p', { className: 'ad-note', text: 'The restore point remembers ' + data.restore.rememberedChannels + ' channel(s) and ' + data.restore.rememberedRoles + ' role(s); ' + data.restore.missingChannels + ' channel(s) and ' + data.restore.missingRoles + ' role(s) are missing right now. It never restores ' + (data.restore.never || []).slice(0, 3).join(', ') + ' and the rest of that list.' }),
    );
  }

  async function runRehearsal() {
    const guildId = ui.layoutGuild ? ui.layoutGuild.value : '';
    setStatus(ui.layoutStatus, 'Testing the guard without touching anything…');
    try {
      const data = await get('/api/owner/antinuke/rehearsal?guild=' + encodeURIComponent(guildId));
      renderRehearsal(data);
      setStatus(ui.layoutStatus, data.ready ? 'Drill: Kernel could respond fully.' : 'Drill: Kernel could not respond fully.', data.ready ? 'ok' : 'bad');
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      if (ui.rehearsal) toolMissing(ui.rehearsal, 'The readiness drill');
      setStatus(ui.layoutStatus, error.message, 'bad');
    }
  }

  /* --------------------------------------------------- operations (Batch G) */

  function renderSchedGuilds() {
    if (!ui.schedGuilds) return;
    const guilds = state.overview && Array.isArray(state.overview.guilds) ? state.overview.guilds : [];
    if (!guilds.length) {
      ui.schedGuilds.replaceChildren(el('p', { className: 'ad-empty', text: 'Kernel is not in any server.' }));
      return;
    }
    const all = el('label', { className: 'ad-check is-all' }, el('input', { type: 'checkbox' }), el('span', { text: 'All ' + guilds.length + ' server(s)' }));
    all.querySelector('input').addEventListener('change', (event) => {
      ui.schedGuilds.querySelectorAll('input[data-ad-sched-guild]').forEach((box) => { box.checked = event.target.checked; });
    });
    const rows = guilds.map((guild) => el('label', { className: 'ad-check' },
      el('input', { type: 'checkbox', dataset: { adSchedGuild: guild.id } }),
      el('span', { text: guild.name + ' · ' + numberFormat.format(guild.memberCount || 0) })));
    ui.schedGuilds.replaceChildren(all, ...rows);
  }

  function renderScheduled(data) {
    const jobs = data && Array.isArray(data.jobs) ? data.jobs : [];
    if (ui.schedCount) ui.schedCount.textContent = jobs.length ? jobs.length + ' queued · up to ' + data.limit : 'none queued';
    if (!ui.schedList) return;
    if (!jobs.length) {
      ui.schedList.replaceChildren(el('p', { className: 'ad-empty', text: 'Nothing is queued. Broadcasts due while the host sleeps up to ' + data.graceHours + 'h still send; later ones are reported as skipped.' }));
      return;
    }
    ui.schedList.replaceChildren(...jobs.map((job) => {
      const cancel = el('button', { className: 'btn btn-dark btn-sm', type: 'button', text: 'Cancel' });
      cancel.addEventListener('click', () => cancelScheduled(job));
      return el('div', { className: 'ad-row' },
        el('div', { className: 'ad-row-main' },
          el('div', { className: 'ad-row-name', text: job.title || job.description.slice(0, 80) || 'Broadcast' }),
          el('div', { className: 'ad-row-meta', text: new Date(job.at).toLocaleString() + ' · ' + job.guildIds.length + ' server(s)' + (job.note ? ' · ' + job.note : '') })),
        cancel);
    }));
  }

  async function loadScheduled() {
    try {
      renderScheduled(await get('/api/owner/broadcasts'));
    } catch (error) {
      if (error.session) throw error;
      if (ui.schedCount) ui.schedCount.textContent = 'unavailable';
      toolMissing(ui.schedList, 'Scheduled broadcasts');
    }
  }

  async function addScheduled() {
    const at = ui.schedAt && ui.schedAt.value ? new Date(ui.schedAt.value).getTime() : NaN;
    const guildIds = Array.from(ui.schedGuilds ? ui.schedGuilds.querySelectorAll('input[data-ad-sched-guild]:checked') : []).map((box) => box.dataset.adSchedGuild);
    setStatus(ui.schedStatus, 'Scheduling…');
    try {
      const data = await request('POST', '/api/owner/broadcasts', {
        at,
        guildIds,
        title: ui.schedTitle ? ui.schedTitle.value : '',
        description: ui.schedDesc ? ui.schedDesc.value : '',
        footer: ui.schedFooter ? ui.schedFooter.value : '',
        note: ui.schedNote ? ui.schedNote.value : '',
        confirm: ui.schedConfirm ? ui.schedConfirm.value : '',
      });
      setStatus(ui.schedStatus, 'Queued for ' + new Date(data.job.at).toLocaleString() + ' · ' + data.job.guildIds.length + ' server(s).', 'ok');
      ['schedTitle', 'schedDesc', 'schedFooter', 'schedNote', 'schedConfirm'].forEach((key) => { if (ui[key]) ui[key].value = ''; });
      if (ui.schedGuilds) ui.schedGuilds.querySelectorAll('input').forEach((box) => { box.checked = false; });
      await loadScheduled();
      loadAudit();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.schedStatus, error.message, 'bad');
    }
  }

  async function cancelScheduled(job) {
    setStatus(ui.schedStatus, 'Cancelling…');
    try {
      await request('POST', '/api/owner/broadcasts/cancel', { id: job.id });
      setStatus(ui.schedStatus, 'Cancelled “' + (job.title || 'broadcast').slice(0, 60) + '”.', 'ok');
      await loadScheduled();
      loadAudit();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.schedStatus, error.message, 'bad');
    }
  }

  function renderWatch(data) {
    const entries = data && Array.isArray(data.entries) ? data.entries : [];
    const hits = data && Array.isArray(data.hits) ? data.hits : [];
    if (ui.watchCount) ui.watchCount.textContent = entries.length ? entries.length + ' watched' : 'nobody watched';
    if (ui.watchList) {
      if (!entries.length) {
        ui.watchList.replaceChildren(el('p', { className: 'ad-empty', text: 'No watched members. An alert posts to the Incidents route; a kick or ban runs before the welcome.' }));
      } else {
        ui.watchList.replaceChildren(...entries.map((entry) => {
          const remove = el('button', { className: 'btn btn-dark btn-sm', type: 'button', text: 'Remove' });
          remove.addEventListener('click', () => removeWatch(entry));
          return el('div', { className: 'ad-row' },
            el('div', { className: 'ad-row-main' },
              el('div', { className: 'ad-row-name', text: entry.userId + ' · ' + entry.action }),
              el('div', { className: 'ad-row-meta', text: (entry.guildIds.length ? entry.guildIds.length + ' server(s)' : 'every server') + ' · ' + entry.reason + ' · ' + entry.hits + ' match(es)' })),
            remove);
        }));
      }
    }
    if (!ui.watchHits) return;
    if (!hits.length) {
      ui.watchHits.replaceChildren(el('p', { className: 'ad-empty', text: 'No matches yet.' }));
      return;
    }
    ui.watchHits.replaceChildren(...hits.slice(0, 20).map((hit) => el('div', { className: 'ad-row' },
      el('div', { className: 'ad-row-main' },
        el('div', { className: 'ad-row-name', text: hit.userTag + ' · ' + hit.outcome }),
        el('div', { className: 'ad-row-meta', text: hit.guildName + ' · ' + hit.reason + ' · ' + relativeTime(hit.at) + (hit.error ? ' · ' + hit.error : '') })),
      stateTag(hit.outcome === 'failed' ? 'bad' : hit.outcome === 'alerted' ? 'warn' : 'ok'))));
  }

  async function loadWatch() {
    try {
      renderWatch(await get('/api/owner/watchlist'));
    } catch (error) {
      if (error.session) throw error;
      if (ui.watchCount) ui.watchCount.textContent = 'unavailable';
      toolMissing(ui.watchList, 'The watchlist');
    }
  }

  async function addWatch() {
    if (ui.watchScope && ui.watchScope.value === 'one' && (!ui.watchGuild || !ui.watchGuild.value)) {
      setStatus(ui.watchStatus, 'Pick the server this entry covers.', 'bad');
      return;
    }
    const guildIds = ui.watchScope && ui.watchScope.value === 'one' && ui.watchGuild && ui.watchGuild.value ? [ui.watchGuild.value] : [];
    setStatus(ui.watchStatus, 'Saving…');
    try {
      const data = await request('POST', '/api/owner/watchlist', {
        userId: ui.watchUser ? ui.watchUser.value : '',
        reason: ui.watchReason ? ui.watchReason.value : '',
        action: ui.watchAction ? ui.watchAction.value : 'alert',
        guildIds,
        confirm: ui.watchConfirm ? ui.watchConfirm.value : '',
      });
      setStatus(ui.watchStatus, 'Watching ' + data.entry.userId + ' · ' + data.entry.action + '.', 'ok');
      ['watchUser', 'watchReason', 'watchConfirm'].forEach((key) => { if (ui[key]) ui[key].value = ''; });
      await loadWatch();
      loadAudit();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.watchStatus, error.message, 'bad');
    }
  }

  async function removeWatch(entry) {
    setStatus(ui.watchStatus, 'Removing…');
    try {
      await request('POST', '/api/owner/watchlist/remove', { id: entry.id });
      setStatus(ui.watchStatus, 'Removed ' + entry.userId + '.', 'ok');
      await loadWatch();
      loadAudit();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.watchStatus, error.message, 'bad');
    }
  }

  function buildSize(bytes) {
    const value = Number(bytes) || 0;
    return value > 1024 * 1024 ? (value / 1048576).toFixed(1) + ' MB' : Math.round(value / 1024) + ' KB';
  }

  function renderBuilds(data) {
    const rows = data && Array.isArray(data.builds) ? data.builds : [];
    if (ui.buildCount) ui.buildCount.textContent = 'running v' + (data.running || '?') + ' · ' + (rows.length ? rows.length + ' of ' + data.keep + ' kept' : 'none saved');
    if (!ui.builds) return;
    if (!rows.length) {
      ui.builds.replaceChildren(el('p', { className: 'ad-empty', text: 'No build saved yet. “Save this build” copies src/ and package.json so this exact code can be put back.' }));
      return;
    }
    ui.builds.replaceChildren(...rows.map((row) => {
      const restore = el('button', { className: 'btn btn-danger btn-sm', type: 'button', text: 'Restore' });
      restore.addEventListener('click', () => restoreBuild(row));
      const remove = el('button', { className: 'btn btn-dark btn-sm', type: 'button', text: 'Delete' });
      remove.addEventListener('click', () => deleteBuild(row));
      return el('div', { className: 'ad-row' },
        el('div', { className: 'ad-row-main' },
          el('div', { className: 'ad-row-name', text: row.name }),
          el('div', { className: 'ad-row-meta', text: 'v' + row.version + ' · ' + relativeTime(row.at) + ' · ' + row.files + ' file(s) · ' + buildSize(row.bytes) })),
        el('div', { className: 'ad-row-side' }, restore, remove));
    }));
  }

  async function loadBuilds() {
    try {
      renderBuilds(await get('/api/owner/builds'));
    } catch (error) {
      if (error.session) throw error;
      if (ui.buildCount) ui.buildCount.textContent = 'unavailable';
      toolMissing(ui.builds, 'The release manager');
    }
  }

  function renderInbox(data) {
    const rows = data && Array.isArray(data.messages) ? data.messages : [];
    if (ui.inboxCount) {
      ui.inboxCount.textContent = !rows.length
        ? 'empty'
        : (data.unread ? data.unread + ' unread · ' : '') + (data.total || rows.length) + ' total';
    }
    if (!ui.inboxList) return;
    if (!rows.length) {
      ui.inboxList.replaceChildren(el('p', { className: 'ad-empty', text: 'No messages yet. The Contact page and every developer profile post into this list.' }));
      return;
    }
    ui.inboxList.replaceChildren(...rows.slice(0, 50).map((row) => {
      const reply = el('a', {
        className: 'btn btn-light btn-sm',
        href: 'mailto:' + row.email + '?subject=' + encodeURIComponent('Re: ' + row.subject),
        text: 'Reply',
      });
      const toggle = el('button', { className: 'btn btn-dark btn-sm', type: 'button', text: row.read ? 'Mark unread' : 'Mark read' });
      toggle.addEventListener('click', () => markInbox(row, !row.read));
      const remove = el('button', { className: 'btn btn-dark btn-sm', type: 'button', text: 'Delete' });
      remove.addEventListener('click', () => deleteInbox(row));
      const preview = String(row.body || '').slice(0, 220);
      return el('div', { className: 'ad-row' },
        el('div', { className: 'ad-row-main' },
          el('div', { className: 'ad-row-name', text: row.subject + (row.read ? '' : ' · new') }),
          el('div', { className: 'ad-row-meta', text: row.name + ' · ' + row.email + ' · ' + (row.dev ? 'via the ' + row.dev + ' profile' : 'Contact page') + ' · ' + relativeTime(row.at) }),
          el('div', { className: 'ad-row-meta', text: preview + (String(row.body || '').length > 220 ? '…' : '') })),
        el('div', { className: 'ad-row-side' }, reply, toggle, remove));
    }));
  }

  async function loadInbox() {
    try {
      renderInbox(await get('/api/owner/inbox'));
    } catch (error) {
      if (error.session) throw error;
      if (ui.inboxCount) ui.inboxCount.textContent = 'unavailable';
      toolMissing(ui.inboxList, 'Messages');
    }
  }

  async function markInbox(row, read) {
    setStatus(ui.inboxStatus, read ? 'Marking read…' : 'Marking unread…');
    try {
      await request('POST', '/api/owner/inbox/read', { id: row.id, read });
      setStatus(ui.inboxStatus, read ? 'Marked read.' : 'Marked unread.', 'ok');
      await loadInbox();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.inboxStatus, error.message, 'bad');
    }
  }

  async function deleteInbox(row) {
    if (!window.confirm('Delete "' + row.subject + '" from ' + row.name + '?')) return;
    setStatus(ui.inboxStatus, 'Deleting…');
    try {
      await request('POST', '/api/owner/inbox/remove', { id: row.id });
      setStatus(ui.inboxStatus, 'Deleted.', 'ok');
      await loadInbox();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.inboxStatus, error.message, 'bad');
    }
  }

  function chartGroup(label, rows, key, tone, note) {
    const values = rows.map((row) => Number(row[key]) || 0);
    const peak = Math.max(1, ...values);
    const total = values.reduce((sum, value) => sum + value, 0);
    const bars = el('div', { className: 'ad-chart-bars' });
    rows.forEach((row, index) => {
      const value = values[index];
      const bar = el('span', {
        className: 'ad-chart-bar is-' + tone,
        title: row.day + ' · ' + value + ' ' + note,
      });
      bar.style.height = Math.max(2, Math.round((value / peak) * 100)) + '%';
      bars.append(bar);
    });
    return el('div', { className: 'ad-chart-group' },
      el('div', { className: 'ad-chart-head' },
        el('span', { className: 'ad-chart-label', text: label }),
        el('span', { className: 'ad-chart-meta', text: total + ' total · peak ' + peak })),
      bars);
  }

  function renderUsage(data) {
    const top = data && Array.isArray(data.top) ? data.top : [];
    const never = data && Array.isArray(data.never) ? data.never : [];
    const days = data && Array.isArray(data.days) ? data.days : [];
    if (ui.usageCount) {
      ui.usageCount.textContent = !data || !data.total
        ? 'no commands yet'
        : data.total + ' run · ' + data.uniqueUsed + '/' + data.registered + ' used';
    }
    if (ui.growth) {
      if (!days.length) {
        ui.growth.replaceChildren(el('p', { className: 'ad-empty', text: 'No daily buckets yet. Kernel writes one on the first command or member event.' }));
      } else {
        const joins = days.reduce((sum, day) => sum + day.joins, 0);
        const leaves = days.reduce((sum, day) => sum + day.leaves, 0);
        ui.growth.replaceChildren(
          chartGroup('Commands · last 30 days', days, 'commands', 'cmd', 'command(s)'),
          chartGroup('Members joined · ' + joins + ' · left · ' + leaves, days, 'joins', 'join', 'join(s)'),
        );
      }
    }
    if (ui.usageRows) {
      if (!top.length) {
        ui.usageRows.replaceChildren(el('p', { className: 'ad-empty', text: 'No slash command has been run since this build booted.' }));
      } else {
        ui.usageRows.replaceChildren(...top.map((row) => el('div', { className: 'ad-row' },
          el('div', { className: 'ad-row-main' },
            el('div', { className: 'ad-row-name', text: '/' + row.name }),
            el('div', { className: 'ad-row-meta', text: row.count + ' run(s) · last ' + relativeTime(row.lastAt) + (row.failures ? ' · ' + row.failures + ' failed' : '') })),
          row.failures ? stateTag('warn') : stateTag('ok'))));
      }
    }
    if (ui.unusedRows) {
      const registered = Number(data && data.registered) || 0;
      ui.unusedRows.replaceChildren(el('div', { className: 'ad-row' },
        el('div', { className: 'ad-row-main' },
          el('div', { className: 'ad-row-name', text: 'Never used · ' + never.length + ' of ' + registered }),
          el('div', {
            className: 'ad-row-meta',
            text: never.length
              ? never.slice(0, 45).join(' · ') + (never.length > 45 ? ' …' : '')
              : registered ? 'Every registered command has been run at least once.' : 'This bot build did not report its command list.',
          }))));
    }
  }

  async function loadUsage() {
    try {
      renderUsage(await get('/api/owner/usage'));
      setStatus(ui.usageStatus, '');
    } catch (error) {
      if (error.session) throw error;
      if (ui.usageCount) ui.usageCount.textContent = 'unavailable';
      toolMissing(ui.usageRows, 'Usage counters');
      if (ui.growth) ui.growth.replaceChildren();
      if (ui.unusedRows) ui.unusedRows.replaceChildren();
    }
  }

  function renderAdoption(data) {
    const guilds = data && Array.isArray(data.guilds) ? data.guilds : [];
    const features = data && Array.isArray(data.features) ? data.features : [];
    if (ui.adoptCount) {
      ui.adoptCount.textContent = guilds.length ? guilds.length + ' server(s) · ' + features.length + ' features' : 'no servers';
    }
    if (!ui.adoption) return;
    if (!guilds.length) {
      ui.adoption.replaceChildren(el('p', { className: 'ad-empty', text: 'Kernel is not in any server, so there is nothing to compare.' }));
      return;
    }
    const totals = el('div', { className: 'ad-adopt-totals' }, ...features.map((feature) => el('span', {
      className: 'ad-adopt-tag' + (feature.guilds ? ' is-on' : ''),
      text: feature.label + ' · ' + feature.guilds + '/' + guilds.length,
    })));
    const rows = guilds.map((guild) => {
      const tags = guild.features
        .filter((feature) => feature.on)
        .map((feature) => el('span', { className: 'ad-adopt-tag is-on', text: feature.label }));
      return el('div', { className: 'ad-row' },
        el('div', { className: 'ad-row-main' },
          el('div', { className: 'ad-row-name', text: guild.name }),
          el('div', { className: 'ad-row-meta', text: guild.on + '/' + guild.total + ' features · ' + numberFormat.format(guild.members || 0) + ' members' }),
          el('div', { className: 'ad-adopt-list' }, ...tags)),
        el('span', { className: 'ad-row-meta', text: Math.round((guild.on / guild.total) * 100) + '%' }));
    });
    ui.adoption.replaceChildren(totals, ...rows);
  }

  async function loadAdoption() {
    try {
      renderAdoption(await get('/api/owner/adoption'));
      setStatus(ui.adoptStatus, '');
    } catch (error) {
      if (error.session) throw error;
      if (ui.adoptCount) ui.adoptCount.textContent = 'unavailable';
      toolMissing(ui.adoption, 'Feature adoption');
    }
  }

  async function saveBuildNow() {
    setStatus(ui.buildStatus, 'Copying the running source…');
    try {
      const data = await request('POST', '/api/owner/builds', {});
      renderBuilds({ running: data.version, keep: 5, builds: data.builds });
      setStatus(ui.buildStatus, 'Saved ' + data.name + ' · ' + data.files + ' file(s).', 'ok');
      loadAudit();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.buildStatus, error.message, 'bad');
    }
  }

  async function restoreBuild(row) {
    setStatus(ui.buildStatus, 'Restoring ' + row.name + '…');
    try {
      const data = await request('POST', '/api/owner/builds/restore', { name: row.name, confirm: ui.buildConfirm ? ui.buildConfirm.value : '' });
      setStatus(ui.buildStatus, 'Source restored from ' + data.restored + ' · restart Kernel to run it. A pre-restore copy is at ' + data.safety + '.', 'ok');
      await loadBuilds();
      if (ui.buildConfirm) ui.buildConfirm.value = '';
      loadAudit();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.buildStatus, error.message, 'bad');
    }
  }

  async function deleteBuild(row) {
    setStatus(ui.buildStatus, 'Deleting…');
    try {
      await request('POST', '/api/owner/builds/delete', { name: row.name, confirm: ui.buildConfirm ? ui.buildConfirm.value : '' });
      setStatus(ui.buildStatus, 'Deleted ' + row.name + '.', 'ok');
      await loadBuilds();
      loadAudit();
    } catch (error) {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      setStatus(ui.buildStatus, error.message, 'bad');
    }
  }

  /* ------------------------------------------------------------------- load */

  // The site and the bot are uploaded separately, so a page newer than the running build must say
  // which tool is missing instead of failing the whole console.
  function toolMissing(node, label) {
    node.replaceChildren(el('p', { className: 'ad-empty', text: label + ' is not in this bot build yet. Update the bot.' }));
  }

  async function loadJobs() {
    try {
      renderJobs(await get('/api/owner/jobs'));
    } catch (error) {
      if (error.session) throw error;
      ui.jobsCount.textContent = 'unavailable';
      toolMissing(ui.jobs, 'The job monitor');
    }
  }

  async function loadCoverage() {
    try {
      renderCoverage(await get('/api/owner/coverage'));
    } catch (error) {
      if (error.session) throw error;
      ui.gapsCount.textContent = 'unavailable';
      toolMissing(ui.gaps, 'The coverage list');
    }
  }

  async function loadPresence() {
    try {
      const data = await get('/api/owner/presence');
      renderPresence(data.presence);
    } catch (error) {
      if (error.session) throw error;
      ui.presenceSource.textContent = 'unavailable';
      ui.presenceNow.textContent = 'The status editor is not in this bot build yet. Update the bot.';
    }
  }

  async function loadAdmin() {
    try {
      renderAdmin(await get('/api/owner/admin'));
    } catch (error) {
      if (error.session) throw error;
      ui.adminState.textContent = 'unavailable';
      ui.routes.replaceChildren(el('p', {
        className: 'ad-empty',
        text: 'Admin-server routing is not in this bot build yet. Update the bot.',
      }));
    }
  }

  async function loadJoins(quiet) {
    const guildId = ui.joinsGuild ? ui.joinsGuild.value : '';
    if (!guildId) return;
    try {
      const data = await get('/api/owner/joins?guild=' + encodeURIComponent(guildId) + '&limit=15');
      renderJoins(data);
    } catch (error) {
      if (error.session || error.denied) throw error;
      if (!quiet) {
        ui.joins.replaceChildren(el('p', { className: 'ad-empty', text: error.message }));
        ui.joinsNote.textContent = 'Kernel could not list members for this server.';
      }
    }
  }

  async function cancelJob(job) {
    if (!window.confirm('Cancel "' + job.kind + '" in ' + job.guildName + '?')) return;
    try {
      await request('POST', '/api/owner/jobs/cancel?guild=' + encodeURIComponent(job.guildId)
        + '&id=' + encodeURIComponent(job.id));
      await loadJobs();
    } catch (error) {
      window.alert(error.message);
    }
  }

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
      populateToolSelects();
      await Promise.all([loadLogs(), loadJobs(), loadCoverage(), loadPresence(), loadAdmin(), loadControl(), loadAudit(), loadBackups(), loadErrors(), loadScorecard(), loadScheduled(), loadWatch(), loadBuilds(), loadInbox(), loadUsage(), loadAdoption()]);
      if (!silent) {
        await loadJoins(true);
        await loadSettings();
        await loadDigest();
        await loadEconomy();
        await loadLayout();
      }
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

    const report = (error) => {
      if (error.session) return gate('Your Discord session expired. Log in again.');
      if (error.denied) return show('denied');
      window.alert(error.message);
    };

    if (ui.joinsGuild) {
      ui.joinsGuild.addEventListener('change', () => loadJoins(false).catch(report));
    }
    if (ui.joinsRefresh) {
      ui.joinsRefresh.addEventListener('click', () => loadJoins(false).catch(report));
    }

    [ui.presenceLines, ui.presenceRotate, ui.presenceSeconds].forEach((field) => {
      if (!field) return;
      field.addEventListener('input', () => { state.presenceTouched = true; });
      field.addEventListener('change', () => { state.presenceTouched = true; });
    });

    if (ui.presenceForm) {
      ui.presenceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        ui.presenceStatus.className = 'ad-status';
        ui.presenceStatus.textContent = 'Applying…';
        try {
          const lines = ui.presenceLines.value.split('\n').map((line) => line.trim()).filter(Boolean);
          const data = await request('PUT', '/api/owner/presence', {
            rotate: ui.presenceRotate.checked,
            seconds: Number(ui.presenceSeconds.value) || 20,
            lines,
          });
          state.presenceTouched = false;
          renderPresence(data.presence);
          ui.presenceStatus.className = 'ad-status is-ok';
          ui.presenceStatus.textContent = 'Applied — the bot is showing it now.';
        } catch (error) {
          ui.presenceStatus.className = 'ad-status is-bad';
          ui.presenceStatus.textContent = error.message;
        }
      });
    }

    if (ui.presenceReset) {
      ui.presenceReset.addEventListener('click', async () => {
        ui.presenceStatus.className = 'ad-status';
        ui.presenceStatus.textContent = 'Restoring…';
        try {
          const data = await request('PUT', '/api/owner/presence', { reset: true });
          state.presenceTouched = false;
          renderPresence(data.presence);
          ui.presenceStatus.className = 'ad-status is-ok';
          ui.presenceStatus.textContent = 'Back to the lines set in the bot environment.';
        } catch (error) {
          ui.presenceStatus.className = 'ad-status is-bad';
          ui.presenceStatus.textContent = error.message;
        }
      });
    }

    if (ui.adminGuild) {
      ui.adminGuild.addEventListener('change', () => { state.adminGuildTouched = true; });
    }

    if (ui.adminSave) {
      ui.adminSave.addEventListener('click', async () => {
        ui.adminStatus.className = 'ad-status';
        ui.adminStatus.textContent = 'Saving…';
        try {
          const data = await request('PUT', '/api/owner/admin', { guildId: ui.adminGuild.value });
          state.adminGuildTouched = false;
          renderAdmin(data);
          ui.adminStatus.className = 'ad-status is-ok';
          ui.adminStatus.textContent = 'Admin server saved. Channels from the old server were dropped.';
        } catch (error) {
          ui.adminStatus.className = 'ad-status is-bad';
          ui.adminStatus.textContent = error.message;
        }
      });
    }

    if (ui.boardRefresh) {
      ui.boardRefresh.addEventListener('click', async () => {
        ui.adminStatus.className = 'ad-status';
        ui.adminStatus.textContent = 'Refreshing the status board…';
        try {
          const data = await request('POST', '/api/owner/admin/board');
          renderAdmin(data.admin || {});
          ui.adminStatus.className = 'ad-status is-ok';
          ui.adminStatus.textContent = data.message || 'Status board refreshed.';
        } catch (error) {
          ui.adminStatus.className = 'ad-status is-bad';
          ui.adminStatus.textContent = error.message;
        }
      });
    }

    if (ui.testForm) {
      ui.testForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        ui.testStatus.className = 'ad-status';
        ui.testStatus.textContent = 'Running…';
        try {
          const data = await request('POST', '/api/owner/tester', {
            guildId: ui.testGuild ? ui.testGuild.value : '',
            text: ui.testText.value,
          });
          ui.testStatus.textContent = '';
          renderTest(data);
        } catch (error) {
          ui.testStatus.className = 'ad-status is-bad';
          ui.testStatus.textContent = error.message;
        }
      });
    }

    if (ui.switchGuild) {
      ui.switchGuild.addEventListener('change', () => renderControl(state.control || { guilds: [] }));
    }
    if (ui.block) ui.block.addEventListener('click', () => toggleBlock());
    ui.resyncButtons.forEach((button) => {
      button.addEventListener('click', () => resync(button.dataset.adResync));
    });
    if (ui.settingsGuild) {
      ui.settingsGuild.addEventListener('change', () => { loadSettings().catch(report); });
    }
    if (ui.settingsField) ui.settingsField.addEventListener('change', renderSettingsValue);
    if (ui.settingsSave) ui.settingsSave.addEventListener('click', () => { saveSetting(); });
    if (ui.auditRefresh) ui.auditRefresh.addEventListener('click', () => { loadAudit().catch(report); });

    [ui.broadcastTitle, ui.broadcastDesc, ui.broadcastColor, ui.broadcastFooter].forEach((field) => {
      if (!field) return;
      field.addEventListener('input', updatePreview);
      field.addEventListener('change', updatePreview);
    });
    if (ui.broadcastForm) ui.broadcastForm.addEventListener('submit', sendBroadcast);

    if (ui.backupNow) ui.backupNow.addEventListener('click', () => { createBackup(); });
    if (ui.diagRun) ui.diagRun.addEventListener('click', () => { loadDiagnostics(); });
    if (ui.errorsClear) ui.errorsClear.addEventListener('click', () => { clearErrors(); });
    if (ui.doctorRun) ui.doctorRun.addEventListener('click', () => { runDoctor(); });

    if (ui.scoreRun) ui.scoreRun.addEventListener('click', () => { loadScorecard(); });
    if (ui.usageRefresh) ui.usageRefresh.addEventListener('click', () => { loadUsage().catch(report); });
    if (ui.adoptRefresh) ui.adoptRefresh.addEventListener('click', () => { loadAdoption().catch(report); });
    if (ui.digestGuild) {
      ui.digestGuild.addEventListener('change', () => { loadDigest().catch(report); });
    }
    if (ui.ecoGuild) {
      ui.ecoGuild.addEventListener('change', () => { loadEconomy().catch(report); });
    }
    if (ui.ecoApply) ui.ecoApply.addEventListener('click', () => { applyEconomy(); });
    if (ui.layoutGuild) {
      ui.layoutGuild.addEventListener('change', () => {
        loadLayout().catch(report);
        if (ui.rehearsal) ui.rehearsal.replaceChildren();
      });
    }
    if (ui.layoutSave) ui.layoutSave.addEventListener('click', () => { saveLayoutPoint(); });
    if (ui.layoutRestore) ui.layoutRestore.addEventListener('click', () => { restoreLayout(); });
    if (ui.rehearse) ui.rehearse.addEventListener('click', () => { runRehearsal(); });

    if (ui.schedRefresh) ui.schedRefresh.addEventListener('click', () => { loadScheduled().catch(report); });
    if (ui.schedAdd) ui.schedAdd.addEventListener('click', () => { addScheduled(); });
    if (ui.watchAdd) ui.watchAdd.addEventListener('click', () => { addWatch(); });
    if (ui.watchScope) {
      ui.watchScope.addEventListener('change', () => {
        if (ui.watchGuild) ui.watchGuild.disabled = ui.watchScope.value !== 'one';
      });
      if (ui.watchGuild) ui.watchGuild.disabled = ui.watchScope.value !== 'one';
    }
    if (ui.buildSave) ui.buildSave.addEventListener('click', () => { saveBuildNow(); });
    if (ui.inboxRefresh) ui.inboxRefresh.addEventListener('click', () => { loadInbox().catch(report); });

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
