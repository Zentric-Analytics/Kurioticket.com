import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const stage = read("src/components/results/deals/DealsCarResultsStage.tsx");
const card = read("src/components/results/CarResultCard.tsx");
const results = read("src/components/results/CarsResultsClient.tsx");
const legacy = read("src/components/results/deals/DealsJourneyShell.tsx");
const v2 = read("src/components/results/deals/DealsCarJourneyV2.tsx");
const translations = read("src/lib/i18n/en.ts");

test("guided results use explicit truthful planning presentation", () => {
  assert.match(stage, /presentation="guided-planning"/);
  assert.match(card, /car\.orSimilar/);
  for (const copy of [
    "Estimated total",
    "Estimated per day",
    "Planning estimate — not real-time supplier availability.",
    "Continue with this car option",
    "Lowest estimated total",
  ])
    assert.ok(translations.includes(copy));
  assert.match(card, /!guidedPlanning && offer\.freeCancellation/);
  assert.match(card, /!guidedPlanning && offer\.payAtPickup/);
  assert.match(card, /!guidedPlanning && offer\.taxesAndFeesIncluded/);
  assert.match(results, /group\.id !== "cancellation"/);
  assert.doesNotMatch(
    stage,
    /rentalCompanyName|bookingProviderName|buildGuidedDealsCarActionHref/,
  );
});

test("the rendered response projects directly and fails closed", () => {
  assert.match(
    stage,
    /setResultReceivedAt\(validResults\.length \? Date\.now\(\) : null\)/,
  );
  assert.match(stage, /buildDealsCarDetailsSelection/);
  assert.match(
    stage,
    /isCarSelectable=\{\(car\) => buildSelection\(car\) !== null\}/,
  );
  assert.match(stage, /if \(selection\) onSelectCar\(selection\)/);
  assert.equal((stage.match(/fetch\("\/api\/cars\/search"/g) ?? []).length, 1);
});

test("legacy and V2 confirm from results and enter review without a details gate", () => {
  assert.match(legacy, /product === "car"[\s\S]*?\? "review"/);
  assert.match(legacy, /onSelectCar=\{confirmGuidedCarSelection\}/);
  assert.match(v2, /onSelectCar=\{\(car\) =>/);
  assert.match(v2, /confirm\(car\)/);
  assert.doesNotMatch(v2, /candidateId|DealsCarDetailsStage/);
});

test("standalone details navigation and the Flight controller remain intact", () => {
  assert.match(results, /buildCarDetailsHref\(car\.id, values\)/);
  const flight = read("src/components/results/deals/DealsFlightJourneyV2.tsx");
  assert.match(flight, /RETURN_SELECTED/);
  assert.match(flight, /FARE_SELECTED/);
});
