import assert from "node:assert/strict";
import test from "node:test";
import { dictionaries } from "../../localization/mobileLocalization";
import { authenticatedProfileSections } from "./profileModel";

test("authenticated profile sections and destinations match the account architecture", () => {
  assert.deepEqual(authenticatedProfileSections.map(section => section.title), ["manageAccount", "travelActivity", "preferences", "helpSupport"]);
  assert.deepEqual(authenticatedProfileSections.flatMap(section => section.items.map(item => [item.label, item.destination.href])), [
    ["personalDetails", "/personal-information"], ["securitySettings", "https://kurioticket.com/dashboard/security"],
    ["myTrips", "/(tabs)/trips"], ["savedRecent", "/saved"], ["priceAlerts", "/price-alerts"],
    ["emailPreferences", "/email-preferences"], ["customizationPreferences", "/settings"],
    ["travelPreferences", "/travel-preferences"], ["contactSupport", "/support"], ["faq", "/faq"],
  ]);
  assert.equal(authenticatedProfileSections.flatMap(section => section.items).filter(item => item.label === "personalDetails").length, 1);
});

test("English and Spanish include every profile architecture label", () => {
  const keys = ["manageAccount", "personalDetails", "securitySettings", "travelActivity", "myTrips", "savedRecent", "priceAlerts", "preferences", "emailPreferences", "customizationPreferences", "travelPreferences", "helpSupport", "contactSupport", "faq", "aboutLegal"] as const;
  for (const locale of ["en-us", "es-es"] as const) for (const key of keys) assert.ok(dictionaries[locale][key], `${locale}.${key}`);
});
