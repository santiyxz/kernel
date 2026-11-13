/* ============================================================================
   Docs — copy a command straight from the page.
   Only command references (table cells and list items that start with "/")
   get a button; prose stays prose.
   ========================================================================== */

'use strict';

(function () {
  const body = document.querySelector('.doc-body');
  if (!body) return;

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true, () => false);
    }
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }
    field.remove();
    return Promise.resolve(ok);
  }

  Array.from(body.querySelectorAll('td code, li code')).forEach((code) => {
    const command = code.textContent.trim();
    if (!command.startsWith('/')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'doc-copy';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy ' + command);
    button.addEventListener('click', async () => {
      const ok = await copyText(command);
      button.textContent = ok ? 'Copied' : 'Ctrl+C';
      button.classList.toggle('is-done', ok);
      window.setTimeout(() => {
        button.textContent = 'Copy';
        button.classList.remove('is-done');
      }, 1600);
    });
    code.after(button);
  });
})();
