# Staged Market Image Promotion Checklist

Use the promotion checklist after target planning and before copying staged entries into active market image packs.

## Command

```bash
node scripts/build-staged-market-image-promotion-checklist.mjs <batchId> <market>
```

Example:

```bash
node scripts/build-staged-market-image-promotion-checklist.mjs market-assets-2026-07-us-001 US
```

## Behavior

The checklist:

1. Runs promotion target planning.
2. Confirms target files and entry counts.
3. Prints required manual approval and copy steps.
4. Prints post-promotion audit commands.
5. Does not modify active market image packs.

## Required manual checks

Before promotion, confirm:

- Staged pack audit passed.
- Promotion target file was identified.
- Promotion entries are available for review.
- Product/design owner approved public-surface promotion.
- Entries were copied into the printed target file.
- Post-promotion audits passed.

## Post-promotion commands

```bash
npm run audit:market-images
node scripts/audit-market-asset-approvals.mjs
node scripts/check-market-image-release-readiness.mjs
```

## Rule

Do not promote staged entries into active market image packs until the checklist is reviewed and all required manual items are complete.
