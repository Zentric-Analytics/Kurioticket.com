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

The current `preview` profile uses internal distribution. On iOS that produces an internal/ad hoc build, not an App Store Connect/TestFlight upload. The same `com.kurioticket.app.preview` identity can later be used for TestFlight, but changing the iOS Preview distribution to `store` and uploading it require a separately reviewed configuration change and owner approval.

Preview Android uses EAS internal distribution; no Preview Google Play record is required. The legacy `com.kurioticket.mobile` Play draft, EAS credential, builds, and update history are preserved and must not be deleted or repurposed.

The Apple Explicit App IDs and App Store Connect records for `Kurioticket` and `Kurioticket Preview` already exist under the approved organization. No signing certificate or provisioning profile was created, and no Preview or Production build has been created.

## Public-variable policy

`EXPO_PUBLIC_*` values are compiled into the application and must never contain credentials. The only public API setting is `EXPO_PUBLIC_API_BASE_URL`; OAuth client IDs are public identifiers, not client secrets. Provider, database, authentication, email, signing, and store credentials remain server-side or in approved credential systems.

Configuration generation fails when the variant, build mode, or API origin is missing or inconsistent. Preview and Production may never cross API origins.

## TestFlight process

1. Obtain approval for a Preview iOS build.
2. Confirm the exact profile, Apple team, bundle ID, API origin, channel, signing strategy, destination, and quota impact.
3. Build with the `preview` profile.
4. Verify signing and environment identity before any TestFlight upload.
5. Obtain separate approval before uploading or adding testers.

## Rollback

Automatic EAS Update publication and native builds are disabled in the repository workflows. Before delivery automation is restored, confirm the new binary exists, verify channel/runtime mapping, and prove legacy `com.kurioticket.mobile` binaries cannot receive an incompatible update.

Recovery is to leave publication disabled and revert the application-configuration commit. Do not delete Apple App IDs, App Store Connect records, EAS credentials, or legacy resources; those are permanent audit records. Existing binaries and updates remain addressable by their original runtime/channel identity.

## Known limitations and approval gates

- iOS native compilation requires macOS and Xcode and is not validated on Windows.
- Preview uses a persistent in-app banner; a badged Preview icon remains recommended future artwork.
- The staging hostname and mobile health/config endpoints are live, and repository infrastructure documents separate staging services. Actual provider, authentication, email, and transaction credential classification has not been verified; confirm it before producing a Preview binary.
- Builds, credential generation, uploads, TestFlight distribution, store submissions, pricing, and public releases require explicit approval.
