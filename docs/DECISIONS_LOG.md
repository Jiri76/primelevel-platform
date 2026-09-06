# PrimeLevel Platform — Decisions Log

Running record of decisions made in conversation, in order, separate from
the original kickoff brief (`ORIGINAL_BRIEF.md`, kept verbatim/unedited)
and the technical designs that implement them (`DATA_MODEL.md`,
`APP_CHANGES_NEEDED.md`). Where this log and the original brief disagree,
this log wins — it's newer — but check back against the brief for the
reasoning behind anything that seems to have changed.

## 2026-09-05 — project setup

- **New, separate project.** This is a clean new project
  (`primelevel-platform/`), not a modification of the existing
  `primelevel-app`, `primelevel-renewals`, or `primelevel-dashboard`
  repos. Nothing in those existing repos has been touched, deleted, or
  changed as part of this work — explicit instruction, treated as an
  absolute.
- Existing work is meant to be **drawn from and reused where it fits**,
  not ignored — specifically: the real, tested fields and validation
  logic from `primelevel-app`'s `JobFormScreen.js` / `jobs` table, and the
  proven multi-tenant Supabase auth (magic-link, RLS-isolated) pattern
  already live on "Renewals." Both are being reused deliberately, not
  coincidentally similar.
- The 5 mockup HTML files (Dashboard, Invoices, Payments, Insights,
  Settings) were copied into `mockups/` in this new project so they're
  safe regardless of what happens to the original Downloads copies.
  Upgrade and Welcome screens exist only as Claude Artifact links so far,
  not yet pulled in as local files.

## Scale and cost

- Realistic near-term scale: **up to ~10 people**, with the very first
  real usage being the user themself plus **~3 friends testing it**,
  likely over a period of months, before deciding whether to move
  forward for real.
- **Use Supabase's free tier** for now, given that scale — no need to pay
  for infrastructure headroom the project won't use for a long time.

## Pricing figures

- The £25 / £99 / £149 / £229 figures throughout the brief are **all
  placeholders** — "just rough ideas... I haven't decided yet how much I
  need to price it." Real pricing will be its own separate decision later,
  once the product actually works. Don't spend more effort refining these
  specific numbers for now — build the mechanism, not the final price
  list.

## Compliance / legal

- **Deferred, not a priority right now.** No lawyers wanted at this
  stage — the user will either research this themselves, ask Claude
  Cowork to do some research, or revisit it with Claude Code later. The
  design should be built with good, defensible privacy practices (see
  the postcode decision below) but formal legal sign-off is explicitly
  out of scope for now.
- This covers the k-anonymity threshold's exact number (20 vs. 30 — see
  `DATA_MODEL.md`) and any other genuinely legal question (e.g. UK GDPR
  specifics) — provisional, sensible defaults now, real review later.

## Auth / multi-user account model

