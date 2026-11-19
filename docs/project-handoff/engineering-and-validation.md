# Completed engineering and verification

The authoritative code checkpoint is `c17240c48771d23d5002af0676208930cbe45ec4`. Older reports contain intermediate failures, obsolete deployment observations and approvals that were subsequently narrowed or superseded. Do not use those intermediate counts as the final baseline.

## Work preserved in the candidate

- Recovered the complete original 18-file P1 availability-notice implementation. Original identity `f3d9b26f46d97b585cfc3fe4f314285413ebefba`; historical reconciled candidate `187d839b7abf9b6628efea0f076b1dd3ff4d520d`; original integration baseline `563fb8e6dda15ad67b1faf72ad0721ce705f878b`.
- Preserved exact notice: **Results are not bookable at this time. Live results will be available soon!!!** Web/native results and loading shells own one notice; provider data and selected-offer booking handoffs remain protected.
- Corrected three native safe-area assertions in two tests to reflect parent-owned top insets without changing the recovered production layout.
- Remediated the Next.js build security failure with Next.js 16.4.1; retained framework security checks. Follow-up dependency remediation is in the final locks and existing `docs/security/stabilization-dependencies.md`.
- Audited web failures individually, then corrected test infrastructure/server-only loading, missing API mocks and verified obsolete contracts in approved batches. Preserved authorization, privacy, supplier, handoff, loading and accessibility assertions rather than suppressing failures.
- Fixed the native Hotel details-response-only metadata gap by forwarding sanitized typed metadata into the existing Overview. Search-response policies and Rates/attribution remain intact. Review quotations remain in data but are intentionally not restored to the UI; no duplicate supplier section.
- Stabilized native Cars alert creation/provider-offer scope, conflict recovery, compare-deals ownership, rate-level controls and initial alert reconciliation. Obsolete presentation assertions were replaced with behavioral contracts; selected provider/offer identity, pause/reactivate and error handling remain protected.
- Stage 4 coordinated repairs included FAQ locale-refresh cancellation and final Flight filter/long-price layout correction. Browser/component validation expanded across results, admin navigation, search, responsive layouts and accessibility. Where authenticated admin/device acceptance was unavailable it remains an explicit operational limitation.
- Stage 5 integrated explicitly pinned development work while preserving stabilization, admin/CMS/Settings controls and secure account recovery. Historical integration commits include `f6276289f`, `660b8cc45` and CI setup checkpoint `be27d63a3`; these are history, not permission to fetch newer dev.
- Restricted mobile pending-deletion recovery uses fresh verified ownership/MFA/passkey assurance, bounded revoked purpose-specific sessions, transaction rechecks, explicit confirmation and a native root gate. Ordinary/admin APIs reject restricted bearers before and after recovery; fresh ordinary sign-in is required afterward. No new recovery schema or secret.
- Owner-selected legacy-client policy implemented: protocol-capable clients get full restricted recovery; unaware old clients get an authenticated, no-store, token-free secure web sign-in/recovery fallback. Client capability is not identity proof. No credentials or MFA proof are carried in URLs; web fallback does not auto-authenticate or bypass MFA.
- Final dependency security remediation patched supported runtime/tooling paths, including a coordinated Metro 0.83.8 family, with no audit-force or security bypass. Existing Expo 54 / React Native 0.81.5 / native React 19.1.0, root React 19.2.4 and Next 16.4.1 retained.

## Final recorded local validation (November 14)

These are historical completed results for the engineering tree, reused without rerunning during documentation transfer.

| Check | Recorded outcome |
| --- | --- |
| Complete web suite | 5,081 passed; 0 failed/skipped/cancelled |
| Complete native suite | 2,367 passed; 0 failed/skipped/cancelled |
| Web and native TypeScript / native path checks | Pass |
| Production web build | Pass, isolated from shared database |
| Configured lint | 0 errors; 22 code warnings plus 11 ignored-file notices |
| Root full and production dependency audits | 0 advisories; exit 0 |
| Native full and production audits | 0 critical/high/moderate; 13 low entries propagating one deepmerge advisory; exit 1 deliberately retained |
| iOS and Android Metro JS exports | Both pass; not native builds |
| Expo Doctor | 18/18 |
| Focused recovery/security contracts | 93 passed |
| Captured older-client method/platform executions | 20 controlled cases; not physical-device certification |
| Preview-worker contracts | 247 passed; 4 existing opt-in PostgreSQL skips, not newly skipped |
| Secret checks, diff checks, Git integrity | Pass at engineering checkpoint |

Final raw suite tails and exit records are copied in sanitized form under [evidence](evidence/README.md). The evidence manifest hashes original reports/logs so original files can be compared later without publishing their contents.

## Important limits

- Current exact-engineering-head GitHub checks were not registered at the final report observation. Historical 13 successful jobs at `be27d63a3` are not CI approval for `c17240c...` or a future integration. Recheck exact-head checks during a separately authorized review unit.
- Test fixtures, controlled SDK/MFA results and component execution do not certify live accounts, real provider sign-in, physical devices, tester installation, OTA uptake or full deployed acceptance.
- Local fingerprints differ from existing Preview iOS build 61 and Android build 52. Matching binaries and canonical EAS environment verification are needed under unchanged fingerprint policy. Do not force old runtime identifiers or send this candidate to those runtimes.
- Root audit is clean; native audit is not zero. GHSA-gcqx-w48m-w2h4 in deepmerge 4.3.1 remains a low tooling residual. Owner accepted only the documented trusted-configuration/build-input scope for dev staging. No corporate security title was established; no production-wide acceptance is implied.
- Full database drift certification, restore proof and live authenticated role/recovery acceptance remain outstanding. No full browser/device claim should be inferred from green local tests.
