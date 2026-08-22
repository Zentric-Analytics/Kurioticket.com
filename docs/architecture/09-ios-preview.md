# 9. iOS Preview architecture

## Identity and contract
- Bundle: `com.kurioticket.app.preview`
- App: `Kurioticket Preview`
- Runtime/channel: `preview-0.3.0` / `preview`
- ASC app id: `6797447471`

## Path
- The repository includes a dedicated iOS preview build workflow and a dedicated TestFlight submission workflow.
- Native build validation includes identity, runtime/channel/package checks and App Store Connect submission posture.
- App Store Connect integration is handled through TestFlight internal testing controls and remains owner-gated.

## Current state

- Path state is VERIFIED by live evidence references and release history:
  - iOS Preview build artifacts were successfully validated in prior native TestFlight attempts.
  - Internal TestFlight group workflow evidence is active for this identity.
  - Compatible Preview updates can follow either native/ TestFlight flow or OTA flow where identity/runtime/channel evidence matches.
  - iOS Preview OTA verification evidence is now present and retained in current handbook state.
- Production iOS path is not active in this repo delivery model.
