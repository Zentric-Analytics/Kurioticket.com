import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import ts from "typescript";
import { ResultsAvailabilityNotice } from "./ResultsAvailabilityNotice";
import { RESULTS_AVAILABILITY_NOTICE } from "../../shared/presentation/resultsAvailabilityNotice";

const requireFromRoot = createRequire(path.resolve("package.json"));
const { renderToString } = requireFromRoot("react-dom/server") as { renderToString(node: ReactNode): string };
const exactCopy = "Results are not bookable at this time. Live results will be available soon!!!";
const states = ["loading", "populated", "empty", "error", "unavailable"] as const;
const products = ["flights", "hotels", "cars"] as const;
type Page = (props: { searchParams: Promise<Record<string, string>> }) => Promise<ReactNode>;

// Render the real route shell and notice. Search/network-dependent children are
// fixtures: this tests presentation across states without contacting providers.
function load<T>(file: string, state: string, supported = true): T {
  const exports: Record<string, unknown> = {};
  const content = () => {
    if (state === "loading") throw new Promise(() => {});
    return createElement("main", { "data-search-state": state },
      state === "populated" ? createElement("article", { "data-result-card": true },
        createElement("a", { href: "https://provider.example/in?offer=selected", "data-offer-id": "selected" }, "View deal")) : state);
  };
  const translations = new Proxy({}, { get: (_target, key) => String(key) });
  const bindings: Record<string, unknown> = {
    react: requireFromRoot("react"), "react/jsx-runtime": requireFromRoot("react/jsx-runtime"),
    "next/link": ({ children, ...props }: { children: ReactNode }) => createElement("a", props, children),
    "next/headers": { cookies: async () => ({ get: () => undefined }) },
    "next/navigation": { redirect: (href: string) => { throw new Error(`redirect:${href}`); }, notFound: () => { throw new Error("not-found"); } },
    "@/components/results/ResultsAvailabilityNotice": { ResultsAvailabilityNotice },
    "@/lib/i18n": { getTranslations: () => translations },
    "@/lib/i18n/en": { translations },
    "@/lib/preferences/preferences": { LOCALE_COOKIE_KEY: "locale" },
    "@/lib/hotels/hotelResultsRoute": { resolveHotelResultsRoute: () => ({ resultsReady: true }) },
    "@/lib/flights/flightSearchJourney": { parseFlightLegParams: () => [] },
    "@/lib/cars/carSearchLocationTarget": { parseCarLocationTarget: () => undefined },
    "@/lib/cars/carsSearchUtils": { hasExplicitDifferentReturnLocation: () => false },
    "@/lib/cars/carsResultsReloadScroll": { CARS_RESULTS_RELOAD_SCROLL_SCRIPT: "" },
    "@/lib/validation": { flightSearchSchema: { safeParse: () => ({ success: true, data: {} }) } },
    "@/services/travel/kayakSandbox": { isKayakSandboxEnabled: () => true },
    "@/services/travel/kayakSearchAdapter": {
      adaptKayakFlightSearch: () => ({ supported, search: {}, reason: "Unavailable" }),
      adaptKayakCarSearch: () => ({ supported, search: {}, reason: "Unavailable" }),
    },
  };
  const source = readFileSync(file, "utf8");
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, {
    exports, URL, Date,
    require: (name: string) => {
      if (name in bindings) return bindings[name];
      if (name.startsWith("@/components/layout/")) return new Proxy({}, { get: (_target, key) => key === "__esModule" ? true : () => createElement("div", { "data-layout": String(key) }) });
      if (["FlightResultsClient", "HotelResultsClient", "CarInventoryLoader", "KayakSandboxResults"].some(component => name.endsWith(`/${component}`))) {
        return { [name.split("/").at(-1)!]: content };
      }
      if (name.endsWith("/CarsResultsMobileSafeArea")) return { CarsResultsMobileSafeArea: () => null };
      throw new Error(`Unexpected route dependency: ${name}`);
    },
  });
  return exports as T;
}

const query = {
  origin: "BOS", destination: "London", departureDate: "2099-05-01", tripType: "one-way",
  checkIn: "2099-05-01", checkOut: "2099-05-03", guests: "2", rooms: "1",
  pickupLocation: "London Heathrow", pickupDate: "2099-05-01", dropoffDate: "2099-05-03",
};
function assertOneNotice(html: string) {
  assert.equal(html.split(exactCopy).length - 1, 1);
  assert.equal((html.match(/data-results-availability-notice/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<article[^>]*>[\s\S]*?Results are not bookable[\s\S]*?<\/article>/);
}

test("shared notice preserves the exact approved copy and has one responsive paragraph", () => {
  assert.equal(RESULTS_AVAILABILITY_NOTICE, exactCopy);
  const html = renderToString(createElement(ResultsAvailabilityNotice));
  assertOneNotice(html);
  assert.match(html, /role="note"/);
  assert.doesNotMatch(html, /hidden|aria-live|button|disabled|href=/);
});

for (const product of products) {
  for (const state of states) test(`${product} route renders one notice with ${state} search content`, async () => {
    const page = load<{ default: Page }>(`src/app/${product}/results/page.tsx`, state).default;
    const html = renderToString(await page({ searchParams: Promise.resolve(query) }));
    assertOneNotice(html);
    if (state === "populated") {
      assert.match(html, /href="https:\/\/provider.example\/in\?offer=selected"/);
      assert.match(html, /data-offer-id="selected"/);
    }
  });
  test(`${product} route-level loading fallback renders one notice`, () => {
    const loading = load<{ default: () => ReactNode }>(`src/app/${product}/results/loading.tsx`, "loading").default;
    assertOneNotice(renderToString(createElement(loading)));
  });
  for (const supported of [true, false]) test(`${product} explicit sandbox route retains one notice (supported=${supported})`, async () => {
    const page = load<{ default: Page }>(`src/app/${product}/results/page.tsx`, "populated", supported).default;
    assertOneNotice(renderToString(await page({ searchParams: Promise.resolve({ ...query, provider: "kayak-sandbox" }) })));
  });
}

test("notice consumers are limited to product result shells, excluding cards, details and Deals", () => {
  const allowed = new Set(products.flatMap(product => ["page.tsx", "loading.tsx"].map(file => `src/app/${product}/results/${file}`)));
  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.posix.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/\.tsx$/.test(file) && file !== "src/components/results/ResultsAvailabilityNotice.tsx") {
        const source = readFileSync(file, "utf8");
        if (/\bResultsAvailabilityNotice\b/.test(source)) assert.ok(allowed.has(file), `Unrelated notice consumer: ${file}`);
      }
    }
  }
  visit("src");
});
