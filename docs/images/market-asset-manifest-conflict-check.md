# Market Asset Manifest Conflict Check

Use the conflict check before converting a manifest into registry-ready entries.

## Command

```bash
node scripts/check-market-asset-manifest-conflicts.mjs docs/images/market-asset-manifest.example.json
```

## Hard conflicts

The check fails when a manifest entry would collide with the existing market image registry or another entry in the same manifest.

Hard conflicts include:

- Manifest ID already exists in `marketImageRegistry`.
- Manifest public image path already exists in `marketImageRegistry`.
- Manifest ID is duplicated inside the same manifest.
- Manifest public image path is duplicated inside the same manifest.

## Warnings

The check warns when a manifest entry does not match a current production asset intake requirement by market, region, and usage.

Warnings do not fail the command because some approved assets may be additive or outside the first intake batch. Review warnings before converting the manifest.

## Recommended intake workflow

1. Validate the manifest.
2. Run the conflict check.
3. Run the dry-run converter.
4. Review generated registry-ready entries.
5. Add approved entries to the correct market image pack.
6. Run market image and approval audits.
