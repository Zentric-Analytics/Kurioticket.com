# Market Asset Intake Handoff Template

Use this command at the start of Phase 7B to collect real production asset metadata before generating final manifests.

The handoff template is read-only. It does not add real assets, staged packs, active packs, or resolver changes.

## Command

```bash
node scripts/build-market-asset-intake-handoff-template.mjs <market> [batchId] [createdAt] [owner]
```

Example:

```bash
node scripts/build-market-asset-intake-handoff-template.mjs US market-assets-2026-07-us-001 2026-07-08 "Design ops" > intake-handoff-us-001.json
```

## Output

The command prints a JSON object with one handoff item per configured manifest slot.

Each item asks operators to fill:

- source asset path
- purchase or source URL
- commercial license type
- license notes
- approved alt text
- real dimensions
- desktop crop notes
- mobile crop notes
- reviewer
- approval date
- ready-for-manifest flag

## Recommended Phase 7B flow

1. Generate the intake handoff template.
2. Collect real approved production asset metadata.
3. Mark `readyForManifest` only when license, alt text, dimensions, and crop approvals are complete.
4. Generate the manifest template.
5. Transfer approved handoff values into the manifest.
6. Run combined manifest review.
7. Run conflict checks.
8. Convert only approved manifests.

## Safety notes

- Do not convert from the handoff template directly.
- Do not mark an item ready without license and crop approval.
- Do not use unapproved external stock.
- Do not use placeholders in final manifests.
- The manifest review remains the source-of-truth gate before conversion.
