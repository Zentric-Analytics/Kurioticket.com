# KAYAK checklist six — empty results, failures and retries

Date: 2026-09-13. Scope: staging website only. Production and native apps unchanged.

## Confirmed correction

PR #5311, merge `5963258c286d2b3474dd70778d3024a046f215c5`, rejects a malformed
successful API response before it can replace the shared offers with null,
undefined or a non-array value. The regression failed before the correction and
passes afterward. The browser displays the provider-unavailable/retry message.

## Automated coverage

- All three verticals: genuinely empty completed provider responses remain empty.
- All three verticals: an overlapping retry makes no extra request; a timeout
  does not start an automatic quota-consuming retry loop; manual retry succeeds.
- Discarded effect mounts are cancelled and do not update state afterward.
- Invalid completed payloads are errors, not empty results.
- Polling is bounded; cancellation stops subsequent polling.
- Upstream authentication, rate-limit and server errors do not expose credentials.
- Hotel metadata failure does not discard valid offers.

The release's full run passed 3,145 tests and the full build. With the additional
all-vertical empty-response regression, the final local full run passes 3,146
tests. Type checks and focused lint also pass.

## Live observations before the new release

Baseline staging `48b2c517b62b8a354ab176195d129da66cb1b387` (existing tabs may
retain the preceding bundle). Test dates 2026-10-12 to 2026-10-17.

- Flight preview BOS–JFK, explicit no-results checkbox: clear no-results message.
- Normal flight retry: four other-provider cards remain during loading; retry
  returns 347 KAYAK offers without replacing those other-provider cards.
- Normal hotel retry: eight other-provider cards remain during destination
  disambiguation; London choices are explicit rather than silently substituted.
  Choosing London, England returns 147 KAYAK offers.
- Car forced-empty preview: bounded timeout with a clear retry message.
  Clearing the forced-empty option and retrying returns 116 offers.
- Normal car search: 30 catalogue offers remain while KAYAK loads, followed by
  116 KAYAK offers, giving 146 combined results.

## Open evidence / limitations

Do not mark all live empty-result cases passed: the hotel forced-empty probe
returned 152 offers, and the car forced-empty probe timed out. The application
sent the existing `sandbox-api-empty` option; this does not establish that the
provider honored that option for these endpoints. The official Getting Started
page (https://developers.kayak.com/getting-started), inspected in the browser,
documents this header for simulating empty results. No genuine hotel
or car empty response was observed live. Local controlled empty responses pass.
Do not fabricate an empty result by discarding successful provider inventory.

No staging keys were disabled, quota guards bypassed, or public fault-injection
endpoint added. Malformed-response and concurrent-click tests are local controlled
tests, not induced upstream failures on staging.

## Deployment and final smoke check

Render deployment `dep-daja0p0ae00c73951teg` became live at
2026-09-13 13:12:22 UTC, serving `5963258c286d`. The existing service has
auto-deploy disabled, so its authorized staging deployment was triggered manually;
that configuration was left unchanged.

After reload, ordinary car search returned 116 KAYAK plus 30 catalogue offers
(146 combined). Browser error output was empty. Health returned HTTP 200.
The Render error query from 13:12:23 through 13:12:45 UTC returned no errors.
Preview form was reloaded to clear the forced-empty setting; test review tabs
are retained. No account, booking, email or production mutation occurred.

Checklist six remains open specifically for live hotel/car empty-state evidence;
the known malformed-response defect is corrected and deployed. Do not equate
the successful local empty-response coverage with a live upstream empty response.
