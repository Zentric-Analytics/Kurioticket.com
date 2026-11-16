# Operational continuation assessments

Current owner disposition supersedes the earlier incident hold below: no credential/password changes; exposure is an acknowledged unresolved risk and authorized work resumes. See recovery-execution-approval.md for the concrete rolling recovery proposal and worker-readonly-reconciliation.sql for the unexecuted, bounded ledger investigation bundle. No final schema compatibility, clean backlog, matching native artifact, CI acceptance or restore completion is claimed.

Prepared November 16, 2026. Read with continuation-progress.md and the original recovery runbook. These are preparation/disposition proposals, not executed database checks or delivery approval.

Latest owner timing override: no fixed start; authorized actual T0 starts a rolling 30 minutes, abort at +20, restore source access by +30. Owner confirms no expected operator interference. Later readiness work demonstrated terminal input and boolean-only in-memory source-credential route checks without a database connection, and prepared copy-validation/external-denial code with four passing local mocked checks. Earlier statements below that these are unprepared describe the prior assessment. Live copy authentication and isolation remain untested. The [credential incident](credential-incident-20261116.md) now places recovery on a security hold; no readiness-pass claim or final execution request is appropriate until explicit disposition.

## B. Database compatibility

Reuse November 14 evidence: 55 candidate migration directories all applied; 59 ledger rows, 57 successful applications and two historical rolled-back attempts; no incomplete/failed or pending candidate migrations at that observation. Known exceptions remain the UserProfile checksum mismatch and two extra successful migrations named in live-state-and-blockers.md.

Local source review confirms the candidate UserProfile SQL renames `phone` to `phoneNumber`, adds nullable `fullName`, and creates its `createdAt` index. The support-activity migration also advances parent ticket activity timestamps before creating an idempotent index. Therefore proving only that an index exists does not establish the data-backfill effect or the equivalence of differently named historical migrations.

The candidate's `verify-production-schema.mjs` verifies nine tables and selected column names plus failed-migration absence. It does not compare all column types, nullability/defaults, enum labels, uniqueness, foreign keys, constraint validity, index definitions or all models. It cannot close full compatibility acceptance alone.

`deploy-render-migrations.mjs` is write-capable: it can resolve ledger entries, repair UserProfile columns/data/indexes, reconcile a known staging support-index failure and execute `prisma migrate deploy`. Its wrapper retries. Do not run it as a diagnostic, even if the historical pending count is zero. No application/worker startup helper or migration script is authorized merely by read-only investigation.

Non-destructive proposed disposition:

1. Preserve SQL files, migration names/checksums and ledger rows. Do not reset, resolve, replay or modify anything to make history appear clean.
2. On an independently contained recovery copy, collect schema/ledger metadata with one bounded read-only transaction. Compare the known UserProfile exception by resulting structure, and the support exception by index definition plus privacy-safe integrity predicates for parent/latest-message timestamps. Keep the original exception explicit.
3. Treat extra `20261106000000_admin_notification_preferences` objects as an exception requiring their actual definitions/dependencies and old/new application compatibility. This candidate has no matching model/migration under that name; that does not authorize dropping objects or prove that they are harmless.
4. Review all candidate model tables/columns, enum labels, required defaults, unique/index/FK definitions and validation state, delete/update actions, and critical aggregate invariants. Output booleans/counts rather than customer records or raw SQL dumps.
5. Record residual drift and old-live/candidate rollback compatibility. Owner must approve the discrepancy disposition and exact predeploy effects separately. Restore success does not grant deployment compatibility acceptance.

## C. Worker and backlog

Live hold is verified; backlog safety is not. Suspension does not cancel EAS/Render actions already accepted. Do not use the previous GitHub reference-read 401 as a safety control or rotate a token to resolve it without approval.

Candidate source identifies these reconciliation surfaces: `preview_release` (state, SHA, progression order, lease owner/expiry), `preview_release_action` (kind, identity key, state and remote ID), `preview_native_notification` (pending/retryable/terminal delivery state), `preview_native_ownership_incident`, and delivered-native/fingerprint state. Worker SQL initialization and CLI recovery/adoption tools can mutate them; do not invoke those tools to inspect state.

Prepare SELECT-only metadata queries with bounded result limits and a read-only transaction on the **worker ledger database**, not the staging application database. Check outstanding lease times, unfinished states, duplicate/conflicting identities, nonterminal action/outbox/ownership counts and exact remote identities. Do not expose recipients, payloads, raw errors, credentials or notification bodies. Independently match any existing Render deploy, EAS build/update/submission/distribution to its recorded SHA/project/profile/platform before proposing adoption/retry. Read-only access to that ledger has not been established in this continuation; neither a clean backlog nor external-job inactivity is claimed.

Before a separately approved resumption, decide the exact target/baseline/backlog policy, secure credential health, candidate web/native pairing and reconciliation results. No blanket resumption or automatic replay.

