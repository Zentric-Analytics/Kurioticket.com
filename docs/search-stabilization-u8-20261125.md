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
