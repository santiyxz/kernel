/* ============================================================================
   Kernel — owner-only nav link.
   The link ships hidden in the HTML. It is revealed only after the bot confirms
   that the signed-in Discord id is the owner; a 404 (everyone else) leaves it
   invisible, so nothing hints that the console exists.
   ========================================================================== */

'use strict';

(function () {
  const links = Array.from(document.querySelectorAll('[data-owner-link]'));
  if (!links.length) return;

  const auth = window.KernelAuth;
  if (!auth) return;

  const session = auth.session();
  if (!session) return;

  const base = typeof window.KERNEL_API_BASE === 'string' ? window.KERNEL_API_BASE.trim().replace(/\/+$/, '') : '';
  if (!base) return;

  fetch(base + '/api/owner', {
    cache: 'no-store',
    headers: {
      Authorization: 'Bearer ' + session.accessToken,
      // ngrok's free domains answer browser requests with a warning page without this.
      'ngrok-skip-browser-warning': '1',
    },
  })
    .then((response) => {
      if (!response.ok) return;
      links.forEach((link) => {
        link.hidden = false;
      });
    })
    .catch(() => {
      /* signed out, offline or the bot is down: staying hidden is the safe answer */
    });
})();
