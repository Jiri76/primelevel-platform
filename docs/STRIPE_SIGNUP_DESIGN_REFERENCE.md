# Design reference: Stripe's sign-up card

Captured 2026-09-07 by inspecting the live, real DOM at `dashboard.stripe.com/register`
(via `getBoundingClientRect()` / `getComputedStyle()` — not eyeballed from a screenshot),
because the user liked this layout enough to want to reuse it on PrimeLevel Platform's
own auth pages. Every value below is a real measurement unless explicitly marked
"inferred" — see the caveat under Colors.

## Layout & centering

| Property | Value |
|---|---|
| Card size | 540px wide × 715px tall |
| Centering | Mathematically centered in the viewport — left gap to window edge equals right gap exactly (370.5px each, measured at a 1281px-wide viewport). Top/bottom gap likewise equal (~99px / ~100px, the ~1px difference is rounding). |
| Corner radius | 8px |
| Background | `#FFFFFF` |
| Shadow | `rgba(60,66,87,0.08) 0 15px 35px 0, rgba(0,0,0,0.12) 0 5px 15px 0` — a soft two-layer shadow (wide+faint, tight+darker) is what gives the "floating card" feel, not a single box-shadow. |

## Typography

Font stack throughout: `sohne-var, sohne-woff, "Helvetica Neue", Arial, sans-serif`
(Sohne is a paid/licensed font — for our own site we'd substitute a similar
grotesque sans, not license Sohne itself).

| Element | Size | Weight | Color |
|---|---|---|---|
| Heading | 26px | 500 | `#414552` |
| Field labels (Email, Full name, Country) | 14px | 400 | `#1A1F36` |
| "Password" label | 14px | 500 (bolder than the other labels) | `#1A1F36` |
| Legal/checkbox paragraph text | 14px | 300 | `#3C4257` |
| "Sign in" link | 13px | 400 | `#533AFD` (a lighter/brighter purple than the button) |

## Inputs

| Field | Width | Height | Padding | Radius | Font size |
|---|---|---|---|---|---|
| Email / Full name / Country | 444px | 40px | 4px 8px | 4px | 14px |
| Password | 444px | 44px (taller) | 8px 12px | 6px | 16px (larger — easier to read while typing) |

Vertical gap between stacked fields: ~43–44px consistently.

## Primary button ("Create account")

| Property | Value |
|---|---|
| Background | `#635BFF` — Stripe's actual brand purple |
| Text | white, 16px, weight 500 |
| Size | fills the form width (444px) × 36px tall |
| Radius | 4px |

## Password-strength bar (weak state only — see caveat)

| Property | Value |
|---|---|
| Segments | 3, each 142.7px wide × 4px tall |
| Radius | 10px (fully pill-rounded) |
| Gap between segments | 8px |
| Critical/red (weak) | `#E61947` — measured directly off the real bar |
| Unfilled/grey | `#D8DEE4` — measured directly off the real bar |

## Colors — full palette

| Purpose | Hex | Confidence |
|---|---|---|
| Brand purple (button) | `#635BFF` | Measured directly |
| Critical red (weak password) | `#E61947` | Measured directly |
| Unfilled grey | `#D8DEE4` | Measured directly |
| Success green | `#09825D` | Measured, but from a different element on the same page (a "+86.4%" stat), not the literal strength bar |
| Warning amber | `#D97917` | Measured, but from a different element on the same page, not the literal strength bar |

**Caveat, stated plainly:** getting the literal "strong"/"medium" bar colors required typing
test text into the real password field to trigger those states, and that action is blocked
by a standing safety rule (never enter any password into any field, including disposable
test values). The green/amber above are Stripe's real, measured site-wide success/warning
colors from elsewhere on the same page — very likely the same family the strength bar
itself uses, but not confirmed as the exact same element. If exact confirmation is ever
needed: open dev tools on a real signed-in session where a real password was typed,
inspect the green bar directly, and update this file with the confirmed value.

## Applying this to PrimeLevel Platform

Good candidates to borrow as-is: the centered-card-on-light-background layout, the
two-layer soft shadow, the 4–8px corner-radius scale, the taller/larger-font password
field treatment, and the pill-shaped multi-segment strength meter concept.

Not worth copying literally: the exact brand purple (`#635BFF` is Stripe's identity,
not ours) and the Sohne font license — our own palette (navy/gold, see
`site/js/supabase-client.js` and the shared page `<style>` blocks) and font pairing
(Fraunces/Archivo) should stay as the actual colors and type, with this layout/spacing
system applied underneath them.
