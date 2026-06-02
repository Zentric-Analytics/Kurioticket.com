# Hotelbeds hotel image pipeline investigation

Date: 2026-06-02

## Scope

This report traces the Hotelbeds hotel image path end-to-end for a London hotel search: Hotelbeds availability response → optional Hotelbeds Content API image lookup → normalization → `HotelCard`. No UI layout, styling, or card dimensions were changed.

## Raw London availability capture

The local container does not include Hotelbeds credentials or an enabled Hotelbeds provider, so a live London first-10 raw response could not be captured here. The configured environment has no `HOTEL_PROVIDER_PRIMARY`, `HOTELBEDS_API_KEY`, or `HOTELBEDS_SECRET`, so the Hotelbeds client would be skipped before making a supplier request. A credentialed capture utility now exists at `scripts/hotelbeds-image-pipeline-report.mjs`; it prints the first 10 raw London availability hotel objects, recursively reports any availability image-like fields (`images`, `image`, `media`, `photos`, `thumbnail`, `gallery`), looks up Content API images, and prints the Hotel Name → Raw Supplier Image Field → Normalized Image URL → Final Rendered Image URL table.

What the current code sends for London when credentials are present:

```json
{
  "stay": {
    "checkIn": "<search.checkIn>",
    "checkOut": "<search.checkOut>"
  },
  "occupancies": [
    {
      "rooms": "<search.rooms>",
      "adults": "<search.guests>",
      "children": 0
    }
  ],
  "destination": { "code": "LON" }
}
```

The availability endpoint is:

```text
POST <HOTELBEDS_BASE_URL>/hotel-api/1.0/hotels
```

The code reads availability hotels from:

```text
availabilityResponse.hotels.hotels[]
```

## Availability-response image-field verification

The Hotelbeds availability normalizer currently expects dynamic availability fields only: `code`, `name`, `categoryName`, `destinationName`, `coordinates`, `minRate`, `maxRate`, `currency`, and `rooms`. It does not consume any `images`, `image`, `media`, `photos`, `thumbnail`, `gallery`, or similar field from the availability object.

The previous image-loss point was exact: `normalizeHotelbedsHotel(...)` always passed `imageUrl: undefined` into `buildHotel(...)`, so every Hotelbeds result fell through to the generic fallback image selector before reaching `HotelCard`.

## Required Hotelbeds endpoint for real images

Hotelbeds separates dynamic booking/availability data from static hotel content. Their Content API documentation states that static information includes hotel pictures, while the Booking API keeps responses small by returning dynamic booking data. The Content API is the required source for real hotel images.

Hotelbeds documents that `hotels` / `hoteldetails` Content API operations return an `images` tag, and each image includes a `path`. Those paths are not full URLs; they must be prefixed with a Hotelbeds photo host. The code now uses the 800px image host form:

```text
https://photos.hotelbeds.com/giata/bigger/{hotel.images[*].path}
```

Content lookup endpoint now used per returned hotel code:

```text
GET <HOTELBEDS_BASE_URL>/hotel-content-api/1.0/hotels/{hotelCode}/details?language=ENG&useSecondaryLanguage=True
```

Raw JSON path for hotel-specific image content:

```text
contentDetailsResponse.hotel.images[*].path
```

Selected image priority:

1. Image with `visualOrder = 0` when present, because Hotelbeds marks that as the principal/main image.
2. Otherwise, lower `visualOrder` / `order` values.
3. General hotel images (`type.code = "GEN"`) are preferred over other image types at the same order level.
4. Room images (`type.code = "HAB"`) are de-prioritized for search cards unless they are the best ordered image available.

## Where images were lost and how the pipeline is restored

| Pipeline step | Previous behavior | Current behavior |
| --- | --- | --- |
| Hotelbeds availability client | Called `POST /hotel-api/1.0/hotels` and mapped raw hotels directly into normalization. | Calls availability, then collects returned hotel `code` values and attempts Content API image hydration for those codes. |
| Hotelbeds Content API | Not used. | Calls `GET /hotel-content-api/1.0/hotels/{hotelCode}/details` and reads `hotel.images[*].path`. |
| Image URL construction | Not applicable. | Converts the selected content image path to `https://photos.hotelbeds.com/giata/bigger/{path}`. |
| Normalization | `normalizeHotelbedsHotel(...)` passed `imageUrl: undefined`. | `normalizeHotelbedsHotel(...)` passes the hydrated Hotelbeds image URL into `buildHotel(...)`. |
| `buildHotel(...)` | Missing Hotelbeds image fell back to generic Unsplash. | Real Hotelbeds HTTPS image URL survives `normalizeHotelImageUrl(...)`; fallback is used only if content image hydration is unavailable. |
| `HotelCard` | Rendered whatever `hotel.imageUrl` contained, usually the same destination fallback URL. | Still renders `hotel.imageUrl`; with hydrated Hotelbeds content, that URL is hotel-specific. |

