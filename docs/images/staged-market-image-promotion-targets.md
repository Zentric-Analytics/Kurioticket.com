# Staged Market Image Promotion Targets

Use the promotion target planner after previewing a staged pack and before copying entries into active market image packs.

## Command

```bash
node scripts/plan-staged-market-image-promotion-targets.mjs <batchId> <market>
```

Example:

```bash
node scripts/plan-staged-market-image-promotion-targets.mjs market-assets-2026-07-us-001 US
```

## Behavior

The planner:

1. Runs the staged pack promotion preview.
2. Confirms the requested batch ID and market are available.
3. Determines the active target file for the generated entries.
4. Prints target file, reason, and entries.
5. Does not modify active market image packs.

## Target rules

Priority market entries target:

```text
src/data/images/marketImagePacks/priorityMarkets.ts
```

Non-priority market entries target regional review first:

```text
src/data/images/marketImagePacks/regions.ts
```

Non-priority markets produce a warning so operators confirm whether the entries should become market-specific coverage or remain regional fallback coverage.

## Promotion rule

Only copy entries into the printed target file after product/design approval and after the staged pack audit passes. The planner is intentionally plan-only.
