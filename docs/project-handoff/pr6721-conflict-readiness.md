# PR6721: pinned conflict and release-readiness findings

Observed November16,2026, approximately05:51–05:56PST. Read-only remote inspection and local merge analysis only. No branch merge/rebase/reset, conflict resolution, working-tree/index change, commit, push, workflow trigger or deployment. Existing local handoff documentation edits preserved.

## Exact conflict explanation

Two different base snapshots explain the initial contradiction:

| Evidence surface | Base | Head / result |
|---|---|---|
| PR REST/GraphQL metadata | `d93e3541b87eac99445bb9499e257067806c2894` | head `74a65ca5aa17fc2b51ddbf25f2299958d2a874b8`; dirty/CONFLICTING |
| Compare API and local ancestry at that displayed old base | `d93e354...` | review18ahead/0behind; base is ancestor; merge analysis exit0, exact head tree `37584d1dd56b8706459a60756244126652fb19b5` |
| Live Git branch ref from one pinned `git ls-remote` snapshot | `refs/heads/dev` = `7041310cfb158ab285f82e04ef165f21e113bda1` | PR head ref still `74a65ca...`; review18ahead/365behind relative to live dev |
| Git merge analysis of live pinned base/head | `7041310...` | exit1, five content-conflicted files |
| Existing PR merge ref | `1a7f45757a1ac1fa3dd6cf24be3835a0e13d1367` | parents `d93e354...` and **old** review `be27d63a30ad740969d0f4d54ed2145f20b5cccd` |

The supplied PR metadata and synthetic merge ref are stale relative to live Git refs. A merge against the displayed old base has no content conflicts, but that is not the actual current-dev integration. Genuine content conflicts are reproducible against the pinned live dev commit. The exact internal cause of GitHub's stale PR snapshots is not known; do not claim it has been repaired. No moving branch was integrated: immutable hashes were used after discovery, and local refs/application files stayed unchanged. `git merge-tree --write-tree` computed object-only analysis without applying it to the index/worktree or a branch; its output is not a release candidate.

Conflict evidence is retained outside the repo as `outputs/kurioticket-pr6721-merge-analysis.txt`. Git's conflicted analysis tree is `012676ce3755eeef21c590557fa5ff2839b11c38`; never check it out, build it or treat it as a resolved merge.

## Five conflict files and proposed reconciliation intent

| File | Conflict / preservation requirements for an authorized integration |
|---|---|
| `src/components/admin/AdminAuditLogsToolbar.tsx` | Review replaced effect-based prop reset with a committed-scope guard. Live dev adds debounced search, ref-owned draft filters, query composition and back/forward handling. Preserve newer navigation/search behavior while retaining safe state synchronization; do not discard either side wholesale or restore stale input/reset races. |
| `src/components/admin/FeatureControlsPanel.tsx` | Review adds server-scoped snapshots, permission rechecks, stale-confirmation clearing and disable-while-saving. Live dev adds dialog focus trapping/restoration, optional-note/production reason UI and category presentation. Combine security/state guarantees with newer accessible UI; keep production reason and server authorization contracts. |
| `src/app/admin/confirmed-trips/alerts/page.test.ts` | Competing assertions describe different Delivery Health structures and global alert navigation/Settings integration. Match the explicitly retained live-dev information architecture while preserving read-only/acknowledgment and authoritative-data assertions. |
| `src/app/admin/notifications/page.test.ts` | Live dev removes old Monitoring boundaries copy; review asserts a specific AST heading/section. Resolve against approved current behavior, keeping truthful data/alert boundaries rather than reintroducing obsolete wording or weakening substantive assertions. |
| `src/app/admin/settings/page.test.ts` | Competing row copy/category layout and confirmation-control assertions. Retain permission revocation, saving, production-reason and confirmation behavior with live-dev Settings/dialog presentation. |

No resolution was implemented. Package manifests/locks and other files auto-merged in object analysis, but auto-merge is not semantic validation. Do not reuse a synthetic result or rerun old full suites now. A separately authorized pinned integration needs focused tests for both runtime components, the three affected admin contracts, navigation/permission changes, then exact integrated-candidate checks as justified by that new tree.

