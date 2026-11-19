# Production safety and proposed promotion order

Preparation only. Do not execute commands below against production without explicit authorization.

## Observed database state

Production PostgreSQL 18: 38 applied migrations, two rolled-back historical entries, no active failed migration. Staging: 59 applied, two rolled-back entries, no active failure or pending repository migration; includes historical 20261028182000_index_support_ticket_activity absent from current source. Do not delete or rewrite that history. Production has 44 tables/507 columns versus staging's 58/653.

Twenty pending production migrations:

- 20260902120000_add_saved_cars_and_car_search_type
- 20260902210000_add_package_search_type
- 20260903120000_add_notification_inbox_tombstone
- 20260915183000_add_provider_result_cache
- 20261022120000_add_visitor_identity_foundation
- 20261022130000_link_visitor_provider_handoffs
- 20261022140000_add_search_journey_tracking
- 20261022150000_deduplicate_provider_handoffs
- 20261022160000_add_partner_confirmation_occurrence
- 20261022170000_add_flight_status_snapshots
- 20261022180000_add_cms_foundation
- 20261023070000_harden_cms_operations
- 20261026130000_add_partner_confirmation_deliveries
- 20261026150000_index_admin_provider_request_correlation
- 20261026153000_add_consent_gated_web_presence
- 20261027090000_correct_zero_result_hotel_provider_failures — includes a data UPDATE
- 20261029090000_support_activity_index — includes a data UPDATE
- 20261106000000_admin_notification_preferences
- 20261118150000_add_online_presence
- 20261119130000_add_car_redirect_type

No pending DROP TABLE, DROP COLUMN, TRUNCATE or DELETE statement was found. This is not zero-risk: enum additions are not reversed by application rollback, DDL/index creation can lock large tables, and two UPDATE backfills require explicit authorization. Support timestamp backfill currently has zero matching production rows; recheck immediately before cutover. Hotel correction requires correlated requestId; current production lacks that nullable column and the earlier migration adds it without backfill, so existing historical rows do not qualify if no intervening writer populates it. No historical data repair was run.

Twenty production checksum differences: eighteen match CRLF normalization; UserProfile and feature-control-environment migrations are genuine historical byte variants, also not equal to captured main SQL. Read-only production schema confirms canonical UserProfile names and LEGACY/STAGING/PRODUCTION enum. These findings explain relevant schema shape, not original applied SQL provenance. Never edit old checksums or rerun migration SQL to silence discrepancies. PostgreSQL 18 CI validates synthetic clean and representative upgrades, not a production data clone.

## Configuration and startup

Production Render currently builds with npm install; npm run build, runs npx prisma migrate deploy before startup, starts npm run start, follows main with auto-deploy enabled, and has no explicit health-check path. Repository Blueprint differs; applying it is not authorized. Merely merging main could initiate production writes/deployment.

Masked Dashboard variable-name inspection found DATABASE_URL, auth/OAuth/mail/Duffel/canonical URL/provider-mode/cron/iOS-association keys, but did not validate secret values, expiry or live provider identity. No linked environment-group entries were shown. ACCOUNT_SECURITY_ENCRYPTION_KEY is not listed: production v2 TOTP encryption/decryption requires a dedicated key of at least 32 characters (twoFactorService), with no insecure production fallback. Obtain secure owner verification/configuration and compatibility review of any existing encrypted records before promotion; no key creation/rotation is authorized here.

WEBAUTHN_ANDROID_PACKAGE_NAME and WEBAUTHN_ANDROID_CERT_SHA256 are not listed: production Android asset association cannot be assumed ready. Verify actual signing fingerprint/package without reusing Preview values. iOS association value presence alone does not prove app-ID correctness.

Partner confirmation provider/secret and flight-status provider/secret are not listed: callbacks remain fail-closed until a separately approved integration is configured. Account-deletion cron secret is not listed: no scheduler provisioning/execution was authorized. Online-presence ingress secret is not listed: review its automation policy rather than blindly configuring a new secret. Auth, provider modes, production feature-control operator access and public base URL values still require secure runtime verification.

