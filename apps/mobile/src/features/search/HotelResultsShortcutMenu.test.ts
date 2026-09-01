import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const menu = readFileSync("src/features/search/HotelResultsShortcutMenu.tsx", "utf8");
const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
test("Stars uses ordered source counts, shared selection state, and radio semantics", () => {
  assert.match(menu, /\[null, 5, 4, 3, 2, 1\]/);
  assert.match(menu, /options\.starCounts\[rating \?\? 0\]/);
  assert.match(menu, /filters\.starRating === rating/);
  assert.ok(menu.includes('accessibilityRole={kind === "stars" ? "radiogroup" : undefined}'));
  assert.match(menu, /accessibilityRole="radio"/);
  assert.doesNotMatch(menu, />Filters<|Clear all|>Done</);
});

test("Star actions map All and ratings while preserving the rest of HotelFilters", () => {
  assert.match(menu, /return \{ \.\.\.filters, starRating \}/);
  assert.match(menu, /selectHotelShortcutStar\(current, rating\)/);
  assert.match(menu, /onChange\(\(current\) => selectHotelShortcutStar[\s\S]*onClose\(\)/);
});

test("Amenities uses real options, checkbox state/counts, and toggles only facilities", () => {
  assert.match(menu, /options\.facilities\.map/);
  assert.match(menu, /filters\.facilities\.includes\(option\.value\)/);
  assert.match(menu, /\{option\.count\}/);
  assert.match(menu, /accessibilityRole="checkbox"/);
  assert.match(menu, /return \{[\s\S]*\.\.\.filters,[\s\S]*facilities: filters\.facilities\.includes\(value\)/);
  assert.match(menu, /filters\.facilities\.filter\(\(facility\) => facility !== value\)/);
  assert.match(menu, /\[\.\.\.filters\.facilities, value\]/);
});

test("Amenities stays open while selecting and popup content is bounded and scrollable", () => {
  const amenityBranch = menu.slice(menu.indexOf(": options.facilities.map"));
  assert.match(amenityBranch, /onPress=\{\(\) => onChange\(\(current\) => toggleHotelShortcutFacility/);
  assert.doesNotMatch(amenityBranch.slice(0, amenityBranch.indexOf("</ScrollView>")), /onClose\(\)/);
  assert.match(menu, /<ScrollView/);
  assert.match(menu, /MAX_MENU_HEIGHT = 288/);
  assert.match(menu, /maxHeight/);
});

test("transparent anchored overlay supports viewport clamping and every dismissal path", () => {
  assert.match(menu, /transparent/);
  assert.match(menu, /presentationStyle="overFullScreen"/);
  assert.doesNotMatch(menu, /rgba\(0,\s*0,\s*0/);
  assert.match(menu, /anchor\.x/);
  assert.match(menu, /anchor\.y \+ anchor\.height \+ MENU_GAP/);
  assert.match(menu, /viewportWidth - HORIZONTAL_GUTTER - width/);
  assert.match(menu, /onPress=\{onClose\}/);
  assert.match(menu, /onRequestClose=\{onClose\}/);
  assert.match(menu, /onAccessibilityEscape=\{onClose\}/);
});

test("Results measures independent triggers and shares hotelFilters with sheet and menu", () => {
  assert.match(screen, /starsShortcutRef = useRef<View>\(null\)/);
  assert.match(screen, /amenitiesShortcutRef = useRef<View>\(null\)/);
  assert.match(screen, /ref\.current\?\.measureInWindow\(\(x, y, width, height\)/);
  assert.match(screen, /setHotelShortcutAnchor\(\{ x, y, width, height \}\)/);
  assert.match(screen, /<HotelResultsShortcutMenu[\s\S]*filters=\{hotelFilters\}[\s\S]*onChange=\{setHotelFilters\}/);
  assert.match(screen, /<HotelFilterSheet[\s\S]*filters=\{hotelFilters\}[\s\S]*onChange=\{setHotelFilters\}/);
  assert.doesNotMatch(screen, /openHotelFilters\("rating"\)|openHotelFilters\("facilities"\)/);
});
