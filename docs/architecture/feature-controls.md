# Feature Controls

Kurioticket's Phase 1 feature controls are a release and operational safety layer; they do not change the referral/metasearch model or make Kurioticket the merchant of record.

## Architecture and environments

`src/lib/feature-controls/registry.ts` is the only authoritative registry. It contains exactly nine registered keys, metadata, and independent STAGING/PRODUCTION defaults. Each deployment and its separate database owns only its trusted runtime environment: staging reads and edits STAGING; production reads and edits PRODUCTION. Remote-environment rows are never displayed or mutated. Database rows are state overrides and cannot define executable controls. Unknown legacy rows remain stored but are ignored.

Runtime environment resolution reuses `stagingSafety`: the canonical staging configuration reads STAGING and every other runtime reads PRODUCTION. A public availability endpoint chooses the runtime environment server-side and returns only the six user-facing booleans; clients cannot select another environment.

SQL cannot safely infer which Render deployment/database is applying a migration, so the migration marks old rows `LEGACY` and creates no environment rows. On first use, an advisory-locked, environment-aware bootstrap claims legacy rows for the trusted runtime environment and upserts only missing registered rows for that same environment. Empty updates and idempotent upserts preserve administrator state on every later deployment. Thus a staging legacy value remains staging state and a production legacy value remains production state, without ghost remote controls.

## Evaluation and caching

The central service uses a process-local, environment-and-key cache with a 10-second TTL. Missing rows and read failures use the registry default and emit a safe diagnostic containing no database error text or secrets. Writes fail rather than claiming success. Successful mutations invalidate the affected entry immediately. In a multi-instance deployment, other instances converge within 10 seconds; no Redis or rollout engine is introduced.

## Authorization and audit

All mutations use the existing authenticated, ACTIVE, verified, configured ADMIN check. The API rejects any client-supplied environment field and derives ownership from the server runtime. STAGING is available to those admins. PRODUCTION additionally requires the normalized address to appear explicitly in `FEATURE_CONTROL_PRODUCTION_ADMINS`; an empty/invalid list fails closed and wildcards are rejected. Production requires a trimmed reason of at most 500 characters.

The registered key and environment schemas prevent IDOR-style arbitrary row creation. The server derives actor identity, IP, and user agent. A serializable transaction takes a PostgreSQL advisory transaction lock for the key/environment, reads current state, updates the flag, and creates `FEATURE_CONTROL_UPDATED`. Audit metadata records key, environment, actual previous/next values, reason, category, and risk. Audit failure rolls back the flag. A no-op creates no audit record.

## Product versus processor controls

Product controls block new access or provider search but preserve saved data. Processor controls no-op before candidate reads, provider work, state changes, notification events, or email. Consequently, turning `PRICE_ALERTS_ENABLED` off blocks creation/reactivation while existing active alerts can still run when `PRICE_ALERT_PROCESSING_ENABLED` remains on. The same separation applies to Route Watch. Saved Trip Reminders only controls automation.

To add a future control, add one typed registry entry, migration/bootstrap row, server enforcement, client exposure only when needed, and tests. Arbitrary UI-created keys, percentage rollout, targeting, cohorts, scheduling, and country rollout are intentionally deferred.

## Emergency: disable Price Alert processing

1. Open **Admin → System → Feature Controls**.
2. Select **Price Alert Processing**.
3. Choose **PRODUCTION → Disable**.
4. Enter the operational reason and confirm.
5. Verify the recent `FEATURE_CONTROL_UPDATED` audit entry.
6. Monitor processor logs for `feature-controls:processor-disabled` and zero work.

To restore service, choose **PRODUCTION → Enable**, enter the restoration reason, confirm, verify the audit entry, and monitor the next processor run. Preserved `nextCheckAt` and alert state allow normal processing to resume.
