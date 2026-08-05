# Kurioticket system audit — August 2026

Audit date: 2026-08-04  
Repository: `Zentric-Analytics/Kurioticket.com`  
Audited development source: `dev@3495609287678a3659f43b65c4978ec2c92579a9`  
Audited live main source: `main@b061e1e0a33b8aac96e8e24a704baafbbcad213e`

This is a non-secret evidence record, not a delivery approval. No build, deployment, OTA, store upload, credential change, ruleset change, or release was performed during the audit. External facts are marked `UNKNOWN` when they could not be refreshed from an authenticated source.

## Executive decision

The product is usable in staging and has working internal-distribution paths on Android Production and iOS Preview. It is **not ready for feature freeze or public release**. Development may continue after the urgent governance and security items below are assigned.

Highest-priority findings:

1. **Branch histories have diverged.** GitHub reports 39 commits unique to `dev` and 16 commits unique to `main`. The main-only side contains Production delivery hardening and release evidence. A reviewed normal-merge ancestry reconciliation is required before the next dev-to-main promotion.
2. **Account deletion is not a completed deletion lifecycle.** The repository supports a deletion request/review state, but verified hard deletion or anonymization and documented retention behavior are absent. Draft PR #3619 adds disclosure and mobile request controls but does not by itself prove backend erasure.
3. **Dependency exposure is unresolved.** GitHub reports 41 dependency alerts: 1 critical, 17 high, 22 moderate, and 1 low. Each must be triaged before feature freeze.
4. **Current Android Preview is behind dev.** The last verified Preview OTA targets `d184dbd2a47d0c876b8bb1d4c6ebf53ecd11b298`. The latest dev validation for `3495609...` correctly stopped with classifier exit code 2 (`PREVIEW_BUILD_REQUIRED`); no automatic native build was started.
5. **Test debt is material.** The audited Windows runs contain 1 mobile failure, 1 release-pipeline failure, and 22 repository failures. Two are source/line-ending-sensitive checks; the repository failures require named triage rather than blanket acceptance.

## Branches, pull requests, and governance

| Area | Verified state | Assessment |
| --- | --- | --- |
| `dev` | `3495609287678a3659f43b65c4978ec2c92579a9` | Active integration branch |
| `main` | `b061e1e0a33b8aac96e8e24a704baafbbcad213e` | Active Production branch |
| Divergence | `main...dev`: 39 commits / 58 files; `dev...main`: 16 commits / 24 files | **High risk; reconcile ancestry** |
| Open PRs | One: draft #3619, privacy controls/evidence, base `dev` | Checks green; policy/backend deletion gaps remain |
| Tags | No repository tags observed; no tag ruleset | Add protected, immutable release-tag policy before public release |
| `dev` rules | PR required; conversation resolution; strict checks `Validate mobile preview` and `secret-scan`; force-push/delete blocked; 0 approvals | Good automation, but no independent approval requirement |
| `main` rules | PR required; conversation resolution; strict checks `migration validation` and `secret-scan`; force-push/delete blocked; separate admin-only update restriction | Owner-controlled, but formal independent approval is not required |

Recommended branch cleanup after owners confirm no active work: review stale `chore/*`, `fix/*`, audit, and release-candidate branches for archival/deletion. Preserve release evidence and do not delete legacy external resources as part of branch cleanup.

## System architecture

```text
Web (Next.js 16 / React 19)
  -> Next.js route handlers
  -> Prisma 7 / PostgreSQL
  -> Resend (email), Google authentication, Duffel/travel providers

Mobile (Expo 54 / React Native 0.81 / Expo Router)
  -> HTTPS mobile API under /api/mobile/v1
  -> SecureStore for session material
  -> EAS Build / EAS Update

Delivery
  dev  -> Render staging + Preview validation / guarded Preview OTA evaluation
  main -> validation only; manual protected Production delivery
```

The mobile app does not directly import web UI code, but the monorepo root package/lock files, shared configuration, API contracts, release scripts, and workflows can affect mobile validation. The business model is currently referral/external handoff. No mobile payment SDK or verified first-party live charge path was found. Staging checkout is disabled and Duffel remains sandbox/test by policy gates.

