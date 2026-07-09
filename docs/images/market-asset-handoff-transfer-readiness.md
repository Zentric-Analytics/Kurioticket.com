# Market Asset Handoff Transfer Readiness

Use this command during Phase 7B to verify that every handoff transfer checklist item is complete before final manifest review.

The readiness check is read-only. It does not mutate handoffs, manifests, staged packs, active packs, or resolver behavior.

## Command

```bash
node scripts/check-market-asset-handoff-transfer-readiness.mjs <checklist.json> <completions.json>
```

Example:

```bash
node scripts/build-market-asset-handoff-transfer-checklist.mjs intake-handoff-us-001.json > transfer-checklist-us-001.json
node scripts/check-market-asset-handoff-transfer-readiness.mjs transfer-checklist-us-001.json transfer-completions-us-001.json
```

The command prints JSON with:

- `ready`
- `totalChecks`
- `completedChecks`
- `remainingChecks`
- `missingCheckIds`

It exits with a non-zero status when transfer checks are incomplete.

## Completion overlay format

```json
[
  {
    "id": "market-assets-YYYY-MM-DD-us-001-homepage-hero-001:source-path",
    "completed": true
  }
]
```

Each completion `id` must match a checklist item ID.

## Recommended Phase 7B flow

```bash
node scripts/check-market-asset-intake-handoff-readiness.mjs intake-handoff-us-001.json
node scripts/build-market-asset-handoff-transfer-checklist.mjs intake-handoff-us-001.json > transfer-checklist-us-001.json
# Complete transfer manually and record completed item IDs
node scripts/check-market-asset-handoff-transfer-readiness.mjs transfer-checklist-us-001.json transfer-completions-us-001.json
node scripts/review-market-asset-manifest.mjs manifest-us-001.json
```

## Safety notes

- Do not run final manifest review until transfer readiness returns `ready: true`.
- Do not use the completion overlay as a substitute for actual manifest review.
- Do not convert a manifest until manifest review and conflict checks pass.
- Do not promote staged entries until staged promotion preview, active audit, release readiness, and build verification pass.
