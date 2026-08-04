import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const client = readFileSync(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8");
const stage = readFileSync(new URL("./DealsHotelJourneyStage.tsx", import.meta.url), "utf8");
test("staged branch is opt-in for Hotel and preserves the legacy package branch", () => { assert.match(client, /stagedHotelJourneyActive = stagedRequested && included\.hotel/); assert.match(client, /buildDealsPackageCandidates/); assert.match(client, /<DealsPackageResultsToolbar/); assert.match(client, /<DealsPackageCard/); assert.match(client, /readDealsTripPlan/); assert.match(client, /writeDealsTripPlan/); assert.match(client, /removeDealsTripPlan/); });
test("staged stages expose semantic headings, focus refs, live announcements and controls", () => { for (const pattern of [/<h1/, /aria-live="polite"/, /roomHeadingRef/, /chooseRefs/, /selectedStayRef/, /Back to properties|deals\.staged\.room\.back/, /onConfirm/, /selected-stay-heading/, /disabled/, /legacyHref/]) assert.match(`${client}\n${stage}`, pattern); });
test("staged requests suppress future products and Modify Search preserves activation", () => { assert.match(client, /included\.flight && !stagedHotelJourneyActive/); assert.match(client, /included\.car && !stagedHotelJourneyActive/); assert.match(client, /journey=staged/); assert.match(client, /stagedHotelJourneyActive \|\| loading \|\| failed/); });
