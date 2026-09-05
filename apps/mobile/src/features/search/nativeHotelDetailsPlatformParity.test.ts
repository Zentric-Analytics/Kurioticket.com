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

  assert.match(tablist, /style=\{\[\s*d\.hotelTabs,/);
  assert.match(tablist, /d\.hotelTab,/);
  assert.match(tablist, /tab === "compare" && d\.hotelTabWide/);
  assert.match(tablist, /accessibilityState=\{\{ selected: activeHotelTab === tab \}\}/);
  assert.match(tablist, /activeHotelTab === tab && \{ borderBottomColor: hotelAccent \}/);
  assert.match(tablist, /onPress=\{\(\) => setActiveHotelTab\(tab\)\}/);
});

test("the shared native tab geometry cannot stack or fork by platform", () => {
  const tabs = styleRule("hotelTabs", "hotelTab");
  const tab = styleRule("hotelTab", "hotelTabActive");
  const wideTab = styleRule("hotelTabWide", "hotelTabTextCompact");
  const ownedGeometry = `${tabs}\n${tab}\n${wideTab}`;

  assert.match(tabs, /width: "100%"/);
  assert.match(tabs, /alignSelf: "stretch"/);
  assert.match(tabs, /flexDirection: "row"/);
  assert.match(tabs, /flexWrap: "nowrap"/);
  assert.doesNotMatch(tabs, /flexDirection: "column"|flexWrap: "wrap"/);

  assert.match(tab, /flexGrow: 1/);
  assert.match(tab, /flexShrink: 1/);
  assert.match(tab, /flexBasis: 0/);
  assert.match(tab, /minWidth: 0/);
  const minimumHeight = /minHeight: (\d+)/.exec(tab);
  assert.ok(minimumHeight, "hotelTab must declare a minimum touch height");
  assert.ok(Number(minimumHeight[1]) >= 44, "hotelTab touch height must be at least 44dp");
  assert.match(wideTab, /flexGrow: 1\.65/);

  assert.doesNotMatch(ownedGeometry, /Platform\.OS|\bios\b|\bandroid\b/i);
  assert.equal((hotel.match(/d\.hotelTabs/g) ?? []).length, 1);
  assert.equal((hotel.match(/d\.hotelTabWide/g) ?? []).length, 1);
  assert.match(hotel, /stickyHeaderIndices=\{\[2\]\}/);
  assert.match(hotel, /const \[activeHotelTab, setActiveHotelTab\] = useState</);
});
