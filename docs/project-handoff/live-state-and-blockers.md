# Deployment state and remaining gates

Snapshot: November 15, 2026, approximately 22:37–22:40 PST. These observations must be refreshed read-only on the second computer. This candidate has NOT been deployed by this workflow; no dev/main merge or mobile delivery is authorized by this handoff.

## Verified staging state

| Resource | Recorded state |
| --- | --- |
| Staging PostgreSQL `dpg-dabi7k7qj5pc73a3the0-a` | Available, PostgreSQL 18, Oregon, 0.1 CPU / 256MB, 5GB, autoscaling disabled |
| DB-specific external allowlist | Exactly one rule: `0.0.0.0/0`, description `everywhere`; unchanged |
| Staging web `srv-dabmo50jo6nc73881d60` | Live at `7041310cfb158ab285f82e04ef165f21e113bda1`; direct Auto-Deploy disabled |
| Staging web health | At 2026-11-16T06:38:22.107Z: application healthy; database configured and connected |
| Preview worker `srv-d9qisaaju40c73bbago0` | Suspended / Manually suspended; Auto-Deploy Off |
| Staging cron `crn-d8gc47f7f7vs73fp2jl0` | Every 4 hours at minute 0; last successful run Nov 15, 20:00 PST; no active run identified in inspected list |
| Deployment conflict check | No active/queued staging deployment identified in 30 inspected records |

Render account/workspace identities were verified in the existing signed-in Staging Workspace. The environment label happens to be **Production inside the staging project**; identify resources by exact IDs and workspace, not this label. Do not inspect or alter actual production resources.

Dashboard entry points (normal pages, no credentials):

- [Source DB Info](https://dashboard.render.com/d/dpg-dabi7k7qj5pc73a3the0-a/info)
- [Staging web Deploys](https://dashboard.render.com/web/srv-dabmo50jo6nc73881d60/deploys)
- [Preview worker Settings](https://dashboard.render.com/worker/srv-d9qisaaju40c73bbago0/settings#deploy)
- [Staging cron Runs](https://dashboard.render.com/cron/crn-d8gc47f7f7vs73fp2jl0/runs)
- [Staging health](https://staging.kurioticket.com/api/health)

Render status was All Systems Operational. Announced maintenance Nov 17, 18:00–19:00 PST affects dashboard/API/database management, not already deployed runtimes. Recheck [Render status](https://status.render.com/) before proposing any future window. Future operator-triggered work and unidentified external consumers cannot be ruled out by this inspection.

## Database compatibility evidence (November 14; read-only)

- 55 candidate migration directories; all applied. 59 ledger rows: 57 successful applications plus 2 historical rolled-back attempts; 0 pending candidate migrations and 0 failed/incomplete migrations at observation.
- Historical checksum mismatch: `20260628000000_add_user_profiles`. Candidate SHA256 `12a007c49612e7e95117eefd2fd2383c01cf4ace8ccde11889f18a63fb081ea0`; ledger `cacfe1b7d91065b1cb04d534dbd247311556a942a9075a24a0d493eff80872e4`.
- Extra successful ledger migrations: `20261028182000_index_support_ticket_activity` and `20261106000000_admin_notification_preferences`.
- `20261027090000_correct_zero_result_hotel_provider_failures` applied. Nine critical tables and required columns checked; relevant UserProfile and SupportTicket indexes present. This is not full constraint/default/type/schema drift certification.
- Preserve history. Do not repair checksums, alter migration records or replay SQL. Owner accepted the non-destructive approach, not final deployment safety of the discrepancies.
- The Render predeploy wrapper is write-capable. Zero pending SQL in a past snapshot does not authorize executing it or guarantee no effects for a future release.

## Outstanding release blockers / order

1. Complete one approved isolated restore with measured recovery/readiness times, schema/ledger and privacy-safe integrity evidence. A new exact window is required; no test has completed.
2. Finish and obtain owner approval for full deployment-schema compatibility and historical discrepancy disposition. Successful restore alone does not resolve these.
3. Maintain worker hold; independently reconcile leases, actions, outbox/backlog and external Render/EAS jobs. Suspension does not cancel remote work. A prior GitHub reference-read 401 remains an unresolved credential/operational issue, not a safe hold mechanism. No credential repair or resumption without separate authorization.
4. During a separately authorized controlled integration window, pin dev once, assess/reconcile with approved work, validate the exact combined release and required CI/reviews. Do not repeatedly chase dev or assume old mergeability/CI is current.
5. Obtain explicit matching native-build and separate distribution approvals; verify canonical environment, final source/runtime identities, audience and actual device/OTA uptake. Existing builds 61/52 are incompatible with final local fingerprints.
6. Obtain explicit staging delivery/merge authorization covering worker/API delivery, predeploy effects, backlog, secure backend/client pairing and rollback. Direct staging Auto-Deploy Off does not prevent API/worker delivery.
7. After authorized delivery, complete real nonproduction admin/non-admin/MFA/passkey/recovery and results/handoff acceptance against the actual deployed SHA and installed clients. No real bookings or production promotion.

Do not repeat the completed engineering audit as a prerequisite to these operational steps. Dependency risk acceptance already recorded is scoped in the decisions document; revisit only if exposure or approved scope changes.
