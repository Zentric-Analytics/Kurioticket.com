import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";
import { parsePlatformHealthView, failureRate, searchInvestigationHref } from "@/lib/platformHealthPresentation";
import { platformFixture } from "../../../qa/stage06/fixtures";
const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { PlatformHealthDashboard } = jiti("./PlatformHealthDashboard") as typeof import("./PlatformHealthDashboard");
const { OperationalStatus } = jiti("./OperationalStatus") as typeof import("./OperationalStatus");
const { AppRouterContext } = jiti("next/dist/shared/lib/app-router-context.shared-runtime") as typeof import("next/dist/shared/lib/app-router-context.shared-runtime");
const filtersSource = readFileSync("src/components/admin/PlatformHealthFilters.tsx", "utf8");
const router = { push() { }, replace() { }, refresh() { }, back() { }, forward() { }, prefetch() { } };
function render(unavailable = false, application: "ALL" | "IOS" = "ALL") { return renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router as never }, createElement(PlatformHealthDashboard, { data: platformFixture(unavailable), hours: 24, period: "today", application }))); }
test("health renders separate measures, labels shared scope and retains explicit native UNKNOWN", () => {
    const html = render();
    for (const value of ["Search operations", "Provider calls", "Referral handoffs", "48", "Shared services", "does not filter", "Own last 24 hours", "No reliable installed-app crash evidence", "No Preview release evidence", "Not measured", "Running", "Completed with failure", "Scheduled-job observations table"])
        assert.ok(html.includes(value), value);
    assert.doesNotMatch(html, />0 ms<|crash-free installed applications<\/h|Booking revenue|Active devices/);
    assert.match(html, /name="application"/);
    assert.match(html, /name="window"/);
    assert.match(html, /action="\/admin\/platform-health"/);
    assert.match(html, /Window:/);
    assert.doesNotMatch(html, /Last observed/);
    assert.match(html, /Refresh observations/);
    assert.match(html, /Apply view/);
    assert.match(html, /Shared controls &amp; content/);
    assert.match(html, /href="\/admin\/platforms\/devices"/);
    assert.match(html, /View Platform Metrics/);
    assert.match(html, /No reliable installed-app crash evidence is configured/);
    assert.equal((html.match(/href="\/admin\/platforms\/devices"/g) ?? []).length, 1,
      "Existing native-app health signal owns the single Platform Metrics link");

    assert.match(html, /No installed-client content-consumption acknowledgment is collected/);
    for (const href of ["/admin/settings", "/admin/content", "/admin/logs", "/admin/notifications", "/admin/providers", "/admin/email-delivery"])
        assert.ok(html.includes(href));
    assert.match(html, /overflow-x-auto/);
    assert.match(html, /scope="col"/);
    assert.match(html, /tabIndex="0"/i);
});
test("application selection uses only the activity partition; unavailable cannot become healthy zero", () => {
    const ios = render(false, "IOS");
    assert.match(ios, /iOS activity/);
    assert.match(ios, />12</);
    assert.doesNotMatch(ios, />48</);
    const missing = render(true);
    assert.match(missing, /Monitoring unavailable/);
    assert.match(missing, /Job observations are unavailable/);
    assert.doesNotMatch(missing, />0</);
});
test("strict view parsing, rates and investigation scope preserve truthful windows", () => {
    for (const q of ["hours=24&hours=168", "application=IOS&application=WEB", "hours=25", "hours=1e2", "environment=production", "application=native"])
        assert.equal(parsePlatformHealthView(new URLSearchParams(q)), null);
    assert.deepEqual(parsePlatformHealthView(new URLSearchParams()), { hours: 24, period: "today", application: "ALL" });
    assert.deepEqual(parsePlatformHealthView(new URLSearchParams("hours=24")), {hours:24, period:"rolling", application:"ALL"});
    assert.equal(failureRate({ total: 10, disabled: 2, failed: 2 }), "25.0%");
    assert.equal(failureRate({ total: 0, disabled: 0, failed: 0 }), "Not measured");
    const window = platformFixture().window;
    const url = new URL(searchInvestigationHref(window, "UNKNOWN"), "https://example.invalid");
    assert.equal(url.searchParams.get("applicationSource"), "UNKNOWN");
    assert.equal(url.searchParams.get("from"), window.from);
    assert.equal(url.searchParams.get("range"), "custom");
});
for (const state of ["HEALTHY", "DEGRADED", "FAILING", "DISABLED", "UNKNOWN", "MONITORING_UNAVAILABLE"])
    test(`status ${state} has text independent of color`, () => { assert.equal(renderToStaticMarkup(createElement(OperationalStatus, { state })).replace(/<[^>]+>/g, "").trim(), ({HEALTHY:"Healthy",DEGRADED:"Degraded",FAILING:"Failing",DISABLED:"Disabled",UNKNOWN:"Unknown",MONITORING_UNAVAILABLE:"Monitoring unavailable"} as Record<string,string>)[state]); });
