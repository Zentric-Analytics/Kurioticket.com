# Protected mobile release evidence

OTA publication requires `android/<environment>.json`, committed by reviewed PR after an approved EAS binary is delivered. The immutable record binds its EAS build ID, full commit SHA, Android package, profile, runtime, channel, and generated native fingerprint. A dispatcher supplies only the build ID; the workflow rejects it unless it exactly matches this protected record and live EAS build metadata.

Production builds additionally require `android/production-play-history.json`, refreshed by reviewed PR from a read-only Play Console audit no more than 24 hours before dispatch. It records either an absent app/upload history or the highest uploaded versionCode plus a protected audit reference. Missing, stale, unknown, or inconsistent evidence fails closed.

Never edit an existing delivered-binary record. Add a reviewed successor after a new binary is approved. Environment protection and immutable `mobile-prod-v*` signed-tag rules are configured externally; this repository does not create them.

The `ios/production-credential.json` record contains only non-secret evidence for the EAS-managed Production signing bundle. The first reviewed Production IPA baseline is added separately after a successful binary has been built and inspected; credential readiness must never be misrepresented as delivered-binary evidence. Production iOS OTA delivery remains unavailable until that binary baseline exists and its channel, runtime, and native fingerprint have been verified.
