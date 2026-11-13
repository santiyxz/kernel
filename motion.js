/* ============================================================================
   Kernel motion + interactive demos.
   Everything degrades to readable static content with JS off.
   ========================================================================== */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ------------------------------------------------------------------- tilt */

  function setupTilt() {
    if (reduce.matches || !window.matchMedia('(hover:hover)').matches) return;
    document.querySelectorAll('[data-tilt]').forEach((node) => {
      let rect = null;
      const strength = Number(node.dataset.tilt) || 10;

      function move(event) {
        if (!rect) rect = node.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        node.style.transform =
          'perspective(900px) rotateY(' + (px * strength).toFixed(2) + 'deg) rotateX(' +
          (-py * strength).toFixed(2) + 'deg) translateZ(0)';
      }

      function reset() {
        rect = null;
        node.style.transform = '';
      }

      node.addEventListener('pointerenter', () => {
        rect = node.getBoundingClientRect();
      });
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerleave', reset);
    });
  }

  /* -------------------------------------------------------------- count-ups */

  function formatCompact(value) {
    const number = Number(value) || 0;
    if (number >= 1000) {
      return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(number);
    }
    return String(Math.round(number));
  }

  function countUp(node) {
    if (node.dataset.counted === 'true') return;
    node.dataset.counted = 'true';
    const target = Number(node.dataset.countTo) || 0;
    const compact = node.dataset.format === 'compact';
    if (reduce.matches || target <= 0) {
      node.textContent = compact ? formatCompact(target) : String(target);
      return;
    }
    const run = (now) => {
      const t = Math.min(1, (now - started) / 900);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = target * eased;
      node.textContent = compact ? formatCompact(value) : String(Math.round(value));
      if (t < 1) window.requestAnimationFrame(run);
    };
    const started = performance.now();
    window.requestAnimationFrame(run);
  }

  function watchCounters() {
    const nodes = Array.from(document.querySelectorAll('[data-count-to]'))
      .filter((node) => node.dataset.counted !== 'true');
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(countUp);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    nodes.forEach((node) => io.observe(node));
  }

  /* ------------------------------------------------------------ word reveal */

  function splitWords() {
    if (reduce.matches) return;
    document.querySelectorAll('[data-words]').forEach((node) => {
      if (node.dataset.wordsDone) return;
      const words = String(node.textContent || '').trim().split(/\s+/);
      // Real space nodes keep the title readable to screen readers and when copied. The old
      // margin-based spacing split it into one run-on word for both.
      const parts = [];
      words.forEach((word, index) => {
        if (index) parts.push(document.createTextNode(' '));
        const span = el('span', 'word', word);
        span.style.setProperty('--word-i', String(index));
        parts.push(span);
      });
      node.replaceChildren(...parts);
      node.dataset.wordsDone = 'true';
      node.classList.add('is-split');
    });
  }

  /* --------------------------------------------------------- command demo */

  const DEMO_REPLIES = {
    '/antinuke status': {
      title: 'Kernel · monitoring',
      desc: 'The guard is awake and has a recent restore point.',
      fields: [
        ['Mode', 'Monitoring only'],
        ['Snapshot', '11 channels · 7 roles'],
        ['Last snapshot', 'just now'],
        ['Auto-response', 'off — arm it with /antinuke config'],
      ],
      footer: 'Case record untouched · no action taken',
    },
    '/ban @eighty raiding': {
      title: 'Member banned',
      desc: 'eighty was banned by you.',
      fields: [
        ['Reason', 'raiding'],
        ['Case', '#1042'],
        ['Chain head', '3654a1ade9bf…'],
      ],
      footer: 'Ledger entry written · /cases verify will confirm it',
    },
    '/warn @eighty spam': {
      title: 'Warning recorded',
      desc: 'eighty now has 2 open warnings.',
      fields: [
        ['Reason', 'spam'],
        ['Escalation', '1 more before a 10m timeout'],
        ['Case', '#1043'],
      ],
      footer: 'Warnings escalate on their own',
    },
    '/timeout @eighty 10m': {
      title: 'Member timed out',
      desc: 'eighty cannot talk for 10 minutes.',
      fields: [
        ['Case', '#1044'],
        ['Expires', 'in 10 minutes'],
      ],
      footer: 'Removed automatically when the timer ends',
    },
    '/lock': {
      title: 'Channel locked',
      desc: '#general is closed for @everyone.',
      fields: [
        ['Overwrite', 'Send Messages · denied'],
        ['Unlock with', '/unlock'],
      ],
    },
    '/slowmode 5s': {
      title: 'Slowmode set',
      desc: 'Members wait 5 seconds between messages in #general.',
      fields: [['Applies to', '@everyone']],
    },
    '/purge 20': {
      title: '20 messages removed',
      desc: 'The last 20 messages in #general are gone.',
      fields: [['Requested by', 'you'], ['Audit', 'logged to #kernel-logs']],
    },
    '/cases verify': {
      title: 'Chain intact',
      desc: 'Every case still matches the entry before it.',
      fields: [
        ['Cases chained', '1'],
        ['Head', '3654a1ade9bf…'],
        ['Mirrored in meta.json', 'yes'],
      ],
      footer: 'This does not prove a case was never created',
    },
    '/verification setup': {
      title: 'Verification ready',
      desc: 'The maths gate is configured for this server.',
      fields: [
        ['Gate', 'button + maths question'],
        ['Waiting room', 'configured'],
        ['Status', 'readiness check passed'],
      ],
    },
    '/security audit': {
      title: 'Security audit',
      desc: 'Readiness scored from the settings Kernel can actually check.',
      fields: [
        ['Score', '8 / 10'],
        ['Administrator holders', '2'],
        ['Alerts reachable', 'yes'],
      ],
      footer: 'The output names what the check cannot prove',
    },
  };

  function buildReply(command, reply) {
    const card = el('div', 'dc-msg');
    const row = el('div', 'dc-row');
    const avatar = el('span', 'dc-avatar', 'K');
    avatar.setAttribute('aria-hidden', 'true');
    const body = el('div', 'dc-body');

    const head = el('p', 'dc-head');
    head.append(el('b', 'dc-name', 'Kernel'), el('span', 'dc-app', 'APP'), el('span', 'dc-time', 'today'));
    body.append(head);

    const embed = el('div', 'dc-embed');
    embed.append(el('p', 'dc-embed-title', reply.title));
    if (reply.desc) embed.append(el('p', 'dc-embed-desc', reply.desc));
    (reply.fields || []).forEach(([name, value]) => {
      const field = el('p', 'dc-field');
      field.append(el('span', null, name), el('b', null, value));
      embed.append(field);
    });
    embed.append(el('p', 'dc-foot', reply.footer || 'Demo reply — the real one comes from Kernel in Discord'));
    body.append(embed);

    row.append(avatar, body);
    card.append(row);
    card.dataset.command = command;
    return card;
  }

  function setupCommandDemo() {
    const root = document.querySelector('[data-demo-cmd]');
    if (!root) return;
    const input = root.querySelector('[data-demo-cmd-input]');
    const form = root.querySelector('form');
    const log = root.querySelector('[data-demo-log]');
    const chips = Array.from(root.querySelectorAll('[data-demo-chip]'));
    let busy = false;

    async function run(raw) {
      if (busy) return;
      const text = String(raw || '').trim().replace(/^\/?/, '/');
      if (!text || text === '/') return;
      busy = true;
      if (input) input.value = '';

      const line = el('p', 'dc-line');
      line.append(el('span', 'dc-caret', '›'), el('code', null, text));
      const hint = log.querySelector('.dc-hint');
      if (hint) hint.remove();
      log.append(line);
      log.scrollTop = log.scrollHeight;
      while (log.children.length > 6) log.firstElementChild.remove();

      const reply = DEMO_REPLIES[text.toLowerCase()];
      const typing = el('p', 'dc-typing', 'Kernel is typing');
      typing.setAttribute('aria-hidden', 'true');
      log.append(typing);
      await wait(reduce.matches ? 120 : 520);
      typing.remove();

      if (reply) {
        log.append(buildReply(text, reply));
      } else {
        const miss = el('div', 'dc-msg dc-miss');
        const body = el('div', 'dc-body');
        body.append(el('p', 'dc-head', 'Kernel'));
        body.append(el('p', 'dc-miss-text',
          'That one is not part of the demo. Try /ban, /warn, /timeout, /lock, /slowmode, /purge 20, ' +
          '/antinuke status, /cases verify, /security audit or /verification setup.'));
        miss.append(body);
        log.append(miss);
      }
      log.scrollTop = log.scrollHeight;
      busy = false;
    }

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        run(input ? input.value : '');
      });
    }
    chips.forEach((chip) => {
      chip.addEventListener('click', () => run(chip.dataset.demoChip));
    });
    if (input) input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      run(input.value);
    });
  }

  /* ---------------------------------------------------------- attack demo */

  const ATTACKS = {
    channels: {
      verb: 'deleted 3 channels',
      target: '#general · #media · #rules',
      detect: 'burst detected · 3 deletions in 12s',
      punish: 'executor banned · roles stripped',
      restore: '3 channels rebuilt from the snapshot',
      proof: 'names, topics, positions and overwrites restored',
    },
    bans: {
      verb: 'banned 5 members',
      target: 'five accounts in one sweep',
      detect: 'mass ban detected · 5 in 20s',
      punish: 'executor banned · token of the bot removed',
      restore: 'bans lifted where the audit log proves they were forced',
      proof: 'the five members are back in the server',
    },
    roles: {
      verb: 'created 10 roles',
      target: 'ten roles with Administrator',
      detect: 'role burst detected · 10 in 15s',
      punish: 'executor kicked · new roles deleted',
      restore: 'role list restored to the last snapshot',
      proof: 'positions and colours match the snapshot',
    },
    webhooks: {
      verb: 'added 6 webhooks',
      target: 'six hooks aimed at an outside server',
      detect: 'webhook sweep detected · 6 created',
      punish: 'executor banned · webhooks removed',
      restore: 'existing hooks left untouched',
      proof: 'the audit trail is written to #kernel-logs',
    },
  };

  function setupAttackDemo() {
    const root = document.querySelector('[data-demo-attack]');
    if (!root) return;
    const buttons = Array.from(root.querySelectorAll('[data-attack]'));
    const log = root.querySelector('[data-demo-attack-log]');
    const reset = root.querySelector('[data-demo-attack-reset]');
    let running = false;

    function addStep(kind, title, detail) {
      const step = el('div', 'atk-step atk-step--' + kind);
      const dot = el('span', 'atk-dot');
      dot.setAttribute('aria-hidden', 'true');
      const text = el('div', 'atk-text');
      text.append(el('b', null, title), el('span', null, detail));
      step.append(dot, text);
      log.append(step);
      log.scrollTop = log.scrollHeight;
      return step;
    }

    async function play(key) {
      if (running) return;
      const data = ATTACKS[key];
      if (!data) return;
      running = true;
      root.classList.add('is-playing');
      log.replaceChildren();
      buttons.forEach((button) => { button.disabled = true; });
      const gap = reduce.matches ? 150 : 700;

      addStep('bad', 'Rogue executor', data.verb + ' — ' + data.target);
      await wait(gap);
      addStep('scan', 'Kernel noticed', data.detect);
      await wait(gap);
      addStep('stop', 'Executor stopped', data.punish);
      await wait(gap);
      addStep('fix', 'Server rebuilt', data.restore);
      await wait(gap);
      addStep('done', 'Written to the log', data.proof + ' · case #1045');

      const card = el('div', 'dc-msg atk-report');
      const row = el('div', 'dc-row');
      row.append(el('span', 'dc-avatar', 'K'));
      const body = el('div', 'dc-body');
      body.append(el('p', 'dc-head', 'Kernel'));
      const embed = el('div', 'dc-embed');
      embed.append(el('p', 'dc-embed-title', 'Anti-nuke response complete'));
      const field = (name, value) => {
        const p = el('p', 'dc-field');
        p.append(el('span', null, name), el('b', null, value));
        embed.append(p);
      };
      field('Trigger', data.detect);
      field('Executor', 'stopped and banned');
      field('Restore', 'verified against the snapshot');
      field('Case', '#1045');
      embed.append(el('p', 'dc-foot', 'Demo — armed servers do this without you opening a dashboard'));
      body.append(embed);
      row.append(body);
      card.append(row);
      log.append(card);
      log.scrollTop = log.scrollHeight;

      running = false;
      root.classList.remove('is-playing');
      buttons.forEach((button) => { button.disabled = false; });
    }

    buttons.forEach((button) => {
      button.addEventListener('click', () => play(button.dataset.attack));
    });
    if (reset) {
      reset.addEventListener('click', () => {
        if (running) return;
        log.replaceChildren(el('p', 'atk-hint', 'Pick an attack above and watch the response, step by step.'));
      });
    }
  }

  /* ---------------------------------------------------------- automod demo */

  const RULES = {
    invites: {
      label: 'Discord invites',
      samples: ['join my server discord.gg/free-nitro-now', 'last chance → discord.gg/x9f2k'],
      reason: 'Invite link',
      action: 'message removed · 10m timeout',
    },
    caps: {
      label: 'Caps flood',
      samples: ['WHY IS NOBODY ANSWERING ME RIGHT NOW', 'FREE MONEY FREE MONEY FREE MONEY'],
      reason: 'More than 70% caps',
      action: 'message removed · warning recorded',
    },
    links: {
      label: 'Suspicious links',
      samples: ['claim your prize at kernel-drop.win/claim', 'verify your account: kernel-login.top'],
      reason: 'Link not on the allow list',
      action: 'message removed · link quarantined',
    },
    mentions: {
      label: 'Mention flood',
      samples: ['@everyone @everyone @everyone @everyone', 'hey @here @here @here look at this'],
      reason: 'More than 5 mentions',
      action: 'message removed · 10m timeout',
    },
    spam: {
      label: 'Message spam',
      samples: ['buy now buy now buy now buy now buy now', 'aaaaa aaaaa aaaaa aaaaa aaaaa'],
      reason: '6 messages in 5 seconds',
      action: 'messages removed · 1h timeout',
    },
  };

  function setupAutomodDemo() {
    const root = document.querySelector('[data-demo-auto]');
    if (!root) return;
    const rules = Array.from(root.querySelectorAll('[data-rule]'));
    const chat = root.querySelector('[data-demo-auto-chat]');
    const note = root.querySelector('[data-demo-auto-result]');
    const run = root.querySelector('[data-demo-auto-run]');
    const stateEl = root.querySelector('[data-demo-auto-rule]');
    let current = 'invites';
    let busy = false;

    function renderRule() {
      rules.forEach((rule) => {
        const on = rule.dataset.rule === current;
        rule.classList.toggle('is-active', on);
        rule.setAttribute('aria-pressed', String(on));
      });
      if (stateEl) stateEl.textContent = RULES[current].label;
    }

    async function simulate() {
      if (busy) return;
      busy = true;
      if (run) run.disabled = true;
      const rule = RULES[current];
      const sample = rule.samples[Math.floor(Math.random() * rule.samples.length)];
      chat.replaceChildren();

      const msg = el('div', 'chat-msg');
      msg.append(el('span', 'chat-avatar', 'R'));
      const body = el('div', 'chat-body');
      body.append(el('p', 'chat-head', 'random_member'));
      body.append(el('p', 'chat-text', sample));
      msg.append(body);
      chat.append(msg);
      if (note) { note.hidden = true; note.replaceChildren(); }

      await wait(reduce.matches ? 100 : 900);
      msg.classList.add('is-blocked');

      const card = el('div', 'chat-action');
      card.append(el('span', 'chat-action-icon', '×'));
      const text = el('div', 'chat-action-text');
      text.append(el('b', null, rule.reason));
      text.append(el('span', null, rule.action));
      card.append(text);
      chat.append(card);

      if (note) {
        note.hidden = false;
        note.replaceChildren(
          el('b', null, 'Rule matched: ' + rule.label),
          el('span', null, 'Kernel caught this with the ' + rule.label.toLowerCase() +
            ' rule before anyone had to report it. Nothing here reaches a real server — this is a ' +
            'simulated channel.'),
        );
      }
      busy = false;
      if (run) run.disabled = false;
    }

    rules.forEach((rule) => {
      rule.addEventListener('click', () => {
        if (busy) return;
        current = rule.dataset.rule;
        renderRule();
      });
    });
    if (run) run.addEventListener('click', simulate);
    renderRule();
  }

  /* ------------------------------------------------------------------ boot */

  function boot() {
    setupTilt();
    watchCounters();
    setupCommandDemo();
    setupAttackDemo();
    setupAutomodDemo();
    // app.js fills the hero totals after its fetch; animate them when they arrive.
    document.addEventListener('kernel:counters', watchCounters);

    // site-content.js may replace the hero copy, so split after it settles.
    const ready = window.KernelSite && window.KernelSite.ready ? window.KernelSite.ready : Promise.resolve();
    Promise.race([ready, wait(1200)]).then(splitWords).catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
