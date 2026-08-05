# 18. Failure recovery

## Key runbooks

- Required check stuck: inspect job graph, path/conditions, logs; rerun after deterministic fix.
- Render failure: check deployment logs and `/api/health` for deployed SHA.
- Android OTA duplicate: replay/provenance checks should block; review history filtering.
- Android native build failure: validate fingerprint/classifier, run with updated evidence.
- iOS TestFlight failure: validate build identity and processing logs in ASC.
- EAS CLI failure: inspect command/schema error output; do not mask with non-empty defaults.
- Credential mismatch: stop and repair using platform-native credential flow.
- Branch divergence: run ancestry checks and merge strategy correction.

## Recovery principle

No automatic bypass of required checks. Preserve fail-closed behavior for all mutating paths.
