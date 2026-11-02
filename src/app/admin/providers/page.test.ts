import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

import { adminNavigation } from "@/lib/adminNavigation";
import { filterProviderStatuses, normalizeProductFilter, productFilters } from "@/lib/adminProviderFilters";

const providersPage = readFileSync("src/app/admin/providers/page.tsx", "utf8");
const providerFiltersSource = readFileSync("src/lib/adminProviderFilters.ts", "utf8");
const flightsPage = readFileSync("src/app/admin/flights/page.tsx", "utf8");
const hotelsPage = readFileSync("src/app/admin/hotels/page.tsx", "utf8");
const carsPage = readFileSync("src/app/admin/cars/page.tsx", "utf8");
const providersApi = readFileSync("src/app/api/admin/providers/route.ts", "utf8");
const providerRetestApi = readFileSync("src/app/api/admin/providers/duffel/retest/route.ts", "utf8");
const overviewPage = readFileSync("src/app/admin/page.tsx", "utf8");
const systemPage = readFileSync("src/app/admin/system/page.tsx", "utf8");
const settingsPage = readFileSync("src/app/admin/settings/page.tsx", "utf8");

type TestProvider = Parameters<typeof filterProviderStatuses>[0][number];

const providerStatuses = [
  provider("Flights", "Duffel"),
  provider("Hotels", "Kurioticket static catalogue"),
  provider("Cars", "Not connected"),
];

test("providers page defaults invalid and missing product filters to all", () => {
  assert.equal(normalizeProductFilter(), "all");
  assert.equal(normalizeProductFilter("all"), "all");
  assert.equal(normalizeProductFilter("unknown"), "all");
  assert.equal(normalizeProductFilter(["cars", "flights"]), "cars");
});

test("providers page filters provider sections by product query", () => {
  assert.deepEqual(filterProviderStatuses(providerStatuses, "all").map((item) => item.product), ["Flights", "Hotels", "Cars"]);
  assert.deepEqual(filterProviderStatuses(providerStatuses, "flights").map((item) => item.product), ["Flights"]);
  assert.deepEqual(filterProviderStatuses(providerStatuses, "hotels").map((item) => item.product), ["Hotels"]);
  assert.deepEqual(filterProviderStatuses(providerStatuses, "cars").map((item) => item.product), ["Cars"]);
});

test("provider filter helpers drive the providers page", () => {
  assert.deepEqual(productFilters.map((filter) => filter.key), ["all", "flights", "hotels", "cars"]);
  assert.match(providerFiltersSource, /href: "\/admin\/providers\?product=flights"/);
  assert.match(providerFiltersSource, /href: "\/admin\/providers\?product=hotels"/);
  assert.match(providerFiltersSource, /href: "\/admin\/providers\?product=cars"/);
  assert.match(providersPage, /normalizeProductFilter/);
  assert.match(providersPage, /filterProviderStatuses/);
  assert.match(providersPage, /productFilters\.map/);
  assert.match(providersPage, /getProviderStatuses\(\)/);
  assert.match(providersPage, /getProviderOperationalStatuses\(\)/);
  assert.match(providersPage, /<AdminProviderStatusCard key=\{provider\.product\} \{\.\.\.provider\} \/>/);
});

