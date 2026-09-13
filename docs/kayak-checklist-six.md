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

## Follow-up verification, 2026-09-13 13:54 UTC

Repeated the two probes on deployed `5963258c286d`, using fresh dates
2026-10-20 through 2026-10-24. Car BOS again ended with the bounded timeout
message. Hotel Boston, Massachusetts returned 183 offers with the no-results
checkbox selected. Browser errors remained empty.

Added an API-route regression that exercises POST, validates the upstream
`sandbox-api-empty: true` header for each vertical, and verifies the API returns
`{results:[],sandbox:true,status:"empty"}` for genuinely empty provider responses.
Both route tests pass; the full suite now passes 3,147 tests, with focused lint
and type checks passing. No further application-code defect was established.

The remaining live evidence cannot be produced by relabeling nonempty results
or treating a timeout as empty. KAYAK needs to clarify the documented simulation
behavior. A credential-free support request is prepared below; it has NOT been sent.

### Draft for KAYAK support

Subject: Sandbox empty-result simulation for Hotel Search and Car Search

We are integrating KAYAK sandbox into Kurioticket staging. Your Getting Started
guide documents the `sandbox-api-empty: true` request header. Our transport sends
that header on search and poll requests, with caching disabled. Flights return
an empty response successfully, but the following checks did not:

- Hotels `/api/3.0/hotels`: Boston, Massachusetts; 2026-10-20 to 2026-10-24;
  one adult/room. The application received and displayed 183 normalized offers.
- Cars `/i/api/affiliate/search/car/v1/poll`: BOS; 2026-10-20 to 2026-10-24.
  The application reached its bounded search timeout. A previous normal retry
  without the empty-test option successfully returned car offers.

Observed September 13, 2026, approximately 13:53–13:55 UTC. Earlier probes with
October 12–17 dates also returned hotels or timed out for cars. Normal searches
work; our controlled transport and API-route empty-response tests pass.

Does the header support these two endpoints, including polling? If a different
test parameter or supported request is required, please provide it. We have
not included API keys, user identifiers, IP addresses, or raw responses here.
