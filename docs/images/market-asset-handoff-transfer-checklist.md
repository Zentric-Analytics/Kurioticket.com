# Market Asset Handoff Transfer Checklist

Use this command during Phase 7B to generate per-item transfer tasks from a readiness-approved intake handoff.

The checklist is read-only. It does not mutate handoffs, manifests, staged packs, active packs, or resolver behavior.

## Command

```bash
node scripts/build-market-asset-handoff-transfer-checklist.mjs <handoff.json>
```

Example:

```bash
node scripts/build-market-asset-handoff-transfer-checklist.mjs intake-handoff-us-001.json
```

## Checklist coverage

Each handoff item receives checks for:

- `sourceAssetPath` to `sourceFilePath`
- `purchaseOrSourceUrl` to `sourcePage`
- `licenseType` and `licenseNotes` to manifest license fields
- `altText` to `alt`
- real dimensions into `dimensions`
- desktop and mobile crop notes into `cropNotes`
- reviewer and approval date transfer
- desktop and mobile approval flags

## Recommended Phase 7B flow

```bash
node scripts/check-market-asset-intake-handoff-readiness.mjs intake-handoff-us-001.json
node scripts/build-market-asset-handoff-transfer-checklist.mjs intake-handoff-us-001.json
node scripts/build-market-asset-batch-template.mjs US market-assets-2026-07-us-001 2026-07-08 > manifest-us-001.json
# Complete transfer manually
node scripts/review-market-asset-manifest.mjs manifest-us-001.json
```

## Safety notes

- Run handoff readiness before generating this checklist.
- Complete every item transfer before final manifest review.
- Do not set crop approval flags to true unless both desktop and mobile crops are approved.
- This checklist does not replace final manifest review, conflict checks, staged promotion preview, active audit, release readiness, or build verification.
