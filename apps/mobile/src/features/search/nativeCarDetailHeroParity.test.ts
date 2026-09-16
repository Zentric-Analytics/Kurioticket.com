import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const native = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");

function styleRule(name: string, nextName: string): string {
  const start = native.indexOf(`${name}:{`);
  const end = native.indexOf(`${nextName}:{`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return native.slice(start, end);
}

const heroStart = native.indexOf("<View style={[s.hero,");
const imageStart = native.indexOf("<View style={[s.imageBox", heroStart);
const identityStart = native.indexOf("<View style={s.identityBlock}>", imageStart);
const specsStart = native.indexOf("<View style={s.specs}>", identityStart);
const tabsStart = native.indexOf("s.carsTabsShell", specsStart);
const scrollEnd = native.indexOf("</ScrollView>", tabsStart);
const backStart = native.indexOf('accessibilityLabel="Back to Cars results"', scrollEnd);
const actionsStart = native.indexOf("<View style={[s.heroActions", backStart);

test("vehicle media leads the Hotel-style Cars hero before identity, specs, and tabs", () => {
  assert.ok(heroStart >= 0);
  assert.ok(imageStart > heroStart);
  assert.ok(identityStart > imageStart);
  assert.ok(specsStart > identityStart);
  assert.ok(tabsStart > specsStart);
  assert.match(native.slice(imageStart, identityStart), /accessibilityLabel=\{result\.imageAlt\}[^>]*resizeMode="cover"/);
  assert.doesNotMatch(native.slice(heroStart, imageStart), /result\.modelName|result\.categoryLabel|heroHeader|titleCopy/);
});

test("vehicle identity remains the accessible name and category directly below the media", () => {
  const identity = native.slice(identityStart, specsStart);
  const title = identity.indexOf("{result.modelName}");
  const category = identity.indexOf("{result.categoryLabel.toUpperCase()}");
  assert.ok(title >= 0 && category > title);
  assert.match(identity, /<Text accessibilityRole="header"[^>]*>\{result\.modelName\}<\/Text>/);
  assert.match(identity, /<Text style=\{s\.category\}>\{result\.categoryLabel\.toUpperCase\(\)\}<\/Text>/);
  assert.match(styleRule("identityBlock", "category"), /paddingHorizontal:16[^}]*paddingTop:12/);

  const categoryStyle = styleRule("category", "title");
  for (const contract of ["fontSize:10", "lineHeight:14", 'fontWeight:"700"', "fontFamily:appFonts.bold", 'textTransform:"uppercase"', "letterSpacing:1.4", 'color:"#075EE8"']) {
    assert.ok(categoryStyle.includes(contract), contract);
  }
});

test("Hotel-style Back and Save Share controls float outside scrolling content", () => {
  assert.ok(scrollEnd >= 0 && backStart > scrollEnd && actionsStart > backStart);
  assert.equal((native.match(/accessibilityLabel="Back to Cars results"/g) ?? []).length, 1);
  assert.doesNotMatch(native, />Back to Cars results<\/Text>/);
  assert.match(native, /accessibilityLabel="Back to Cars results" onPress=\{returnToCarResults\} style=\{\[s\.heroBack,\{top:inset\.top\+12\}\]\}/);

  const back = styleRule("heroBack", "heroActions");
  for (const contract of ['position:"absolute"', "left:20", "width:44", "height:44", "borderRadius:22", 'backgroundColor:"#FFFFFF"', 'alignItems:"center"', 'justifyContent:"center"', "zIndex:20", "elevation:10"]) {
    assert.ok(back.includes(contract), contract);
  }

  const actions = styleRule("heroActions", "heroAction");
  for (const contract of ['position:"absolute"', "right:20", "width:96", "height:44", "borderRadius:22", 'backgroundColor:"#FFFFFF"', 'flexDirection:"row"', 'overflow:"hidden"', "zIndex:20", "elevation:10"]) {
    assert.ok(actions.includes(contract), contract);
  }

  const action = styleRule("heroAction", "hero");
  for (const contract of ["width:48", "height:44", 'alignItems:"center"', 'justifyContent:"center"']) {
    assert.ok(action.includes(contract), contract);
  }
});

test("favorite and share behavior survive relocation into independent hero actions", () => {
  const controls = native.slice(backStart, native.indexOf("{offer?<View style={[s.dock", actionsStart));
  assert.match(controls, /accessibilityLabel=\{saved\.saved\?"Remove car from saved":"Save car"\}/);
  assert.match(controls, /accessibilityState=\{\{selected:saved\.saved\}\} onPress=\{saved\.toggle\} style=\{s\.heroAction\}/);
  assert.match(controls, /<Heart size=\{22\} strokeWidth=\{2\} color=\{saved\.saved\?androidFavoriteColors\.savedStroke:androidFavoriteColors\.unsavedStroke\} fill=\{saved\.saved\?androidFavoriteColors\.savedFill:androidFavoriteColors\.unsavedFill\}\/\>/);
  assert.match(controls, /accessibilityLabel="Share car" onPress=\{\(\)=>void Share\.share\(\{message:`\$\{result\.modelName\} — \$\{result\.categoryLabel\}`\}\)\} style=\{s\.heroAction\}/);
  assert.match(controls, /<Share2 size=\{21\} color="#0F172A"\/\>/);
  assert.equal((controls.match(/style=\{s\.heroAction\}/g) ?? []).length, 2);
});

test("vehicle image well is full-width, theme-safe, and keeps the Cars media ratio", () => {
  assert.match(native, /s\.imageBox,\{backgroundColor:theme\.surface\}/);
  const imageBox = styleRule("imageBox", "mediaStage");
  for (const contract of ['width:"100%"', "aspectRatio:16/10", 'overflow:"hidden"']) {
    assert.ok(imageBox.includes(contract), contract);
  }
  assert.doesNotMatch(imageBox, /marginHorizontal|borderRadius|backgroundColor/);
  assert.match(styleRule("mediaStage", "image"), /flex:1[^}]*marginTop:16/);
  assert.match(styleRule("image", "unavailable"), /width:"100%"[^}]*height:"100%"/);
});
