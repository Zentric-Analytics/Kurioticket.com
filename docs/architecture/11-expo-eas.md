# 11. Expo and EAS architecture

## EAS core

- Project ID: `89f6fd88-c0d7-495a-9e2b-8301b09f407d`
- CLI pinning in scripts uses `eas-cli@16.17.4`.
- Build output shape checks are strict JSON-parsed and fail-closed.

## Profiles

- `apps/mobile/eas.json` defines `preview` and `production` profiles.
- `preview` => internal distribution + preview channel + API origin `staging.kurioticket.com`.
- `production` => store AAB + production channel + API origin `kurioticket.com`.

## Source attestation

- `EAS_NO_VCS` is treated as unacceptable in production-critical paths.
- Workflows verify checked-out SHA matches approved input.

## Platform separation

- Android and iOS share EAS project, but identity + profile checks prevent cross-environment/cross-channel crossover.
