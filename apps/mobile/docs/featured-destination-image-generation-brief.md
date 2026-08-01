# Featured destination image generation brief

## Gate status

Production integration is intentionally blocked. The current Codex environment exposes an
image-inspection tool but no image-generation tool capable of producing binary assets. In
accordance with the task's image-generation gate, no application code, media manifest, test,
or bundled asset has been changed.

The 25 requested destinations were resolved by exact catalogue name and country before this
brief was prepared. Each result is unique and has a primary airport. Note that the catalogue's
actual spelling and stable ID are **Marrakesh** and `ma-marrakesh`, not the proposed
“Marrakech” / `ma-marrakech`.

## Shared generation specification

Use one image-generation model and one coherent photorealistic editorial treatment for the
entire set. Generate each destination separately; do not derive multiple destinations from a
single output.

```text
Use case: photorealistic-natural
Asset type: mobile Explore featured-destination card
Style/medium: original photorealistic editorial travel illustration, realistic colours and
natural architectural detail
Composition/framing: landscape 4:3; landmark and visual focus inside the centre-safe area;
clear foreground, middle ground, and background; no identifiable person as the main subject
Lighting/mood: bright natural daylight or restrained golden hour; never night
Output target: approximately 1200 x 900 pixels
Constraints: no baked-in text, logos, watermarks, advertisements, visible brand names, large
crowds, extreme HDR, artificial saturation, generic destination imagery, or documentary-photo
claims
```

Generate lossless or high-quality source outputs, visually review them, then export stripped
JPEGs at 1200 × 900 pixels. Prefer a final size below 300 KB; no file may exceed 500 KB without
a documented visual-quality reason. Every accepted file must have a unique binary hash.

## Validated destinations and per-image prompts

All filenames below are required under `apps/mobile/assets/destinations/`. Every eventual media
manifest entry must use `generated-original` provenance.

