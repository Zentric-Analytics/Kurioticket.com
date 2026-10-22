# Structured location search contract

## Current-state diagnosis

Flights discover Duffel places and fall back to the owned airport catalogue. Hotels use the curated hotel destination catalogue and cars use the owned airport/city/area catalogue. Although the suggestion routes already exposed canonical objects, normal search payloads retained mostly strings. KAYAK hotel and car searches consequently performed post-submit autocomplete. Cars selected the first candidate; hotels ranked fuzzy candidates. A selectable owned city could therefore have no provider mapping, and provider resolution failure appeared as an empty/skipped provider.

Web and native both call server suggestion/search routes, so provider credentials remain server-only, but neither had a shared validated selection payload. Static hotel and car results remain planning inventory and KAYAK remains sandbox, USD, and non-bookable.

## Implemented contract

`SearchLocation` is the portable web/mobile selection envelope. Its Kurioticket ID, labels, type, geography, codes, verification, and namespaced provider bindings survive serialization into search requests. A binding is usable only when exactly one binding for that provider is verified. Provider identifiers never become canonical IDs.

Airport catalogue entries receive verified KAYAK IATA bindings; Duffel-backed flight suggestions retain both their Duffel discovery binding and any catalogue KAYAK binding. Catalogue-only hotel/city/area entries remain unbound rather than claiming universal provider support.

KAYAK hotel and car adapters now consume only verified selected bindings (or an exact public IATA airport code). They never run post-submit autocomplete or select its first result. An unsupported KAYAK mapping skips only KAYAK; concurrent Duffel or truthful static planning sources remain unaffected.

## Remaining rollout work

Every web and native picker must retain the canonical object returned beside its legacy suggestion and serialize it through navigation. The API accepts that envelope additively, so clients can migrate without splitting provider logic or exposing credentials. Provider-backed hotel/city discovery must attach KAYAK bindings during discovery before those targets can be eligible for KAYAK. Live credential verification is environment-dependent and production booking/payment remains disabled.
