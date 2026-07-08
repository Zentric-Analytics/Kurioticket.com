# Market Asset Batch Template

Use this template builder when starting a real Phase 7 production image batch for a market.

## Command

```bash
node scripts/build-market-asset-batch-template.mjs <market> [batchId] [createdAt]
```

Example:

```bash
node scripts/build-market-asset-batch-template.mjs US market-assets-2026-07-us-001 2026-07-08
```

## Output

The command prints a manifest-shaped JSON starter with one entry for each required image slot:

- 1 homepage hero
- 8 homepage destination cards
- 4 flight inspiration cards

## Safety

The generated entries are placeholders. They intentionally keep crop approvals set to false and include TODO fields.

Before validating or converting the manifest, operators must replace every TODO, add real asset paths, add real license metadata, write final alt text, and set crop approvals only after review.

## Next commands

After completing the template with real approved assets, run:

```bash
node scripts/check-market-asset-manifest-conflicts.mjs <manifest.json>
node scripts/convert-market-asset-manifest.mjs <manifest.json>
node scripts/preview-staged-market-image-promotion.mjs <batchId> <market>
node scripts/plan-staged-market-image-promotion-targets.mjs <batchId> <market>
node scripts/build-staged-market-image-promotion-checklist.mjs <batchId> <market>
node scripts/build-staged-market-image-promotion-snippet.mjs <batchId> <market>
```
