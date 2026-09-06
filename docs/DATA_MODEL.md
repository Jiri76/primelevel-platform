# PrimeLevel Platform — Data Model & Access Design

Status: first draft, based on the kickoff brief (`ORIGINAL_BRIEF.md`) plus
decisions made in conversation on 2026-09-05 (see `DECISIONS_LOG.md`).
Built on Supabase (Postgres + Auth + Row Level Security). Reuses real,
already-tested fields from the existing `jobs` table / `JobFormScreen.js`
in `primelevel-app` wherever they fit — see `APP_CHANGES_NEEDED.md` for
exactly what has to change in that app to match this model.

---

## 1. The core problem this model has to solve, stated plainly

One business ("account") is used by several real people, each with their
own login. Everyone in the business can see and use the account, but not
everyone can do everything: an employee can create and send an invoice
(and the owner should always be able to see *who* sent it); only the owner
can mark something paid, change settings, manage the team, or touch
billing. Nobody outside the business ever sees another business's data —
except the one deliberate, consented exception: anonymised pricing data
pooled into the shared Insights dataset, which is aggregated in a way that
can never be traced back to a single business (the 20–30-contributor rule).

## 2. Entities

### `accounts` — one row per tradesperson business
The thing that actually holds a subscription, a trial, a tier, and all the
business's data. **Not** the same as a login — a login belongs to a
*person*, an account belongs to the *business*. This is the fix for the
current app's assumption that `account_id = the logged-in user's own ID`
(see `APP_CHANGES_NEEDED.md` — this is the most important structural
change needed).

| Column | Notes |
|---|---|
| `id` | uuid, primary key |
| `business_name` | text |
| `created_at` | timestamptz |
| `tier` | `starter` \| `growth` \| `insider` |
| `subscription_status` | `trialing` \| `active` \| `past_due` \| `read_only_lapsed` \| `cancelled` — see the state machine below |
| `trial_ends_at` | timestamptz, set at signup (`created_at` + 14 days) |
| `stripe_customer_id` | text, nullable until first payment method added |
| `stripe_subscription_id` | text, nullable |
| `data_sharing_consent` | boolean, default `false` — the Insights pooling toggle from Settings; opt-in, never on by default |
| `data_sharing_consent_updated_at` | timestamptz — for the audit trail on this specific toggle, since it governs what leaves the account |

### `account_members` — who belongs to which account, and their role
This is the actual multi-user mechanism — an invite-link/email-based
membership table, **not** a shared PIN or number (see `DECISIONS_LOG.md`
for why a shared code was rejected). Each person keeps their own Supabase
Auth identity; this table is just the join between a real person and the
business account(s) they belong to.

| Column | Notes |
|---|---|
| `id` | uuid, primary key |
| `account_id` | references `accounts.id` |
| `user_id` | references Supabase `auth.users.id` |
| `role` | `owner` \| `member` — see the permissions table below |
| `invited_email` | text — the email the invite was sent to, kept even after acceptance for a readable audit trail |
| `status` | `invited` \| `active` \| `revoked` |
| `invited_at` / `joined_at` / `revoked_at` | timestamptz, nullable as appropriate |

One person could in theory belong to more than one account (e.g. an
employee who also runs their own side business) — this table supports
that naturally without extra design, though it's not a feature to surface
in Phase 1.

**Roles and what each can do** (enforced by Postgres Row Level Security,
not just hidden in the UI — a member can't do anything the policy doesn't
allow even if they inspect network requests):

| Action | Owner | Member |
|---|---|---|
| Create & send an invoice | ✅ | ✅ (attributed to them — see `created_by` below) |
| View the account's invoices/dashboard | ✅ | ✅ |
| Mark an invoice as paid / change payment status | ✅ | ✅ (see note below) |
| Edit or delete an invoice | ✅ | own invoices only, while still `draft`/unsent — never after sending, matching a real audit-trail expectation |
| Manage team (invite/revoke members) | ✅ | ❌ |
| Change account settings (business details, consent toggle) | ✅ | ❌ |
| View Insights tab | ✅ | ✅ (view-only — it's business intelligence, not a financial control) |
| Manage billing / change tier / cancel | ✅ | ❌ |
| Export data | ✅ | ❌ (exporting is a business-level, owner action — an employee downloading the full client list on their way out is exactly the kind of risk this role split exists to prevent) |

*(This table is a first proposal, flagged explicitly as such — confirm
before it's locked in, especially the Insights/export rows, since the
brief didn't specify those two.)*

**2026-09-06 revision — "mark as paid" opened to any team member:**
originally Owner-only, changed after a real scenario the user raised:
two employees are out on jobs, get paid cash on the spot, and need to
record that themselves rather than waiting for the Owner to do it later.
**Any active member can now mark any invoice in the account as paid** —
not just their own. To keep this safe, it's narrowly scoped and fully
tracked: a new `invoices.paid_by` column records exactly who marked it
paid (stamped server-side from their real session, never trusted from
what the client sends), separate from `created_by` (who made the
invoice). A database trigger enforces that this specific action can
*only* flip a `sent` invoice to `paid` — it can never be used to sneak
through a change to the amount, description, or any other field on
someone else's invoice. This gives the Owner exactly what was asked for:
freedom for the team to record payment on the spot, with a genuine,
tamper-proof way to see who did it and follow up if something looks
wrong.

### `clients` — the tradesperson's own customers
| Column | Notes |
|---|---|
| `id` | uuid, primary key |
| `account_id` | references `accounts.id` — every client belongs to one business |
| `name` | text |
| `phone` | text |
| `email` | text |
| `postcode` | text — **new**, the client's full postcode (e.g. "SE1 4UX"). **Decided 2026-09-05: no separate street-address field** — the current app has never had one and real jobs have run fine without it; adding one would be scope creep toward a dispatch/scheduling tool, which this isn't. Postcode alone is the one new field. Stays private inside this business's own account (RLS-scoped) — never copied to `invoices` or `pooled_data_points` in full. Only its *outward code* (see `invoices.postcode_area` below) ever leaves this table. |
| `created_at` | timestamptz |

Pulled out as its own table (the current app embeds client details
directly on each job) so a returning client doesn't need re-typing every
time, and so the "Repeat-client / lifetime-value" Insight (Starter-tier,
day-one feature) has a real client to group invoices by rather than
fuzzy-matching names.

### `invoices` — renamed from the app's `jobs` table
Same real, tested fields as `JobFormScreen.js` writes today, kept
deliberately, plus what's needed for the new mechanism:

| Column | Notes |
|---|---|
| `id` | uuid, primary key |
| `account_id` | references `accounts.id` (the business — was wrongly `= user.id` before) |
| `client_id` | references `clients.id` (was inline `client_name`/`phone`/`email` before) |
| `created_by` | references `auth.users.id` — **new**, the actual person who created/sent it, so the owner can see "sent by John" |
| `invoice_number` | text, e.g. `#0142` — **new**, sequential per account, shown in the Invoices mockup |
| `trade` | text — **new**, e.g. "Plumbing" — set once at account level probably (see open question below), not per-invoice |
| `job_category` | text — **new**, a fixed, chosen-from-a-list category (e.g. "Combi boiler install") — the field the whole Insights mechanism depends on; kept separate from... |
| `job_description` | text, free text, 250 char max — **kept exactly as-is** from the current app; still useful detail, still what the future AI cross-sell feature reads |
| `amount` | numeric(10,2) — **kept exactly as-is**, same 2-decimal-place sanitizing already built |
| `job_date` | date — **kept as-is** |
| `due_date` | date — **kept as-is** (still defaults to `job_date`; a real "payment terms" field, e.g. "due in 14 days," is a reasonable Growth-tier-era addition, not Phase 1) |
| `status` | `draft` \| `sent` \| `paid` \| `overdue` — **replaces** the old `payment_status` text options; `overdue` is computed (today's date past `due_date` and not yet `paid`), not manually set |
| `payment_method` | `bank_transfer` \| `card` \| `cash` \| nullable until paid — **kept from the old idea** (the old `Paid Cash`/`Paid Bank Transfer` options), just split into its own field once `status = paid`, feeding the Payments tab's "how clients pay you" breakdown |
| `postcode_area` | text, e.g. `"SE1"` — **new**, needed for Insights pooling. Auto-derived (outward code only) from `clients.postcode` the moment the invoice is created — never manually typed twice, never the full postcode |
| `created_at` / `sent_at` / `paid_at` | timestamptz, nullable as appropriate — a real timeline, not just one status flag |

**Open question, genuinely need your call**: should `trade` (Plumbing,
Electrical, etc.) live on the *account* — one business does one trade,
set once at signup — or per invoice, in case a business does mixed work?
My default: **on the account**, set once, since the brief's own examples
("Reeve Plumbing & Heating") describe single-trade businesses, and it's
one less field on every invoice. Flag if that's wrong for how your
tradespeople actually work.

### `renewal_items` — the compliance/renewal tracker (Starter tier, day one)
| Column | Notes |
|---|---|
| `id` | uuid, primary key |
| `account_id` | references `accounts.id` |
| `name` | text, e.g. "Gas Safe registration" |
| `type` | text, e.g. "License" / "Insurance" / "Vehicle" / "Certification" — free text or a small fixed list, doesn't need to be rigid |
| `expires_on` | date |
| `created_at` | timestamptz |

Deliberately simple — no pooling, no consent, works identically for a
solo trader or a 20-person team, matches the brief exactly.

### `pooled_data_points` — the anonymised shared dataset
This is the one table that is **not** scoped to a single account by RLS —
every account's *consented* invoices contribute rows here, and every
account reads aggregated results back out. It never stores anything that
identifies which business or which client a row came from.

| Column | Notes |
|---|---|
| `id` | uuid, primary key |
| `trade` | text |
| `job_category` | text |
| `price` | numeric(10,2) |
| `postcode_area` | text — outward code only (e.g. `"SE1"`), never a full postcode |
| `job_date` | date |
| `contributing_account_id` | uuid — **kept internally for the anonymity-threshold check itself** (see below), never exposed in any query the app or a customer can run, never joined against `accounts` in a client-facing view |

**The 20–30-contributor rule, made concrete, not just a stated intention:**
a benchmark is never computed by summarizing `pooled_data_points` directly
in application code — it's served through a Postgres view (or a
`security definer` function) that:
1. Groups by `(trade, job_category, postcode_area)`.
2. Counts `distinct contributing_account_id` in that group.
3. Returns real numbers (average, min, max) **only** where that distinct
   count is ≥ the threshold (20, or 30 — pick one, they're used
   inconsistently as "20-30" in the brief; recommend picking 20 as the
   floor to open a segment, revisit upward once there's real volume to
   test against).
