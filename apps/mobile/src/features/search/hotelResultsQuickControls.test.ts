import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const flight = readFileSync("src/features/search/FlightResultsQuickControls.tsx", "utf8");

const block = (source: string, name: string, next: string) => source.slice(source.indexOf(`${name}:`), source.indexOf(`${next}:`, source.indexOf(`${name}:`)));

test("Hotel rail keeps Filter Price Stars Facilities Room & bed while Sort lives in the results row", () => {
  const wholeRail = screen.slice(screen.indexOf("const filterRail"), screen.indexOf("const hotelIntroContent"));
  const rail = wholeRail.slice(wholeRail.indexOf(") : ("));
  const railOpeningTag = rail.slice(rail.indexOf("<ScrollView"), rail.indexOf(">", rail.indexOf("<ScrollView")) + 1);
  const labels = [
    rail.indexOf('label="Filter"'),
    rail.indexOf("label={hotelPriceShortcutLabel}"),
    rail.indexOf("label={hotelStarsShortcutLabel}"),
    rail.indexOf("label={hotelFacilitiesShortcutLabel}"),
    rail.indexOf("label={hotelRoomTypesShortcutLabel}"),
  ];
  assert.ok(labels.every((index) => index >= 0) && labels.every((index, i) => i === 0 || labels[i - 1] < index));
  assert.doesNotMatch(rail, /label=\{hotelSort === defaultHotelSort \? "Sort"/);
  assert.match(rail, /hotelOptions\.price \?/);
  assert.match(rail, /openHotelQuickFilter\("price"\)/);
  assert.match(rail, /label=\{hotelStarsShortcutLabel\} selected=\{hotelFilters\.starRatings\.length > 0\}/);
  assert.match(rail, /label=\{hotelFacilitiesShortcutLabel\} selected=\{hotelFilters\.facilities\.length > 0\}/);
  assert.match(rail, /label=\{hotelRoomTypesShortcutLabel\} selected=\{hotelFilters\.roomTypes\.length > 0\}/);
  assert.match(rail, /hotelQuickFilter === "facilities"/);
  assert.match(rail, /openHotelQuickFilter\("facilities"\)/);
  assert.match(rail, /hotelQuickFilter === "roomTypes"/);
  assert.match(rail, /openHotelQuickFilter\("roomTypes"\)/);
  assert.match(screen, /const showRoomAndBedShortcut = hotelOptions\.roomTypes\.length > 0 \|\| hotelFilters\.roomTypes\.length > 0/);
  assert.match(rail, /showRoomAndBedShortcut \? <HotelResultsShortcut label=\{hotelRoomTypesShortcutLabel\}/);
  assert.doesNotMatch(screen, /hotelOptions\.roomTypes\.length\s*(?:>=\s*2|>\s*1)/);
  for (const contract of [
    /<ScrollView\s+horizontal/,
    /showsHorizontalScrollIndicator=\{false\}/,
    /alwaysBounceHorizontal=\{false\}/,
    /bounces=\{false\}/,
    /overScrollMode="never"/,
    /contentContainerStyle=\{s0\.hotelFilterContent\}/,
  ]) assert.match(railOpeningTag, contract);
  assert.match(rail, /style=\{s0\.hotelFilterRail\}/);
  assert.doesNotMatch(rail, /theme\.dark \? theme\.surface : "#FFFFFF"/);
  assert.doesNotMatch(rail, /scrollEnabled=\{false\}|contentOffset|scrollTo\(|scrollToEnd\(|negativeMargin|translateX|position: "absolute"/);
  assert.doesNotMatch(rail, /label="Amenities"|openHotelQuickFilter\("amenities"\)/);
  assert.doesNotMatch(rail, /Cheapest|Airlines|Stops|Airports/);

  const summary = screen.slice(screen.indexOf("function HotelResultsSummaryRow"), screen.indexOf("function PriceAlert"));
  assert.match(summary, /Sort: \{sortLabel\}/);
  assert.match(summary, /accessibilityLabel=\{`Sort, \$\{sortLabel\}`\}/);
  assert.match(summary, /onPress=\{onSort\}/);
  assert.match(summary, /<ChevronDown/);
  assert.match(screen, /sortLabel=\{hotelSortLabel\(hotelSort\)\}/);
  assert.match(screen, /onSort=\{\(\) => openHotelQuickFilter\("sort"\)\}/);
});

test("Hotel controls use the measured reference capsule geometry while keeping shared accessible targets", () => {
  const styles = screen.slice(screen.indexOf("const s0 = StyleSheet.create"));
  assert.match(styles, /hotelFilterRail: \{ height: 44, flexGrow: 0 \}/);
  assert.match(styles, /hotelFilterContent: \{ paddingLeft: 12, paddingRight: 16, gap: 6, alignItems: "center", flexWrap: "nowrap" \}/);
  assert.doesNotMatch(block(styles, "hotelFilterContent", "hotelFilterSectionHeader"), /paddingBottom/);
  assert.match(styles, /hotelShortcutTouchTarget: \{ minWidth: 44, minHeight: 44, justifyContent: "center" \}/);
  assert.match(styles, /hotelShortcut: \{ position: "relative", height: 40,[^}]*borderWidth: 1, borderRadius: 10, paddingHorizontal: 6 \}/);
  assert.match(styles, /hotelShortcutMainAction: \{ minHeight: 38,[^}]*gap: 4/);
  assert.match(styles, /hotelShortcutMainActionWithClear: \{ paddingRight: 20 \}/);
  assert.match(styles, /hotelShortcutClear: \{ position: "absolute", right: 3, top: 9, width: 20, height: 20/);
  const component = screen.slice(screen.indexOf("const HotelResultsShortcut"), screen.indexOf("function FlightCard"));
  assert.match(component, /<View style=\{s0\.hotelShortcutTouchTarget\}>[\s\S]*?<Pressable[\s\S]*?s0\.hotelShortcutMainAction/);
  assert.match(styles, /hotelShortcutLabel: \{ fontSize: 13, lineHeight: 16, fontWeight: "600", fontFamily: appFonts\.semibold \}/);
  assert.match(styles, /hotelShortcutCount: \{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6/);
  assert.match(styles, /hotelShortcutCountText: \{ fontSize: 11, lineHeight: 14, fontWeight: "600", fontFamily: appFonts\.semibold \}/);
  for (const contract of [/rail: \{ height: 44/, /touchTarget: \{[\s\S]*?minHeight: 44/, /capsule: \{[\s\S]*?height: 36[\s\S]*?borderRadius: 9/, /label: \{[\s\S]*?fontSize: 13[\s\S]*?lineHeight: 16/, /count: \{[\s\S]*?minWidth: 20[\s\S]*?height: 20/]) assert.match(flight, contract);
  assert.match(flight, /capsule: \{[\s\S]*?paddingHorizontal: 10/);
});

test("Hotel controls use normal tokens when idle and font-color fill when a quick filter is selected", () => {
  const component = screen.slice(screen.indexOf("const HotelResultsShortcut"), screen.indexOf("function FlightCard"));
  for (const token of ["#D8E1EC", "#142033", "#64748B", "#F1F5F9", "#FFFFFF"]) {
    assert.match(component, new RegExp(token.replace(/[().]/g, "\\test("Hotel controls use the normal neutral filter tokens in light and dark themes", () => {
  const component = screen.slice(screen.indexOf("const HotelResultsShortcut"), screen.indexOf("function FlightCard"));
  for (const token of ["#D8E1EC", "#142033", "#64748B", "#F1F5F9", "#FFFFFF"]) {
    assert.match(component, new RegExp(token.replace(/[().]/g, "\\$&")));
  }
  for (const semantic of ["theme.surface", "theme.border", "theme.textPrimary", "theme.textSecondary", "theme.background"]) {
    assert.match(component, new RegExp(semantic.replace(".", "\\.")));
  }
  assert.match(component, /borderColor: active \? foreground : border/);
  assert.match(component, /backgroundColor: surface/);
  assert.match(component, /color: foreground/);
  assert.doesNotMatch(component, /#EAF2FF|active && !theme\.dark \? ui\.blue/);
});")));
  }
  assert.match(component, /const selectedVisual = Boolean\(selected\)/);
  assert.match(component, /const selectedForeground = "#FFFFFF"/);
  assert.match(component, /const selectedSurface = theme\.dark \? theme\.textPrimary : "#142033"/);
  assert.match(component, /borderColor: selectedVisual \? selectedSurface : border/);
  assert.match(component, /backgroundColor: selectedVisual \? selectedSurface : surface/);
  assert.match(component, /color: selectedVisual \? selectedForeground : foreground/);
  assert.doesNotMatch(component, /#EAF2FF|active && !theme\.dark \? ui\.blue/);
});

test("Hotel Filter launcher has sliders without a chevron while quick filters keep rotating chevrons", () => {
  const rail = screen.slice(screen.indexOf("const filterRail"), screen.indexOf("const hotelIntroContent"));
  const component = screen.slice(screen.indexOf("const HotelResultsShortcut"), screen.indexOf("function FlightCard"));
  const shortcut = (label: string) => { const start = rail.indexOf(`label="${label}"`); return rail.slice(start, rail.indexOf("/>", start) + 2); };
  const filter = shortcut("Filter");
  assert.match(filter, /accessibilityLabel="Filters"/);
  assert.match(filter, /count=\{activeHotelFilters \|\| undefined\}/);
  assert.match(filter, /\bicon\b/);
  assert.match(filter, /showChevron=\{false\}/);
  assert.match(filter, /expanded=\{hotelFilterOpen\}/);
  assert.match(filter, /onPress=\{\(\) => openHotelFilters\("all"\)\}/);
  assert.match(rail, /label=\{hotelPriceShortcutLabel\}/);
  assert.match(rail, /label=\{hotelStarsShortcutLabel\}/);
  assert.match(rail, /label=\{hotelFacilitiesShortcutLabel\}/);
  assert.match(rail, /label=\{hotelRoomTypesShortcutLabel\}/);
  assert.match(component, /showChevron = true/);
  assert.match(component, /<SlidersHorizontal accessible=\{false\} size=\{16\} strokeWidth=\{2\.2\}/);
  assert.match(component, /\{showChevron && !onClear \? <ChevronDown accessible=\{false\} size=\{13\} strokeWidth=\{1\.9\}/);
  assert.match(component, /style=\{expanded \? s0\.hotelShortcutChevronExpanded : undefined\}/);
  assert.match(screen, /hotelShortcutChevronExpanded: \{ transform: \[\{ rotate: "180deg" \}\] \}/);
  assert.doesNotMatch(component, /ChevronRight|measureInWindow|Anchor/);
});


test("Hotel quick shortcuts show selected values without a duplicate applied-filter row", () => {
  assert.match(screen, /nativeHotelShortcutPrice/);
  assert.match(screen, /hotelPriceShortcutLabel/);
  assert.match(screen, /hotelStarsShortcutLabel/);
  assert.match(screen, /hotelFacilitiesShortcutLabel/);
  assert.match(screen, /hotelRoomTypesShortcutLabel/);
  assert.match(screen, /selected=\{hotelPriceFilterActive\}/);
  assert.match(screen, /selected=\{hotelFilters\.facilities\.length > 0\}/);
  assert.doesNotMatch(screen, /const hotelFilterChips =/);
  assert.doesNotMatch(screen, /contentContainerStyle=\{s0\.hotelFilterChips\}/);
  assert.doesNotMatch(screen, /Remove \$\{chip\.label\} filter/);
});


test("selected Hotel quick shortcuts use the font-color box with white copy while Filter keeps its aggregate count", () => {
  const component = screen.slice(screen.indexOf("const HotelResultsShortcut"), screen.indexOf("function FlightCard"));
  assert.match(component, /const active = selected \?\? Boolean\(count\)/);
  assert.match(component, /const selectedVisual = Boolean\(selected\)/);
  assert.match(component, /borderColor: selectedVisual \? selectedSurface : border/);
  assert.match(component, /backgroundColor: selectedVisual \? selectedSurface : surface/);
  assert.match(component, /color: selectedVisual \? selectedForeground : foreground/);
  const rail = screen.slice(screen.indexOf("const filterRail"), screen.indexOf("const hotelIntroContent"));
  assert.match(rail, /label="Filter"[\s\S]*count=\{activeHotelFilters \|\| undefined\}/);
  assert.doesNotMatch(rail, /label=\{hotelPriceShortcutLabel\}[^>]*count=/);
});

test("active Hotel quick shortcuts expose an X clear action instead of a chevron", () => {
  const rail = screen.slice(screen.indexOf("const filterRail"), screen.indexOf("const hotelIntroContent"));
  const component = screen.slice(screen.indexOf("const HotelResultsShortcut"), screen.indexOf("function FlightCard"));
  assert.match(rail, /onClear=\{hotelPriceFilterActive \? \(\) => clearHotelQuickFilter\("price"\) : undefined\}/);
  assert.match(rail, /onClear=\{hotelFilters\.facilities\.length \? \(\) => clearHotelQuickFilter\("facilities"\) : undefined\}/);
  assert.match(component, /onClear\?: \(\) => void/);
  assert.match(component, /Clear \$\{label\} filter/);
  assert.match(component, /<X accessible=\{false\} size=\{13\}/);
  assert.match(component, /<X accessible=\{false\} size=\{13\} strokeWidth=\{2\} color=\{selectedForeground\}/);
  assert.match(component, /hotelShortcutMainActionWithClear/);
  assert.match(component, /showChevron && !onClear/);
});
