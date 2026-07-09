# Market Asset Handoff Transfer Completion Template

Use this command during Phase 7B to generate a starter completion overlay for a handoff transfer checklist.

The template is read-only. It does not mutate handoffs, manifests, staged packs, active packs, or resolver behavior.

## Command

```bash
node scripts/build-market-asset-handoff-transfer-completion-template.mjs <checklist.json> [completed]
```

Example incomplete overlay:

```bash
node scripts/build-market-asset-handoff-transfer-checklist.mjs intake-handoff-us-001.json > transfer-checklist-us-001.json
node scripts/build-market-asset-handoff-transfer-completion-template.mjs transfer-checklist-us-001.json > transfer-completions-us-001.json
```

Example precompleted overlay for local testing only:

```bash
node scripts/build-market-asset-handoff-transfer-completion-template.mjs transfer-checklist-us-001.json true
```

## Output

The command prints one completion row per transfer checklist item:

```json
[
  {
    "id": "market-assets-YYYY-MM-DD-us-001-homepage-hero-001:source-path",
    "completed": false
  }
]
```

## Recommended Phase 7B flow

```bash
node scripts/check-market-asset-intake-handoff-readiness.mjs intake-handoff-us-001.json
node scripts/build-market-asset-handoff-transfer-checklist.mjs intake-handoff-us-001.json > transfer-checklist-us-001.json
node scripts/build-market-asset-handoff-transfer-completion-template.mjs transfer-checklist-us-001.json > transfer-completions-us-001.json
# Mark completed rows manually as each manifest transfer task is finished
node scripts/check-market-asset-handoff-transfer-readiness.mjs transfer-checklist-us-001.json transfer-completions-us-001.json
```

## Safety notes

- Keep generated rows incomplete by default.
- Mark rows complete only after the corresponding manifest value is transferred and checked.
- This overlay does not replace final manifest review, conflict checks, staged promotion preview, active audit, release readiness, or build verification.
