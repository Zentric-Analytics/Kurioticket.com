import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");
const component = source.slice(source.indexOf("export function DateStrip"), source.indexOf("export function Button"));
const styles = source.slice(source.indexOf("export const s = StyleSheet.create"));
const baseCard = styles.slice(styles.indexOf("  flightDate: {"), styles.indexOf("  flightDateSelectedAccent:"));
const accent = styles.slice(styles.indexOf("  flightDateSelectedAccent:"), styles.indexOf("  dateActive:"));
const weekday = styles.slice(styles.indexOf("  flightDateWeekday:"), styles.indexOf("  flightDateLabel:"));
const dateLabel = styles.slice(styles.indexOf("  flightDateLabel:"), styles.indexOf("  flightDatePrice:"));
const priceLabel = styles.slice(styles.indexOf("  flightDatePrice:"), styles.indexOf("  button:"));
const nearbyInsight = styles.slice(styles.indexOf("  nearbyDateInsight:"), styles.indexOf("  nearbyDateInsightText:"));
const nearbyInsightText = styles.slice(styles.indexOf("  nearbyDateInsightText:"), styles.indexOf("  flightDateRail:"));

test("flight result tiles use bordered fare-calendar geometry without elevation", () => {
  for (const expected of [/minWidth: 76/, /maxWidth: 96/, /height: 70/, /borderRadius: 8/, /borderWidth: 1/, /position: "relative"/, /overflow: "hidden"/]) assert.match(baseCard, expected);
  assert.doesNotMatch(baseCard, /shadow|elevation/);
  assert.match(component, /backgroundColor: theme\.surface,[\s\S]*?borderColor: theme\.border/);
  assert.match(component, /backgroundColor: theme\.dark \? "#142B55" : "#F0F5FF",[\s\S]*?borderColor: ui\.blue/);
});

test("selected tiles have a decorative two-pixel top accent", () => {
  assert.match(component, /flightResults && active \? <View accessible=\{false\} style=\{s\.flightDateSelectedAccent\}/);
  for (const expected of [/position: "absolute"/, /top: 0/, /left: 8/, /right: 8/, /height: 2/, /backgroundColor: ui\.blue/]) assert.match(accent, expected);
});

test("flight results order uppercase date, uppercase weekday, then fare", () => {
  const flightMarkup = component.slice(component.indexOf("{flightResults ? ("), component.indexOf(") : (", component.indexOf("{flightResults ? (")));
  assert.ok(flightMarkup.indexOf("shortDate(iso).toUpperCase()") < flightMarkup.indexOf('weekday: "short" }).toUpperCase()'));
  assert.match(dateLabel, /fontSize: 11[\s\S]*?fontWeight: "700"/);
  assert.match(weekday, /fontSize: 10[\s\S]*?fontWeight: "600"/);
  assert.match(priceLabel, /fontSize: 11[\s\S]*?fontWeight: "600"/);
  assert.match(dateLabel, /fontFamily: appFonts\.bold/);
  assert.match(weekday, /fontFamily: appFonts\.semibold/);
  assert.match(priceLabel, /fontFamily: appFonts\.semibold/);
});

test("tiles distinguish progressive fare states and disable only selected or loading dates", () => {
  assert.match(component, /: "—"/);
  assert.match(component, /"No fare"/);
  assert.match(component, /"Try later"/);
  assert.match(component, /"•••"/);
  assert.match(component, /"fare not checked"/);
  assert.match(component, /const disabled = active \|\| \(flightResults && fareState\?\.status === "loading"\)/);
  assert.match(component, /accessibilityState=\{\{ selected: active, disabled \}\}/);
  assert.match(component, /disabled=\{disabled\}/);
  assert.match(component, /onPress=\{\(\) => onSelect\(iso\)\}/);
  assert.match(component, /hitSlop=\{flightResults \? 6 : undefined\}/);
});

test("horizontal rail remains swipeable with three full tiles and a fourth peek", () => {
  assert.match(component, /<ScrollView[\s\S]*?horizontal/);
  assert.match(component, /ref=\{railRef\}/);
  const scrollViewOpeningTag = component.slice(component.indexOf("<ScrollView"), component.indexOf(">", component.indexOf("<ScrollView")) + 1);
  assert.doesNotMatch(scrollViewOpeningTag, /disabled=/);
  assert.match(styles, /flightDateNavigator: \{ height: 82, paddingHorizontal: 0 \}/);
  assert.match(styles, /flightDateRail: \{ height: 82 \}/);
  assert.match(styles, /flightDates: \{ paddingHorizontal: 16, paddingVertical: 5 \}/);
  assert.match(component, /const flightDateWidth = Math\.min\(96, Math\.max\(76, \(windowWidth - 43\) \/ 3\.65\)\)/);
  for (const windowWidth of [320, 360, 375, 390, 412, 430, 480]) {
    const cardWidth = Math.min(96, Math.max(76, (windowWidth - 43) / 3.65));
    const peek = windowWidth - 16 - cardWidth * 3 - 9 * 3;
    assert.ok(peek > 0, `${windowWidth}px fits three full cards`);
    if (windowWidth <= 390) assert.ok(peek < cardWidth, `${windowWidth}px exposes only part of card four`);
  }
});

test("long prices remain one shrinkable line", () => {
  assert.match(component, /numberOfLines=\{1\}/);
  assert.match(component, /adjustsFontSizeToFit/);
  assert.match(component, /minimumFontScale=\{flightResults \? 0\.78 : 0\.85\}/);
  assert.match(priceLabel, /width: "100%"[\s\S]*?textAlign: "center"/);
});

test("optional cheaper-nearby insight stays compact, plain, and safely pressable", () => {
  assert.match(component, /nearbySuggestion && displayCurrency \? \(/);
  assert.match(component, /onPress=\{\(\) => onSelect\(nearbySuggestion\.date\)\}/);
  assert.match(component, /hitSlop=\{\{ top: 8, bottom: 8, left: 6, right: 6 \}\}/);
  for (const expected of [/minHeight: 28/, /justifyContent: "center"/, /paddingHorizontal: 14/, /marginTop: -2/]) {
    assert.match(nearbyInsight, expected);
  }
  for (const expected of [/fontSize: 11/, /lineHeight: 15/, /fontWeight: "600"/]) {
    assert.match(nearbyInsightText, expected);
  }
  assert.match(component, /fontFamily: appFonts\.semibold/);
  assert.match(component, /numberOfLines=\{1\} ellipsizeMode="tail"/);
  assert.doesNotMatch(nearbyInsight, /backgroundColor|borderWidth|shadow|elevation/);
});
