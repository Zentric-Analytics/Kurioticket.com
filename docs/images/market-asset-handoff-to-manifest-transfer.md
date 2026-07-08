# Market Asset Handoff to Manifest Transfer

Use this guide during Phase 7B after an intake handoff passes readiness and before a manifest is reviewed for conversion.

This workflow is manual by design. It keeps the handoff readiness gate separate from the final manifest review gate.

## Inputs

- A readiness-approved intake handoff file, for example `intake-handoff-us-001.json`
- A generated manifest template, for example `manifest-us-001.json`

## Step 1: Validate the handoff

```bash
node scripts/check-market-asset-intake-handoff-readiness.mjs intake-handoff-us-001.json
```

Only continue when the handoff result returns `ready: true`.

## Step 2: Generate the matching manifest template

```bash
node scripts/build-market-asset-batch-template.mjs US market-assets-2026-07-us-001 2026-07-08 > manifest-us-001.json
```

The manifest batch ID, market, and slot order must match the handoff.

## Step 3: Transfer approved values

For each handoff `items[]` row, copy values into the matching manifest `entries[]` row:

| Handoff field | Manifest field |
| --- | --- |
| `sourceAssetPath` | `sourceFilePath` |
| `purchaseOrSourceUrl` | `sourcePage` |
| `licenseType` | `license` |
| `licenseNotes` | `licenseNotes` |
| `altText` | `alt` |
| `dimensions` | `dimensions` |
| `desktopCropNotes` and `mobileCropNotes` | `cropNotes` |
| `reviewer` | `reviewer` |
| `approvedAt` | `approvedAt` |
| `readyForManifest` | no direct manifest field; use it only as the handoff gate |

Set manifest approval flags only when the matching handoff row is approved:

```json
{
  "desktopApproved": true,
  "mobileApproved": true
}
```

## Step 4: Remove manifest placeholders

Before review, confirm the manifest has no remaining placeholder values:

- no `TODO` strings
- no `YYYY-MM-DD` dates
- no `0 x 0` dimensions
- no false crop approval flags
- no missing license metadata
- no missing reviewer or approval date

## Step 5: Run final manifest review

```bash
node scripts/review-market-asset-manifest.mjs manifest-us-001.json
```

Only continue when the manifest result returns `ready: true`.

## Step 6: Run conflict checks

```bash
node scripts/check-market-asset-manifest-conflicts.mjs manifest-us-001.json
```

## Step 7: Convert only after both gates pass

```bash
node scripts/convert-market-asset-manifest.mjs manifest-us-001.json
```

## Safety notes

- Do not transfer handoff rows that are not readiness-approved.
- Do not set manifest crop approvals to true unless both desktop and mobile crops are approved.
- Do not convert a manifest that still has placeholders.
- Do not skip final manifest review just because the handoff passed readiness.
- Do not promote staged entries until staged promotion preview, active audit, release readiness, and build verification pass.
