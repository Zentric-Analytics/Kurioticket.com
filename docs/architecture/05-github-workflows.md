# 5. GitHub workflows

## Current workflow files in repository checkout (10 total)

- `.github/workflows/android-preview-build.yml`
- `.github/workflows/android-preview-ota.yml`
- `.github/workflows/android-production-delivery.yml`
- `.github/workflows/ios-preview-build.yml`
- `.github/workflows/ios-preview-testflight-submit.yml`
- `.github/workflows/migration-validation.yml`
- `.github/workflows/mobile-preview-update.yml`
- `.github/workflows/mobile-production-update.yml`
- `.github/workflows/preview-dev-delivery.yml`
- `.github/workflows/security.yml`

## Classification of checked-in workflows

| File | Role | Trigger intent | Mutates external state | Mutates store/release state | Notes |
|---|---|---|---|---|
| `.github/workflows/android-preview-build.yml` | Preview build callable/manual entry | `workflow_call` + `workflow_dispatch` | Yes (EAS build) | No | Builds preview Android binary with immutable source checks and runtime/profile validation. |
| `.github/workflows/android-preview-ota.yml` | Preview OTA callable/manual entry | `workflow_call` + `workflow_dispatch` | Yes (EAS Update publish to `preview`) | No | Runs replay/attestation and publishes only OTA-compatible Android preview updates. |
| `.github/workflows/android-production-delivery.yml` | Production entrypoint | Manual `workflow_dispatch` | Yes (AAB build or Production update action) | Potentially yes (if action=update/build) | Production-gated by `mobile-production` environment; dry-run is non-submitting. |
| `.github/workflows/ios-preview-build.yml` | iOS preview build callable/manual entry | `workflow_call` + `workflow_dispatch` | Yes (EAS build) | No | Produces signed iOS preview build for internal TestFlight path. |
| `.github/workflows/ios-preview-testflight-submit.yml` | TestFlight upload entry | Manual `workflow_dispatch` | Yes (App Store Connect TestFlight submit) | No (submission-only path) | Internal TestFlight update for preview; no public rollout path in file. |
| `.github/workflows/migration-validation.yml` | Migration safety check | `pull_request`, `push`, manual | No | No | Validates Prisma migration/schema safety and migration ordering. |
| `.github/workflows/mobile-preview-update.yml` | Preview delivery orchestrator | `pull_request`, `push`, manual | No | No | Required mobile validation and preview dispatch routing. |
| `.github/workflows/mobile-production-update.yml` | Production gate orchestrator | `push` (main), manual | No | No | Required production checks and release-policy enforcement before owner actions. |
| `.github/workflows/preview-dev-delivery.yml` | Preview evaluation orchestrator | `workflow_call` | No | No | Evaluates review outcome and routes preview behavior. |
| `.github/workflows/security.yml` | Security guard | `pull_request`, `push` | No | No | Secret scanning and policy enforcement check. |

## Workflow evidence and history

- No historical workflow files are represented outside this repository snapshot.
- All workflow files above are represented in the branch checkout and are used in current operational classification.
