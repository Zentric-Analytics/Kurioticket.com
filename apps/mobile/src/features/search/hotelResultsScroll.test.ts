import assert from "node:assert/strict";
import test from "node:test";
import { HOTEL_RESULTS_REVEAL_COUNT, createHotelRevealGate, initialHotelFilterScrollState, nextHotelFilterScrollState, nextHotelRevealLimit } from "./hotelResultsScroll";

test("filters hide downward and return upward without reacting to tiny direction jitter", () => {
  let state = initialHotelFilterScrollState();
  state = nextHotelFilterScrollState(state, 8, 1000);
  assert.equal(state.hidden, false);
  state = nextHotelFilterScrollState(state, 20, 1000);
  assert.equal(state.hidden, true);
  state = nextHotelFilterScrollState(state, 18, 1000);
  assert.equal(state.hidden, true);
  state = nextHotelFilterScrollState(state, 5, 1000);
  assert.equal(state.hidden, false);
});

test("bottom overscroll does not show filters until the user actually scrolls upward", () => {
  let state = nextHotelFilterScrollState(initialHotelFilterScrollState(), 1000, 1000);
  state = nextHotelFilterScrollState(state, 1040, 1000);
  state = nextHotelFilterScrollState(state, 1000, 1000);
  assert.equal(state.hidden, true);
  state = nextHotelFilterScrollState(state, 980, 1000);
  assert.equal(state.hidden, false);
  assert.deepEqual(nextHotelFilterScrollState(state, -20, 1000), initialHotelFilterScrollState());
});

test("small result sets retain filters and top overscroll cannot collapse them", () => {
  assert.deepEqual(nextHotelFilterScrollState(initialHotelFilterScrollState(), 20, -100), initialHotelFilterScrollState());
});

test("all 8547 results remain reachable through bounded append-only reveals", () => {
  let visible = HOTEL_RESULTS_REVEAL_COUNT;
  while (visible < 8547) {
    const next = nextHotelRevealLimit(visible, 8547);
    assert.ok(next > visible && next - visible <= HOTEL_RESULTS_REVEAL_COUNT);
    visible = next;
  }
  assert.equal(visible, 8547);
  assert.equal(nextHotelRevealLimit(visible, 8547), 8547);
  assert.equal(nextHotelRevealLimit(HOTEL_RESULTS_REVEAL_COUNT, 3), 3);
});

test("filter collapse cannot look like an upward gesture at the end of the list", () => {
  const hidden = { offset: 1000, travel: 0, hidden: true };
  const resized = nextHotelFilterScrollState(hidden, 944, 944);
  assert.equal(resized.hidden, true);
  assert.equal(nextHotelFilterScrollState(resized, 920, 944).hidden, false);
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