## Product capability inventory

| Capability | Web | Mobile | Backend/model | Status |
| --- | --- | --- | --- | --- |
| Authentication | Email/password, codes, Google, passkeys/2FA surfaces | Email/password/code, Google, session restore | User/session/security models and APIs | Implemented; verify every provider in release QA |
| Flights | Search, results, details, guided Deals flow | Search and navigation | Duffel-backed APIs | Implemented; sandbox controls verified for staging |
| Hotels | Search, results, details, Deals hotel/room stages | Search and navigation | Provider APIs | Implemented; several brittle/failed structural tests |
| Cars | Search/results/details | Search and navigation | Location/search APIs | Implemented |
| Deals | Guided flight/hotel journey | Entry/navigation | Shared API flows | Implemented and actively changing |
| Explore | Discovery and favorites | Discovery and favorites | Recommendations/saved state | Implemented; one inherited mobile test failing |
| Saved/trips/alerts | Dashboard surfaces | Trips, alerts, saved grouping | Prisma models and APIs | Implemented; booking write behavior is limited |
| Profile/preferences | Full dashboard | Profile/preferences | Profile and preference APIs | Implemented |
| Account deletion | Request/review UI | Request UI only in draft PR #3619 | Request/reactivation/admin review | **Partial: erasure/anonymization not verified** |
| Notifications | Database/UI concepts | No native push SDK found | Notification models/jobs | Partial; push delivery absent/deferred |
| Deep links | Web routes | Custom schemes | No verified universal/app links | Partial |
| Analytics/crash reporting | First-party records exist | No dedicated analytics/crash SDK found | Provider/admin logs | Observability gap |

## Environment and release matrix

| Target | Identity | Source/control | Delivery status |
| --- | --- | --- | --- |
| Web staging | Render service `Kurioticket.com-staging`, branch `dev` | Live deployment `dep-d9padimgekts73dfrphg` at exact dev SHA | Render reports LIVE; fresh direct endpoint probe was unavailable, so HTTP payload is `UNKNOWN` |
| Web Production | `https://kurioticket.com` | Main-controlled | Repository configuration exists; fresh hosting deployment inventory was not independently refreshed |
| Android Preview | `com.kurioticket.app.preview`, 0.3.0 (3), `preview-0.3.0`, channel `preview` | Protected build + guarded OTA | Baseline build and OTA path verified historically; current dev requires a new Preview native build |
| Android Production | `com.kurioticket.app`, 0.3.0 (2), `production-0.3.0`, channel `production` | Manual `mobile-production` workflow | Signed AAB built and available on Play Internal testing; no public rollout |
| iOS Preview | `com.kurioticket.app.preview`, 0.3.0 (3), `preview-0.3.0`, channel `preview` | Manual protected build and submit | EAS build and App Store submission finished; owner attested TestFlight install and QA passed |
| iOS Production | Repository identity `com.kurioticket.app` | No dedicated Production iOS workflow/credential verified | **Absent/deferred externally** |

Configuration drift: the EAS Production environment page displayed `https://www.kurioticket.com`, while repository release policy expects `https://kurioticket.com`. Confirm canonical redirect/equivalence and normalize the stored value before the next Production build.

## External systems and credentials

| System | Verified non-secret inventory | Unknown / follow-up |
| --- | --- | --- |
| EAS project | `zentric-analytics/kurioticket-mobile`, project `89f6fd88-c0d7-495a-9e2b-8301b09f407d` | Plan/quota usage not refreshed |
| Android credentials | Separate records for Production, Preview, and legacy `com.kurioticket.mobile` | Backup custody/restore drill not verified |
| Apple credentials | Preview credential produced successful build and submission; no Production iOS credential shown | Live Apple certificate/profile expiry and superseded-key cleanup need owner refresh |
| GitHub secrets | Environment-scoped `EXPO_TOKEN` in `mobile-preview-build`, `mobile-preview-ota`, and `mobile-production`; no repo/org secrets shown | Rotation and escrow dates unknown |
| Google Play | Organization account; Production and legacy apps both draft/internal | Service-account credential not needed/verified for current manual upload path |
| App Store Connect | Finished EAS submission for Preview build | Fresh authenticated tester-group, agreement, API-key, and certificate inventory unavailable |
| Render | Staging service connected to dev and auto-deploying | Production service/config inventory and secret rotation dates not refreshed |

