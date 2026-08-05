# 16. Team development workflow

Quick-start:

1. Branch from `dev`.
2. Implement change + run local checks.
3. Open PR into `dev`.
4. Resolve checks/reviews.
5. Merge to `dev`.
6. Validate staging and preview surfaces before marking as done.

## 1. Normal feature flow

1. Create a feature branch from the latest `dev` commit.
2. Implement change.
3. Run local checks relevant to changed files.
4. Open a PR into `dev` with a focused summary of expected runtime scope.
5. Keep required checks and review threads in scope:
   - migration/security checks where applicable
   - mobile validation gate
   - base review threads resolved
6. Merge only when checks are green and review state is clean.
7. Confirm merged commit appeared in `dev`.
8. Watch deployment summary:
   - render deployment status (web changes)
   - preview delivery run status (mobile changes)
9. Run post-merge validation based on change type.

## 2. Expected validation path by change type

- **web-only changes**
  - Validate desktop and mobile web rendering on staging.
  - Confirm staging health endpoint + SHA badge (route-specific if changed).
- **shared responsive web changes**
  - Validate both responsive surfaces on staging routes.
- **JavaScript/UI mobile changes**
  - Validate web + preview mobile outcomes.
- **asset-only changes**
  - Validate affected route behavior and checksum if needed.
- **native Android changes**
  - Observe classifier result:
    - OTA-compatible: normal preview publication decision
    - native-build-required: no OTA path
- **native iOS changes**
  - Validate whether TestFlight path is expected for this change.
- **changes in both iOS and Android**
  - Sequence checks: render + preview Android + preview iOS.
- **database/migration changes**
  - Migration validation path must pass before merge.
- **documentation/workflow changes**
  - No runtime behavior should be assumed changed; docs-only checks only.

## 3. Platform-specific verification

- **Web**: staging health, staging config endpoint, route-specific checks, SHA badge alignment.
- **Android Preview**: update classifier and publish decision, SHA identity, source/runtime/channel match, and install verification.
- **iOS Preview**: native build/TestFlight update confirmation and device install evidence.

## 4. Expected verification timing

- Render: environment-driven, usually sub-minute startup with deployment-specific build time.
- OTA: classifier + validation dependent; not guaranteed by fixed clock windows.
- Native build / TestFlight: variable; processing delay should be expected.
- Recovery paths are expected after platform-side gating.

## 5. Failure report checklist

For any failure, include:

- PR number and source SHA
- required workflow run IDs
- render deployment ID (if web involved)
- expected vs observed SHA
- affected surface (web/android/iOS)
- route and test evidence
- screenshot or short repro steps

## 6. Recovery playbooks

- **required check stuck**
  - confirm exact failing step and failure root cause
  - address failure and trigger retry only after deterministic fix
- **Render failed**
  - capture build/deploy logs, compare with touched paths
  - fix root cause; push a corrective commit if needed
- **Wrong page/route observed**
  - clear browser cache and validate the intended route, not just home
- **SHA badge mismatch**
  - compare with target dev commit and latest deployment metadata
- **Android OTA failed**
  - confirm classifier reason and release decision
  - if native required, escalate to native follow-up path
- **iOS TestFlight failed/processing issue**
  - validate submission reason, build number ordering, and team access status
- **Preview app stale on device**
  - uninstall/reinstall controlled preview build; revalidate identity
- **newer run canceled older run**
  - keep the latest fully-concluded run as truth source

## 7. What teams do not do

- modify production identity/runtime/channel
- rotate credentials
- control Play/App Store rollout
- decide public release timing
- override owner boundary checks

## 8. Escalation

Escalate to owner if:

- release intent is blocked at production boundary
- credential or channel mismatch appears
- repeated store-side processing failures
- safety check failures recur across the same deterministic inputs
