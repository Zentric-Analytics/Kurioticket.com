import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const hotel = source.slice(source.indexOf("function HotelDetail"));

function styleRule(name: string, nextName: string) {
  const start = source.indexOf(`  ${name}:`);
  const end = source.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return source.slice(start, end);
}

test("iOS and Android share one active Hotel Details tablist with Details, Reviews, Deals in order", () => {
  const shellStart = hotel.indexOf("s.tabsShell");
  const tablistStart = hotel.indexOf('accessibilityRole="tablist"');
  const tablistEnd = hotel.indexOf("<HotelStayEditor", tablistStart);
  assert.notEqual(shellStart, -1, "the shared sticky shell must exist");
  assert.notEqual(tablistStart, -1, "the shared Hotel Details tablist must exist");
  assert.notEqual(tablistEnd, -1, "the shared Hotel Details tablist must own the tabs");
  assert.ok(hotel.indexOf("<NativeHotelGallery") < shellStart);
  assert.ok(shellStart < tablistStart);
  const tablist = hotel.slice(tablistStart, tablistEnd);

  assert.equal(
    [...hotel.matchAll(/accessibilityRole="tablist"/g)].length,
    1,
    "Hotel Details must render exactly one shared native tablist",
  );
  assert.deepEqual(
    [...tablist.matchAll(/\["details", "reviews", "deals"\]/g)].length,
    1,
    "the one tablist must map Details, Reviews, and Deals in that order",
  );
  assert.equal(
    [...tablist.matchAll(/accessibilityRole="tab"/g)].length,
    1,
    "one mapped tab element must own all three tab values",
  );
  assert.match(tablist, /numberOfLines=\{1\}/);
  assert.doesNotMatch(tablist, /<ScrollView[^>]*horizontal/);
  assert.doesNotMatch(tablist, /Platform\.OS|\b(?:IOS|Android)HotelTabs?\b/);

  assert.match(tablist, /style=\{s\.tabsRow\}/);
  assert.match(tablist, /s\.tab,/);
  assert.match(tablist, /accessibilityState=\{\{ selected: activeHotelTab === tab \}\}/);
  assert.match(tablist, /activeHotelTab === tab && \{ borderBottomColor: hotelAccent \}/);
  assert.match(tablist, /onPress=\{\(\) => selectHotelTab\(tab\)\}/);
});

test("the active shared native tab geometry cannot stack or fork by platform", () => {
  const shell = styleRule("tabsShell", "tabsRow");
  const row = styleRule("tabsRow", "tab");
  const tab = styleRule("tab", "tabText");
  const ownedGeometry = `${shell}\n${row}\n${tab}`;

  assert.match(shell, /width: "100%"/);
  assert.match(shell, /alignSelf: "stretch"/);
  assert.doesNotMatch(shell, /flexDirection:/);

  assert.match(row, /alignSelf: "stretch"/);
  assert.match(row, /flexDirection: "row"/);
  assert.match(row, /flexWrap: "nowrap"/);
  assert.doesNotMatch(row, /flexDirection: "column"|flexWrap: "wrap"/);

  assert.match(tab, /width: "33\.333%"/);
  assert.doesNotMatch(tab, /flexGrow: 1(?:\D|$)/);
  assert.doesNotMatch(tab, /flexShrink: 1/);
  assert.doesNotMatch(tab, /flexBasis: 0/);
  assert.match(tab, /minWidth: 0/);
  const minimumHeight = /minHeight: (\d+)/.exec(tab);
  assert.ok(minimumHeight, "tab must declare a minimum touch height");
  assert.ok(Number(minimumHeight[1]) >= 44, "tab touch height must be at least 44dp");

  assert.doesNotMatch(ownedGeometry, /Platform\.OS|\bios\b|\bandroid\b/i);
  assert.equal((hotel.match(/s\.tabsShell/g) ?? []).length, 1);
  assert.equal((hotel.match(/s\.tabsRow/g) ?? []).length, 1);
  assert.match(hotel, /stickyHeaderIndices=\{\[2\]\}/);
  assert.match(hotel, /const \[activeHotelTab, setActiveHotelTab\] = useState<HotelDetailTab>\("details"\)/);
});

test("the active selected underline remains tab-local on iOS and Android", () => {
  const shell = styleRule("tabsShell", "tabsRow");
  const tab = styleRule("tab", "tabText");

  assert.doesNotMatch(shell, /borderBottomWidth|borderBottomColor|hotelAccent/);
  assert.match(tab, /borderBottomWidth: 2/);
  assert.match(tab, /borderBottomColor: "transparent"/);
  assert.match(hotel, /activeHotelTab === tab && \{ borderBottomColor: hotelAccent \}/);
  assert.doesNotMatch(hotel, /s\.tabsShell,[\s\S]{0,160}activeHotelTab === tab/);
});
