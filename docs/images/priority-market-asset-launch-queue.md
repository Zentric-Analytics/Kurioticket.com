# Priority Market Asset Launch Queue

Use this command to plan the first production image launch queue across the priority production markets.

The default priority launch markets are:

```text
US, GB, CA, BR, GH, NG, KE, ZA, AE, IN
```

Each market uses the current 13-image manifest batch shape:

- 1 homepage hero
- 8 homepage destination cards
- 4 flight inspiration cards

With the default 130-image launch target, the queue plans:

- 10 markets
- 10 batches per market
- 100 total manifest batches
- 1,300 total planned production images

## Command

```bash
node scripts/plan-priority-market-asset-launch-queue.mjs [createdAt] [launchAssetTarget] [markets]
```

Example full queue:

```bash
node scripts/plan-priority-market-asset-launch-queue.mjs 2026-07 130
```

Example subset queue:

```bash
node scripts/plan-priority-market-asset-launch-queue.mjs 2026-07 130 US,GB,CA
```

## Recommended usage

1. Generate the full priority queue.
2. Assign batch ownership per market.
3. Generate each manifest with `build-market-asset-batch-template`.
4. Fill approved production metadata.
5. Run combined manifest review.
6. Run conflict checks.
7. Convert only approved manifests.
8. Preview staged promotion before touching active packs.

## Safety notes

- This queue is a planning artifact only.
- It does not add real assets.
- It does not mutate manifests, staged packs, active packs, or resolver behavior.
- It does not make any launch market production-ready by itself.
- Each manifest must pass review, conflict checks, staged promotion review, active audit, and release readiness before launch.
