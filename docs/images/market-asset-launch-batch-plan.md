# Market Asset Launch Batch Plan

Use this command to plan launch-sized production image intake without changing the configured manifest batch shape.

The current configured manifest batch shape is 13 images per market:

- 1 homepage hero
- 8 homepage destination cards
- 4 flight inspiration cards

For the first production launch target of 130 images per priority market, this means 10 planned 13-image manifest batches.

## Command

```bash
node scripts/plan-market-asset-launch-batches.mjs <market> [createdAt] [launchAssetTarget]
```

Example for US:

```bash
node scripts/plan-market-asset-launch-batches.mjs US 2026-07 130
```

This returns planned batch IDs such as:

```text
market-assets-2026-07-us-001
market-assets-2026-07-us-002
market-assets-2026-07-us-003
market-assets-2026-07-us-004
market-assets-2026-07-us-005
market-assets-2026-07-us-006
market-assets-2026-07-us-007
market-assets-2026-07-us-008
market-assets-2026-07-us-009
market-assets-2026-07-us-010
```

## Recommended Phase 7A flow

Plan the launch batches:

```bash
node scripts/plan-market-asset-launch-batches.mjs US 2026-07 130
```

Generate one manifest per batch:

```bash
node scripts/build-market-asset-batch-template.mjs US market-assets-2026-07-us-001 2026-07-08 > manifest-us-001.json
```

Then review, check conflicts, and convert each completed manifest:

```bash
node scripts/review-market-asset-manifest.mjs manifest-us-001.json
node scripts/check-market-asset-manifest-conflicts.mjs manifest-us-001.json
node scripts/convert-market-asset-manifest.mjs manifest-us-001.json
```

## Safety notes

- This planner does not add real assets.
- This planner does not mutate staged packs or active packs.
- This planner does not change resolver precedence.
- A planned batch is not approved until its manifest review, conflict check, staged promotion review, active audit, and release readiness checks all pass.
