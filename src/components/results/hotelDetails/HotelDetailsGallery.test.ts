import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const gallerySource = readFileSync(
  new URL("./HotelDetailsGallery.tsx", import.meta.url),
  "utf8",
);

test("mobile hero uses small visible arrows inside accessible targets without changing the desktop mosaic", () => {
  for (const contract of [
    "ChevronLeft",
    "ChevronRight",
    "aria-label={previousPhotoLabel}",
    "aria-label={nextPhotoLabel}",
    "onClick={onPrevious}",
    "onClick={onNext}",
    "lg:hidden",
    "data-hotel-gallery-mosaic",
    "size-11",
    'className="h-5 w-5"',
    "left-0",
    "right-0",
    "justify-start",
    "justify-end",
    "ps-2",
    "pe-2",
    "bg-transparent",
    "text-white",
    "aspect-[6/5]",
    "aspect-[16/10]",
  ])
    assert.ok(gallerySource.includes(contract), contract);
  assert.ok(!gallerySource.includes("<IconButton"));
  assert.doesNotMatch(gallerySource, /bg-white(?:\/85)? shadow-sm/);
  assert.doesNotMatch(gallerySource, /left-3 top-1\/2|right-3 top-1\/2/);
});

test("standalone mobile mosaic uses one full-bleed hero without an inline thumbnail strip", () => {
  const unitStart = gallerySource.indexOf('className="lg:hidden" data-hotel-mobile-gallery-unit');
  const unit = gallerySource.slice(
    unitStart,
    gallerySource.indexOf("{mosaic}", unitStart),
  );
  assert.ok(unitStart >= 0);
  assert.ok(unit.includes("{hero}"));
  assert.doesNotMatch(unit, /mobileThumbnails|data-hotel-mobile-thumbnail-strip|mx-3/);
  assert.doesNotMatch(gallerySource, /mobileThumbnailIndices|mobileRemainingCount|<Images/);
  assert.equal(gallerySource.match(/data-hotel-mobile-gallery-unit/g)?.length, 1);
});

test("preserves pointer swipe and keyboard gallery navigation", () => {
  for (const interactionContract of [
    "pointerStartRef",
    "getHotelGallerySwipeDirection",
    'touchAction: "pan-y"',
    "onPointerDown",
    'event.pointerType !== "mouse"',
    "onPointerUp={handlePointerUp}",
    "onPointerCancel",
    "usableIndices.length < 2",
    "direction === -1",
    "direction === 1",
    "onPrevious()",
    "onNext()",
    "handleGalleryKeyDown",
    'event.key === "ArrowLeft"',
    'event.key === "ArrowRight"',
    "event.preventDefault()",
    "isEditableTarget",
    "onKeyDown={handleGalleryKeyDown}",
  ])
    assert.ok(gallerySource.includes(interactionContract), interactionContract);
});

test("preserves counter, viewer, optional hero-layout thumbnails, and image behavior", () => {
  for (const galleryContract of [
    "photoCounter",
    "bottom-3",
    "right-3",
    "openViewer",
    "left-0",
    "thumbnailStripRef",
    "usableIndices.map",
    "data-gallery-index",
    "aria-pressed",
    "selectPhotoLabel",
    "onSelectImage",
    "activeUrl",
    "<Image",
    "object-cover",
    "onError",
    "preload",
    "cursor-zoom-in",
    "openPhotoViewerLabel",
  ])
    assert.ok(gallerySource.includes(galleryContract), galleryContract);
});

test("preserves the photo-viewer dialog navigation contract", () => {
  const dialogCall = gallerySource.slice(
    gallerySource.indexOf("<HotelDetailsGalleryDialog"),
    gallerySource.indexOf(
      "/>",
      gallerySource.indexOf("<HotelDetailsGalleryDialog"),
    ) + 2,
  );

  for (const dialogContract of [
    "previousPhotoLabel={previousPhotoLabel}",
    "nextPhotoLabel={nextPhotoLabel}",
    "onPrevious={onPrevious}",
    "onNext={onNext}",
  ])
    assert.ok(dialogCall.includes(dialogContract), dialogContract);
});

test("builds a responsive four-tile mosaic with a dynamic remaining count", () => {
  for (const contract of [
    'layout?: "hero" | "mosaic"',
    "data-hotel-gallery-mosaic",
    "getHotelGalleryMosaicIndices(",
    "usableIndices.length - visibleIndices.length",
    "remainingPhotosLabel.replace(",
    'layout === "hero" && showGalleryControls',
  ])
    assert.ok(gallerySource.includes(contract), contract);
});
