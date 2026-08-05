# 3. Environments

| Surface | Environment | Branch | Identity | Runtime/Channel | Distribution | Evidence |
|---|---|---|---|---|---|---|
| Web | Staging | `dev` | `Kurioticket` app web frontend | Web | Render | EXTERNAL_VERIFIED |
| Web | Production | `main` | `Kurioticket` app web frontend | Web | Render | REPOSITORY_VERIFIED |
| Mobile | Android Preview | `dev` | `com.kurioticket.app.preview` | `preview-0.3.0` / `preview` | OTA + Android native as needed | HISTORICALLY_VERIFIED |
| Mobile | Android Production | `main` | `com.kurioticket.app` | `production-0.3.0` / `production` | Google Play AAB | EXTERNAL_VERIFIED |
| Mobile | iOS Preview | `dev` | `com.kurioticket.app.preview` | `preview-0.3.0` / `preview` | TestFlight internal | HISTORICALLY_VERIFIED |
| Mobile | iOS Production | Not active | N/A | N/A | N/A | DEFERRED |

## Environment controls

- `apps/mobile/app.config.ts`, `apps/mobile/eas.json`, and `apps/mobile/release-policy.json` define variant and identity controls.
- Branch-to-environment routing remains static and gated.
- Production and Preview API/base URLs are explicit and variant-isolated.