Never place secret values, private keys, signed artifact URLs, tester email addresses, or credential exports in this evidence set.

## Workflow inventory and trust model

The machine-readable inventory is in `audit/workflow-inventory-2026-08.json`.

Key conclusions:

- Preview validation runs on PRs and dev pushes. A successful dev push may evaluate an automatic OTA, but publication remains gated by source binding, Render exact-SHA synchronization, baseline attestation, artifact digest, fingerprint, classifier, channel mapping, and staging safety.
- Native-sensitive or uncertain Preview changes stop with no OTA and no automatic native build.
- Android Production build/update actions are manual and protected by `mobile-production` approval. Main pushes do not automatically deliver.
- iOS Preview build and TestFlight submit are separate manual workflows under `mobile-preview-build` approval.
- Production iOS has no dedicated delivery path.
- Audit artifacts requested retention longer than the repository maximum in at least one run; GitHub reduced retention to 90 days. Documentation and rollback plans must use the effective retention period.

## Latest delivery evidence

| Path | Latest useful success | Latest useful failure/block | Interpretation |
| --- | --- | --- | --- |
| Preview validation | PR #3619 checks green | dev run `30970879459` OTA evaluation exited 2 | Validation works; current dev is native-build-required |
| Android Preview OTA | Source `d184dbd2a47d0c876b8bb1d4c6ebf53ecd11b298` published to preview | Current dev not published | Installed Preview is behind dev |
| Android Preview build | EAS `179ae3b8-3e7a-404c-bcf0-44cbdc759cff` finished | None current | Approved baseline remains an historical artifact, not current dev |
| Android Production build | EAS `c84c196e-7928-4f26-8b7c-a15f37f031db` finished | Earlier post-build contract failures were corrected on main | AAB exists; workflow corrections are main-only until reconciliation |
| iOS Preview build | EAS `5f537da8-356d-453b-9bf8-47623286657c` finished | Earlier credential/schema issues repaired | Working build path |
| iOS Preview submit | EAS submission `ad1e2182-1c0b-4f7a-b70d-c4f33cb8ba86` finished | Earlier submit attempts failed before consolidated fixes | TestFlight Internal verified by owner |

## Store state

Google Play developer account `ZENTRIC-ANALYTICS` contains:

- `com.kurioticket.app`: draft, Internal testing release `Kurioticket 0.3.0 (2) - Internal`, versionCode 2, audience 0, no public rollout.
- `com.kurioticket.mobile`: legacy draft/internal record, audience 0, preserved.

The Production app is available to an internal tester list; the list name contains a spelling error (`Kuriotitcket`). The store may display the package name until store setup/review completes. Play Integrity API integration was not enabled in the observed dashboard. The accepted AAB is protected through Play; certificate details were not freshly re-audited.

iOS Preview has a finished App Store Connect submission and owner-confirmed TestFlight installation/QA. Current live Apple agreements, tester membership, and credential expiry are `UNKNOWN` because App Store Connect could not be refreshed in the authenticated audit session.

## Validation evidence

Executed on the audited dev source:

- Production Next.js build: **passed** (Prisma generation, conflict/timestamp checks, TypeScript, 153 static pages).
- ESLint: **passed with 4 warnings** (three raw `<img>` uses and one unused type).
- Secret scan: **passed**, 1,226 files scanned.
- `git diff --check`: **passed** before documentation changes.
- Mobile TypeScript: **passed**.
- Mobile tests: **234/235**; one inherited Explore controlled-input source-structure failure.
- Release-pipeline tests: **59/60**; one Windows/source-format failure in automatic Preview publication ordering.
- Repository tests: **1381/1403**; 22 named failures covering admin overview structure, hotel list/details filters, guided flight hydration/sorting, Cars return location, SupportForm error handling, and several source-text i18n assertions.
- Expo Doctor: **16/18**; two checks failed because the Expo/React Native metadata services were unavailable/unexpected in this network context, not because a concrete config defect was established.

