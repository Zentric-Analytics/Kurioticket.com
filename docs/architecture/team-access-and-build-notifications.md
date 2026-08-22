# Team Access and Preview build notifications

## Purpose

Kurioticket Team Access is the staging/Preview access registry for people who need controlled internal access. It evolves the existing Preview Tester registry without replacing its lifecycle and audit history.

The initial roles are:

- `TESTER` — Preview access, approved Google sign-in, staging/tester email delivery, and Android/iOS Preview build notifications.
- `DEVELOPER` — Preview access plus Android and iOS native build notifications.

A member may hold more than one role. Role definitions are self-documenting in Admin: the light-bulb control shows what each role grants and explicitly lists sensitive capabilities it does not grant. The member row also shows combined Effective Access.

## Database authority

Team members remain stored in the existing `PreviewTester` table for a backward-compatible migration. The `roles` string array is the role source of truth. Existing records are migrated to `TESTER` automatically.

Only records that are active, approved, not expired, and capability-eligible may receive build notifications. Both `TESTER` and `DEVELOPER` grant the platform notification capabilities. Build recipients are never supplied by an EAS payload, environment email list, or release command.

The legacy `allowGoogleSignIn` and `allowStagingEmail` columns remain populated during the compatibility period, but role capabilities are authoritative for role-enabled records.

Trusted `kurioticket.com` and `zentricanalytics.com` staging-domain behavior remains unchanged. That compatibility rule is separate from build notifications, which require an active, approved, unexpired Team Access record with the relevant capability.

## Admin management

The existing `/admin/preview-testers` route is retained for compatibility but is presented as **Team Access** in the Admin navigation and page UI.

Admins can:

- add a team member by email;
- assign Tester and/or Developer roles;
- inspect each role's grants and non-grants;
- review combined Effective Access;
- set an optional expiration;
- activate, suspend, or revoke a member;
- record a reason; and
- retain the existing admin audit trail.

Suspension and revocation continue to revoke active staging sessions for matching Kurioticket user accounts.

## Native build notification milestones

Notifications are Preview-only and are derived from the existing durable Preview release ledger.

### Android success

An Android success notification is eligible only when the fingerprint-owned `ANDROID_BUILD` ledger action is `FINISHED` and EAS returns a verified exact-build Expo install page.

The email includes build metadata, the exact source SHA, release classification when available, Expo build details, and a direct **Install Android Preview** action using the exact EAS artifact URL.

### iOS success

An iOS success notification is eligible only after the fingerprint-owned `IOS_BUILD` and its exact `IOS_SUBMISSION` action are `FINISHED`, Apple processing is valid, the required internal TestFlight group association succeeds, and membership read-back is verified.

The iOS email does not expose a direct IPA download. It tells the developer to install/update Kurioticket Preview through TestFlight and includes build/submission metadata and Expo build details.

### Failures

Terminal Android/iOS EAS build failures generate failure notifications when durable build identity exists. iOS submission, TestFlight, and Apple-distribution failures after compilation are also treated as iOS native delivery failures for developer notification purposes.

Notification delivery failures are isolated from native release success/failure state. They are logged, but they do not rewrite the Preview release ledger or turn a verified successful app release into a failed release.

## Email delivery and idempotency

The staging web application owns recipient selection and email delivery through the existing Resend transactional email service.

The Preview release worker calls the staging-only internal endpoint:

`POST /api/internal/preview-build-notifications`

The endpoint requires the shared `PREVIEW_BUILD_NOTIFICATION_SECRET` in the `x-kurioticket-preview-build-secret` header and uses a timing-safe comparison.

Each recipient/platform/build final outcome uses a deterministic Resend idempotency key:

`preview-build-final:{platform}:{buildId}:{memberId}`

This prevents reconciliation from sending duplicates or contradictory success/failure outcomes. Reconciliation runs even after the release is complete; the durable email delivery record suppresses messages already accepted by Resend.

## Required Render configuration

The same strong `PREVIEW_BUILD_NOTIFICATION_SECRET` must be configured on:

- `kurioticket-preview-release`
- `kurioticket-web-staging`

Both values are declared as `sync: false` in `render.yaml`; no secret value belongs in GitHub.

Staging also requires `STAGING_EMAIL_DELIVERY_ENABLED=true` plus the existing Resend configuration.

If the notification secret is absent from the worker, the worker logs that notifications are disabled and continues normal release delivery.

## Security boundaries

The Developer role does **not** grant:

- Kurioticket Admin access;
- Production deployment authority;
- Production database access;
- Apple App Store Connect management authority; or
- Google Play Console management authority.

The notification endpoint is staging-only. Production web and Production mobile delivery configuration are unchanged.

## Rollback / disable procedure

To disable build emails without changing native delivery:

1. Remove/unset `PREVIEW_BUILD_NOTIFICATION_SECRET` from the Preview release worker, or suspend/revoke the affected Team Access records.
2. Leave the Preview release ledger and native delivery configuration unchanged.

To roll back Team Access role behavior, revert the application changes and preserve the added database column until a separately reviewed data migration removes it. Do not drop role data as part of an application rollback.

## Native build ownership and incident recovery

The Preview release worker is the sole native-build owner. Expo GitHub build triggers and GitHub Actions that create EAS builds must remain absent. The worker detects EAS build-history IDs not present in the durable ledger, stores immutable ownership-incident evidence, and fails closed on any identity, SHA, fingerprint, version, package, artifact, or submission mismatch.

A fully matching finished artifact can be adopted only through `npm run preview-release:adopt-native`; direct database repair is prohibited. Missing historical provider objects are isolated as durable operator-attention records, allowing the unaffected platform's notification reconciliation to continue without fabricating or deleting history.

Fingerprint planning must use the pinned EAS CLI with the `preview` build profile so dynamic Expo config sees the same EAS environment as cloud builds. A rejected ownership incident may be replaced only through `preview-release:recover-native`, which is Preview-only, active-mode-only, current-`dev`-only, requires an existing rejected incident, reserves the canonical fingerprint before creation, and executes normal platform delivery. It is not a general manual-build bypass.
