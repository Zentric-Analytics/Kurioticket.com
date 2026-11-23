# Repository memory

Repository memory records durable facts and decisions with enough evidence for a later reviewer to verify them. It is not a substitute for source control, CI, release telemetry, or an approval system.

## Evidence rules

1. Record a claim only after reviewing its cited evidence.
2. Prefer durable repository evidence: commits, pull requests, tests, runbooks, and checked-in reports.
3. Label observations from external systems as observations and include the system, time, environment, and observer when known.
4. Keep implementation, verification, deployment, and approval as separate states. A merge or successful deployment is not approval.
5. Record approval only when an identifiable approver explicitly approved a defined scope and the approval evidence is available. Otherwise use `not-recorded`.
6. Never infer approval from a company name, repository ownership, authorship, review participation, or silence.
7. Supersede incorrect records; do not silently rewrite their history.

## Record lifecycle

- `active`: currently supported by its evidence.
- `superseded`: replaced by a newer record, linked through `supersededBy`.
- `disputed`: evidence conflicts or a reviewer has challenged the claim.

Use [decision-record-template.md](./decision-record-template.md) for prose decisions and [evidence-ledger.json](./evidence-ledger.json) for machine-readable facts. The JSON schema is [evidence-ledger.schema.json](./evidence-ledger.schema.json).

