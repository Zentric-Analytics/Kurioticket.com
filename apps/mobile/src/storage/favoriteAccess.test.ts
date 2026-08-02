import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { favoriteAction } from "./favoriteAccess";

const source = (path: string) => readFileSync(path, "utf8");

test("guest favorite attempts require sign-in and authenticated attempts toggle", () => {
  assert.equal(favoriteAction(null), "sign-in");
  assert.equal(favoriteAction("stable-user-id"), "toggle");
});

test("favorite prompt offers dismissal and the existing sign-in flow", () => {
  const hook = source("src/storage/useSavedDestinations.ts");
  assert.match(hook, /Sign in to save favorites/);
  assert.match(hook, /Not now/);
  assert.match(hook, /\(tabs\)\/profile\/sign-in/);
  assert.match(hook, /favoriteAction\(userId\).*showFavoriteSignInPrompt\(\).*return/s);
});

test("every existing favorite-bearing section uses the protected shared hook", () => {
  for (const path of ["src/features/home/PopularDestinationStays.tsx", "src/features/home/DiscoverNextAdventure.tsx", "src/features/explore/ExploreScreen.tsx"]) {
    const contents = source(path);
    assert.match(contents, /useSavedDestinations\(\)/, path);
    assert.match(contents, /stopPropagation\(\)/, `${path} keeps card navigation isolated from heart presses`);
  }
});

test("saved storage is scoped by stable session user ID and ignores unowned legacy values", () => {
  const storage = source("src/storage/savedDestinationsStorage.ts");
  assert.match(storage, /userKey\(userId\)/);
  assert.doesNotMatch(storage, /writeSavedDestinationIds\(migrated\)/);
});
