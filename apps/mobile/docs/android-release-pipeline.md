# Protected Android release pipeline

This document defines the delivery foundation. It does not authorize credentials, builds, OTA publication, Play resources, uploads, or releases.

## Environment matrix

| Control | Preview OTA | Preview build | Production |
| --- | --- | --- | --- |
| Source | exact approved commit reachable from `dev` | exact approved commit reachable from `dev` | explicitly approved full commit reachable from `main` |
| GitHub environment | `mobile-preview-ota` | `mobile-preview-build` | `mobile-production` |
| Required reviewer | none | `ZentricAnalytics` | `ZentricAnalytics` |
| Package | `com.kurioticket.app.preview` | `com.kurioticket.app.preview` | `com.kurioticket.app` |
| API | `https://staging.kurioticket.com` | `https://staging.kurioticket.com` | `https://kurioticket.com` |
| Profile/channel | `preview` / `preview` | `preview` / `preview` | `production` / `production` |
| Version/runtime | `0.3.0` / `preview-0.3.0` | `0.3.0` / `preview-0.3.0` | `0.3.0` / `production-0.3.0` |
| Permitted action | OTA update only | native APK build only | approved Production action |

The marketing versions converge at `0.3.0`, while environment-prefixed runtimes and channels independently prevent cross-delivery. Package identity is not an EAS Update isolation mechanism. Legacy runtime `0.2.0` is excluded.

## Approval and branch model

Pull requests into `dev` run validation only. A push produced by merging into `dev` runs the same required Preview validation first and, only after it succeeds, calls the shared Android Preview OTA evaluator with the exact trusted push SHA. Render deploys web staging independently. The evaluator waits for `staging.kurioticket.com` to report that exact Render commit and all public safety classifications before it can publish one Android update. A feature-branch push, `main` push, failed validation, fork event, forced push, stale staging deployment, or dispatcher-supplied automatic SHA cannot publish.

Routine JavaScript-only changes that remain compatible with the reviewed Preview binary are published automatically to channel `preview`; developers do not need owner approval for that OTA-safe path. Native-sensitive, fingerprint-changing, or uncertain changes publish nothing and produce a `PREVIEW BUILD REQUIRED` summary. The `mobile-preview-build` environment and its dedicated token remain owner-approved and are never dispatched automatically. Production delivery stays manual, `main`-only, and owner-approved.

The manual Android Preview OTA dispatcher remains temporarily as a break-glass retry for a platform outage or reviewed baseline remediation. It calls the same workflow, baseline attestation, classifier, channel, staging, replay, publication, and audit implementation as the automatic path. It cannot select package, runtime, channel, API, profile, or baseline evidence, and the selected exact SHA must still be reachable from `dev`.

`mobile-production` retains `ZentricAnalytics` review, disabled environment admin bypass, a dedicated Production token, and `main` only. Production release-tag support is future capability: no `mobile-prod-v*` tags or tag rules are authorized until a release-operator team is approved. The existing organization-administrator bypass on `main` is temporary emergency break-glass access and must not be used for routine releases.

Each native-build dispatcher has one fixed action and immutable identity inputs. The Preview OTA evaluator fixes runtime, package, channel, profile, API, and baseline in repository-reviewed policy; the manual break-glass form supplies only an exact dev-reachable SHA, nonblank reason, Android selection, and confirmation phrase. Preview OTA verifies live EAS build metadata against the immutable repository-reviewed binary manifest before generating the current Android fingerprint. Neither automatic event data nor the manual dispatcher can supply baseline source, workflow-run, artifact, fingerprint, package, runtime, channel, profile, or API evidence.

The automatic evaluator does not use dispatcher inputs. Its source comes from the successful `push` event on `refs/heads/dev` inside the required validation workflow, and the reusable OTA workflow verifies repository identity, event SHA, checked-out `HEAD`, and reachability from current `origin/dev`. Classification always covers the complete reviewed binary source-to-target range; a non-ancestor baseline fails closed. A SHA-specific concurrency group prevents overlapping publications, and EAS Preview update history prevents a repeated event from publishing the same generated audit message twice.