| # | Destination | Country | Stable ID | Primary airport | Filename | Destination-specific prompt | Accessibility label |
|---:|---|---|---|---|---|---|---|
| 1 | Paris | France | `fr-paris` | CDG | `paris.jpg` | Eiffel Tower and the Seine in daylight, elegant Parisian buildings, clear landmark, no night illumination. | Eiffel Tower and the Seine in Paris |
| 2 | London | United Kingdom | `gb-london` | LHR | `london.jpg` | Tower Bridge and the River Thames, recognisable London skyline, bright overcast or soft daylight. | Tower Bridge and the River Thames in London |
| 3 | New York | United States | `us-new-york` | JFK | `new-york.jpg` | Manhattan skyline viewed from Brooklyn, with the Brooklyn Bridge optionally in the foreground, clean daylight. | Manhattan skyline viewed from Brooklyn in New York |
| 4 | Bali | Indonesia | `id-bali` | DPS | `bali.jpg` | Tegallalang-style rice terraces with an identifiable Balinese temple landscape; explicitly not a beach. | Rice terraces and a temple landscape in Bali |
| 5 | Lagos | Nigeria | `ng-lagos` | LOS | `lagos.jpg` | Lekki-Ikoyi Link Bridge and a recognisable Lagos waterfront skyline, modern city atmosphere, daylight. | Lekki-Ikoyi Link Bridge and the Lagos waterfront skyline |
| 6 | Dubai | United Arab Emirates | `ae-dubai` | DXB | `dubai.jpg` | Burj Khalifa and Downtown Dubai skyline, restrained modern architecture, no commercial signage. | Burj Khalifa and the Downtown Dubai skyline |
| 7 | Tokyo | Japan | `jp-tokyo` | HND | `tokyo.jpg` | Tokyo Tower with the surrounding city skyline, clean atmospheric daylight, no crowded crossing. | Tokyo Tower and the Tokyo skyline |
| 8 | Cape Town | South Africa | `za-cape-town` | CPT | `cape-town.jpg` | Table Mountain with Cape Town and the V&A Waterfront, clear mountain silhouette. | Table Mountain above Cape Town and its waterfront |
| 9 | Rome | Italy | `it-rome` | FCO | `rome.jpg` | Colosseum in warm morning light, uncluttered composition, no dense crowds. | The Colosseum in Rome in warm morning light |
| 10 | Istanbul | Türkiye | `tr-istanbul` | IST | `istanbul.jpg` | Bosphorus waterfront with a recognisable historic Istanbul skyline; domes and minarets accurately placed; do not depict Cappadocia. | The Bosphorus and historic Istanbul skyline |
| 11 | Bangkok | Thailand | `th-bangkok` | BKK | `bangkok.jpg` | Wat Arun beside the Chao Phraya River, daylight, accurate temple silhouette. | Wat Arun beside the Chao Phraya River in Bangkok |
| 12 | Barcelona | Spain | `es-barcelona` | BCN | `barcelona.jpg` | Sagrada Família in daylight, balanced architecture and city context, no crowds as the main subject. | Sagrada Família in Barcelona |
| 13 | Cairo | Egypt | `eg-cairo` | CAI | `cairo.jpg` | Giza pyramids with restrained desert and city context, natural colour, no fantasy composition. | The Giza pyramids near Cairo |
| 14 | Marrakesh | Morocco | `ma-marrakesh` | RAK | `marrakesh.jpg` | Koutoubia Mosque and a recognisable Marrakesh medina rooftop scene, warm natural tones, limited crowd presence. | Koutoubia Mosque and medina rooftops in Marrakesh |
| 15 | Singapore | Singapore | `sg-singapore` | SIN | `singapore.jpg` | Marina Bay skyline with Marina Bay Sands and waterfront, clear daylight. | Marina Bay Sands and the Singapore waterfront skyline |
| 16 | Amsterdam | Netherlands | `nl-amsterdam` | AMS | `amsterdam.jpg` | Canal houses, canal, and bridge; bicycles only as small environmental details; no person as main subject. | Canal houses and a bridge in Amsterdam |
| 17 | Toronto | Canada | `ca-toronto` | YYZ | `toronto.jpg` | CN Tower and Toronto skyline from the waterfront, daylight. | CN Tower and the Toronto waterfront skyline |
| 18 | Los Angeles | United States | `us-los-angeles` | LAX | `los-angeles.jpg` | Los Angeles skyline with a subtle palm-lined foreground and distant hills, no Hollywood text. | Los Angeles skyline with palms and distant hills |
| 19 | Abuja | Nigeria | `ng-abuja` | ABV | `abuja.jpg` | Abuja skyline with the National Mosque in an accurate city setting, daylight. | Abuja National Mosque and the city skyline |
| 20 | Accra | Ghana | `gh-accra` | ACC | `accra.jpg` | Independence Arch at Black Star Square, clean architectural composition, daylight. | Independence Arch at Black Star Square in Accra |
| 21 | Johannesburg | South Africa | `za-johannesburg` | JNB | `johannesburg.jpg` | Johannesburg skyline with Nelson Mandela Bridge, modern urban daylight. | Nelson Mandela Bridge and the Johannesburg skyline |
| 22 | Nairobi | Kenya | `ke-nairobi` | NBO | `nairobi.jpg` | Nairobi skyline with Kenyatta International Convention Centre visible, natural city atmosphere. | Nairobi skyline with the convention centre |
| 23 | Lisbon | Portugal | `pt-lisbon` | LIS | `lisbon.jpg` | Yellow tram in a recognisable Alfama hillside streetscape, no prominent people. | A yellow tram in Lisbon's Alfama streetscape |
| 24 | Sydney | Australia | `au-sydney` | SYD | `sydney.jpg` | Sydney Opera House and Harbour Bridge, bright natural harbour scene. | Sydney Opera House and Harbour Bridge |
| 25 | Rio de Janeiro | Brazil | `br-rio-de-janeiro` | GIG | `rio-de-janeiro.jpg` | Sugarloaf Mountain and Guanabara Bay, recognisable Rio landscape, natural daylight. | Sugarloaf Mountain and Guanabara Bay in Rio de Janeiro |

## Review and acceptance workflow

Inspect all 25 full-resolution outputs individually. Reject and regenerate any output that:

- depicts the wrong destination or only a generic beach, skyline, or landscape;
- distorts a landmark beyond recognition or creates physically impossible architecture;
- contains text, a watermark, branding, advertisements, a dominant person, or a large crowd;
- is too similar to another destination image, excessively dark, or unnaturally saturated; or
- places the landmark outside the centre-safe region or cuts it off in a 4:3 crop.

Record every rejection and its reason. Create a labelled 5 × 5 contact sheet at
`apps/mobile/docs/review/featured-destinations-contact-sheet.jpg`, showing each accepted
thumbnail with destination name, stable ID, and filename. This review-only artifact must not
be imported by application code or copied into the application bundle.

Before integration, verify dimensions, sizes, metadata, filenames, and hashes. Then replace or
regenerate the existing Paris, London, and New York images as needed so all 25 use the same
treatment. Only after all assets pass review should production work begin: add 25 explicit
`generated-original` mappings, update the deterministic featured IDs, implement the horizontal
virtualized list, add the requested tests, and run the full mobile validation suite.
