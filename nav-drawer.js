/* Mobile menu for the sub-pages (premium, contact, status, dashboard). */

(function () {
  const burger = document.getElementById('burger');
  const drawer = document.getElementById('drawer');
  if (!burger || !drawer) return;

  function setOpen(open) {
    drawer.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('drawer-open', open);
  }

  burger.addEventListener('click', function () {
    setOpen(burger.getAttribute('aria-expanded') !== 'true');
  });
  drawer.addEventListener('click', function (event) {
    if (event.target === drawer) setOpen(false);
  });
  drawer.addEventListener('click', function (event) {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setOpen(false);
  });
})();