Do not convert these failures into an unnamed waiver. Reproduce on Linux CI, classify behavior versus brittle source-text assertions, and track every remaining behavior failure.

## Risk register

| ID | Severity | Risk | Required action |
| --- | --- | --- | --- |
| R1 | High | Main/dev histories diverge and main-only Production safeguards can be lost | Normal-merge reconciliation PR; compare all 16 main-only commits; preserve ancestry |
| R2 | High | Account deletion lacks verified hard-delete/anonymization lifecycle | Owner policy decision plus backend implementation, retention map, tests, and store disclosure review |
| R3 | High | 41 dependency alerts, including 1 critical | Triage exploitability, upgrade, regenerate locks, rerun all builds |
| R4 | High | Apple signing/API-key backup, expiry, and superseded credential state not freshly proven | Owner-controlled credential inventory and recovery drill |
| R5 | Medium | Android Preview current dev requires native build | Approve one protected Preview build only after branch reconciliation and green validation |
| R6 | Medium | 24 total local test failures across suites | Named triage; replace CRLF/source-text tests with behavioral/AST checks |
| R7 | Medium | No dedicated crash/diagnostic telemetry | Select privacy-reviewed provider or document deliberate absence before freeze |
| R8 | Medium | EAS Production API origin differs by `www` | Verify canonical origin and normalize EAS environment |
| R9 | Medium | Production iOS external path absent | Create only under separate Production iOS approval |
| R10 | Low | Effective artifact retention is 90 days, below requested values | Align workflow/docs and preserve durable reviewed evidence elsewhere |
| R11 | Low | Internal tester list spelling error and incomplete store setup | Correct during store-listing readiness, without changing tester membership unexpectedly |

## Roadmap and gates

### Now — continue development safely

1. Merge neither main nor dev until R1 is resolved through a reviewed ancestry reconciliation.
2. Triage the critical/high dependency alerts.
3. Decide and implement the account-deletion/retention contract; then update privacy evidence.
4. Classify all named test failures and make Linux CI the authoritative result.
5. Refresh Apple/Render credential and service inventories with an owner present.

### Before feature freeze

- Produce one green, current Android Preview native build and re-establish OTA baseline.
- Prove staging health/config at exact SHA and retain evidence.
- Normalize the Production API origin.
- Establish crash/diagnostic monitoring or document an accepted alternative.
- Complete deep-link, permissions, authentication, and accessibility regression matrices.
- Resolve all critical/high dependency findings and release-blocking tests.

### Feature freeze

- Cut immutable release source only after main/dev reconciliation.
- Run clean web, Android, and iOS builds from the exact source.
- Freeze schemas, store identity, runtime/channel, signing credentials, and privacy disclosures.
- Verify credential backups and rollback artifacts.

### Internal launch

- Android: next versionCode must exceed 2; upload only to Internal testing under separate approval.
- iOS: use a higher build number than 3; complete Internal TestFlight verification.
- Keep Production OTA separate from native delivery and baseline-bound.
- Verify no Preview/staging/legacy crossover.

### Public launch

- Complete Play/App Store listing, data safety/app privacy, account deletion, legal, content rating, export, and tester requirements.
- Add explicit owner approval for each public rollout.
- Confirm Production observability, incident response, rollback, and support ownership.

## Documentation disposition

- `android-release-pipeline.md`: authoritative for current Android gates but must be reviewed after branch reconciliation because main contains newer Production-only fixes.
- `environments.md`: useful identity matrix; refresh canonical Production API origin and external-system status.
- `preview-testflight-readiness.md`: authoritative reviewed evidence for the successful Preview TestFlight path; retain.
- Release baseline manifests: retain as immutable audit inputs; never treat examples as live evidence.
- Privacy evidence in draft PR #3619: review after the deletion/retention policy is settled.

## Final recommendation

**ADDITIONAL WORK REQUIRED BEFORE FEATURE FREEZE.**

The system is sufficiently functional to continue controlled development and internal testing. It is not ready for Production feature freeze or public rollout until branch reconciliation, deletion compliance, dependency triage, and named test/credential follow-ups are complete.
