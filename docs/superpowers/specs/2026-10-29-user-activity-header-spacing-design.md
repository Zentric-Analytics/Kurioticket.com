# User Activity Header Final Alignment — Design Specification (2026-10-29)

## Intent
Finish the two-card User/Guest Activity workspace approved by the Admin team. At 100% browser zoom, the identity row should remain the same compact horizontal layout seen at 90%, with full readable customer email where desktop space permits, consistent shared grid alignment, and a nearby Activity summary heading.

## Existing behavior and reuse
- PR #6561 (merged to `dev`) already implements Overview-inspired page/card styling, common 16px fact and metric values, an identical five-track grid for identity/summary, and verified Flight/Hotel/Car search totals.
- PR #6562 (merged to `dev`) already implements descriptive View journey links and filtered return navigation; do **not** duplicate this change.
- Existing `AdminIdentityActivityPage` uses a 5-track desktop grid (2.1fr,1.2fr,1.2fr,1fr,0.8fr), currently allocating too much room to Events and administration compared with customer identity.
- Date formatting explicitly appends ` UTC`, which wraps unnecessarily at typical desktop widths.

## Requirements
- Keep the five-track shared layout, the original Admin Overview-inspired backdrop and two-card structure; breadcrumb remains outside.
- Increase the first/identity track materially, so a realistic full email fits on one line at desktop widths where sufficient space exists; preserve long identity labels without truncation, with narrow/mobile wrapping when needed.
- Reduce Events and excess gap before Protected admin / Manage while keeping all five columns aligned with Activity summary.
- Keep Joined/First seen, Last active, Events in the same row at desktop zoom 90%, 100%, 110%; allow graceful responsive stacking where width genuinely cannot fit.
- Remove the visible `UTC` suffix **only** in identity header date values, not the underlying UTC conversion. Retain an accessible time element with ISO dateTime and a tooltip containing the timezone; do not change Activity history date labels.
- Move Activity summary heading **toward** Searches within its first column, with a restrained gap before the first divider; left-align naturally when stacked/narrow.
- Preserve 16px values, no colored Activity summary, and existing Flight/Hotel/Car subcounts under the Searches total.
- Preserve complete recorded activity and all access/consent/environment boundaries, tabs, filter UX, Manage security, and Journey links.

## Approach alternatives
1. Reduce font size and truncate email: rejected; hides identity and does not fix over-wide Events track.
2. Different grids for header and summary: rejected; breaks vertical divider alignment.
3. **Use one shared responsive five-track grid with a wider identity track, narrower Events/management tracks, UTC-aware semantic time values, and responsive heading alignment.** Selected.

## Verification
- Static source and browser regression coverage: no visible UTC in either identity date; both semantic time elements retain timezone and ISO datetime.
- Real fixture browser QA at 1536 and 1792 desktop and 90%/100%/110% zoom-equivalent viewport widths for date/column alignment and identity email line behavior, plus 1280/1024/768/390/320 responsiveness and lack of horizontal scrolling.
- Real synthetic-data before/after screenshots attached to PR as workflow artifact.
- Existing canonical/legacy deduplication, 16px metrics, and Journey tests remain green.
- Required GitHub CI and Codex review fully clear before merge.

## Ruling
A truly long email may wrap at narrow widths; avoiding overflow/accessibility regressions is more important than forcing a single line at 1024px.