When EAS reports a full Git commit, it must exactly match the reviewed manifest. The first Preview APK was created while `EAS_NO_VCS` was present with the value `0`; EAS treats presence as no-VCS mode, so build `179ae3b8-3e7a-404c-bcf0-44cbdc759cff` has `Git Ref: None`. Its schema-v2 manifest therefore uses a fail-closed composite attestation: the exact finished EAS build plus the successful protected `Android Preview Build` workflow run, its immutable `dev` head SHA, the named unexpired audit artifact and GitHub-provided SHA-256 digest, and the audit's matching build ID, package, profile, runtime, channel, version, and native fingerprint. The OTA workflow retrieves those records read-only with `actions: read`, recomputes the downloaded artifact digest, and rejects any missing, expired, unrelated, or inconsistent evidence. This is not a blank-commit exception.

Future Preview builds leave `EAS_NO_VCS` unset after checking out the exact approved SHA, allowing EAS to record the Git commit while retaining the protected audit artifact. If either direct EAS commit metadata or the complete reviewed composite evidence is unavailable, the binary cannot become an OTA baseline and a new native build is required. Preview build reports the proposed remote Android version code and treats the initial binary as an explicit native-build state. Production requires an explicitly environment-approved full 40-character SHA reachable from protected `main`. Production release tags, `dev`, and feature branches are rejected. The exact approved SHA is checked out and compared with both `HEAD` and the workflow source before EAS runs. `EAS_NO_VCS` is absent so future Production builds retain normal EAS Git metadata.

Merge, push, pull-request labels, and EAS GitHub build labels never authorize delivery. Neither workflow submits to Google Play or uses `--auto-submit`. Play upload is a later, separate owner-approved action.

## OTA classifier

OTA is permitted only when all conditions hold:

- current and protected last-approved-binary native fingerprints exist and match;
- live EAS channel mapping contains exactly the intended environment branch, and publication uses `--channel`;
- runtime and channel exactly match the selected environment;
- the diff is non-empty and contains only compatible JavaScript, TypeScript, or assets that do not affect native output;
- the exact configuration and source-branch guards pass.

Package, scheme, version/runtime, dependency, lockfile, config/plugin, permission, deep-link, intent-filter, manifest, Gradle, native-directory, icon, splash, font/native-asset, or native environment-resolution changes require a native build. Missing evidence or uncertain classification also requires a native build. A human label cannot override the classifier.

The classifier treats only the actual `apps/mobile/android/` and `apps/mobile/ios/` source trees as native directories; release evidence stored beneath paths such as `release-baselines/android/` is metadata and is still bound by manifest, digest, attestation, and fingerprint verification. For an OTA dispatch, any non-`ota-compatible` result exits at classification before channel lookup or publication. Channel verification accepts only the EAS CLI's `currentPage` response with one active, unpaused, unconditional branch mapping whose channel and branch are both exactly `preview`; rollouts, multiple branches, missing mappings, and unknown response shapes fail closed.

Before an owner approves a real Preview OTA attempt, run `node scripts/dry-run-preview-ota.mjs` from `apps/mobile`. The deterministic dry run uses sanitized evidence captured from the approved baseline build and protected workflow outputs, executes the input, baseline, artifact transport, digest, ZIP, composite attestation, fingerprint, classifier, channel, staging, command-construction, failure-propagation, and audit-configuration gates, and stops with `published: false` at the publication boundary. Fixtures contain no credentials, signed URLs, customer data, or secret values; live EAS and staging reads must be recaptured and reviewed separately when the fixture provenance becomes stale.

## Version codes

EAS remote versioning is authoritative and isolated by package/profile. Auto-increment is nested under Android, so iOS build numbers are unchanged and the two Android counters remain independent. When EAS reports the exact unconfigured-project state and a filtered EAS query confirms there are no builds for `com.kurioticket.app.preview` with the `preview` profile, the first approved Preview binary proposes `versionCode` 1. EAS initializes the remote counter during that build; it is not initialized manually beforehand.

After initialization, every Preview build increments the existing numeric counter. Failed builds, including failures before EAS accepts a build job, may still advance the remote counter; those gaps are safe. A consumed or previously observed value must never be reset or reused. The failed first submission left the authoritative Preview counter at 2, so the next approved auto-incrementing attempt proposes versionCode 3 unless another approved attempt advances it first. Malformed, empty, ambiguous, unauthenticated, or otherwise unexpected EAS responses fail closed, as does any attempt to use the first-binary path for Production or the legacy package.

