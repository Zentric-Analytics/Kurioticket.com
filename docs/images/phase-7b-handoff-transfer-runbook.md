# Phase 7B Handoff Transfer Runbook

Use this runbook to move one approved production market asset batch from intake handoff through final manifest review.

This runbook is intentionally manual. It keeps real asset intake, handoff readiness, transfer completion, manifest review, conflict checks, and conversion as separate gates.

## Inputs

For one market batch, operators need:

- a generated intake handoff file
- approved real production asset metadata
- a generated transfer checklist
- a generated transfer completion overlay
- a generated final manifest template

Example batch:

```text
market-assets-2026-07-us-001
```

## Step 1: Generate the intake handoff

```bash
node scripts/build-market-asset-intake-handoff-template.mjs US market-assets-2026-07-us-001 2026-07-08 "Design ops" > intake-handoff-us-001.json
```

Fill the handoff with real production metadata only:

- source asset paths
- source or purchase URLs
- license type and license notes
- alt text
- dimensions
- desktop crop notes
- mobile crop notes
- reviewer
- approval date
- `readyForManifest: true` only after approval

## Step 2: Validate intake handoff readiness

```bash
node scripts/check-market-asset-intake-handoff-readiness.mjs intake-handoff-us-001.json
```

Only continue when this returns `ready: true`.

## Step 3: Generate transfer checklist

```bash
node scripts/build-market-asset-handoff-transfer-checklist.mjs intake-handoff-us-001.json > transfer-checklist-us-001.json
```

This checklist expands every handoff item into the exact manifest transfer tasks.

## Step 4: Generate transfer completion overlay

```bash
node scripts/build-market-asset-handoff-transfer-completion-template.mjs transfer-checklist-us-001.json > transfer-completions-us-001.json
```

The generated overlay defaults all rows to `completed: false`.

## Step 5: Generate matching manifest template

```bash
node scripts/build-market-asset-batch-template.mjs US market-assets-2026-07-us-001 2026-07-08 > manifest-us-001.json
```

Confirm the manifest batch ID, market, and slot order match the handoff.

## Step 6: Transfer approved handoff values into the manifest

For each checklist row, manually copy the approved value into the matching manifest entry.

After each transfer task is checked, set the matching completion overlay row to:

```json
{
  "completed": true
}
```

Do not mark a row complete until the manifest value was transferred and checked.

## Step 7: Validate transfer readiness

```bash
node scripts/check-market-asset-handoff-transfer-readiness.mjs transfer-checklist-us-001.json transfer-completions-us-001.json
```

Only continue when this returns `ready: true`.

## Step 8: Run final manifest review

```bash
node scripts/review-market-asset-manifest.mjs manifest-us-001.json
```

Only continue when manifest review returns `ready: true`.

## Step 9: Run conflict checks

```bash
node scripts/check-market-asset-manifest-conflicts.mjs manifest-us-001.json
```

Do not convert when conflicts are found.

## Step 10: Convert approved manifest

```bash
node scripts/convert-market-asset-manifest.mjs manifest-us-001.json
```

Conversion should happen only after all prior gates pass.

## Required gate order

```text
handoff template
  -> handoff readiness
  -> transfer checklist
  -> transfer completion overlay
  -> manifest template
  -> manual transfer
  -> transfer readiness
  -> final manifest review
  -> conflict checks
  -> conversion
```

## Safety notes

- Do not use unapproved assets.
- Do not transfer rows from handoffs that are not ready.
- Do not mark transfer completion rows true until the manifest was updated and checked.
- Do not skip final manifest review because handoff readiness passed.
- Do not skip conflict checks because transfer readiness passed.
- Do not promote staged entries until staged promotion preview, active audit, release readiness, and build verification pass.
