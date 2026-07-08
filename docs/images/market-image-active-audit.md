# Market Image Active Audit

Use this command after reviewed entries have been copied into an active market image pack.

## Command

```bash
node scripts/audit-active-market-image-promotion.mjs <market>
```

Example:

```bash
node scripts/audit-active-market-image-promotion.mjs US
```

## Checks

The command reviews active image entries for the requested market and fails when an entry:

- Still needs replacement.
- Is missing desktop or mobile crop approval.
- Is missing license metadata.
- Is launch-critical but not approved for production use.

If a market has no reviewed active entries yet, the command prints a warning rather than failing.

## Suggested order

Run this command after preview, target planning, checklist review, snippet generation, and manual copy into the target pack file.

Then run:

```bash
npm run audit:market-images
node scripts/audit-market-asset-approvals.mjs
node scripts/check-market-image-release-readiness.mjs
```
