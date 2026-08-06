# Preview Release Service

Run locally in non-mutating mode:

```powershell
$env:PREVIEW_RELEASE_MODE='dry-run'
node services/preview-release/worker.mjs
```

Required variables are `DATABASE_URL`, read-only `GITHUB_READ_TOKEN`, `RENDER_API_KEY`, `RENDER_STAGING_SERVICE_ID`, and `EXPO_TOKEN`. Optional `GITHUB_STATUS_TOKEN` is separately scoped only to commit-status write; without it, reporting remains in the durable ledger and Render logs. Use Preview-only credentials. Never reuse a Production credential.

The worker automatically runs `sql/001_init.sql`, polls once per minute, and writes one durable row per `dev` SHA. Dry-run performs reads, exact checkout, identity validation, classification, reconciliation planning, and ledger/report generation but creates no Render deploy, EAS Update, EAS build, or TestFlight submission.

### Recovery

1. Inspect the `preview_release` row and `preview_release_action` rows for the exact SHA.
2. Preserve any remote IDs already present.
3. Correct the root cause.
4. Allow the expired lease to be reclaimed or explicitly clear only the stale lease after confirming the former worker is stopped.
5. Restart the worker. Reconciliation adopts matching remote operations.

Never delete ledger rows to force a retry. Never reset an EAS build number. Never issue a manual TestFlight submission while the ledger reports an existing submission or an unknown state.
