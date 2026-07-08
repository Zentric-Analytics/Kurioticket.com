# Market Asset Manifest Review

Use this command to run a single pre-conversion review for a market asset manifest.

## Command

```bash
node scripts/review-market-asset-manifest.mjs <manifest.json>
```

## Output

The command prints JSON containing:

- manifest summary
- readiness result
- top-level `ready` flag

The command exits with a non-zero status when the manifest is not ready.

## Recommended Phase 7 order

```bash
node scripts/build-market-asset-batch-template.mjs <market> <batchId> <createdAt> > manifest.json
node scripts/review-market-asset-manifest.mjs manifest.json
node scripts/check-market-asset-manifest-conflicts.mjs manifest.json
node scripts/convert-market-asset-manifest.mjs manifest.json
```

The review command is read-only. It does not mutate manifests, staged packs, active packs, or resolver coverage.
