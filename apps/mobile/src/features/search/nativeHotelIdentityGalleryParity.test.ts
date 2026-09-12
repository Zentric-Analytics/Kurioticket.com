import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailSource = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const hotel = detailSource.slice(detailSource.indexOf("function HotelDetail"));
const gallery = readFileSync("src/features/search/NativeHotelDetails.tsx", "utf8");
const stayEditor = readFileSync("src/features/search/HotelStayEditor.tsx", "utf8");

function styleRule(source: string, name: string, nextName: string) {
  const start = source.indexOf(`  ${name}:`);
  const end = source.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return source.slice(start, end);
}

test("native hotel hero uses the measured full-bleed mobile geometry", () => {
  assert.match(gallery, /const heroWidth = viewportWidth;/);
  assert.match(gallery, /const heroHeight = Math\.round\(viewportWidth \* 0\.94\);/);
  assert.match(gallery, /style=\{\[s\.hero, \{ width: heroWidth, height: heroHeight \}\]\}/);
  assert.match(gallery, /style=\{\[s\.heroFrame, \{ height: heroHeight \}\]\}/);
  assert.match(styleRule(gallery, "gallery", "heroFrame"), /width: "100%"[^}]*marginBottom: 0/);
  assert.match(styleRule(gallery, "heroFrame", "hero"), /width: "100%"[^}]*overflow: "hidden"/);
  assert.doesNotMatch(styleRule(gallery, "heroFrame", "hero"), /borderRadius|aspectRatio|marginHorizontal/);
});

test("active hotel keeps icon-only header controls fixed over the hero and scrolled content", () => {
  const scrollEnd = hotel.indexOf("</ScrollView>");
  const backControl = hotel.indexOf('accessibilityLabel="Back to hotel results"');
  const identityIndex = hotel.indexOf("<View style={s.identity}>");

  assert.ok(hotel.indexOf("<NativeHotelGallery") < identityIndex);
  assert.ok(scrollEnd >= 0 && scrollEnd < backControl, "hotel header controls must remain outside the ScrollView");
  assert.doesNotMatch(hotel, />Back to hotel results<\/Text>/);
  assert.equal((hotel.match(/accessibilityLabel="Back to hotel results"/g) ?? []).length, 1);
  assert.match(hotel, /accessibilityLabel="Back to hotel results"[\s\S]*?onPress=\{returnToHotelResults\}[\s\S]*?s\.heroBack/);
  assert.match(hotel, /style=\{\[s\.heroBack, \{ top: inset\.top \+ 12 \}\]\}/);
  assert.match(hotel, /style=\{\[s\.heroActions, \{ top: inset\.top \+ 12 \}\]\}/);
  assert.match(styleRule(detailSource, "heroBack", "heroActions"), /left: 20[^}]*width: 44[^}]*height: 44[^}]*borderRadius: 22[^}]*backgroundColor: "#FFFFFF"[^}]*zIndex: 20[^}]*elevation: 10/);
  assert.match(styleRule(detailSource, "heroActions", "heroAction"), /right: 20[^}]*width: 112[^}]*height: 44[^}]*borderRadius: 22[^}]*backgroundColor: "#FFFFFF"[^}]*flexDirection: "row"[^}]*zIndex: 20[^}]*elevation: 10/);
  assert.match(styleRule(detailSource, "heroAction", "identity"), /width: 56[^}]*height: 44/);
});

test("save and share remain independent accessible actions inside one pill", () => {
  assert.match(hotel, /accessibilityLabel=\{saved \? `Remove \$\{result\.name\} hotel from saved` : `Save \$\{result\.name\} hotel`\}/);
  assert.match(hotel, /accessibilityState=\{\{ selected: saved \}\}/);
  assert.match(hotel, /onPress=\{\(\) => void canonical\.toggleHotel\(result, params\)\}/);
  assert.match(hotel, /<Heart[\s\S]*?size=\{22\}[\s\S]*?strokeWidth=\{2\}/);
  assert.match(hotel, /accessibilityLabel=\{`Share \$\{result\.name\}`\}[\s\S]*?onPress=\{shareHotel\}/);
  assert.match(hotel, /<FlowIcon name="share" size=\{22\} color="#0F172A" \/>/);
});