4. Returns a "not enough data yet, X of N needed" shape otherwise — never
   a partial or approximate number below threshold, never silently
   rounds up to make a segment look ready.

This view is the ONLY thing the Insights tab's queries are allowed to
touch — no code path anywhere reads `pooled_data_points` directly and
computes an average by hand, specifically so the threshold can't
accidentally be bypassed by a future feature that "just needs a quick
number." The **continuous check** the brief asked for (an automated,
ongoing verification the rule is never violated) is a scheduled job that
re-runs this same grouping/counting logic independently and alerts if it
ever finds a live Insights response that came from below-threshold data —
a second, independent proof the gate actually held, not just trust in the
view's own definition never being bypassed by a future code change.

## 3. The account lifecycle (subscription state machine)

```
   signup (no card)
        |
        v
   TRIALING  ────────────────────────────┐
   (14 days, full Starter access,        │ trial ends, no payment method added
    trial_ends_at set at signup)         │
        │                                 v
        │ payment method added      READ_ONLY_LAPSED
        │ before trial ends         (can view + export own data,
        v                             cannot create/send invoices
     ACTIVE                            or reminders; data never deleted)
        │  ^                                │
        │  │ payment succeeds after         │ payment method added
        │  │ a past-due period              v
        v  │                             ACTIVE
   PAST_DUE ───────────────────────────────┘
   (Stripe couldn't collect —
    grace period, still fully
    functional; real dunning/
    retry is Stripe's own job)
        │
        │ dunning exhausted, or owner cancels directly
        v
    CANCELLED
   (same as read-only-lapsed in practice:
    view + export only, nothing created;
    data never deleted, ever)
```

