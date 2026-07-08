# Market Asset Launch Queue Checklist

Use this command to generate an operator checklist for every planned production market asset launch batch.

The checklist is generated from the priority launch queue and is read-only.

## Command

```bash
node scripts/build-market-asset-launch-queue-checklist.mjs [createdAt] [launchAssetTarget] [markets]
```

Example full queue checklist:

```bash
node scripts/build-market-asset-launch-queue-checklist.mjs 2026-07 130
```

Example subset checklist:

```bash
node scripts/build-market-asset-launch-queue-checklist.mjs 2026-07 130 US,GB,CA
```

## Checklist coverage

Each planned batch includes operator steps for:

- manifest template generation
- production metadata completion
- combined manifest review
- manifest conflict checks
- staged conversion
- staged promotion preview
- staged promotion checklist
- post-copy active promotion audit

## Recommended use

1. Generate the priority launch queue.
2. Generate the launch queue checklist.
3. Assign owners to each market and batch.
4. Complete one manifest batch at a time.
5. Do not convert, copy, or promote a batch until its checklist gates pass.

## Safety notes

- This checklist does not add real assets.
- This checklist does not mutate manifests, staged packs, active packs, or resolver behavior.
- Checklist completion is not a replacement for manifest review, conflict checks, staged promotion preview, active audit, release readiness, or build verification.
