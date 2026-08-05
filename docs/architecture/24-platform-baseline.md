# 24. Platform baseline

Documented: 2026-08-05
Working source: `docs/finalize-delivery-platform-baseline`
Scope: repository and delivery architecture baseline snapshot

## Repository

- Organization: `Zentric-Analytics`
- Repository: `Kurioticket.com`
- Default branch: `dev`
- dev SHA: `4e424369b70ccab7a3863b7b88f713ce33cf1c7e`
- main SHA: `20e3f10baf7fa1e9bb85df81dedaff964e4da043`
- merge base: `20e3f10baf7fa1e9bb85df81dedaff964e4da043`
- handbook source commit on branch: `4e424369b70ccab7a3863b7b88f713ce33cf1c7e`

## Governance baseline

- `feature -> PR -> dev` remains the standard path.
- `main` remains owner-admin controlled for release actions.
- Required checks remain active for protected paths.
- Owner-controlled production dispatch remains required and workflow-gated.

## Web

- Render staging service: `kurioticket.com-staging` (`srv-d86ulfgg4nts73bctt20`)
- Trigger branch: `dev`
- Build: `npm ci && npm run build`
- Predeploy: `npm run db:deploy:render`
- Health: `/api/health`
- Verification discipline: staging SHA badge and route checks
- Caching: root HTML no-store, hashed assets with normal cache

## Android Preview

- App: `Kurioticket Preview`
- Package: `com.kurioticket.app.preview`
- Runtime/channel: `preview-0.3.0` / `preview`
- API: `https://staging.kurioticket.com`
- Delivery mode: OTA-compatible when classifier allows; otherwise controlled native fallback

## Android Production

- App: `Kurioticket`
- Package: `com.kurioticket.app`
- Version: `0.3.0`
- Runtime/channel: `production-0.3.0` / `production`
- Current accepted versionCode: `2`
- Minimum next versionCode: `>2`
- Distribution: Google Play AAB
- Verified build: `c84c196e-7928-4f26-8b7c-a15f37f031db`
- Source SHA for verified build: `20e3f10baf7fa1e9bb85df81dedaff964e4da043`
- Play App Signing: active (evidence in prior production verification)

## iOS Preview

- Bundle ID: `com.kurioticket.app.preview`
- App: `Kurioticket Preview`
- Runtime/channel: `preview-0.3.0` / `preview`
- API: `https://staging.kurioticket.com`
- Latest verified build number: `3`
- App Store Connect app id: `6797447471`
- TestFlight group: `Kurioticket Preview Internal`
- Distribution: internal TestFlight

## iOS Production

- Status: `deferred` (no active production iOS delivery path in this architecture snapshot)

## External platforms

- Render: external evidence for staging verified.
- EAS: preview + production profile evidence and delivery policy present in-repo.
- Google Play: external evidence for first verified production build and internal testing.
- Apple / App Store Connect: iOS Preview verification evidence available.

## Evidence timestamps

- Repository snapshot: 2026-08-05
- External verification checkpoints: as recorded in platform inventories
