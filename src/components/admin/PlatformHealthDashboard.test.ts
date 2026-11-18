import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";
import { parsePlatformHealthView, failureRate, searchInvestigationHref } from "@/lib/platformHealthPresentation";
import { platformFixture } from "../../../qa/stage06/fixtures";
const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { PlatformHealthDashboard } = jiti("./PlatformHealthDashboard") as typeof import("./PlatformHealthDashboard");
const { OperationalStatus } = jiti("./OperationalStatus") as typeof import("./OperationalStatus");
const { AppRouterContext } = jiti("next/dist/shared/lib/app-router-context.shared-runtime") as typeof import("next/dist/shared/lib/app-router-context.shared-runtime");
const router = { push() { }, replace() { }, refresh() { }, back() { }, forward() { }, prefetch() { } };
function render(unavailable = false, application: "ALL" | "IOS" = "ALL") { return renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router as never }, createElement(PlatformHealthDashboard, { data: platformFixture(unavailable), hours: 24, application }))); }
test("health renders separate measures, labels shared scope and retains explicit native UNKNOWN", () => {
    const html = render();
    for (const value of ["Search operations", "Provider calls", "Referral handoffs", "48", "Shared services", "does not filter", "Own last 24 hours", "No reliable installed-app crash evidence", "No Preview release evidence", "Not measured", "Running", "Completed with failure", "Scheduled-job observations table"])
        assert.ok(html.includes(value), value);
    assert.doesNotMatch(html, />0 ms<|crash-free installed applications<\/h|Booking revenue|Active devices/);
    assert.match(html, /name="application"/);
    assert.match(html, /name="hours"/);
    assert.match(html, /action="\/admin\/platform-health"/);
    assert.match(html, /Window:/);
    assert.doesNotMatch(html, /Last observed/);
    assert.match(html, /Refresh observations/);
    assert.match(html, /Apply view/);
    assert.match(html, /Shared controls &amp; content/);
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
    assert.deepEqual(parsePlatformHealthView(new URLSearchParams()), { hours: 24, application: "ALL" });
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
    const overview = renderToStaticMarkup(createElement(PlatformOverviewSummary, { data: platformFixture(), hours: 24 }));
    for (const label of ["All Platforms", "Website", "iOS", "Android", "Unknown"])
        assert.ok(overview.includes(label));
    assert.match(overview, />48</);
    assert.equal((overview.match(/>12</g) || []).length, 4);
    assert.match(overview, /Separate from website presence/);
    const missing = renderToStaticMarkup(createElement(PlatformOverviewSummary, { data: platformFixture(true), hours: 24 }));
    assert.match(missing, /unavailable/);
    assert.doesNotMatch(missing, />0</);
});
