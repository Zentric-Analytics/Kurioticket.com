import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("all web result clients route canonical results through server-owned actions", () => {
  for (const file of ["FlightResultsClient.tsx", "HotelResultsClient.tsx", "CarsResultsClient.tsx"]) {
    const source = readFileSync(`src/components/results/${file}`, "utf8");
    assert.match(source, /resultActionHref\(/, file);
    assert.match(source, /KAYAK sandbox · (?:Simulated · )?Not bookable/, file);
  }
});
