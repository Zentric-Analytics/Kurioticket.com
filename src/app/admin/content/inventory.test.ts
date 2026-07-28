import assert from "node:assert/strict";
import test from "node:test";

import { getContentInventory } from "./inventory";

const inventory = getContentInventory();
const byTitle = new Map(inventory.map((item) => [item.title, item]));

function requireInventory(title: string) {
  const item = byTitle.get(title);
  assert.ok(item, `Missing inventory item: ${title}`);
  return item;
}

function supportingValue(title: string, label: string) {
  const metric = requireInventory(title).supportingMetrics.find((item) => item.label === label);
  assert.ok(metric, `Missing supporting metric: ${title} / ${label}`);
  return metric.value;
}

test("homepage destination inventory distinguishes IDs, assignments, and routes", () => {
  const item = requireInventory("Homepage destination content");

  assert.equal(item.primaryCount, 168);
  assert.equal(item.unit, "unique card IDs");
  assert.equal(supportingValue(item.title, "Configured market assignments"), 272);
  assert.equal(supportingValue(item.title, "Unique origin/destination routes"), 146);
});

test("flight inventory includes total, default-US, and global route scopes", () => {
  const item = requireInventory("Configured flight fare routes");

  assert.equal(item.primaryCount, 340);
  assert.equal(item.unit, "total configured route IDs");
  assert.equal(supportingValue(item.title, "Default-US routes"), 48);
  assert.equal(supportingValue(item.title, "Global routes"), 32);
  assert.equal(item.publicState, "Configured");
});

test("hotel and Cars inventory use their real public configuration sources", () => {
  const hotels = requireInventory("Hotel search destinations");
  const cars = requireInventory("Car pickup cards");

  assert.equal(hotels.primaryCount, 83);
  assert.match(hotels.note, /Search and autocomplete destinations/);
  assert.equal(cars.primaryCount, 4);
  assert.equal(cars.publicState, "Public");
});

test("FAQ inventory reports definition sources without claiming locale completeness", () => {
  const item = requireInventory("FAQ definitions");

  assert.equal(item.primaryCount, 21);
  assert.equal(supportingValue(item.title, "General/support FAQs"), 15);
  assert.equal(supportingValue(item.title, "Cars FAQs"), 6);
  assert.match(item.note, /localized at runtime/);
});

test("homepage trust inventory is scoped to three localized public messages", () => {
  const item = requireInventory("Homepage trust messages");

  assert.equal(item.primaryCount, 3);
  assert.equal(item.publicState, "Public");
  assert.match(item.note, /other trust-content surfaces are not included/);
});

test("inventory uses durable source and public-state terminology", () => {
  assert.equal(inventory.length, 6);

  for (const item of inventory) {
    assert.equal(item.sourceType, "Code-backed");
    assert.ok(["Public", "Configured"].includes(item.publicState));
    assert.doesNotMatch(`${item.publicState} ${item.note}`, /Read-only|Not live yet|Placeholder|available for review/i);
  }
});

