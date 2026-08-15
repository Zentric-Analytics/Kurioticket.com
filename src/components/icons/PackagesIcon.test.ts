import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const icon = readFileSync("src/components/icons/PackagesIcon.tsx", "utf8");
const header = readFileSync("src/components/layout/AppHeader.tsx", "utf8");
const tabs = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const form = readFileSync("src/components/search/DealsSearchForm.tsx", "utf8");

test("PackagesIcon is the reusable flight, hotel, and car product mark", () => {
  assert.match(icon, /export function PackagesIcon/);
  assert.match(icon, /Building2[\s\S]*Plane[\s\S]*CarFront/);
  assert.match(icon, /className[\s\S]*text-current/);
  assert.match(icon, /aria-hidden="true"/);
});

test("customer-facing Packages identities use PackagesIcon", () => {
  assert.match(header, /href: "\/packages"[\s\S]{0,100}icon: PackagesIcon/);
  assert.match(tabs, /\["deals", PackagesIcon, t\.deals \|\| "Packages"\]/);
  assert.match(form, /<PackagesIcon data-packages-identity-icon/);
});

test("Price Alerts retains the semantically correct Tag icon", () => {
  assert.match(header, /accountMenu\.priceAlerts\.label", icon: Tag/);
});
