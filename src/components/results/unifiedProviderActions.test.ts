import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("all web result clients route canonical results through server-owned actions", () => {
  const flightSource = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");
  assert.match(flightSource, /resultActionHref\(/, "FlightResultsClient.tsx");
  assert.doesNotMatch(
    flightSource,
    /KAYAK sandbox · (?:Simulated · )?Not bookable/,
    "FlightResultsClient.tsx",
  );

  for (const file of ["HotelResultsClient.tsx", "CarsResultsClient.tsx"]) {
    const source = readFileSync(`src/components/results/${file}`, "utf8");
    assert.match(source, /resultActionHref\(/, file);
    assert.match(source, /"KAYAK sandbox"/, file);
    assert.doesNotMatch(source, /KAYAK sandbox · (?:Simulated · )?Not bookable/, file);
  }
});
