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
| Database | Unknown | `render.yaml` declares a distinct `kurioticket-postgres-staging` database, name, and user, but the deployed binding was not accessible for verification. |
| Travel provider | Unknown | The staging blueprint declares a separate `DUFFEL_API_KEY`, but does not declare `TRAVEL_PROVIDER_MODE`, `DUFFEL_API_MODE`, or `ALLOW_SANDBOX_PROVIDERS`. Server defaults are production/live under a production Node runtime. An authorized operator must prove sandbox mode and a non-production key. |
| Authentication | Unknown | Staging has separate secret placeholders, but deployed issuer, callback origin, client, and secret isolation were not verifiable. |
| Email | Unknown | Staging has separate Resend placeholders, but the deployed key, sender, and recipient safeguards were not verifiable. Real email cannot yet be ruled out. |
| Transactions and bookings | Unknown | Kurioticket does not directly collect travel-payment cards and generally hands off to providers, but a live provider redirect or booking path cannot be ruled out until provider mode and `DUFFEL_BOOKING_ENABLED` are verified. |
| Monitoring and analytics | Unknown | No dedicated staging monitoring/analytics binding was found in the blueprint, and deployed metadata separation was not accessible. |

The first Preview build is blocked until an authorized hosting-account operator verifies the deployed staging bindings without exposing their values. Travel providers must be sandbox/non-production, database/auth/email must be isolated, and live booking or charging must be impossible or explicitly disabled.

## Apple signing audit

No Apple Distribution certificate, App Store provisioning profile, or EAS iOS credential was present for `com.kurioticket.app.preview` during the audit. With EAS-managed credentials, the first approved store build will request permission to:

1. authenticate to the KURIOTICKET LLC Apple team, normally including owner login and two-factor authentication;
2. create one team-scoped Apple Distribution certificate;
3. create one App Store provisioning profile for `com.kurioticket.app.preview`; and
4. store the resulting signing metadata in EAS.

The account currently has no certificate to reuse, so the new certificate consumes one distribution-certificate slot. EAS must not revoke, replace, or modify an unrelated certificate. Provisioning profiles can be regenerated; certificate revocation is disruptive to future builds and profiles and is never part of this flow without separate approval.

No certificate, provisioning profile, build, upload, submission, or release occurred while preparing this change.
