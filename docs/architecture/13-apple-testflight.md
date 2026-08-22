# 13. Apple / TestFlight architecture

## Known active identity

- ASC App ID: `6797447471`.
- Bundle: `com.kurioticket.app.preview`.
- Channel: preview.

## Path

1. iOS preview build generates/obtains build artifact.
2. Build validation checks identity, platform, runtime, source commit where possible.
3. Submit workflow pushes to TestFlight (internal lane only, no public rollout implied by workflows).

## Status

- Workflow and config for preview upload are implemented.
- Live TestFlight processing and active group membership are supported by prior completed evidence and release notes for internal TestFlight publication.

## Explicitly not covered

- iOS production storefront/release path.
- External TestFlight/Store public distribution.
