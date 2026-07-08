# Market Asset Launch Progress Tracker

Use this command to summarize Phase 7A production image launch progress across planned markets and batches.

The tracker is read-only. It does not mutate manifests, staged packs, active packs, or resolver behavior.

## Command

```bash
node scripts/summarize-market-asset-launch-progress.mjs [createdAt] [launchAssetTarget] [progress.json] [markets]
```

Example with no progress overlay:

```bash
node scripts/summarize-market-asset-launch-progress.mjs 2026-07 130
```

Example with a progress overlay file:

```bash
node scripts/summarize-market-asset-launch-progress.mjs 2026-07 130 launch-progress.json
```

Example subset:

```bash
node scripts/summarize-market-asset-launch-progress.mjs 2026-07 130 launch-progress.json US,GB,CA
```

## Progress overlay format

```json
[
  {
    "batchId": "market-assets-2026-07-us-001",
    "status": "reviewed"
  },
  {
    "batchId": "market-assets-2026-07-us-002",
    "status": "converted"
  },
  {
    "batchId": "market-assets-2026-07-us-003",
    "status": "promoted"
  }
]
```

Supported statuses:

- `planned`
- `template-generated`
- `metadata-complete`
- `reviewed`
- `conflict-checked`
- `converted`
- `promotion-reviewed`
- `promoted`

Batches not listed in the overlay are treated as `planned`.

## Recommended usage

1. Generate the priority launch queue.
2. Generate the launch queue checklist.
3. Track batch status changes in a small overlay file.
4. Run the progress summary before Phase 7A standups or promotion reviews.
5. Treat only `promoted` batches as completed.

## Safety notes

- Progress status is informational only.
- A batch marked as promoted in the overlay still needs source-of-truth verification from active audits and release readiness checks.
- Do not use the progress overlay as a substitute for manifest review, conflict checks, staged promotion preview, active audit, release readiness, or build verification.
