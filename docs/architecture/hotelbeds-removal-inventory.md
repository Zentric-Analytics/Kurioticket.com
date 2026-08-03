# Hotelbeds removal inventory

Inventory completed before implementation on `refactor/static-hotel-pipeline`.

## Delete

- Active runtime: `src/services/travel/providers/hotelbedsProvider.ts`, Hotelbeds branches in `normalizeHotelResult.ts`, and the Hotelbeds call in `hotelAggregator.ts`.
- Configuration: Hotelbeds keys in `.env.example`, `render.yaml`, environment helpers, and admin diagnostics.
- Images/tooling: Hotelbeds image allowlist, registry record, audit host pattern, `scripts/hotelbeds-image-pipeline-report.mjs`, and its investigation report.
- Tests and documentation: provider-specific assertions, Hotelbeds-only architecture/launch guidance, and provider-specific fixtures or copy.

## Retain and adapt

- Public `/api/hotels/search` and `/api/hotels/details` routes.
- Generic normalized/public hotel result types, cache, validation, cards, filters, saved-hotel behavior, analytics, and scoring.
- Generic provider-log database tables and historical migrations; they are reusable and require no destructive migration.
- Web and mobile API clients, which already consume the shared response contract.

## Database finding

No Hotelbeds-specific Prisma field or migration exists. Generic provider logging and cached selection data remain reusable. No schema migration is required.

