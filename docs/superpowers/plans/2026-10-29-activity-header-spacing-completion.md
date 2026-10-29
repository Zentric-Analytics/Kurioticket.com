# Activity Header Spacing Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct remaining desktop User Activity header spacing and date presentation without changing the previously merged statistics or Journey functionality.

**Architecture:** Keep the current 5-column shared Tailwind grid in `page.tsx`, rebalance its fractional widths, render header timestamps as semantic UTC-aware `<time>` elements without the visible timezone suffix, and right-bias the Activity summary heading within the first track. Extend existing Playwright fixture checks rather than adding a new layout system.

**Tech Stack:** Next.js App Router, React, Tailwind, Playwright, node:test.

**Spec:** `docs/superpowers/specs/2026-10-29-user-activity-header-spacing-design.md`

## Global Constraints
- Branch from latest `dev` only; never touch `work`.
- Only the User/Guest Activity page, existing QA coverage, and related design/plan documentation.
- Preserve existing APIs, scoped counts, search-product breakdown, permission boundaries, Activity history, existing Journey page and link behavior.
- No new dependencies, mockup assets, or unrelated page changes.

## Review Focus
- A very long email wraps only when its available width cannot contain it; there is no horizontal overflow.
- Registered and guest header timestamps retain UTC semantics and a perceivable timezone after shortening visible text.
- Protected admin and Manage controls remain accessible at all responsive widths.
- The heading stays close to Searches without overlapping icon tooltip, metric divider, or long text.
- Both identity and summary continue using the exact same five columns at desktop widths.

---

### Task 1: Add failing layout and date-regression tests

**Files:**
- Modify: `qa/admin-activity-details/browser-check.mjs`
- Test: `src/lib/adminActivityEnvironmentBoundary.test.ts`

**Interfaces:** Existing fixture `qa-long-identity-0001`, `qa-registered-0001`, and `qa-guest-activity-0001`, DOM `section[aria-label="Customer identity"]` and `section[aria-label="Activity summary"]`.

- [ ] Step 1: Add regression assertions for semantic UTC time elements without visible suffix, desktop first-column-to-Events width ratio, single-line fixture email on 1536/1792, Activity summary heading right-edge gap, and zero horizontal overflow.
- [ ] Step 2: Run QA on baseline and confirm a clear expected failure (the old grid/visible UTC/left-aligned heading).
- [ ] Step 3: Commit tests before the implementation.

### Task 2: Rebalance first and Events tracks, tidy dates and summary heading

**Files:**
- Modify: `src/app/admin/users/[kind]/[id]/activity/page.tsx`

**Interfaces:** `activityColumns` is shared by both sections; `format(at)` is UTC-only; `Fact` renders semantic definition-list values.

- [ ] Step 1: Rebalance one shared five-track grid to prioritize the first column and minimize the Events + management tracks.
- [ ] Step 2: Render Joined/First seen and Last active as `<time dateTime=... title=...>` with UTC-aware formatting but no appended visible UTC.
- [ ] Step 3: Align Activity summary heading near the Searches divider on desktop while keeping narrow layouts left-aligned.
- [ ] Step 4: Run browser QA at desktop, tablet, narrow mobile, and zoom-equivalent viewports; capture before/after screenshots.
- [ ] Step 5: Commit source change.

### Task 3: Full review and merge

**Files:** No additional implementation files unless CI/review finds a reproducible issue.

- [ ] Step 1: Run required PR gates, activity visual QA, Security Checks, Migration validation, preview ledger and any required workflows.
- [ ] Step 2: Check Codex review and resolve actionable findings with tested fixes.
- [ ] Step 3: Compare actual before/after fixture screenshots and confirm the intended horizontal arrangement.
- [ ] Step 4: Merge to `dev` once required checks and reviews pass; verify new merged commit and report PR links.
