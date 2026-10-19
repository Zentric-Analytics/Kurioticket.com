import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { HOTEL_RESULTS_REVEAL_COUNT, createHotelRevealGate, nextHotelRevealLimit } from "./hotelResultsScroll";

test("all 8547 results remain reachable through bounded append-only reveals", () => {
  let visible = HOTEL_RESULTS_REVEAL_COUNT;
  while (visible < 8547) {
    const next = nextHotelRevealLimit(visible, 8547);
    assert.ok(next > visible && next - visible <= HOTEL_RESULTS_REVEAL_COUNT);
    visible = next;
  }
  assert.equal(visible, 8547);
  assert.equal(nextHotelRevealLimit(visible, 8547), 8547);
});

function gateHarness() {
  const tasks: Array<() => void> = [];
  const revealed: string[] = [];
  const gate = createHotelRevealGate(task => { tasks.push(task); return () => {}; }, identity => revealed.push(identity));
  return { gate, tasks, revealed };
}

test("repeated end events reveal once after both drag and momentum end", () => {
  const { gate, tasks, revealed } = gateHarness();
  gate.begin();
  gate.request("search-a");
  gate.request("search-a");
  assert.equal(tasks.length, 0);
  gate.end();
  assert.equal(tasks.length, 1);
  gate.begin(); // Native momentum starts before the scheduled frame.
  tasks.shift()!();
  assert.deepEqual(revealed, []);
  gate.end();
  tasks.shift()!();
  assert.deepEqual(revealed, ["search-a"]);
  gate.end();
  assert.equal(tasks.length, 0);
});

test("search/sort/filter reset invalidates even an uncancellable old reveal", () => {
  const { gate, tasks, revealed } = gateHarness();
  gate.request("old-search");
  gate.reset();
  gate.request("new-search");
  tasks.shift()!();
  assert.deepEqual(revealed, []);
  tasks.shift()!();
  assert.deepEqual(revealed, ["new-search"]);
});

test("Hotel filters stay visible above the list without direction tracking", () => {
  const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
  const hook = readFileSync("src/features/search/useHotelResultsScrolling.ts", "utf8");
  const hotel = screen.slice(screen.indexOf("<HotelResultsHeader"), screen.indexOf("<FlightSortSheet"));
  assert.match(hotel, /<View style=\{\[s0\.hotelFilterSectionHeader[\s\S]*?\{filterRail\}[\s\S]*?<SectionList/);
  assert.doesNotMatch(hotel, /filterHidden|filterTranslation|onScroll=|onFilterLayout/);
  assert.doesNotMatch(hook, /Animated|nextHotelFilterScrollState|ignoreDirectionUntilGesture/);
  assert.match(hotel, /showsVerticalScrollIndicator=\{true\}/);
  assert.match(hotel, /onEndReached=\{hotelScrolling\.revealMore\}/);
});
