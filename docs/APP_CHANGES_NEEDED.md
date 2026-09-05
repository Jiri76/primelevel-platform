# Changes needed in `primelevel-app` to match the new platform

Status: identified during data-model design on 2026-09-05, not yet
applied. Nothing in this repo has been touched — this is a plan for when
that work actually happens.

**Standing rule for all of it, per explicit instruction:** the existing
`JobFormScreen.js` layout, padding, colors, and style are locked and stay
exactly as they are — real design time went into them. Every change below
is additive (a new field using the *same* existing input style already in
the stylesheet) or a change to what happens after Submit, not a redesign
of anything visual. If a change ever seems to require touching the visual
design, stop and flag it rather than just doing it.

## 1. `account_id` currently means the wrong thing (the one real structural fix)

Today: `account_id: user.id` — the logged-in person's own ID is used
directly as the account.

Needed: look up which business account the current user belongs to (via
the new `account_members` table — see `DATA_MODEL.md`), and use *that*
account's id instead. A person can only submit against an account they're
an active member of.

Also add: `created_by: user.id` alongside it — the actual person who
created this invoice, kept separately from `account_id` (the business),
so the owner can see "sent by John." This is what makes the
boss/employee attribution work at all.

No visual change — this is entirely what gets sent in the `.insert()`
call, nothing on screen changes.

## 2. Table renamed `jobs` → `invoices`

Purely a naming change to match the new model (an "invoice" is the
user-facing word throughout the mockups; "job" was the original working
name). The form can still say "New Job" on screen if that's the language
tradespeople expect — this is a database rename, not necessarily a
customer-facing wording change. Flag if you'd rather rename the on-screen
text too.

## 3. New required field: job category (structured, not free text)

The existing `job_description` field (free text, 250 chars) stays exactly
as it is — same box, same placeholder, same character counter. **Add
alongside it**, not instead of it: a new required selection (dropdown, or
the same button-row style already used for Payment Status — reuse that
exact pattern, don't invent a new control type) for a fixed job category
list (e.g. "Combi boiler install," "Annual boiler service," "Radiator
replacement," …). This is the field the whole Insights/pooling mechanism
depends on — without it, invoices can't be grouped into the per-job-type
cards the Insights tab shows.

Needs a real, agreed list of categories per trade before this can be
built — not guessed. Flag back once ready to define that list together
(likely trade-specific: plumbing's categories won't match electrical's).

## 4. New field on the client side: postcode only (no street address)

Today: `clientName`, `clientPhone`, `clientEmail` only — no location at
all.

**Decided 2026-09-05, after discussion: add postcode only, not a full
street address.** The current app has run real jobs without any address
field at all, so a full address isn't actually a blocker — and adding one
would be scope creep toward a dispatch/scheduling tool, which PrimeLevel
isn't. One new field, same input style as Client Name, with the same
kind of light validation already used for phone (a real UK postcode
format check, not a blocking one — auto-correct/format as they type,
never reject a keystroke).

Lives on the `clients` record, not repeated per invoice once a client
already exists (see `DATA_MODEL.md` — `clients` is now its own table, not
embedded per-job like today). The *outward code only* (e.g. "SE1" from
"SE1 4UX") gets derived automatically server-side the moment an invoice is
created — nothing extra to build in the form itself beyond capturing the
postcode once.

## 5. `payment_status` becomes `status`, with different values

Today: `Unpaid` / `Paid Cash` / `Paid Bank Transfer` — one field doing two
jobs at once (whether it's paid, and how).

New: a `status` field (`draft` / `sent` / `paid` / `overdue` —`overdue` is
computed automatically from `due_date`, never manually chosen) plus a
separate `payment_method` field (`bank_transfer` / `card` / `cash`) that
only gets set once `status` becomes `paid`.

**Important per the new role design**: only an Owner can change `status`
to `paid` — an employee's app view should not offer that control at all
once roles exist. This is a real behavior change (not just a data
change), flagged clearly since it directly affects what a Member-role
user sees in the app, not just what gets stored.

## 6. Invoice numbering

New field: `invoice_number`, sequential per account (e.g. `#0142`, shown
throughout the mockups). Simplest implementation: a Postgres sequence or
a `count(*) + 1` per account at creation time — an implementation detail
for whoever builds this, not something the form itself needs to display
differently beyond showing the assigned number after submit.

## 7. Not a form change, but related: this form currently has no team/role awareness at all

Once `account_members` and roles exist, the app needs to know which role
the logged-in person has — at minimum, an Owner-only "mark as paid"
control has to not appear at all for a Member. This isn't a JobFormScreen
change specifically (that screen only ever *creates* invoices, which both
roles can do) but is flagged here since it's directly downstream of the
`account_id` fix in item 1 and will need its own screen/component work
wherever "mark as paid" actually lives.

## Summary table

| Change | Type | Visual impact |
|---|---|---|
| `account_id` → real shared account, not `user.id` | Structural | None |
| Add `created_by` | Structural | None |
| Rename `jobs` → `invoices` | Naming | None (unless on-screen text should change too — flagged) |
| Add job category field | New field | New control, same style as existing Payment Status buttons |
| Add postcode field (no street address) | New field | One new input, identical style to Client Name |
| Split `payment_status` → `status` + `payment_method` | Structural | "Mark as paid" becomes Owner-only, once roles exist |
| Add `invoice_number` | New field | Shown after submit, no new input needed |
