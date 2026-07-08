# Phase 7A: US Production Market Asset Intake

Phase 7A starts the first real production market asset batch. The first intake market is `US`.

This guide is operator-facing and does not add real assets, staged packs, active packs, or resolver changes.

## Goal

Create and review the first US production market asset manifest before any conversion or active promotion work begins.

The current configured batch shape is:

- 1 homepage hero
- 8 homepage destination cards
- 4 flight inspiration cards

## Batch ID

Use this batch ID for the first US intake batch unless design ops assigns a newer one:

```text
market-assets-2026-07-us-001
```

## Step 1: Generate the manifest template

```bash
node scripts/build-market-asset-batch-template.mjs US market-assets-2026-07-us-001 2026-07-08 > manifest.json
```

## Step 2: Fill real production asset metadata

Replace every placeholder before review:

- source asset paths
- public image paths
- approved alt text
- source or purchase URLs
- commercial license metadata
- real dimensions
- desktop crop notes
- mobile crop notes
- reviewer name or team
- approval date

Set `desktopApproved` and `mobileApproved` to `true` only after both crops are reviewed.

## Step 3: Run the combined review

```bash
node scripts/review-market-asset-manifest.mjs manifest.json
```

The review must return `ready: true` before conversion.

## Step 4: Run conflict checks

```bash
node scripts/check-market-asset-manifest-conflicts.mjs manifest.json
```

## Step 5: Convert into staged production entries

```bash
node scripts/convert-market-asset-manifest.mjs manifest.json
```

## Step 6: Preview promotion

```bash
node scripts/preview-staged-market-image-promotion.mjs market-assets-2026-07-us-001 US
node scripts/plan-staged-market-image-promotion-targets.mjs market-assets-2026-07-us-001 US
node scripts/build-staged-market-image-promotion-checklist.mjs market-assets-2026-07-us-001 US
node scripts/build-staged-market-image-promotion-snippet.mjs market-assets-2026-07-us-001 US
```

## Step 7: Promote only after review

Do not copy staged entries into active packs until:

- combined review passes
- conflict check passes
- staged pack audit passes
- promotion preview is reviewed
- promotion checklist is completed
- license and crop approvals are confirmed

## Step 8: Post-copy active audit

After entries are copied into active market packs, run:

```bash
node scripts/audit-active-market-image-promotion.mjs US
npm run audit:market-images
node scripts/check-market-image-release-readiness.mjs
npm run build
```

## Safety notes

- Do not use scaffold placeholders as production assets.
- Do not use unapproved external stock.
- Do not promote entries with missing license metadata.
- Do not promote entries with replacement-needed flags.
- Do not modify resolver precedence during this intake step.
