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

Validation: 3,140 tests, focused lint and full build passed. The inspected staging
hotel/car images load KAYAK's sandbox placeholder, not real photographs. Car
details expose supplied passengers, bags, doors, transmission, fuel, mileage,
cancellation, payment type, supplier and pickup address. Corrected-release flight
and original-price browser verification is still pending.

Reference: KAYAK Hotels Search and Flights Search specifications at
https://developers.kayak.com. The documented flight response supplies segment
equipmentTypeName, segmentFares.cabin and airlines.baggagePolicies. The hotel
response includes primary image.large as well as optional images.
