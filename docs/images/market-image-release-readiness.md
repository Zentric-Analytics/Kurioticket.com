# Market Image Release Readiness

Use this check before a production image release or before promoting staged entries into active market image packs.

## Command

```bash
node scripts/check-market-image-release-readiness.mjs
```

## Enforced mode

By default, missing production asset approvals are reported but not fatal because real market assets may still be in progress.

When the team is ready to enforce full production approval coverage, run:

```bash
ENFORCE_MARKET_ASSET_APPROVALS=true node scripts/check-market-image-release-readiness.mjs
```

## What the check reports

The command reports:

- Staged production pack validity.
- Staged pack count.
- Staged image count.
- Staged pack warnings.
- Production asset approval completion.
- Required approved image count.
- Approved image count.
- Missing approved image count.
- Incomplete requirement groups.

## Fatal failures

The command fails when staged production packs are invalid.

In enforced mode, the command also fails when required production market asset approvals are incomplete.

## Recommended use

Run this command after:

1. Manifest validation.
2. Manifest conflict checks.
3. Manifest dry-run conversion.
4. Staged pack audit.
5. Market image audit.
6. Production asset approval audit.

This gives operators one final summary before promotion or release decisions.
