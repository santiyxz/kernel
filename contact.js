/* ============================================================================
   Kernel — Contact page.
   People cards and public links come from developers.js, so editing one file
   updates the cards on the home page, the profiles and this page together.
   ========================================================================== */

'use strict';

(function () {
  const dev = window.KernelDev;
  if (!dev) return;

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  const mount = document.querySelector('[data-contact-devs]');
  if (mount) {
    const profiles = dev.config.profiles || {};
    const keys = Object.keys(profiles);
    mount.replaceChildren();

    if (!keys.length) {
      const empty = document.createElement('p');
      empty.className = 'pr-card-note';
      empty.textContent = 'No developer profiles are configured yet.';
      mount.append(empty);
    }

    keys.forEach((key) => {
      const profile = profiles[key];
      if (!profile) return;

      const card = document.createElement('article');
      card.className = 'ct-person';

      const initials = document.createElement('span');
      initials.className = 'ct-person-avatar';
      initials.setAttribute('aria-hidden', 'true');
      initials.textContent = profile.initials || String(profile.name || '?').slice(0, 2).toUpperCase();

      const main = document.createElement('div');
      main.className = 'ct-person-main';
      const name = document.createElement('b');
      name.textContent = profile.name || 'Developer';
      const role = document.createElement('span');
      role.className = 'ct-person-role';
      role.textContent = profile.tagline || profile.role || '';
      const links = document.createElement('div');
      links.className = 'ct-person-links';

      const profileLink = document.createElement('a');
      profileLink.href = 'profile.html?dev=' + encodeURIComponent(key);
      profileLink.textContent = 'Profile';
      links.append(profileLink);

      const messageLink = document.createElement('a');
      messageLink.href = 'profile.html?dev=' + encodeURIComponent(key) + '#message';
      messageLink.textContent = 'Message';
      links.append(messageLink);

      main.append(name, role, links);
      card.append(initials, main);
      mount.append(card);
    });
  }

  const social = document.querySelector('[data-contact-social]');
  const socialNote = document.querySelector('[data-contact-links-note]');
  if (social) {
    const profiles = dev.config.profiles || {};
    const seen = new Set();
    const rows = [];

    Object.keys(profiles).forEach((key) => {
      const profile = profiles[key];
      (profile && Array.isArray(profile.links) ? profile.links : []).forEach((link) => {
        if (!link || !link.label || !/^https?:\/\//i.test(String(link.href || ''))) return;
        if (seen.has(link.href)) return;
        seen.add(link.href);
        rows.push(link);
      });
    });

    social.replaceChildren(...rows.map((row) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = row.href;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = row.label;
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      link.append(arrow);
      item.append(link);
      return item;
    }));

    if (socialNote) socialNote.hidden = rows.length > 0;
  }

  const mail = document.querySelector('[data-contact-mail]');
  if (mail) {
    const profiles = dev.config.profiles || {};
    const emails = [];
    Object.keys(profiles).forEach((key) => {
      const profile = profiles[key];
      const email = profile && typeof profile.email === 'string' ? profile.email.trim() : '';
      if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && !emails.includes(email)) emails.push(email);
    });

    if (emails.length) {
      mail.hidden = false;
      mail.textContent = 'Or email ';
      emails.forEach((email, index) => {
        const link = document.createElement('a');
        link.href = 'mailto:' + email;
        link.textContent = email;
        mail.append(link);
        if (index < emails.length - 1) mail.append(document.createTextNode(' · '));
      });
      mail.append(document.createTextNode('. It is the same inbox the chat box uses.'));
    }
  }
})();
