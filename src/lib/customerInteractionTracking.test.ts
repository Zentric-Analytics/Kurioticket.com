import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("interactions always validate origin, identity and consent on the server", () => {
  const route = read("src/app/api/activity/interactions/route.ts");
  assert.match(route, /isSameOriginRequest\(request\)/);
  assert.match(route, /readBoundedJsonBody\(request, 1024\)/);
  assert.match(route, /resolveRequestActivityIdentity\(request\)/);
  assert.match(route, /if \(!identity\.visitorId\) return json\(\{ accepted: false \}\)/);
  assert.match(route, /lockConsentedVisitor\(tx, identity\.visitorId!, identity\.userId\)/);
  assert.doesNotMatch(route, /request\.headers\.get\(["']x-user-id/);
  assert.match(route, /name\.startsWith\("share_"\) \? "SHARE"/);
});

test("clients send bounded references and only after observed result actions", () => {
  const sender = read("src/lib/customerInteractionClient.ts");
  assert.match(sender, /analyticsConsentStorageKey/);
  assert.match(sender, /!== "granted"/);
  assert.match(sender, /randomUUID\(\)/);
  assert.match(sender, /credentials: "same-origin"/);
  assert.match(sender, /window\.crypto\.subtle\.digest/);

  for (const [file, type] of [
    ["src/components/results/FlightCard.tsx", "FLIGHT"],
    ["src/components/results/HotelCard.tsx", "HOTEL"],
    ["src/components/results/CarResultCard.tsx", "CAR"],
  ]) {
    const source = read(file);
    assert.match(source, /recordCustomerInteraction/);
    assert.match(source, /share_link_copied/);
    assert.match(source, /share_sheet_completed/);
    assert.ok(source.includes('product: "' + type + '"'));
  }
});

test("confirmed account mutation events are separate from guest-only local save observations", () => {
  const saves = read("src/services/savedRecentService.ts");
  const alerts = read("src/services/priceTrackingService.ts");
  const webFlight = read("src/components/results/useSavedFlightResult.ts");
  const webHotel = read("src/components/results/useSavedHotel.ts");
  assert.match(saves, /name: "saved_item_confirmed"/);
  assert.match(saves, /name: "saved_item_removed"/);
  for (const name of ["price_alert_created", "price_alert_paused", "price_alert_reactivated", "price_alert_deleted"]) {
    assert.ok(alerts.includes(name), name);
  }
  assert.match(webFlight, /action: next\.includes\(flight\.id\) \? "local_saved" : "local_unsaved"/);
  assert.match(webHotel, /action: nextSaved \? "local_saved" : "local_unsaved"/);
});

test("admin activity uses sanitized action labels rather than arbitrary analytics metadata", () => {
  const source = read("src/services/adminIdentityActivityService.ts");
  assert.match(source, /safeInteractionNames/);
  assert.match(source, /safeActivityMetadata/);
  assert.match(source, /SHARE: "Shared result"/);
  assert.match(source, /metadata: \{ path: \["product"\], equals: product \}/);
  assert.match(source, /label: safeInteractionNames\[a\.name\] \?\? baseLabel/);
  assert.match(source, /resultId/);
  assert.doesNotMatch(source, /detail: JSON\.stringify\(a\.metadata\)/);
});