## London first-10 report format

Because the credentialed supplier call could not run in this container, the exact hotel names from Hotelbeds London availability are not available here. With credentials present, the first-10 report should use this mapping:

| Hotel Name | Raw Supplier Image Field | Normalized Image URL | Final Rendered Image URL |
| --- | --- | --- | --- |
| `<availability.hotels.hotels[0].name>` | `contentDetailsResponse.hotel.images[*].path` | `https://photos.hotelbeds.com/giata/bigger/<selected path>` | Same as normalized `hotel.imageUrl` passed into `HotelCard` |
| `<availability.hotels.hotels[1].name>` | `contentDetailsResponse.hotel.images[*].path` | `https://photos.hotelbeds.com/giata/bigger/<selected path>` | Same as normalized `hotel.imageUrl` passed into `HotelCard` |
| `<availability.hotels.hotels[2].name>` | `contentDetailsResponse.hotel.images[*].path` | `https://photos.hotelbeds.com/giata/bigger/<selected path>` | Same as normalized `hotel.imageUrl` passed into `HotelCard` |
| `<availability.hotels.hotels[3].name>` | `contentDetailsResponse.hotel.images[*].path` | `https://photos.hotelbeds.com/giata/bigger/<selected path>` | Same as normalized `hotel.imageUrl` passed into `HotelCard` |
| `<availability.hotels.hotels[4].name>` | `contentDetailsResponse.hotel.images[*].path` | `https://photos.hotelbeds.com/giata/bigger/<selected path>` | Same as normalized `hotel.imageUrl` passed into `HotelCard` |
| `<availability.hotels.hotels[5].name>` | `contentDetailsResponse.hotel.images[*].path` | `https://photos.hotelbeds.com/giata/bigger/<selected path>` | Same as normalized `hotel.imageUrl` passed into `HotelCard` |
| `<availability.hotels.hotels[6].name>` | `contentDetailsResponse.hotel.images[*].path` | `https://photos.hotelbeds.com/giata/bigger/<selected path>` | Same as normalized `hotel.imageUrl` passed into `HotelCard` |
| `<availability.hotels.hotels[7].name>` | `contentDetailsResponse.hotel.images[*].path` | `https://photos.hotelbeds.com/giata/bigger/<selected path>` | Same as normalized `hotel.imageUrl` passed into `HotelCard` |
| `<availability.hotels.hotels[8].name>` | `contentDetailsResponse.hotel.images[*].path` | `https://photos.hotelbeds.com/giata/bigger/<selected path>` | Same as normalized `hotel.imageUrl` passed into `HotelCard` |
| `<availability.hotels.hotels[9].name>` | `contentDetailsResponse.hotel.images[*].path` | `https://photos.hotelbeds.com/giata/bigger/<selected path>` | Same as normalized `hotel.imageUrl` passed into `HotelCard` |

If a returned hotel has no Content API image, or the Content API lookup fails, the raw supplier image field is absent and the normalized/final URL falls back to `normalizeHotelImageUrl(undefined, ...)`.

## Final trace into `HotelCard`

`HotelResultsClient` stores the public hotel results from `/api/hotels/search` unchanged and renders `<HotelCard key={hotel.id} hotel={hotel} />`. `HotelCard` then uses `hotel.imageUrl` directly as the Next Image `src`. Therefore, once the Hotelbeds content image URL is present in the normalized hotel result, it is also the final rendered image URL.

## Implementation notes

- UI and card dimensions were not changed.
- The Next image allowlist now includes `photos.hotelbeds.com/giata/**`, which is required for `HotelCard` to render Hotelbeds photo URLs through `next/image`.
- Content image failures are non-fatal: the hotel search still returns availability, and only that hotel's image falls back.
- Content image lookups are cached in process by hotel code to reduce repeated Content API calls during the server process lifetime.
- Run `HOTELBEDS_API_KEY=... HOTELBEDS_SECRET=... HOTELBEDS_BASE_URL=... node scripts/hotelbeds-image-pipeline-report.mjs` to capture and print the live London first-10 raw JSON and image mapping table.

## External documentation checked

- Hotelbeds Content API overview: https://developer.hotelbeds.com/documentation/hotels/content-api/
- Hotelbeds Content API usage guidance: https://developer.hotelbeds.com/documentation/hotels/content-api/how-use-content-api/
- Hotelbeds image URL/path guidance: https://developer.hotelbeds.com/documentation/hotels/content-api/photos-images/
- Next.js Image component docs: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`
