import assert from "node:assert/strict";
import test from "node:test";
import { authenticatedProfileSections } from "./profileModel";

test("authenticated profile keeps its existing order and appends legal", () => {
  assert.deepEqual(authenticatedProfileSections.map(section => section.title), ["manageAccount", "travelActivity", "preferences", "helpSupport", "aboutLegal"]);
  assert.deepEqual(authenticatedProfileSections.find(section => section.title === "travelActivity")?.items.map(item => [item.label, item.destination.href]), [["savedRecent", "/saved"], ["priceAlerts", "/price-alerts"]]);
  assert.deepEqual(authenticatedProfileSections.at(-1)?.items.map(item => [item.label, item.destination.href]), [["terms", "/terms"], ["privacy", "/privacy"]]);
});

test("authenticated profile controls remain unique", () => {
  assert.equal(authenticatedProfileSections.flatMap(section => section.items).filter(item => item.label === "personalDetails").length, 1);
  assert.equal(authenticatedProfileSections.flatMap(section => section.items).filter(item => item.label === "terms").length, 1);
  assert.equal(authenticatedProfileSections.flatMap(section => section.items).filter(item => item.label === "privacy").length, 1);
  assert.equal(authenticatedProfileSections.flatMap(section => section.items).filter(item => item.label === "myTrips").length, 0);
});
