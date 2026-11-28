import assert from "node:assert/strict";
import test from "node:test";
import { createPageViewCapture, isCustomerPackageStagePath, isRestrictedWebSignIn, pageViewInfo, pageViewKey, publicPageViewPath } from "./pageViewCatalog";

test("customer web routes report the committed account, package and public destinations", () => {
  const routes = {
    "/dashboard/alerts": "price_alerts",
    "/dashboard/account": "account_hub",
    "/dashboard/security": "security",
    "/dashboard/trips": "trips",
    "/dashboard/support": "account_support",
    "/dashboard/preferences/email": "email_preferences",
    "/dashboard/preferences/travel": "travel_preferences",
    "/dashboard/preferences/customization": "customization",
    "/packages/results": "package_results",
    "/packages/journey/hotel-results": "package_hotel_results",
    "/packages/journey/hotel-details": "package_hotel_details",
    "/packages/journey/flight-results": "package_flight_results",
    "/packages/journey/flight-details": "package_flight_details",
    "/packages/journey/car-results": "package_car_results",
    "/packages/journey/car-details": "package_car_details",
    "/packages/journey/review": "package_review",
    "/packages/handoff": "package_handoff",
    "/deals/journey/review": "package_review",
    "/auth/signin": "auth_sign_in",
    "/auth/signup": "auth_sign_up",
    "/onboarding": "account_onboarding",
    "/onboarding/security": "account_security_setup",
    "/legal/accessibility-statement": "legal_document",
    "/flights/london-to-paris": "flight_route_guide",
    "/hotels/paris": "hotel_destination_guide",
    "/guides/best-time-to-book-flights": "guide_article",
  };
  for (const [path, key] of Object.entries(routes)) assert.equal(pageViewKey(path, "web"), key, path);
  assert.equal(pageViewInfo("price_alerts")?.webPath, "/dashboard/alerts");
  assert.equal(publicPageViewPath("account_hub"), null);
  assert.equal(publicPageViewPath("package_hotel_details"), null);
  assert.equal(publicPageViewPath("auth_sign_in"), null);
  assert.equal(publicPageViewPath("legal_document"), null);
});

test("auth challenges, token-linked pages, redirects and unapproved path variants stay outside web observations", () => {
  for (const path of [
    "/admin", "/account/pending-deletion", "/auth/reset-password", "/auth/verify-email", "/auth/verify-login",
    "/auth/two-factor", "/auth/forgot-password", "/email/preferences", "/mobile/legal/privacy-policy",
    "/dashboard/price-alerts", "/dashboard/saved", "/redirect", "/qa-only/mobile-results/flights", "/sandbox/kayak",
    "/packages/journey/no-such-stage", "/legal/no-such-document", "/flights/details/item?token=secret",
    "/hotels/details/item#private", "/flights/details/abc%25?token=secret",
  ]) assert.equal(pageViewKey(path, "web"), null, path);
});

test("distinct detail visits sharing a template get distinct occurrence IDs and retain a key-only previous section", () => {
  let next = 0;
  const observe = createPageViewCapture(() => String(++next));
  const visit = (pathname: string, options: { context?: string | null; visible?: boolean; requestId?: string } = {}) => observe({
    pathname, transport: "web", context: "consented-actor", visible: true, ...options,
  });
  const requestId = "d56e8957-1513-4578-8dcd-a9ec7b7e09e0";
  assert.deepEqual(visit("/flights/details/first%3Aid"), { eventId: "1", pageKey: "flight_details" });
  assert.equal(visit("/flights/details/first%3Aid/"), null);
  assert.deepEqual(visit("/flights/details/first%3Aid", { requestId }), { eventId: "1", pageKey: "flight_details", requestId });
  assert.deepEqual(visit("/flights/details/second%3Aid"), { eventId: "2", pageKey: "flight_details", previousPageKey: "flight_details" });
  assert.deepEqual(visit("/flights/details/first%3Aid"), { eventId: "3", pageKey: "flight_details", previousPageKey: "flight_details" });
  assert.equal(visit("/flights/details/third%3Aid", { visible: false }), null);
  assert.deepEqual(visit("/flights/details/third%3Aid"), { eventId: "4", pageKey: "flight_details" });
  assert.equal(visit("/flights/details/third%3Aid", { context: null }), null);
  assert.deepEqual(visit("/flights/details/third%3Aid", { context: "another-consented-actor" }), { eventId: "5", pageKey: "flight_details" });
});

test("shared sign-in remains in scope for customer navigation and excludes Admin and account recovery entries", () => {
  const origin = "https://staging.kurioticket.example";
  for (const target of ["/admin", "/admin/users?scope=private", origin + "/%61dmin", "/account/pending-deletion"]) {
    assert.equal(isRestrictedWebSignIn("/auth/signin", new URLSearchParams({ callbackUrl: target }).toString(), origin), true);
  }
  assert.equal(isRestrictedWebSignIn("/auth/signin", "", origin), false);
  assert.equal(isRestrictedWebSignIn("/auth/signin", "callbackUrl=/dashboard", origin), false);
  assert.equal(isRestrictedWebSignIn("/support", "callbackUrl=/admin", origin), false);
});

test("committed guided package hotel detail instances are separate without exposing selection references", () => {
  const pathname = "/packages/journey/hotel-details";
  let next = 0;
  const observe = createPageViewCapture(() => String(++next));
  const visit = (pageInstance: string) => observe({
    pathname, pageInstance, transport: "web", context: "consented-actor", visible: true,
  });
  assert.equal(isCustomerPackageStagePath(pathname, "hotel-details"), true);
  assert.equal(isCustomerPackageStagePath(pathname, "hotel-results"), false);
  assert.equal(isCustomerPackageStagePath("/packages/journey/unknown"), false);
  assert.equal(isCustomerPackageStagePath("/packages/results"), false);
  assert.deepEqual(visit("private-hotel-one"), { eventId: "1", pageKey: "package_hotel_details" });
  assert.equal(visit("private-hotel-one"), null);
  assert.deepEqual(visit("private-hotel-two"), { eventId: "2", pageKey: "package_hotel_details", previousPageKey: "package_hotel_details" });
});
