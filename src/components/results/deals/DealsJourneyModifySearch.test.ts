import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { applySharedDestination } from "../../../lib/deals/dealsSearchSynchronization";
import {
  createDefaultDealsSearch,
  parseDealsSearchParams,
} from "../../../lib/deals/dealsSearchParams";
import {
  buildDealsJourneyUrl,
  getFirstDealsJourneyStage,
} from "../../../lib/deals/dealsJourneyRoutes";

test("linked destination modification survives the first-stage journey URL round trip", () => {
  const paris = applySharedDestination(
    {
      ...createDefaultDealsSearch(),
      mode: "hotel-flight" as const,
      flightDestinationCode: "CDG",
      stayDestinationLinked: true,
    },
    "Paris",
    "Paris (CDG)",
  );

  const london = {
    ...applySharedDestination(paris, "London", "London (LHR)"),
    flightDestinationCode: "LHR",
  };
  assert.deepEqual(
    {
      flightDestinationCode: london.flightDestinationCode,
      sharedDestination: london.sharedDestination,
      hotelDestination: london.hotelDestination,
      stayDestinationLinked: london.stayDestinationLinked,
    },
    {
      flightDestinationCode: "LHR",
      sharedDestination: "London",
      hotelDestination: "London",
      stayDestinationLinked: true,
    },
  );

  const url = new URL(
    buildDealsJourneyUrl(getFirstDealsJourneyStage(london.mode), london),
    "https://example.test",
  );
  const parsed = parseDealsSearchParams(url.searchParams);
  assert.equal(url.pathname, "/packages/journey/hotel-results");
  assert.equal(parsed.flightDestinationCode, "LHR");
  assert.equal(parsed.sharedDestination, "London");
  assert.equal(parsed.hotelDestination, "London");
});

test("changed guided Modify Search makes the new draft navigation authoritative", async () => {
  const source = await readFile(
    new URL("./DealsJourneyShell.tsx", import.meta.url),
    "utf8",
  );
  const submit = source.slice(
    source.indexOf("const submitSearch"),
    source.indexOf("const restartCurrentPreview"),
  );

  assert.ok(
    submit.indexOf("setPendingSearchFingerprint(nextFingerprint)") <
      submit.indexOf("removeDealsStagedJourneyPlan()"),
  );
  assert.ok(
    submit.indexOf("removeDealsStagedJourneyPlan()") <
      submit.indexOf("router.push("),
  );
  assert.match(
    submit,
    /buildDealsJourneyUrl\(getFirstDealsJourneyStage\(draft\.mode\), draft\)/,
  );
  assert.doesNotMatch(submit, /plan: null|unresolvedDealsPlanState/);
  assert.doesNotMatch(submit, /setEditorOpen\(false\)/);

  assert.match(
    source,
    /if \(pendingSearchFingerprint \|\| !resolved \|\| requiredStage === stage\)/,
  );
  assert.match(
    source,
    /pendingSearchFingerprint \|\|\s*!resolved \|\|\s*stage !== "review"/,
  );
  assert.match(source, /active: resolved && !pendingSearchFingerprint/);
  assert.match(source, /pending=\{Boolean\(pendingSearchFingerprint\)\}/);
  assert.match(
    source,
    /const closeEditor = \(\) => \{\s*if \(pendingSearchFingerprint\) return;/,
  );
});
