# Preview TestFlight readiness audit

This record contains no secret values. It describes the read-only state observed before the first Preview iOS build.

## Version and delivery evidence

- The live EAS build inventory contained Android `0.2.0 (8)` Preview and Production builds and no iOS build. No build or runtime using `0.3.0` was present.
- The `preview` channel and branch contain historical runtime `0.2.0` updates with messages beginning `Automated preview update from dev`.
- Git history identifies the former Preview GitHub Actions workflow as their source. Commit `e25b6d9` removed its `eas update` and Android `eas build` steps.
- Current mobile GitHub Actions workflows are validation-only. The EAS Workflows page is unconfigured. No remaining repository or EAS server-side workflow capable of automatic mobile delivery was found.

The smallest collision-free Preview increase is app version and runtime `0.3.0`. Production stays at version `0.2.0` and retains its app-version runtime policy.

## Staging safety classification

| Dependency | Classification | Evidence and required follow-up |
| --- | --- | --- |
| Database | Verified non-production | The deployed service is bound to the separate database in the authorized Staging Workspace and not to the Production database. |
| Travel provider | Production/live | Staging mode and sandbox permission are configured, but the deployed Duffel mode and credential are live. Replacement with test mode and a test credential remains mandatory. |
| Authentication | Unknown | Canonical staging application and callback URLs are configured, but an authorized operator must still confirm the protected secret values differ from Production. |
| Email | Production/live | Resend is configured without a verified staging allowlist or staging-labelled sender, so unrestricted external delivery remains possible. |
| Transactions and bookings | Production/live | Kurioticket does not directly create supplier orders or charges, but its current live provider handoff can reach an external checkout. |
| Monitoring and analytics | Verified non-production | Render logs and metrics are scoped to the staging service and application records use the separate staging database. |

The first Preview build remains blocked until the live provider credential and mode are replaced, email is restricted, authentication secret separation is confirmed, the staging deployment is reverified, and the repository safeguards below are deployed.

## Apple signing audit

No Apple Distribution certificate, App Store provisioning profile, or EAS iOS credential was present for `com.kurioticket.app.preview` during the audit. With EAS-managed credentials, the first approved store build will request permission to:

1. authenticate to the KURIOTICKET LLC Apple team, normally including owner login and two-factor authentication;
2. create one team-scoped Apple Distribution certificate;
3. create one App Store provisioning profile for `com.kurioticket.app.preview`; and
4. store the resulting signing metadata in EAS.

The account currently has no certificate to reuse, so the new certificate consumes one distribution-certificate slot. EAS must not revoke, replace, or modify an unrelated certificate. Provisioning profiles can be regenerated; certificate revocation is disruptive to future builds and profiles and is never part of this flow without separate approval.

No certificate, provisioning profile, build, upload, submission, or release occurred while preparing this change.

## Staging hardening and Render follow-up

Repository safeguards now fail closed when the canonical staging deployment is not explicitly configured for staging provider mode, Duffel test mode, sandbox-provider permission, and a configured provider credential. The credential's test/live classification must still be verified manually by an authorized operator; repository code does not inspect, log, or claim to prove the protected value's classification. Staging email requires a non-empty recipient allowlist containing only valid addresses and permits one normalized exact-match recipient per send. Display-name, multiple-recipient, substring, and unlisted plus-address forms are rejected. CC and BCC are not supported by the centralized sender. The sender address must use a `staging` or `preview` local-part token, or an exact `staging` or `preview` domain label; a superficial substring is insufficient. Provider checkout handoffs are disabled in staging, authentication requires canonical staging URLs and configured staging secrets, and public/diagnostic records carry only the safe `staging` or `production` environment classification.

After this repository change is approved and merged, an authorized operator must separately approve and perform the Render changes. Set `TRAVEL_PROVIDER_MODE` to `staging`, `DUFFEL_API_MODE` to `test`, and `ALLOW_SANDBOX_PROVIDERS` to `true`; replace the live Duffel credential with a test credential and manually verify its classification; configure `STAGING_EMAIL_ALLOWED_RECIPIENTS`; and use a sender matching the exact policy above. Confirm `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` remain on `staging.kurioticket.com`, and manually confirm staging authentication and OAuth secret values differ from Production without displaying them.

Saving Render environment changes requires a staging redeploy. Redeployment needs separate owner approval. Afterward, verify the mobile health and config endpoints report `environment: staging`, confirm provider test-mode behavior without creating an order, verify allowed and blocked email recipients without contacting external recipients, and repeat the complete staging safety audit. The first Preview build remains blocked until those checks pass.

Rollback is repository-first: revert the hardening commit if it causes an application regression. Render variables and credentials should be restored only from Render's protected history by an authorized operator. Removing the staging allowlist or invalidating any provider control intentionally leaves the affected feature disabled. Production URL, provider, email, authentication, redirect, and version behavior are unchanged by these staging-only gates.
