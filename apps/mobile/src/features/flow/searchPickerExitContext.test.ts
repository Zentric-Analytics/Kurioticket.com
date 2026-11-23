import assert from "node:assert/strict";
import test from "node:test";
import { retainPickerContext } from "./retainedPickerContext";

test("retains Flight airport role and selection during exit, then replaces it on the next open", () => {
  const from = { kind: "from", title: "Choose origin", selected: "JFK" } as const;
  const closing = retainPickerContext<any>(false, { kind: undefined, title: "Choose destination", selected: undefined }, from);
  assert.deepEqual(closing, from);
  const to = { kind: "to", title: "Choose destination", selected: "LAX" } as const;
  assert.equal(retainPickerContext<any>(true, to, closing), to);
});

test("retains the complete multi-city calendar presentation while inactive", () => {
  const flight2 = { title: "Flight 2 departure date", selected: "2026-09-12", minimum: "2026-09-10", dismissOnBackdropPress: true };
  assert.equal(retainPickerContext<any>(false, { title: "Choose departure date", selected: "", minimum: "2026-08-27", dismissOnBackdropPress: false }, flight2), flight2);
});

test("retains Car return and Package airport roles through exit", () => {
  const carReturn = { mode: "return", selectedValue: "LAX" } as const;
  assert.equal(retainPickerContext<any>(false, { mode: undefined, selectedValue: "JFK" }, carReturn), carReturn);
  const packageOrigin = { role: "origin", title: "Choose origin" } as const;
  assert.equal(retainPickerContext<any>(false, { role: undefined, title: "Choose destination" }, packageOrigin), packageOrigin);
});
