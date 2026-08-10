# Preview Release Service

Operational status: **PREVIEW RELEASE CUTOVER VERIFIED**. The Render worker `srv-d9qisaaju40c73bbago0` is the sole approved automatic Preview delivery owner, running on Standard / 2 GB with PostgreSQL `dpg-d9qifcbm8hqs738hg570-a`. Current approved Preview release infrastructure cost is `$35.50/month`. Do not restore the superseded GitHub Actions Preview delivery workflows.

Run locally in non-mutating mode:

```powershell
$env:PREVIEW_RELEASE_MODE='dry-run'
node services/preview-release/worker.mjs
```

Required variables are `DATABASE_URL`, read-only `GITHUB_READ_TOKEN`, `RENDER_API_KEY`, `RENDER_STAGING_SERVICE_ID`, `EXPO_TOKEN`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_PRIVATE_KEY`, `APP_STORE_CONNECT_PREVIEW_APP_ID`, and `APP_STORE_CONNECT_PREVIEW_BETA_GROUP_ID`. Optional `GITHUB_STATUS_TOKEN` is separately scoped only to commit-status write; without it, reporting remains in the durable ledger and Render logs. The Apple key must be a narrowly scoped App Store Connect API key capable of reading Preview builds/groups and associating a build with the internal group. Store it only in Render. Use Preview-only credentials and resource IDs. Never reuse a Production credential.

For a one-time cutover, set `PREVIEW_CUTOVER_BASELINE_SHA` to the exact 40-character merged `dev` SHA while the worker is still in `dry-run`. That SHA is recorded as an `approved-cutover-baseline` with `NO_DELIVERY`; the worker rejects baseline establishment in active mode. Remove the variable after the baseline is complete.

The worker automatically runs every ordered numeric migration under `sql/`, polls once per minute, and writes one durable row per `dev` SHA. Dry-run performs reads, exact checkout, identity validation, classification, reconciliation planning, and ledger/report generation but creates no Render deploy, EAS Update, EAS build, or TestFlight submission.

`preview_delivered_native_state` is the canonical per-platform delivery projection. Android advances only after an exact build reaches `FINISHED`; iOS advances only after the exact build, submission, Apple build, and internal-group membership are all verified. Numeric build number is monotonic. A delayed historical side effect may finish without displacing a newer platform pointer. Ordinary release progression, platform delivery, and delayed TestFlight reconciliation are deliberately separate state dimensions.

Run `npm run preview-release:decision-trace` for the shared, read-only decision trace. It uses the same `deriveDecision()` function as the active cycle and performs no claims, ledger writes, status reports, provider writes, or delivery. Every active cycle emits exactly one `PREVIEW_DECISION` event containing ordinary progression, both platform pointers, current fingerprints, source-range impact, the selected operation, and any pending historical distribution. Current-dev delivery requirements always outrank delayed historical reconciliation.

Exact-checkout preparation installs only the production mobile dependency tree required for Expo fingerprinting and delivery, with npm audit and funding output disabled. It does not install unrelated web or mobile development tooling in the memory-constrained worker runtime.

### Recovery

1. Inspect the `preview_release` row and `preview_release_action` rows for the exact SHA.
2. Preserve any remote IDs already present.
3. Correct the root cause.
4. Allow the expired lease to be reclaimed or explicitly clear only the stale lease after confirming the former worker is stopped.
5. Restart the worker. Reconciliation adopts matching remote operations. For web delivery, a recorded Render deploy ID is adopted and monitored before any new deploy may be created. A terminally failed recorded deployment may roll over once through an atomic ledger compare-and-swap after its terminal state is persisted.

Never delete ledger rows to force a retry. Never reset an EAS build number. Never issue a manual TestFlight submission or manually associate a build with the internal group while the ledger reports an existing or unknown action. An iOS delivery is complete only after the exact processed Apple build is read back in the immutable `Kurioticket Preview Internal` group. If a POST response is lost, the worker reads Apple membership before retrying and adopts the accepted relationship.

For an owner-approved historical native change that is already present in the current completed `dev` SHA, set `PREVIEW_IOS_NATIVE_BACKFILL_SHA` to that exact current SHA while the worker remains in `active` mode. The worker reopens that SHA only when no iOS build action exists, forces an iOS-only native plan, reconciles exact-SHA EAS history before creation, and persists the build/submission identities in the normal ledger. Remove the variable after completion. A malformed SHA, dry-run use, non-current SHA, or existing build action fails closed or performs no work.

## Read-only preflight

`npm run preview-release:preflight` validates the GitHub dev ref, PostgreSQL connectivity, the exact approved Render staging service, the current Render deployment, the exact Expo Preview project, and readable Preview build/update history. It remains strictly read-only in both `PREVIEW_RELEASE_MODE=dry-run` and `PREVIEW_RELEASE_MODE=active`, performs no delivery mutation, redacts configured credentials from errors, and exits non-zero on any authentication, schema, or identity mismatch.

The worker runs this same preflight before beginning its polling loop. Active cutover must not be approved unless the preflight reports `PASS` for project `89f6fd88-c0d7-495a-9e2b-8301b09f407d` and Render service `srv-d86ulfgg4nts73bctt20`.

## Accepted delivery evidence

The accepted exact source SHA is `61e42dc6c0cc4952130aacb6e1da1f6bdb9e93f2`. Exact-SHA staging deployment and health verification passed. OTA publication completed once per platform on channel `preview` and runtime `preview-0.3.0`: iOS group `562cc027-a245-495c-b402-f2c596c3f20d` and Android group `a8705971-218e-4e53-bdd6-f6deb832ee49`. The installed Preview client received the update and passed owner visual verification. Durable restart recovery and duplicate prevention passed.

Native iOS/TestFlight proof remains deferred until a legitimate native-impacting Preview change enters `dev`. The worker must then reconcile or create exactly one matching build and one submission through its durable ledger. Do not create a proof-only native change.
# Native delivery invariants

Preview identifies a native artifact by platform plus the Expo native fingerprint, not by the moving `dev` SHA. One fingerprint may have at most one queued, building, submitting, or distributing build per platform. A later compatible source SHA records itself as the latest compatible source while retaining the SHA that actually produced the native artifact. Android and iOS fingerprints remain independent.

Android delivery succeeds only after the exact durable EAS build finishes and exposes its verified Expo install page. iOS delivery succeeds only after the EAS build and server-owned submission finish, Apple processing is valid, the configured internal beta group is associated, and association read-back succeeds. Submission completion alone is not TestFlight delivery.

Active, approved, unexpired Team Access members with either the Tester or Developer role receive the separate Android and iOS native notifications. Email delivery uses a per-recipient, per-platform, per-build final-outcome idempotency identity. Notification reconciliation continues after release completion, and accepted email-delivery records are never resent.

Operators must not manually create native builds, manually submit iOS builds, edit release-ledger rows or delivered-native pointers, change build numbers, or alter TestFlight membership during an active release. For an App Store Connect 404, first verify read-only that `APP_STORE_CONNECT_PREVIEW_APP_ID` resolves to the Preview bundle and that `APP_STORE_CONNECT_PREVIEW_BETA_GROUP_ID` is the named internal group returned under that app. Never invent or hard-code a replacement identifier.
