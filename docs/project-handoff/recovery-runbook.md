# Isolated staging restore: paused controlled procedure

Read the decisions and live-state documents first. This runbook is preparation, not authorization to start. No successful restore, recovery duration or validated readiness is claimed.

## Reused preflight / browser continuity

Completed private preflight at **2026-11-16T05:03:48.197Z** from staging web: correct staging database, read-only on, private hostname/client/server flags true, one connection closed, elapsed 98ms. Sanitized exact result is in `evidence/private-preflight.json`. Do not repeat it.

Credential-free external PostgreSQL startup at **2026-11-16T06:29:10.128Z** reached an authentication request without credentials or SQL. This proves pre-restriction reachability only; it does not prove isolation or successful recovery. Public source hostname was verified in the original session but is intentionally omitted from this portable handoff; inspect non-secret metadata when required, never publish a database connection URL.

Browser control was restored Nov 15 at approximately 22:37 PST using the supported `cua_repl` in-app browser. Existing authentication was reused and several Render pages were inspected successfully. Older handoff statements saying control was unavailable are superseded by this observation. Tools and authentication may differ on the second installation: first establish an actual supported controller and legitimate session; no guessed CDP, cookie/profile export or security-check bypass. Native Edge automation previously failed URL detection; do not circumvent it.

Native terminal paste previously failed; the owner manually submitted the approved one-connection preflight command. Later copy validation may require another user-assisted submission. Do not assume the new computer's shell input works. Do not repeat the preflight to diagnose paste. Prepare/review a target-guarded command before an approved execution; no secrets in arguments, files, output or chat. Never upload raw provider/application data.

## Isolation rationale

Render PITR copies source database IP restrictions. Inspected PITR request schema did not offer a destination allowlist override. Restrictive environment-wide inbound rules require a higher paid workspace tier than the observed Pro workspace; no upgrade is authorized. Password protection alone is not network isolation.

The chosen procedure temporarily denies external access on ONLY the identified staging source database, preserves private staging connectivity, and creates the copy while this restriction is effective. Independently verify the copy's restrictions before restoring the source's exact rules. Do not change workspace/environment rules or use an unstable public-IP exception.

Official references (recheck relevant current vendor behavior at execution): [PITR](https://render.com/docs/postgresql-backups), [connection restrictions](https://render.com/docs/postgresql-creating-connecting#restricting-external-access), [PITR API](https://api-docs.render.com/reference/recover-postgres).

## Before requesting a new window

1. Read-only verify source ID, Available/healthy state, PostgreSQL version/region/size and original DB allowlist. Original is exactly `[{"cidrBlock":"0.0.0.0/0","description":"everywhere"}]`. Record it without secrets. Stop on unexplained drift.
2. Verify staging web health, worker Suspended/Auto-Deploy Off, cron success/schedule, no active conflicting deployment/run and vendor maintenance. Owner must also confirm no conflicting operator activity.
3. Confirm supported rollback controls and secure in-memory validation credential path. The existing application's connection must never be printed/copied/exported or replaced. PITR credential compatibility is not assumed; fail securely if authentication fails.
4. Prepare one bounded read-only copy-validation process and a PostgreSQL-level external-denial check. A TCP-only failure, ordinary password rejection or allowlist display alone is insufficient denial proof.
5. Propose exact 30-minute PST/PDT start/end with an abort cutoff at least ten minutes before the end. Obtain explicit owner approval. Do not begin late.

## Approved execution would require all of these steps

1. At the approved start reverify identity, health, original rules, cost and latest eligible recovery timestamp. Select latest advertised recovery point no more than 15 minutes old; record exact PST/PDT and UTC before submitting. Stale prior timestamps are not reusable.
2. Temporarily deny all external connections on ONLY the source. Verify effective restriction, protocol-level external denial and private staging health before creating anything. Stop/rollback if this fails.
3. Create exactly one same-size Oregon PostgreSQL recovery copy, no HA/replica/autoscaling/monitoring addon/new service. Proposed prior name was `kurioticket-staging-restore-test-20261115`; verify no existing test resource before creation and choose an unambiguous approved identity. Never attach applications or change their configuration.
4. Record start/resource ID/recovery point/cost/deadlines. Independently confirm destination deny-all before restoring source's EXACT original rule; verify the copy remains restricted after source restoration. Do not infer when inheritance happens.
5. Run one bounded process from the existing staging web regular shell to the independently verified NEW private database. Guard service, source configuration and exact destination; never allow source/production as the validation target. One transient connection, read-only startup plus transaction, short timeouts, metadata/schema/ledger and privacy-safe aggregate integrity only; rollback/close. No installs/files/env/config changes, migrations or business/customer record output. Do not treat an unexecuted template as tested validation.
6. Measure provider restoration time and time to independently validated readiness. Compare migration history/checksums and critical schema with recorded source/candidate evidence; preserve known discrepancies, do not fix them. Explain limits of aggregate integrity and full-drift certification.
7. Save/verify privacy-safe evidence before prompt deletion of ONLY the exact temporary copy. Verify source exact original rules and staging health. The source restriction must end before the approved window deadline. No unattended extension.

## Cost / deadline / rollback

Observed source: 0.1 CPU/256MB, 5GB, PostgreSQL18/Oregon. Last observed compute $6/month plus storage estimate $0.30/GB-month gives conservative approximately $0.25/24h before taxes. This is not a final invoice guarantee. Reconfirm destination pricing, prorating/taxes and no addon before provisioning; stop if expected total can exceed **$1** or needs another paid service.

Absolute copy cleanup deadline is actual creation plus 24h; delete promptly after evidence verification, not at the end of the allowance. The source restriction deadline is much earlier: the exact approved maintenance-window end.

Abort for wrong identity, rule drift, unhealthy source, unexpected cost/addon/security issue, no eligible recovery point, unusable secure credential path, copy containment failure, schema/read-only/integrity failure or deadline risk. Before creation restore source rules and stop. After creation preserve evidence, independently verify copy restriction or delete ONLY that copy before restoring broad source access. If provider controls fail, escalate immediately to owner; do not silently extend, claim containment or broaden access on an assumption. Do not cancel unrelated jobs or modify credentials.

No more engineering work, moving-dev synchronization or production operation is part of this restore unit.
