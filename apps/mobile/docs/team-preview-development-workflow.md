# Team Preview development workflow

Production is separate from this workflow. Routine development never builds, updates, uploads, or releases a Production app.

## Normal team loop

1. Create a feature branch from `dev`.
2. Open a pull request into `dev`.
3. Wait for the required checks to conclude successfully.
4. Resolve every review thread and conflict, then merge into `dev`.
5. Review the independent Preview Release Service record for the merged SHA; required PR checks remain validation-only.
6. Confirm the **Preview visual availability** summary names the same full dev SHA.
7. Open <https://staging.kurioticket.com> and verify the web change.
8. For Android, reopen **Kurioticket Preview**. OTA-compatible changes download on launch. When the summary says `BUILD`, install the new internal Preview APK from the successful build's EAS artifact link.
9. For iOS, reopen **Kurioticket Preview** from TestFlight. OTA-compatible changes download on launch. When the summary says `BUILD`, install the newer build after TestFlight finishes processing it.
10. Report a problem with the target SHA, workflow run URL, platform, and the exact failed stage shown in the summary.

## What the system decides

- `WEB_ONLY_SUCCESS`: Render reached the exact dev SHA; no mobile delivery was needed.
- `OTA_SUCCESS`: compatible Android and iOS updates were published automatically.
- `ANDROID_NATIVE_BUILD_REQUIRED`: Android is rebuilt; iOS receives a compatible OTA.
- `IOS_NATIVE_BUILD_REQUIRED`: iOS is rebuilt and uploaded to Internal TestFlight; Android receives a compatible OTA.
- `BOTH_NATIVE_BUILDS_REQUIRED`: both Preview binaries are refreshed.
- A failed run is never a visual-success signal. The first failing gate is the required next action.

The baseline is the newest finished EAS Preview build for the exact package, project, runtime, channel, platform, and dev ancestry. Team members do not enter EAS build IDs, runtime strings, channels, tokens, or confirmation phrases for the normal loop.

## Visible source confirmation

- Web: `/api/mobile/v1/health` and `/api/mobile/v1/config` return `Cache-Control: no-store` and expose the staging classification, exact deployed commit SHA, service-start release timestamp, application version when available, sandbox safety, email restriction, and checkout state.
- Mobile: the Preview Release Service ledger records the exact dev SHA, native fingerprints, per-platform decision, and resulting EAS action. The launcher name remains **Kurioticket Preview**.

## Access and installation

- Android Preview package: `com.kurioticket.app.preview`; internal artifact only. Download only from the exact-SHA EAS Preview build recorded by the release ledger.
- iOS Preview bundle: `com.kurioticket.app.preview`; TestFlight Internal only. Testers need the minimum App Store Connect role and access only to the Preview app/group.
- Never share signing files, API keys, Expo tokens, private artifact URLs, or tester lists in issues or chat.

## Owner-only Production boundary

`main`, `mobile-production`, Android Production builds/OTAs, Google Play uploads, and every public release remain owner/admin controlled. Do not use a Preview run to diagnose or alter Production.

## Break-glass recovery

The manual Preview workflows remain available to owners for exceptional recovery. They reuse the same fixed Preview identity and safety rules. Routine development must use the automatic dev flow above.
