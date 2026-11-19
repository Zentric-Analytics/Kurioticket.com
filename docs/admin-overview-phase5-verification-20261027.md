# Phase 5 — Kurioticket Admin Overview integrity verification (October 27, 2026)

This document records a **read-only staging verification** and the protections added to the required PR workflow. It is an inspection of actual database aggregates, not a claim that the rendered Admin Overview was tested through an authenticated browser session.

## Observed staging baseline

The following values were read with read-only SQL around **2026-10-27 09:22–09:28 UTC**. They are snapshots and must not be hardcoded into UI logic.

| Source / window | Verified observation | Interpretation |
| --- | --- | --- |
| Current User records | 16 total: 15 ACTIVE (11 customer + 4 admin), 1 DELETED | Account lifecycle, not website presence |
| Consented visible website heartbeat, rolling 90 s | 1 eligible guest browser identity, 0 verified registered accounts | Observed identity, not all humans online or native visitors |
| Current SupportTicket records | 4 OPEN, 1 RESOLVED, 1 CLOSED | Support attention = 4 |
| Current AccountDeletionRequest records | 2 CANCELLED, no pending or ready-for-review requests | Deletion attention = 0; cancelled is not pending |
| AdminAuditLog, past 7 days | 29 rows, 24 with adminUserId and 5 system/unattributed | Human admin actions = 24, not 29 |
| Staging SearchHistory, past 7 days | 944 records: 106 SUCCESS, 779 PARTIAL, 59 FAILED | Operational searches may include unattributed activity |
| PARTIAL SearchHistory, past 7 days | 689 with offers, 90 without offers | PARTIAL is not a guarantee of inventory |
| SUCCESS SearchHistory, past 7 days | 94 with offers, 12 without | SUCCESS means processing completed, not inventory |
| Staging provider logs, past 24 hours | Duffel 121 SUCCESS; KAYAK sandbox 121 FAILED (120 flight, 1 hotel), 1 SUCCESS | KAYAK failure rate about 99%; upstream authorization remains unresolved |
| Staging provider redirects, past 7 days (09:27 UTC) | 9 tagged redirects: 5 eligible journey-linked (all 5 exactly linked to searches), 4 outside eligible journeys; 4 without visitor IDs | Do not invent missing attribution; untagged legacy redirects excluded |

The source queries preserve per-source environment and time windows, and count currently consented journey events only when their identity and linked records pass the existing ownership checks.

## Integrity protections

- The standard PR gate now executes the existing Admin Overview page-source, account/audit metric, and consented website-presence tests. A normal TypeScript build alone does not test these behavioral invariants.
- Support and deletion status groups now use a checked aggregator. Every known empty status is safely zero; unknown statuses, negative/fractional/non-finite counts and overflow **fail closed**, instead of silently becoming a believable zero. No statuses or operational totals are modified.
- Existing journey, provider-readiness, security and PostgreSQL CI checks remain in place.
- The selected reporting range continues to apply only to historical metrics; consented active website identities use their own rolling 90-second window and provider traffic uses 24 hours. Unavailable data is never replaced with simulated counts.

## Limitations and next actions

- **KAYAK access is not repaired by this verification**. Investigate provider authorization and entitlements separately, without exposing credentials or bypassing API safety rules.
- This check does not establish an exact number of people online, nor prove a redirect was a completed booking.
- A successful Render deployment/CI check is not a substitute for an authenticated browser QA pass on desktop and mobile. Verify the visible staging values and unavailable states manually when an authorized admin session is available.
- The user requested that section rearrangement and typography reorganization happen **later**. This PR intentionally makes no layout or section-order changes.
