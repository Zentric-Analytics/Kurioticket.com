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
first-batch-status-us-001.json
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

Create the first-batch status overlay before tracking gate progress:

```bash
node scripts/build-market-asset-first-batch-status-template.mjs > first-batch-status-us-001.json
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

After the handoff file is generated and readiness passes, update `first-batch-status-us-001.json` so `handoffGenerated` and `handoffReady` are `true`, then run:

```bash
node scripts/build-market-asset-first-batch-status-report.mjs first-batch-status-us-001.json
```

Only use the status summary when the report returns `trusted: true`.

### 4. Generate transfer checklist

```bash
node scripts/build-market-asset-handoff-transfer-checklist.mjs intake-handoff-us-001.json > transfer-checklist-us-001.json
```

Update `transferChecklistGenerated` to `true` in `first-batch-status-us-001.json`, then rerun the status report.

### 5. Generate transfer completion overlay

```bash
node scripts/build-market-asset-handoff-transfer-completion-template.mjs transfer-checklist-us-001.json > transfer-completions-us-001.json
```

Update `transferCompletionsGenerated` to `true` in `first-batch-status-us-001.json`, then rerun the status report.

### 6. Generate final manifest template

```bash
node scripts/build-market-asset-batch-template.mjs US market-assets-2026-07-us-001 2026-07-08 > manifest-us-001.json
```

Update `manifestGenerated` to `true` in `first-batch-status-us-001.json`, then rerun the status report.

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

Update `transferReady` to `true` in `first-batch-status-us-001.json`, then rerun the status report.

### 9. Run final manifest review

```bash
node scripts/review-market-asset-manifest.mjs manifest-us-001.json
```

Only continue when manifest review returns `ready: true`.

Update `manifestReady` to `true` in `first-batch-status-us-001.json`, then rerun the status report.

### 10. Run conflict checks

```bash
node scripts/check-market-asset-manifest-conflicts.mjs manifest-us-001.json
```

Only continue when no conflicts are found.

Update `conflictsClear` to `true` in `first-batch-status-us-001.json`, then rerun the status report.

### 11. Convert the approved manifest

```bash
node scripts/convert-market-asset-manifest.mjs manifest-us-001.json
```

After conversion succeeds and output shape is checked, update `converted` to `true` in `first-batch-status-us-001.json`, then run the final status report.

## First-batch status report

Run this after each status overlay update:

```bash
node scripts/build-market-asset-first-batch-status-report.mjs first-batch-status-us-001.json
```

Use the report to confirm:

- `trusted: true`
- `integrity.valid: true`
- the expected `nextGate`
- whether `readyForConversion` is safe to use

If `trusted` is `false`, fix the status overlay before continuing.

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
- status report returns `trusted: false`
- conversion output does not match the expected staged pack shape

## Safety notes

- Do not add real assets directly to active packs.
- Do not convert before handoff readiness, transfer readiness, manifest review, conflict checks, and status report integrity all pass.
- Do not promote staged entries until staged promotion preview, active audit, release readiness, and build verification pass.
- Keep the first batch small and fully auditable before scaling to the remaining 99 planned launch batches.
