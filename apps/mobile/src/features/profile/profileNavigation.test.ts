import assert from "node:assert/strict";
import test from "node:test";
import { navigateProfileDestination } from "./profileNavigation";

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

test("Preview legal destinations open the staging page in the system in-app browser", async () => {
  const pushed: string[] = [];
  const opened: string[] = [];

  await navigateProfileDestination(
    { kind: "preview-browser", path: "/terms", productionHref: "/(tabs)/profile/terms-of-service" },
    { isPreview: true, apiBaseUrl: "https://staging.kurioticket.com/" },
    {
      push: (href) => pushed.push(href),
      openBrowser: async (url) => { opened.push(url); },
    },
  );

  assert.deepEqual(opened, ["https://staging.kurioticket.com/terms"]);
  assert.deepEqual(pushed, []);
});

test("Production keeps the existing native legal route and never opens a browser", async () => {
  const pushed: string[] = [];
  const opened: string[] = [];

  await navigateProfileDestination(
    { kind: "preview-browser", path: "/privacy", productionHref: "/(tabs)/profile/privacy-policy" },
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
    { kind: "preview-browser", path: "/privacy", productionHref: "/(tabs)/profile/privacy-policy" },
    { isPreview: true, apiBaseUrl: "https://staging.kurioticket.com" },
    {
      push: (href) => pushed.push(href),
      openBrowser: async () => { throw new Error("browser unavailable"); },
    },
  );

  assert.deepEqual(pushed, []);
});
