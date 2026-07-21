# Market Asset Intake Handoff Readiness

Use this command during Phase 7B to validate an intake handoff file before transferring values into a final manifest.

The readiness check is read-only. It does not mutate handoffs, manifests, staged packs, active packs, or resolver behavior.

## Command

```bash
node scripts/check-market-asset-intake-handoff-readiness.mjs <handoff.json>
```

Example:

```bash
node scripts/check-market-asset-intake-handoff-readiness.mjs intake-handoff-us-001.json
```

The command prints JSON with:

- `ready`
- `errors`
- `warnings`

It exits with a non-zero status when the handoff is not ready.

## Required gates

The handoff fails readiness when:

- batch metadata still contains placeholders
- any required item field is missing
- any required item field still contains `TODO`
- `approvedAt` is still `YYYY-MM-DD`
- `readyForManifest` is not `true`

The handoff warns when optional notes are missing.

## Recommended Phase 7B flow

```bash
node scripts/build-market-asset-intake-handoff-template.mjs US market-assets-2026-07-us-001 2026-07-08 "Design ops" > intake-handoff-us-001.json
# Fill real production metadata in intake-handoff-us-001.json
node scripts/check-market-asset-intake-handoff-readiness.mjs intake-handoff-us-001.json
node scripts/build-market-asset-batch-template.mjs US market-assets-2026-07-us-001 2026-07-08 > manifest-us-001.json
# Transfer only readiness-approved handoff values into manifest-us-001.json
node scripts/review-market-asset-manifest.mjs manifest-us-001.json
```

## Safety notes

- Do not transfer incomplete handoff rows into final manifests.
- Do not mark `readyForManifest` until license, alt text, dimensions, and crop approvals are complete.
- This check does not replace final manifest review, conflict checks, staged promotion preview, active audit, release readiness, or build verification.
