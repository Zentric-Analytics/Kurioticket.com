# 8. Android Production architecture

## Identity and contract
- Package: `com.kurioticket.app`
- App: `Kurioticket`
- Runtime/channel: `production-0.3.0` / `production`
- API: `https://kurioticket.com`
- Distribution: Google Play Store

## Intended production flow

1. Dev/main promotion handled via release branch + merge policy.
2. Owner-run dry-run checks and production workflow dispatch.
3. `build --non-interactive --freeze-credentials --json` with exact immutable SHA.
4. Build result (`build:view`) and source identity validated before any upload.

## Current state

- Baseline evidence references versionCode `2` and build `c84c196e-7928-4f26-8b7c-a15f37f031db`.
- AAB build and Google Play Internal Testing path are externally verified in approved release evidence, with Play App Signing active.

## Risk posture

- Manual owner action boundary for production remains intact.
- Any platform rollout remains outside this branch.