## D. Native Preview artifact requirements

Confirmed from candidate config: Preview project `89f6fd88-c0d7-495a-9e2b-8301b09f407d`, app/package `com.kurioticket.app.preview`, scheme `kurioticket-preview`, EAS environment/profile/channel `preview`, API `https://staging.kurioticket.com`. `app.config.ts` explicitly uses the fingerprint runtime policy for Preview. The older `preview-0.3.0` field is not authority to override computed runtime compatibility.

Reuse the recorded fact that existing iOS 61 / Android 52 fingerprints differ. Required future evidence: pinned approved integration SHA, canonical EAS Preview environment, per-platform fingerprint, actual artifact build IDs and source/runtime/profile identities, successful builds, separately approved TestFlight/internal Android distribution, intended audience, installed-client identity and actual uptake. Do not initiate a build, auto-submit, OTA, publish or paid remote operation now. A JavaScript export is not a native artifact. No current remote artifact lookup or physical-device acceptance is claimed here.

## E/F. Integration and deployment gates

Read-only GitHub connector queries for engineering baseline `c17240c...` returned `statuses:[]` and PR-associated `workflow_runs:[]`. The connector's workflow query is PR-filtered; these results do not certify all check runs are absent. No CI was triggered and no broad suite rerun. Existing local validation remains the engineering evidence.

After recovery and compatibility acceptance, obtain controlled integration authorization, pin dev once, reconcile only the approved delta, identify one immutable combined release and obtain required exact-head checks/reviews. Do not chase current dev now. Any necessary correction remains local to the existing review branch; push needs concise change summary and owner approval.

The eventual deployment request must name exact source SHA, staging service, web/native pairing, predeploy effects, worker/backlog handling, live acceptance and rollback triggers. Old web artifact rollback does not reverse database writes, external jobs or published clients. Keep worker hold throughout unless explicitly released. No merge, staging deploy or production operation is authorized by these assessments.

## A. Recovery preparation hard stops

The inherited process is one temporary same-size Oregon PostgreSQL copy with no apps, workers or cron attached. Render documentation confirms PITR copies the source allowlist. This is why source-only temporary external denial is required before creation; a password alone is insufficient isolation. Do not change workspace/environment rules or grant this computer an IP exception.

The supported browser can inspect the source allowlist, restore form, cancel form and regular staging shell. It has not demonstrated safe terminal paste, a secure in-memory copy credential path, protocol-level external-denial proof or copy validation. No copy exists to provide a target identity. These remain real execution hard stops, not facts to infer from prior connectivity.

Prepared validation contract (not an executed template):

- Refuse unless service ID equals the exact staging web ID and destination ID is a newly created, independently verified recovery copy distinct from source, production and worker ledger. Validate destination private host/database identity separately from user input.
- Read existing source configuration only in process memory; never print or replace it. Obtain destination credentials securely without files, arguments, clipboard export or chat. Do not assume source/destination credentials match; stop on authentication failure.
- Use a single transient PostgreSQL client with startup read-only mode, explicit BEGIN READ ONLY, bounded connect/query/statement/lock/transaction times, and guaranteed rollback/close. Verify current_database, read-only state, server version and private endpoint flags before schema or aggregate checks. Never target the source for copy validation.
- Collect only schema/ledger metadata and approved privacy-safe aggregate booleans/counts; no traveler/account records, raw error text, connection URLs or provider data. Treat permission, query, identity, timeout and integrity failures as stop conditions.
- For external denial, use a bounded credential-free PostgreSQL protocol startup to the exact nonsecret public host. Require a recognized network-access denial response, not TCP failure or ordinary password rejection. If evidence cannot distinguish denial from authentication, fail closed and do not create a copy. The concrete checker and secure metadata path need final review before execution approval.

No source restriction may outlive the exact approved maintenance deadline. Abort cutoff must leave at least ten minutes for containment and exact source-rule rollback. After creation, verify copy deny-all independently before restoring source broad access; if containment cannot be established, delete only the exact approved temporary copy before restoring source rules. Save/verify sanitized evidence before prompt deletion, with absolute lifetime <=24h and total incremental expenditure <=$1. Current directive requires explicit approval for deletion too; include cleanup in the exact execution approval request rather than relying on a historical approval alone.

Current vendor references read in this continuation: [PITR](https://render.com/docs/postgresql-backups), [external restrictions](https://render.com/docs/postgresql-creating-connecting#restricting-external-access), [status](https://status.render.com/). PITR documentation excludes the most recent ten minutes; choose the latest then-eligible point within the 15-minute RPO target at execution, or stop. RPO/RTO remain evaluation targets, not guarantees. No pricing quote was independently refreshed; reconfirm compute/storage/prorating/taxes and addons before any creation approval.
