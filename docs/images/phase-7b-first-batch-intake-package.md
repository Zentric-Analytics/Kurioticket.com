# Phase 7B First Batch Intake Package

Use this checklist before starting the first real production asset intake batch.

Target first batch:

```text
market-assets-2026-07-us-001
```

This package does not add real assets by itself. It defines the files and approvals operators must collect before conversion.

## Required package files

Create and keep these files together for the first US batch:

```text
intake-handoff-us-001.json
transfer-checklist-us-001.json
transfer-completions-us-001.json
manifest-us-001.json
```

## Required real asset count

The first batch must contain 13 approved production images:

- 1 homepage hero image
- 8 homepage destination card images
- 4 flight inspiration card images

## Required approval metadata per image

Every image must have:

- approved source asset path
- purchase or source URL
- commercial web and mobile-web license type
- license notes
- approved alt text
- real source dimensions
- desktop crop notes
- mobile crop notes
- reviewer
- approval date
- `readyForManifest: true` in the handoff only after approval

## Recommended file creation order

### 1. Generate intake handoff

```bash
node scripts/build-market-asset-intake-handoff-template.mjs US market-assets-2026-07-us-001 2026-07-08 "Design ops" > intake-handoff-us-001.json
```

### 2. Fill real approved production metadata

Operators must replace every placeholder in `intake-handoff-us-001.json` with real approved metadata.

Do not continue while any row still has:

- `TODO`
- `YYYY-MM-DD`
- missing source path
- missing license metadata
- missing alt text
- missing dimensions
- missing crop approval notes
- `readyForManifest: false`

### 3. Validate handoff readiness

```bash
node scripts/check-market-asset-intake-handoff-readiness.mjs intake-handoff-us-001.json
```

Only continue when readiness returns `ready: true`.

### 4. Generate transfer checklist

```bash
node scripts/build-market-asset-handoff-transfer-checklist.mjs intake-handoff-us-001.json > transfer-checklist-us-001.json
```

### 5. Generate transfer completion overlay

```bash
node scripts/build-market-asset-handoff-transfer-completion-template.mjs transfer-checklist-us-001.json > transfer-completions-us-001.json
```

### 6. Generate final manifest template

```bash
node scripts/build-market-asset-batch-template.mjs US market-assets-2026-07-us-001 2026-07-08 > manifest-us-001.json
```

### 7. Transfer approved values into manifest

Manually transfer only readiness-approved handoff values into `manifest-us-001.json`.

For each transfer task completed, set the matching row in `transfer-completions-us-001.json` to:

```json
{
  "completed": true
}
```

### 8. Validate transfer readiness

```bash
node scripts/check-market-asset-handoff-transfer-readiness.mjs transfer-checklist-us-001.json transfer-completions-us-001.json
```

Only continue when transfer readiness returns `ready: true`.

### 9. Run final manifest review

```bash
node scripts/review-market-asset-manifest.mjs manifest-us-001.json
```

Only continue when manifest review returns `ready: true`.

### 10. Run conflict checks

```bash
node scripts/check-market-asset-manifest-conflicts.mjs manifest-us-001.json
```

Only continue when no conflicts are found.

### 11. Convert the approved manifest

```bash
node scripts/convert-market-asset-manifest.mjs manifest-us-001.json
```

## First-batch stop conditions

Stop the first batch immediately if any of these happen:

- an image has unclear license coverage
- desktop or mobile crop approval is missing
- alt text is still placeholder-quality
- dimensions are unknown or still `0 x 0`
- handoff readiness fails
- transfer readiness fails
- manifest review fails
- conflict checks fail
- conversion output does not match the expected staged pack shape

## Safety notes

- Do not add real assets directly to active packs.
- Do not convert before handoff readiness, transfer readiness, manifest review, and conflict checks all pass.
- Do not promote staged entries until staged promotion preview, active audit, release readiness, and build verification pass.
- Keep the first batch small and fully auditable before scaling to the remaining 99 planned launch batches.
