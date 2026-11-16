# Mobile dependency security remediation — 2026-11-16

## Compatibility decisions

Expo remains 54.0.37, React Native 0.81.5, Router 6.0.24 and Metro 0.83.3. No SDK migration or audit suppression was used.

URI path: Router -> query-string 7.1.3 -> decode-uri-component 0.2.2. Registry advisories GHSA-vcc3-ghjq-m6fr (moderate) and GHSA-qr28-fpjm-wq7f (high) affect the decoder. Query-string and Router inherit the high finding; these are three audit entries, not three independent high vulnerabilities. Upstream 0.5.1 fixes the decoding and replacement algorithms, but exports ESM; query-string requires a callable CommonJS export. The private source backport in apps/mobile/vendor/decode-uri-component preserves that export and the old plus-to-space contract. See its README/LICENSE for provenance and update procedure. It is used by runtime URL/query routing. Registry scanners cannot certify the private source: source review and bounded-process adversarial tests are required alongside npm audit.

Image path: Expo / React Native -> Metro 0.83.3 -> image-size 1.2.1. GHSA-5p2g-fcmc-qvqq and GHSA-w3rx-r6r6-pgpr are high-severity parser denial-of-service issues (JXL/HEIF and ICNS). The original package's fixed 2.x line changes its callable/default and file/callback APIs. Instead, image-size resolves to the exact community-maintained image-size-next 1.2.2 backport. This is a separately maintained fork, not an official Metro upgrade. Its published dist was compared with installed 1.2.1: changes are confined to parser guards in HEIF, ICNS, JP2, JPG, JXL and shared box utilities; the entry-point API is unchanged. Lockfile pins registry integrity. Primary exposure here is asset/build processing; no installed-app parser path was established.

The private production decoder is deliberately classified as a dependency/native-impacting path and included in the worker build filter, preserving immutable dependency/fingerprint behavior. No delivery permissions, approvals, environments, credentials or production branch rules were relaxed.

## Verification and maintenance

Run npm ci, npm test, npm run typecheck, npm run test:dependency-security and both Expo platform exports from apps/mobile. Full mobile tests include the security suite. Security tests cover CommonJS calling, valid/invalid UTF-8 percent input, plus handling, duplicate arrays, nested return routes and authentication callback queries, hostile input in deadline-limited processes, image buffer/path/callback APIs, Metro metadata/static resolution on both platforms, real app icons, and malformed ICNS/HEIF/JXL boxes. Existing full-suite navigation, external URL, callback, back-stack and authorization tests remain required.

Do not equate shared JavaScript URL tests or JS/assets exports with iOS/Android device acceptance. Native callback dispatch, installed-app back behavior and icon rendering still require physical/installed binary testing.

Monitor both upstream repositories and audit feeds. Replace the backports when SDK-compatible supported parent dependencies consume the patched APIs. Do not delete the tests or suppress a finding to produce green output.

## Delivery restriction

The assignment authorizes a normal dev push only after all gates, and excludes OTA/native publication and TestFlight submission. The configured active Render worker polls dev and can execute EAS Update, Android native builds and iOS auto-submit/internal distribution. Changed mobile manifests require both platform dependency evaluations. A push must not proceed until its automatic side effects are established to be within owner authorization. GitHub environment rules do not gate this external worker. Do not disable protections to make a push possible.

Compatible parent investigation: npm currently lists Router 6.0.24 and query-string 7.1.3 as the final versions of their installed major lines. Expo bundledNativeModules requires Router ~6.0.24. @expo/metro 54.2.0 is the latest 54 wrapper and exactly pins Metro packages to 0.83.3. Metro 0.83.5 still declares image-size ^1.0.2; 0.83.8 exists with a changed asset dependency/API implementation, but forcing it through the exact Expo wrapper pins is not a supported SDK update. The verified, narrowly scoped 1.x image parser backport avoids that wider bundler change.
