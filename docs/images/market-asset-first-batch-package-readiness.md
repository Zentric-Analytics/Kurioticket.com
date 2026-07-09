# Market Asset First Batch Package Readiness

Use this command during Phase 7B to verify that the first real intake batch package has all required files before operators continue toward transfer readiness, manifest review, conflict checks, or conversion.

The package readiness check is read-only. It does not add real assets, staged packs, active packs, or resolver behavior.

## Required files

The default first-batch package requires:

```text
intake-handoff-us-001.json
transfer-checklist-us-001.json
transfer-completions-us-001.json
manifest-us-001.json
first-batch-status-us-001.json
```

## Command

```bash
node scripts/check-market-asset-first-batch-package-readiness.mjs <package-status.json> [fileSuffix]
```

Example:

```bash
node scripts/check-market-asset-first-batch-package-readiness.mjs first-batch-package-us-001.json
```

Custom suffix example:

```bash
node scripts/check-market-asset-first-batch-package-readiness.mjs first-batch-package-gb-001.json gb-001
```

## Package status input

```json
{
  "handoff": true,
  "transferChecklist": true,
  "transferCompletions": true,
  "manifest": true,
  "status": true
}
```

## Output

The command prints JSON with:

- `ready`
- `requiredFileCount`
- `presentFileCount`
- `missingFileIds`
- `files`

It exits with a non-zero status when one or more required package files are missing.

## Safety notes

- Do not continue toward conversion while package readiness returns `ready: false`.
- This check only confirms package file presence flags; it does not validate file contents.
- Continue to run handoff readiness, transfer readiness, final manifest review, conflict checks, status report, staged promotion preview, active audit, release readiness, and build verification.
