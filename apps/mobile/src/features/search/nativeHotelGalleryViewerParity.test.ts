import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const native = readFileSync(
  "src/features/search/NativeHotelDetails.tsx",
  "utf8",
);
const gallery = native.slice(
  native.indexOf("export function NativeHotelGallery"),
  native.indexOf("export function HotelRoomOptionsModal"),
);
const webGallery = readFileSync(
  "../../src/components/results/hotelDetails/HotelDetailsGallery.tsx",
  "utf8",
);
const webDialog = readFileSync(
  "../../src/components/results/hotelDetails/HotelDetailsGalleryDialog.tsx",
  "utf8",
);

function styleRule(name: string, nextName: string) {
  const start = native.indexOf(`  ${name}:`);
  const end = native.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return native.slice(start, end);
}

test("web retains its full viewport, contain-image gallery viewer contract", () => {
  assert.match(webGallery, /viewerOpen/);
  assert.match(webGallery, /openViewer/);
  assert.match(webGallery, /HotelDetailsGalleryDialog/);
  assert.match(webDialog, /fixed inset-0[^\"]*h-\[100dvh\]/);
  assert.match(webDialog, /object-contain/);
  assert.match(webDialog, /closeLabel/);
  assert.match(webDialog, /ChevronLeft/);
  assert.match(webDialog, /ChevronRight/);
  assert.match(webDialog, /photoCounter/);
  assert.match(webDialog, /usableIndices\.map/);
});

test("NativeHotelGallery owns a full-screen viewer modal and shared selection", () => {
  assert.match(
    gallery,
    /const \[viewerOpen, setViewerOpen\] = useState\(false\)/,
  );
  assert.match(gallery, /<Modal[\s\S]*?visible=\{viewerOpen\}[\s\S]*?animationType="fade"[\s\S]*?presentationStyle="fullScreen"[\s\S]*?onRequestClose=\{closeViewer\}/);
  assert.match(gallery, /accessibilityViewIsModal/);
  assert.match(gallery, /const closeViewer = \(\) => setViewerOpen\(false\)/);
  assert.doesNotMatch(gallery, /viewerActive(?:Url|Index)/);
  assert.doesNotMatch(
    gallery.match(/const closeViewer[\s\S]*?;/)?.[0] ?? "",
    /setActiveUrl|setActiveIndex/,
  );
});

test("inline hero remains cover and opens the selected photo accessibly", () => {
  assert.match(gallery, /accessibilityRole="button"[\s\S]*?accessibilityLabel=\{`Open photo \$\{index \+ 1\} of \$\{images\.length\} for \$\{name\}`\}[\s\S]*?onPress=\{\(\) => openViewer\(index\)\}/);
  assert.match(gallery, /resizeMode="cover"[\s\S]*?accessible=\{false\}/);
  assert.match(gallery, /const openViewer = \(index: number\)[\s\S]*?setActiveImage\(index\)[\s\S]*?setViewerOpen\(true\)/);
});

test("viewer pages swipe over every filtered image and use contain", () => {
  assert.match(gallery, /ref=\{viewerScroll\}[\s\S]*?horizontal[\s\S]*?pagingEnabled[\s\S]*?onMomentumScrollEnd/);
  assert.match(gallery, /\{images\.map\(\(url\) => \([\s\S]*?resizeMode="contain"/);
  assert.doesNotMatch(gallery, /initialImages\.map[\s\S]*?resizeMode="contain"/);
  assert.match(gallery, /failed\.has\(url\)/);
});

test("viewer exposes title, close, navigation, and semantic counter", () => {
  assert.match(gallery, /accessibilityRole="header"[\s\S]*?Photos for \{name\}/);
  assert.match(gallery, /accessibilityLabel="Close photo viewer"[\s\S]*?<X/);
  assert.match(gallery, /accessibilityLabel="Previous photo"[\s\S]*?<ChevronLeft/);
  assert.match(gallery, /accessibilityLabel="Next photo"[\s\S]*?<ChevronRight/);
  assert.match(gallery, /\{activeIndex \+ 1\} of \{images\.length\} photos/);
  assert.match(gallery, /\{activeIndex \+ 1\} \/ \{images\.length\}/);
  assert.match(styleRule("viewerClose", "viewerStage"), /width: 48[\s\S]*height: 48/);
  assert.match(styleRule("viewerArrow", "viewerLeft"), /width: 48[\s\S]*height: 48/);
});

test("viewer thumbnails include all photos and track the selected photo", () => {
  const viewerThumbnails = gallery.slice(gallery.indexOf("ref={viewerThumbnails}"));
  assert.match(viewerThumbnails, /images\.map\(\(url, index\)/);
  assert.doesNotMatch(viewerThumbnails, /images\.slice\(0, 5\)/);
  assert.match(viewerThumbnails, /accessibilityState=\{\{ selected: activeIndex === index \}\}/);
  assert.match(gallery, /keepViewerThumbnailVisible\(index\)/);
  assert.match(styleRule("viewerThumbnailFrame", "viewerThumbnailActive"), /width: 96[\s\S]*height: 64/);
  assert.match(styleRule("viewerThumbnailStrip", "viewerThumbnailFrame"), /gap: 8/);
  assert.match(styleRule("viewerThumbnailActive", "viewerThumbnail"), /borderWidth: 3[\s\S]*borderColor: "white"/);
});

test("the truthful fifth tile opens all photos while regular thumbnails stay inline", () => {
  assert.match(gallery, /images\.slice\(0, 5\)/);
  assert.match(gallery, /const remaining = index === 4 \? images\.length - 5 : 0/);
  assert.match(gallery, /accessibilityLabel=\{\s*remaining > 0 \? "View all photos" : `Show photo/);
  assert.match(gallery, /onPress=\{\(\) =>\s*remaining > 0 \? openViewer\(index\) : choose\(index\)\s*\}/);
});
