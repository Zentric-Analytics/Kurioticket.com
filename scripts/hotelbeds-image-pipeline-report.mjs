#!/usr/bin/env node
import { createHash } from "node:crypto";

const destinationCode = "LON";
const destinationName = "London";
const baseUrl = process.env.HOTELBEDS_BASE_URL || "https://api.test.hotelbeds.com";
const apiKey = process.env.HOTELBEDS_API_KEY;
const secret = process.env.HOTELBEDS_SECRET;

if (!apiKey || !secret) {
  console.error("Missing HOTELBEDS_API_KEY or HOTELBEDS_SECRET; cannot capture a live Hotelbeds response.");
  process.exit(1);
}

const checkIn = process.env.HOTELBEDS_DEBUG_CHECK_IN || nextDate(28);
const checkOut = process.env.HOTELBEDS_DEBUG_CHECK_OUT || nextDate(31);
const adults = Number(process.env.HOTELBEDS_DEBUG_ADULTS || 2);
const rooms = Number(process.env.HOTELBEDS_DEBUG_ROOMS || 1);

const availabilityPayload = {
  stay: { checkIn, checkOut },
  occupancies: [{ rooms, adults, children: 0 }],
  destination: { code: destinationCode },
};

const availability = await fetchHotelbedsJson(`${baseUrl}/hotel-api/1.0/hotels`, {
  method: "POST",
  headers: { ...hotelbedsHeaders(), "Content-Type": "application/json" },
  body: JSON.stringify(availabilityPayload),
});

const hotels = (availability.hotels?.hotels || []).slice(0, 10);
const rows = [];

for (const hotel of hotels) {
  const hotelCode = String(hotel.code || "");
  const rawAvailabilityImageFields = findImageLikeFields(hotel);
  const contentImage = hotelCode ? await getContentImage(hotelCode) : null;
  const normalizedImageUrl = contentImage?.imageUrl || "<fallback from normalizeHotelImageUrl(undefined, ...)>";

  rows.push({
    hotelName: hotel.name,
    rawSupplierImageField: rawAvailabilityImageFields.length
      ? rawAvailabilityImageFields.map((field) => `${field.path}=${field.value}`).join("; ")
      : contentImage?.rawImageJsonPath || "<none in availability response>",
    normalizedImageUrl,
    finalRenderedImageUrl: normalizedImageUrl,
  });
}

console.log(`Hotelbeds London image pipeline report (${destinationName}, ${checkIn} → ${checkOut})`);
console.log(JSON.stringify({ availabilityPayload, first10RawHotels: hotels }, null, 2));
console.table(rows);

async function getContentImage(hotelCode) {
  const params = new URLSearchParams({ language: "ENG", useSecondaryLanguage: "True" });
  const details = await fetchHotelbedsJson(
    `${baseUrl}/hotel-content-api/1.0/hotels/${encodeURIComponent(hotelCode)}/details?${params.toString()}`,
    { headers: hotelbedsHeaders() },
  );
  const selected = selectHotelbedsContentImage(details.hotel?.images || []);
  return selected
    ? {
        rawImageJsonPath: "contentDetailsResponse.hotel.images[*].path",
        imageUrl: `https://photos.hotelbeds.com/giata/bigger/${selected.path}`,
      }
    : null;
}

function selectHotelbedsContentImage(images) {
  return images
    .filter((image) => typeof image.path === "string" && image.path.trim())
    .sort((a, b) => imageRank(a) - imageRank(b))[0];
}

function imageRank(image) {
  const visualOrder = numericOrder(image.visualOrder);
  const order = numericOrder(image.order);
  const typeRank = image.type?.code === "GEN" ? 0 : image.type?.code === "HAB" ? 2 : 1;
  return (visualOrder === 0 ? -10000 : visualOrder * 100) + typeRank * 10 + order;
}

function numericOrder(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 9999;
}

function findImageLikeFields(value, path = "hotel", matches = []) {
  if (!value || typeof value !== "object") return matches;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (/images?|media|photos?|thumbnail|gallery/i.test(key)) {
      matches.push({ path: childPath, value: JSON.stringify(child).slice(0, 240) });
    }
    findImageLikeFields(child, childPath, matches);
  }

  return matches;
}

async function fetchHotelbedsJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 500)}`);
  }
  return response.json();
}

function hotelbedsHeaders() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return {
    "Api-key": apiKey,
    "X-Signature": createHash("sha256").update(`${apiKey}${secret}${timestamp}`).digest("hex"),
    Accept: "application/json",
  };
}

function nextDate(offsetDays) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
