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
