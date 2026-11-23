# Preview iOS passkey sign-in diagnosis

Scope: iOS Preview-only JavaScript fix; no release, server change, or native change. Android, web, and non-Preview iOS retain their existing verification path.

Changed files:

- `apps/mobile/src/features/auth/AuthFlow.tsx`: Preview loading, surfaced errors, retry and completion diagnostics.
- `apps/mobile/src/features/auth/authApi.ts`: Preview-only normalized verification and persistence entry point.
- `apps/mobile/src/features/auth/previewPasskeySignIn.ts`: testable normalization, response validation and persistence sequence.
- `apps/mobile/src/features/passkeys/passkeyAssertion.ts`: existing assertion normalizer extracted without behavior changes.
- `apps/mobile/src/features/passkeys/nativePasskeys.ts`: imports/re-exports the extracted normalizer.
- `apps/mobile/src/features/auth/passkeySignIn.test.ts`: updated Preview error-handling contract.
- `apps/mobile/src/features/auth/previewPasskeySignIn.test.ts`: executable payload and failure-stage tests.
- `src/services/mobilePasskeyAuthentication.test.ts`: signed Fabric metadata rejection/success regression.
- `qa/preview-passkey-sign-in-diagnosis.md`: this trace and retest guide.

Final review validation against dev baseline `e64d7fa`:

- 45 focused tests passed: 32 mobile assertion/auth/session/navigation tests and 13 backend passkey/encoding/origin tests. The final mobile TypeScript check, secret scan, and `git diff --check` passed.
- Full mobile suite: 1,652 passed, 7 failed. All seven failures reproduce with this diff stashed on unchanged dev: four Windows file-URL path errors in FAQ/Support/hotel-field tests, two PersonalDetails source assertions, and one hotel booking dock source assertion.
- Repository-wide `tsc --noEmit --incremental false`: 133 diagnostics, byte-for-byte identical to unchanged dev (including missing generated RouteContext and unrelated existing test type errors). No new TypeScript diagnostics.
- Review tightened activation to iOS Preview only, allowlisted diagnostic codes, replaced backend error messages with fixed UI copy, and released verification loading when cancelled. Supplied assertion strings and extension values remain unchanged, including empty/null user handles; absent optional values retain the existing normalizer defaults.

Dependencies were installed locally with lifecycle scripts disabled, and Prisma client generated locally for tests. No database migration or live authentication request was run. No native build, EAS operation, deployment, merge, or service restart was performed. Device verification after authorized Preview OTA delivery remains pending.

## Root cause and evidence

The native username view returns the complete assertion after AuthenticationServices succeeds. Expo dispatches that dictionary as a view event. React Native 0.81.5 Fabric then **adds `target` to the payload** (`apps/mobile/node_modules/react-native/ReactCommon/react/renderer/uimanager/UIManagerBinding.cpp`, `dispatchEvent`, lines 120–128). The wrapper passes `event.nativeEvent` straight to `AuthFlow`, which passes it to `authApi.passkeyVerify`. Previously that function JSON-stringified the entire event payload.

The mobile backend's assertion schema is `.strict()`. A valid signed credential with `target: 73` fails with `INVALID_ASSERTION`, before any challenge lookup, signature verification, or session issuance. The route maps that error to HTTP 401. AuthFlow previously swallowed the rejection without changing the email screen. The regression test reproduces rejection with metadata and successful signature verification/session issuance after the existing allowlisting normalizer removes it.

This identifies a reproducible case **3** (backend rejection caused by transport metadata), rather than a missing/invalid cryptographic assertion or a session/navigation defect. The reported UI behavior alone cannot prove which HTTP response occurred on the user's device. No device assertion, live Staging response, installed-build fingerprint, or server logs were supplied or captured during this work. Device confirmation remains pending; the added Preview diagnostics make that distinction observable.

## Complete post-Face-ID trace

