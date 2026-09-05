# PrimeLevel AI Platform — Original Kickoff Brief

Verbatim, as given by the user on 2026-09-05. Kept unedited as the source of
truth to check every later decision against. Later clarifications and
decisions are tracked separately in `DECISIONS_LOG.md` — where the two
disagree, the decisions log wins (it's newer), but nothing here should be
silently reinterpreted without checking back against this original text.

---

## The one rule that overrides everything else in this document

Before anything about the idea, the stack, or the features: whatever gets
built has to be simple, frictionless, and obviously valuable — a genuine
time-saver for a busy tradesperson, not more admin work that looks modern.
This applies to every screen, every flow, and every phase, from the first
mockup to the last feature added years from now — not a one-time design
pass at the start.

Concretely:
- User-friendly and easy to navigate — someone using this between jobs, on
  a phone, tired at the end of a day, should never have to think hard about
  where something is or what to do next.
- Frictionless — every extra click, field, or decision is a cost. If a step
  isn't earning its place, cut it.
- Obviously, immediately valuable — the value of any screen should be clear
  within seconds, not something someone has to dig for.
- A genuine time-saver, always — if a feature makes a tradesperson's day
  faster and easier, build it; if it adds steps without saving them real
  time, don't.

This rule outranks anything else asked for in this document. If something
specified below conflicts with keeping the product simple and frictionless,
say so — don't build it exactly as written just because it was asked for.

## Who the user is and what they run

Runs PrimeLevel (primelevel.co.uk), an invoice and payment automation tool
for small UK service businesses and tradespeople (plumbers, electricians,
etc. — usually 5–20 people). No paying customers yet — still pre-launch.
£99–£149/month was the planned launch pricing, not a live price anyone is
on today.

**The stack is changing, build for the new one, not the old one.**
PrimeLevel was originally built solo on Make.com (no-code automation) with
Google Sheets as the data store, Gmail for email, and GoCardless alongside
Stripe for payments. Moving off all of that: Google Sheets is too fragile
to build on properly, GoCardless adds too much payment friction. Going
forward, PrimeLevel is a properly coded app, with Supabase as the database.

Payments and email are open decisions — don't assume the old tools carry
over. GoCardless is out for sure. Stripe is not a settled choice either —
treat payment processor as undecided. Same for email — Gmail is probably
not right given Supabase has its own email mechanism, but nothing decided
between that and something else. For both: options (including Supabase's
own built-in ones) with a clear recommendation and why, rather than picking
silently or assuming the old tools carry over.

Design and build everything — including the new Insights feature — against
Supabase as the database, with payments and email left open per the above.

**No existing customers to migrate** — pre-launch, no live customer data on
the old Make.com/Sheets setup needs to survive into the new build. Design
and build the new Supabase-based platform clean, no migration path needed.

## The whole mechanism — how this fits together as one platform

One connected system, not a list of separate features. This is meant to be
a scalable AI platform for tradespeople, with recurring subscription
revenue and a real, compounding data moat — not an agency, not a services
business, not just an invoicing tool with extras bolted on. The full
mechanism, end to end:

1. A tradesperson signs up themselves — no sales call, no manual account
   setup — and lands straight in a working dashboard on a 14-day free
   Starter trial, no card required.
2. They use it to run their actual business — creating and sending
   invoices, seeing what's outstanding, tracking payments — because that
   day-to-day utility is what keeps them logged in and generates the data
   everything else depends on.
3. Every invoice feeds two things at once: their own dashboard, and — only
   with explicit consent — a pooled, anonymised dataset across all
   PrimeLevel customers in the same trade and area.
4. That pooled data becomes the Insights tab — pricing benchmarks,
   seasonal demand, where to advertise, growth vs. peers, cross-sell
   patterns — value that gets better and more accurate the more customers
   use PrimeLevel. The actual moat: a competitor can copy the invoicing
   features in a weekend, but can't copy years of pooled, consented
   trade-pricing data overnight.
5. Some of that value is visible but locked on the dashboard from day one,
   deliberately, to create the pull to upgrade.
6. When ready, customers upgrade themselves — no call, no manual invoice —
   through a self-serve tier-change screen, proration and feature access
   both handled automatically.
7. Nothing about day-to-day involvement from the owner should be required
   for any of this to keep running or growing.

Flow, unambiguous:

```
Sign up (no card) -> Trial dashboard (Starter features, live immediately)
   -> Invoices created --+--> Customer's own dashboard (run the business)
                          +--> Pooled anonymised dataset (only with consent)
                                     -> Insights tab (gets better as more customers join)
                                     -> Some Insights shown locked on dashboard (the upgrade pull)
   -> Customer self-upgrades -> Billing state changes automatically -> Locked features unlock
   -> Customer stops paying -> Account goes read-only, data never deleted
```

**Data model at a glance** (not a real schema, just the core entities):
Account (one tradesperson business, holds its own tier/subscription state)
-> has many Users (people who log into that account) and many Clients (the
tradesperson's own customers) -> has many Invoices (belongs to an Account
and a Client; trade type, job description, price, rough area, date,
status) -> each consented Invoice contributes one Pooled data point (trade,
job category, price, rough postcode area, date — never a client name or
address) to the shared dataset the Insights tab reads from. An Account also
has one Renewal item list (licenses/certifications/insurance/etc.) and one
Subscription record (current tier, billing state, trial dates).

## The new idea, in plain terms

Every invoice through PrimeLevel already tells: what trade the job was,
what the job was, how much was charged, roughly where, and when. Nobody
else has this — it's owned because it flows through the invoicing tool.

Two stages:

**Stage 1** — a cheap tool that gets people in the door. A low-cost add-on
(around £25/month) tradespeople sign up for. Its job is to get them using
it and, with clear permission, pooling their anonymised job-and-price data
into a shared dataset. Doesn't need to be flashy — exists to build the
dataset and get people comfortable sharing.

**Stage 2** — the real product, sold back to the same people, for more
money. Once enough tradespeople are contributing data, show each of them
something genuinely useful: "Boiler installs in your area typically go for
£X–£Y — you're charging £Z." That's the paid, premium tier.

**The important boundary**: this data is never sold or shown to anyone
outside the tradesperson community that supplied it. No insurers, no
suppliers, no market-research firms. The value stays inside the customer
base — money is made by selling the insight back to them, not by selling
the data to a third party. This boundary keeps things simple and avoids
needing serious legal involvement, and should be respected in everything.

## How this should be presented to the customer

Not a separate app, a separate login, or a database someone queries
directly. A new tab — "Pricing Insights" — inside the PrimeLevel account a
customer already logs into. It already knows what trade/job types they've
invoiced, so it shows a short list of cards, one per job type they actually
do, each with: their own average price, a simple visual range showing the
local min–max, and a status ("on target" / "below market" / "above
market"). No typing questions, no query tool. Where a job type doesn't have
enough local contributors yet, the card shows a locked/"not enough data
yet" state instead of a number (the 20–30-contributor anonymity rule, made
visible rather than hidden). A short monthly email digest goes out too,
with a one-line summary and a link back into the tab.

## The main dashboard, not just the Insights tab

Priority one, above all else: the home screen has to make it effortless to
see invoices — the core job of the product, can't get lost under new
features. Simple and clear, not clever: a few key numbers at a glance
(outstanding balance, paid this month, average days to get paid, jobs this
month), then a clean, scannable list of recent invoices with who it's for,
the amount, and its status (paid / due / overdue). No dense tables, no
clutter.

Below that — not above, not competing — a short preview row into Insights:
one compact card per feature (pricing, seasonal demand, where to
advertise, growth vs. peers, cross-sell, best clients), each showing one
headline number or short line, linking through to the full Insights tab. A
feature that isn't ready yet shows a calm "unlocks soon" state rather than
an error or being hidden — the dashboard always looks complete, never
broken.

## Potential future ideas for the same "Insights" tab (not in scope yet)

All follow the same rule as the pricing feature: built from data already
flowing through PrimeLevel, never sold outside the customer base.

1. **Payment-behaviour insight** — from invoice-sent vs. paid date and
   payment method, show which methods/terms get a tradesperson paid
   fastest. General patterns only, never a verdict on a named client.
2. **Seasonal demand calendar** — from job dates/types, show when demand
   typically peaks for a trade. No pooling threshold needed (general
   seasonal pattern).
3. **Local demand / "where to advertise" map** — from job location and
   value, show which nearby areas produce the highest-value jobs. Same
   pooling/anonymity rules as pricing.
4. **Growth benchmark** — own revenue trend vs. anonymised peer trend line
   for similar-sized trades businesses.
5. **Cross-sell pattern intelligence** — AI categorising free-text job
   descriptions, surfacing common job pairings ("most plumbers who install
   a boiler also invoice a power flush within 30 days"). The one feature
   that visibly needs AI, not just spreadsheet maths.
6. **Repeat-client / lifetime-value view** — own top clients by lifetime
   spend, % of revenue that's repeat. Only that one customer's own data, no
   pooling/consent needed at all — cheapest to build, good candidate for
   the very first Insights feature shipped, works from day one.

## Competitor complaint research — commitments to build in from the start

Researched what customers of Tradify, ServiceM8, Fergus, Commusoft publicly
complain about. None offer anything like the Insights idea (real white
space). Recurring complaints across all four aren't missing features —
they're trust and control: can't reach a real human when something breaks,
can't predict/control the bill (surprise charges, forced per-user
minimums, discontinued add-ons with no alternative), and — worst case, one
Commusoft customer — can lose access to years of their own client data if
the account relationship ends badly.

PrimeLevel should be the deliberate opposite, from the start:

1. **Data export, always available, no request needed.** One-click "export
   everything" (invoices, clients, job history), any time, not gated
   behind support. The single most damaging complaint found (a competitor
   customer lost 9 years of their own data on account closure) and the
   cheapest to permanently close off. Build early in the rebuild.
2. **One flat, published price.** No per-user minimums, no hidden add-on
   fees, cancel/downgrade anytime, no penalty.
3. **A simple public feedback/roadmap page.** Feature requests visibly
   alive, not vanishing into a support queue.
4. **Design for 5–20 employees from the start**, not an afterthought — one
   competitor (Fergus) reportedly strains past ~5 staff on concurrent jobs.
5. **A real (lightweight) support-scaling plan**, not just a promise —
   "fast, personal support" is true today but won't scale forever; think
   through what a lightweight but real support process looks like.

**Priority order for the first build**: (1) data export — top priority,
genuinely new, cheap, closes the most damaging complaint, build early. (2)
public feedback/roadmap page — next, also genuinely new and cheap. Flat
pricing (item 2 in the list above) isn't a new build — already true —
protect it in the rebuild and state it clearly on the site. Designing for
5–20 employees isn't a discrete task either — bake it in throughout, not a
separate milestone. Support scaling is a decision to make now, not
something to build yet.

## Pricing — three tiers (superseding the old £99/£149 single-tier idea)

Every tier flat monthly, unlimited users and invoices — no per-user
pricing ever, no volume cap that bumps someone to a pricier tier. Say this
explicitly in product/marketing copy: "Do more jobs. Never pay more."

- **Starter — £99/month.** Unlimited users/invoices. Invoice creation and
  sending, client dashboard, due/overdue reminders on the dashboard, a
  basic automated reminder email, full data export (never a paid upgrade,
  at any tier). Two things justify £99 even solo: (1) a compliance/renewal
  tracking tool — licenses, certifications, insurance, MOT, etc. as simple
  countdown reminders; needs no pooled data, works solo or at 20 people, no
  competitor found offering this. (2) The Repeat-Client & Lifetime-Value
  insight unlocked by default — only needs the customer's own data, real
  value from day one, Starter's first taste of the Insights idea.
- **Growth — proposed ~£149/month (not finalised).** Everything in
  Starter, plus full automated multi-step payment-chasing. Exact contents
  and price still to confirm now Starter moved to £99.
- **Insider — proposed ~£229/month (not finalised).** Everything in
  Growth, plus the full Pricing & Market Insights suite once pooled data
  supports it, plus priority support (same-day response commitment).

**Locked-card psychology, deliberate**: every Insights card the current
tier doesn't include, or below the pooled-data threshold, stays visibly
present but locked ("upgrade to unlock" / "not enough data yet"), never
hidden. Seeing a locked card every dashboard visit builds curiosity over
time and drives self-serve upgrades.

Design the account/permissions model with these three tiers in mind from
the start.

## Self-serve tier upgrades — no manual work, ever

A customer changes their own plan — upgrade, downgrade, cancel — entirely
themselves, no call/email/manual action needed. Direct extension of the
"cancel or downgrade anytime, no penalty" trust commitment, and the
mechanism that makes the locked-card upgrade psychology actually convert.

Flow:
1. An "Upgrade" screen (from Settings plan card, and from any locked
   Insights card) shows all three tiers side by side, current tier clearly
   marked, one button per tier.
2. Clicking hands off to the payment processor's own subscription-change
   flow — proration handled by that platform's subscription APIs, not
   built by hand.
3. A webhook from the payment processor confirms the change, updates the
   customer's tier in Supabase.
4. Every locked feature is driven off that one tier field — nothing needs
   a manual flip on upgrade, everything locks again gracefully on
   downgrade.
5. Downgrading and cancelling work through the exact same self-serve flow.

Strong argument for settling the payment processor now: proration,
subscription changes, dunning are a solved problem with a proper
subscription-billing platform (Stripe the standard choice) — building this
by hand would be unnecessary risk for a solo operator.

Mockup: an upgrade screen with tier cards, a current-plan badge, an example
promotional-offer badge, and illustrative (not decided) upgrade-offer ideas
(free trial, intro price, early-upgrade price lock, referral credit, "try
it free this month" on a locked card) — none decided, just showing the
upgrade screen and subscription plumbing should support an occasional
promotional price on a tier without a rebuild later.

## Self-serve signup — no tier choice up front

New customers sign themselves up entirely. Flow: public welcome page with
"Sign up" CTA -> short form (business name, email, password) -> account
created, straight into the dashboard, already logged in. Supabase's own
auth should handle account/password/session directly rather than anything
custom. A verification email can go out in the background but should never
gate reaching the dashboard right after signup.

Deliberately no tier selection on the signup form — every business starts
on Starter (or a free trial of it). Matches the whole design of the
locked-card dashboard and self-serve upgrade screen: get someone in and
using the product fast, then let the locked cards and upgrade screen do
the persuading once they're already a customer.

Own the concrete structure of signup/billing — design and build it
properly. The behaviour wanted (trial first, no card, self-serve upgrade,
lock on non-payment) is specified; the actual account/subscription state
machine (e.g. trial -> active -> past-due -> read-only-lapsed -> cancelled,
and how upgrades/downgrades move between paid states) should be proposed
back, not just the minimum wired together.

**Decided**: a 14-day free trial of Starter, no payment details required.
Sign up with business name, email, password -> full Starter access
immediately, no card. A few days before trial end, dashboard prompts to
add payment. If the trial lapses with no payment, the account goes
read-only rather than being deleted/locked out entirely — still see/export
own data, but can't create new invoices or send reminders until payment is
added. Never delete a lapsed trial account's data.

## Visual reference — mockups for every tab

All sharing the same design system (navy `#1E2633` / gold `#B29B68`
sidebar, Fraunces for headings, Archivo for body text, IBM Plex Mono for
numbers):

- Dashboard, Invoices, Payments, Insights, Settings — provided as local
  HTML files (now copied into `mockups/` in this project).
- Upgrade, Welcome (public landing page) — provided as Claude Artifact
  links only (not yet pulled into local files).

Treat these as the visual target, not just a mood board — layout,
spacing, and interaction patterns (locked cards, status pills, the chase
sequence stepper) are deliberate and should carry through into the real
build.

## System health — mistakes need to be caught and fixed automatically

Not wanting to be the one who finds out something's broken because a
customer complains. The platform should check on itself continuously, flag
anything wrong immediately, and fix what's safe to fix without manual
involvement — but with a clear line between two kinds of "mistake":

**Safe to fix automatically, no review needed**: transient technical
failures — a reminder email that failed to send and needs retrying, a
webhook that didn't land and needs replaying, a background job that
silently stalled. Nothing about money or a customer's data in question,
just plumbing — retry and recover on its own.

**Must be flagged, never silently auto-corrected**: anything touching
billing, invoice totals, subscription/tier state, or the pooled dataset —
a payment recorded twice, a tier not matching what was actually charged, a
data point violating the anonymity threshold. Surface clearly, with a
proper audit trail, rather than the system quietly rewriting a financial
record.

**One specific, continuous check regardless of anything else**: automated,
ongoing verification that the k-anonymity rule is never violated — no
benchmark ever shown or computed from fewer than 20–30 contributors in
that trade/area/job-type segment. The single most important safeguard in
the entire platform — enforced by a running check, not just write-time
logic hoped to be correct.

Propose the concrete mechanism (error logging, alerting, what "flagged"
actually looks like day to day) rather than being told the implementation.

## What a first, minimum version actually needs to include

Not getting built in one go — needs phasing, testing, iteration. Proposed
phasing wanted, but the bar for what Phase 1 has to cover to be worth
putting a real customer on: account signup and the 14-day trial, invoicing
and the client dashboard, the renewal/compliance tracker, and full data
export. Payment chasing, the pooled Insights suite, and self-serve upgrade
billing can follow later — but propose an own phased breakdown rather than
just accepting this one; there may be dependencies not obvious from the
outside (e.g. if the account/billing state machine needs to exist earlier
than assumed, for the trial itself to work properly).

## What was asked for, originally

1. Ask what's needed to design this properly — about the existing
   PrimeLevel setup (data structure, customer numbers, tech stack
   details), the two new tiers, and anything else normally needed before
   architecting a product like this. Ask directly, one topic at a time if
   easier, rather than guessing.
2. Once enough is known, produce these documents (as separate files, not
   just chat text):
   - A short product requirements document for both tiers — what each
     does, for whom, and why someone would pay for it.
   - A data model / schema for what gets collected, stored, and shown —
     including a hard rule that no benchmark number is ever shown unless
     built from at least 20–30 contributors in that trade/area/job-type
     combination.
   - A plain-English draft of the consent wording a customer sees when
     opting in — what's collected, how it's used, how to withdraw.
   - A phased build plan — smallest possible first version, then what
     comes after.
3. Flag anything that looks risky or unclear along the way — privacy,
   security, or anything else — rather than assuming an answer and
   building around it.
