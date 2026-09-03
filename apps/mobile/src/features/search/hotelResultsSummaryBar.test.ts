import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const header = source.slice(source.indexOf("function HotelResultsHeader"), source.indexOf("const HotelResultsShortcut"));
const styles = source.slice(source.indexOf("const s0 = StyleSheet.create"));

test("Hotel initial summary is a themed web-parity bar separate from native Back", () => {
  assert.match(header, /hotelBackRow[\s\S]*?accessibilityLabel="Go back"[\s\S]*?<Pressable[\s\S]*?accessibilityLabel=\{accessibilityLabel\}[\s\S]*?onPress=\{onEdit\}/);
  assert.match(styles, /hotelSummaryBar: \{ minHeight: 64, borderWidth: 1, borderRadius: 13, paddingLeft: 16/);
  assert.match(header, /backgroundColor: theme\.surface[\s\S]*?theme\.dark \? theme\.border : "#D8E1EC"/);
  assert.match(header, /<SquarePen size=\{16\} strokeWidth=\{2\.2\} color=\{theme\.icon\}/);
  assert.doesNotMatch(header, />Edit</);
  assert.doesNotMatch(header, /Kurioticket|profile|account|hamburger|menu/i);
});

test("summary copy truncates safely and the decorative pen is not a nested button", () => {
  assert.match(header, /hotelSummaryCopy[\s\S]*?numberOfLines=\{1\}[\s\S]*?ellipsizeMode="tail"[\s\S]*?summary\.primary/);
  assert.match(header, /numberOfLines=\{1\}[\s\S]*?ellipsizeMode="tail"[\s\S]*?summary\.metadata/);
  assert.match(styles, /hotelSummaryCopy: \{ flex: 1, minWidth: 0/);
  assert.match(styles, /hotelSummaryEditSlot: \{ width: 44, minHeight: 44, flexShrink: 0/);
  assert.match(header, /<View accessible=\{false\} accessibilityElementsHidden style=\{s0\.hotelSummaryEditSlot\}>/);
  assert.equal((header.match(/<Pressable/g) ?? []).length, 2, "only Back and the whole summary bar are pressable");
});
