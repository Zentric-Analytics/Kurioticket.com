# 15. Security and trust boundaries

## Core controls

- Immutable SHA enforcement for mutable actions.
- Variant/runtime/channel/package checks in release scripts.
- Version and identity validation on build results.
- Strict schema parsing and fail-closed behavior.
- Environment-scoped approvals for high-risk workflows.

## Critical boundaries

- Source trust: `origin/main`/`origin/dev` ancestry checks where relevant.
- Dispatcher inputs are validated and not accepted as sole source truth.
- Artifact and evidence are written as non-secret, immutable JSON.

## Known fragile points

- Some checks depend on external EAS/Play/ASC responses.
- Path filter logic in checks must stay conservative for future file changes.
