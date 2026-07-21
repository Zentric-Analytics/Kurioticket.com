# Staged market image promotion snippet

The staged promotion snippet builder turns an approved staged market image batch into copy/paste-ready TypeScript entries for the target market image pack file. It is review-only: it validates the staged batch through the existing promotion checklist path and prints a snippet, but it does not edit active market packs, registries, or resolver coverage.

## Usage

```bash
node scripts/build-staged-market-image-promotion-snippet.mjs <batchId> <market>
```

Example:

```bash
node scripts/build-staged-market-image-promotion-snippet.mjs market-assets-2026-07-us-001 US
```

## Output

The command prints:

- the batch ID
- the market code
- the target file path or paths
- the number of staged entries to promote
- a TypeScript object snippet for manual review and copying
- a final review-only safety message

The snippet includes the promotion batch, market, target file, and a reminder to review before committing.

## Safety

The snippet builder does not modify active packs. It must not be used as an automatic promotion step for:

- `src/data/images/marketImagePacks/priorityMarkets.ts`
- `src/data/images/marketImagePacks/regions.ts`
- `src/data/images/marketImagePacks/index.ts`
- any active registry or resolver files

Manual product/design approval is still required before copying staged entries into active market image packs.

## Promotion rule

Use this sequence for staged market image promotion:

1. Run the staged audit.
2. Run the promotion preview.
3. Run the target planner.
4. Run the promotion checklist.
5. Run the snippet builder.
6. Obtain product/design approval.
7. Copy the snippet manually into the reviewed target file.
8. Run post-promotion audits.

Post-promotion commands:

```bash
npm run audit:market-images
node scripts/audit-market-asset-approvals.mjs
node scripts/check-market-image-release-readiness.mjs
```
