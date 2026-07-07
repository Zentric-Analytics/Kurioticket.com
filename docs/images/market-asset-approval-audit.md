# Market Asset Approval Audit

This audit compares the first production market asset intake requirements against the registered market image catalog.

## Run the audit

```bash
node scripts/audit-market-asset-approvals.mjs
```

By default, the audit reports missing approved assets without failing. This keeps the workflow useful while the first real image batch is still being sourced and uploaded.

## Enforce the audit

When the team is ready to make missing approved market assets fail CI, run:

```bash
ENFORCE_MARKET_ASSET_APPROVALS=true node scripts/audit-market-asset-approvals.mjs
```

## Approval criteria

A registry image counts toward a production asset requirement only when it has:

- Matching market.
- Matching region.
- Matching usage.
- `premium-approved` or `provider-real` status.
- Commercial license metadata.
- Desktop crop approval.
- Mobile crop approval.
- No temporary source.
- No Unsplash or Pexels source.
- No replacement-required flag.

## Why this exists

The production asset intake defines what the team needs to source. This approval audit defines when the repository has enough registered, licensed, crop-approved images to satisfy that intake.
