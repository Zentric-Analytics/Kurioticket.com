# Admin User Activity Two-Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Admin User Activity to the approved two-white-card hierarchy with an uncolored, flat summary.

**Architecture:** Refactor the existing server-rendered Activity page markup and Tailwind classes only. Reuse the existing customer identity, summary, filters and timeline components, wrapping them with an outer customer workspace card and an inner activity-body card. Add static layout and browser-QA assertions for nesting, background and responsive behavior.

**Tech Stack:** Existing Next.js App Router, React, Tailwind, node:test and Playwright; no new libraries.

**Spec:** `docs/superpowers/specs/2026-10-28-user-activity-two-card-design.md`

## Global Constraints
- Branch from `dev`, never touch `work`.
- Keep breadcrumb outside the outer card and Admin global chrome unchanged.
- Keep white cards on existing `#F8FAFC` background; no blue Activity summary or third card.
- All events and repeated searches must remain visible; maintain authorizations, filtering, Manage and visitor context.
- No new dependencies or data/API changes.

## Review Focus
- Mobile 320px and 390px should show full customer identity and filters without horizontal scroll.
- Registered-user Manage control must remain reachable with the summary/identity inside the outer card.
- Guest and operational activity must retain privacy tooltip and no inappropriate Manage action.
- Summary numbers must reflect the exact same scoped data and event counts as before.
- Existing Journey View URLs (when present), search filters and complete histories must remain unmodified.

---

### Task 1: Establish the outer card and horizontal identity

**Files:**
- Modify: `src/app/admin/users/[kind]/[id]/activity/page.tsx`
- Test: `src/lib/adminActivityEnvironmentBoundary.test.ts`
- Test: `qa/admin-activity-details/browser-check.mjs`

**Interfaces:** Consumes existing `Fact`, `RegisteredManage`, `data`, `session`; outputs `data-testid="activity-page-card"` enclosing identity/summary and inner body card.

- [ ] **Step 1:** Assert one outer card contains customer identity, the summary and inner body while breadcrumb sits outside it.
- [ ] **Step 2:** Verify assertion fails against baseline.
- [ ] **Step 3:** Implement outer white bordered card and responsive identity row, keeping Joined/First seen, Last active and Events adjacent to identity on desktop, Manage at right on registered users.
- [ ] **Step 4:** Verify static and browser checks pass.
- [ ] **Step 5:** Commit the layout change.

### Task 2: Flatten and decolor Activity summary

**Files:**
- Modify: `src/app/admin/users/[kind]/[id]/activity/page.tsx`
- Test: `src/lib/adminActivityEnvironmentBoundary.test.ts`
- Test: `qa/admin-activity-details/browser-check.mjs`

**Interfaces:** Reuses existing `data-testid="activity-metric-value"` and `activity-metric-label` selectors, `ActivityDataInfo` and summary data.

- [ ] **Step 1:** Test summary is transparent (no independent card) while outer card is white; values and labels remain unchanged.
- [ ] **Step 2:** Confirm prior styling fails this test.
- [ ] **Step 3:** Move the summary underneath identity inside outer card; use neutral dividers/labels and flat 3-stat layout, retaining all data and tooltip.
- [ ] **Step 4:** Verify static and browser checks pass.
- [ ] **Step 5:** Commit.

### Task 3: Preserve inner workspace and test all breakpoints

**Files:**
- Modify: `src/app/admin/users/[kind]/[id]/activity/page.tsx`
- Test: `qa/admin-activity-details/browser-check.mjs`
- Test: `qa/admin-activity-details/actions-check.mjs` (only if selectors change).

**Interfaces:** Existing `data-testid="activity-body-card"` contains `ActivityFiltersBar` and `ActivityTimeline`.

- [ ] **Step 1:** Assert nested body is the only second card, contains search and timeline, and no overflow at 320/390/768/1280.
- [ ] **Step 2:** Confirm new layout selectors fail baseline.
- [ ] **Step 3:** Make minimal border/spacing refinements to existing body card; leave functionality intact.
- [ ] **Step 4:** Verify Admin visual QA (synthetic before/after screenshots), boundary tests, other CI, and Codex review have no blockers.
- [ ] **Step 5:** Commit, open PR targeting `dev`, wait for clean review/CI, and merge.
