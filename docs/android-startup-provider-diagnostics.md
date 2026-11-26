# Android startup and supplier diagnostics

Device logs use a finite vocabulary under `[kurioticket-startup]`. Health and
configuration distinguish HTTP status, JSON parsing, schema, network, timeout,
maintenance and unavailable responses. Update checks distinguish check, download,
activation and native initialization. The normal recovery UI stays generic.
No arbitrary exception text, URL, customer data or credentials are recorded.
No remote diagnostic endpoint or upload is added.

The eight-second update deadline and ten-second native launch wait are unchanged.
A download completing after the JS deadline is recorded without forcing a late
reload. Publication, download and a running update remain separate facts.

Runtime build acquisition uses the optional ExpoApplication native bridge.
SDK 54's deprecated Constants.platform.android has no versionCode. Build 53
does not contain ExpoApplication; an OTA cannot add it. This compatible change
does not invent an installed build from update-owned configuration. Native build
reporting remains unavailable on that binary until a separately authorized
native release includes expo-application. Package-manager evidence is required
in the meantime. No dependency or native runtime change is made here.

Server-only `[kayak-search:request-phase]` records use validated server UUID
request IDs, product, original and supplier agent categories, phase, attempt and
HTTP status. They do not record agents themselves, IPs, tracking IDs, request
payloads, keys, URLs or response bodies. Phases distinguish location lookup,
initial search, poll, pages and metadata. Aggregate timing and rejection logs
share that request ID. Provider-outcome rows distinguish raw and retained
normalized row counts; these are not necessarily hotel properties or car groups.
An agent category describes observed identity, not approved supplier entitlement.

These logs are operational evidence available through authorized device tooling
and restricted Render logs; existing admin authorization and public response
schemas remain unchanged. Never paste raw native updater logs into reports.

Regression coverage: mobile startup/metadata/update tests and
`kayakRequestDiagnostics.test.ts`, alongside existing provider authentication,
redaction, timeout, progressive hotel and partial inventory tests.
Mocked responses establish behavior, not genuine supplier recovery.
