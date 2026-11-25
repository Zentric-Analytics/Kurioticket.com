import assert from "node:assert/strict";
import test from "node:test";
import { toAdminPageView } from "./adminPageView";

const at = new Date("2026-11-24T16:37:26Z");

test("historical and current page views share concise platform labels without changing stored attribution", () => {
  const cases = [
    ["native", "iOS app (reported)", "iOS app"],
    ["native", "iOS app", "iOS app"],
    ["native", "Android app (reported)", "Android app"],
    ["native", "Android app", "Android app"],
    ["web", "Mobile web (reported)", "Mobile web"],
    ["web", "Mobile web", "Mobile web"],
    ["web", "Desktop web (reported)", "Desktop web"],
    ["web", "Desktop web", "Desktop web"],
    ["native", "Native app", "Native app"],
    ["web", "Website", "Website"],
  ] as const;
  for (const [transport, recordedPlatform, expected] of cases) {
    const metadata = Object.freeze({ pageKey: "support", previousPageKey: "home", transport, environment: "staging", platform: recordedPlatform });
    const row = toAdminPageView({ id: "event-1", createdAt: at, metadata }, "staging");
    assert.ok(row?.pageView);
    assert.equal(row.pageView.platform, expected);
    assert.equal(row.detail, "/support · " + expected);
    assert.equal(row.label, "Support");
    assert.equal(row.id, "e-event-1");
    assert.equal(row.stage, "PAGE_VIEW");
    assert.equal(row.at, at);
    assert.equal(row.pageView.transport, transport);
    assert.equal(row.pageView.path, "/support");
    assert.equal(row.pageView.previousPath, "/");
    assert.equal(row.pageView.href, transport === "web" ? "https://staging.kurioticket.com/support" : null);
    assert.equal(metadata.platform, recordedPlatform);
  }
});

test("unknown platform evidence stays unknown and environment and route checks remain intact", () => {
  const metadata = { pageKey: "support", transport: "web", environment: "production" };
  for (const platform of [undefined, null, "unrecognized (reported)", "constructor", { platform: "iOS" }]) {
    const row = toAdminPageView({ id: "event-2", createdAt: at, metadata: { ...metadata, platform } }, "production");
    assert.equal(row?.pageView?.platform, "Unknown");
    assert.equal(row?.pageView?.href, "https://kurioticket.com/support");
  }
  assert.equal(toAdminPageView({ id: "event-2", createdAt: at, metadata }, "staging"), null);
  assert.equal(toAdminPageView({ id: "event-2", createdAt: at, metadata: { ...metadata, pageKey: "private-route" } }, "production"), null);
  assert.equal(toAdminPageView({ id: "event-2", createdAt: at, metadata: { ...metadata, transport: "unknown" } }, "production"), null);
});
