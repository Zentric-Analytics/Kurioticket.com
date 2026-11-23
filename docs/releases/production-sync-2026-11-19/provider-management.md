# Provider Management — 2026-11-22

This is release preparation, not deployment approval. Keep PR #6864 draft until the production blockers in the release README are resolved. Do not import newer dev work.

## Control and permissions

`/admin/provider-management` reuses the existing admin shell and feature-control mutation API. One `ALLOW_SANDBOX_RESULTS_IN_PRODUCTION` FeatureFlag row in the PRODUCTION environment controls all three clients. It defaults OFF, including when the row is absent or the database read fails. No schema migration is added: the existing key/environment setting table and audit transaction are reused. Normal feature-control initialization will create the default-OFF row; no production initialization or write has been executed for this assignment.

Existing production administrator allowlisting, recent reauthentication, mandatory reason and audit logging apply. Staging cannot mutate this production control. Credential values are never exposed by the status page. Configured mode/presence is not a provider entitlement or connectivity check.

## Enforcement and compatibility

The existing canonical flight, hotel and car searches enforce the control. Production Android progressive hotel searches delegate to the canonical non-persistent route. Updated clients explicitly send `x-sandbox-results-policy: 1` for visible searches only. Legacy clients and background work receive no sandbox grant. This header declares client capability; it does not replace server-side authorization, provider configuration, rate limits or the master setting.

Each production KAYAK HTTP attempt checks the uncached setting, and adapters and the final response recheck its revision. Disabling and re-enabling cannot revive a previous revision. Client result hooks poll every five seconds while active, refresh on focus/application-state changes and hide sandbox results on read failure (four-second request deadline). Already delivered bytes cannot be recalled; visible results are removed when revocation/failure is detected. No switch can cancel an upstream request that has already left the server.

Only approved HTTPS production hostnames are eligible. Truthful native client identity is preserved for production KAYAK hotels and cars; production does not reuse the legacy hotel affiliate User-Agent. Existing trusted client-IP and session identity handling remain. The owner attested Android/iOS sandbox authorization on November 22; partner-specific approval wording has not been independently inspected. The previously observed native car 403 is not represented as fixed by this feature.

Sandbox results carry explicit provenance and a policy revision, retain existing presentation, and have inert search actions. Checkout/handoff fields are removed or emptied. Existing result cards block sandbox actions. The existing exact top notice is reused without per-card banners. No booking, payment, provider handoff, saved-item or price-alert workflow is enabled for production sandbox inventory.

## No inventory persistence

Production sandbox records are excluded from flight and provider caches, progressive cohorts, saved results, web session/return snapshots, isolated sandbox browser storage and derived nearby-fare storage. Legacy sandbox cache reads and handoffs are blocked without deleting history. Request context stores only the policy revision and reader, not inventory. Live-provider caching and actions retain their existing behavior.

Production sandbox packages, itinerary/deals background queries and detail/upsell retrieval are not enabled by this display-only control. KAYAK transport keeps its fixed sandbox endpoint, no-store requests and bounded rate limiting; the new production budget is a conservative combined 250 requests/hour for the current single-instance service. No new provider, cache infrastructure, dependency, environment group or paid resource was introduced.

## Verified production configuration

Authenticated Render Dashboard inspection on November 22: Duffel credential prefix class live; `DUFFEL_API_MODE=live`; neither `KAYAK_SANDBOX_ENABLED` nor `KAYAK_SANDBOX_API_KEY` is configured; no linked environment groups. All 44 variable keys were expanded. No secret values were saved, reported or changed. The production master row is absent (read-only aggregate query), hence OFF.

Consequently, the current Duffel live path remains independent of this switch. Turning ON alone would not supply KAYAK sandbox credentials or inventory. Do not change credentials, provider modes or production configuration without separate authorization.

## Promotion prerequisites

- Resolve production recovery confidence, the existing 20 pending migrations and their startup effects, required encryption/authentication configuration, and any explicitly approved production mutations.
- Confirm provider entitlement/technical conditions for the intended host/platform; do not spoof identity or treat the native car 403 as resolved.
- Review the exact final release CI and proposed merge tree. Main auto-deploy is enabled and runs `prisma migrate deploy`; merging is a production operation.
- Deliver compatible updated Android/iOS JavaScript and, where required by the existing runtime difference, signed store binaries. Local Metro exports are not signed builds, installation or device acceptance. No paid build/update/submission is included here.
- Obtain explicit main merge/deployment approval. Keep the master OFF for initial deployment unless separately authorized; validate its audited change workflow after deployment under the approved production plan.

The earlier staging recovery deferral does not authorize skipping production recovery requirements. Disabling this switch or rolling back application code does not restore database data.
