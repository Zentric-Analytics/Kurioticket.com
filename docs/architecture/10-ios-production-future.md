# 10. iOS Production future state

## Current status

- iOS Production profile/workflow is **not currently active** in the delivery surface.
- Current repo workflows cover Preview iOS build + TestFlight submission only.

## What is intentionally absent

- Separate production iOS EAS build profile in active production path.
- iOS production store rollout workflow.
- Dedicated production-specific source checks in this path.

## To become active safely

- Introduce production iOS EAS profile and approval flow with owner-controlled dispatch.
- Keep Play and App Store approval boundaries separate.
- Prove account and source attestation path for production iOS before enabling automation.
