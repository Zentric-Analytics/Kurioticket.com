# Market Image Rollout Plan

Use the rollout planner at the start of Phase 7 to see which production markets are ready for real asset promotion and which markets are still blocked.

## Command

```bash
node scripts/plan-market-image-rollout.mjs
```

## What it reports

For each production intake market, the planner prints:

- approved image count
- total required image count
- missing image count
- staged batch count
- staged entry count
- blockers

## Ready criteria

A market is considered ready for promotion only when:

1. Production asset approval coverage is complete for that market.
2. Staged production entries exist for review and promotion.

Until real approved assets are staged, markets should remain blocked.

## Next steps after a market is ready

Run the promotion workflow for the market:

```bash
node scripts/preview-staged-market-image-promotion.mjs <batchId> <market>
node scripts/plan-staged-market-image-promotion-targets.mjs <batchId> <market>
node scripts/build-staged-market-image-promotion-checklist.mjs <batchId> <market>
node scripts/build-staged-market-image-promotion-snippet.mjs <batchId> <market>
```

After manually copying entries into active packs, run:

```bash
node scripts/audit-active-market-image-promotion.mjs <market>
npm run audit:market-images
node scripts/audit-market-asset-approvals.mjs
node scripts/check-market-image-release-readiness.mjs
```
