/* ============================================================================
   Kernel — Discord login.
   The browser talks to Discord directly: no password form, no token on our
   server. The access token lives in sessionStorage for this tab only.
   ========================================================================== */

'use strict';

window.KernelAuth = (function () {
  const CLIENT_ID = '1568161408875495524';
  const SCOPES = ['identify', 'guilds'];
  const API = 'https://discord.com/api/v10';
  const SESSION_KEY = 'kernel.discord.session';
  const STATE_KEY = 'kernel.discord.state';

  function storage() {
    try {
      const probe = '__kernel_probe__';
      window.sessionStorage.setItem(probe, '1');
      window.sessionStorage.removeItem(probe);
      return window.sessionStorage;
    } catch (error) {
      return null;
    }
  }

  const store = storage();

  function redirectUri() {
    const url = new URL('dashboard.html', window.location.href);
    url.hash = '';
    url.search = '';
    return url.href;
  }

  function randomState() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID().replace(/-/g, '');
    }
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function loginUrl() {
    const params = new URLSearchParams();
    params.set('client_id', CLIENT_ID);
    params.set('response_type', 'token');
    params.set('redirect_uri', redirectUri());
    params.set('scope', SCOPES.join(' '));

    if (store) {
      const state = randomState();
      store.setItem(STATE_KEY, state);
      params.set('state', state);
    }

    return 'https://discord.com/oauth2/authorize?' + params.toString().replace(/\+/g, '%20');
  }

  function readSession() {
    if (!store) return null;
    let raw;
    try {
      raw = store.getItem(SESSION_KEY);
    } catch (error) {
      return null;
    }
    if (!raw) return null;

    try {
      const session = JSON.parse(raw);
      if (!session || typeof session.accessToken !== 'string' || !session.accessToken) return null;
      if (!Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now() + 10000) {
        clearSession();
        return null;
      }
      return session;
    } catch (error) {
      clearSession();
      return null;
    }
  }

  function saveSession(session) {
    if (store) store.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    if (!store) return;
    store.removeItem(SESSION_KEY);
    store.removeItem(STATE_KEY);
  }

  /* Reads #access_token=... from the redirect, stores it, then removes it from
     the address bar so it does not sit in history. */
  function consumeCallback() {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return null;

    const params = new URLSearchParams(hash.slice(1));
    const token = params.get('access_token');
    const error = params.get('error');
    if (!token && !error) return null;

    const result = {
      ok: false,
      error: error || '',
      description: params.get('error_description') || '',
    };

    if (token) {
      const expected = store ? store.getItem(STATE_KEY) : '';
      const actual = params.get('state') || '';
      if (store && (!expected || expected !== actual)) {
        result.error = 'state';
        result.description = 'The login response could not be verified. Please try again.';
      } else {
        const expiresIn = Number(params.get('expires_in')) || 3600;
        saveSession({
          accessToken: token,
          tokenType: params.get('token_type') || 'Bearer',
          scope: params.get('scope') || SCOPES.join(' '),
          expiresAt: Date.now() + expiresIn * 1000 - 60000,
        });
        result.ok = true;
      }
    }

    if (store) store.removeItem(STATE_KEY);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return result;
  }

  async function api(path, token) {
    const response = await fetch(API + path, {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = new Error('Discord API ' + response.status);
      error.status = response.status;
      if (response.status === 401) clearSession();
      throw error;
    }

    return response.json();
  }

  return {
    clientId: CLIENT_ID,
    redirectUri,
    loginUrl,
    session: readSession,
    clearSession,
    consumeCallback,
    api,
  };
})();
