import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { allowedActivityStages, parseActivityFilters } from "../../../../../src/lib/adminIdentityActivity";

const read = (file: string) => readFileSync(file, "utf8");
const share = read("src/features/privacy/nativeShareTracking.ts");
const delivery = read("src/features/privacy/nativeInteractionDelivery.ts");
const identity = read("src/features/privacy/visitorIdentityCoordinator.ts");
const api = read("src/api/travelApi.ts");
const repoRoot = "../../";

test("native shares use only the existing first-party, authenticated, consent-gated API", () => {
  assert.match(api, /customerInteraction:\s*\(body:/);
  assert.match(api, /request<\{ accepted: boolean; retryable\?: boolean \}>\("\/api\/activity\/interactions"/);
  assert.match(identity, /"\/api\/activity\/interactions"/);
  assert.match(share, /visitorIdentity\.trackingContext/);
  assert.match(share, /deliverNativeInteraction\(/);
  assert.match(delivery, /travelApi\.customerInteraction\(event, \{ visitorContext, signal \}\)/);
  assert.match(delivery, /visitorIdentity\.subscribe\(delivery\.contextChanged\)/);
  assert.match(share, /digestStringAsync\(CryptoDigestAlgorithm\.SHA256, resultId\)/);
  assert.match(share, /eventId: randomUUID\(\)/);
  assert.match(share, /requestIdPattern\.test\(requestId\)/);
  assert.doesNotMatch(share, /message:|email:|recipient:|destinationUrl:|screenContent:/);
});

test("native flight hotel and car share buttons record only through consent-gated helper", () => {
  const cases = [
    ["src/features/search/NativeFlightDetails.tsx", "FLIGHT"],
    ["src/features/search/ApprovedResultsScreen.tsx", "HOTEL"],
    ["src/features/search/HotelDetailsScreen.tsx", "HOTEL"],
    ["src/features/search/ApprovedDetailScreen.tsx", "HOTEL"],
    ["src/features/search/CarResultCard.tsx", "CAR"],
    ["src/features/search/ApprovedCarDetailScreen.tsx", "CAR"],
    ["src/features/search/NativeKayakCarDetailScreen.tsx", "CAR"],
  ] as const;
  for (const [file, product] of cases) {
    const source = read(file);
    assert.match(source, /shareNativeResult/, file);
    assert.ok(source.includes('product:"' + product + '"'), file);
    assert.match(source, /resultId:/, file);
    assert.match(source, /requestId/, file);
    assert.match(source, /Share\.share/, file);
  }
});

test("existing server checks consent, exact search ownership and event UUID idempotency", () => {
  const server = read(repoRoot + "src/app/api/activity/interactions/route.ts");
  assert.match(server, /lockConsentedVisitor/);
  assert.match(server, /resolveObservedActivityIdentity/);
  assert.match(server, /matchesInteractionSearch/);
  assert.match(server, /const eventId = event\.eventId\.toLowerCase\(\)/);
  assert.match(server, /metadata: \{ path: \["eventId"\], equals: eventId \}/);
  assert.match(server, /event\.action === "share_sheet_requested" && \(\s*request\.headers\.get\("x-mobile-platform"\)\?\.trim\(\)\.toLowerCase\(\) !== "android"/);
  assert.match(server, /type: "SEARCH_COMPLETED", searchHistoryId: search\.id/);
  assert.match(server, /if \(verifiedLink\)/);
  assert.match(server, /type: stage/);
  const admin = read(repoRoot + "src/services/adminIdentityActivityService.ts");
  const journeyLabels = read(repoRoot + "src/lib/adminIdentityJourney.ts");
  assert.match(journeyLabels, /share_sheet_completed: "Share sheet completed"/);
  assert.match(journeyLabels, /share_sheet_requested: "Share sheet requested"/);
  assert.match(admin, /\.\.\.sharedJourneyActionLabels/);
  assert.match(admin, /const allowed = allowedActivityStages\(filters\)/);
  assert.match(admin, /const stages = activityJourneyStages\.filter\(stage => allowed\.has\(stage\)\)/);
  assert.match(admin, /type: \{ in: stages \}/);
  for (const tab of ["all", "journeys", "interactions"]) {
    for (const stage of ["all", "RESULT_SHARED"]) {
      const parsed = parseActivityFilters({ tab, stage });
      assert.equal(parsed.ok, true);
      const allowed = allowedActivityStages(parsed.filters);
      assert.equal(allowed.has("RESULT_SHARED"), true, `${tab}/${stage} retains recorded shares`);
      if (stage === "RESULT_SHARED") assert.deepEqual([...allowed], ["RESULT_SHARED"]);
    }
  }
});
