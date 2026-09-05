import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const hotel = source.slice(
  source.indexOf("function HotelDetail"),
  source.indexOf("const detailIcons"),
);

function styleRule(name: string, nextName: string) {
  const start = source.indexOf(`  ${name}:`);
  const end = source.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return source.slice(start, end);
}

test("iOS and Android share one Hotel Details tablist with the exact web tab order", () => {
  const shellStart = hotel.indexOf("d.hotelTabsShell");
  const tablistStart = hotel.indexOf('accessibilityRole="tablist"');
  const tablistEnd = hotel.indexOf("<View style={d.hotelDetailBody}", tablistStart);
  assert.notEqual(tablistStart, -1, "the shared Hotel Details tablist must exist");
  assert.notEqual(tablistEnd, -1, "the shared Hotel Details tablist must own the tabs");
  const tablist = hotel.slice(tablistStart, tablistEnd);

  assert.equal(
    [...hotel.matchAll(/accessibilityRole="tablist"/g)].length,
    1,
    "Hotel Details must render exactly one shared native tablist",
  );
  assert.deepEqual(
    [...tablist.matchAll(/\["compare", "about", "location", "reviews"\]/g)].length,
    1,
    "the one tablist must map compare, about, location, and reviews in web order",
  );
  assert.equal(
    [...tablist.matchAll(/accessibilityRole="tab"/g)].length,
    1,
    "one mapped tab element must own all four tab values",
  );
  assert.match(tablist, /numberOfLines=\{1\}/);
  assert.doesNotMatch(tablist, /<ScrollView[^>]*horizontal/);
  assert.doesNotMatch(tablist, /Platform\.OS|\b(?:IOS|Android)HotelTabs?\b/);

  assert.notEqual(shellStart, -1, "the outer sticky shell must exist");
  assert.ok(hotel.indexOf("<NativeHotelGallery") < shellStart);
  assert.ok(shellStart < tablistStart);
  assert.match(tablist, /style=\{d\.hotelTabsRow\}/);
  assert.match(tablist, /d\.hotelTab,/);
  assert.match(tablist, /tab === "compare" && d\.hotelTabWide/);
  assert.match(tablist, /accessibilityState=\{\{ selected: activeHotelTab === tab \}\}/);
  assert.match(tablist, /activeHotelTab === tab && \{ borderBottomColor: hotelAccent \}/);
  assert.match(tablist, /onPress=\{\(\) => setActiveHotelTab\(tab\)\}/);
});

test("the shared native tab geometry cannot stack or fork by platform", () => {
  const shell = styleRule("hotelTabsShell", "hotelTabsRow");
  const row = styleRule("hotelTabsRow", "hotelTab");
  const tab = styleRule("hotelTab", "hotelTabWide");
  const wideTab = styleRule("hotelTabWide", "hotelTabActive");
  const ownedGeometry = `${shell}\n${row}\n${tab}\n${wideTab}`;

  assert.match(shell, /width: "100%"/);
  assert.match(shell, /alignSelf: "stretch"/);
  assert.doesNotMatch(shell, /flexDirection:/);
  assert.match(row, /alignSelf: "stretch"/);
  assert.match(row, /flexDirection: "row"/);
  assert.match(row, /flexWrap: "nowrap"/);
  assert.doesNotMatch(row, /flexDirection: "column"|flexWrap: "wrap"/);

  assert.match(tab, /width: "21\.5%"/);
  assert.doesNotMatch(tab, /flexGrow: 1(?:\D|$)|flexShrink: 1|flexBasis: 0/);
  assert.match(tab, /minWidth: 0/);
  const minimumHeight = /minHeight: (\d+)/.exec(tab);
  assert.ok(minimumHeight, "hotelTab must declare a minimum touch height");
  assert.ok(Number(minimumHeight[1]) >= 44, "hotelTab touch height must be at least 44dp");
  assert.match(wideTab, /width: "35\.5%"/);
  assert.doesNotMatch(wideTab, /flexGrow: 1\.65/);

  assert.doesNotMatch(ownedGeometry, /Platform\.OS|\bios\b|\bandroid\b/i);
  assert.equal((hotel.match(/d\.hotelTabsShell/g) ?? []).length, 1);
  assert.equal((hotel.match(/d\.hotelTabsRow/g) ?? []).length, 1);
  assert.equal((hotel.match(/d\.hotelTabWide/g) ?? []).length, 1);
  assert.match(hotel, /stickyHeaderIndices=\{\[2\]\}/);
  assert.match(hotel, /const \[activeHotelTab, setActiveHotelTab\] = useState</);
});

test("Hotel selected underline is tab-scoped and separate from the sticky shell divider", () => {
  const shell = styleRule("hotelTabsShell", "hotelTabsRow");
  const tab = styleRule("hotelTab", "hotelTabWide");

  assert.match(shell, /borderBottomWidth: 1/);
  assert.match(shell, /borderBottomColor: ui\.border/);
  assert.doesNotMatch(shell, /hotelAccent|borderBottomWidth: 2/);
  assert.match(tab, /width: "21\.5%"/);
  assert.match(tab, /borderBottomWidth: 2/);
  assert.match(tab, /borderBottomColor: "transparent"/);
  assert.match(hotel, /activeHotelTab === tab && \{ borderBottomColor: hotelAccent \}/);
  assert.doesNotMatch(hotel, /d\.hotelTabsShell,[\s\S]{0,160}activeHotelTab === tab/);
});