test("active identity, tabs, and editable stay summary follow the measured hierarchy", () => {
  const name = styleRule(detailSource, "hotelName", "hotelNamePhoneFit");
  const identityIndex = hotel.indexOf("<View style={s.identity}>");
  const tabsIndex = hotel.indexOf("s.tabsShell");
  const stayIndex = hotel.indexOf("<HotelStayEditor");
  const bodyIndex = hotel.indexOf("<View style={s.detailBody}>");
  assert.ok(identityIndex < tabsIndex);
  assert.ok(tabsIndex < stayIndex);
  assert.ok(stayIndex < bodyIndex);
  assert.match(detailSource, /identity: \{[^}]*paddingHorizontal: 16[^}]*paddingTop: 16[^}]*paddingBottom: 14/);
  assert.match(name, /fontSize: 24[^}]*lineHeight: 30[^}]*fontWeight: "700"[^}]*fontFamily: appFonts\.bold/);
  assert.match(styleRule(detailSource, "stars", "reviewSummary"), /marginTop: 7[^}]*fontSize: 20[^}]*lineHeight: 24/);
  assert.match(hotel, /const hotelReview = nativeHotelReviewPresentation\(result\);/);
  assert.match(hotel, /hotelReview\?\.score\.split\(" \/ "\)\[0\]/);
  assert.match(hotel, /\{hotelReview\.label\} \{hotelReviewScore\}/);
  assert.match(hotel, /\{hotelReview\.count\}/);
  assert.match(hotel, /<HotelStayEditor[\s\S]*?result=\{result\}[\s\S]*?checkIn=\{checkIn\}[\s\S]*?checkOut=\{checkOut\}[\s\S]*?guests=\{guestCount\}[\s\S]*?rooms=\{roomCount\}/);
  assert.match(styleRule(stayEditor, "section", "card"), /paddingHorizontal: 10[^}]*paddingTop: 24/);
  assert.match(styleRule(stayEditor, "card", "copy"), /minHeight: 60[^}]*borderWidth: 1[^}]*borderRadius: 12[^}]*paddingHorizontal: 14[^}]*paddingVertical: 4[^}]*gap: 10/);
  assert.match(stayEditor, /\{summary\.occupancy\}/);
  assert.doesNotMatch(stayEditor, /summary\.nightText/);
});

test("compact stay card exposes full-size edit targets without shrinking the visual card", () => {
  assert.match(stayEditor, /accessibilityLabel=\{`Edit stay\./);
  assert.match(stayEditor, /const openEditor = \(\) => \{\s*setEditorView\("menu"\);\s*setEditorOpen\(true\);\s*\};/);
  assert.match(stayEditor, /onPress=\{openEditor\}/);
  assert.match(stayEditor, /<Modal[\s\S]*?visible=\{editorOpen\}[\s\S]*?animationType="slide"/);
  assert.match(stayEditor, /accessibilityLabel=\{`Edit dates\./);
  assert.match(stayEditor, /onPress=\{onEditDates\}/);
  assert.match(stayEditor, /accessibilityLabel=\{`Edit rooms and guests\./);
  assert.match(stayEditor, /onPress=\{onEditCounts\}/);
  assert.match(styleRule(stayEditor, "editOption", "editOptionCopy"), /minHeight: 56[^}]*paddingVertical: 7/);
  assert.match(stayEditor, /<DateRangeSheet[\s\S]*?presentation="embedded"/);
  assert.match(stayEditor, /<HotelStayCountsEditor/);
  assert.doesNotMatch(stayEditor, /<HotelStayEditSheet|<HotelStayCountsSheet/);
  assert.match(stayEditor, /travelApi\.searchHotels\(/);
  assert.match(stayEditor, /response\.results\.find\(\(hotel\) => hotel\.id === result\.id\)/);
  assert.match(stayEditor, /rebuildHotelStayNavigationState\(/);
  assert.match(stayEditor, /navigation\.dispatch\(\{ type: "RESET", payload: resetState \}\)/);
  assert.match(stayEditor, /hotelDisplayPrices: ""/);
  assert.match(stayEditor, /displayCurrencyContext: ""/);
  assert.match(stayEditor, /hotelResultsStack: "1"/);
  assert.match(stayEditor, /router\.setParams\(\{ \.\.\.detailParams, hotelResultsStack: "0" \}\)/);
});

test("inline gallery keeps swiping and a centered measured counter without the thumbnail rail", () => {
  assert.match(gallery, /horizontal\s*pagingEnabled[\s\S]*?data=\{images\}/);
  assert.match(gallery, /accessibilityHint=\{images\.length > 1 \? "Swipe horizontally to view more photos\." : undefined\}/);
  assert.match(styleRule(gallery, "counter", "unavailable"), /left: "50%"[^}]*bottom: 15[^}]*minWidth: 48[^}]*translateX: -24/);
  const inline = gallery.slice(gallery.indexOf("return (", gallery.indexOf("export function NativeHotelGallery")), gallery.indexOf("<Modal"));
  assert.doesNotMatch(inline, /images\.slice\(0, 5\)|s\.thumbnails|s\.thumbnailFrame|Previous photo|Next photo/);
  assert.match(inline, /\{activeIndex \+ 1\} \/ \{images\.length\}/);
});

test("full-screen viewer still owns photo navigation and all thumbnails", () => {
  const modal = gallery.slice(gallery.indexOf("<Modal"), gallery.indexOf("export function HotelRoomOptionsModal"));
  assert.match(modal, /accessibilityLabel="Previous photo"/);
  assert.match(modal, /accessibilityLabel="Next photo"/);
  assert.match(modal, /images\.map\(\(url, index\)/);
  assert.match(modal, /accessibilityState=\{\{ selected: activeIndex === index \}\}/);
});
