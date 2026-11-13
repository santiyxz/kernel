/* ============================================================================
   Kernel UI kit — custom select control and press feedback.

   Every native <select> becomes a styled trigger with a listbox drawn by the
   page. The native select stays in the DOM (hidden from view and from the tab
   order) so existing form reads, .value writes and change listeners keep
   working. Selects created later by page scripts are picked up automatically.
   ========================================================================== */
(function () {
  'use strict';

  if (window.KernelUI) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const records = new Map();
  let menuSeq = 0;
  let openRec = null;
  let typeahead = '';
  let typeaheadAt = 0;

  const CHEVRON =
    '<svg class="ui-select-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
    '<path d="M4 6.4 8 10.4l4-4" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CHECK =
    '<svg class="ui-select-check" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
    '<path d="M3.4 8.4 6.3 11.2l6.3-6.5" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function visibleOptions(select) {
    return Array.from(select.options).filter((option) => !option.hidden);
  }

  function placeholderValue(select) {
    const option = select.options[select.selectedIndex];
    return !option || option.value === '';
  }

  function fieldName(select) {
    const label = select.closest('label');
    const holder = label || select.closest('.ad-field, .mg-field, .mg-picker');
    if (holder) {
      const span = holder.querySelector('span, legend');
      if (span) return span.textContent.trim();
    }
    return select.getAttribute('aria-label') || '';
  }

  function sync(select) {
    const rec = records.get(select);
    if (!rec) return;
    const option = select.options[select.selectedIndex];
    const text = option ? option.text : '';
    rec.value.textContent = text || '—';
    rec.value.classList.toggle('is-placeholder', placeholderValue(select));
    rec.btn.disabled = select.disabled;
    rec.btn.title = text;
    const name = rec.name;
    if (name) rec.btn.setAttribute('aria-label', name + ': ' + (text || 'nothing selected'));
    const hidden = select.hidden || select.style.display === 'none';
    rec.wrap.hidden = Boolean(select.hidden);
    rec.wrap.classList.toggle('is-hidden', hidden);
    if (openRec === rec) refreshMenu(rec);
  }

  function build(select) {
    if (records.has(select)) return records.get(select);
    if (select.multiple || Number(select.size) > 1) return null;
    if (select.dataset.uiSelect === '1') return null;
    if (!select.parentNode) return null;

    const name = fieldName(select);
    const wrap = document.createElement('span');
    wrap.className = 'ui-select';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-select-btn';
    btn.setAttribute('role', 'combobox');
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    const value = document.createElement('span');
    value.className = 'ui-select-value';
    btn.innerHTML = CHEVRON;
    btn.insertBefore(value, btn.firstChild);

    const rec = { select, wrap, btn, value, name, menu: null, active: -1, id: 'ui-select-' + (menuSeq += 1) };
    records.set(select, rec);
    select.dataset.uiSelect = '1';
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    select.parentNode.insertBefore(wrap, select);
    wrap.append(select, btn);

    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (openRec === rec) closeMenu();
      else openMenu(rec);
    });
    btn.addEventListener('keydown', (event) => {
      if (openRec === rec) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openMenu(rec);
      }
    });
    select.addEventListener('focus', () => btn.focus());
    select.addEventListener('change', () => sync(select));
    select.addEventListener('input', () => sync(select));

    sync(select);
    return rec;
  }

  function optionRows(select) {
    const rows = [];
    let group = null;
    Array.from(select.children).forEach((child) => {
      if (child.tagName === 'OPTGROUP') {
        group = { label: child.label, rows: [] };
        rows.push({ group });
        Array.from(child.children).forEach((option) => {
          if (option.tagName !== 'OPTION' || option.hidden) return;
          const row = { option, index: Array.prototype.indexOf.call(select.options, option) };
          group.rows.push(row);
          rows.push(row);
        });
        group = null;
        return;
      }
      if (child.tagName !== 'OPTION' || child.hidden) return;
      rows.push({ option: child, index: Array.prototype.indexOf.call(select.options, child) });
    });
    // Options added straight to .options (rare) are still covered.
    if (!rows.some((row) => row.option)) {
      visibleOptions(select).forEach((option) => rows.push({ option, index: option.index }));
    }
    return rows.filter((row) => row.option || row.group);
  }

  function findRow(rec, index) {
    return rec.rows.find((row) => row.option && row.index === index) || null;
  }

  function markActive(rec, row, scroll) {
    if (!rec.menu) return;
    rec.rows.forEach((item) => {
      if (item.el) item.el.classList.toggle('is-active', item === row);
    });
    rec.active = row ? row.index : -1;
    if (row && row.el) {
      rec.btn.setAttribute('aria-activedescendant', row.el.id);
      const menu = rec.menu;
      if (scroll && menu) {
        const top = row.el.offsetTop;
        const bottom = top + row.el.offsetHeight;
        if (top < menu.scrollTop) menu.scrollTop = top - 6;
        else if (bottom > menu.scrollTop + menu.clientHeight) menu.scrollTop = bottom - menu.clientHeight + 6;
      }
    } else {
      rec.btn.removeAttribute('aria-activedescendant');
    }
  }

  function refreshMenu(rec) {
    if (!rec.menu) return;
    rec.rows = optionRows(rec.select);
    const frag = document.createDocumentFragment();
    rec.rows.forEach((row, i) => {
      if (row.group) {
        const head = document.createElement('div');
        head.className = 'ui-select-group';
        head.textContent = row.group.label;
        row.el = head;
        frag.append(head);
        return;
      }
      const item = document.createElement('div');
      item.className = 'ui-select-opt';
      item.id = rec.id + '-opt-' + i;
      item.setAttribute('role', 'option');
      const selected = row.index === rec.select.selectedIndex;
      item.setAttribute('aria-selected', selected ? 'true' : 'false');
      item.classList.toggle('is-selected', selected);
      item.classList.toggle('is-placeholder', row.option.value === '');
      item.classList.toggle('is-disabled', row.option.disabled);
      const label = document.createElement('span');
      label.className = 'ui-select-opt-label';
      label.textContent = row.option.text;
      item.append(label);
      if (selected) item.insertAdjacentHTML('beforeend', CHECK);
      item.addEventListener('pointermove', () => markActive(rec, row, false));
      item.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        commit(rec, row);
      });
      row.el = item;
      frag.append(item);
    });
    rec.menu.replaceChildren(frag);
    const selectedRow = findRow(rec, rec.select.selectedIndex);
    markActive(rec, selectedRow, true);
  }

  function placeMenu(rec) {
    if (!rec.menu) return;
    const rect = rec.btn.getBoundingClientRect();
    const gap = 6;
    const edge = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    rec.menu.style.minWidth = Math.max(168, Math.round(rect.width)) + 'px';
    const mw = rec.menu.offsetWidth;
    const mh = rec.menu.offsetHeight;
    let left = Math.min(Math.max(edge, rect.left), vw - mw - edge);
    let top = rect.bottom + gap;
    let side = 'down';
    if (top + mh > vh - edge && rect.top - mh - gap > edge) {
      top = rect.top - mh - gap;
      side = 'up';
    }
    rec.menu.style.left = Math.round(left) + 'px';
    rec.menu.style.top = Math.round(top) + 'px';
    rec.menu.dataset.side = side;
  }

  function openMenu(rec) {
    if (openRec && openRec !== rec) closeMenu();
    if (!rec.menu) {
      rec.menu = document.createElement('div');
      rec.menu.className = 'ui-select-menu';
      rec.menu.id = rec.id + '-menu';
      rec.menu.setAttribute('role', 'listbox');
      rec.menu.addEventListener('click', (event) => event.stopPropagation());
      document.body.append(rec.menu);
    }
    rec.btn.setAttribute('aria-controls', rec.menu.id);
    rec.btn.setAttribute('aria-expanded', 'true');
    rec.btn.classList.add('is-open');
    rec.menu.classList.add('is-open');
    openRec = rec;
    refreshMenu(rec);
    placeMenu(rec);
    document.addEventListener('pointerdown', onOutside, true);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
  }

  function closeMenu() {
    const rec = openRec;
    if (!rec) return;
    openRec = null;
    if (rec.menu) {
      rec.menu.classList.remove('is-open');
      rec.menu.remove();
      rec.menu = null;
    }
    rec.btn.classList.remove('is-open');
    rec.btn.setAttribute('aria-expanded', 'false');
    rec.btn.removeAttribute('aria-activedescendant');
    document.removeEventListener('pointerdown', onOutside, true);
    window.removeEventListener('resize', onViewportChange);
    window.removeEventListener('scroll', onViewportChange, true);
  }

  function commit(rec, row) {
    if (!row || row.option.disabled) return;
    const select = rec.select;
    const changed = select.selectedIndex !== row.index;
    select.selectedIndex = row.index;
    sync(select);
    closeMenu();
    rec.btn.focus();
    if (changed) {
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function onOutside(event) {
    const rec = openRec;
    if (!rec) return;
    if (rec.wrap.contains(event.target) || (rec.menu && rec.menu.contains(event.target))) return;
    closeMenu();
  }

  function onViewportChange() {
    const rec = openRec;
    if (!rec) return;
    const rect = rec.btn.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      closeMenu();
      return;
    }
    placeMenu(rec);
  }

  function moveActive(rec, step) {
    const rows = rec.rows.filter((row) => row.option && !row.option.disabled);
    if (!rows.length) return;
    const current = rows.findIndex((row) => row.index === rec.active);
    const next = current < 0
      ? (step > 0 ? 0 : rows.length - 1)
      : (current + step + rows.length) % rows.length;
    markActive(rec, rows[next], true);
  }

  function onKey(event) {
    const rec = openRec;
    if (!rec) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      rec.btn.focus();
      return;
    }
    if (event.key === 'Tab') {
      closeMenu();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(rec, 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(rec, -1);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const rows = rec.rows.filter((row) => row.option && !row.option.disabled);
      const row = event.key === 'Home' ? rows[0] : rows[rows.length - 1];
      if (row) markActive(rec, row, true);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const row = findRow(rec, rec.active);
      if (row) commit(rec, row);
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      typeahead = now - typeaheadAt > 700 ? event.key : typeahead + event.key;
      typeaheadAt = now;
      const needle = typeahead.toLowerCase();
      const rows = rec.rows.filter((row) => row.option && !row.option.disabled);
      const hit = rows.find((row) => row.option.text.toLowerCase().startsWith(needle));
      if (hit) markActive(rec, hit, true);
    }
  }

  document.addEventListener('keydown', onKey, true);

  function scan(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const selects = scope.querySelectorAll('select');
    selects.forEach((select) => build(select));
    if (scope instanceof HTMLSelectElement) build(scope);
  }

  if (document.body) scan();
  else document.addEventListener('DOMContentLoaded', () => scan(), { once: true });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.target instanceof HTMLSelectElement) {
        sync(mutation.target);
        return;
      }
      if (mutation.type !== 'childList') return;
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.tagName === 'SELECT' && !node.dataset.uiSelect) build(node);
        else if (node.querySelectorAll) scan(node);
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Some panels assign .value directly without touching the option list.
  window.setInterval(() => {
    if (document.hidden) return;
    records.forEach((rec, select) => {
      if (rec.btn.disabled !== select.disabled) sync(select);
      else if (rec.value.textContent !== (select.options[select.selectedIndex] || {}).text) sync(select);
    });
  }, 500);

  // Pointer ripple for the console controls. The public buttons get the same
  // press state from CSS; this adds a ripple that starts where you clicked.
  document.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const target = event.target.closest('.btn, .ui-select-btn, .ad-tab, .mg-tabs button, .rt-chip, [data-ripple]');
    if (!target || target.disabled) return;
    if (reduce.matches) return;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement('span');
    ripple.className = 'ui-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = Math.round(event.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = Math.round(event.clientY - rect.top - size / 2) + 'px';
    if (getComputedStyle(target).position === 'static') target.classList.add('ui-ripple-host');
    target.append(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }, { passive: true });

  window.KernelUI = {
    refresh: () => scan(document),
    close: closeMenu,
  };
})();
