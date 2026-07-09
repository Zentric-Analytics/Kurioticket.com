# Phase 7B First Batch Operations Index

Use this index as the starting point for the first real production image intake batch.

Target first batch:

```text
market-assets-2026-07-us-001
```

This index links the first-batch operating docs and commands in the order operators should use them. It does not add real assets, staged packs, active packs, or resolver behavior.

## 1. Assemble the first-batch package

Read:

- `docs/images/phase-7b-first-batch-intake-package.md`
- `docs/images/market-asset-first-batch-package-template.md`
- `docs/images/market-asset-first-batch-package-readiness.md`

Required files:

```text
intake-handoff-us-001.json
transfer-checklist-us-001.json
transfer-completions-us-001.json
manifest-us-001.json
first-batch-status-us-001.json
first-batch-package-us-001.json
```

Package commands:

```bash
node scripts/build-market-asset-first-batch-package-template.mjs true true > first-batch-package-us-001.json
node scripts/check-market-asset-first-batch-package-readiness.mjs first-batch-package-us-001.json
```

Do not continue toward manifest transfer or conversion while package readiness returns `ready: false`.

## 2. Generate the command plan

Read:

- `docs/images/market-asset-first-batch-command-plan.md`

Command:

```bash
node scripts/build-market-asset-first-batch-command-plan.mjs
```

Use the generated plan as the source of truth for command order and output filenames.

## 3. Create the status overlay

Read:

- `docs/images/market-asset-first-batch-status-template.md`

Command:

```bash
node scripts/build-market-asset-first-batch-status-template.mjs > first-batch-status-us-001.json
```

All gates should start incomplete.

## 4. Run the intake and transfer gates

Read:

- `docs/images/phase-7b-handoff-transfer-runbook.md`
- `docs/images/market-asset-intake-handoff-readiness.md`
- `docs/images/market-asset-handoff-transfer-checklist.md`
- `docs/images/market-asset-handoff-transfer-completion-template.md`
- `docs/images/market-asset-handoff-transfer-readiness.md`

Core gate commands:

```bash
node scripts/check-market-asset-intake-handoff-readiness.mjs intake-handoff-us-001.json
node scripts/build-market-asset-handoff-transfer-checklist.mjs intake-handoff-us-001.json > transfer-checklist-us-001.json
node scripts/build-market-asset-handoff-transfer-completion-template.mjs transfer-checklist-us-001.json > transfer-completions-us-001.json
node scripts/check-market-asset-handoff-transfer-readiness.mjs transfer-checklist-us-001.json transfer-completions-us-001.json
```

## 5. Review and convert only after all gates pass

Read:

- `docs/images/market-asset-manifest-review.md`
- `docs/images/market-asset-first-batch-status-integrity.md`
- `docs/images/market-asset-first-batch-status-summary.md`
- `docs/images/market-asset-first-batch-status-report.md`

Core status command:

```bash
node scripts/build-market-asset-first-batch-status-report.mjs first-batch-status-us-001.json
```

Only trust status values when the report returns `trusted: true` and `integrity.valid: true`.

## Required gate order

```text
handoffGenerated
  -> handoffReady
  -> transferChecklistGenerated
  -> transferCompletionsGenerated
  -> manifestGenerated
  -> transferReady
  -> manifestReady
  -> conflictsClear
  -> converted
```

## Stop conditions

Stop immediately if:

- package readiness fails after required files should exist
- handoff readiness fails
- transfer readiness fails
- status report returns `trusted: false`
- final manifest review fails
- conflict checks fail
- any image has unclear license coverage
- any image is missing approved alt text, dimensions, or crop notes

## Promotion boundary

Conversion does not mean promotion.

Do not promote staged entries until staged promotion preview, active audit, release readiness, and build verification pass.
