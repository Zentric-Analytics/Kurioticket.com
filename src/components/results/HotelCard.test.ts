import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelCard.tsx", import.meta.url),
  "utf8",
);

test("hotel result cards do not expose image carousel arrows", () => {
  for (const removedContract of [
    "ChevronLeft",
    "ChevronRight",
    "hotelResults.previousPhoto",
    "hotelResults.nextPhoto",
    "Previous photo",
    "Next photo",
    "selectAdjacentImage",
    "getAdjacentHotelGalleryIndex",
    "left-2 top-1/2",
    "right-2 top-1/2",
    "-translate-y-1/2",
  ]) {
    assert.doesNotMatch(source, new RegExp(removedContract));
  }
});

test("hotel result cards retain the conditional photo counter", () => {
  for (const retainedContract of [
    "showGalleryControls",
    "photoCounterText",
    "hotelResults.photoCounter",
    "availableImageIndices.length",
    "activeGalleryPosition",
    "bottom-2",
    "right-2",
  ]) {
    assert.match(source, new RegExp(retainedContract.replace(".", "\\.")));
  }

  assert.match(
    source,
    /const showGalleryControls = availableImageIndices\.length > 1;/,
  );
  assert.match(source, /\{showGalleryControls \? \(\s*<div/);
});

test("hotel result cards retain image fallback and presentation contracts", () => {
  for (const retainedContract of [
    "buildHotelGalleryCandidates",
    "resolveHotelGalleryIndex",
    "failedImageUrls",
    "markImageFailed",
    "displayImageUrl",
    "Image",
    "object-cover",
    "onError",
  ]) {
    assert.match(source, new RegExp(retainedContract));
  }
});

test("hotel result cards retain saved-hotel controls", () => {
  for (const retainedContract of [
    "savedHotelLabel",
    "aria-pressed={isSaved}",
    "disabled={!isSaved && !hasValidPrice}",
    "toggleSavedHotel",
    "Heart",
    'fill={isSaved ? "currentColor" : "none"}',
  ]) {
    assert(source.includes(retainedContract));
  }
});

test("hotel result cards retain content, pricing, and details contracts", () => {
  for (const retainedContract of [
    "hotel.name",
    "sortBadgeConfig",
    "starRating",
    "hotel.location",
    "reviewBand",
    "reviewCountText",
    "HotelAmenityList",
    "totalDisplayPrice",
    "nightlyDisplayPrice",
    "LinkButton",
    "resolvedDetailsHref",
  ]) {
    assert.match(source, new RegExp(retainedContract.replace(".", "\\.")));
  }
});
