# Market Asset Manifest

The market asset manifest is the handoff format for purchased or owned image batches before they are converted into market image registry entries.

## Purpose

Use the manifest to confirm that every asset has the metadata needed for production use:

- Market and region.
- Product and usage.
- Source file path and public image path.
- Alt text and intended slot.
- Source page, license, and license notes.
- Dimensions, focal point, and crop notes.
- Desktop and mobile crop approval.
- Reviewer and approval date.

## Example

See:

```text

docs/images/market-asset-manifest.example.json
```

## Validation behavior

`validateMarketAssetManifest` rejects manifests with missing required metadata, duplicate public image paths, lowercase market codes, uppercase region codes, missing crop approvals, or invalid path conventions.

Required path conventions:

- `sourceFilePath` starts with `assets/`.
- `publicImagePath` starts with `/images/`.

## Approval rule

A manifest entry should not be converted into a production registry entry until both `desktopApproved` and `mobileApproved` are true and commercial license metadata is present.

## Next step after a valid manifest

After a manifest validates, convert entries into country-specific market image pack records and add the actual optimized image files to the public image path.
