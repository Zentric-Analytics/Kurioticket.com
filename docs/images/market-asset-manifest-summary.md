# Market Asset Manifest Summary

Use this command to inspect a market asset manifest before readiness checks, conflict checks, or conversion.

## Command

```bash
node scripts/summarize-market-asset-manifest.mjs <manifest.json>
```

## Output

The command prints JSON with:

- batch metadata
- total entry count
- counts by market
- counts by usage
- counts by source
- desktop crop approval count
- mobile crop approval count
- full crop approval count
- missing approval date count
- unique public image path count
- duplicate public image paths

## Recommended Phase 7 order

```bash
node scripts/build-market-asset-batch-template.mjs <market> <batchId> <createdAt> > manifest.json
node scripts/summarize-market-asset-manifest.mjs manifest.json
node scripts/check-market-asset-manifest-readiness.mjs manifest.json
node scripts/check-market-asset-manifest-conflicts.mjs manifest.json
node scripts/convert-market-asset-manifest.mjs manifest.json
```

The summary command is read-only. It does not mutate manifests, staged packs, active packs, or resolver coverage.
