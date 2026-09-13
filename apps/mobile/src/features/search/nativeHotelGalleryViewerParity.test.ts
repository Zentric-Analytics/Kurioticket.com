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

test("web gallery remains independently protected", () => {
  assert.match(webGallery, /viewerOpen/);
  assert.match(webGallery, /HotelDetailsGalleryDialog/);
  assert.match(webDialog, /bg-slate-950\/90/);
  assert.match(webDialog, /ChevronLeft/);
  assert.match(webDialog, /ChevronRight/);
  assert.match(webDialog, /photoCounter/);
});

test("native hotel gallery has separate overview and individual viewer states", () => {
  assert.match(gallery, /const \[galleryOpen, setGalleryOpen\] = useState\(false\)/);
  assert.match(gallery, /const \[viewerOpen, setViewerOpen\] = useState\(false\)/);
  assert.match(gallery, /const openGallery = \(index: number\)[\s\S]*?setGalleryOpen\(true\)/);
  assert.match(gallery, /const openViewer = \(index: number\)[\s\S]*?setViewerOpen\(true\)/);
  assert.match(gallery, /const closeViewer = \(\) => setViewerOpen\(false\)/);
  assert.doesNotMatch(gallery.match(/const closeViewer[\s\S]*?;/)?.[0] ?? "", /setGalleryOpen/);
});

test("tapping the Hotel Details hero opens the gallery overview, not the individual viewer", () => {
  assert.match(gallery, /const heroWidth = viewportWidth/);
  assert.match(gallery, /const heroHeight = Math\.round\(viewportWidth \* 0\.94\)/);
  assert.match(gallery, /accessibilityLabel=\{`Open photo gallery for \$\{name\} from photo \$\{index \+ 1\} of \$\{images\.length\}`\}/);
  assert.match(gallery, /onPress=\{\(\) => openGallery\(index\)\}/);
  assert.doesNotMatch(gallery.slice(gallery.indexOf("const renderHero"), gallery.indexOf("const renderViewerImage")), /openViewer\(index\)/);
  assert.match(gallery, /resizeMode="cover"/);
});

test("gallery overview is a full-screen vertical mosaic with truthful photo count", () => {
  assert.match(gallery, /visible=\{galleryOpen\}[\s\S]*?animationType="slide"[\s\S]*?presentationStyle="fullScreen"/);
  assert.match(gallery, /accessibilityLabel="Close photo gallery"/);
  assert.match(gallery, /accessibilityRole="header"[\s\S]*?\{name\}/);
  assert.match(gallery, />All photos \{images\.length\}<\/Text>/);
  assert.match(gallery, /<ScrollView[\s\S]*?contentContainerStyle=\{s\.galleryOverviewContent\}/);
  assert.match(gallery, /galleryRows\.map/);
  assert.match(styleRule("galleryLargeFrame", "galleryPairRow"), /height: 230/);
  assert.match(styleRule("galleryPairRow", "galleryPairFrame"), /flexDirection: "row"[\s\S]*gap: 8/);
  assert.match(styleRule("galleryPairFrame", "galleryOverviewImage"), /height: 170/);
  assert.doesNotMatch(gallery, /Lobby|Bedroom|Living room|Other/);
});

test("tapping a mosaic photo opens the selected individual viewer inside the gallery modal", () => {
  assert.match(gallery, /onPress=\{\(\) => openViewer\(row\.items\[0\]\.index\)\}/);
  assert.match(gallery, /onPress=\{\(\) => openViewer\(item\.index\)\}/);
  assert.match(gallery, /\{viewerOpen \? \([\s\S]*?s\.viewerOverlay/);
  assert.match(gallery, /accessibilityLabel="Back to photo gallery"[\s\S]*?onPress=\{closeViewer\}/);
  assert.match(gallery, /\{activeIndex \+ 1\} \/ \{images\.length\}/);
});

test("individual viewer stays inside one native modal so iOS can present it reliably", () => {
  assert.equal((gallery.match(/<Modal\b/g) ?? []).length, 1);
  assert.match(gallery, /onRequestClose=\{viewerOpen \? closeViewer : closeGallery\}/);
  assert.match(gallery, /\{viewerOpen \? \([\s\S]*?accessibilityViewIsModal[\s\S]*?s\.viewerOverlay/);
  assert.match(styleRule("viewerOverlay", "viewerHeader"), /StyleSheet\.absoluteFillObject/);
});

test("individual viewer swipes every image and removes arrows and thumbnail rail", () => {
  assert.match(gallery, /ref=\{viewerScroll\}[\s\S]*?horizontal[\s\S]*?pagingEnabled[\s\S]*?data=\{images\}/);
  assert.match(gallery, /renderItem=\{renderViewerImage\}/);
  assert.match(gallery, /renderViewerImage[\s\S]*?resizeMode="contain"/);
  assert.match(gallery, /initialNumToRender=\{2\}/);
  assert.match(gallery, /maxToRenderPerBatch=\{2\}/);
  assert.match(gallery, /windowSize=\{3\}/);
  assert.doesNotMatch(gallery, /ChevronLeft|ChevronRight|Previous photo|Next photo/);
  assert.doesNotMatch(gallery, /viewerThumbnail|thumbnailStrip|Show photo/);
});

test("expanded gallery and viewer are white in light mode and black in dark mode", () => {
  assert.match(gallery, /const galleryBackground = theme\.dark \? "#000000" : "#FFFFFF"/);
  assert.match(gallery, /backgroundColor: galleryBackground/);
  assert.match(gallery, /const galleryText = theme\.dark \? "#FFFFFF" : "#0F172A"/);
  assert.match(gallery, /const galleryPlaceholder = theme\.dark \? "#18181B" : "#E7EBF2"/);
});

test("closing the individual viewer returns to the still-open gallery overview", () => {
  const closeViewer = gallery.match(/const closeViewer = \(\) => setViewerOpen\(false\);/)?.[0] ?? "";
  assert.ok(closeViewer);
  assert.doesNotMatch(closeViewer, /setGalleryOpen/);
  assert.match(gallery, /const closeGallery = \(\) => \{[\s\S]*?setViewerOpen\(false\);[\s\S]*?setGalleryOpen\(false\);[\s\S]*?\}/);
});

test("initial Hotel Details hero still supports horizontal preview swiping", () => {
  const inline = gallery.slice(gallery.indexOf("return (", gallery.indexOf("export function NativeHotelGallery")), gallery.indexOf("<Modal"));
  assert.match(inline, /horizontal\s*pagingEnabled/);
  assert.match(inline, /Swipe horizontally to preview photos, or tap to open all photos/);
  assert.match(inline, /style=\{s\.counter\}/);
});
