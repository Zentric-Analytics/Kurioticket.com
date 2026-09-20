import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const details = readFileSync(
  new URL("./hotelDetails/StandaloneHotelDetails.tsx", import.meta.url),
  "utf8",
);
const gallery = readFileSync(
  new URL("./hotelDetails/HotelDetailsGallery.tsx", import.meta.url),
  "utf8",
);
const nav = readFileSync(
  new URL("./hotelDetails/HotelDetailsSectionNav.tsx", import.meta.url),
  "utf8",
);
const client = readFileSync(
  new URL("./HotelDetailsClient.tsx", import.meta.url),
  "utf8",
);

test("standalone mobile Hotel details follow hero, identity, tabs, then content", () => {
  const hero = details.indexOf("data-mobile-hotel-hero-shell");
  const identity = details.indexOf("data-mobile-property-header");
  const tabs = details.indexOf("<HotelDetailsSectionNav");
  const panel = details.indexOf('className="order-4"');
  assert.ok(hero >= 0 && hero < identity);
  assert.ok(identity < tabs);
  assert.ok(tabs < panel);
  assert.match(details, /order-1 lg:order-2[\s\S]*?data-mobile-hotel-hero-shell/);
  assert.match(details, /data-mobile-property-header[\s\S]*?order-2|order-2[\s\S]*?data-mobile-property-header/);
  assert.match(nav, /order-3 sticky top-0/);
});

test("mobile Hotel hero owns Back, Save, and Share while desktop keeps its text Back link", () => {
  assert.match(details, /data-mobile-hotel-hero-actions/);
  assert.match(details, /aria-label="Back to hotel results"/);
  assert.match(details, /aria-pressed=\{props\.isSaved\}/);
  assert.match(details, /<Heart[\s\S]*?<Share2/);
  assert.match(client, /className="hidden lg:block lg:px-0"/);
  assert.match(client, /data-standalone-hotel-back-link/);
});

test("standalone mobile Hotel gallery is full bleed without inline thumbnails", () => {
  assert.match(gallery, /layout === "mosaic"[\s\S]*?aspect-\[6\/5\][\s\S]*?rounded-none/);
  assert.match(gallery, /className="lg:hidden" data-hotel-mobile-gallery-unit/);
  assert.doesNotMatch(gallery, /data-hotel-mobile-thumbnail-strip|mobileThumbnailIndices|mobileRemainingCount|mx-3 lg:hidden/);
  assert.match(gallery, /activePosition} \/ {usableIndices\.length}/);
  assert.match(gallery, /HotelDetailsGalleryDialog/);
});

test("mobile Hotel detail navigation uses a compact web-native four-tab row", () => {
  assert.match(nav, /mobileLabel: "Rates"/);
  assert.match(nav, /grid-cols-4/);
  assert.match(nav, /lg:grid-cols-\[minmax\(0,1\.65fr\)_repeat\(3,minmax\(0,1fr\)\)\]/);
  for (const id of ["compare", "about", "location", "reviews"]) {
    assert.match(nav, new RegExp(`id: "${id}"`));
  }
});
