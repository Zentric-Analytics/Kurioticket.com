# KAYAK sandbox integration

## Scope

Latest staging verification and deployment corrections are recorded in
`kayak-staging-verification.md`. Earlier checkpoints below are historical, not the
current deployment status.

Kurioticket exposes an isolated, server-backed integration preview at `/sandbox/kayak`.
It covers location lookup, search, bounded polling, normalized display, empty/error
responses, and KAYAK sandbox click-out for flights, hotels and cars. It does not
replace the normal Duffel flight pipeline or the hotel/car planning catalogues.
It does not enable native mobile search, real booking, payments, or production access.

Local work now also includes explicitly gated sandbox views on the normal
`/flights/results`, `/hotels/results`, and `/cars/results` routes. The normal travel
pages expose a labeled test entry only when the server sandbox gate is enabled.
That entry selects the matching sandbox search type; its form can navigate to the
normal results route. This does not mix test offers with live provider inventory.
Results are shown twenty at a time, and changing flight criteria cancels/discards
the previous search. All three results routes are marked noindex in sandbox mode.

The normal-route local browser checks returned 538 flight offers, 40 hotel offers,
and 116 car offers (cars succeeded after one clean timeout/retry). The hotel lookup
and form-to-results navigation were exercised, as was the Cars landing-page entry.
These counts are observations of simulated inventory, not guaranteed counts.
Twenty-two focused service/adapter/route/lifecycle checks and two entry-gate checks
pass. The full build passed before the entry links were added; its updated rerun
is recorded in the baseline validation checkpoint. Staging remains unconfigured.

The current preview supports adult economy one-way/return flights, one-room adult
hotel searches, and same-airport car pickup/return at noon. These limits are explicit;
unsupported passenger/room/itinerary combinations are not silently remapped.

## Configuration

Set `KAYAK_SANDBOX_ENABLED=true` and the private `KAYAK_SANDBOX_API_KEY` on the
development/staging web service. Never prefix the key with `NEXT_PUBLIC_` or put
it in source control, browser code, URLs returned to clients, or logs.

The gate only enables the preview when `NEXT_PUBLIC_APP_URL` names
`staging.kurioticket.com`, or a loopback host in Next development mode. On the
production hostname it returns 404 even if enabled accidentally.

KAYAK requires the original user agent and client IP. On Render, the sandbox uses
Cloudflare's `CF-Connecting-IP` and fails closed when that single address is missing
or invalid. It does not trust caller-supplied `X-Forwarded-For` or `X-Real-IP` there.
Render's public ingress must remain Cloudflare-backed; a different deployment
requires a separately verified trusted proxy boundary. Local development alone may set `KAYAK_LOCAL_TEST_CLIENT_IP`
to the developer's actual public IP; never use this override in staging/production.

Search tracking uses a session-scoped, HTTP-only, same-site cookie. No account or
personal profile data is sent to KAYAK. A search sends its locations, dates, adult
count, user agent, network address and random session identifier.

## Safety and provider behavior

- Fixed sandbox API host, no automatic HTTP redirects.
- Only verified sandbox click-out destinations are exposed; provider detail URLs
  containing API keys are discarded.
- Responses are normalized rather than passing through upstream JSON.
- No-store API responses and noindex preview page.
- Polling stops at completion, cancellation, 30 seconds, or twelve attempts.
- Per-client and per-vertical in-process limits protect this single-instance preview.
  Multi-instance/public rollout needs shared rate limiting before scaling.
- Quota, timeout and malformed responses show a safe error; there is no invented
  fallback inventory. Users can retry after a timeout.
- Prices preserve the provider's total/per-person/per-day basis. Cars explicitly
  request total USD prices and limited result pages on every poll.
- Sandbox prices and availability are simulated; click-outs are test pages only.

## Verification record — September 12, 2026

The replacement key successfully authenticated. Flight, hotel and car location
lookup succeeded against KAYAK. The initial local preview returned flight offers
and hotel stay rates; the flight link opened KAYAK's explicit sandbox-clickout page.
The car browser request initially timed out; an explicit retry completed. The
empty car response displayed no-results rather than fabricated inventory.

Thirteen focused tests cover transport, polling, cancellation, response redaction,
environment/origin gates, session continuity, dates, result normalization and car
pricing units. Focused lint and the initial application build passed. A standalone
repository-wide type check reported errors outside these new files; do not equate
the successful application build with a clean all-file type check.

Release verification uses a clean worktree based on current dev
(`d593ed133`), because the original working checkout was 1,011 commits behind.
The unrelated mobile map edits are not part of this change.

On this clean copy, the browser verified flights (40 offers with segment details),
hotels (40 rates with total-stay pricing) and cars (116 offers with total pricing).
These are simulated responses, not live inventory or a guarantee of result counts.
The application build and focused lint passed. The travel parity check passed all
101 web/server tests and 155 native tests after installing native dependencies.
These parity checks protect existing behavior; they do not prove native KAYAK UI.

The broad web/server test run reported 2,828 passes and 212 failures. A comparison
run excluding KAYAK tests reported the same 212 failure names, and no existing
source files were changed. Some failures are source-contract expectations; these
must be investigated rather than treated as 212 confirmed application defects.
This does not constitute a green full-suite release sign-off. Local raw diagnostic
logs are retained in the operating system's temporary directory, not this package.

Deployment and integration into normal website/native search are still pending.
No Render environment variables, live providers, database data, emails, or real
bookings were changed. No key is stored in the repository or client bundle.

## Remaining work before claiming completion

1. Reconcile the existing repository test failures with the release owner; do not
   weaken tests or alter unrelated travel behavior to force a green run.
2. Review and release the sandbox-only changes through the existing dev PR process.
3. Configure the two private staging environment values and verify staging proxy
   handling of the original client IP, quota controls, and all three browser flows.
4. Connect the agreed regular website/native search surfaces to sandbox results
   with explicit test labels and without mixing simulated offers with live inventory.
5. Verify those actual surfaces and preserve the existing production provider paths.

## References

- https://developers.kayak.com/getting-started
- https://developers.kayak.com/autocomplete-api
- https://developers.kayak.com/flights-search-api
- https://developers.kayak.com/hotels-search-api
- https://developers.kayak.com/cars-search-api

Production KAYAK credentials and partner approval remain separate from sandbox
access. Sandbox testing cannot establish live prices or real booking completion.
