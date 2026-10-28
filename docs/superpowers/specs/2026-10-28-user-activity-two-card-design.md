# User Activity Two-Card Layout — Approved Design (2026-10-28)

## Intent
Make Admin > Users > Activity feel like a unified professional workspace without a colored Activity summary. Keep the existing Admin page background and current content, identity privacy and functionality.

## Approved layout
- Keep the global Admin header, navigation and `Users / Activity` breadcrumb unchanged; breadcrumb stays **outside** all cards.
- **Card 1 (main page):** one large white card with a soft gray border and modest radius, starting at the customer identity heading. It contains customer avatar/name/email/ID; Joined/First seen, Last active and Events aligned alongside on roomy screens; Manage action for registered users; and the Activity summary.
- **Activity summary inside Card 1 is flat:** no colored/tinted surface, no extra card, no shadows. Keep title and exactly three metrics: Searches, Results viewed, Provider handoffs. Use neutral muted labels, strong dark counts and slim separators; leave metrics fully visible.
- **Card 2 (inner body):** one white bordered activity workspace below the summary, containing existing search input, activity tabs, date/product/type filters, and the entire Activity history.
- Keep the existing light-gray workspace background visible around Card 1. Use only two bordered cards; the summary is not a third.
- Make layout stack gracefully on mobile, including 320px width, with no horizontal overflow.

## Non-goals / regressions to avoid
- Do not change API, event counts, privacy/consent/environment scope, sorting, search, date filters, product filter, status, or identity actions.
- Do not reintroduce Journeys counter/tab, Related records, Show all, or Load older. Do not hide repeated searches; all records must remain visible and individually timestamped.
- Do not touch other Admin pages, desktop/public Flights, mobile web, native app or the work branch.

## Approach options
- Separate standalone cards for identity/summary and body: more division and extra whitespace; not chosen.
- **Nested two-card composition:** one main page card containing a second activity card; chosen as requested, with understated borders to avoid stacking heaviness.
- One unified card: simpler but insufficient separation between identity and detailed activity; not chosen.
