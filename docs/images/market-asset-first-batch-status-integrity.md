# Market Asset First Batch Status Integrity

Use this command during Phase 7B to verify that the first-batch status overlay respects the required gate order.

The integrity check is read-only. It does not add real assets, staged packs, active packs, or resolver behavior.

## Command

```bash
node scripts/check-market-asset-first-batch-status-integrity.mjs <status.json>
```

Example:

```bash
node scripts/check-market-asset-first-batch-status-integrity.mjs first-batch-status-us-001.json
```

The command prints JSON with:

- `valid`
- `errors`

It exits with a non-zero status when a later gate is marked complete before an earlier required gate.

## Gate order

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

## Safety notes

- Do not mark transfer checklist generation complete before handoff readiness passes.
- Do not mark transfer readiness complete before checklist, completion overlay, and manifest generation are complete.
- Do not mark conversion complete before manifest review and conflict checks pass.
- This check does not replace handoff readiness, transfer readiness, final manifest review, conflict checks, staged promotion preview, active audit, release readiness, or build verification.
