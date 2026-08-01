# Shared travel data

`airports.ts` is the single maintained airport-record source for the website and
mobile application. It intentionally contains only TypeScript types and committed
literal data: no imports, environment reads, localization, or platform helpers.

To update coverage, edit the normalized records in `airports.ts`, preserving unique
IATA codes and literal canonical English country names, then run the root airport
tests and the complete mobile validation/export commands. Data generation, if used
for a future bulk refresh, is a developer-only step; generated records must be
reviewed and committed rather than generated during builds or application startup.
