import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const native = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");

function style(name: string): string {
  const match = native.match(new RegExp(`${name}:\\{([^}]+)\\}`));
  assert.ok(match, `missing ${name} style`);
  return match[1];
}

test("Cars Back header is a fixed sibling before the detail ScrollView", () => {
  const safeAreaPosition = native.indexOf("<SafeAreaView", native.indexOf("function CarDetailContent"));
  const backHeaderPosition = native.indexOf("s.carBackHeader", safeAreaPosition);
  const scrollPosition = native.indexOf("<ScrollView", backHeaderPosition);
  const heroPosition = native.indexOf("<View style={[s.hero", scrollPosition);
  const tabsPosition = native.indexOf("<View style={[s.carsTabsShell", heroPosition);
  const pagePosition = native.indexOf("<View style={s.page}", tabsPosition);

  assert.ok(safeAreaPosition >= 0);
  assert.ok(safeAreaPosition < backHeaderPosition);
  assert.ok(backHeaderPosition < scrollPosition);
  assert.ok(scrollPosition < heroPosition);
  assert.ok(heroPosition < tabsPosition);
  assert.ok(tabsPosition < pagePosition);
  assert.match(native, /stickyHeaderIndices=\{\[1\]\}/);
  assert.doesNotMatch(native, /stickyHeaderIndices=\{\[2\]\}/);

  const fixedHeader = native.slice(backHeaderPosition, scrollPosition);
  assert.match(fixedHeader, /accessibilityRole="button"/);
  assert.match(fixedHeader, /accessibilityLabel="Back to Cars results"/);
  assert.match(fixedHeader, /onPress=\{returnToCarResults\}/);
  assert.match(fixedHeader, /<ArrowLeft size=\{17\}/);
  assert.match(fixedHeader, />Back to Cars results</);
  assert.doesNotMatch(native.slice(scrollPosition, heroPosition), /Back to Cars results/);
  assert.equal((native.match(/>Back to Cars results</g) ?? []).length, 1);
});

test("Cars Back header uses Hotel-like geometry without positioning or a divider", () => {
  const header = style("carBackHeader");
  for (const contract of ["minHeight:48", "paddingHorizontal:16", 'justifyContent:"center"']) {
    assert.ok(header.includes(contract), contract);
  }
  assert.doesNotMatch(
    header,
    /borderBottomWidth|borderBottomColor|borderTopWidth|borderTopColor|shadowColor|shadowOpacity|shadowRadius|shadowOffset|elevation|position|top:|transform|translateY|marginTop:-|marginBottom:-/,
  );

  const link = style("backLink");
  for (const contract of ["minHeight:44", 'alignSelf:"flex-start"', 'flexDirection:"row"', 'alignItems:"center"', "gap:7"]) {
    assert.ok(link.includes(contract), contract);
  }
  assert.doesNotMatch(link, /paddingHorizontal/);

  const text = style("backText");
  for (const contract of ["fontSize:14", "lineHeight:19", 'fontWeight:"700"', "fontFamily:appFonts.bold"]) {
    assert.ok(text.includes(contract), contract);
  }
});

test("Cars header and scrolling content share a theme-safe canvas without a hero top rule", () => {
  assert.match(native, /const carCanvasColor=theme\.dark\?theme\.background:theme\.surface/);
  assert.match(native, /<SafeAreaView style=\{\[s\.safe,\{backgroundColor:carCanvasColor\}\]\}/);
  assert.match(native, /s\.carBackHeader,\{backgroundColor:carCanvasColor\}/);
  assert.match(native, /<ScrollView[^>]*style=\{\{backgroundColor:carCanvasColor\}\}/);
  assert.doesNotMatch(native, /carCanvasColor[^;]*["']white["']/i);

  const hero = style("hero");
  assert.match(hero, /borderBottomWidth:1/);
  assert.doesNotMatch(hero, /borderTopWidth|borderTopColor/);
});
