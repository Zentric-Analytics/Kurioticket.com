import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(path), "utf8").replace(/\r\n/g, "\n");
const results = read("src/features/search/ApprovedResultsScreen.tsx");
const details = read("src/features/search/ApprovedDetailScreen.tsx");

const resultsHotelDetailsPush = results.slice(
  results.indexOf('router.push({\n                pathname: "/hotel-details"'),
  results.indexOf("})\n            }", results.indexOf('router.push({\n                pathname: "/hotel-details"')),
);
const relatedHotelPush = details.slice(
  details.indexOf("const viewRelatedHotel"),
  details.indexOf("const presentedRoomOptions"),
);
const returnToHotelResults = details.slice(
  details.indexOf("const returnToHotelResults"),
  details.indexOf("const amenityItems"),
);

test("Hotel Results pushes Details with Results-stack provenance and its current context", () => {
  assert.match(resultsHotelDetailsPush, /router\.push\(\{/);
  assert.match(resultsHotelDetailsPush, /pathname: "\/hotel-details"/);
  assert.match(resultsHotelDetailsPush, /result: JSON\.stringify\(result\)/);
  assert.match(resultsHotelDetailsPush, /Object\.entries\(params\)/);
  assert.match(resultsHotelDetailsPush, /hotelResultsStack: "1"/);
  assert.doesNotMatch(resultsHotelDetailsPush, /router\.replace/);
});

test("Hotel Details reads, but does not invent, Results-stack provenance", () => {
  assert.match(details, /Array\.isArray\(params\.hotelResultsStack\)[\s\S]*?params\.hotelResultsStack\[0\][\s\S]*?: params\.hotelResultsStack\) === "1"/);
  assert.doesNotMatch(details, /const hotelResultsStack\s*=\s*true/);
});

test("Results-origin back dismisses to existing Results using actual stack state", () => {
  assert.match(details, /useNavigation/);
  assert.match(details, /const navigation = useNavigation\(\)/);
  assert.match(returnToHotelResults, /if \(hotelResultsStack\) \{/);
  assert.match(returnToHotelResults, /hotelResultsDismissCount\(navigation\.getState\(\)\)/);
  assert.match(returnToHotelResults, /if \(dismissCount\) \{\s*router\.dismiss\(dismissCount\);\s*return;\s*\}/);
  assert.doesNotMatch(returnToHotelResults, /router\.dismissTo/);
  assert.doesNotMatch(returnToHotelResults, /router\.back\(/);

  const branch = returnToHotelResults.slice(
    returnToHotelResults.indexOf("if (hotelResultsStack)"),
    returnToHotelResults.indexOf("router.replace"),
  );
  assert.equal(branch.match(/router\./g)?.length, 1);
  assert.doesNotMatch(branch, /router\.(?:setParams|replace|navigate|push|dismissTo)/);
});

test("direct-entry back retains the canonical Hotel Results fallback", () => {
  assert.match(returnToHotelResults, /router\.replace\(\{\s*pathname: "\/hotel-results"/);
  for (const param of ["destination", "checkIn", "checkOut", "guests", "rooms"]) {
    assert.match(returnToHotelResults, new RegExp(`\\b${param}(?::|,)`));
  }
});

test("related Details inherit Results-stack provenance only when present", () => {
  assert.match(relatedHotelPush, /router\.push\(\{\s*pathname: "\/hotel-details"/);
  assert.match(relatedHotelPush, /\.\.\.\(hotelResultsStack \? \{ hotelResultsStack: "1" \} : \{\}\)/);
});

test("Hotel navigation contains no stack reset or timing workaround", () => {
  const changedHotelNavigation = `${resultsHotelDetailsPush}\n${relatedHotelPush}\n${returnToHotelResults}`;
  assert.doesNotMatch(
    changedHotelNavigation,
    /dismissAll|navigation\.reset|StackActions|popToTop|setTimeout|requestAnimationFrame|InteractionManager/,
  );
  assert.doesNotMatch(changedHotelNavigation, /hotelResultsDepth|detailDepth|returnDepth|stackDepth/);
});