Production FeatureFlag currently has zero rows. First feature-control use performs advisory-locked upserts of six production controls, all default true, including price-alert processing. These are startup/first-use database writes and operational behavior requiring explicit review before cutover. Do not invoke feature endpoints during read-only preparation.

## Provider and native limitations

KAYAK sandbox is explicitly allowed only on staging or local development; it cannot be enabled on production by copying staging keys. Native car upstream HTTP 403 remains unresolved and was not reinvestigated. Working staging hotel/car inventory is not evidence of production inventory. Duffel key presence does not verify live account entitlement, and direct Duffel booking is not implemented. Decide approved production product availability/provider scope before promising parity. Never spoof identity or remove host restrictions.

Both recorded production platform baselines use production-0.3.0; candidate uses production-0.3.2. Exporting Hermes bundles is packaging validation, not a new signed/store artifact. No production EAS build/update/submission or paid work is authorized. Existing Preview workers remain dev-scoped; do not repoint them to production.

## Recovery evidence and blockers

Authenticated production Recovery Dashboard advertises seven-day PITR and at-least-seven-day export retention. No dated export integrity evidence or completed isolated production restore test was obtained. Availability is not tested restorability. The earlier staging recovery attempt produced no copy; its PR #6721 staging-only deferral does not apply here. Recovery remains a production release blocker. Do not start PITR, create exports/resources, change database access or contact support under this assignment.

## Proposed cutover — explicit owner authorization required

1. Review exact candidate/PR checks, freeze main identity and verify no conflicting deploy/cron/operator activity. If main moves, reconcile only that reviewed production delta and rerun affected checks; do not ingest later dev.
2. Resolve secure configuration/signing/provider-scope decisions; verify required credentials and exact production URLs/modes without logging them. Obtain authorization for any credential/infrastructure change separately.
3. Establish a recent recoverable backup and prove an isolated restore using a separately authorized, bounded procedure. Record source identity, recovery point, integrity/application read checks, cleanup and costs.
4. Recheck pending migrations, historical compatibility and backfill counts. Approve all twenty migrations, startup writes, lock/timeout budget and operating window explicitly. Avoid historical repair wrappers: existing UserProfile is canonical; no ledger rewrite is proposed.
5. Because main auto-deploys and predeploy migrates, settle controlled promotion/rollback mechanism before merge. Record previous artifact dep-dago4tc9v7es73b5o2d0 at 946ca26b76d3d182f9a049e1e8afc82ec798ec15. Prevent competing deployment mechanisms only through separately approved settings/actions.
6. After owner approval, promote the reviewed exact commit using protected main PR policy. Run migrations before new schema-dependent application traffic; production's existing predeploy command is npx prisma migrate deploy. Bound lock/statement waits using reviewed session settings. Stop on failed migration; do not invoke migrate reset/resolve or a repair automatically.
7. Verify migration ledger/schema, exact live Render source/artifact, /api/health HTTP 200 with connected=true, authentication/admin protection, encryption/passkey associations and observability. Review startup logs for secret-free errors and feature-control state.
8. Perform owner-approved production acceptance: public travel availability per approved provider scope, normal/admin sessions, ownership isolation, saved trips/notifications, consent/presence, support/CMS access, callbacks only when configured. No real purchase/email/job replay without explicit scope.
9. Native delivery requires a separately approved binary/signing/store plan, matching production backend and runtime; do not reuse old binaries or publish incompatible OTA.

## Abort and rollback

Abort before merge on unresolved recovery, encryption/association/provider scope, failing required checks, schema mismatch or unknown data mutation. During cutover stop on migration/health/auth/ownership failure, unbounded lock, unexpected automation or a stale deployment. Cancel only the confirmed candidate operation; preserve evidence and ledger.

Application rollback uses the recorded prior Render artifact after verifying its compatibility with the expanded schema; do not reset/force-push main. Most additions are additive but new enum values/new data may not be understood by old code. Stop affected writers before relying on old code; no destructive down migrations. Rollback does not undo support/hotel backfills, feature-flag bootstrap or user writes. Data corruption requires the separately proven backup/isolated restore recovery plan and explicit authorization, never an automatic in-place restore. No production rollback was executed in this assignment.
