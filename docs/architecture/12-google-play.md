# 12. Google Play architecture

## Source of truth

- Developer account context: `ZENTRIC-ANALYTICS`.
- Production package: `com.kurioticket.app`.
- Current known production artifact status: versionCode reached `2`; AAB source evidence and Play signing info appear in `apps/mobile/release-baselines/android/production-play-history.json`.

## Delivery model

- No auto-upload/public rollout is built into preview lanes.
- Production release is owner-dispatched and manually reviewed.
- Play App Signing context exists in prior evidence and remains under external platform control.

## Current status

- Production Play path: `IMPLEMENTED` in code and `EXTERNAL_VERIFIED` for AAB/build state and Play App Signing context in this phase evidence.
