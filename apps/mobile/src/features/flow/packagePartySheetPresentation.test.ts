import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { includedProducts, type PackageMode } from "./packageSearchModel";

const source = readFileSync("src/features/flow/PackageSearchForm.tsx", "utf8");
const sheet = source.slice(source.indexOf("const PACKAGE_TRAVELER_ROWS"), source.indexOf("const styles"));
const styles = source.slice(source.indexOf("const styles"));

test("package party sheet exposes the web-parity labels and mode-specific groups", () => {
  for (const copy of ["Adults", "18+ years", "Children", "Ages 2–17", "Infants on lap", "Under 2 years", "Rooms", "Separate rooms", "Pet-friendly rooms", "Only show stays that allow pets"]) {
    assert.match(sheet, new RegExp(copy.replace(/[+]/g, "\\+")));
  }

  assert.match(sheet, /included\.hotel \? "Travelers & Rooms" : "Travelers"/);
  assert.match(sheet, /included\.flight \? PACKAGE_TRAVELER_ROWS : PACKAGE_TRAVELER_ROWS\.slice\(0, 2\)/);
  assert.match(sheet, /included\.hotel \? <View style=\{\[styles\.partyCard/);
});

test("all four package modes retain their exact traveler, room, and pet content", () => {
  const content = (mode: PackageMode) => {
    const included = includedProducts(mode);
    return ["Adults", "Children", ...(included.flight ? ["Infants on lap"] : []), ...(included.hotel ? ["Rooms", "Pet-friendly rooms"] : [])];
  };

  assert.deepEqual(content("hotel-flight"), ["Adults", "Children", "Infants on lap", "Rooms", "Pet-friendly rooms"]);
  assert.deepEqual(content("flight-car"), ["Adults", "Children", "Infants on lap"]);
  assert.deepEqual(content("hotel-car"), ["Adults", "Children", "Rooms", "Pet-friendly rooms"]);
  assert.deepEqual(content("hotel-flight-car"), ["Adults", "Children", "Infants on lap", "Rooms", "Pet-friendly rooms"]);
});

test("package party rows use distinct decorative Lucide icons and icon circles", () => {
  assert.match(source, /Baby, BedDouble, Minus, PersonStanding, Plus, UserRound, type LucideIcon/);
  assert.match(sheet, /key: "adults"[^\n]+icon: UserRound/);
  assert.match(sheet, /key: "children"[^\n]+icon: PersonStanding/);
  assert.match(sheet, /key: "infants"[^\n]+icon: Baby/);
  assert.match(sheet, /<PackagePartyRow icon=\{BedDouble\} label="Rooms"/);
  assert.match(sheet, /accessible=\{false\} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/);
  assert.match(styles, /partyIcon:\{width:44,height:44,borderRadius:22,flexShrink:0/);
});

test("package counters use accessible Lucide controls with accurate disabled states", () => {
  assert.match(sheet, /icon=\{Minus\}/);
  assert.match(sheet, /icon=\{Plus\}/);
  assert.doesNotMatch(sheet, />−<|>\+</);
  assert.match(sheet, /accessibilityRole="button" accessibilityLabel=\{label\} accessibilityState=\{\{ disabled \}\} disabled=\{disabled\}/);
  assert.match(sheet, /value <= \(row\.key === "adults" \? 1 : 0\)/);
  assert.match(sheet, /totalTravelers >= maximumTravelers/);
  assert.match(sheet, /row\.key === "infants" && value >= draft\.adults/);
  assert.match(sheet, /draft\.rooms <= 1/);
  assert.match(sheet, /draft\.rooms >= 6/);
  assert.match(styles, /partyCounterTarget:\{width:44,height:44/);
  assert.match(styles, /partyCounterCircle:\{width:40,height:40/);
});

test("package descriptions remain flexible and the native pet Switch keeps draft semantics", () => {
  assert.doesNotMatch(sheet, /numberOfLines=\{[1-9]/);
  assert.match(styles, /partyRow:\{minHeight:88/);
  assert.match(styles, /partyCopy:\{flex:1,minWidth:0/);
  assert.match(styles, /partyCounter:\{flexShrink:0/);
  assert.match(sheet, /<Switch accessibilityLabel="Pet-friendly rooms" accessibilityRole="switch" accessibilityState=\{\{ checked: draft\.petFriendly \}\} value=\{draft\.petFriendly\} onValueChange=\{petFriendly => setDraft\(current => \(\{ \.\.\.current, petFriendly \}\)\)\}/);
  assert.doesNotMatch(sheet, /accessibilityRole="checkbox"|CheckBox|type="checkbox"/);
  assert.match(sheet, /<PrimaryButton label="Done" icon=\{null\} onPress=\{\(\) => onDone\(draft\)\}/);
});
