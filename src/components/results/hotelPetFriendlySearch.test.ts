import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const searchBar = readFileSync(
  new URL("../search/HotelSearchBar.tsx", import.meta.url),
  "utf8",
);
const results = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

test("Hotel search persists the pet-friendly toggle in the results URL", () => {
  assert.match(
    searchBar,
    /useState\(\s*\(\) => searchParams\.get\("petFriendly"\) === "true"/,
  );
  assert.match(
    searchBar,
    /if \(hotelPetFriendly\) \{\s*params\.set\("petFriendly", "true"\);\s*\}/,
  );
});

test("Hotel Results restores pet-friendly search as the canonical facility filter", () => {
  assert.match(results, /petFriendly: params\.get\("petFriendly"\) === "true"/);
  assert.match(results, /const petFriendlyOnly = searchInput\.petFriendly === true/);
  assert.match(
    results,
    /key !== "facilities" \|\| !petFriendlyOnly[\s\S]*"petFriendly"/,
  );
  assert.match(
    results,
    /hotelMatchesFacilityFilters\(hotel, selectedFilters\.facilities\)/,
  );
});

test("pet-friendly context survives Hotel Results search identity and details links", () => {
  assert.match(results, /\.\.\.\(petFriendlyOnly \? \{ petFriendly: "true" \} : \{\}\)/);
  assert.match(
    results,
    /petFriendlyOnly \? "pets" : ""/,
  );
});
