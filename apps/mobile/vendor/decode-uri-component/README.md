# Security compatibility backport

This private package contains the MIT-licensed `decode-uri-component@0.5.1` implementation from npm (upstream https://github.com/SamVerschueren/decode-uri-component/releases/tag/v0.5.1).
It replaces the ESM export with a CommonJS function and preserves 0.2.x `+`-to-space handling before decoding. No decoder algorithm changes are made.
The upstream linear UTF-8 scan and single-pass replacements address GHSA-vcc3-ghjq-m6fr and GHSA-qr28-fpjm-wq7f. It is intentionally named as a private fork; registry audit databases do not track this private source. The source and timeout regressions must therefore be reviewed alongside npm audit, never treated as registry security certification.

Upstream npm tarball SHA-1: `7f66b25bf435df723f9af55713dcf860a1c297d2`.
Update by comparing a new upstream index.js, retaining only the CommonJS export and plus compatibility adaptation, preserving LICENSE, and running `npm run test:dependency-security` plus the complete mobile/export gates. Remove this backport when an SDK-compatible router/query-string chain supports the patched upstream module directly.
