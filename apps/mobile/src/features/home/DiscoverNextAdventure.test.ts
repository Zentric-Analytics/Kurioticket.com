import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const componentPath = "src/features/home/DiscoverNextAdventure.tsx";
const component = source(componentPath);
const home = source("src/features/flow/HomeFlowScreen.tsx");

test("DiscoverNextAdventure is present once between popular stays and deal promos", () => {
  assert.ok(existsSync(join(process.cwd(), componentPath)));
  assert.equal(home.match(/<DiscoverNextAdventure \/>/g)?.length, 1);
  const popular = home.indexOf("<PopularDestinationStays />");
  const discovery = home.indexOf("<DiscoverNextAdventure />");
  const promos = home.indexOf("<HomepageDealPromos />");
  assert.ok(popular < discovery && discovery < promos);
});

test("the section is a two-column wrapping grid without its own scroller or carousel", () => {
  assert.match(component, /columns: 2/);
  assert.match(component, /flexDirection: "row"/);
  assert.match(component, /flexWrap: "wrap"/);
  assert.match(component, /columnGap: DISCOVERY_GRID_LAYOUT\.columnGap/);
  assert.match(component, /rowGap: DISCOVERY_GRID_LAYOUT\.rowGap/);
  assert.match(component, /viewportWidth -[\s\S]*DISCOVERY_GRID_LAYOUT\.sectionSideInset \* 2 -[\s\S]*DISCOVERY_GRID_LAYOUT\.columnGap[\s\S]*DISCOVERY_GRID_LAYOUT\.columns/);
  assert.doesNotMatch(component, /ScrollView|FlatList|horizontal|carousel|snap/);
});

test("every card renders a full-width top image followed by its information panel", () => {
  const imageFrame = component.indexOf("testID={`discovery-image-frame-${adventure.id}`}");
  const contentPanel = component.indexOf("testID={`discovery-content-panel-${adventure.id}`}");
  assert.ok(imageFrame !== -1 && imageFrame < contentPanel);
  assert.match(component, /imageFrame: \{ width: "100%", height: DISCOVERY_GRID_LAYOUT\.imageHeight/);
  assert.match(component, /image: \{ width: "100%", height: "100%" \}/);

  const panelStart = component.indexOf("<View\n        style={[styles.contentPanel");
  const panelEnd = component.indexOf("</View>\n    </Pressable>", panelStart);
  const panel = component.slice(panelStart, panelEnd);
  assert.match(panel, /adventure\.title/);
  assert.match(panel, /\{route\}/);
  assert.match(panel, /ONE WAY · ECONOMY · 1 TRAVELER/);
  assert.match(panel, />From</);
  assert.doesNotMatch(component.slice(imageFrame, contentPanel), /ONE WAY|\{route\}|>From</);
});

test("favorite behavior and card navigation reuse the shared mobile implementations", () => {
  const imageFrame = component.indexOf("testID={`discovery-image-frame-${adventure.id}`}");
  const contentPanel = component.indexOf("testID={`discovery-content-panel-${adventure.id}`}");
  const imageContents = component.slice(imageFrame, contentPanel);
  assert.match(imageContents, /<AndroidFavoriteButton/);
  assert.match(imageContents, /event\.stopPropagation\(\);/);
  assert.match(component, /router\.push\(discoverAdventureNavigation\(adventure\)\)/);
  assert.match(component, /useSavedDestinations\(\)/);
});

test("one semantic-color implementation serves Android and iOS", () => {
  assert.match(component, /backgroundColor: ft\.colors\.card/);
  assert.match(component, /color: ft\.colors\.textPrimary/);
  assert.match(component, /color: ft\.colors\.textSecondary/);
  assert.match(component, /color: ft\.colors\.textMuted/);
  assert.doesNotMatch(component, /Platform\.OS|Platform|\.android\.tsx|\.ios\.tsx/);
  const files = readdirSync(join(process.cwd(), "src/features/home"));
  assert.deepEqual(files.filter((file) => /^DiscoverNextAdventure\.(android|ios)\.tsx$/.test(file)), []);
});

test("unrelated homepage section implementations remain outside this change", () => {
  assert.equal(home.match(/<PopularDestinationStays \/>/g)?.length, 1);
  assert.equal(home.match(/<HomepageDealPromos \/>/g)?.length, 1);
  assert.equal(home.match(/<RegionalDestinationRoutes \/>/g)?.length, 1);
});
