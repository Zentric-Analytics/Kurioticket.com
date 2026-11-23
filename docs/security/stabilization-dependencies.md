# Stabilization dependency constraints

The mobile manifest uses targeted, version-scoped replacements to remediate the
locked SDK 54 toolchain without changing Expo, React Native, React, native modules,
or application provider configuration. Do not replace these with an audit-force
upgrade or remove them without repeating the consumer tests and security audits.

- Metro's coordinated 0.83.3 packages use the upstream 0.83.8 patch set. Replacing
  only `image-size` with v2 breaks Metro's filename-based image API; the upstream
  Metro patch removes that dependency and preserves actual asset export.
- Expo's PostCSS consumer uses the patched 8.x implementation. Expo's modern
  glob-13 consumers use glob 14.0.4 and minimatch 11.0.5. Version selectors leave
  callback-based glob 7 / minimatch 3 consumers on their original APIs.
- React Navigation and Expo Router use query-string 9.5.1, including the patched
  percent decoder. This changes the module format, so both native Metro exports
  and actual caller parse/stringify contracts must pass.
- Xcode's UUID consumer uses 11.1.1. Actual Xcode project UUID generation is tested;
  the application does not use the vulnerable buffer-taking UUID overloads.
- Other patched transitive versions remain inside their declared compatible
  ranges in the lockfile. Root Zod's declared minimum is patched as well.

`apps/mobile/src/security/dependencySecurity.test.ts` exercises the actual routing,
Metro image/file, glob discovery/cancellation, Xcode UUID, PostCSS, and shell-quote
consumers. The normal native suite discovers these tests. Both platform exports,
Expo Doctor, types, full suites and lockfile-clean installation remain necessary.

## Residual upstream advisory

[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) affects
`deepmerge` 4.3.1; the publisher has no patched release. It can poison the prototype
of a returned merge result when given malicious source objects. The affected
application chain is Expo's Node configuration/prebuild tooling, including
`@expo/config`'s configuration-modification merge. It is not an application API
parser. App configuration and plugins must remain trusted repository/operator
inputs; do not feed remote content, CMS payloads or customer objects to them.

The audit remains nonzero (one upstream low advisory propagated through Expo's
metadata graph). This is a documented tooling exposure, not a claim that the
upstream vulnerability is fixed or an audit suppression. Security-owner disposition
and re-evaluation when an upstream patch is available remain required. Do not
silently downgrade deepmerge to an older release to evade the affected range.

## Recovery compatibility

`X-Mobile-Recovery-Protocol: 1` advertises the restricted recovery UI and explicit
confirmation contract. It is not proof of identity or assurance. All existing
credential, MFA/passkey, lifecycle, ownership and transaction checks run first.
An unaware client receives a no-store, token-free HTTPS web sign-in fallback;
web recovery repeats its own authentication and verification. No mobile token or
MFA assertion is transferred to the web URL. Ordinary old-client ACTIVE sign-in
remains supported; no arbitrary minimum app-version policy is introduced.

Runtime fingerprints must be recomputed after these toolchain changes. A matching
JavaScript API does not justify overriding a fingerprint or publishing to an old
runtime. No update, build, installation or distribution is authorized by this file.
