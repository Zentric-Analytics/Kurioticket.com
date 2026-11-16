# Kurioticket pinned 9a13 reconciliation result

Authorized local-only integration completed on review/kurioticket-stabilization-20261105. Locally ready for a separately authorized publication step; publication, remote CI, merge to dev/main and staging delivery remain unauthorized. This is local candidate validation, not deployment clearance.

## Identity and rollback

Verified exact starting head a93f31d85e13aed40e872086335961a76350f69c and source dev 9a13ec28e9d0dd0177fb94f6ed3f9057a0c017c3 before modifying a clean working tree. Saved commit identities and a pre-integration handoff archive in work/reconciliation-9a13. No replacement branch was created.

- Application merge: 9bd206394d48fb5f8e0b59c23e025fce6506d2e6.
- Parents: a93f31d85e13aed40e872086335961a76350f69c and 9a13ec28e9d0dd0177fb94f6ed3f9057a0c017c3.
- Validated application tree: 87124a7b6a03d08c94dd8467fa126a1699e20dc8.
- Engineering baseline c17240c48771d23d5002af0676208930cbe45ec4, the authorized review checkpoint and pinned source all verified as ancestors after the merge.
- Rollback reference: a93f31d85e13aed40e872086335961a76350f69c. Preserve later work before any future explicitly chosen rollback. No rollback executed. No remote/staging rollback is necessary because those states were not modified.

## Conflict resolution

All 52 reported file conflicts resolved; zero remain. The merge changes 166 files relative to the authorized starting head. The per-file ledger in reconciliation-9a13-conflict-ledger.json records decisions and verification. It preserves stronger executable, typed fixture and AST assertions where newer dev used weaker source regexes; newer non-conflicting features and tests remain. These were resolved by behavior rather than whole-file ours/theirs selection.

Key combinations and review points:

- Native sessions retain recovery deadline metadata and gain newer revision tracking. A slow secure-store read cannot reinstate an older account after a session change; publication increments revisions and subscriptions preserve recovery data. Added regression evidence covers recovery/revision/replacement/clear/unsubscribe behavior.
- Admin state hydration keeps permission/store/saving guards, invalidates stale confirmations, preserves same-data drafts, protects scoped asynchronous results and retains newer source-aware Platform Health/admin navigation. Select controls close on committed value or disabled-state changes. Support status resets stale feedback across ticket identity changes. Audit search preserves typing during older results and restores history.
- Source-aware car diagnostics reuse one lazily resolved request identity across deferred search-history and provider logging. Attribution is preserved; identity remains deferred until after the provider response, with consent and no-credential-persistence assertions intact. Hotel provider criteria still remove display currency before provider calls without mutating the display search.
- Next.js and eslint-config-next resolve to 16.4.6 from the newer dev patch range, retaining the review branch's stronger FTP/sharp/transitive security constraints.
- Native dependencies required graph repair. The original lock seed had stale Expo metadata and empty nested decoder entries; a clean isolated regeneration was necessary. It resolved within-range patch updates, including Expo54.0.38 and Babel tooling, while retaining React19.1.0, React Native0.81.5 and Metro0.83.8. Review the lockfile delta before publication.
- The newer global local-file decoder override created broken nested links with retained query-string9.5.1. The integrated graph uses a scoped registry decoder0.5.1 for modern query-string and retains the direct vendored decoder compatibility probes. React DOM19.1.0 is constrained transitively to match Expo's documented installed expectation; it is not a direct app dependency and no web target was added. No force/legacy-peer-deps bypass was used.
- Metro0.83.8 uses its internal image parser and no longer depends on image-size. Parser security probes now execute actual Metro asset metadata and bounded malformed-format behavior; the dormant image-size override is not represented as an installed or validated dependency. No security assertion was silently removed to conceal a failure.

## Final local validation

| Check | Result |
|---|---|
| Focused conflict/state/browser regressions | 582 passed |
| Final web regression suite | 5,225 passed; zero failed/skipped |
| Final native regression suite | 2,403 passed; zero failed/skipped |
| Native dependency security and platform-boundary checks | 25 passed |
| Root and native clean lockfile install | Passed |
| Root and native npm dependency tree | Passed; no invalid/missing graph entries |
| Changed web-code lint | Passed; zero errors/warnings |
| Native typecheck and case-insensitive path check | Passed |
| Final Next production build incl. Prisma client generation, TypeScript and static generation | Passed |
| Offline iOS and Android JavaScript/assets exports | Both passed |
| Native release policy | Passed |
| Staged whitespace / unresolved conflict checks | Passed / zero remaining |
| Registry audit | Root0; native13low,0moderate/high/critical |

The 13 native low findings remain the previously acknowledged deepmerge tooling chain; this integration does not declare them fixed. No audit fix was run. Initial failed probes and final evidence are retained; final suite reruns were justified by actual integration failures and corrections, not a restart of completed engineering audits. No private-network preflight or recovery attempt was repeated.

Build/export commands used a minimal child environment, excluding database/provider/application credentials. Native exports ran offline against explicit Preview release configuration and public approved identity settings. They do not prove native compilation, platform credential behavior, device uptake or artifact/runtime equivalence. No remote native build or paid service was used.

Local diagnostic Preview fingerprints (not EAS artifact identity proof): iOS27981e57481f1ff4f79037bb8b38ad5f1ccd7739; Android7cf9b5771cae58bd5eda70aedd0856616c7b6910. They differ from the old engineering candidate. Existing artifacts cannot be assumed compatible; do not bypass fingerprint/runtime policy. No app.config/eas/release policy, Prisma or GitHub workflow changes were introduced by this integration.

The validation evidence JSON records exact source/tree identities and SHA256 hashes for output logs. The documentation checkpoint after the application merge changes no application content.

## Remaining issues and authorization boundary

No unresolved local merge or validation regression remains. Remote exact-release CI and policy checks remain unverified, and dev may advance; this authorization covers only the two pinned inputs. Do not reconcile another moving base automatically. Before a future separately authorized publication, verify remote review head without overwriting unrelated work and name one immutable local head. No push or workflow dispatch has occurred.

Operational release gates remain unchanged: authoritative external-denial verification and a revised recovery procedure; historical migration discrepancy/schema acceptance; worker/backlog/accepted remote-job identity reconciliation; matching native build/artifact/device evidence; and staging acceptance/delivery authorization. Keep Preview worker suspended. Render support clarification remains unsent. The previous recovery attempt's authorization expired; no repeat is allowed without a new approved procedure. Rolling safeguards remain T0+20abort/T0+30source-restoration, <=$1 incremental cost and <=24-hour temporary copy lifetime.

The staging credential exposure remains acknowledged and unresolved, not harmless. No credential change is authorized. No database access, migrations, source allowlist changes, infrastructure changes, worker resumption, remote push/CI, merge to dev/main, deployment or production action occurred.