The Preview build runs with frozen credentials and non-interactive mode. A missing or incomplete Preview keystore therefore fails before build submission instead of generating or replacing signing material. Shell pipeline failure propagation preserves the EAS exit code through log capture. Failed runs still write a secret-free audit manifest; missing, empty, or invalid optional result files are classified without parsing failures, and artifact preservation cannot mask the original EAS failure.

Production remains governed by both EAS remote versioning and a repository-reviewed, read-only Google Play history manifest. For the first `com.kurioticket.app` binary, only the exact normalized EAS response `No remote versions are configured for this project.`, no filtered Production builds, and an explicit reviewed absent Play record with an empty uploaded-bundle list may propose `versionCode` 1. Prefixes, suffixes, warnings, partial text, and ambiguous output fail closed. After initialization, the numeric EAS counter is never reset, and every proposal must exceed the reviewed highest Play versionCode.

The Play audit uses schema 2 and records the exact package, record state, audit timestamp, evidence reference, normalized uploaded bundle versionCodes, and their maximum. A present record requires non-empty bundle evidence and a highest value equal to that evidence's mathematical maximum; an absent record requires no bundles and no highest value. Duplicate and unordered values normalize to a sorted unique list, while malformed or contradictory values fail closed. The workflow reads the same manifest from the approved commit's immutable first parent and requires the new evidence to retain every previously reviewed bundle and never lower the prior maximum. A present record cannot bootstrap without that parent evidence. The current audit must be no older than 24 hours; dispatcher inputs cannot select or replace either manifest. Missing, stale, mismatched, ambiguous, or unknown evidence blocks the build. No command in this PR creates a Play record or uploads anything.

The Production build uses `--freeze-credentials`; no protected run may generate or replace an Android credential. The native-versus-OTA classifier captures both `PIPESTATUS` values and exits with the classifier's exact nonzero status before channel lookup or publication; a `tee` failure also fails the step. EAS build and update failures likewise use shell pipeline failure propagation. Empty delivery output is recorded safely in the audit rather than parsed as success, and best-effort audit artifact preservation cannot mask the original classifier or EAS failure.

Each run uploads one secret-free JSON audit manifest with run/actor, workflow head, environment/action/reason, exact source identity, verified mapping/baseline, fingerprints/classification, version evidence, explicit EAS result ID where produced, timestamps, and final status. GitHub may cap requested retention below 365 days; an expired attestation artifact fails closed and requires a newly approved baseline build. Third-party Actions are pinned to reviewed commit SHAs; upgrades require a dependency PR that verifies the upstream tag/commit, reviews release notes and permissions, and reruns workflow security tests.

## Rollout and external gates

Preview rollout requires separate approval to create its EAS-managed keystore, run one `preview` APK build, install it, and complete staging QA. A later harmless compatible change may be used for a separately approved OTA test.

Production requires separate approvals to create the `com.kurioticket.app` Play record, create its dedicated upload keystore, select and enroll in Play App Signing, build an AAB from approved `main`, upload to Internal testing, and advance any track. Public rollout is never implied by an internal upload.

## Rollback and emergency stop

- Preview OTA: republish the last approved compatible Preview update.
- Production OTA: republish the last approved compatible Production update.
- Preview binary: reinstall a retained prior APK when compatible.
- Production binary: halt or roll back the Play Internal testing release; public rollout requires another approval.
- Native/package incompatibility is never treated as an OTA rollback.

Emergency stop: cancel pending workflow runs, withhold environment approval, remove environment access to `EXPO_TOKEN` if compromise is suspected, and leave channel mappings unchanged until an audited recovery is approved. Do not revoke signing keys or delete applications as an emergency shortcut.

## Legacy preservation

The `com.kurioticket.mobile` Play draft, Android keystore, Preview APK, Production AAB, and runtime `0.2.0` update branches/history remain untouched for audit and rollback reference. New workflows reject the legacy package and runtime. Legacy credentials and artifacts are not reused by either new identity.
