# 2. Repository architecture

## Top-level architecture map

- `src/` — Next.js web app, API routes, auth handlers, travel pages.
- `prisma/` — schema and migrations.
- `apps/mobile/` — Expo app + release scripts.
- `.github/workflows/` — validation, preview delivery orchestration, production-gated workflows.
- `apps/mobile/release-baselines/` — verified baseline and evidence manifests.
- `render.yaml` — hosted web/corn service configuration.

## Shared boundaries

- **Shared backend**: web and mobile consume the same API/contracts and DB schema.
- **Separate build surfaces**: web and mobile have separate release and validation stacks.
- **Environment routing** handled by `APP_VARIANT` + `EXPO_PUBLIC_API_BASE_URL` in mobile config (`apps/mobile/app.config.ts` + `release-policy.json`).

## Major dependencies

| Area | Responsibility | Dependency type |
|---|---|---|
| `apps/mobile` | App UI, config, release scripts | Imports app-level environment schema and shared types |
| `src/app/api` | Search, auth, saved-and-recent, support flows | Backing services for both web and mobile clients |
| `prisma/schema.prisma` | Data model, auth/session + travel entities | Required by web API |
| `apps/mobile/scripts/*.mjs` | Release classification, version/cap, baselines | Called by workflows |
| `apps/mobile/release-baselines` | Identity/baseline evidence | Required by production and replay safety |

## Architecture risk signals

- Mobile and web share critical environment-driven behavior; incorrect env selection causes cross-environment misbehavior.
- Legacy Android identity remnants (`com.kurioticket.mobile`) exist in history/config artifacts and must remain isolated by strict identity checks.
