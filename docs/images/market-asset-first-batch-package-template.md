# Market Asset First Batch Package Template

Use this command during Phase 7B to generate a starter package readiness file for the first real intake batch.

The package template is read-only. It does not add real assets, staged packs, active packs, or resolver behavior.

## Command

```bash
node scripts/build-market-asset-first-batch-package-template.mjs [handoff] [status]
```

Default example:

```bash
node scripts/build-market-asset-first-batch-package-template.mjs > first-batch-package-us-001.json
```

Example after generating the handoff and status overlay:

```bash
node scripts/build-market-asset-first-batch-package-template.mjs true true > first-batch-package-us-001.json
```

## Output

The command prints a package readiness tracking file:

```json
{
  "handoff": true,
  "transferChecklist": false,
  "transferCompletions": false,
  "manifest": false,
  "status": true
}
```

## Recommended usage

1. Generate the intake handoff.
2. Generate the first-batch status overlay.
3. Generate this package template with `true true`.
4. Update each package flag only after its file exists.
5. Run package readiness after each update.

```bash
node scripts/check-market-asset-first-batch-package-readiness.mjs first-batch-package-us-001.json
```

## Safety notes

- Do not mark a package flag true before the matching file exists.
- This template does not validate file contents.
- Continue to run package readiness, handoff readiness, transfer readiness, manifest review, conflict checks, status report, staged promotion preview, active audit, release readiness, and build verification.
