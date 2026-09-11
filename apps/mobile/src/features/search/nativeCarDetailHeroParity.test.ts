import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const native = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");

function style(name: string): string {
  const match = native.match(new RegExp(`${name}:\\{([^}]+)\\}`));
  assert.ok(match, `missing ${name} style`);
  return match[1];
}

const heroStart = native.indexOf("<View style={[s.hero,");
const imageStart = native.indexOf("<View style={s.imageBox}", heroStart);
const heroHeader = native.slice(heroStart, imageStart);

test("the canonical vehicle name precedes its category and remains the hero heading", () => {
  const title = heroHeader.indexOf("{result.modelName}");
  const category = heroHeader.indexOf("{result.categoryLabel.toUpperCase()}");
  assert.ok(title >= 0 && category > title);
  assert.match(heroHeader, /<View style=\{s\.titleCopy\}><Text accessibilityRole="header"[^>]*>\{result\.modelName\}<\/Text><Text style=\{s\.category\}>\{result\.categoryLabel\.toUpperCase\(\)\}<\/Text><\/View>/);
});

test("title copy and independent actions remain siblings in the top-aligned hero row", () => {
  assert.match(heroHeader, /<View style=\{s\.heroHeader\}><View style=\{s\.titleCopy\}>[\s\S]*<\/View><View style=\{s\.actions\}>/);
  for (const contract of ['flexDirection:"row"', 'alignItems:"flex-start"', 'justifyContent:"space-between"'])
    assert.ok(style("heroHeader").includes(contract), contract);
  for (const contract of ["flex:1", "minWidth:0"])
    assert.ok(style("titleCopy").includes(contract), contract);
  for (const contract of ['flexDirection:"row"', "flexShrink:0", "gap:0"])
    assert.ok(style("actions").includes(contract), contract);
});

test("visible actions align and group within preserved touch targets", () => {
  assert.match(heroHeader, /style=\{\[s\.action,s\.saveAction\]\}><Heart/);
  assert.match(heroHeader, /style=\{\[s\.action,s\.shareAction\]\}><Share2/);
  const action = style("action");
  assert.equal(Number(/width:(\d+)/.exec(action)?.[1]), 44);
  assert.equal(Number(/height:(\d+)/.exec(action)?.[1]), 44);
  assert.ok(Number(/width:(\d+)/.exec(action)?.[1]) >= 44);
  assert.ok(Number(/height:(\d+)/.exec(action)?.[1]) >= 44);
  assert.match(action, /justifyContent:"flex-start"/);
  const paddingTop = Number(/paddingTop:(\d+)/.exec(action)?.[1]);
  assert.ok(paddingTop >= 0 && paddingTop <= 3);
  assert.match(style("saveAction"), /alignItems:"flex-end"[^}]*paddingRight:[3-5]/);
  assert.match(style("shareAction"), /alignItems:"flex-start"[^}]*paddingLeft:[3-5]/);
});

test("hero alignment uses no positioning hacks", () => {
  for (const name of ["heroHeader", "titleCopy", "actions", "action", "saveAction", "shareAction"])
    assert.doesNotMatch(style(name), /position:"absolute"|margin(?:Left|Right|Top|Bottom):-|transform:|translate[XY]/);
});

test("category, favorite, and share contracts remain unchanged", () => {
  const category = style("category");
  for (const contract of ["fontSize:10", "lineHeight:14", 'fontWeight:"700"', "fontFamily:appFonts.bold", 'textTransform:"uppercase"', "letterSpacing:1.4", 'color:"#075EE8"'])
    assert.ok(category.includes(contract), contract);
  const marginTop = Number(/marginTop:(\d+)/.exec(category)?.[1] ?? 0);
  assert.ok(marginTop >= 0 && marginTop <= 2);
  assert.match(heroHeader, /<Heart size=\{20\} color=\{saved\.saved \? androidFavoriteColors\.savedStroke : androidFavoriteColors\.unsavedStroke\} fill=\{saved\.saved\?androidFavoriteColors\.savedFill:androidFavoriteColors\.unsavedFill\}/);
  assert.match(heroHeader, /accessibilityState=\{\{selected:saved\.saved\}\} onPress=\{saved\.toggle\}/);
  assert.match(heroHeader, /<Share2 size=\{19\} color=\{theme\.icon\}\/>/);
  assert.match(heroHeader, /accessibilityLabel="Share car" onPress=\{\(\)=>void Share\.share\(\{message:`\$\{result\.modelName\} — \$\{result\.categoryLabel\}`\}\)\}/);
});
