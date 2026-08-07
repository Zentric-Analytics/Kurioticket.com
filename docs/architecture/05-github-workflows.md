# 5. GitHub workflows

## Current workflow files (5 total)

| File | Role | Trigger | External delivery |
|---|---|---|---|
| `android-production-delivery.yml` | Owner-gated Android Production delivery | `workflow_dispatch` | Production only |
| `migration-validation.yml` | Conclusive Prisma/migration safety gate | PR, push, manual | None |
| `mobile-production-update.yml` | Production policy/readiness gate | main push, manual | None |
| `pr-required-gates.yml` | Always-scheduled PR gateway | PR | None |
| `security.yml` | Repository security scanning | PR, push | None |

GitHub Actions performs validation and Production governance only. It does not own Preview web, OTA, native build, or TestFlight delivery. Preview delivery belongs exclusively to the independent Render worker documented in [`preview-release-service.md`](preview-release-service.md).

The former Preview delivery workflows were removed during cutover so an Actions outage, duplicate webhook, or stale environment approval cannot create a second delivery owner.
