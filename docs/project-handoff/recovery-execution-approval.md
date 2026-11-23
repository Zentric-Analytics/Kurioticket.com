# Proposed isolated staging recovery execution

Execution disposition: owner authorized this procedure on November 16; it was attempted and **aborted safely before copy creation** because the required external protocol check timed out inconclusively. Original source rule restored, staging health connected, no database charge. See recovery-attempt-20261116.md. The attempt is terminated; this document is not standing retry authorization. Historical proposal follows.

Prepared November 16, 2026. **Awaiting explicit owner execution authorization.** No writes, recovery creation or charge have occurred. Credential exposure remains acknowledged and unresolved; owner explicitly directs no password/credential change and continuation. This is not a finding that the exposure is harmless.

## Exact proposed writes and scope

1. On staging source PostgreSQL **`dpg-dabi7k7qj5pc73a3the0-a` only**, temporarily replace its database-specific external allowlist with deny-all. Preserve the exact original rule for rollback: `[{"cidrBlock":"0.0.0.0/0","description":"everywhere"}]`. Do not change workspace/environment rules, credentials, source data, plan or configuration otherwise.
2. Verify protocol-level external denial and private staging health. If either is not established, restore original source access and stop before provisioning.
3. Submit exactly one PITR copy from this source to the latest then-advertised eligible point no more than 15 minutes old. Name prefix **`kurioticket-staging-restore-test-20261116-`** plus UTC start HHMMSS; record its exact new ID and never select a similarly named existing resource. Same PostgreSQL 18, Oregon, **0.1 CPU / 256 MB, 5 GB**, autoscaling/HA/replicas/addons disabled. No application/cron/worker/delivery attachment, workspace upgrade, paid validator or replacement production/staging application database.
4. Independently inspect destination identity and deny-all rules. Restore source exact original allowlist as soon as destination containment is verified, then independently verify that restoring source access did not broaden the copy. Do not assume inheritance timing.
5. One bounded transient read-only validation process from the existing staging web regular shell to the exact newly verified private copy. Reuse original source credentials only in process memory, with destination host changed and metadata checked; do not print/copy/export connection values. Credentials may not work on the copy: authentication failure is a stop, not permission to rotate credentials or obtain another access path. No migrations, data repair, installs, remote files, environment changes or customer/business row output.
6. Save and verify sanitized recovery timing, recovery-point, schema/ledger and aggregate-integrity evidence; then promptly delete **only the exact temporary copy** and verify source access/health. Include deletion/cleanup in owner authorization; no other resource is disposable. Maximum lifetime is creation+24h even after an interrupted test. If a consequential UI action requires contemporaneous confirmation, obtain it before that action; never silently retain a copy or exceed deadline.

## Rolling deadlines

- T0 starts only after explicit authorization and at actual execution start. Record PST and UTC immediately.
- Abort cutoff T0+20 minutes: stop forward recovery/validation work and prioritize safe containment/rollback.
- Source original access must be restored by T0+30 minutes; no automatic extension. Reserve at least ten minutes for rollback. No fixed scheduled start is required.
- Independently record copy creation+24h deadline; delete promptly after evidence rather than waiting out the allowance.
- Do not start if vendor maintenance, a new active deployment/run, loss of controls or other conditions make these deadlines unsafe. Recheck at T0 without repeating the completed private-network preflight.

## Cost

Hard ceiling **$1 total incremental database expenditure**, including applicable charges/taxes; no extra paid service. Current source Dashboard confirms $6/month compute. Vendor pricing publishes storage $0.30/GB-month and time proration; conservatively charging all 5GB gives $7.50/month, approximately **$0.25 for 24 hours** on a 30-day basis before tax (approximately $0.0052 for 30 minutes). This is an estimate, not an invoice guarantee or spend already incurred. Confirm the actual destination quote/addons before submission and stop if the total could exceed $1. No repeated restore attempt/resource under this request.

References: [pricing](https://render.com/pricing), [billing model](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses), [PITR](https://render.com/docs/postgresql-backups), [external restrictions](https://render.com/docs/postgresql-creating-connecting#restricting-external-access).

## Evidence and remaining interruption/security risks

- Source Available/PostgreSQL18/Oregon/size/original rule verified read-only. Latest health refresh `2026-11-16T08:58:58.762Z`: `ok:true`, DB configured/connected. Preview worker remains manually Suspended; Auto-Deploy Off.
- Inspected web/cron deployment/run lists had no active conflicts; web/cron One-Off Jobs pages had none. Currency cron is every four hours, last success 00:00 PST. Refresh conflict checks at T0 and abort if a conflict appears; do not cancel jobs without authority.
- Owner confirms no expected competing operators and no known required external-client exception. Unknown external consumers are not proven absent. External clients can lose access for up to 30 minutes; existing connections may not be terminated by an allowlist change. Private web/cron connectivity is expected to remain, but health degradation is a rollback trigger, not something to dismiss.
- Completed private preflight at `2026-11-16T05:03:48.197Z` is reused, not rerun. Two later no-database shell checks established input works, correct service, pg module present, source config privately bound and credentials available without transport-option surprises. They opened no database connection.
- New local operational tooling checks: four mocked tests passed, source targets rejected before client creation, URL override/security parameters rejected, identity failure rollback/close, password rejection distinguished from PostgreSQL host denial. Not live containment, authentication compatibility, restore proof or full application tests.
- Prepared validator has 5-second connection, 3-second SQL statement/1-second lock, 4-second query timeouts, explicit read-only startup/transaction and rollback/close; its command wrapper has a 30-second process deadline. Target metadata is filled only after independent destination verification. No secret is embedded in the command.
- Protocol probe uses TLS/SNI, no password/SQL, strict source/destination ID-host binding and a 7-second timeout. Only a recognizable PostgreSQL host-access denial counts; TCP failure, TLS error, password rejection or unexpected error is inconclusive and requires rollback, not creation.
- Source password exposure is unresolved. This copy can inherit credential compatibility; isolation reduces public network reachability but does not remediate credential exposure or guarantee protection from compromised authorized/private services.
- Render connector remains unauthorized; supported browser and existing regular shell work. Loss of that controller or auth is a stop. No new SSH key, secret or public-IP exception is authorized.

## Rollback and abort

Before copy creation: restore original source rule exactly, verify staging health, preserve failure evidence and stop.

After creation: independently confirm the copy is denied externally; if containment cannot be established, prioritize deletion of that exact copy before restoring broad source access. Preserve sanitized evidence where possible without delaying safety cleanup. Restore exact source rule, verify rule and health, and record actual timings. Escalate immediately if provider controls prevent containment/rollback; do not claim success or extend silently.

Stop for identity/rule drift, unavailable private health, unknown quote/addon, stale/unavailable recovery point, protocol isolation ambiguity, credential incompatibility, readonly/schema/integrity failure, unexpected jobs/dependency or deadline risk. Do not change credentials, cancel remote jobs, resume worker, repair migrations, or deploy to escape a failure.

## Subsequent autonomous work

After recovery evidence, continue the authorized compatibility assessment, worker/backlog read-only reconciliation and native/release preparation. Restore success alone does not resolve the historical UserProfile checksum mismatch, extra successful migrations, full schema drift, worker leases/actions/outbox/external jobs, fingerprint-matching artifacts, exact-release CI or live acceptance. Separate approvals still govern any pushes, merges, migrations, native build/distribution/OTA, worker resumption and staging delivery. Production main remains excluded.
