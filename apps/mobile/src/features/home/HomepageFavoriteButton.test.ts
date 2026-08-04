import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const favorite = source("src/features/home/HomepageFavoriteButton.tsx");
const popular = source("src/features/home/PopularDestinationStays.tsx");
const adventure = source("src/features/home/DiscoverNextAdventure.tsx");

test("homepage favorite buttons use the website-style white circular surface", () => {
  assert.match(favorite, /background:\s*"#FFFFFF"/);
  assert.match(favorite, /width:\s*42/);
  assert.match(favorite, /height:\s*42/);
  assert.match(favorite, /borderRadius:\s*21/);
  assert.match(favorite, /shadowOpacity:\s*0\.16/);
  assert.match(favorite, /elevation:\s*5/);
});

test("inactive and active hearts use the same pink red website color family", () => {
  assert.match(favorite, /active:\s*"#E92D55"/);
  assert.match(favorite, /inactive:\s*"#E92D55"/);
  assert.match(favorite, /fill=\{saved \? homepageFavoriteColors\.active : "none"\}/);
  assert.match(favorite, /color=\{homepageFavoriteColors\.active\}/);
});

test("no homepage favorite button keeps the old blue filled background", () => {
  for (const [name, file] of [["popular", popular], ["adventure", adventure], ["button", favorite]] as const) {
    assert.doesNotMatch(file, /backgroundColor:\s*"rgba\(6,76,247,0\.92\)"/, `${name} removed blue saved background`);
    assert.doesNotMatch(file, /color="white" size=\{22\}/, `${name} removed white-on-blue heart icon`);
    assert.doesNotMatch(file, /heartSaved/, `${name} does not keep a second homepage heart design`);
  }
});

test("all homepage destination and recommendation cards share one favorite component", () => {
  assert.match(popular, /<HomepageFavoriteButton[\s\S]*toggle\(destination\.id\)/);
  assert.match(adventure, /<HomepageFavoriteButton[\s\S]*toggle\(card\.id\)/);
  assert.equal((`${popular}\n${adventure}`.match(/<HomepageFavoriteButton/g) ?? []).length, 2);
});

test("favorite interactions preserve guest sign-in and authenticated save behavior", () => {
  const hook = source("src/storage/useSavedDestinations.ts");
  const store = source("src/storage/savedDestinationsStore.ts");
  assert.match(hook, /favoriteAction\(userId\) === "sign-in"/);
  assert.match(hook, /showFavoriteSignInPrompt\(\); return;/);
  assert.match(store, /next\.has\(id\) \? next\.delete\(id\) : next\.add\(id\)/);
  assert.match(popular, /event\.stopPropagation\(\);\s*toggle\(destination\.id\);/);
  assert.match(adventure, /event\.stopPropagation\(\);\s*toggle\(card\.id\);/);
});
