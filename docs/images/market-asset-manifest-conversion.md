# Market Asset Manifest Conversion

The manifest converter turns a validated market asset manifest into registry-ready market image entries.

## Purpose

The manifest validator answers: is this image batch complete enough to accept?

The manifest converter answers: what would these accepted assets look like as `MarketImageRegistryEntry` records?

## Conversion rules

For each manifest entry, the converter maps:

- `publicImagePath` to registry `url`.
- `source` to registry `source`.
- `license`, `licenseNotes`, `vendor`, `collection`, and `stockFileId` to registry source metadata.
- `dimensions`, `cropNotes`, and `focalPoint` to crop metadata.
- `desktopApproved` and `mobileApproved` to registry crop approvals.
- `reviewer`, `approvedAt`, `batchId`, `owner`, and `createdAt` into registry notes.

Homepage hero entries become:

- `launchCritical: true`
- `productionPriority: "p0-launch-critical"`

Other public marketing entries become:

- `launchCritical: false`
- `productionPriority: "p1-public-important"`

All converted premium or owned manifest entries become:

- `status: "premium-approved"`
- `premiumReplacementRequired: false`

Provider entries are reserved for provider-backed hotel imagery and become:

- `status: "provider-real"`
- `contentRole: "provider-real"`

## Safety rule

The converter does not write to the live registry. It only returns registry-ready records so reviewers can inspect the generated entries before adding them to a market image pack.
