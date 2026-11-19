# Admin Activity Improvements Implementation Plan

**Goal:** Implement the user's two approved tasks in separate PRs targeting dev.
**Architecture:** Shared five-column responsive grid for identity and summary; derive product counts from the complete, authorized, deduplicated activity read. Reuse existing journey detail reader and safe return navigation.
**Stack:** Existing Next.js, React, Tailwind and Lucide; no dependencies added.
**Spec:** User request dated 2026-10-29.

## Constraints
Only individual Activity and necessary journey navigation, services and QA. Leave work, Overview, other Admin/public/mobile/native surfaces unchanged. Preserve all restrictions, filters and individually visible records.

## Review focus
Unknown products must reconcile; repeated searches retain distinct IDs; canonical source duplicates do not inflate breakdowns; long identities wrap without overflow; journey return targets cannot redirect externally.

## Task 1
- [ ] Add service regressions for exact per-product counts, repeats, canonical/legacy deduplication, unknown types and scoped filters across guest/account/operational identities; confirm new assertions fail.
- [ ] Add searchProducts to complete-read summary using merged eligible rows, avoiding independent eligibility predicates.
- [ ] Replace separate grids with shared five-column definition at desktop widths, responsive fact/metric rows on smaller screens; 16px consistent values and requested card palette.
- [ ] Extend existing real-component QA for alignment, responsive widths, zoom and screenshots against this dev base.
- [ ] Run service/component tests, lint, type checks and visual suite; review screenshots, create PR, monitor CI/Codex and merge only when clean.

## Task 2
- [ ] Add regressions for View journey label, association, complete relevant window and safe Activity return context; confirm failures.
- [ ] Reuse journey headings and reader; preserve all event rows and filter behavior, add constrained return context.
- [ ] Extend visual/navigation QA, run checks and inspect screenshots.
- [ ] Create independent PR from latest dev, monitor CI/reviews, address findings and merge only when clean.
