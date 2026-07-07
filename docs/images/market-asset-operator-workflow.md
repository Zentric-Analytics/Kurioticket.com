# Market Asset Operator Workflow

This workflow describes how to move real purchased or owned market images from intake planning to registry-ready entries without accidentally changing live marketplace imagery.

## 1. Review the intake requirements

Print the first production intake batch:

```bash
node scripts/print-production-market-asset-intake.mjs
```

The first batch covers US, GH, NG, KE, ZA, BR, GB, AE, IN, and CA. Each market needs one homepage hero image, eight homepage destination card images, and four flight inspiration images.

## 2. Fill out a manifest

Use the example manifest as a starting point:

```text
docs/images/market-asset-manifest.example.json
```

Every entry must include market, region, locale, audience, product, usage, source path, public path, alt text, license details, dimensions, crop metadata, crop approval flags, and reviewer metadata.

## 3. Validate the manifest

The dry-run converter validates the manifest before conversion:

```bash
node scripts/convert-market-asset-manifest.mjs docs/images/market-asset-manifest.example.json
```

If validation fails, fix the manifest before continuing.

## 4. Check for conflicts

Run the conflict checker before reviewing generated registry entries:

```bash
node scripts/check-market-asset-manifest-conflicts.mjs docs/images/market-asset-manifest.example.json
```

This catches duplicate IDs and public image paths against both the existing registry and the manifest itself. It also warns when an entry does not match a current production intake requirement.

## 5. Review the generated registry-ready entries

Run the dry-run converter and inspect the printed JSON:

```bash
node scripts/convert-market-asset-manifest.mjs docs/images/market-asset-manifest.example.json
```

The converter does not write to the registry. Copy approved generated entries into the correct market image pack only after review.

## 6. Add optimized public image files

Add optimized image files to the public path declared by each manifest entry. Keep source files outside the public image path unless a separate asset archival process explicitly requires them.

## 7. Register approved entries

Add reviewed entries to the relevant market image pack. Do not mark entries as approved unless the manifest includes commercial license metadata and both desktop and mobile crop approvals.

## 8. Run audits

Run the market image audits after registration:

```bash
npm run audit:market-images
node scripts/audit-market-asset-approvals.mjs
```

The approval audit is report-only by default. When all required production assets are ready, enforce it with:

```bash
ENFORCE_MARKET_ASSET_APPROVALS=true node scripts/audit-market-asset-approvals.mjs
```

## Safety rules

- Do not use random external image URLs for launch-critical marketing surfaces.
- Do not use Unsplash or Pexels for final launch-critical public marketing imagery.
- Do not mark scaffold or replacement-needed entries as production-approved.
- Do not register an image without license notes and crop approval.
- Do not bypass the manifest conflict check before adding generated entries to a market image pack.
