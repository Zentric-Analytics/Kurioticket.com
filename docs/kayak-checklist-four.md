# Checklist four — supplied result details and images

Scope: KAYAK sandbox staging website only. No production/native release.
Customer-facing supplier facts must reach cards or expanded details. Credentials,
tracking/internal transport objects and unsafe URLs are intentionally excluded.

Local corrections:
- Preserve the hotel primary image as well as gallery images, deduplicating safe
  URLs and retaining existing media allowlists.
- Preserve supplied flight equipment, segment duration and general airline
  baggage rules. Airline rules are explicitly not included fare allowances.
- Show supplied cabin names only when every itinerary segment has one matching
  fare record. Partial/mismatched fare data remains unknown in the summary.
- Show original provider amount, currency and price basis in expanded details.

Additional corrections:
- Permit the documented HTTPS sandbox hotel `/himg/` image path in both the
  provider validator and Next image configuration; reject other paths, hosts,
  credentials and query parameters for that host.
- Unknown baggage allowance must not contain the positive `included` marker
  consumed by the shared baggage filter. Regression coverage preserves this.

Validation: 3,142 tests, focused lint and full build passed. The inspected staging
hotel/car images load KAYAK's sandbox placeholder, not real photographs. Car
details expose supplied passengers, bags, doors, transmission, fuel, mileage,
cancellation, payment type, supplier and pickup address. Corrected-release flight
and original-price browser verification is still pending.

Release: PR 5300 merged as `3009010ae4d3e187394a16d5cab91333e55d2468`.
Render staging deployment `dep-daj0918jo6nc73c0h39g` became live at
2026-09-13 02:07:23 UTC.

Live checks on that release:
- BOS–JFK round-trip Oct 12–17: 397 KAYAK offers plus 4 existing results.
  Expanded JetBlue/Priceline offer shows original USD 316 per person, both
  segment dates/times, Premium Economy, Airbus A220-300, durations 76/84 minutes,
  fare quality items and general baggage policy dimensions.
- London hotels Oct 12–17: Hux expanded details show original USD 710 total stay,
  room, cancellation/payment flags, rating, readable amenities and rate breakdown.
  Three inspected supplied sandbox images load successfully.
- BOS cars Oct 12–17: initial provider timeout recovered through visible Retry.
  116 KAYAK + 30 existing results. Nissan Altima shows original USD 139 total,
  capacity/specifications, pickup address and cancellation/fuel/mileage policies.
  Visible supplied image loads. No browser console errors in all three tabs.
- Supplied sandbox data can contain inconsistent illustrative addresses or price
  breakdowns; values are preserved rather than silently repaired or invented.

Follow-up PR 5301 addresses a live-discovered summary mismatch: explicit
offer-specific carry-on inclusion was visible in details but not in the summary.
Only restriction `included` qualifies; unknown/other values do not. Live checking
PR 5301 exposed that its test used the wrong single-field shape. PR 5302 corrects
this to the documented `fees.carryOnBag` array with `bagNumber: first`. Missing
restrictions remain undefined; conflicting first-bag records cannot imply inclusion.
PR 5302 merged as `7541599df169c7743b17e3e3b3ad36a2a1d03104`, with all 3,142 tests,
lint, full build and required CI checks passing.

## Closure — planned checklist-four staging coverage

Final deployment `dep-daj0knoae00c73dq4ofg` became live at 2026-09-13 02:32:23 UTC.
The browser displayed build `7541599df169`. The JetBlue/Priceline card now shows
carry-on included, matching the first-bag restriction in its expanded fee details.
Enabling Baggage included changed 401 results to 375; clearing restored 401.
The provider request log records the initial successful search, with no subsequent
provider request during these filter interactions. Unknown and non-included
restriction states are separately covered by regression tests, not claimed as
every-offer browser inspection. Flight browser errors were absent; health returned
HTTP 200. Two `Error: aborted` log entries occurred at 02:33:04 during the reload
window; no further errors were returned for 02:33:05–02:34:50. Cause not established.

Planned item-four coverage is complete for staging. Hotel/car browser evidence is
from PR 5300, unchanged by the flight-only follow-ups. Test filter cleared, details
collapsed, saved JPY preference preserved, no bookings or production changes.
Broader device/failure/safeguard checks belong to checklist items five onward.

Reference: KAYAK Hotels Search and Flights Search specifications at
https://developers.kayak.com. The documented flight response supplies segment
equipmentTypeName, segmentFares.cabin and airlines.baggagePolicies. The hotel
response includes primary image.large as well as optional images.