Upgrades/downgrades between `starter`/`growth`/`insider` are a **separate
field** (`accounts.tier`) that changes independently of this lifecycle
state — a `PAST_DUE` account keeps whatever `tier` it was on; the
lifecycle state governs whether the account can *do* anything at all,
`tier` governs *which features* are available while it can.

Every state transition is driven by a **Stripe webhook**, never a manual
flip — `payment_succeeded`, `payment_failed`, `subscription_updated`,
`subscription_deleted` map directly onto the states above. This is the
same mechanism that already needs to exist for the self-serve upgrade
screen to work, so building it once here covers both.

## 4. Why RLS, not just app-level checks

Every table above with an `account_id` gets a Postgres RLS policy scoping
all reads/writes to accounts the requesting user is an active member of
(via `account_members`), and further scoping writes by `role` where the
permissions table above says so (e.g. only `role = 'owner'` rows can
`UPDATE invoices SET status = 'paid'`). This means the *database itself*
enforces the boss/employee split — even a compromised or buggy client app
can't let an employee mark an invoice paid, because the database rejects
the write regardless of what the app tried to send. This is the same
proven pattern already live on the "Renewals" product (multi-tenant RLS
isolation, magic-link auth) — reusing it here, not inventing a new
approach.

## 5. What still needs your input before this is fully locked

Per explicit instruction 2026-09-05: proceeding with the defaults below
for now, to be checked properly later rather than blocking progress on
them today.

1. **`trade` on the account vs. per-invoice** — proceeding with
   account-level (one trade per business, set once). *Provisionally
   accepted, revisit later.*
2. **The Owner/Member permissions table** — the big ones are confirmed
   (only Owner marks paid, manages team/billing); Insights-view and
   export access were my own proposed defaults (both roles can view
   Insights; only Owner exports). *Still worth a specific look when
   there's time, not urgent.*
3. **The k-anonymity number** — proceeding with 20 as the gate, treating
   30 as a "maybe raise later once there's real volume" decision rather
   than a day-one requirement. *Provisionally accepted, revisit later —
   this is the "legal side" the user asked to defer, see `DECISIONS_LOG.md`.*
4. **The actual job category list per trade** — genuinely can't be
   invented convincingly; needs a real session together once we're
   building the invoice-creation screen, not guessed now.