## Policy, reviews and CI — separate blockers

- PR is open, draft and unmerged. Draft status independently prevents ordinary merge readiness and must not be changed without the authorized review step.
- Effective dev ruleset20331819, read through `/rules/branches/dev`, requires **Validate mobile preview** and **secret-scan**, with strict up-to-date policy and GitHub Actions integration15368. It also requires PRs and resolved review threads, has0ordinary required approving reviews/no code-owner requirement, and a conditional extra-approval rule for unattributed changes. Eligibility for that conditional rule was not established.
- No submitted reviews, inline review threads or requested reviewers returned. This does not replace owner release approval. There is no observed changes-requested review to blame for the content conflicts.
- Current exact head check-runs endpoint returns total_count0; commit-status endpoint returns total_count0 with aggregate pending. Empty pending is **missing status**, not evidence a job is running. Actions runs for exact head and the stale merge SHA each return total_count0.
- Classic branch-protection endpoint returned404, while branch metadata says protected:true and ruleset API returns active rules. Do not interpret the404/classic enabled:false object as an unprotected branch.
- Workflow defines Travel platform parity as well, but only the two named checks above are confirmed ruleset-required at this observation. Do not substitute workflow job names for actual branch policy.
- [GitHub documents](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request) that pull_request workflows do not run with merge conflicts. This is a relevant obstacle, not proof that conflicts are the sole cause of absent runs here. No dispatch/rerun, draft toggle, push or status override was performed.

## Migration compatibility: new narrow evidence

Candidate against displayed old base `d93e354...` changes **no Prisma schema/migration or migration-wrapper/verifier files**. The pinned live-dev delta from that base adds precisely `20261106000000_admin_notification_preferences` and its corresponding Prisma model/User relation. Its SQL creates an additive AdminNotificationPreference table, unique adminUserId index and cascading User foreign key. This directly explains the provenance of one extra successful migration recorded on the newer live staging database: it belongs to live-dev work missing from this older candidate base, not a new stabilization migration.

That is provenance evidence, not live definition/type/constraint validation or deployment approval. The UserProfile checksum mismatch and extra support-index migration remain historical exceptions; index existence alone does not prove its data backfill. Do not rewrite ledger/checksums or replay SQL. A future approved integration must retain the new model/migration and current Settings consumer while checking old/new application compatibility. No database query, schema change or predeploy command was run.

## Worker and native preparation

No worker code or native app/EAS/release-policy configuration delta was found in either candidate-vs-old-base or pinned live-dev-vs-old-base comparisons. Candidate dependency/security changes still require fingerprint-matching binaries: no config delta does not establish native compatibility. Reuse recorded fingerprints until an approved integrated tree justifies recomputation; builds61/52 remain unsuitable. No build, submit, OTA or distribution initiated.

Worker hold must remain. Bounded SELECT-only ledger reconciliation and remote-ID matching plan are prepared, but no safe private ledger route has been established and no live clean-backlog claim is made. Do not resume the worker or repair its old GitHub401 to obtain evidence. Existing source allowlist remains restored; no private preflight or full engineering suite was repeated.

## Next safe actions / authorization boundaries

1. Render clarification is finalized but owner selected **keep unsent**. Preserve it without opening/submitting a support conversation. Recovery proof remains blocked; no retry proposal is execution-ready.
2. Review this five-file reconciliation intent and complete the remaining pinned integration scope before any owner-authorized integration. Current authorization permits investigation/preparation, not branch reconciliation. Do not merge/push or change CI/review policies.
3. Once integration is explicitly authorized, pin the agreed base/head again at start; if they differ, report drift rather than chasing dev. Preserve engineering guarantees, resolve conflicts as one reviewable local unit, and validate the new exact tree. Push/review-state change, CI dispatch if needed, native builds/distribution, worker resumption and deployment each retain their authorization gates.
