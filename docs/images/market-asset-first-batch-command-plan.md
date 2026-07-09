# Market Asset First Batch Command Plan

Use this command to generate the file names and command sequence for the first Phase 7B real intake batch.

Default target batch:

```text
market-assets-2026-07-us-001
```

The command plan is read-only. It does not add real assets, staged packs, active packs, or resolver behavior.

## Command

```bash
node scripts/build-market-asset-first-batch-command-plan.mjs [batchId] [market] [createdAt] [owner] [fileSuffix]
```

Default example:

```bash
node scripts/build-market-asset-first-batch-command-plan.mjs
```

Custom example:

```bash
node scripts/build-market-asset-first-batch-command-plan.mjs market-assets-2026-07-gb-001 GB 2026-07-09 "Brand team" gb-001
```

## Default output files

The default plan uses:

```text
intake-handoff-us-001.json
transfer-checklist-us-001.json
transfer-completions-us-001.json
manifest-us-001.json
```

## Command sequence

The generated plan includes commands for:

1. intake handoff generation
2. handoff readiness check
3. transfer checklist generation
4. transfer completion overlay generation
5. final manifest template generation
6. transfer readiness check
7. final manifest review
8. manifest conflict check
9. approved manifest conversion

## Recommended usage

1. Generate the command plan.
2. Run the handoff generation command.
3. Fill real approved production metadata.
4. Run handoff readiness.
5. Generate transfer checklist and completion overlay.
6. Generate the manifest template.
7. Transfer approved values manually.
8. Run transfer readiness.
9. Run manifest review and conflict checks.
10. Convert only when all gates pass.

## Safety notes

- Do not run conversion until all readiness and review commands pass.
- Do not treat this command plan as proof that assets are approved.
- Do not use unapproved assets.
- Do not promote staged entries until staged promotion preview, active audit, release readiness, and build verification pass.
