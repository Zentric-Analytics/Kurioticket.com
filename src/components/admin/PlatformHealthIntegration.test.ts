import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { parsePlatformHealthView, applicationLabel } from "@/lib/platformHealthPresentation";
import { getAdminNavForRole, getAdminHeaderGroups } from "@/lib/adminNavigation";
import { searchActivityDetailQuery, searchActivityReturnHref } from "@/lib/adminSearchActivityNavigation";
import { searchWorkspaceHref } from "@/lib/adminSearchWorkspace";
test("Platform Health page guards both canonical session and strict API admin access before any monitoring read", async () => {
    let session = true, api = true, reads = 0;
    const modules: Record<string, unknown> = {
        "next/navigation": { redirect: () => { throw Error("redirect"); } }, "next/link": { default: () => null }, "react/jsx-runtime": { jsx: () => null, jsxs: () => null },
        "@/lib/auth-guards": { requireAdminSession: async () => { if (!session)
                throw Error("denied"); } }, "@/lib/admin": { requireAdminApiSession: async () => api ? { session: {} } : { response: Response.json({}, { status: 403 }) } },
        "@/components/admin/AdminPageShell": {}, "@/components/admin/PlatformHealthDashboard": {}, "@/lib/platformHealthPresentation": { parsePlatformHealthView }, "@/lib/adminViewerTimeZone.server": { getAdminViewerTimeZone: async () => "Africa/Lagos" }, "@/services/platformOperationsService": { readPlatformOperations: async (_hours: number, _period: string, timeZone: string) => { assert.equal(timeZone, "Africa/Lagos"); reads++; return {}; } }
    };
    const exported: {
        default: (props: {
            searchParams: Promise<Record<string, string>>;
        }) => Promise<unknown>;
    } = {} as never;
    runInNewContext(ts.transpileModule(readFileSync("src/app/admin/platform-health/page.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports: exported, URLSearchParams, require: (id: string) => { assert.ok(id in modules, id); return modules[id]; } });
    const props = { searchParams: Promise.resolve({}) };
    session = false;
    await assert.rejects(exported.default(props), /denied/);
    session = true;
    api = false;
    await assert.rejects(exported.default(props), /redirect/);
    assert.equal(reads, 0);
    api = true;
    await exported.default({ searchParams: Promise.resolve({ hours: "24", environment: "production" }) });
    assert.equal(reads, 0);
    await exported.default(props);
    assert.equal(reads, 1);
    const layout = readFileSync("src/app/admin/layout.tsx", "utf8");
    assert.match(layout, /restricted emergency view/);
    assert.doesNotMatch(layout, /readPlatformOperations/);
});
test("source-filtered search investigation keeps filters and excludes source from unsupported handoffs", () => {
    const raw = { applicationSource: "UNKNOWN", product: "HOTEL", status: "FAILED", provider: "Duffel", identity: "guest", range: "custom", from: "2026-11-01T00:00:00Z", to: "2026-11-02T00:00:00Z" };
    const detail = searchActivityDetailQuery(raw), back = searchActivityReturnHref(raw);
    for (const [key, value] of Object.entries(raw)) {
        assert.equal(new URLSearchParams(detail).get(key), value);
        assert.equal(new URL(back, "https://example.invalid").searchParams.get(key), value);
    }
    assert.ok(searchWorkspaceHref("searches", raw).includes("applicationSource=UNKNOWN"));
    assert.ok(!searchWorkspaceHref("handoffs", raw).includes("applicationSource"));
    assert.equal(applicationLabel(undefined), "Unknown");
});
test("health navigation is ADMIN-only, discoverable and overview has a separate live presence metric", () => {
    assert.ok(getAdminNavForRole("ADMIN").some(item => item.href === "/admin/platform-health"));
    assert.deepEqual(getAdminNavForRole("USER"), []);
    assert.deepEqual(getAdminNavForRole("SUPPORT"), []);
    assert.ok(getAdminHeaderGroups("ADMIN").find(group => group.label === "System & security")?.links.some(link => link.item.href === "/admin/platform-health" && link.item.label === "Platforms"));
    const page = readFileSync("src/app/admin/page.tsx", "utf8"), overview = readFileSync("src/components/admin/AdminOverviewDashboard.tsx", "utf8");
    assert.match(page, /<PlatformOverviewSummary/);
    assert.match(page, /requireAdminApiSession/);
    assert.match(overview, /Online Users/);
    assert.match(overview, /website, Admin panel, Android, and iOS/);
    const scope = readFileSync("src/components/admin/SettingsFeatureSection.tsx", "utf8");
    assert.match(scope, /Scope: shared backend/);
    assert.match(scope, /reauthentication/);
});
