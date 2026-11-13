/* ============================================================================
   Kernel — shared contact/message form.
   Used by profile.html and contact.html. No account, no token: it posts to the
   public endpoint, which stores the message in the owner console and sends a DM.
   ========================================================================== */

'use strict';

(function () {
  const base = typeof window.KERNEL_API_BASE === 'string'
    ? window.KERNEL_API_BASE.trim().replace(/\/+$/, '')
    : '';

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MAX_BODY = 4000;

  function setStatus(el, text, state) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('is-ok', 'is-bad');
    if (state) el.classList.add('is-' + state);
  }

  function value(form, name) {
    const field = form.elements.namedItem(name);
    return field ? String(field.value || '').trim() : '';
  }

  function invalidField(form, name) {
    const field = form.elements.namedItem(name);
    if (field) field.setAttribute('aria-invalid', 'true');
    return { field, message: name };
  }

  function validate(form) {
    form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));

    const name = value(form, 'name');
    const email = value(form, 'email');
    const subject = value(form, 'subject');
    const body = value(form, 'body');

    if (name.length < 2 || name.length > 60) {
      const bad = invalidField(form, 'name');
      return { ...bad, message: 'Tell me your name (2–60 characters).' };
    }
    if (!EMAIL.test(email) || email.length > 120) {
      const bad = invalidField(form, 'email');
      return { ...bad, message: 'That email address does not look right.' };
    }
    if (subject.length < 3 || subject.length > 120) {
      const bad = invalidField(form, 'subject');
      return { ...bad, message: 'Give the message a subject (3–120 characters).' };
    }
    if (body.length < 10 || body.length > MAX_BODY) {
      const bad = invalidField(form, 'body');
      return { ...bad, message: 'Write between 10 and 4000 characters.' };
    }
    return null;
  }

  function mount(form) {
    const status = form.querySelector('[data-contact-status]');
    const submit = form.querySelector('[data-contact-submit]');
    const counter = form.querySelector('[data-contact-count]');
    const body = form.elements.namedItem('body');

    function count() {
      if (!counter || !body) return;
      counter.textContent = body.value.length + ' / ' + MAX_BODY;
      counter.classList.toggle('is-over', body.value.length > MAX_BODY);
    }
    if (body) body.addEventListener('input', count);
    count();

    // A report link from the reviews page arrives as ?subject=…&body=…. Only empty fields are
    // filled, so a stale link never overwrites something the person already typed.
    const params = new URLSearchParams(window.location.search);
    const preSubject = String(params.get('subject') || '').slice(0, 120);
    const preBody = String(params.get('body') || '').slice(0, MAX_BODY);
    const subjectField = form.elements.namedItem('subject');
    if (preSubject && subjectField && !subjectField.value) subjectField.value = preSubject;
    if (preBody && body && !body.value) {
      body.value = preBody;
      count();
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (form.dataset.busy === '1') return;

      const problem = validate(form);
      if (problem) {
        setStatus(status, problem.message, 'bad');
        if (problem.field && typeof problem.field.focus === 'function') problem.field.focus();
        return;
      }

      if (!base) {
        setStatus(status, 'The message endpoint is not configured yet (api-config.js). Nothing was sent.', 'bad');
        return;
      }

      const payload = {
        name: value(form, 'name'),
        email: value(form, 'email'),
        subject: value(form, 'subject'),
        body: value(form, 'body'),
        company: value(form, 'company'),
      };
      const dev = String(form.dataset.dev || '').trim();
      if (dev === 'founder' || dev === 'teammate') payload.dev = dev;

      form.dataset.busy = '1';
      if (submit) submit.disabled = true;
      setStatus(status, 'Sending…', '');

      try {
        const response = await fetch(base + '/api/public/messages', {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': '1',
          },
          body: JSON.stringify(payload),
        });

        let result = null;
        try { result = await response.json(); } catch (error) { /* a proxy page is not JSON */ }

        if (!response.ok) {
          const message = result && result.error && result.error.message
            ? result.error.message
            : 'The message could not be sent (' + response.status + '). Try again in a minute.';
          throw new Error(message);
        }

        form.reset();
        count();
        setStatus(status, 'Sent. It is in the owner inbox now, and a Discord notification goes out too.', 'ok');
      } catch (error) {
        setStatus(status, error.message || 'Could not reach Kernel. Check your connection and try again.', 'bad');
      } finally {
        form.dataset.busy = '0';
        if (submit) submit.disabled = false;
      }
    });
  }

  document.querySelectorAll('[data-contact-form]').forEach(mount);
})();