test("empty activity remains UNKNOWN with no invented latency; Overview lists all partitions", () => {
    const { PlatformActivitySummary } = jiti("./PlatformActivitySummary") as typeof import("./PlatformActivitySummary");
    const empty = renderToStaticMarkup(createElement(PlatformActivitySummary, { label: "Search operations", value: { total: 0, successful: 0, partial: 0, failed: 0, disabled: 0, averageLatencyMs: null, state: "UNKNOWN" }, href: "/admin/searches/activity", linkLabel: "Investigate" }));
    assert.match(empty, /Unknown/);
    assert.match(empty, />0</);
    assert.match(empty, /Not measured/);
    assert.doesNotMatch(empty, />Healthy<|>0 ms</);
    const { PlatformOverviewSummary } = jiti("./PlatformOverviewSummary") as typeof import("./PlatformOverviewSummary");
    const fixture = platformFixture();
    const data = { environment: fixture.environment, window: fixture.window, searches: fixture.activity.data!.searches, verifiedBotAttempts: 7 };
    const overview = renderToStaticMarkup(createElement(PlatformOverviewSummary, { data }));
    for (const label of ["All Platforms", "Website", "iOS", "Android", "Bots", "unverified platform searches"])
        assert.ok(overview.includes(label));
    assert.match(overview, />48</);
    assert.equal((overview.match(/>12</g) || []).length, 3);
    assert.match(overview, />7</);
    assert.match(overview, /Bots counts verified crawler search requests blocked/);
    assert.match(overview, />Platform Search Activity</);
    assert.match(overview, /View details/);
    assert.doesNotMatch(overview, /View Search Activity →/);
    assert.doesNotMatch(overview, /Separate from website presence/);
    assert.match(overview, /aria-label="Platform search activity by application"/);
    assert.match(overview, /role="region"/);
    assert.match(overview, /tabindex="0"/);
    assert.doesNotMatch(overview, /overflow-x-auto/);
    assert.match(overview, /grid-cols-2 gap-2 sm:grid-cols-3/);
    assert.equal((overview.match(/bg-slate-50 p-3/g) || []).length, 5);
    const links = Array.from(overview.matchAll(/href="([^"]+)"/g), ([, href]) =>
        new URL(href.replaceAll("&amp;", "&"), "https://example.invalid"));
    assert.equal(links.length, 6);
    for (const url of links) {
        assert.equal(url.pathname, "/admin/searches/activity");
        assert.equal(url.searchParams.get("range"), "custom");
        assert.equal(url.searchParams.get("from"), "2026-11-15T00:00:00.000Z");
        assert.equal(url.searchParams.get("to"), "2026-11-16T00:00:00.000Z");
    }
    assert.deepEqual(links.map(url => url.searchParams.get("applicationSource")), [null, null, "WEB", "IOS", "ANDROID", "UNKNOWN"]);

    const missing = renderToStaticMarkup(createElement(PlatformOverviewSummary, { data: { ...data, searches: null } }));
    assert.match(missing, /unavailable/);
    assert.doesNotMatch(missing, />0</);
});

test("Platform Health filter dropdowns use polished accessible Admin selectors with native SSR fallback", () => {
    const directorySource = readFileSync("src/components/admin/AdminDirectorySelect.tsx", "utf8");
    assert.match(filtersSource, /<AdminDirectorySelect/);
    assert.match(filtersSource, /compact attached/);
    assert.match(directorySource, /role="combobox"/);
    assert.match(directorySource, /role="listbox"/);
    assert.match(directorySource, /<select/);
    assert.match(filtersSource, /action="\/admin\/platform-health"/);
    assert.match(filtersSource, /method="get"/);
    for (const value of ["24", "168", "720", "ALL", "WEB", "IOS", "ANDROID", "UNKNOWN"]) {
      assert.ok((filtersSource + readFileSync("src/lib/platformHealthPresentation.ts", "utf8")).includes('"' + value + '"'));
    }
    assert.match(filtersSource, /sm:grid-cols-2/);
    assert.match(filtersSource, /lg:grid-cols-/);
    assert.match(filtersSource, /Apply view/);
    const html = render();
    for (const option of ["All Platforms", "Website", "iOS", "Android", "Unverified", "Today", "Last 7 days", "Last 30 days"]) {
      assert.ok(html.includes(option), option);
    }
});
