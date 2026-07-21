# Market Asset Manifest Dry Run

Use the dry-run script to validate a market asset manifest and preview the registry-ready entries it would create.

## Command

```bash
node scripts/convert-market-asset-manifest.mjs docs/images/market-asset-manifest.example.json
```

## Behavior

The script:

1. Reads the manifest JSON file.
2. Validates the manifest using `validateMarketAssetManifest`.
3. Converts valid entries with `convertMarketAssetManifestToRegistryEntries`.
4. Prints registry-ready entries as formatted JSON.
5. Does not modify any registry file.

## Invalid manifests

Invalid manifests throw an error that includes the validation messages. Fix the manifest and rerun the command before adding any generated entries to a market image pack.

## Safety rule

This is a review tool only. It does not upload files, write registry entries, or update live marketplace imagery.
