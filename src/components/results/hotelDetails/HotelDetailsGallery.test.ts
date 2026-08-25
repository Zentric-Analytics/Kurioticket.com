import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const gallerySource = readFileSync(
  new URL("./HotelDetailsGallery.tsx", import.meta.url),
  "utf8",
);

test("mobile hero restores compact accessible arrow controls without changing the desktop mosaic", () => {
  for (const contract of [
    "ChevronLeft",
    "ChevronRight",
    "aria-label={previousPhotoLabel}",
    "aria-label={nextPhotoLabel}",
    "onClick={onPrevious}",
    "onClick={onNext}",
    "lg:hidden",
    "data-hotel-gallery-mosaic",
  ]) assert.ok(gallerySource.includes(contract), contract);
  assert.ok(!gallerySource.includes("<IconButton"));
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

test("preserves counter, viewer, thumbnails, and image behavior", () => {
  for (const galleryContract of [
    "photoCounter",
    "bottom-3",
    "right-3",
    "Images",
    "viewAllPhotosLabel",
    "openViewer",
    "left-3",
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
    gallerySource.indexOf("/>", gallerySource.indexOf("<HotelDetailsGalleryDialog")) + 2,
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
    "usableIndices.slice(0, 4)",
    "usableIndices.length - visibleIndices.length",
    'remainingPhotosLabel.replace("{{count}}"',
    'layout === "hero" && showGalleryControls',
  ]) assert.ok(gallerySource.includes(contract), contract);
});
