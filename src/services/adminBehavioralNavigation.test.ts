import assert from "node:assert/strict";
import { test } from "node:test";
import definitions from "../../config/activity-tracking/definitions.json";
import { homepageCmsSections } from "@/lib/adminHomepageCms";
import { getAdminNavForRole } from "@/lib/adminNavigation";
import {
  adminBehavioralDestinationKey,
  createAdminBehavioralNavigationRecorder,
} from "./adminBehavioralNavigation";

const routeTemplate = "/admin/users/[kind]/[id]/activity";
const firstVisit = {
  routeTemplate,
  accountSessionIdAtOccurrence: "synthetic-admin-session",
  occurrenceId: "e7a68b36-6729-4a63-8b11-0bfdc7892aa1",
};

const approvedScope = {
  actorUserId: "synthetic-administrator",
  accountSessionId: firstVisit.accountSessionIdAtOccurrence,
  environment: "staging",
  platform: "mobile_web",
  approval: {
    status: "approved",
    purpose: "admin_workspace_navigation",
    noticeReference: "synthetic-notice",
    viewerPermission: "synthetic-authorized-viewer",
    retentionPolicyReference: "synthetic-retention-reference",
    destinationKeys: new Set([routeTemplate, `${routeTemplate}#activity-details`]),
  },
} as const;

test("the dormant Admin catalogue covers each reviewed canonical page and excludes every alias", () => {
  const sourceToTemplate = (source: string) => source.replace(/^src\/app/, "").replace(/\/page\.[jt]sx?$/, "");
  for (const source of definitions.routes.admin.deferred) {
    const template = sourceToTemplate(source);
    assert.equal(adminBehavioralDestinationKey(template), template);
  }
  for (const source of definitions.routes.admin.excluded) {
    assert.equal(adminBehavioralDestinationKey(sourceToTemplate(source)), null);
  }
  for (const [template, sections] of Object.entries(definitions.adminBehavioralSections.routes)) {
    assert.equal(new Set(sections).size, sections.length);
    for (const section of sections) {
      assert.equal(adminBehavioralDestinationKey(template, section), `${template}#${section}`);
    }
  }
  assert.equal(adminBehavioralDestinationKey("/admin/settings", "notifications"), "/admin/settings#notifications");
});

test("Admin section identifiers cannot contain customer identifiers, credentials or raw URLs", () => {
  assert.equal(adminBehavioralDestinationKey("/admin/users/user/customer-123/activity"), null);
  assert.equal(adminBehavioralDestinationKey("/admin/providers?view=attribution"), null);
  assert.equal(adminBehavioralDestinationKey("/admin/providers", "referral-attribution&q=someone@example.invalid"), null);
  assert.equal(adminBehavioralDestinationKey("/admin/users", "audit-log-details"), null);
  assert.equal(adminBehavioralDestinationKey("/dashboard", "notifications"), null);
});

test("the current Admin workspace links and Homepage CMS variants have destination definitions", () => {
  for (const { href } of getAdminNavForRole("ADMIN", true)) {
    const cmsSection = /^\/admin\/content\/homepage\/([^/]+)$/.exec(href)?.[1];
    if (cmsSection) assert.ok(adminBehavioralDestinationKey("/admin/content/homepage/[section]", cmsSection), href);
    else assert.ok(adminBehavioralDestinationKey(href), href);
  }
  for (const section of Object.keys(homepageCmsSections)) {
    assert.ok(adminBehavioralDestinationKey("/admin/content/homepage/[section]/new", section));
    assert.ok(adminBehavioralDestinationKey("/admin/content/homepage/[section]/[id]", section));
  }
});

test("missing employee approval, incomplete policy and a changed session cannot write", async () => {
  const appendOnce = async (): Promise<never> => assert.fail("Unauthorized Admin observation reached a writer");
  assert.equal(await createAdminBehavioralNavigationRecorder({ appendOnce })(firstVisit), "disabled");
  assert.equal(await createAdminBehavioralNavigationRecorder({
    appendOnce,
    resolveVerifiedScope: async () => null,
  })(firstVisit), "disabled");
  assert.equal(await createAdminBehavioralNavigationRecorder({
    appendOnce,
    resolveVerifiedScope: async () => ({ ...approvedScope, approval: { ...approvedScope.approval, viewerPermission: "" } }),
  })(firstVisit), "disabled");
  const record = createAdminBehavioralNavigationRecorder({
    appendOnce,
    resolveVerifiedScope: async () => ({ ...approvedScope, accountSessionId: "another-admin-session" }),
  });
  assert.equal(await record(firstVisit), "disabled");
  assert.equal(await createAdminBehavioralNavigationRecorder({
    appendOnce,
    resolveVerifiedScope: async () => approvedScope,
  })({ ...firstVisit, routeTemplate: "/admin/logs" }), "disabled");
});

test("synthetic scope attributes activity to the administrator with stable occurrence IDs", async () => {
  const events = new Map<string, unknown>();
  const record = createAdminBehavioralNavigationRecorder({
    resolveVerifiedScope: async () => approvedScope,
    appendOnce: async (event) => {
      const key = `${event.environment}:${event.actor.userId}:${event.occurrenceId}`;
      if (events.has(key)) return "duplicate";
      events.set(key, event);
      return "recorded";
    },
  });
  const extra = { ...firstVisit, targetId: "other-customer", previousKey: "/admin/logs", platform: "ios" };
  assert.deepEqual(await Promise.all([
    record(extra), record({ ...extra, occurrenceId: extra.occurrenceId.toUpperCase() }),
  ]), ["recorded", "duplicate"]);
  assert.deepEqual([...events.values()], [{
    actor: { identity: "administrator", userId: approvedScope.actorUserId },
    interface: "admin",
    platform: "mobile_web",
    environment: "staging",
    occurrenceId: firstVisit.occurrenceId,
    category: "page_visit",
    destinationKey: routeTemplate,
  }]);
  const secondVisit = { ...firstVisit, occurrenceId: "211f5fef-9468-4d82-90e0-b0afaf0b06e9" };
  assert.equal(await record(secondVisit), "recorded");
  const sectionVisit = { ...firstVisit, section: "activity-details", occurrenceId: "b1dd7621-3fb5-4d7f-9e3c-df46eb519fe0" };
  assert.equal(await record(sectionVisit), "recorded");
  assert.deepEqual([...events.values()][2], {
    actor: { identity: "administrator", userId: approvedScope.actorUserId },
    interface: "admin",
    platform: "mobile_web",
    environment: "staging",
    occurrenceId: sectionVisit.occurrenceId,
    category: "section_visit",
    destinationKey: `${routeTemplate}#activity-details`,
  });
  assert.equal(await record({ ...firstVisit, occurrenceId: "not-an-occurrence-id" }), "invalid");
});
