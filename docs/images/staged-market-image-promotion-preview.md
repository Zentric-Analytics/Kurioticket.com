# Staged Market Image Promotion Preview

Use the promotion preview before copying staged production entries into active market image packs.

## Command

```bash
node scripts/preview-staged-market-image-promotion.mjs <batchId> <market>
```

Example:

```bash
node scripts/preview-staged-market-image-promotion.mjs market-assets-2026-07-us-001 US
```

## Behavior

The preview:

1. Runs the staged production pack audit.
2. Finds the requested staged pack by batch ID and market.
3. Prints promotion-ready entries as formatted JSON.
4. Does not modify active market image packs.

## Failure cases

The preview fails when:

- The staged pack audit fails.
- No staged pack matches the requested batch ID and market.
- Batch ID or market is missing.

## Promotion rule

Only copy previewed entries into active market image packs after product/design approval. This command is intentionally preview-only so operators can review the exact entries before live resolver coverage changes.
