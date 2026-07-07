# Staged Production Market Image Packs

`stagedProductionMarketImagePacks` is a typed holding area for approved manifest output before those records are promoted into active market image packs.

## Purpose

Use staged packs when a real image batch has passed manifest validation, conflict checks, dry-run conversion, and human review, but the team is not ready to wire the records into live resolver coverage yet.

## Safety behavior

The staged pack list starts empty. Staged records do not become active unless they are intentionally imported into the live market image registry flow.

## Recommended promotion flow

1. Validate the manifest.
2. Run the manifest conflict check.
3. Run the dry-run converter.
4. Review generated registry-ready entries.
5. Add reviewed entries to `stagedProductionMarketImagePacks` if they need another review window.
6. Promote approved entries into the correct active market image pack when ready.
7. Run market image and approval audits.

## Rule

Do not import staged images into active resolver coverage until the product/design owner confirms that the assets should be live on public marketplace surfaces.
