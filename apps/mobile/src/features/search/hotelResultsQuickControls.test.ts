import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const flight = readFileSync("src/features/search/FlightResultsQuickControls.tsx", "utf8");

const block = (source: string, name: string, next: string) => source.slice(source.indexOf(`${name}:`), source.indexOf(`${next}:`, source.indexOf(`${name}:`)));

test("Hotel rail keeps Filter Price Stars Amenities without Flight business controls", () => {
  const wholeRail = screen.slice(screen.indexOf("const filterRail"), screen.indexOf("const resultContent"));
  const rail = wholeRail.slice(wholeRail.indexOf(") : ("));
  const labels = ["Filter", "Price", "Stars", "Amenities"].map((label) => rail.indexOf(`label="${label}"`));
  assert.ok(labels.every((index) => index >= 0) && labels.every((index, i) => i === 0 || labels[i - 1] < index));
  assert.match(rail, /hotelOptions\.price \?/);
  assert.match(rail, /openHotelQuickFilter\("price"\)/);
  assert.match(rail, /starRatings\.length \|\| undefined/);
  assert.match(rail, /facilities\.length \|\| undefined/);
  assert.doesNotMatch(rail, /hotelSortLabel|Cheapest|Airlines|Stops|Airports/);
});

test("Hotel controls mirror current Flight geometry and typography", () => {
  const styles = screen.slice(screen.indexOf("const s0 = StyleSheet.create"));
  assert.match(styles, /hotelFilterRail: \{ height: 48, flexGrow: 0 \}/);
  assert.match(styles, /hotelFilterContent: \{ paddingHorizontal: 16, paddingBottom: 4, gap: 8, alignItems: "center", flexWrap: "nowrap" \}/);
  assert.match(styles, /hotelShortcut: \{ height: 44, minHeight: 44,[^}]*gap: 6,[^}]*borderWidth: 1, borderRadius: 11, paddingHorizontal: 14 \}/);
  assert.match(styles, /hotelShortcutLabel: \{ fontSize: 14, lineHeight: 18, fontWeight: "600", fontFamily: appFonts\.semibold \}/);
  assert.match(styles, /hotelShortcutCount: \{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6/);
  assert.match(styles, /hotelShortcutCountText: \{ fontSize: 11, lineHeight: 14, fontWeight: "600", fontFamily: appFonts\.semibold \}/);
  for (const contract of [/rail: \{ height: 48/, /control: \{[\s\S]*?height: 44,[\s\S]*?borderRadius: 11,[\s\S]*?paddingHorizontal: 14/, /label: \{[\s\S]*?fontSize: 14,[\s\S]*?lineHeight: 18/, /count: \{[\s\S]*?minWidth: 20,[\s\S]*?height: 20/]) assert.match(flight, contract);
});

test("Hotel controls use Flight light tokens and semantic dark tokens", () => {
  const component = screen.slice(screen.indexOf("const HotelResultsShortcut"), screen.indexOf("function FlightCard"));
  for (const token of ["#D8E1EC", "#142033", "#004BB8", "#64748B", "#F8FAFC", "#FFFFFF", "rgba(0,75,184,0.08)"]) assert.match(component, new RegExp(token.replace(/[().]/g, "\\$&")));
  for (const semantic of ["theme.surface", "theme.border", "theme.textPrimary", "theme.textSecondary"]) assert.match(component, new RegExp(semantic.replace(".", "\\.")));
  assert.match(component, /#8FB5FF/);
});

test("every Hotel control has a rotating down chevron and Filter has the Flight icon", () => {
  const rail = screen.slice(screen.indexOf("const filterRail"), screen.indexOf("const resultContent"));
  const component = screen.slice(screen.indexOf("const HotelResultsShortcut"), screen.indexOf("function FlightCard"));
  assert.match(rail, /label="Filter"[^>]*icon[^>]*expanded=\{hotelFilterOpen\}/);
  assert.match(component, /<SlidersHorizontal accessible=\{false\} size=\{16\} strokeWidth=\{2\.2\}/);
  assert.match(component, /<ChevronDown accessible=\{false\} size=\{14\} strokeWidth=\{1\.9\}/);
  assert.match(component, /style=\{expanded \? s0\.hotelShortcutChevronExpanded : undefined\}/);
  assert.match(screen, /hotelShortcutChevronExpanded: \{ transform: \[\{ rotate: "180deg" \}\] \}/);
  assert.doesNotMatch(component, /ChevronRight|measureInWindow|Anchor/);
});
