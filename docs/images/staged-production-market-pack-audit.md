# Staged Production Market Pack Audit

Use this audit before promoting staged market image records into active market image packs.

## Command

```bash
node scripts/audit-staged-market-image-packs.mjs
```

## What it checks

The audit validates staged production packs for:

- Required batch ID.
- Required market.
- Market consistency between each pack and its entries.
- Duplicate staged IDs.
- Duplicate staged URLs.
- ID collisions with the active market image registry.
- URL collisions with the active market image registry.
- License metadata before staging.
- Desktop and mobile crop approval before staging.
- `premiumReplacementRequired: false` for staged production entries.

## Empty-state behavior

The staged pack list starts empty. The audit passes with zero staged packs and zero staged images.

## Promotion rule

Do not promote staged images into active market image packs until this audit passes and the product/design owner confirms the assets are ready for public marketplace surfaces.