1. `KurioticketPasskeyUsernameView.swift` checks controller identity and casts the credential to `ASAuthorizationPlatformPublicKeyCredentialAssertion`. A stale controller returns silently; an unexpected credential emits `unexpected_credential`. Neither is established as the cause here.
2. `credentialID` becomes both `id` and `rawId`. `rawClientDataJSON`, `rawAuthenticatorData`, `signature`, and nonempty `userID` are encoded to unpadded base64url by replacing `+`/`/` and removing `=`. Empty userID becomes null. Type is `public-key`; attachment is `platform`; extensions are an empty dictionary.
3. `finishAuthorization` clears the controller, then `onPasskey(result)` dispatches through the registered Expo view event. Fabric adds `target`. `NativePasskeyUsernameField.tsx` unwraps `nativeEvent`; it does not normalize it.
4. Preview `authApi.passkeyVerify` now runs the shared pure normalizer before POST `/api/mobile/v1/auth/passkey/verify`. It copies only credential fields; it never decodes/re-encodes or edits signed bytes. Existing Swift output already uses the backend's required base64url encoding. Missing required fields fail locally and visibly.
5. Backend validates bounded input, strict schema, matching decoded ID/rawId, client data type/challenge/origin/crossOrigin, allowed origin, unconsumed mobile challenge and expiry, credential ownership/revocation/account policy, optional userHandle, RP hash, presence/verification flags, counter, and ECDSA signature over authenticatorData + SHA256(clientDataJSON). Challenge consumption and counter update are transactional. These checks are unchanged.
6. `issueMobileSession` creates a MOBILE/PASSKEY/PHISHING_RESISTANT account session, persists a hash of a random secret, and returns a `ktm1` bearer token and ISO expiry with the user. No web cookie exchange is required.
7. Preview validates the success response and awaits `writeSession`, which writes SecureStore and synchronously publishes the session to subscribers. Profile reconciliation and localization subscribe to these events. Abort checks before/after persistence remain in place; an aborted write clears the session as before.
8. Only after persistence resolves does AuthFlow set `success`. SuccessScreen waits 800 ms, calls `done`, writes onboarding completion, and requests `router.dismissTo(successRoute)`.

## Comparison with web

`SigninForm.tsx` constructs a credential-only object using `serializeCredential`; no React Native event metadata exists. It uses the same base64url representation and the same signature helper. Web verifies an `authentication` challenge, returns a loginToken, exchanges that through NextAuth credentials, and navigates. Mobile intentionally verifies a `mobile-passkey-authentication` challenge and returns a bearer session directly. Mobile has stricter input, user-handle, counter and transactional replay checks; none were weakened to fix this issue.

## Failure handling and retest

Background option-prefetch failures remain silent because no credential was selected. Native authorization cancellation/errors remain covered by existing Preview `onDiagnostic` events. Explicit navigation/email submission aborts verification, releases its loading state, and suppresses stale results. Actual post-selection failures now show fixed safe error copy in iOS Preview, release loading, and refresh options for a retry. Backend messages are not rendered. Production retains its previous runtime branch.

Preview console stages contain no credential IDs, assertion bytes, account data, tokens, or raw error messages:

- `assertion_received`: native event reached the verification entry point in JS.
- `assertion_normalized`: required credential fields were accepted and metadata removed; next operation is the HTTP request.
- `verification_succeeded`: the backend returned HTTP success.
- `session_persisting`: success response validated; entering SecureStore/session publication.
- `session_persisted`: persistence/publication completed.
- `auth_success_screen`: AuthFlow accepted the current attempt and requested success state.
- `navigation_requested`: success completion requested dismissal. This logs the request, not proof of the destination rendering.
- `sign_in_failed`: failure surfaced; bounded HTTP status and allowlisted backend code are included when available (unknown codes become `UNKNOWN`). The last completed stage distinguishes malformed assertions, verification rejection/transport failure, and persistence failure.

Retest on the existing Preview binary after separately authorizing delivery of this JS bundle to its matching Preview runtime/channel. Select the saved Staging passkey, complete Face ID, verify progression through these stages, authenticated profile rendering, and persistence after app relaunch. Test ordinary email/password login and user cancellation too. No OTA update was published here. No new native build is required for these changes; device-level success has not yet been verified.
