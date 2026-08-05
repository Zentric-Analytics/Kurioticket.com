# 23. Delivery architecture freeze policy

Date: 2026-08-05
Status: Active
Path: `docs/architecture/23-delivery-architecture-freeze.md`

## Baseline intent

This handbook and supporting workflows are in a **delivery-freeze baseline** mode.
The baseline does not block normal bug fixes; it defines the change-control criteria for architecture
or delivery-infrastructure edits.

## Current freeze scope

- Branch governance and release boundaries are frozen to current behavior.
- Preview vs Production identity routing is frozen (`com.kurioticket.app.preview` vs `com.kurioticket.app`).
- Environment contract and channels are frozen (`preview` and `production`).
- Evidence-driven PR review plus explicit owner production gate remain required.

## Allowed architecture change triggers

- Reproducible operational defect.
- Required external-platform change.
- Confirmed security vulnerability.
- Planned milestone requiring architecture extension.
- Owner-approved reviewed design request.

## Branch governance freeze components

- Team pushes/PR merges continue to `dev`.
- Ordinary collaborators do not push directly to `main`.
- `main` remains owner/admin-controlled and owner-gated for production release dispatch.
- Required checks remain enforced on protected branches.
- Production dispatch continues to require owner authorization.

## Web and staging systems

- Render follows `dev` to staging via auto-deploy.
- Exact-deployed SHA must match expected merged SHA.
- Staging build badge and health/config endpoints are part of release validation.
- Caching behavior remains fixed: no-store for root HTML in staging.

## Android Preview baseline

- Separate Preview identity: `com.kurioticket.app.preview`, `Kurioticket Preview`.
- Staging API for Preview app path is required.
- Runtime/channel: `preview-0.3.0` / `preview`.
- Compatible OTA path is frozen and automatic from verified preview decision logic.
- Native-build-required outcomes remain controlled and do not publish OTA.

## iOS Preview baseline

- Separate Preview identity: `com.kurioticket.app.preview`.
- API: staging.
- Runtime/channel: `preview-0.3.0` / `preview`.
- Compatible OTA update behavior is verified for iOS preview path (where applicable).
- TestFlight internal native delivery remains explicit and manual gating.

## Android Production baseline

- Source from approved `main` SHA only for production builds.
- Owner authorization and approval remains explicit.
- `--freeze-credentials` and identity verification are mandatory.
- No automatic public rollout from merge.
- Play App Signing and internal testing controls remain external platform governed.

## Production isolation and safety

- No production action can be driven by dev-only paths.
- No preview credentials are used for production builds and vice versa.
- No public release from this repository automation without explicit owner operations outside this path.

## Change-control requirements

Any proposed architecture change against this baseline must include:

1. Problem statement and impact scope.
2. Evidence of defect/need.
3. Risk and rollback strategy.
4. Verification plan and test results.
5. Updated documentation and this freeze file for any baseline deviation.
