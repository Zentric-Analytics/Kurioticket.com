# Mobile environments

Kurioticket uses one Expo codebase and exactly two permanent application identities.

| Property | Preview | Production |
| --- | --- | --- |
| Display name | Kurioticket Preview | Kurioticket |
| iOS bundle ID | `com.kurioticket.app.preview` | `com.kurioticket.app` |
| Android package | `com.kurioticket.app.preview` | `com.kurioticket.app` |
| Scheme | `kurioticket-preview` | `kurioticket` |
| API origin | `https://staging.kurioticket.com` | `https://kurioticket.com` |
| EAS profile/channel | `preview` | `production` |
| Distribution | Internal / TestFlight | App Store / Google Play |
| App/runtime version | `0.3.0` / `preview-0.3.0` | `0.3.0` / `production-0.3.0` |

There are no separate staging or development identities. Local development reuses Preview and must be started explicitly:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL='http://localhost:3000'
npm run local:preview
```

On macOS or Linux:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000 npm run local:preview
```

Local mode requires `LOCAL_DEVELOPMENT=true`, which the script supplies, and is rejected by EAS builds. Release profiles require their canonical HTTPS API origin and cannot use localhost, private LAN addresses, or arbitrary hosts.

## Build preparation

The approved commands are:

```bash
eas build --platform ios --profile preview
eas build --platform ios --profile production
```

Do not run either command without the relevant owner approval. A Preview build is a signing and environment-validation build. Production builds, uploads, submissions, and releases require separate approval.

The `preview` profile is platform-specific: iOS uses store distribution to create a TestFlight-compatible IPA, while Android remains internal and produces an APK. A build only creates an EAS artifact. Submission to App Store Connect is a separate owner-approved action; never add `--auto-submit` to the build command.

Preview Android uses EAS internal distribution; no Preview Google Play record is required. The legacy `com.kurioticket.mobile` Play draft, EAS credential, builds, and update history are preserved and must not be deleted or repurposed.

EAS remote app-version management is authoritative. Android `versionCode` is independent of the user-visible `0.3.0` version and is tracked separately for each package/profile. Both profiles auto-increment remotely. The protected delivery workflow reports the current remote value before starting an approved build. A failed EAS build may consume a value; gaps are safe and values are never reused. Google Play upload history is the final authority for Production conflicts. This PR changes policy only and does not mutate any remote version code.

The Apple Explicit App IDs and App Store Connect records for `Kurioticket` and `Kurioticket Preview` already exist under the approved organization. No iOS signing certificate, provisioning profile, or iOS build exists. Historical Android `0.2.0 (8)` Preview and Production builds remain preserved.

## Public-variable policy

`EXPO_PUBLIC_*` values are compiled into the application and must never contain credentials. The only public API setting is `EXPO_PUBLIC_API_BASE_URL`; OAuth client IDs are public identifiers, not client secrets. Provider, database, authentication, email, signing, and store credentials remain server-side or in approved credential systems.

Configuration generation fails when the variant, build mode, or API origin is missing or inconsistent. Preview and Production may never cross API origins.

## TestFlight process

1. Obtain approval for a Preview iOS build.
2. Confirm the exact profile, Apple team, bundle ID, API origin, channel, signing strategy, destination, and quota impact.
3. Build with the `preview` profile.
4. Verify signing and environment identity before any TestFlight upload.
5. Obtain separate approval before uploading or adding testers.

## Runtime and OTA eligibility

Preview uses runtime `preview-0.3.0`; Production uses `production-0.3.0`. Marketing version remains `0.3.0`. Runtime and channel are independent isolation boundaries, while package identity is not used as an EAS Update boundary. Both new identities exclude legacy runtime `0.2.0`.

Preview and Production version counters are governed independently even when their values deliberately converge. They converge only when Production adopts Preview-tested native code through an approved release change; a later Preview cycle then advances first. Never lower or silently align Preview merely to match Production.

An OTA update is eligible only when all of these match the intended binary: EAS project, platform, channel, and runtime. Before publishing, confirm the update contains no native dependency, app configuration, permission, plugin, bundle/package, runtime, or other native change. OTA publishing remains disabled until a separately approved workflow is reviewed after the first binary is installed and its channel/runtime mapping is verified.

The runtime `0.2.0` Preview updates came from the former `.github/workflows/mobile-preview-update.yml`. Before commit `e25b6d9`, pushes to `dev` ran `eas update --channel preview` with messages beginning `Automated preview update from dev`; native changes could start an Android build. Commit `e25b6d9` replaced those delivery steps with validation-only jobs. The current repository contains no `eas build`, `eas update`, or `eas submit` command, and the Expo project has no configured EAS Workflow.

## Android internal distribution

After separate build approval, run `eas build --platform android --profile preview`. Confirm the resolved package, API origin, channel, runtime, and remote `versionCode` before proceeding. The output is an internal APK; it is not uploaded to Google Play.

## Production release gates

Production never builds from `dev`. Its validation workflow is scoped to `main`, and it contains no delivery command. Production build, signing, upload, submission, tester rollout, pricing, and release decisions each require explicit owner approval. Preview credentials and artifacts must never be selected for Production.

## Rollback

Automatic EAS Update publication and native builds are disabled in the repository workflows. Before delivery automation is restored, confirm the new binary exists, verify channel/runtime mapping, and prove legacy `com.kurioticket.mobile` binaries cannot receive an incompatible update.

Recovery is to leave publication disabled and revert the application-configuration commit. If a bad OTA is ever published after automation is restored, publish a separately approved corrective update to the same channel/runtime or republish the last verified update; do not change runtime merely to mask it. Do not delete Apple App IDs, App Store Connect records, EAS credentials, or legacy resources; those are permanent audit records. Existing binaries and updates remain addressable by their original runtime/channel identity.

## Known limitations and approval gates

- iOS native compilation requires macOS and Xcode and is not validated on Windows.
- Preview uses a persistent in-app banner; a badged Preview icon remains recommended future artwork.
- The staging hostname and mobile health/config endpoints are live, but deployed secret values and resource bindings have not been verified. See [Preview TestFlight readiness audit](preview-testflight-readiness.md). The first Preview build remains blocked pending that verification.
- Builds, credential generation, uploads, TestFlight distribution, store submissions, pricing, and public releases require explicit approval.
