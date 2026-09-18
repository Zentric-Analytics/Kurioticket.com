import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const normal = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const sandbox = readFileSync("src/features/search/NativeKayakCarDetailScreen.tsx", "utf8");

function compact(source: string): string {
  return source.replace(/\s+/g, "");
}

function style(source: string, name: string): string {
  const match = source.match(new RegExp(`${name}:\\s*\\{([^}]+)\\}`));
  assert.ok(match, `missing ${name} style`);
  return compact(match[1]);
}

for (const [kind, source] of [["approved", normal], ["KAYAK sandbox", sandbox]] as const) {
  test(`${kind} Cars detail uses a Hotel-style hero hierarchy and sticky tabs`, () => {
    const detail = compact(source.slice(source.indexOf("function CarDetailContent") >= 0
      ? source.indexOf("function CarDetailContent")
      : source.indexOf("function KayakCarDetailContent")));
    const image = detail.indexOf('style={[s.imageBox,{height:heroMediaHeight,backgroundColor:theme.surface}]}');
    const identity = detail.indexOf("style={s.identityBlock}", image);
    const specs = detail.indexOf("style={s.specs}", identity);
    const tabs = detail.indexOf("style={[s.carsTabsShell", specs);
    assert.ok(image >= 0 && image < identity && identity < specs && specs < tabs);
    assert.match(source, /stickyHeaderIndices=\{\[1\]\}/);
    assert.doesNotMatch(source, /carBackHeader|backLink|backText|>Back to Cars results</);
  });

  test(`${kind} Cars detail floats independent Back, Save, and Share controls`, () => {
    assert.match(source, /accessibilityLabel="Back to Cars results"/);
    assert.match(source, /onPress=\{returnToCarResults\} style=\{\[s\.heroBack/);
    assert.match(source, /accessibilityLabel=\{saved\.saved\s*\?\s*"Remove car from saved"\s*:\s*"Save car"\}/);
    assert.match(source, /accessibilityState=\{\{\s*selected:\s*saved\.saved\s*\}\} onPress=\{saved\.toggle\} style=\{s\.heroAction\}/);
    assert.match(source, /accessibilityLabel="Share car"/);
    assert.match(source, /Share\.share\(\{\s*message:/);
    assert.match(source, /style=\{s\.heroAction\}><Share2/);

    const back = style(source, "heroBack");
    for (const value of ['position:"absolute"', "left:20", "width:44", "height:44", "borderRadius:22", "zIndex:20"]) assert.ok(back.includes(value), value);
    const actions = style(source, "heroActions");
    for (const value of ['position:"absolute"', "right:20", "width:96", "height:44", "borderRadius:22", 'flexDirection:"row"', "zIndex:20"]) assert.ok(actions.includes(value), value);
    assert.doesNotMatch(back, /backgroundColor/);
    assert.doesNotMatch(actions, /backgroundColor/);
    assert.match(source, /import \{ CarDetailGlassSurface \} from "\.\/CarDetailGlassSurface"/);
    assert.doesNotMatch(source, /carInformationSurface|#E7EBF1/);
    assert.equal((source.match(/<CarDetailGlassSurface /g) ?? []).length, 2);
    assert.match(source, /<CarDetailGlassSurface dark=\{theme\.dark\} style=\{s\.heroBackGlass\}/);
    assert.match(source, /<CarDetailGlassSurface dark=\{theme\.dark\} style=\{s\.heroActionsGlass\}/);
    const action = style(source, "heroAction");
    for (const value of ["width:48", "height:44", 'alignItems:"center"', 'justifyContent:"center"']) assert.ok(action.includes(value), value);
  });

  test(`${kind} Cars detail preserves the canvas, theme-safe media, and balanced specs`, () => {
    assert.match(source, /const CAR_DETAIL_LIGHT_CANVAS = "#F5F7FB"/);
    assert.match(source, /carCanvasColor\s*=\s*theme\.dark\s*\?\s*theme\.background\s*:\s*CAR_DETAIL_LIGHT_CANVAS/);
    assert.match(source, /s\.imageBox,\s*\{[^}]*backgroundColor:\s*theme\.surface\s*\}/);
    const imageBox = style(source, "imageBox");
    assert.ok(imageBox.includes('width:"100%"'));
    assert.ok(imageBox.includes('overflow:"hidden"'));
    assert.doesNotMatch(imageBox, /aspectRatio/);
    assert.doesNotMatch(imageBox, /marginHorizontal|borderRadius/);
    const specs = style(source, "specs");
    for (const value of ['flexDirection:"row"', 'flexWrap:"wrap"', 'justifyContent:"space-between"', "paddingHorizontal:16"]) assert.ok(specs.includes(value), value);
    assert.ok(style(source, "spec").includes('width:"42%"'));
  });
}

test("Cars content section headings share the reduced typography", () => {
  for (const source of [normal, sandbox]) {
    for (const heading of ["compareHeading", "pickupHeading", "locationHeading"]) {
      const rule = style(source, heading);
      for (const value of ["fontSize:12", "lineHeight:18", 'fontWeight:"700"', "fontFamily:appFonts.bold"]) assert.ok(rule.includes(value), `${heading}: ${value}`);
    }
  }
});
