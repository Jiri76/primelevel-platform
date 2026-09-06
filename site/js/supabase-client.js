// Shared Supabase client for the PrimeLevel Platform site.
//
// The key below is the "publishable" key — it is meant to be public and
// safe to ship in client-side code. Real security is enforced entirely
// by Postgres Row Level Security policies on the database itself (see
// docs/DATA_MODEL.md) — this key alone grants no access to anything.
const SUPABASE_URL = 'https://aujxoyyuyjlsjhnzlrpc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_HlWUWF4qJt8cjkcAkqmhVw_pXs7OT--';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Shared helper: every signed-in page (everything except index/signin/
// reset-password) calls this on load. Redirects to sign-in if there's
// no real session. Also enforces the per-person "web dashboard access"
// toggle — a simplicity control, not a security boundary (a Member's
// actual data permissions are identical on the app or the dashboard;
// this just keeps the web UI to people the Owner wants using it).
// Returns { session, membership } on success, or null (after
// redirecting) on failure.
async function requireSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'signin.html';
    return null;
  }

  const { data: membership, error } = await supabaseClient
    .from('account_members')
    .select('account_id, role, web_dashboard_access, accounts(business_name)')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !membership) {
    window.location.href = 'signin.html';
    return null;
  }

  if (membership.role !== 'owner' && !membership.web_dashboard_access) {
    await supabaseClient.auth.signOut();
    window.location.href = 'signin.html?no_dashboard_access=1';
    return null;
  }

  return { session, membership };
}

// Shared helper: shows a trial-ended banner where needed. Two different,
// both-true messages — never threatens to delete real data, since the
// actual cleanup mechanism only ever removes completely empty accounts
// (see cleanup_abandoned_trial_accounts on the database). Call this
// after requireSession() on any signed-in page; it inserts the banner
// at the top of <main> if (and only if) it's actually needed.
async function showTrialBannerIfNeeded(accountId) {
  const { data: account } = await supabaseClient
    .from('accounts')
    .select('trial_ends_at, subscription_status')
    .eq('id', accountId)
    .maybeSingle();

  if (!account) return;
  const trialOver = new Date(account.trial_ends_at) < new Date();
  if (!trialOver || account.subscription_status !== 'trialing') return;

  const [{ count: invoiceCount }, { count: clientCount }, { count: renewalCount }] = await Promise.all([
    supabaseClient.from('invoices').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
    supabaseClient.from('clients').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
    supabaseClient.from('renewal_items').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
  ]);
  const hasRealData = (invoiceCount || 0) + (clientCount || 0) + (renewalCount || 0) > 0;

  const message = hasRealData
    ? "Your 14-day trial has ended. Your account is now read-only — sign in anytime to view or export your invoices and clients. <b>Your account will be permanently deleted after 30 days</b> if you don't subscribe. Subscribe to start creating invoices again."
    : "Your 14-day trial has ended. Since nothing's been added yet, this account will be <b>automatically deleted in 7 days</b> if it stays inactive — come back anytime before then to keep it.";

  const banner = document.createElement('div');
  banner.setAttribute('role', 'status');
  banner.style.cssText = 'background:var(--warn-bg,#F6E7DE); color:var(--warn,#B4552B); border-radius:10px; padding:14px 18px; margin-bottom:20px; font-size:13.5px; line-height:1.5;';
  banner.innerHTML = message;

  const main = document.querySelector('main');
  if (main) main.insertBefore(banner, main.firstChild);
}

// Shared helper: adds a show/hide eye toggle to every password field on
// the page. Call once, after the form's HTML exists (scripts already run
// after the body markup on every page here, so no DOMContentLoaded wait
// is needed). Safe to call even if there are zero or several password
// fields on the page.
const EYE_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function wirePasswordToggles() {
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.dataset.toggleWired) return;
    input.dataset.toggleWired = '1';

    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    // The button's own right edge sits at the same 13px inset as the
    // input's own left text-padding (see each page's `input{ padding:11px
    // 13px }` rule), so the icon's gap from the right edge visually
    // matches the text's gap from the left edge. paddingRight leaves room
    // for that gap plus the button's own box (18px icon + 4px padding each
    // side = 26px) plus a small buffer before the typed text.
    input.style.paddingRight = '45px';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Show password');
    btn.style.cssText = 'position:absolute; right:13px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; padding:4px; display:flex; align-items:center; color:var(--text-faint); opacity:0.75;';
    btn.innerHTML = EYE_ICON;
    wrap.appendChild(btn);

    btn.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.innerHTML = showing ? EYE_ICON : EYE_OFF_ICON;
      btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    });
  });
}

// Shared helper: wires up any element with [data-sign-out] to sign the
// user out and return to the Welcome page.
function wireSignOut() {
  document.querySelectorAll('[data-sign-out]').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      window.location.href = 'index.html';
    });
  });
}
