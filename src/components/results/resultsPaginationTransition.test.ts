import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const read = (name: string) => fs.readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

for (const [vertical, file, skeleton] of [
  ["Cars", "CarsResultsClient.tsx", "CarCardSkeleton"],
  ["Hotels", "HotelResultsClient.tsx", "HotelCardSkeleton"],
  ["Flights", "FlightResultsClient.tsx", "FlightCardSkeleton"],
] as const) {
  test(`${vertical} pagination preserves geometry and uses card skeletons`, () => {
    const source = read(file);
    assert.match(source, /paginationPendingPage/);
    assert.match(source, /getBoundingClientRect\(\)\.height/);
    assert.match(source, /minHeight: paginationMinHeight/);
    assert.match(source, /aria-busy=/);
    assert.match(source, new RegExp(skeleton));
    if (vertical !== "Hotels") assert.match(source, /scrollToResultsAndWait/);
  });
}

test("Cars pagination switches every control through an instant page-top transition", () => {
  const source = read("CarsResultsClient.tsx");
  const start = source.indexOf("const changePage");
  const end = source.indexOf("const setTransition", start);
  const changePage = source.slice(start, end);
  assert.match(
    changePage,
    /setPaginationPendingPage\(page\)[\s\S]*scrollToResultsAndWait\(\{ top: 0 \}, \{ behavior: "instant" \}\)[\s\S]*setCurrentPage\(page\)/,
  );
  assert.doesNotMatch(changePage, /resultsStartRef/);

  const paginationStart = source.lastIndexOf('aria-label="Car results pagination"');
  const pagination = source.slice(
    paginationStart,
    source.indexOf("</nav>", paginationStart),
  );
  assert.match(pagination, /onClick=\{\(\) => changePage\(pagination\.currentPage - 1\)\}/);
  assert.match(pagination, /onClick=\{\(\) => changePage\(item\)\}/);
  assert.match(pagination, /onClick=\{\(\) => changePage\(pagination\.currentPage \+ 1\)\}/);
});

test("Flight pagination defers local commit and mirrors URL without Next navigation", () => {
  const source = read("FlightResultsClient.tsx");
  const start = source.indexOf("const changeResultsPage");
  const end = source.indexOf("useEffect", start);
  const pagination = source.slice(start, end);
  assert.match(pagination, /await scrollToResultsAndWait[\s\S]*setStandaloneResultsPage\(page\)/);
  assert.match(pagination, /window\.history\.replaceState/);
  assert.doesNotMatch(pagination, /router\.push/);
  assert.match(source, /paginationPendingPage !== validResultsPage/);
});

test("Hotel pagination masks an instant results-start handoff before revealing cards", () => {
  const source = read("HotelResultsClient.tsx");
  const start = source.indexOf("async function changeResultsPage");
  const end = source.indexOf("useEffect", start);
  const pagination = source.slice(start, end);
  assert.match(pagination, /setPaginationPendingPage\(target\)[\s\S]*requestAnimationFrame\(\(\) => requestAnimationFrame[\s\S]*window\.scrollTo\(\{ top: resultsTop, behavior: "auto" \}\)[\s\S]*setCurrentResultsPage\(target\)[\s\S]*setTimeout\(resolve, 320\)[\s\S]*setPaginationPendingPage\(null\)/);
  assert.doesNotMatch(pagination, /behavior: "smooth"|\.focus\(/);
  assert.match(source, /paginationPendingPage !== null[\s\S]*fixed inset-0 z-\[1200\][\s\S]*<HotelCardSkeleton \/>/);
});
