import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.ADMIN_ACTIVITY_QA_URL;
const output = process.env.ADMIN_ACTIVITY_QA_OUTPUT;
assert.ok(base && output, "Use the isolated labelled Activity QA fixture");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(25000);
const errors = [];
page.on("pageerror", error => errors.push(error.message));

async function revealRecordedEvents() {
  const collapsed = page.locator('button[aria-controls^="journey-"][aria-expanded="false"]');
  while (await collapsed.count()) await collapsed.first().click();
  const runs = page.getByRole("button", { name: "Show all", exact: true });
  while (await runs.count()) await runs.first().click();
}

async function headingDestinations() {
  return page.locator('button[aria-controls^="journey-"]').evaluateAll(buttons =>
    buttons.map(button => button.parentElement.querySelector("a")?.getAttribute("href")));
}

try {
  let originalDestinations;
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "/before");
    await expect(page.getByTestId("fixture-label")).toContainText("synthetic activity");
    await revealRecordedEvents();
    originalDestinations = await headingDestinations();
    assert.equal(originalDestinations.length, 6);
    await page.screenshot({ path: output + "/actions-before-guest-" + width + ".png", fullPage: true });

    for (const kind of ["guest", "user"]) {
      const id = kind === "guest" ? "qa-guest-activity-0001" : "qa-registered-0001";
      await page.goto(base + "/admin/users/" + kind + "/" + id + "/activity");
      await revealRecordedEvents();
      const history = page.getByRole("region", { name: "Activity history", exact: true });
      await expect(history.locator("[data-activity-id]")).toHaveCount(14);
      await expect(history.getByRole("link", { name: /Open search|Open journey/ })).toHaveCount(0);
      await expect(history.locator('[data-activity-id] a, [data-activity-id] [role="link"]')).toHaveCount(0);
      const views = history.getByRole("link", { name: /^View activity for / });
      await expect(views).toHaveCount(6);
      assert.deepEqual(await views.allTextContents(), Array(6).fill("View"));
      assert.deepEqual(await headingDestinations(), originalDestinations, "Same journey targets and date/environment scope");
      await expect(history.locator('[data-activity-id="j-qa-hotel-search"]')).toContainText("Hotel · Johannesburg, South Africa · Success");
      await expect(history.locator('[data-activity-id="j-qa-flight-search"]')).toContainText("Flight · LOS → IST · Success");
      await expect(history.locator('[data-activity-id="j-qa-flight-offer"]')).toContainText("Flight · LOS → IST · Jetabroad");
      await expect(history.locator('[data-activity-id="j-qa-flight-handoff"]')).toContainText("Flight · LOS → IST · Duffel");
      await expect(history).not.toContainText(/\b(?:FLIGHT|HOTEL|CAR|PACKAGE) ·| · SUCCESS\b/);
      await views.first().focus();
      await expect(views.first()).toBeFocused();
      const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      assert.ok(widths.document <= widths.viewport + 1, "No horizontal overflow: " + JSON.stringify(widths));
      await page.screenshot({ path: output + "/actions-after-" + kind + "-" + width + ".png", fullPage: true });
      console.log("PASS Activity actions, readable labels and unchanged destinations", kind, width);
    }
  }

  for (const kind of ["guest", "user"]) {
    await page.goto(base + "/admin/users/" + kind + "/qa-complete-history-0001/activity");
    const history = page.getByRole("region", { name: "Activity history", exact: true });
    await expect(history.locator("[data-activity-id]")).toHaveCount(1005);
    await expect(history.locator("[data-activity-id] a")).toHaveCount(0);
    await expect(history.getByRole("link", { name: /^View activity for / })).toHaveCount(0);
    await expect(history.getByRole("link", { name: /Open search|Open journey|Load (older|newer) activity/ })).toHaveCount(0);
    console.log("PASS standalone full search history has no replacement links", kind);
  }
  assert.deepEqual(errors, [], "No client exceptions");
} finally {
  await browser.close();
}
