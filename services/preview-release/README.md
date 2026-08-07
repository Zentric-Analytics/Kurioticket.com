# Preview Release Service

Run locally in non-mutating mode:

```powershell
$env:PREVIEW_RELEASE_MODE='dry-run'
node services/preview-release/worker.mjs
```

Required variables are `DATABASE_URL`, read-only `GITHUB_READ_TOKEN`, `RENDER_API_KEY`, `RENDER_STAGING_SERVICE_ID`, and `EXPO_TOKEN`. Optional `GITHUB_STATUS_TOKEN` is separately scoped only to commit-status write; without it, reporting remains in the durable ledger and Render logs. Use Preview-only credentials. Never reuse a Production credential.

For a one-time cutover, set `PREVIEW_CUTOVER_BASELINE_SHA` to the exact 40-character merged `dev` SHA while the worker is still in `dry-run`. That SHA is recorded as an `approved-cutover-baseline` with `NO_DELIVERY`; the worker rejects baseline establishment in active mode. Remove the variable after the baseline is complete.

The worker automatically runs `sql/001_init.sql`, polls once per minute, and writes one durable row per `dev` SHA. Dry-run performs reads, exact checkout, identity validation, classification, reconciliation planning, and ledger/report generation but creates no Render deploy, EAS Update, EAS build, or TestFlight submission.

### Recovery

1. Inspect the `preview_release` row and `preview_release_action` rows for the exact SHA.
2. Preserve any remote IDs already present.
3. Correct the root cause.
4. Allow the expired lease to be reclaimed or explicitly clear only the stale lease after confirming the former worker is stopped.
5. Restart the worker. Reconciliation adopts matching remote operations.

Never delete ledger rows to force a retry. Never reset an EAS build number. Never issue a manual TestFlight submission while the ledger reports an existing submission or an unknown state.

## Read-only preflight

`npm run preview-release:preflight` validates the GitHub dev ref, PostgreSQL connectivity, the exact approved Render staging service, the current Render deployment, the exact Expo Preview project, and readable Preview build/update history. It accepts only `PREVIEW_RELEASE_MODE=dry-run`, performs no delivery mutation, redacts configured credentials from errors, and exits non-zero on any authentication, schema, or identity mismatch.

The worker runs this same preflight before beginning its polling loop. Active cutover must not be approved unless the preflight reports `PASS` for project `89f6fd88-c0d7-495a-9e2b-8301b09f407d` and Render service `srv-d86ulfgg4nts73bctt20`.
