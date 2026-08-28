import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(`src/features/flow/${name}`, "utf8");

test("programmatic location fills suppress refetch without clearing visible results", () => {
  const cases = [
    [read("FlightSearchPanel.tsx"), "if (filledQuery.current === query)", "setMatches([])"],
    [read("PackageSearchForm.tsx"), "if(filledQuery.current===query)", "setChoices([])"],
    [read("HotelSearchPanel.tsx"), "if (programmaticFilledQuery.current === trimmedQuery)", "setSuggestions([])"],
    [read("CarSearchPanel.tsx"), "if(filledQuery.current===query)", "setSuggestions([])"],
  ] as const;
  for (const [source, marker, clearing] of cases) {
    const start = source.indexOf(marker);
    assert.ok(start >= 0, marker);
    const branch = source.slice(start, source.indexOf("return;", start) + 7);
    assert.ok(branch.includes("setLoading(false)"));
    assert.ok(branch.includes("setError(false)"));
    assert.ok(!branch.includes(clearing));
  }
});

test("valid drafts defend every location picker from contradictory empty copy", () => {
  assert.match(read("FlightSearchPanel.tsx"), /ListEmptyComponent=\{draftAirport\?null:/);
  assert.match(read("HotelSearchPanel.tsx"), /ListEmptyComponent=\{draft\?null:/);
  assert.match(read("CarSearchPanel.tsx"), /ListEmptyComponent=\{draft\?null:/);
  assert.match(read("PackageSearchForm.tsx"), /!draft&&choices\.length===0/);
});