test("providers page preserves truthful provider data and the active retest control", () => {
  assert.match(providersPage, /Provider health retest/);
  assert.match(providersPage, /<ProviderRetestButton \/>/);
  const page = ts.createSourceFile("providers.tsx", providersPage, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const headings: ts.JsxElement[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(page) === "h2" && node.children.map((child) => child.getText(page)).join("").trim() === "Provider health retest") headings.push(node);
    ts.forEachChild(node, visit);
  }
  visit(page);
  assert.equal(headings.length, 1);
  let section: ts.Node = headings[0];
  while (section.parent && !(ts.isJsxElement(section) && section.openingElement.tagName.getText(page) === "AdminSectionCard")) section = section.parent;
  assert.ok(ts.isJsxElement(section) && section.openingElement.tagName.getText(page) === "AdminSectionCard");
  const retest = section.getText(page).replace(/\s+/g, " ");
  assert.match(retest, /Retesting records a real Duffel health check and writes an admin audit event\./);
  assert.match(retest, /It does not claim booking readiness\./);
  assert.match(retest, /<ProviderRetestButton\s*\/>/);
  assert.match(retest, /Secrets hidden/);
  assert.match(retest, /Booking remains provider-owned/);
  const control = ts.createSourceFile("ProviderRetestButton.tsx", readFileSync("src/components/admin/ProviderRetestButton.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const buttons: ts.JsxOpeningElement[] = [];
  const requests: ts.CallExpression[] = [];
  function visitControl(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(control) === "Button") buttons.push(node);
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "fetch") requests.push(node);
    ts.forEachChild(node, visitControl);
  }
  visitControl(control);
  assert.equal(buttons.length, 1);
  assert.ok(buttons[0].attributes.properties.some((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(control) === "onClick" && attribute.initializer && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression?.getText(control) === "retest"));
  assert.equal(requests.length, 1);
  assert.ok(ts.isStringLiteral(requests[0].arguments[0]));
  assert.equal(requests[0].arguments[0].text, "/api/admin/providers/duffel/retest");
  assert.match(requests[0].arguments[1].getText(control), /method:\s*"POST"/);
  assert.match(providersPage, /Booking remains provider-owned/);
  assert.match(providersPage, /Secrets hidden/);
});

test("admin navigation restores Providers and the original product destinations", () => {
  assert.equal(adminNavigation.some((item) => item.href === "/admin/providers" && item.label === "Providers"), true);
  assert.equal(adminNavigation.some((item) => item.href === "/admin/flights" && item.label === "Flights"), true);
  assert.equal(adminNavigation.some((item) => item.href === "/admin/hotels" && item.label === "Hotels"), true);
  assert.equal(adminNavigation.some((item) => item.href === "/admin/cars" && item.label === "Cars"), true);
});

test("product pages retain truthful metasearch readiness views", () => {
  assert.match(flightsPage, /title="Flight Search Readiness"/);
  assert.match(hotelsPage, /title="Hotel Search Readiness"/);
  assert.match(carsPage, /title="Car Search Readiness"/);
  for (const source of [flightsPage, hotelsPage, carsPage]) assert.match(source, /AdminProviderStatusCard/);
  for (const source of [flightsPage, hotelsPage, carsPage]) {
    assert.match(source, /provider-owned/i);
    assert.doesNotMatch(source, /Booking not live|production booking workflow|booking actions/i);
  }
});

test("provider APIs, retest API, and unrelated admin pages are not edited by provider page consolidation", () => {
  assert.match(providersApi, /getProviderOperationalStatuses/);
  assert.match(providerRetestApi, /checkDuffelHealth\(\)/);
  assert.match(providerRetestApi, /writeAdminAuditLog/);
  assert.match(overviewPage, /Operations Dashboard/);
  assert.match(systemPage, /Safe operational status only/);
  const settings = ts.createSourceFile("settings.tsx", settingsPage, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const shells: ts.JsxOpeningElement[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(settings) === "AdminPageShell") shells.push(node);
    ts.forEachChild(node, visit);
  }
  visit(settings);
  assert.equal(shells.length, 1, "Settings has one page shell");
  const title = shells[0].attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(settings) === "title");
  assert.ok(title && ts.isJsxAttribute(title) && title.initializer && ts.isStringLiteral(title.initializer));
  assert.equal(title.initializer.text, "Settings");
});

function provider(product: TestProvider["product"], providerName: string): TestProvider {
  return {
    product,
    providerName,
    environment: "Test mode",
    credentialsPresent: true,
    searchEnabled: true,
    bookingEnabled: false,
    lastSuccessfulRequest: "2026-07-16 10:00 UTC",
    lastFailedRequest: null,
    notes: `${product} provider notes`,
  };
}
