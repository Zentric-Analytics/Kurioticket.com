# Market Asset First Batch Status Summary

Use this command during Phase 7B to summarize the current gate status for the first real intake batch.

Default target batch:

```text
market-assets-2026-07-us-001
```

The summary is read-only. It does not add real assets, staged packs, active packs, or resolver behavior.

## Command

```bash
node scripts/summarize-market-asset-first-batch-status.mjs [status.json] [batchId] [market]
```

Example:

```bash
node scripts/summarize-market-asset-first-batch-status.mjs first-batch-status-us-001.json
```

## Integrity check before summary

Before trusting a status summary, validate that the status overlay follows the required gate order:

```bash
node scripts/check-market-asset-first-batch-status-integrity.mjs first-batch-status-us-001.json
node scripts/summarize-market-asset-first-batch-status.mjs first-batch-status-us-001.json
```

Only use the summary for first-batch decisions when the integrity check returns `valid: true`.

## Status overlay format

```json
{
  "handoffGenerated": true,
  "handoffReady": true,
  "transferChecklistGenerated": true,
  "transferCompletionsGenerated": true,
  "manifestGenerated": true,
  "transferReady": false,
  "manifestReady": false,
  "conflictsClear": false,
  "converted": false
}
```

## Gates tracked

The summary tracks:

1. intake handoff generated
2. intake handoff readiness passed
3. transfer checklist generated
4. transfer completion overlay generated
5. manifest template generated
6. transfer readiness passed
7. final manifest review passed
8. manifest conflict checks passed
9. approved manifest converted

## Required gate order

The status overlay must advance in this order:

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

## Output

The command prints JSON with:

- `readyForConversion`
- `converted`
- `completedGateCount`
- `totalGateCount`
- `nextGate`
- `gates`

## Safety notes

- Run the status integrity check before relying on the summary.
- `readyForConversion: true` means the readiness, review, and conflict gates have passed in the status overlay.
- It does not mean the staged output has been promoted.
- Do not mark later status gates complete before earlier required gates pass.
- Do not promote staged entries until staged promotion preview, active audit, release readiness, and build verification pass.
