# Phase 7B Ready-to-Start Checklist

Use this checklist before starting real production asset intake for the first batch.

Target first batch:

```text
market-assets-2026-07-us-001
```

This checklist is the boundary between Phase 7B preparation and Phase 7B real execution. It does not add real assets, staged packs, active packs, or resolver behavior.

## Required decision

Before starting real intake, decide whether the first batch is ready to execute:

```text
ready-to-start
not-ready-yet
```

Use `ready-to-start` only when every item below is complete.

## Required real asset package

The first batch needs 13 approved production images:

- 1 homepage hero image
- 8 homepage destination card images
- 4 flight inspiration card images

Each image must have:

- final source file or approved source path
- source or purchase URL
- commercial web and mobile-web license coverage
- license notes
- approved alt text
- real source dimensions
- desktop crop notes
- mobile crop notes
- reviewer name
- approval date

## Required operating files

Before transfer or conversion, operators must be able to produce or maintain:

```text
intake-handoff-us-001.json
transfer-checklist-us-001.json
transfer-completions-us-001.json
manifest-us-001.json
first-batch-status-us-001.json
first-batch-package-us-001.json
```

## Required commands

Generate the command plan:

```bash
node scripts/build-market-asset-first-batch-command-plan.mjs
```

Generate the package tracker after the handoff and status overlay exist:

```bash
node scripts/build-market-asset-first-batch-package-template.mjs true true > first-batch-package-us-001.json
```

Check package readiness:

```bash
node scripts/check-market-asset-first-batch-package-readiness.mjs first-batch-package-us-001.json
```

Check trusted status after each gate update:

```bash
node scripts/build-market-asset-first-batch-status-report.mjs first-batch-status-us-001.json
```

## Ready-to-start criteria

The first batch is ready to start only when:

- all 13 real images are selected
- every image has complete license/source metadata
- every image has approved alt text
- every image has real dimensions
- every image has desktop and mobile crop notes
- a reviewer and approval date are assigned for every image
- the operator has confirmed the package file names
- the operator has confirmed the command plan
- the operator understands that conversion is not promotion

## Not-ready-yet conditions

Do not start real intake when any of these are true:

- the team does not have all 13 images
- any image has unclear license coverage
- any image has placeholder alt text
- any image has unknown dimensions
- crop notes are missing or only partially approved
- reviewer or approval date is missing
- operators cannot identify who owns the first batch
- operators intend to promote immediately after conversion

## Execution boundary

When the checklist is `ready-to-start`, move into Phase 7B real execution:

```text
create handoff
  -> fill approved metadata
  -> handoff readiness
  -> package readiness
  -> transfer checklist
  -> completion overlay
  -> manifest template
  -> manual transfer
  -> transfer readiness
  -> manifest review
  -> conflict checks
  -> conversion
```

When the checklist is `not-ready-yet`, stay in Phase 7B preparation and collect the missing real asset metadata before generating production manifests.

## Safety notes

- Do not create production manifest values from guesses.
- Do not use placeholder assets for real execution.
- Do not convert until package readiness, handoff readiness, transfer readiness, manifest review, conflict checks, and trusted status all pass.
- Do not promote staged entries until staged promotion preview, active audit, release readiness, and build verification pass.