- **Rejected**: a shared "linking number" that multiple phones/devices
  enter to access one account (the user's own initial idea). Reasoning
  given and accepted: a shared secret is a real security anti-pattern (if
  it leaks, anyone with it has full permanent access with no way to know
  who's actually using it, and no way to revoke just one person) — and
  it's not even simpler than the alternative.
- **Decided instead**: each real person gets their **own individual
  login** (Supabase Auth — email/password or magic link), and multiple
  people can belong to the same business `account` via a membership
  table. This is safer (individually revocable, attributable) AND more
  frictionless (no special code to type, same login everywhere) than the
  original idea, and reuses the exact pattern already proven live on
  "Renewals."
- **Real scenario confirmed**: e.g. three plumbers (Mr A, Mr B, Mr C),
  each with their own phone, all needing access to one shared business
  account. Solved by: the account owner invites each by email from
  Settings → Team; each sets their own login; all write against the same
  shared `account_id`.

## Roles — Owner vs. Member

- **Explicit requirement**: employees (Members) can create and send
  invoices, and every invoice should be traceable to who sent it ("this
  invoice was sent by John"). Only the account Owner can mark an invoice
  paid, or make other account-level changes. Reasoning given: this also
  covers a real risk (an employee who leaves shouldn't have been able to
  touch payment state or account settings while they had access).
- Implemented as a `role` column (`owner` / `member`) on the new
  `account_members` table, enforced by Postgres Row Level Security — not
  just hidden in the UI. Full permissions table in `DATA_MODEL.md`.
- Two rows in that permissions table (Insights-tab viewing, data export)
  were **not** explicitly specified in the brief — filled in as sensible
  defaults (both roles can view Insights; only Owner exports), flagged
  for a later look, not urgent.

## Existing invoice/job template

- Confirmed: the "invoice" being referred to as "already checked and
  authorised" is the real, working `jobs` table + `JobFormScreen.js` form
  in `primelevel-app`, built during the earlier Supabase migration work —
  not a separate document or Google Sheet template.
- Its real fields and validation logic (client name/phone/email, amount
  sanitisation to 2 decimal places, job date with past-date confirmation,
  payment status buttons) are being reused directly, not redesigned.
- **Any changes needed in that app must preserve the existing visual
  design exactly** — colors, padding, layout, and style are locked
  ("we spent a lot of time on it"). Every change identified is additive
  (new fields, same existing input style) or backend/logic-only, never a
  redesign. Full list in `APP_CHANGES_NEEDED.md`.

## Location data for pooling

- **Decided**: capture the client's **postcode only** — no separate
  street-address field. The current app has run real jobs with no address
  field at all, so this isn't actually a blocker for real usage; adding a
  full address would be scope creep toward a dispatch/scheduling tool,
  which PrimeLevel isn't trying to be. It's also a smaller, safer amount
  of personal data to hold.
- The full postcode is what gets typed in once, on the `clients` record.
  Only its **outward code** (e.g. "SE1" from "SE1 4UX") is ever derived
  and used for pooling/Insights — the full postcode never leaves that
  business's own private records.

## 2026-09-06 — sign-in method and domain (supersedes the auth line above)

- **Auth method changed: Password + "Forgot password" reset, not magic
  link.** The auth/multi-user *account model* above (individual logins,
  membership table, Owner/Member roles) stands unchanged — this only
  changes *how* someone proves who they are. Reasoning: password sign-up
  is what customers already expect from "a proper platform," and — once
  built on Supabase Auth (bcrypt hashing, rate-limited attempts,
  short-lived single-use reset links) — it's genuinely no less secure
  than a magic link, just more familiar. A full advantages/disadvantages
  comparison was written up as `Password_vs_MagicLink_Basics.pdf` for
  reference.
- **Domain: the platform will live at a subdomain, `app.primelevel.co.uk`**,
  once DNS is pointed at GitHub Pages — not the bare `primelevel.co.uk`.
  Keeps the root domain free for a possible future plain marketing page,
  and is a single DNS record either way, easily changed later if needed.
- **Confirmed: no Framer, no React/framework of any kind.** The existing
  plain HTML/CSS/JS + GitHub Pages + Supabase pattern (same as Renewals
  and Masterboard) is reliable enough on its own and is what stays.

## Supabase project for real backend wiring

- A **new, dedicated Supabase project** was created for this reason
  exactly (keeping Renewals/Masterboard's project completely untouched):
  name `primelevel-platform`, reference `aujxoyyuyjlsjhnzlrpc`, region
  West Europe (London), free tier. "Automatically expose new tables" was
  turned **off** and "Enable automatic RLS" turned **on** at creation —
  both deliberately, so any new table defaults to locked-down rather than
  open until real access rules exist for it.
- As of this entry, the schema/RLS/auth-screen build itself has **not
  started yet** — the Supabase connector needed reconnecting to point at
  this new project instead of the old one, and that reconnection needs a
  fresh Claude conversation to actually take effect. See the
  `primelevel-platform-auth-pdf` memory note for the exact verification
  step to run first, before anything is built.

## Roles — "mark as paid" reopened to any team member

- **Reversed from the original Owner-only rule**, based on a real
  scenario: two employees are out on jobs, get paid cash on the spot by
  the customer, and need to record that themselves rather than making
  the customer wait for the Owner to do it later. Reasoning given:
  "everyone should be able to mark as paid, then the owner can always
  look into it who marked as paid and chase for it."
- **Decided**: any active team member (Owner or Member) can mark any
  invoice in the account as paid. The trade-off is made safe by making
  it fully trackable — a new `paid_by` field records exactly who did it,
  stamped by the database itself from their real session (never
  something the app or a dishonest client could fake), separate from
  `created_by` (who made the invoice in the first place). Enforced by a
  database trigger so this specific action can only flip a sent invoice
  to paid — never a backdoor to edit anything else on someone else's
  invoice. Full technical detail in `DATA_MODEL.md`.
- Every other role restriction is unchanged: only the Owner can edit or
  delete someone else's invoice, manage the team, change settings, or
  export data.

## What's still genuinely open (see `DATA_MODEL.md` §5 for the live list)

- The real job-category list per trade (needs a dedicated session, can't
  be guessed).
- The Insights-view/export rows in the permissions table (low urgency).
- The exact k-anonymity number, 20 vs. 30 (deferred with the rest of
  "legal," see above).
