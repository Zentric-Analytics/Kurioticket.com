# Kurioticket continuation handoff

## Current pinned local candidate — November 16, 2026

The owner-authorized 9a13 reconciliation is complete: application merge 9bd206394d48fb5f8e0b59c23e025fce6506d2e6,52 conflicts resolved,zero remaining. See [result and review points](reconciliation-9a13-result.md), [per-file ledger](reconciliation-9a13-conflict-ledger.json) and [validation manifest](reconciliation-9a13-validation-evidence.json). Final web5,225/native2,403 tests pass; build, native typecheck, dependency graph and offline iOS/Android exports pass. Native patch graph and fingerprints changed; artifact/device compatibility remains unverified. Locally ready for separately authorized publication only. No push/CI/infra/database/worker/deployment or production action; all existing recovery/security/operational gates remain. This supersedes earlier pending-integration statements below.


## Latest authorized local integration — November 16, 2026

Owner authorized local-only reconciliation of pinned dev 7041310cfb158ab285f82e04ef165f21e113bda1. Completed merge 30111d993a0d47b899af35e127df7cb3edc41fa9 preserves the engineering baseline and original handoff. See [local reconciliation result](local-reconciliation-20261116.md) for validation, rollback checkpoints and remaining gates. No push, remote CI, dev/main merge, deployment or infrastructure execution is authorized/performed. Render clarification remains unsent; recovery proof, schema acceptance, worker/backlog and exact native/release evidence remain open. Credential exposure remains acknowledged/unresolved; no credential changes. This update supersedes older no-reconciliation statements below; historical records remain intact.


Latest concrete release finding: [PR6721 conflict/policy/CI preparation](pr6721-conflict-readiness.md). Live dev refs reproduce five content conflicts; older PR API base/merge-ref snapshots are stale. No reconciliation authorized/performed. Render clarification was presented for approval and owner selected keep unsent.

Latest read-only follow-up: [isolation-proof investigation](isolation-proof-investigation.md), [independent release gates](release-gates-current.md), and [unsent Render clarification draft](render-isolation-clarification-draft.md). Original timeout cause remains unproven; client classification defect reproduced. No new infrastructure execution is authorized or proposed as ready.

Latest continuation: [November 16 recovery attempt](recovery-attempt-20261116.md) was authorized and safely aborted at an inconclusive required isolation check. Original source access is restored, staging health connected, no copy created and no incremental database cost. Do not automatically retry the terminated attempt. See current ledger for outstanding gates.

Prepared 2026-11-15 (America/Los_Angeles). This is a documentation checkpoint, not a release authorization. Read this directory before continuing on another computer.

Continuation: [current task ledger](continuation-progress.md) and [operational assessments](continuation-assessments.md). These local continuation records preserve the engineering baseline and do not grant infrastructure or delivery approval.

Owner update November 16 supersedes all fixed-start instructions below: use rolling T0/+20/+30-minute execution/abort/source-restoration timing after explicit authorization. No other operator interference is expected. The [staging credential exposure](credential-incident-20261116.md) is acknowledged and unresolved; owner explicitly prohibits credential changes and directs continued readiness work. The prior security hold pending that decision is superseded. Infrastructure execution still needs explicit approval.

- Repository: `Zentric-Analytics/Kurioticket.com`.
- Continue on the EXISTING branch `review/kurioticket-stabilization-20261105`. Do not create a replacement branch.
- Engineering baseline: `c17240c48771d23d5002af0676208930cbe45ec4`.
- This documentation commit descends directly from that baseline. Application files must retain its exact contents until another implementation unit is approved.
- Existing draft review: [PR 6721](https://github.com/Zentric-Analytics/Kurioticket.com/pull/6721), targeting `dev`. Historical status is draft/unmerged; recheck only when relevant to an authorized review unit.
- Do not chase moving `dev`, merge, deploy, resume the worker, run migrations, rotate credentials, publish OTA updates or start native builds.

## Read in order

1. [Engineering and validation](engineering-and-validation.md): completed work, final test evidence and limitations.
2. [Live state and blockers](live-state-and-blockers.md): timestamped observations, not permanent live guarantees.
3. [Recovery runbook](recovery-runbook.md): isolation, cost, approval, stop and cleanup requirements.
4. [Decisions and authorization](decisions-and-authorization.md): decisions already made versus expired or absent execution permission.
5. [Evidence and sanitization](evidence/README.md): portable evidence, original-source hashes and excluded material.

## Second computer: recover the existing branch

Use an already authorized GitHub account through normal Git authentication. Never paste credentials into chat or commit them. Clone into a new directory if no checkout exists:

```sh
git clone --branch review/kurioticket-stabilization-20261105 --single-branch https://github.com/Zentric-Analytics/Kurioticket.com.git
cd Kurioticket.com
git branch --show-current
git status --short --branch
git rev-parse HEAD
git merge-base --is-ancestor c17240c48771d23d5002af0676208930cbe45ec4 HEAD
```

Compare HEAD with the documentation checkpoint SHA supplied in the first computer's completion message and the remote branch. If an existing checkout is dirty or the remote advanced unexpectedly, stop; do not reset, overwrite, force-push or reconcile automatically. The commands above do not install dependencies, run tests or affect Render.

Open this checkout in the second Codex desktop installation and supply this README path. Browser login/control is installation-specific: do not assume the first computer's authenticated session transfers. Use the supported in-app browser and legitimate interactive authentication if needed; never export browser profiles, cookies or credentials. A second computer's public IP is not an approved database allowlist exception.

## Exact next unit

Read-only recovery readiness first. Establish actual supported browser control and inspect the existing staging database, original allowlist, staging health, worker hold and scheduling conflicts. Reuse the completed private-network preflight; do not repeat it or engineering audits. Then propose a NEW exact 30-minute America/Los_Angeles maintenance window and obtain explicit owner approval before any infrastructure write. All previously discussed windows are unavailable for execution; none carries forward to the second computer.

No restore test has completed, and no temporary recovery database has been created by this workflow. Readiness is not deployment clearance. Subsequent deployment gates remain listed in the blocker document.

## Resume prompt

> Read docs/project-handoff/README.md and its linked documents. Stay on review/kurioticket-stabilization-20261105 and verify c17240c48771d23d5002af0676208930cbe45ec4 is an ancestor. Preserve all application files. Resume only read-only staging recovery readiness through the supported Render browser. Reuse completed preflight evidence; do not repeat engineering audits or tests. Verify source identity/allowlist, staging health, worker Suspended/Auto-Deploy Off, and scheduling conflicts. Propose a new exact maintenance window for explicit approval. No infrastructure changes, PITR, charges, migrations, credential changes, worker resumption, merges, deployments, OTA or native builds. Preserve the $1 total cap, 24-hour maximum and evidence-before-cleanup requirements. Stop if the branch or environment differs unexpectedly.
