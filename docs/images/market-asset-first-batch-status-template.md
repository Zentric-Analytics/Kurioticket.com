# Market Asset First Batch Status Template

Use this command during Phase 7B to generate a starter status overlay for the first real intake batch.

Default output file name:

```text
first-batch-status-us-001.json
```

The template is read-only. It does not add real assets, staged packs, active packs, or resolver behavior.

## Command

```bash
node scripts/build-market-asset-first-batch-status-template.mjs [handoffGenerated]
```

Default example:

```bash
node scripts/build-market-asset-first-batch-status-template.mjs > first-batch-status-us-001.json
```

Example after the handoff file has been generated:

```bash
node scripts/build-market-asset-first-batch-status-template.mjs true > first-batch-status-us-001.json
```

## Output

The command prints a status overlay with every gate pending by default:

```json
{
  "handoffGenerated": false,
  "handoffReady": false,
  "transferChecklistGenerated": false,
  "transferCompletionsGenerated": false,
  "manifestGenerated": false,
  "transferReady": false,
  "manifestReady": false,
  "conflictsClear": false,
  "converted": false
}
```

## Recommended Phase 7B flow

```bash
node scripts/build-market-asset-first-batch-status-template.mjs > first-batch-status-us-001.json
node scripts/summarize-market-asset-first-batch-status.mjs first-batch-status-us-001.json
```

Update the status overlay only when each corresponding gate has actually passed.

## Safety notes

- Do not mark `handoffReady` true until handoff readiness passes.
- Do not mark `transferReady` true until transfer readiness passes.
- Do not mark `manifestReady` true until final manifest review passes.
- Do not mark `conflictsClear` true until conflict checks pass.
- Do not mark `converted` true until approved manifest conversion succeeds.
