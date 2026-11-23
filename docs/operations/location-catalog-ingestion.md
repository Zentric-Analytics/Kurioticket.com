# Location catalogue ingestion runbook

This pipeline prepares a review artifact; it never changes the deployed Kurioticket catalogues. Hotel and car results remain static, and an airport record never proves flight inventory or availability.

## Approved source and boundaries

- Airport seed: `https://ourairports.com/data/airports.csv`, published by OurAirports as Public Domain. Keep voluntary attribution, retrieval time, checksum and source URL in every snapshot manifest.
- Do not use public Nominatim for autocomplete. Do not scrape IATA or ICAO publications, start a paid subscription, or redistribute licensed datasets without separate approval.
- Review monthly. A closure, IATA reassignment or material coordinate/name correction can trigger an out-of-cycle review.

## Snapshot and dry run

1. Download into ignored ephemeral storage, or provide an operator-supplied local CSV. Compute SHA-256 without modifying the file.
2. Copy `config/location-catalog/ourairports-source.json` to a small snapshot manifest, set `status` to `snapshot`, give it an immutable version, ISO `retrievedAt`, and lowercase SHA-256. Commit only that reviewed manifest if appropriate; never commit the raw CSV.
3. Run:

   `npm run catalog:airports:review -- --manifest manifests/ourairports-YYYY-MM-DD.json --input data/location-catalog/raw/airports.csv --dry-run`

   An explicit download is also supported with `--url https://ourairports.com/data/airports.csv`; no other URL is accepted.
4. Review missing, changed, ambiguous and rejected records. A non-dry run writes the full candidate artifact beneath ignored `.artifacts/location-catalog/` unless `--out-dir` is provided.

## Curation policy

- Admit large, medium or small airports only when `scheduled_service=yes`, IATA is exactly three alphanumeric characters, optional ICAO/ident is four alphanumeric characters, country is ISO alpha-2, coordinates are in range, and city/name are present.
- Reject closed, heliport, seaplane, balloon-port and other unsupported types; reject invalid codes/coordinates and non-scheduled records.
- Duplicate IATA codes are ambiguous and excluded from candidates until manually resolved against authoritative evidence.
- Stable IDs are `airport:<IATA>`. Keep IATA as the submitted URL value. ICAO/local/GPS codes may become aliases but never silently replace identity.
- City/metro grouping is a later curated relationship, not inferred from similar names. Static coverage remains `reference-only` for flights/cars/packages and `none` for hotels until separately approved.

## Approval and rollback

Candidate output requires human review and a separate small catalogue-change PR. Compare names, city, country and coordinates; never bulk-copy the raw file into `src/shared/airports`.

Retain at least the active manifest and three prior checksum-addressed snapshot manifests plus their external/CI artifacts. Rollback selects the newest prior approved manifest/artifact, reruns the same report, and reverts the separate catalogue-change commit. If download, checksum, validation or review fails, deploy nothing and continue serving the last-known-good curated catalogue.
