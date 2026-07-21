# Market Asset Launch Progress Template

Use this command to generate a starter progress overlay file for the Phase 7A launch progress tracker.

The template is read-only and does not mutate manifests, staged packs, active packs, or resolver behavior.

## Command

```bash
node scripts/build-market-asset-launch-progress-template.mjs [createdAt] [launchAssetTarget] [markets] [initialStatus]
```

Example full overlay template:

```bash
node scripts/build-market-asset-launch-progress-template.mjs 2026-07 130 > launch-progress.json
```

Example subset overlay template:

```bash
node scripts/build-market-asset-launch-progress-template.mjs 2026-07 130 US,GB,CA > launch-progress.json
```

Example custom initial status:

```bash
node scripts/build-market-asset-launch-progress-template.mjs 2026-07 130 US template-generated > launch-progress.json
```

## Output

The command prints a JSON array with one row per planned batch:

```json
[
  {
    "batchId": "market-assets-2026-07-us-001",
    "status": "planned"
  }
]
```

## Recommended usage

1. Generate the progress overlay template.
2. Commit or store the overlay where operators track Phase 7A work.
3. Update statuses as each batch advances through review gates.
4. Run `summarize-market-asset-launch-progress` against the overlay.

## Safety notes

- The overlay is an operator tracking aid only.
- Status values do not replace manifest review, conflict checks, staged promotion preview, active audit, release readiness, or build verification.
- Treat only source-of-truth checks as launch approval.
