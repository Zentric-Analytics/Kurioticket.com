# 7. Android Preview architecture

## Identity and contract
- Package: `com.kurioticket.app.preview`
- App name: `Kurioticket Preview`
- Runtime/channel: `preview-0.3.0` / `preview`
- API: `https://staging.kurioticket.com`
- Profile: `preview`

## Delivery path

1. Triggered by PR/merge-oriented dev flow via preview delivery orchestration.
2. Validation gates assert: branch ancestry, immutable SHA, variant + API + channel + package/runtime.
3. Classifier decides OTA vs native:
   - OTA-compatible => duplicate check + publish decision
   - native-build-required => no OTA publish
4. Build/update result and source hash are re-verified pre-publication.

## Current status

- Verified in code: guarded identity checks, replay/provenance filtering, baseline usage, fingerprint checks.
- Last operational evidence confirms the preview OTA and native-classifier flow is functional; deployment path is currently tracked through release baseline/merge evidence and deployment records (`dep-...` and PR history).

## Risks

- Historical platform state can drift from repo assumptions if Play/TestFlight-like external state is stale.
