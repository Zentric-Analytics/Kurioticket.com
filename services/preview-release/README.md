# Preview Release Service

Operational status: **PREVIEW RELEASE CUTOVER VERIFIED**. The Render worker `srv-d9qisaaju40c73bbago0` is the sole approved automatic Preview delivery owner, running on Standard / 2 GB with PostgreSQL `dpg-d9qifcbm8hqs738hg570-a`. Current approved Preview release infrastructure cost is `$35.50/month`. Do not restore the superseded GitHub Actions Preview delivery workflows.

Run locally in non-mutating mode:

```powershell
$env:PREVIEW_RELEASE_MODE='dry-run'
node services/preview-release/worker.mjs
```

Required variables are `DATABASE_URL`, read-only `GITHUB_READ_TOKEN`, `RENDER_API_KEY`, `RENDER_STAGING_SERVICE_ID`, and `EXPO_TOKEN`. Optional `GITHUB_STATUS_TOKEN` is separately scoped only to commit-status write; without it, reporting remains in the durable ledger and Render logs. Use Preview-only credentials. Never reuse a Production credential.

For a one-time cutover, set `PREVIEW_CUTOVER_BASELINE_SHA` to the exact 40-character merged `dev` SHA while the worker is still in `dry-run`. That SHA is recorded as an `approved-cutover-baseline` with `NO_DELIVERY`; the worker rejects baseline establishment in active mode. Remove the variable after the baseline is complete.

The worker automatically runs `sql/001_init.sql`, polls once per minute, and writes one durable row per `dev` SHA. Dry-run performs reads, exact checkout, identity validation, classification, reconciliation planning, and ledger/report generation but creates no Render deploy, EAS Update, EAS build, or TestFlight submission.

Exact-checkout preparation installs only the production mobile dependency tree required for Expo fingerprinting and delivery, with npm audit and funding output disabled. It does not install unrelated web or mobile development tooling in the memory-constrained worker runtime.

### Recovery

1. Inspect the `preview_release` row and `preview_release_action` rows for the exact SHA.
2. Preserve any remote IDs already present.
3. Correct the root cause.
4. Allow the expired lease to be reclaimed or explicitly clear only the stale lease after confirming the former worker is stopped.
5. Restart the worker. Reconciliation adopts matching remote operations. For web delivery, a recorded Render deploy ID is adopted and monitored before any new deploy may be created. A terminally failed recorded deployment may roll over once through an atomic ledger compare-and-swap after its terminal state is persisted.

The completed row for the current `dev` SHA is not by itself proof that native delivery is current. Before returning `NO_CHANGE`, the worker compares the current native fingerprints with the last completed native builds and compares the current source with the last completed OTA source for each platform. If an Android or iOS OTA baseline is behind and the cumulative range contains OTA-safe application changes, the same row is atomically reopened. EAS history is then reconciled per platform, so an exact-SHA iOS update is adopted while only a missing exact-SHA Android update is published (and vice versa).

Never delete ledger rows to force a retry. Never reset an EAS build number. Never issue a manual TestFlight submission while the ledger reports an existing submission or an unknown state.

For an owner-approved historical native change that is already present in the current completed `dev` SHA, set `PREVIEW_IOS_NATIVE_BACKFILL_SHA` to that exact current SHA while the worker remains in `active` mode. The worker reopens that SHA only when no iOS build action exists, forces an iOS-only native plan, reconciles exact-SHA EAS history before creation, and persists the build/submission identities in the normal ledger. Remove the variable after completion. A malformed SHA, dry-run use, non-current SHA, or existing build action fails closed or performs no work.

## Read-only preflight

`npm run preview-release:preflight` validates the GitHub dev ref, PostgreSQL connectivity, the exact approved Render staging service, the current Render deployment, the exact Expo Preview project, and readable Preview build/update history. It remains strictly read-only in both `PREVIEW_RELEASE_MODE=dry-run` and `PREVIEW_RELEASE_MODE=active`, performs no delivery mutation, redacts configured credentials from errors, and exits non-zero on any authentication, schema, or identity mismatch.

The worker runs this same preflight before beginning its polling loop. Active cutover must not be approved unless the preflight reports `PASS` for project `89f6fd88-c0d7-495a-9e2b-8301b09f407d` and Render service `srv-d86ulfgg4nts73bctt20`.

## Accepted delivery evidence

The accepted exact source SHA is `61e42dc6c0cc4952130aacb6e1da1f6bdb9e93f2`. Exact-SHA staging deployment and health verification passed. OTA publication completed once per platform on channel `preview` and runtime `preview-0.3.0`: iOS group `562cc027-a245-495c-b402-f2c596c3f20d` and Android group `a8705971-218e-4e53-bdd6-f6deb832ee49`. The installed Preview client received the update and passed owner visual verification. Durable restart recovery and duplicate prevention passed.

Native iOS/TestFlight proof remains deferred until a legitimate native-impacting Preview change enters `dev`. The worker must then reconcile or create exactly one matching build and one submission through its durable ledger. Do not create a proof-only native change.
