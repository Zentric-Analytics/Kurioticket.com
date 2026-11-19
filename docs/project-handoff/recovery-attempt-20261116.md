# Authorized recovery attempt — safely aborted before copy creation

Date: November 16, 2026, America/Los_Angeles. **Result: ABORTED SAFELY; no recovery proof obtained.**

## Authorization and boundaries

Owner explicitly authorized the recovery-execution-approval.md procedure, including temporary source-only external denial, one isolated PITR copy, read-only copy validation, exact source-rule restoration, evidence and copy cleanup, subject to $1 total incremental expenditure, <=24h copy lifetime and rolling deadlines. Owner required stop/rollback on any required safety-check failure. No credential changes, migrations, worker resumption, merge, deployment or production operation were authorized or performed.

Source: staging PostgreSQL `dpg-dabi7k7qj5pc73a3the0-a`. Original database-specific allowlist: exactly `[{"cidrBlock":"0.0.0.0/0","description":"everywhere"}]`.

## Execution record

| Event | UTC | PST / result |
|---|---|---|
| Pre-change health | 09:06:50.930 | 01:06:50.930; ok:true, database configured/connected |
| T0 recorded immediately before source access write | 09:07:26 | 01:07:26 |
| Abort cutoff | 09:27:26 | 01:27:26; not approached |
| Source restoration deadline | 09:37:26 | 01:37:26; met |
| Required external protocol check finished | 09:07:52.447 | 01:07:52.447; denied:false, timeout_inconclusive |
| Post-rollback health | 09:08:04.258 | 01:08:04.258; ok:true, database configured/connected |
| Rollback verification recorded by | 09:09:06 | 01:09:06; exact original rule persisted after source page reload |

Before mutation, source identity/Available state/PostgreSQL18/Oregon/size and exact original rule were rechecked. Preview worker remained Suspended/Auto-Deploy Off. Inspected web/cron lists showed no active/queued work; the known cron last succeeded at 00:00 PST and is every four hours. No operator interference was expected per owner. No completed engineering tests/audits or private-network preflight were repeated.

The source-only empty allowlist was saved using Render's explicit Block All Inbound IPs confirmation. Dashboard then showed zero allowed ranges and external traffic not allowed. Workspace/environment rules and all other source settings were untouched.

The prepared credential-free PostgreSQL TLS/SNI protocol probe used a seven-second timeout, no password and no SQL. It returned only `denied:false`, `result:timeout_inconclusive`. No recognizable PostgreSQL host-access denial was obtained. A timeout cannot establish effective network isolation, successful authentication or provider fault; the underlying cause is undetermined.

Per the authorized stop condition, no recovery submission was attempted. The exact original source CIDR/description was immediately restored. Save completion and a subsequent page reload showed one database-specific rule with `0.0.0.0/0`, `everywhere`, and no unsaved changes. Staging health after rollback remained healthy/database connected. Rollback was verified within 1 minute 40 seconds of T0, well before the 30-minute deadline. The precise network enforcement interval was not measured.

## Resources, expenditure and evidence

- No PITR copy was created or submitted. No copy ID, recovery point, creation+24h deadline or copy validation connection exists. No deletion was required.
- Incremental recovery database expenditure: **$0**, because no database resource was provisioned. This is not a reconciliation of unrelated existing Render billing.
- No credentials changed; source credential exposure remains acknowledged and unresolved. No provider/customer/business rows or connection secrets were written into these evidence artifacts.
- No recovery duration, RPO, RTO, restored-data integrity or full deployment-schema compatibility success is claimed. This attempt is failed isolation-proof evidence plus successful rollback evidence.
- Sanitized artifacts alongside the user-facing report: `kurioticket-source-denial-result.json`, `kurioticket-recovery-execution-state.json`, `kurioticket-recovery-rollback.png`. No public hostname or connection URL is preserved in the JSON evidence.

## Remaining blocker / continuation

Recovery remains incomplete. Establish an acceptable PostgreSQL-level external-denial evidence method from an approved external vantage before proposing another source-access/restore attempt. Do not treat the Dashboard rule, TCP timeout, password protection or previously recorded pre-restriction authentication request as that proof. Do not broaden allowlists, change credentials, repurpose an unrelated live service or create a paid validator to bypass the failed gate.

This authorization was executed and terminated at its failed safety check. Do not automatically reapply the restriction or repeat PITR under it. A revised concrete procedure and new explicit execution authorization are required for another attempt. Continue independent authorized preparation using the existing migration, worker/backlog and native/release assessments; no live backlog/schema/device/CI success can be substituted for missing evidence.
