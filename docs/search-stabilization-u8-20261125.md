# U8 Preview delivery safeguards

Baseline: dev `83506de0d5b634919175ed119985434882da1895`.

The deployed Preview worker at `759a3734bdb09a2a532c324f386dd9dde21ac20b`
rejects current exact checkouts because its immutable root dependencies differ.
Rebuild the staging worker from validated dev; retain the manifest equality check.

The classifier now includes the 74 statically imported shared runtime files found
from the actual mobile app and screen roots. A regression test traverses those
imports and requires each shared file to schedule OTA evaluation. Update the
reviewed runtime list when adding a new cross-project runtime import.

Root manifests remain conservative native candidates until canonical per-platform
fingerprints match the delivered binary. Only that narrow root-only candidate
case may become OTA. Mobile manifests, plugins, native sources, missing hashes
and different hashes retain native requirements. Delivered native pointers remain
binary provenance; OTA publication does not rewrite them.

`PREVIEW_RELEASE_MODE=active` authorizes ordinary Preview evaluation and compatible
OTA, not native delivery. `PREVIEW_NATIVE_DELIVERY_ALLOWED` defaults to false and
requires the exact value `true` under separate operator authorization. When false,
native delivery stops before reservations, builds or distribution; configured
historical native recovery is held. Independent compatible OTA/web work can still
complete, but a blocked native target must not mark the aggregate release complete.

Do not enable native delivery for the current stabilization assignment: paid
native builds and public submissions are not authorized. Do not alter production.

Validation: `npm run test:preview-release`: 258 tests, 254 passed, four isolated
Postgres tests skipped, zero failures. The first post-change run exposed two
obsolete coalescing expectations; they now assert direct compatible OTA and the
absence of native delivery. Live worker execution, OTA publication and installed
device adoption remain separate verification gates.

Follow-up live review found web delivery and OTA publication started concurrently.
Mobile releases now always schedule an exact-source staging deployment, including
mobile-only changes. OTA and coalesced JS overlays wait for that deployment's
existing exact-SHA health/readiness verification. A failed backend prevents OTA;
independent native work retains its result/failure evidence. One shared promise
prevents duplicate web deployment within the same evaluation.

Genuine website acceptance found a separate flight return mismatch: staging mixed
cohorts were written to session storage, but the reader deliberately rejects
sandbox inventory there. The result was an expired-results prompt immediately
after valid detail navigation. A bounded, storage-scope WeakMap now retains one
public sandbox-containing cohort only in tab memory, preserving all original
identities and server expiry without persistent sandbox storage. Production
display-only rows remain excluded; legacy persistent sandbox records stay invalid.
Regression coverage includes1700mixed results, storage-scope isolation, immutable
copies, replacement/expiry and unchanged production storage restrictions.

## Exact airport intent after GeoIP ranking

Live staging origin discovery returned VNY before exact LAX and city HOU/IAH before exact HOU. The origin route reapplied GeoIP ordering without the entered query. Preserve exact three-letter airport intent before proximity in both provider and owned-fallback responses; retain every city and neighboring airport with its identity and selection authority. Destination ordering and default suggestions remain unchanged. Two LAX/HOU regressions failed before the correction; all 12 focused discovery tests pass afterwards, including absence of GeoIP and case/whitespace normalization. No client impersonation, supplier permission, native binary, or production change is involved.
