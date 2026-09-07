import assert from "node:assert/strict";
import test from "node:test";
import type { WebBrowserResultType } from "expo-web-browser";
import { navigateProfileDestination, openPreviewLegalBrowser } from "./profileNavigation";
import { authenticatedProfileSections } from "./profileModel";

test("native profile destinations keep using app navigation", async () => {
  const pushed: string[] = [];
  const opened: string[] = [];

  await navigateProfileDestination(
    { kind: "native", href: "/saved" },
    { isPreview: true, apiBaseUrl: "https://staging.kurioticket.com" },
    {
      push: (href) => pushed.push(href),
      openBrowser: async (url) => { opened.push(url); },
    },
  );

  assert.deepEqual(pushed, ["/saved"]);
  assert.deepEqual(opened, []);
});

test("Preview legal destinations open the clean staging document in the system in-app browser", async () => {
  const pushed: string[] = [];
  const opened: string[] = [];

  await navigateProfileDestination(
    { kind: "preview-browser", path: "/mobile/legal/terms-of-service", productionHref: "/(tabs)/profile/terms-of-service" },
    { isPreview: true, apiBaseUrl: "https://staging.kurioticket.com/" },
    {
      push: (href) => pushed.push(href),
      openBrowser: async (url) => { opened.push(url); },
    },
  );

  assert.deepEqual(opened, ["https://staging.kurioticket.com/mobile/legal/terms-of-service"]);
  assert.deepEqual(pushed, []);
});

test("Production keeps the existing native legal route and never opens a browser", async () => {
  const pushed: string[] = [];
  const opened: string[] = [];

  await navigateProfileDestination(
    { kind: "preview-browser", path: "/mobile/legal/privacy-policy", productionHref: "/(tabs)/profile/privacy-policy" },
    { isPreview: false, apiBaseUrl: "https://www.kurioticket.com" },
    {
      push: (href) => pushed.push(href),
      openBrowser: async (url) => { opened.push(url); },
    },
  );

  assert.deepEqual(pushed, ["/(tabs)/profile/privacy-policy"]);
  assert.deepEqual(opened, []);
});

test("Preview legal browser failure does not redirect to the old native legal screen", async () => {
  const pushed: string[] = [];

  await navigateProfileDestination(
    { kind: "preview-browser", path: "/mobile/legal/privacy-policy", productionHref: "/(tabs)/profile/privacy-policy" },
    { isPreview: true, apiBaseUrl: "https://staging.kurioticket.com" },
    {
      push: (href) => pushed.push(href),
      openBrowser: async () => { throw new Error("browser unavailable"); },
    },
  );

  assert.deepEqual(pushed, []);
});

const legalItems = authenticatedProfileSections.find(({ title }) => title === "aboutLegal")!.items;

for (const { label, destination } of legalItems) {
  assert.equal(destination.kind, "preview-browser");
  if (destination.kind !== "preview-browser") throw new Error("Expected legal browser destination");

  for (const platform of ["ios", "android"]) {
    for (const outcome of ["cancel", "dismiss", "error"] as const) {
      test(`${platform} Preview ${label}: correct native browser API and silent ${outcome}`, async () => {
        const calls: unknown[][] = [];
        const pushed: string[] = [];
        const finish = async () => {
          if (outcome === "error") throw new Error("browser unavailable");
          return { type: outcome as WebBrowserResultType.CANCEL | WebBrowserResultType.DISMISS };
        };
        await navigateProfileDestination(destination, {
          isPreview: true, apiBaseUrl: "https://staging.kurioticket.com/",
        }, {
          push: (href) => { pushed.push(href); },
          openBrowser: (url) => openPreviewLegalBrowser(url, platform, {
            openAuthSessionAsync: async (...args) => { calls.push(["auth", ...args]); return finish(); },
            openBrowserAsync: async (...args) => { calls.push(["browser", ...args]); return finish(); },
          }),
        });
        const url = `https://staging.kurioticket.com/mobile/legal/${label === "terms" ? "terms-of-service" : "privacy-policy"}`;
        assert.deepEqual(calls, [platform === "ios" ? ["auth", url, null] : ["browser", url]]);
        assert.deepEqual(pushed, []);
      });
    }

    test(`${platform} Production ${label} keeps native navigation without loading a browser`, async () => {
      const pushed: string[] = [];
      await navigateProfileDestination(destination, {
        isPreview: false, apiBaseUrl: "https://kurioticket.com",
      }, {
        push: (href) => { pushed.push(href); },
        openBrowser: async () => { assert.fail("Production must not load the browser"); },
      });
      assert.deepEqual(pushed, [`/(tabs)/profile/${label === "terms" ? "terms-of-service" : "privacy-policy"}`]);
    });
  }
}
