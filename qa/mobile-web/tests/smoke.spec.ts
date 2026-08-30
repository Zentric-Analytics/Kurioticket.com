import { expect, test } from "@playwright/test";
import { writeArtifact } from "../helpers/artifacts";

test("real iOS Safari opens Kurioticket staging", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/Kurioticket/i);

  const browser = await page.evaluate(() => ({
    href: location.href,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
  }));
  const session = JSON.parse(await page.evaluate(
    () => "",
    `browserstack_executor: ${JSON.stringify({ action: "getSessionDetails" })}`,
  ));

  const screenshot = testInfo.outputPath("real-ios-safari-smoke.png");
  await page.screenshot({ path: screenshot, fullPage: false });
  await testInfo.attach("real iOS Safari screenshot", { path: screenshot, contentType: "image/png" });
  await writeArtifact("smoke.json", {
    browser,
    session: {
      id: session.hashed_id,
      device: session.device,
      os: session.os,
      osVersion: session.os_version,
      browser: session.browser,
      browserVersion: session.browser_version,
      buildId: session.build_hashed_id,
      logsAvailable: Boolean(session.logs),
      videoAvailable: Boolean(session.video_url),
    },
  });

  expect(session.device).toBeTruthy();
  expect(String(session.os).toLowerCase()).toContain("ios");
  // BrowserStack identifies real Mobile Safari sessions as the "iphone" browser.
  expect(String(session.browser).toLowerCase()).toMatch(/iphone|safari/);
  expect(browser.userAgent).toMatch(/iPhone/);
  expect(browser.userAgent).toMatch(/Safari/);
});
