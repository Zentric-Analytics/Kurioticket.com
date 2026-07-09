# Market Asset First Batch Status Report

Use this command during Phase 7B to generate one status report that includes both integrity validation and the first-batch status summary.

The status report is read-only. It does not add real assets, staged packs, active packs, or resolver behavior.

## Command

```bash
node scripts/build-market-asset-first-batch-status-report.mjs <status.json> [batchId] [market]
```

Example:

```bash
node scripts/build-market-asset-first-batch-status-report.mjs first-batch-status-us-001.json
```

## Output

The command prints JSON with:

- `integrity`
- `summary`
- `trusted`

`trusted` is `true` only when the status overlay passes the gate-order integrity check.

## Recommended usage

Use this command before making first-batch decisions from the status overlay:

```bash
node scripts/build-market-asset-first-batch-status-report.mjs first-batch-status-us-001.json
```

If `trusted` is `false`, fix the status overlay before using `readyForConversion`, `nextGate`, or gate counts.

## Safety notes

- Do not rely on summary values when `trusted` is `false`.
- Do not mark later status gates complete before earlier required gates pass.
- `readyForConversion: true` does not mean staged entries are promoted.
- Do not promote staged entries until staged promotion preview, active audit, release readiness, and build verification pass.
