(function () {
  'use strict';

  const list = document.querySelector('[data-reviews-list]');
  if (!list) return;

  const empty = document.querySelector('[data-reviews-empty]');
  const countEl = document.querySelector('[data-review-count]');
  const gate = document.querySelector('[data-review-gate]');
  const form = document.querySelector('[data-review-form]');
  const statusEl = document.querySelector('[data-review-status]');
  const submit = document.querySelector('[data-review-submit]');
  const charEl = document.querySelector('[data-review-count-char]');
  const textarea = form ? form.querySelector('textarea[name="body"]') : null;
  const apiBase = (window.KERNEL_API_BASE || '').replace(/\/$/, '');
  const auth = window.KernelAuth;

  const session = auth && typeof auth.session === 'function' ? auth.session() : null;
  if (session) {
    if (gate) gate.hidden = true;
    if (form) form.hidden = false;
  }

  function stars(rating) {
    const n = Math.max(1, Math.min(5, Number(rating) || 0));
    return '\u2605'.repeat(n) + '\u2606'.repeat(5 - n);
  }

  function initials(name) {
    return String(name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  function timeAgo(iso) {
    const then = Date.parse(iso);
    if (!Number.isFinite(then)) return '';
    const mins = Math.round((Date.now() - then) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + ' min ago';
    const hours = Math.round(mins / 60);
    if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    const days = Math.round(hours / 24);
    if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
    return new Date(then).toLocaleDateString('en', { month: 'short', year: 'numeric' });
  }

  function card(review) {
    const article = document.createElement('article');
    article.className = 'review-card';

    const head = document.createElement('div');
    head.className = 'review-head';

    const avatar = document.createElement('span');
    avatar.className = 'review-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = initials(review.username);

    const id = document.createElement('div');
    id.className = 'review-id';
    const name = document.createElement('p');
    name.className = 'review-name';
    name.textContent = review.username || 'Discord user';
    const meta = document.createElement('p');
    meta.className = 'review-meta';
    meta.textContent = [review.serverName, timeAgo(review.createdAt)].filter(Boolean).join(' \u00b7 ');
    id.append(name, meta);

    const rating = document.createElement('span');
    rating.className = 'review-stars';
    rating.setAttribute('aria-label', (Number(review.rating) || 0) + ' out of 5');
    rating.textContent = stars(review.rating);

    head.append(avatar, id, rating);

    const body = document.createElement('p');
    body.className = 'review-body';
    body.textContent = review.body || '';

    article.append(head, body);
    return article;
  }

  // The empty card is page markup, not user input. Keep it so a failed request can be undone.
  const emptyMarkup = empty ? empty.innerHTML : '';

  function render(reviews) {
    const items = Array.isArray(reviews) ? reviews.filter((r) => r && r.body) : [];
    list.querySelectorAll('.review-card').forEach((node) => node.remove());
    if (empty) {
      empty.innerHTML = emptyMarkup;
      empty.hidden = items.length > 0;
    }

    items.slice(0, 30).forEach((review) => list.append(card(review)));

    if (countEl) {
      countEl.textContent = items.length
        ? `${items.length} ${items.length === 1 ? 'review' : 'reviews'} \u00b7 newest first`
        : 'No reviews yet \u00b7 be the first';
    }
  }

  // The bot answers { error: { code, message } }, an older build may answer { error: 'text' },
  // and a proxy can answer HTML. Always end up with one readable sentence, never "[object Object]".
  function errorText(payload, status) {
    const raw = payload && payload.error;
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    if (raw && typeof raw.message === 'string' && raw.message.trim()) return raw.message.trim();
    if (status === 401) return 'Log in with Discord first.';
    if (status === 404) return 'This Kernel build does not publish reviews yet.';
    if (status === 429) return 'Too many requests. Wait a minute and try again.';
    if (status >= 500) return 'Kernel had an error on its side. Try again in a moment.';
    return 'The API refused the request (HTTP ' + status + ').';
  }

  // A failed read is not the same as an empty list: say the list is unavailable instead of
  // claiming nobody has reviewed Kernel.
  function unavailable(reason) {
    list.querySelectorAll('.review-card').forEach((node) => node.remove());
    if (empty) {
      empty.hidden = false;
      const title = document.createElement('b');
      title.textContent = 'Reviews are unavailable right now.';
      empty.replaceChildren(
        title,
        ' ' +
          (reason ||
            'Kernel could not be reached, so nothing is shown rather than pretending the list is empty.'),
      );
    }
    if (countEl) countEl.textContent = 'Reviews unavailable';
  }

  async function load() {
    if (!apiBase) {
      unavailable();
      return;
    }
    try {
      // ngrok's free plan answers browser-like requests with an HTML warning unless this
      // header is present; without it the browser blocks the HTML response entirely.
      const response = await fetch(apiBase + '/api/public/reviews', {
        cache: 'no-store',
        headers: { 'ngrok-skip-browser-warning': '1' },
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          unavailable('The bot behind this page has not been updated with reviews yet.');
          return;
        }
        unavailable(
          response.status === 502 || response.status === 503
            ? 'Kernel is restarting or offline, so the list cannot load.'
            : 'Kernel answered with an error, so the list cannot load.',
        );
        return;
      }
      const data = await response.json();
      render(data && data.reviews);
    } catch (error) {
      unavailable();
    }
  }

  if (textarea && charEl) {
    textarea.addEventListener('input', () => {
      charEl.textContent = textarea.value.length + ' / 600';
    });
  }

  if (form && session) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (statusEl) statusEl.textContent = '';
      const data = new FormData(form);
      const rating = Number(data.get('rating'));
      const body = String(data.get('body') || '').trim();
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        if (statusEl) statusEl.textContent = 'Pick a rating between 1 and 5.';
        return;
      }
      if (body.length < 20) {
        if (statusEl) statusEl.textContent = 'Write at least 20 characters so the review says something.';
        return;
      }

      if (submit) submit.disabled = true;
      try {
        const response = await fetch(apiBase + '/api/reviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': '1',
            Authorization: 'Bearer ' + session.accessToken,
          },
          body: JSON.stringify({
            rating,
            body,
            company: String(data.get('company') || ''),
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 401) {
            if (statusEl) statusEl.textContent = 'Your session expired. Log in again, then publish the review.';
            return;
          }
          throw new Error(errorText(payload, response.status));
        }
        form.reset();
        if (charEl) charEl.textContent = '0 / 600';
        if (statusEl) statusEl.textContent = 'Published. Thanks — it is live below.';
        await load();
      } catch (error) {
        if (statusEl) {
          statusEl.textContent =
            error instanceof TypeError
              ? 'Could not reach the API. Check the status page and try again.'
              : (error && error.message) || 'Something went wrong. Try again.';
        }
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  }

  load();
})();
