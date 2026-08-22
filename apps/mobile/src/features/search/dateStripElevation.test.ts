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
const commonCard = styles.slice(styles.indexOf("  date: {"), styles.indexOf("  flightDate: {"));
const baseCard = styles.slice(styles.indexOf("  flightDate: {"), styles.indexOf("  dateActive:"));
const weekday = styles.slice(styles.indexOf("  flightDateWeekday:"), styles.indexOf("  flightDateLabel:"));
const dateLabel = styles.slice(styles.indexOf("  flightDateLabel:"), styles.indexOf("  flightDatePrice:"));
const priceLabel = styles.slice(styles.indexOf("  flightDatePrice:"), styles.indexOf("  button:"));
const selectedCard = component.slice(
  component.indexOf("flightResults && active && {"),
  component.indexOf("pressed && s.datePressed"),
);

test("every date uses one borderless card structure and fixed dimensions", () => {
  assert.match(component, /visibleDates\.map[\s\S]*?<Pressable[\s\S]*?s\.date,[\s\S]*?s\.flightDate/);
  assert.match(component, /flightResults && \{ width: flightDateWidth \}/);
  assert.match(baseCard, /minWidth: 90/);
  assert.match(baseCard, /maxWidth: 112/);
  assert.match(baseCard, /height: 60/);
  assert.match(baseCard, /paddingHorizontal: 4/);
  assert.match(baseCard, /paddingVertical: 3/);
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
  assert.match(component, /const price = priceByDate\[iso\]/);
  assert.match(component, /const hasPrice = price != null/);
  assert.match(component, /hasPrice \|\| flightResults[\s\S]*?<Text/);
  assert.match(component, /hasPrice[\s\S]*?: ""/);
  assert.match(styles, /flightDatePrice: \{ width: "100%", height: 19/);
  assert.match(component, /onPress=\{\(\) => onSelect\(iso\)\}/);
  assert.match(component, /hitSlop=\{flightResults \? 4 : undefined\}/);
  assert.match(component, /style=\{\(\{ pressed \}\) =>/);
});

test("flight date typography stays centered with a clear three-level hierarchy", () => {
  assert.match(commonCard, /alignItems: "center"/);
  assert.match(commonCard, /justifyContent: "center"/);
  for (const style of [weekday, dateLabel, priceLabel]) assert.match(style, /textAlign: "center"/);

  assert.match(weekday, /fontSize: 12/);
  assert.match(weekday, /fontWeight: "500"/);
  assert.match(weekday, /lineHeight: 15/);
  assert.match(dateLabel, /fontSize: 14/);
  assert.match(dateLabel, /fontWeight: "600"/);
  assert.match(dateLabel, /lineHeight: 18/);
  assert.match(priceLabel, /fontSize: 16/);
  assert.match(priceLabel, /fontWeight: "700"/);
  assert.match(priceLabel, /lineHeight: 19/);
});

test("selected and unselected labels retain semantic light and dark hierarchies", () => {
  assert.match(component, /flightResults && \{ color: theme\.textSecondary \}/);
  assert.match(component, /flightResults && \{ color: theme\.textPrimary \}/);
  assert.match(component, /theme\.dark \? "#A9C4FF" : "#5276C5"/);
  assert.match(component, /theme\.dark \? "#8FB5FF" : ui\.blue/);
});

test("horizontal rail keeps scrolling and includes breathing room for shadows", () => {
  assert.match(component, /<ScrollView\s+horizontal/);
  assert.match(component, /showsHorizontalScrollIndicator=\{false\}/);
  assert.match(styles, /flightDateRail: \{ height: 80 \}/);
  assert.match(styles, /flightDates: \{ paddingHorizontal: 16, paddingVertical: 7 \}/);
});

test("responsive card widths expose part of the fourth card", () => {
  assert.match(
    component,
    /const flightDateWidth = Math\.min\(112, Math\.max\(90, \(windowWidth - 43\) \/ 3\.4\)\)/,
  );

  for (const windowWidth of [320, 360, 390, 430, 480]) {
    const cardWidth = Math.min(112, Math.max(90, (windowWidth - 43) / 3.4));
    const visibleAfterThreeCards = windowWidth - 16 - cardWidth * 3 - 9 * 3;

    assert.ok(visibleAfterThreeCards > 0, `${windowWidth}px fits three full cards`);
    assert.ok(
      visibleAfterThreeCards < cardWidth,
      `${windowWidth}px exposes only part of the fourth card`,
    );
  }
});
