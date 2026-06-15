# Kurioticket global image system

This directory contains the registry and Phase 2 inventory used to govern production imagery across Kurioticket without changing rendered UI output.

## Files

- `imageTypes.ts` defines products, usages, sources, statuses, content roles, production priorities, registry entries, and inventory entries.
- `imageRegistry.ts` contains approved or known reusable production entries plus provider URL patterns.
- `imageInventory.ts` classifies discovered hard-coded image URLs that are not migrated to registry imports yet.
- `imagePurchasePlan.ts` derives Phase 3 premium purchase categories, the structured first-60 shopping list, batch counts, product/usage breakdowns, and the top-impact purchase slice.
- `imageRegistryValidation.ts` validates the approved registry. Inventory is intentionally allowed to document temporary and replace-before-launch debt.

## How to classify images

For every discovered URL, capture:

- `product`: the product area most responsible for the slot.
- `usage`: the concrete UI usage, such as `flight-inspiration-card`, `hotel-result-fallback`, or `recent-search-card`.
- `source`: provider, stock source, owned source, or temporary source.
- `status`: current governance state.
- `launchCritical`: whether the slot must be production-ready for global launch.
- `pageSurfaces`: human-readable surfaces where the URL is used.
- `intendedSlot`: the job the image performs in the UI.
- `contentRole`: `provider-real`, `fallback-only`, `marketing`, `test-only`, `recent-search-derived`, or `replacement-needed`.
- `productionPriority`: `p0-launch-critical`, `p1-public-important`, `p2-supporting`, or `p3-internal-or-test`.
- `premiumReplacementRequired`: whether Phase 3 should source a paid/owned replacement before launch.

## Registry vs. inventory

Use `imageRegistry.ts` for approved assets or stable provider patterns that can be reused safely. Use `imageInventory.ts` for hard-coded URLs that need classification before a safe UI migration. Adding inventory metadata must not swap image URLs, change layouts, or alter search/provider behavior.

## Premium replacement guidance

Set `premiumReplacementRequired: true` for launch-critical or highly visible public marketing/fallback slots where free stock is not the desired launch standard. Homepage discovery, market homepage destinations, hotel fallback pools, destination index cards, deals cards, and flight result inspiration cards are current examples.

Do not require premium replacement for provider-real assets, provider logo templates, or test-only fixtures. Recent-search-derived thumbnails are normally P2 unless they become paid-traffic or launch-critical surfaces.

## Duplicate handling

The audit reports both exact URL duplicates and source identity duplicates. Source identity ignores transformation/query parameters so the same Unsplash/Pexels photo can be recognized across different sizes. Inventory may document hard-coded duplicates, but Phase 3 purchasing should consolidate duplicate visual identities into one premium replacement family where possible.

## Provider and fallback rules

Provider-real images are supplied for a returned entity and must not be reused as generic marketing. Hotel fallback images are generic only; they must not imply that a hotel has the pictured pool, room, exterior, view, amenity, rating, price, or availability. If provider-real hotel imagery exists, use it before fallback imagery.

## Phase 3 shopping and approval documents

- `docs/premium-image-shopping-list-phase-3.md` is the human buying guide for the first 60 premium images, grouped into Batch A, Batch B, and Batch C.
- `docs/image-approval-workflow.md` defines purchase/download naming, license record storage, crop approval, rejection handling, and Phase 4 replacement PR preparation.

## Audit workflow

Run `npm run audit:images` before PRs that add, remove, or move image URLs. The audit summarizes discovered URLs, registered/inventoried URLs, remaining unregistered URLs, launch-critical temporary/replace-before-launch/blocked counts, premium replacement candidates, provider-real/fallback-only counts, duplicate summaries, top unregistered files, and suggested Phase 3 purchase categories.
