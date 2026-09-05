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

test("web retains its inset dialog and flex-stage gallery viewer contract", () => {
  assert.match(webGallery, /viewerOpen/);
  assert.match(webGallery, /openViewer/);
  assert.match(webGallery, /HotelDetailsGalleryDialog/);
  assert.match(
    webDialog,
    /fixed inset-0[^\"]*h-\[100dvh\][^\"]*bg-slate-950\/90/,
  );
  assert.match(
    webDialog,
    /p-\[max\(0\.75rem,env\(safe-area-inset-top\)\)_max\(0\.75rem,env\(safe-area-inset-right\)\)_max\(0\.75rem,env\(safe-area-inset-bottom\)\)_max\(0\.75rem,env\(safe-area-inset-left\)\)\]/,
  );
  assert.match(
    webDialog,
    /relative flex min-h-0 w-full[^\"]*flex-col[^\"]*overflow-hidden[^\"]*rounded-2xl bg-slate-950/,
  );
  assert.match(
    webDialog,
    /flex shrink-0 items-center justify-between gap-3 px-2 py-2/,
  );
  assert.match(webDialog, /relative min-h-0 flex-1 touch-pan-y/);
  assert.match(webDialog, /absolute bottom-2 left-1\/2 -translate-x-1\/2/);
  assert.match(webDialog, /flex w-full shrink-0 gap-2[^\"]*px-2 py-3/);
  assert.match(webDialog, /relative h-16 w-24 shrink-0/);
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
  assert.match(
    gallery,
    /<Modal[\s\S]*?visible=\{viewerOpen\}[\s\S]*?animationType="fade"[\s\S]*?transparent[\s\S]*?presentationStyle="overFullScreen"[\s\S]*?onRequestClose=\{closeViewer\}/,
  );
  assert.match(gallery, /accessibilityViewIsModal/);
  assert.match(gallery, /const closeViewer = \(\) => setViewerOpen\(false\)/);
  assert.doesNotMatch(gallery, /viewerActive(?:Url|Index)/);
  assert.doesNotMatch(
    gallery.match(/const closeViewer[\s\S]*?;/)?.[0] ?? "",
    /setActiveUrl|setActiveIndex/,
  );
});

test("native viewer owns a dim backdrop and rounded inner dialog", () => {
  assert.match(gallery, /style=\{\[\s*s\.viewerBackdrop,/);
  assert.match(gallery, /<View style=\{s\.viewerDialog\}>/);
  assert.doesNotMatch(gallery, /s\.viewer(?:,|\])/);
  assert.match(
    styleRule("viewerBackdrop", "viewerDialog"),
    /flex: 1[\s\S]*backgroundColor: "rgba\(2,6,23,\.90\)"[\s\S]*alignItems: "stretch"[\s\S]*justifyContent: "center"/,
  );
  assert.match(
    styleRule("viewerDialog", "viewerHeader"),
    /flex: 1[\s\S]*minHeight: 0[\s\S]*width: "100%"[\s\S]*borderRadius: 16[\s\S]*overflow: "hidden"[\s\S]*backgroundColor: "#020617"/,
  );
});

test("native viewer applies safe minimum outer insets and pages at dialog width", () => {
  assert.match(gallery, /const viewerInsetTop = Math\.max\(insets\.top, 12\)/);
  assert.match(
    gallery,
    /const viewerInsetRight = Math\.max\(insets\.right, 12\)/,
  );
  assert.match(
    gallery,
    /const viewerInsetBottom = Math\.max\(insets\.bottom, 12\)/,
  );
  assert.match(
    gallery,
    /const viewerInsetLeft = Math\.max\(insets\.left, 12\)/,
  );
  assert.match(
    gallery,
    /const viewerWidth = viewportWidth - viewerInsetLeft - viewerInsetRight/,
  );
  assert.match(
    gallery,
    /paddingTop: viewerInsetTop[\s\S]*paddingRight: viewerInsetRight[\s\S]*paddingBottom: viewerInsetBottom[\s\S]*paddingLeft: viewerInsetLeft/,
  );
  assert.doesNotMatch(gallery, /padding(?:Left|Right): insets\.(?:left|right)/);
  assert.match(gallery, /index \* 104 - viewerWidth \/ 2 \+ 48/);
});

test("header and flex-driven stage match web geometry", () => {
  assert.match(
    styleRule("viewerHeader", "viewerTitle"),
    /flexShrink: 0[\s\S]*gap: 12[\s\S]*paddingHorizontal: 8[\s\S]*paddingVertical: 8/,
  );
  assert.doesNotMatch(
    styleRule("viewerHeader", "viewerTitle"),
    /minHeight: 56/,
  );
  assert.match(
    styleRule("viewerStage", "viewerPager"),
    /flex: 1[\s\S]*minHeight: 0[\s\S]*position: "relative"/,
  );
  assert.match(styleRule("viewerPager", "viewerPage"), /flex: 1/);
  assert.match(
    styleRule("viewerPage", "viewerImage"),
    /flex: 1[\s\S]*height: "100%"/,
  );
  assert.match(
    styleRule("viewerImage", "viewerArrow"),
    /width: "100%"[\s\S]*height: "100%"/,
  );
  const viewerStyles = native.slice(
    native.indexOf("  viewerBackdrop:"),
    native.indexOf("  modalBackdrop:"),
  );
  assert.doesNotMatch(
    viewerStyles,
    /aspectRatio|maxHeight|height: (?:400|450)|viewportHeight/,
  );
});

test("counter belongs to the stage and thumbnails anchor at the dialog bottom", () => {
  const stageMarkup = gallery.slice(
    gallery.indexOf("<View style={s.viewerStage}>"),
    gallery.indexOf("style={s.viewerThumbnailScroller}"),
  );
  assert.match(stageMarkup, /style=\{s\.viewerCounter\}/);
  assert.match(
    styleRule("viewerCounter", "viewerThumbnailScroller"),
    /position: "absolute"[\s\S]*bottom: 8/,
  );
  assert.match(
    styleRule("viewerThumbnailScroller", "viewerThumbnailStrip"),
    /flexGrow: 0[\s\S]*flexShrink: 0/,
  );
  assert.match(
    styleRule("viewerThumbnailStrip", "viewerThumbnailFrame"),
    /gap: 8[\s\S]*paddingHorizontal: 8[\s\S]*paddingVertical: 12/,
  );
  assert.match(styleRule("viewerLeft", "viewerRight"), /left: 4/);
  assert.match(styleRule("viewerRight", "viewerCounter"), /right: 4/);
});

test("inline hero remains cover and opens the selected photo accessibly", () => {
  assert.match(
    gallery,
    /accessibilityRole="button"[\s\S]*?accessibilityLabel=\{`Open photo \$\{index \+ 1\} of \$\{images\.length\} for \$\{name\}`\}[\s\S]*?onPress=\{\(\) => openViewer\(index\)\}/,
  );
  assert.match(gallery, /resizeMode="cover"[\s\S]*?accessible=\{false\}/);
  assert.match(
    gallery,
    /const openViewer = \(index: number\)[\s\S]*?setActiveImage\(index\)[\s\S]*?setViewerOpen\(true\)/,
  );
});

test("viewer pages swipe over every filtered image and use contain", () => {
  assert.match(
    gallery,
    /ref=\{viewerScroll\}[\s\S]*?horizontal[\s\S]*?pagingEnabled[\s\S]*?onMomentumScrollEnd/,
  );
  assert.match(
    gallery,
    /\{images\.map\(\(url\) => \([\s\S]*?resizeMode="contain"/,
  );
  assert.doesNotMatch(
    gallery,
    /initialImages\.map[\s\S]*?resizeMode="contain"/,
  );
  assert.match(gallery, /failed\.has\(url\)/);
});

test("viewer exposes title, close, navigation, and semantic counter", () => {
  assert.match(
    gallery,
    /accessibilityRole="header"[\s\S]*?Photos for \{name\}/,
  );
  assert.match(gallery, /accessibilityLabel="Close photo viewer"[\s\S]*?<X/);
  assert.match(
    gallery,
    /accessibilityLabel="Previous photo"[\s\S]*?<ChevronLeft/,
  );
  assert.match(gallery, /accessibilityLabel="Next photo"[\s\S]*?<ChevronRight/);
  assert.match(gallery, /\{activeIndex \+ 1\} of \{images\.length\} photos/);
  assert.match(gallery, /\{activeIndex \+ 1\} \/ \{images\.length\}/);
  assert.match(
    styleRule("viewerClose", "viewerStage"),
    /width: 48[\s\S]*height: 48/,
  );
  assert.match(
    styleRule("viewerArrow", "viewerLeft"),
    /width: 48[\s\S]*height: 48/,
  );
});

test("viewer thumbnails include all photos and track the selected photo", () => {
  const viewerThumbnails = gallery.slice(
    gallery.indexOf("ref={viewerThumbnails}"),
  );
  assert.match(viewerThumbnails, /images\.map\(\(url, index\)/);
  assert.doesNotMatch(viewerThumbnails, /images\.slice\(0, 5\)/);
  assert.match(
    viewerThumbnails,
    /accessibilityState=\{\{ selected: activeIndex === index \}\}/,
  );
  assert.match(gallery, /keepViewerThumbnailVisible\(index\)/);
  assert.match(
    styleRule("viewerThumbnailFrame", "viewerThumbnailActive"),
    /width: 96[\s\S]*height: 64/,
  );
  assert.match(
    styleRule("viewerThumbnailStrip", "viewerThumbnailFrame"),
    /gap: 8/,
  );
  assert.match(
    styleRule("viewerThumbnailActive", "viewerThumbnail"),
    /borderWidth: 3[\s\S]*borderColor: "white"/,
  );
});

test("the truthful fifth tile opens all photos while regular thumbnails stay inline", () => {
  assert.match(gallery, /images\.slice\(0, 5\)/);
  assert.match(
    gallery,
    /const remaining = index === 4 \? images\.length - 5 : 0/,
  );
  assert.match(
    gallery,
    /accessibilityLabel=\{\s*remaining > 0 \? "View all photos" : `Show photo/,
  );
  assert.match(
    gallery,
    /onPress=\{\(\) =>\s*remaining > 0 \? openViewer\(index\) : choose\(index\)\s*\}/,
  );
});
