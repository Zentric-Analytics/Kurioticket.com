import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");
const component = source.slice(
  source.indexOf("export function DateStrip"),
  source.indexOf("export function Button"),
);
const styles = source.slice(source.indexOf("export const s = StyleSheet.create"));
const baseCard = styles.slice(styles.indexOf("  flightDate: {"), styles.indexOf("  dateActive:"));
const selectedCard = component.slice(
  component.indexOf("flightResults && active && {"),
  component.indexOf("pressed && s.datePressed"),
);

test("every date uses one borderless card structure and fixed dimensions", () => {
  assert.match(component, /visibleDates\.map[\s\S]*?<Pressable[\s\S]*?s\.date,[\s\S]*?s\.flightDate/);
  assert.match(component, /flightResults && \{ width: flightDateWidth \}/);
  assert.match(baseCard, /height: 76/);
  assert.match(baseCard, /borderRadius: 14/);
  assert.match(baseCard, /borderWidth: 0/);
  assert.doesNotMatch(baseCard, /borderWidth: 1|borderColor/);
  assert.doesNotMatch(selectedCard, /borderWidth|borderColor|width|height|borderRadius|padding/);
});

test("date cards use soft native elevation and selected state only strengthens it", () => {
  assert.match(baseCard, /shadowColor: "#18305B"/);
  assert.match(baseCard, /shadowOffset: \{ width: 0, height: 4 \}/);
  assert.match(baseCard, /shadowOpacity: 0\.1/);
  assert.match(baseCard, /shadowRadius: 10/);
  assert.match(baseCard, /elevation: 3/);
  assert.match(selectedCard, /backgroundColor: theme\.dark \? "#142B55" : "#F0F5FF"/);
  assert.match(selectedCard, /elevation: 5/);
  assert.match(component, /theme\.dark \? "#000000" : "#18305B"/);
  assert.match(component, /theme\.dark \? "#142B55" : "#F0F5FF"/);
  assert.match(component, /backgroundColor: theme\.surface/);
});

test("empty fares reserve the same price row and press behavior stays intact", () => {
  assert.match(component, /const hasPrice = prices\[i\] != null/);
  assert.match(component, /hasPrice \|\| flightResults[\s\S]*?<Text/);
  assert.match(component, /hasPrice[\s\S]*?: ""/);
  assert.match(styles, /flightDatePrice: \{ width: "100%", height: 20/);
  assert.match(component, /onPress=\{\(\) => onSelect\(iso\)\}/);
  assert.match(component, /style=\{\(\{ pressed \}\) =>/);
});

test("horizontal rail keeps scrolling and includes breathing room for shadows", () => {
  assert.match(component, /<ScrollView\s+horizontal/);
  assert.match(styles, /flightDateRail: \{ height: 96 \}/);
  assert.match(styles, /flightDates: \{ paddingHorizontal: 16, paddingVertical: 8 \}/);
});
