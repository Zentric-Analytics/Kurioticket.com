# Protected Android release pipeline

This document defines the delivery foundation. It does not authorize credentials, builds, OTA publication, Play resources, uploads, or releases.

## Environment matrix

| Control | Preview | Production |
| --- | --- | --- |
| Source | approved commit reachable from `dev` | immutable release tag, or explicitly approved commit reachable from `main` |
| GitHub environment | `mobile-preview` | `mobile-production` |
| Package | `com.kurioticket.app.preview` | `com.kurioticket.app` |
| API | `https://staging.kurioticket.com` | `https://kurioticket.com` |
| Profile/channel | `preview` / `preview` | `production` / `production` |
| Version/runtime | `0.3.0` / `preview-0.3.0` | `0.3.0` / `production-0.3.0` |
| Native artifact | internal APK | Google Play AAB |

The marketing versions converge at `0.3.0`, while environment-prefixed runtimes and channels independently prevent cross-delivery. Package identity is not an EAS Update isolation mechanism. Legacy runtime `0.2.0` is excluded.

## Approval and branch model

Pull-request and branch-push workflows validate only. Delivery is available solely through `workflow_dispatch`. Configure `mobile-preview` with a required reviewer, prevent self-review/admin bypass, allow only `dev`, and store its own environment-scoped `EXPO_TOKEN`. Configure `mobile-production` with owner plus independent release/security review, prevent self-review/admin bypass, allow protected `main` and immutable `mobile-prod-v*` tags only, and store a separate environment-scoped token; an optional wait timer is recommended. These external settings are not created by this PR.

The dispatcher supplies an exact SHA, action, runtime, package, channel, nonblank reason, confirmation phrase, and an approved EAS build ID for OTA updates (`NONE` for builds). It cannot supply a baseline SHA or fingerprint. The workflow verifies live EAS build metadata against an immutable repository-reviewed binary manifest, then generates the current Android fingerprint. Missing or inconsistent evidence fails closed. Production tags must match `mobile-prod-v*`, be annotated, signed, protected from update/deletion, and resolve to the exact SHA; an explicitly environment-approved `main` commit is the documented exception.

Merge, push, pull-request labels, and EAS GitHub build labels never authorize delivery. Neither workflow submits to Google Play or uses `--auto-submit`. Play upload is a later, separate owner-approved action.

## OTA classifier

OTA is permitted only when all conditions hold:

- current and protected last-approved-binary native fingerprints exist and match;
- live EAS channel mapping contains exactly the intended environment branch, and publication uses `--channel`;
- runtime and channel exactly match the selected environment;
- the diff is non-empty and contains only compatible JavaScript, TypeScript, or assets that do not affect native output;
- the exact configuration and source-branch guards pass.

Package, scheme, version/runtime, dependency, lockfile, config/plugin, permission, deep-link, intent-filter, manifest, Gradle, native-directory, icon, splash, font/native-asset, or native environment-resolution changes require a native build. Missing evidence or uncertain classification also requires a native build. A human label cannot override the classifier.

## Version codes

EAS remote versioning is authoritative and isolated by package/profile. Auto-increment is nested under Android, so iOS build numbers are unchanged and the two Android counters remain independent. Production additionally requires a repository-reviewed, read-only Play history manifest and proves the proposed value is greater than the highest uploaded versionCode; an absent Play record is explicit. Missing/unknown history blocks the build. No command in this PR creates a Play record or uploads anything.

Each run uploads one secret-free JSON audit manifest for 365 days with run/actor, environment/action/reason, exact source identity, verified mapping/baseline, fingerprints/classification, version evidence, result ID where produced, timestamps, and final status. Third-party Actions are pinned to reviewed commit SHAs; upgrades require a dependency PR that verifies the upstream tag/commit, reviews release notes and permissions, and reruns workflow security tests.

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
