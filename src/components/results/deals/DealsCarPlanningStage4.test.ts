import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getGuidedDealsProductOrder } from "@/lib/deals/dealsGuidedJourneyOrder";
import ts from "typescript";

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
  const parsed = ts.createSourceFile("CarResultCard.tsx", card, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let cancellationChecks = 0;
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAccessExpression(node) && node.getText(parsed) === "offer.freeCancellation") {
      cancellationChecks++;
      let guarded = false;
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && parent.left.getText(parsed) === "!guidedPlanning") guarded = true;
      }
      assert.ok(guarded, "standalone cancellation claims must remain inside the non-planning branch");
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  assert.equal(cancellationChecks, 1);
  assert.doesNotMatch(card, /offer\.(payAtPickup|taxesAndFeesIncluded)/);
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
  assert.match(legacy, /const order = getGuidedDealsProductOrder\(search\.mode\)/);
  assert.match(legacy, /const nextProduct = order\[order\.indexOf\(product\) \+ 1\]/);
  assert.match(legacy, /nextProduct\s*\? `\$\{nextProduct\}-results`\s*: "review"/);
  for (const mode of ["flight-car", "hotel-car", "hotel-flight-car"] as const) {
    assert.equal(getGuidedDealsProductOrder(mode).at(-1), "car");
  }
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
