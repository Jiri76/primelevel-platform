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
