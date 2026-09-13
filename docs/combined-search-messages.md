# Combined search messages — checklist six clarification

Scope: staging website only. User clarified that customer messages describe the
combined metasearch, not the absence of one provider's results.

## Agreed behavior

- Available combined offers: display them, regardless of another provider's
  empty, pending or failed response. Do not display provider-specific failures
  or no-results messages above them.
- No offers and a pending provider: searching, not a final empty state.
- No offers and unresolved destination: ask for the destination choice.
- No offers and any failed provider: generic search problem plus Retry search.
- No offers and every provider succeeded: No results found.
- Filters excluding otherwise available offers keep their separate filter-reset
  state. Sandbox labels and booking restrictions remain.

## Implementation

PR #5314 connects normal flights, hotels and cars to combined empty-state
handling. KAYAK status and retry capability are exposed through the existing
context. The regular wrapper no longer renders its provider-specific status or
retry button. The separate sandbox diagnostic preview remains available.

Pure state tests and rendered-component tests cover loading, empty, partial
failure, unresolved destination and generic retry messages. Available offers
take precedence in the state tests. Full run: 3,149 passing tests; build and type
checks pass. Focused lint has zero errors and 19 pre-existing flight warnings.

The earlier upstream forced-empty discrepancy remains a diagnostic observation,
not a requirement to show a KAYAK-specific customer empty-state message. These
controlled tests do not claim KAYAK returned an empty hotel/car response live.

## Live staging verification

Merge `de552dc08d6402fc3b923721917eedc851ce96c0`, Render deployment
`dep-dajat6tg1s2s73a21c10`, live 2026-09-13 14:13:03 UTC. All three loaded
pages expose this staging version.

- Flights: 401 combined results; no provider-specific status/retry message.
- Hotels: eight existing offers remain usable while London is disambiguated;
  selecting London, England returns 155 combined offers with no provider status.
- Cars: selected age 30, which the KAYAK adapter does not support. The normal
  page shows 30 catalogue results without a KAYAK failure/no-results warning.
  Restored Any age; 146 combined results return. No test filter left applied.
- All three browser error checks return empty output. Health returns HTTP 200.
- Server error query after deployment recorded four `Error: aborted` entries
  around 14:16:12–14:16:13 UTC. Their source is not established; do not claim
  the entire log window was clean or attribute them conclusively to navigation.

The requested customer-facing rule is implemented and the available-result
behavior is verified on staging. All-provider empty/failure combinations have
controlled state and rendered-component coverage, not forced live upstream
failure evidence. No API credentials, provider safeguards, production settings,
or native apps were changed. No KAYAK support request was sent.
