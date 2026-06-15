# Premium image approval workflow

This workflow governs Phase 3 purchases and Phase 4 replacement PRs for Kurioticket premium imagery. It keeps purchasing, licensing, crop approval, and implementation separate so the production UI does not change until an approved replacement PR is opened.

## 1. Purchase and download naming convention

Use one folder per purchased asset family:

```text
/image-licenses/phase-3/<purchase-id>/
  source-original/<purchase-id>__vendor-asset-id__original.ext
  crops/<purchase-id>__desktop-16x9.ext
  crops/<purchase-id>__desktop-3x2.ext
  crops/<purchase-id>__mobile-4x5.ext
  crops/<purchase-id>__square-1x1.ext
  license/<purchase-id>__receipt.pdf
  license/<purchase-id>__license.txt
  approval/<purchase-id>__approval.md
```

Filename pattern:

```text
<purchase-id>__<vendor>__<vendor-asset-id>__<short-slug>__<yyyy-mm-dd>.<ext>
```

Example:

```text
phase-3-007-home-destination-new-york__istock__123456789__nyc-skyline-card__2026-06-11.jpg
```

## 2. Source and license records

Store purchase records outside runtime source code until Phase 4 implementation. Each approval file should capture:

- Phase 3 purchase id.
- Vendor and vendor asset id.
- Source page URL.
- Creator/photographer when available.
- Purchaser/account owner.
- Purchase date.
- License type and allowed channels.
- Receipt/invoice file path.
- Territory/geography rights.
- Expiration or renewal date, if any.
- Exclusivity restrictions, if any.
- Model/property release status, if available.
- Approved product(s), usage(s), and target surface(s).

## 3. Marking an image as purchased

1. Add the original and license files under the purchase-id folder.
2. Create `approval/<purchase-id>__approval.md` with the source/license fields above.
3. Change the purchase tracker status from `shopping-needed` to `purchased-pending-crops` in the owner-maintained approval record. Do not change runtime URLs in this step.
4. Record the selected vendor asset id beside the matching `phase3FirstSixtyPurchaseList` id in the owner purchase tracker.

## 4. Desktop and mobile crop approval

For each purchased image, export and review the ratios listed in `recommendedAspectRatios`.

Desktop approval requires:

- 16:9 crop review at laptop and large desktop widths.
- Optional 21:9 or 3:2 crop review where the purchase entry asks for it.
- Overlay readability check for any card, hero, or search module copy.
- Confirmation that landmarks, vehicles, rooms, skylines, or destination cues are not cut awkwardly.

Mobile approval requires:

- 4:5 or square crop review at narrow and large mobile widths.
- Confirmation that faces, vehicles, destination cues, and landmarks remain legible.
- Confirmation that the image still avoids provider, hotel-property, fare, price, rating, or availability claims.

Mark the approval record with:

```text
desktopCropApproval: approved | rejected | needs-new-crop
mobileCropApproval: approved | rejected | needs-new-crop
approvedBy: <name>
approvedDate: <yyyy-mm-dd>
```

## 5. Rejecting an image

Reject a purchased candidate if it has any of these issues:

- License does not cover commercial web/mobile-web or intended marketing channels.
- Vendor page lacks adequate release or usage clarity for the surface.
- Image implies a specific hotel property, room, amenity, rental car, airline, fare, price, rating, or availability that Kurioticket cannot verify.
- Image has visible third-party brand marks, readable license plates, fake booking screens, or misleading UI/pricing text.
- Mobile or desktop crop removes the primary cue or creates an awkward/low-trust composition.
- Landmark, vehicle, skyline, or property details appear AI-generated, distorted, or materially inaccurate.

When rejected:

1. Keep the license/receipt record for audit history.
2. Mark `approvalStatus: rejected` in the owner approval tracker.
3. Add a concise rejection reason and screenshot/crop notes.
4. Do not add the asset to `imageRegistry.ts` and do not replace runtime URLs.
5. Return the matching purchase id to the shopping queue.

## 6. Preparing Phase 4 replacement PRs

Each Phase 4 replacement PR should be narrow and auditable:

1. Select a small set of approved purchase ids from one product or surface.
2. Add approved image metadata to `src/data/images/imageRegistry.ts` with source, creator, license, crop, desktop, mobile, launch-critical, and usage metadata.
3. Replace only the approved target URLs for that PR.
4. Do not change layout, search behavior, provider behavior, pricing, availability, redirects, auth, dashboard, or admin logic.
5. Run `npm run audit:images`, `npm run build`, and `npm run lint`.
6. Include before/after staging screenshots for every changed surface.

## 7. Required staging screenshot checks

Capture screenshots for each changed surface at minimum:

- Desktop laptop width.
- Desktop large width.
- Narrow mobile width.
- Large mobile width.

Screenshot review must confirm:

- No UI redesign occurred unless explicitly scoped in a later PR.
- Text overlays remain readable.
- Important landmarks, vehicles, rooms, skylines, or destination cues are not cut off.
- Hotel fallback images remain generic and do not imply exact property amenities.
- Provider-real hotel imagery still takes precedence over generic fallback imagery when available.
- Image loading does not introduce layout shift.
- Alt text remains meaningful and not keyword-stuffed.
