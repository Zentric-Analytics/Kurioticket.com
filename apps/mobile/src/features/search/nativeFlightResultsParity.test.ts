import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as filters from "./flightFilters";
const read = (name: string) => readFileSync(`src/features/search/${name}`, "utf8");
const screen = read("ApprovedResultsScreen.tsx"), controls = read("FlightResultsQuickControls.tsx"), shell = read("FlightResultsSheetShell.tsx"), filter = read("FlightFilterSheet.tsx"), dates = read("SearchUi.tsx");
test("one sticky rail precedes dates, Track Price, summary and virtualized cards", () => {
 const list=screen.slice(screen.indexOf("<Animated.SectionList"),screen.indexOf("<HotelResultsHeader",screen.indexOf("<Animated.SectionList")));
 assert.doesNotMatch(list,/ListHeaderComponent=\{flightDateStrip\}/);
 assert.match(list,/renderSectionHeader[\s\S]*\{filterRail\}[\s\S]*stickySectionHeadersEnabled/);
 assert.match(list,/flightResultsIntro[\s\S]*\{flightDateStrip\}[\s\S]*PriceAlert[\s\S]*FlightResultsSummaryRow[\s\S]*FlightCard/);
 assert.equal(screen.match(/<FlightResultsQuickControls/g)?.length,1);
 assert.doesNotMatch(screen,/Back.to.top|ArrowUp|scrollToTop/);
});
test("native pressable summary retains Back and Edit with approved header sizing",()=>{
 const header=screen.slice(screen.indexOf("function FlightResultsHeader"),screen.indexOf("function HotelResultsHeader"));
 assert.match(header,/onPress=\{\(\) => router.back\(\)\}/);assert.match(header,/onPress=\{onEdit\}/);assert.match(header,/<SquarePen/);
 assert.match(screen,/flightRouteSummaryCard: \{[^\n]*minHeight: 62/);assert.match(screen,/flightRouteSummaryText: \{[^\n]*fontWeight: "700"/);
});
test("content shares 12px gutters and card rhythm while chips retain accessible compact targets",()=>{
 for(const style of ["flightCardItem","flightAlertOuter","flightResultsSummaryRow"])assert.match(screen,new RegExp(`${style}: \\{[^\\n]*(?:paddingHorizontal|marginHorizontal): 12`));
 assert.match(screen,/flightCardItem: \{[^\n]*paddingBottom: 12/);assert.match(controls,/paddingLeft: 12/);assert.match(controls,/minHeight: 44/);assert.match(controls,/height: 36/);assert.match(controls,/gap: 6/);
});
test("independent accessible group clear actions preserve tap versus drag behavior",()=>{
 for(const pattern of [/onClear/,/copy\.clearFilters/,/<X accessible=\{false\}/,/isFlightQuickControlTap/,/onAccessibilityAction/])assert.match(controls,pattern);
 for(const group of ["airlines","stops","airports"])assert.ok(controls.includes(`clearGroup("${group}")`));
 assert.match(screen,/clearFlightQuickFilterGroup/);
});
test("clear only its group including legacy maxStops without mutating unrelated filters",()=>{
 const clear=(filters as unknown as {clearFlightQuickFilterGroup?:(f:filters.FlightFilters,g:"airlines"|"stops"|"airports")=>filters.FlightFilters}).clearFlightQuickFilterGroup;
 assert.equal(typeof clear,"function");
 const f={...filters.emptyFlightFilters(),airlines:["Air A"],stops:["one" as const],maxStops:1 as const,fromAirports:["SFO"],toAirports:["LOS"],maximumPrice:400,baggageIncluded:true};
 assert.deepEqual(clear!(f,"airlines"),{...f,airlines:[]});assert.deepEqual(clear!(f,"stops"),{...f,stops:[],maxStops:null});assert.deepEqual(clear!(f,"airports"),{...f,fromAirports:[],toAirports:[]});assert.deepEqual(f.airlines,["Air A"]);
});
test("date geometry retains widths, 70px cells, nearby fetching and horizontal scrolling",()=>{
 assert.match(dates,/flightDateNavigator: \{ height: 80/);assert.match(dates,/flightDateRail: \{ height: 80/);assert.match(dates,/flightDates: \{ paddingHorizontal: 12,[^\n]*gap: 8/);assert.match(dates,/flightDate: \{[\s\S]*?height: 70/);assert.match(dates,/Math\.min\(96, Math\.max\(76,/);assert.match(dates,/deriveNearbyDateSuggestion/);
});
test("compact sheet density and backdrop are Flight opt-ins with native modal safe areas",()=>{
 assert.match(shell,/flightResultsPresentation = false/);assert.match(shell,/flightPresentationHeader: \{ minHeight: 56/);assert.match(shell,/flightPresentationScrim: \{ backgroundColor: "rgba\(8, 18, 35, 0\.52\)"/);
 assert.match(filter,/flightResultsPresentation/);assert.match(read("FlightSortSheet.tsx"),/flightResultsPresentation/);
 for(const file of ["HotelResultsQuickFilterSheet.tsx","CarResultsQuickFilterSheet.tsx"])assert.doesNotMatch(read(file),/flightResultsPresentation/);
 assert.match(filter,/row:\{minHeight:44/);assert.match(filter,/rowText:\{fontSize:13,fontWeight:"400"/);assert.match(filter,/selectedRowText/);assert.match(filter,/viewButton:\{[^\n]*minHeight:44/);
});
test("quick row counts retain full-filter price intelligence",()=>{assert.match(filter,/quickFilterCount/);assert.match(filter,/copy\.fromPrice\(price\)/);assert.match(filter,/matchingFlightCount/);});
test("scoped palette does not migrate unrelated global native tokens",()=>{
 assert.match(screen,/product === "flight" \? <FlightResultsPresentationProvider>/);assert.match(read("FlightResultsState.tsx"),/useFlightResultsTheme/);assert.match(read("HotelPriceAlert.tsx"),/useFlightResultsTheme/);assert.match(read("FlightRangeSlider.tsx"),/useFlightResultsUi/);
 const theme=readFileSync("src/theme/AppTheme.tsx","utf8");assert.match(theme,/background: "#FAFBFF"/);assert.match(theme,/priceAlertSurface: "#EDF6FF"/);
});

test("terminal Results states retain dates below the sticky rail", () => {
 const footer = screen.slice(screen.indexOf("ListFooterComponent={terminalFlightState"), screen.indexOf("showsVerticalScrollIndicator={true}", screen.indexOf("ListFooterComponent={terminalFlightState")));
 assert.match(footer, /\{flightDateStrip\}[\s\S]*<FlightResultsState/);
});

test("light Flight Results uses tinted header canvas with a white summary and white sticky rail", () => {
 const header = screen.slice(screen.indexOf("function FlightResultsHeader"), screen.indexOf("function HotelResultsHeader"));
 const list = screen.slice(screen.indexOf("<Animated.SectionList"), screen.indexOf("<HotelResultsHeader", screen.indexOf("<Animated.SectionList")));
 assert.match(screen, /<FlightResultsHeader[\s\S]*?backgroundColor=\{flightCanvasColor\}/);
 assert.match(list, /s0\.flightFilterSectionHeader, \{ backgroundColor: theme\.dark \? flightCanvasColor : flightResultsColors\.surface \}/);
 assert.match(header, /backgroundColor: theme\.surface/);
 assert.doesNotMatch(header, /borderWidth: theme\.dark \? 1 : 0/);
 assert.match(list, /s0\.flightResultsIntro, \{ backgroundColor: flightCanvasColor \}/);
});

test("date selection and journey label use their exact mobile Results accent roles", () => {
 const presentation = read("flightResultsPresentation.ts");
 assert.match(presentation, /dateAccent: "#075EE8"/);
 assert.match(presentation, /dateSelectedSurface: "rgba\(239, 246, 255, 0\.6\)"/);
 assert.match(presentation, /journeyLabel: "#0057E7"/);
 assert.match(dates, /backgroundColor: theme\.dark \? "#142B55" : flightResultsColors\.dateSelectedSurface/);
 assert.match(dates, /borderColor: theme\.dark \? "#8FB5FF" : flightResultsColors\.dateAccent/);
 assert.match(dates, /flightDateSelectedAccent, \{ backgroundColor: theme\.dark \? "#8FB5FF" : flightResultsColors\.dateAccent \}/);
 assert.match(screen, /s0\.journeyLabel, \{ color: theme\.dark \? "#8FB5FF" : flightResultsColors\.journeyLabel \}/);
});

