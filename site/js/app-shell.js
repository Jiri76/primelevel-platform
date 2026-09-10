// PrimeLevel Platform — app shell + client-side navigation.
//
// Every signed-in page (dashboard + the 8 app pages) is still a complete,
// standalone HTML document: a direct link or a refresh loads it fully and
// it works on its own. On top of that, this file turns navigation BETWEEN
// those pages into a client-side content swap — the .rail and .topbar DOM
// stay mounted, only <main> is replaced. That is the same model Supabase's
// own dashboard uses, and it means the rail's collapse/expand is plain CSS
// :hover again: there is no page reload to interrupt it, so no persistence
// trickery is needed.
//
// Load order on each page: supabase-client.js, then this file, then the
// page's own inline <script>.

(function () {
  'use strict';

  // ---- session cache -------------------------------------------------------
  // requireSession() (from supabase-client.js) does a getSession() call plus a
  // membership query. We only need that once per real page load; client-side
  // navigations reuse the cached result. A full reload re-checks, as before.
  window.__APP_SESSION = window.__APP_SESSION || null;
  window.__SHELL_WIRED = window.__SHELL_WIRED || false;

  // ---- what counts as an in-app link ------------------------------------------
  const APP_PAGES = new Set([
    'dashboard.html', 'invoices.html', 'payments.html', 'insights.html',
    'renewals.html', 'settings.html', 'invoice-new.html', 'plans.html',
  ]);

  function samePageName(url) {
    try {
      const u = new URL(url, location.href);
      if (u.origin !== location.origin) return null;
      const name = u.pathname.split('/').pop();
      return APP_PAGES.has(name) ? name : null;
    } catch (e) { return null; }
  }

  // ---- the swap ----------------------------------------------------------------
  let navToken = 0;

  async function navigate(href, { push = true } = {}) {
    const myToken = ++navToken;
    const url = new URL(href, location.href);

    let html;
    try {
      const res = await fetch(url.href, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      html = await res.text();
    } catch (e) {
      // Network / fetch failure: fall back to a normal full navigation so the
      // user is never stuck. Nothing fragile — it just becomes a page load.
      window.location.href = url.href;
      return;
    }
    if (myToken !== navToken) return; // a newer navigation superseded this one

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const freshMain = doc.querySelector('main');
    const currentMain = document.querySelector('main');
    if (!freshMain || !currentMain) {
      window.location.href = url.href; // structure we don't recognise — full load
      return;
    }

    // Swap <main>.
    currentMain.replaceWith(freshMain);

    // Title.
    document.title = doc.title || document.title;

    // Active rail item.
    const targetName = url.pathname.split('/').pop();
    document.querySelectorAll('.rail-item').forEach((a) => {
      const n = (a.getAttribute('href') || '').split('/').pop();
      a.classList.toggle('active', n === targetName);
    });

    // History.
    if (push) history.pushState({ spa: true }, '', url.href);

    // Reset scroll, like a real navigation.
    window.scrollTo(0, 0);

    // Re-run the new page's own inline <script>, wrapped in an IIFE so its
    // top-level const/function declarations can't collide with the previous
    // page's. It reads only globals that supabase-client.js / this file
    // already define, plus AppShell.session below.
    const pageScript = [...doc.querySelectorAll('body script:not([src])')].pop();
    if (pageScript && pageScript.textContent.trim()) {
      const s = document.createElement('script');
      s.textContent = '(function(){\n' + pageScript.textContent + '\n})();';
      document.body.appendChild(s);
      s.remove();
    }
  }

  // ---- click interception ----------------------------------------------------
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey ||
        e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download') || a.hasAttribute('data-sign-out')) return;
    if (!samePageName(a.href)) return;
    e.preventDefault();
    if (new URL(a.href, location.href).href === location.href) return; // same page
    navigate(a.href, { push: true });
  });

  window.addEventListener('popstate', () => {
    if (samePageName(location.href)) navigate(location.href, { push: false });
  });

  // ---- public surface for page scripts --------------------------------------
  // A page's bootstrap does:  const s = await AppShell.session();
  window.AppShell = {
    async session() {
      if (!window.__APP_SESSION) {
        window.__APP_SESSION = await requireSession(); // may redirect + return null
      }
      return window.__APP_SESSION;
    },
    // True while a client-side navigation is re-running a page script, so a
    // page's bootstrap can tell the difference from a cold load if it ever
    // needs to. (Not currently required, but cheap to expose.)
    get navigating() { return navToken > 0; },
  };
})();
