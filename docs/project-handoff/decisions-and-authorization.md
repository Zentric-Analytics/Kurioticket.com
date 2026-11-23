# Decisions, approvals and boundaries

Source of authority: explicit owner instructions in the originating conversation. This sanitized record supports continuity; it is not permission to execute an expired window or expand scope. The user identified themself as the authorized company representative, staging recovery owner and maintenance approver. Codex is the supervised technical executor. Do not invent a more specific corporate/security role.

## Decisions already made

- Preserve the existing review branch and engineering baseline. This documentation transfer is authorized to commit/push documentation only to that same branch. No new branch, force push, merge, deployment or automatic dev reconciliation.
- Older mobile clients: require a recovery-capable update for full native recovery; retain secure verified web fallback for older clients. MFA, ownership, session restrictions and ordinary-API denial must remain intact. Implemented/tested; no OTA/deployment authorization follows.
- Low deepmerge tooling advisory: owner approved the documented narrow trusted configuration/build-input risk for dev staging within their stated company responsibilities. Do not describe all native audits as clean or extend this acceptance to production/untrusted inputs.
- Migration history: preserve ledger/checksums and do not rewrite records. Final acceptance of discrepancies as deployment-safe was expressly withheld pending compatibility evidence and review.
- Preview worker: controlled suspension and disabling On Commit Auto-Deploy authorized and subsequently verified. Keep it suspended/Off. No job cancellation, credential change or resumption was authorized.
- Prefer existing recovery evidence and infrastructure; avoid duplicate tests, extra resources or spending. Existing successful restore evidence was not established, so one isolated test was authorized subject to controls below.
- Existing staging web regular shell was approved as private validation route. A bounded preflight completed successfully; do not repeat it. Do not repurpose another live service or introduce paid validation infrastructure.
- External staging consumers: owner knows of no required exception and accepted unidentified external-client interruption only within an explicitly approved window. Unknown clients are not proven absent.
- Validation-computer egress is unstable. Do not approve observed dynamic IPs, widen an ISP range, or assume the second computer has authorization for public database access.

## Isolated restore limits that remain binding

One temporary same-size PostgreSQL copy in Oregon using existing staging as source. Maximum **$1 total incremental database expenditure**, no additional paid services. Maximum lifetime **24 hours from creation**. No application/worker/cron/delivery attachment. Read-only validation with no customer disclosure, source modifications, migrations, checksum repairs, credential rotation or configuration writes.

Owner approved saving/verifying evidence and prompt deletion of ONLY the temporary copy, with deletion by 24 hours even if another cleanup response has not arrived. Do not delete original reports, staging/production databases or unrelated resources. No temporary database has yet been created.

RPO 15 minutes and RTO 2 hours are evaluation targets, not verified guarantees. Operator/owner roles are established; target acceptance/performance remains to be measured.

## Current rolling-window decision

Owner update November 16: fixed scheduling is removed. No other operators are expected to interfere. T0 begins only at explicitly authorized actual execution start. Abort cutoff is T0+20 minutes; original source access must be restored by T0+30 minutes. Record exact local/UTC times at T0. Preserve the $1 cap, 24-hour temporary-resource limit, isolation and cleanup controls. This timing change does not authorize infrastructure writes.

## Historical windows (superseded)

- `RESTORE-20261115-2230-PST`, Nov 15 22:30–23:00 PST, was approved but never executed; it is unavailable for further execution.
- Nov 15 23:00–23:30 PST was proposed but **not approved**.
- Fixed-start requirements are superseded by the current rolling-window decision above. Explicit infrastructure execution approval remains required.
- No automatic extension; calculate the current deadlines from actual authorized T0.

Never infer permission for production/main, merges, deployment, migrations, native builds/distribution, OTA, credentials, remote job cancellation or worker resumption from restore/documentation approval.
