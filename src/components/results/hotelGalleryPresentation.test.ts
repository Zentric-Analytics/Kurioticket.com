import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHotelGalleryCandidates,
  getAdjacentHotelGalleryIndex,
  resolveHotelGalleryIndex,
} from "./hotelGalleryPresentation";
import { CURATED_HOTEL_FALLBACK_IMAGES } from "@/services/travel/hotelImages";

const a = "https://example.com/a.jpg";
const b = "https://example.com/b.jpg";
const c = "https://example.com/c.jpg";
const fallback = CURATED_HOTEL_FALLBACK_IMAGES[0]?.url ?? "";

test("buildHotelGalleryCandidates preserves valid imageUrls order", () => {
  assert.deepEqual(buildHotelGalleryCandidates([a, b, c], undefined), [
    a,
    b,
    c,
  ]);
});

test("buildHotelGalleryCandidates trims values", () => {
  assert.deepEqual(buildHotelGalleryCandidates([`  ${a}  `], `  ${b}  `), [
    a,
    b,
  ]);
});

test("buildHotelGalleryCandidates removes duplicates", () => {
  assert.deepEqual(buildHotelGalleryCandidates([a, b, a, b], undefined), [
    a,
    b,
  ]);
});

test("buildHotelGalleryCandidates rejects HTTP URLs", () => {
  assert.deepEqual(
    buildHotelGalleryCandidates(
      ["http://example.com/a.jpg", a],
      "http://example.com/b.jpg",
    ),
    [a],
  );
});

test("buildHotelGalleryCandidates rejects malformed URLs", () => {
  assert.deepEqual(buildHotelGalleryCandidates(["not a url", a], "https://"), [
    a,
  ]);
});

test("buildHotelGalleryCandidates rejects non-string values", () => {
  assert.deepEqual(
    buildHotelGalleryCandidates([a, 12, null, { url: b }, b], 42),
    [a, b],
  );
});

test("buildHotelGalleryCandidates appends a unique valid imageUrl", () => {
  assert.deepEqual(buildHotelGalleryCandidates([a], b), [a, b]);
});

test("buildHotelGalleryCandidates does not duplicate imageUrl", () => {
  assert.deepEqual(buildHotelGalleryCandidates([a, b], b), [a, b]);
});

test("buildHotelGalleryCandidates uses valid imageUrl when imageUrls is absent", () => {
  assert.deepEqual(buildHotelGalleryCandidates(undefined, a), [a]);
});

test("buildHotelGalleryCandidates returns [] when neither source is valid", () => {
  assert.deepEqual(
    buildHotelGalleryCandidates(["http://example.com/a.jpg"], "nope"),
    [],
  );
});

test("buildHotelGalleryCandidates does not insert deterministic fallback URLs", () => {
  assert.deepEqual(buildHotelGalleryCandidates(undefined, undefined), []);
  assert(!buildHotelGalleryCandidates([a], undefined).includes(fallback));
});

test("buildHotelGalleryCandidates removes a curated fallback in imageUrls", () => {
  assert.deepEqual(buildHotelGalleryCandidates([fallback], undefined), []);
});

test("buildHotelGalleryCandidates does not append a curated fallback imageUrl", () => {
  assert.deepEqual(buildHotelGalleryCandidates(undefined, fallback), []);
});

test("buildHotelGalleryCandidates keeps genuine image order around curated fallbacks", () => {
  assert.deepEqual(buildHotelGalleryCandidates([a, fallback, b], c), [a, b, c]);
});

test("buildHotelGalleryCandidates keeps genuine HTTPS images", () => {
  assert.deepEqual(buildHotelGalleryCandidates([a], b), [a, b]);
});

test("buildHotelGalleryCandidates excludes every curated fallback URL", () => {
  const result = buildHotelGalleryCandidates(
    CURATED_HOTEL_FALLBACK_IMAGES.map((image) => image.url),
    fallback,
  );

  assert.deepEqual(result, []);
});

test("resolveHotelGalleryIndex returns the preferred usable index", () => {
  assert.equal(resolveHotelGalleryIndex([a, b, c], new Set(), 1), 1);
});

test("resolveHotelGalleryIndex skips a failed preferred image", () => {
  assert.equal(resolveHotelGalleryIndex([a, b, c], new Set([b]), 1), 2);
});

test("resolveHotelGalleryIndex searches forward", () => {
  assert.equal(resolveHotelGalleryIndex([a, b, c], new Set([b]), 1), 2);
});

test("resolveHotelGalleryIndex wraps to the first image", () => {
  assert.equal(resolveHotelGalleryIndex([a, b, c], new Set([c]), 2), 0);
});

test("resolveHotelGalleryIndex normalizes a negative preferred index", () => {
  assert.equal(resolveHotelGalleryIndex([a, b, c], new Set(), -1), 2);
});

test("resolveHotelGalleryIndex normalizes an oversized preferred index", () => {
  assert.equal(resolveHotelGalleryIndex([a, b, c], new Set(), 4), 1);
});

test("resolveHotelGalleryIndex returns -1 for no candidates", () => {
  assert.equal(resolveHotelGalleryIndex([], new Set(), 0), -1);
});

test("resolveHotelGalleryIndex returns -1 when all candidates failed", () => {
  assert.equal(resolveHotelGalleryIndex([a, b, c], new Set([a, b, c]), 0), -1);
});

test("resolveHotelGalleryIndex does not mutate the failed Set", () => {
  const failed = new Set([b]);
  resolveHotelGalleryIndex([a, b, c], failed, 1);
  assert.deepEqual([...failed], [b]);
});

test("getAdjacentHotelGalleryIndex moves forward normally", () => {
  assert.equal(getAdjacentHotelGalleryIndex([a, b, c], new Set(), 0, 1), 1);
});

test("getAdjacentHotelGalleryIndex moves backward normally", () => {
  assert.equal(getAdjacentHotelGalleryIndex([a, b, c], new Set(), 1, -1), 0);
});

test("getAdjacentHotelGalleryIndex wraps forward", () => {
  assert.equal(getAdjacentHotelGalleryIndex([a, b, c], new Set(), 2, 1), 0);
});

test("getAdjacentHotelGalleryIndex wraps backward", () => {
  assert.equal(getAdjacentHotelGalleryIndex([a, b, c], new Set(), 0, -1), 2);
});

test("getAdjacentHotelGalleryIndex skips failed images forward", () => {
  assert.equal(getAdjacentHotelGalleryIndex([a, b, c], new Set([b]), 0, 1), 2);
});

test("getAdjacentHotelGalleryIndex skips failed images backward", () => {
  assert.equal(getAdjacentHotelGalleryIndex([a, b, c], new Set([b]), 2, -1), 0);
});

test("getAdjacentHotelGalleryIndex returns the only surviving image", () => {
  assert.equal(
    getAdjacentHotelGalleryIndex([a, b, c], new Set([a, c]), 0, 1),
    1,
  );
});

test("getAdjacentHotelGalleryIndex returns -1 when every image failed", () => {
  assert.equal(
    getAdjacentHotelGalleryIndex([a, b, c], new Set([a, b, c]), 0, 1),
    -1,
  );
});

test("getAdjacentHotelGalleryIndex handles invalid current indexes safely", () => {
  assert.equal(getAdjacentHotelGalleryIndex([a, b, c], new Set(), 99, 1), 1);
});

test("getAdjacentHotelGalleryIndex never returns a failed index", () => {
  const result = getAdjacentHotelGalleryIndex([a, b, c], new Set([b]), 0, 1);
  assert.notEqual(result, 1);
  assert.equal(result, 2);
});
