# Market Asset Intake

This document defines the first real image intake batch for Kurioticket market-aware imagery.

## First intake markets

US, GH, NG, KE, ZA, BR, GB, AE, IN, and CA.

## Required image groups per market

Each market needs:

- 1 homepage hero image.
- 8 homepage destination card images.
- 4 flight inspiration images.

That creates 13 image slots per market and 130 minimum image slots across the first 10 markets.

## Intake report

Run the intake report directly with:

```bash
node scripts/print-production-market-asset-intake.mjs
```

The report prints each market, required usage group, count, creative brief, must-have criteria, must-avoid criteria, and recommended aspect ratios.

## Approval rule

Do not treat an asset as final until it is uploaded, registered, commercially licensed or owned, and desktop/mobile crop-approved.

## Next coding step after intake

After real files are available, replace scaffold entries in the market image packs with actual local image paths and set only approved launch assets to final approved status.
