# Kurioticket global image registry

This directory is the Phase 1 foundation for production image governance across Kurioticket.

## Files

- `imageTypes.ts` defines the supported image products, usages, sources, statuses, and the `RegisteredImage` shape.
- `imageRegistry.ts` is the starter registry for current representative production surfaces. It intentionally preserves current rendered output and does not migrate every hard-coded URL yet.
- `imageRegistryValidation.ts` provides validation helpers used by the audit script and future tests.

## Registry rules

Every production image should eventually have one registry entry with:

- a stable `id`
- the rendered or provider-pattern `url`
- meaningful `alt` text
- product and usage classification
- source and approval status
- source page, creator, license, and license notes where applicable
- surfaces and intended slot documentation
- desktop and mobile crop approval flags
- launch-critical classification

Do not add duplicate exact URLs or duplicate source identities. If the same underlying image is used in multiple sizes or surfaces, prefer one registry entry with multiple `usage` values and document derivatives in `pageSurfaces`/`notes` until Phase 2 migrates call sites.

## Status intent

- `provider-real`: Property/provider media returned by a contracted provider, such as Hotelbeds GIATA images. These are not generic marketing stock.
- `premium-approved`: Paid or licensed marketing imagery approved for launch-critical surfaces.
- `free-approved`: Free-source imagery with documented source/license notes. Acceptable during Phase 1, but not the preferred long-term state for premium surfaces.
- `temporary` / `replace-before-launch` / `blocked`: Governance states for assets that must not be launch-critical.

Run `npm run audit:images` before PRs that add, remove, or move image URLs.
