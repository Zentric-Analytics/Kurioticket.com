import assert from "node:assert/strict";
import test from "node:test";
import { getLocationFieldDisplay } from "./locationFieldDisplay";

test("airport selections show their code and explanatory full name", () => {
  const display = getLocationFieldDisplay("Lagos (LOS)");
  assert.equal(display.primary, "LOS");
  assert.match(display.secondary || "", /Murtala Muhammed/i);
  assert.match(display.secondary || "", /Lagos/i);
});

test("car airport labels keep the selected full name below the code", () => {
  const display = getLocationFieldDisplay("Heathrow Airport (LHR)");
  assert.equal(display.primary, "LHR");
  assert.match(display.secondary || "", /Heathrow Airport/i);
});

test("cities retain their region context on a supporting line", () => {
  assert.deepEqual(getLocationFieldDisplay("Miami, United States"), {
    primary: "Miami",
    secondary: "United States",
  });
});

test("free text without structured context remains a single clear line", () => {
  assert.deepEqual(getLocationFieldDisplay("Downtown pickup"), {
    primary: "Downtown pickup",
  });
});
