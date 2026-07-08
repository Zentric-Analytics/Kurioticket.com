# Market Asset Manifest Readiness

Use this check after filling a generated market asset batch template and before running conflict checks or conversion.

## Command

```bash
node scripts/check-market-asset-manifest-readiness.mjs <manifest.json>
```

## What it catches

The readiness check fails when a manifest still contains:

- TODO placeholders
- placeholder dates
- placeholder dimensions
- crop approvals set to false

It warns when approval dates are missing.

## Recommended order

```bash
node scripts/build-market-asset-batch-template.mjs <market> <batchId> <createdAt> > manifest.json
node scripts/check-market-asset-manifest-readiness.mjs manifest.json
node scripts/check-market-asset-manifest-conflicts.mjs manifest.json
node scripts/convert-market-asset-manifest.mjs manifest.json
```

## Rule

Do not run conversion for a template until every placeholder is replaced, real license metadata is included, and desktop and mobile crop approvals are true.
