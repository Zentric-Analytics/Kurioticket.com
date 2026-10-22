import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const base = process.env.HOTEL_PREVIEW_URL ?? "http://localhost:3003";
const anchor = new Date();
anchor.setMonth(anchor.getMonth() + 1, 1);
const month = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}`;
const query = `destination=New%20York&checkIn=${month}-21&checkOut=${month}-28&guests=2&rooms=1`;

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const width of [320, 413]) {
      const page = await browser.newPage({ viewport: { width, height: 828 }, isMobile: true, hasTouch: true });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${base}/hotels/results?${query}`, { timeout: 120000, waitUntil: "domcontentloaded" });
      await page.locator("[data-hotel-mobile-sticky-search] button").click({ timeout: 90000 });
      const dates = () => page.getByRole("button", { name: "Choose travel dates", exact: true }).click();
      await dates();
      await page.locator(`[data-mobile-calendar-day="${month}-22"] button`).click();
      assert.equal(await page.getByRole("button", { name: "Done", exact: true }).isEnabled(), false);
      await page.keyboard.press("Escape");
      await dates();
      assert.equal(await page.locator(`[data-mobile-calendar-day="${month}-21"] button`).getAttribute("aria-pressed"), "true");
      await page.locator(`[data-mobile-calendar-day="${month}-22"] button`).click();
      await page.locator(`[data-mobile-calendar-day="${month}-29"] button`).click();
      await page.getByRole("button", { name: "Done", exact: true }).click();
      await page.locator('[data-hotel-mobile-edit-row="guests"] button').first().click();
      await page.getByRole("button", { name: /Increase adults/i }).click();
      await page.keyboard.press("Escape");
      await page.locator('[data-hotel-mobile-edit-row="guests"] button').first().click();
      const adults = page.locator("[data-hotel-guest-row]").filter({ hasText: "Adults" });
      assert.match(await adults.innerText(), /2/);
      await page.getByRole("button", { name: /Increase adults/i }).click();
      const doneBox = await page.getByRole("button", { name: "Done", exact: true }).boundingBox();
      assert.ok(doneBox.y + doneBox.height <= 829, "Done stays inside the viewport");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole("button", { name: "Done", exact: true }).click();
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await page.waitForURL(url => url.searchParams.get("guests") === "3" && url.searchParams.get("checkIn") === `${month}-22`, { waitUntil: "domcontentloaded" });

      await page.goto(`${base}/hotels/details/pod-times-square?${query}`, { timeout: 120000, waitUntil: "domcontentloaded" });
      await page.getByRole("tab", { name: "Overview", exact: true }).click({ timeout: 90000 });
      await page.getByRole("button", { name: "Edit stay dates, rooms and guests" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: /Rooms and guests/ }).click();
      await dialog.getByRole("button", { name: "Increase rooms" }).click();
      assert.equal(await dialog.getByRole("button", { name: "Increase rooms" }).isEnabled(), false);
      assert.equal(await dialog.getByRole("button", { name: "Decrease guests" }).isEnabled(), false);
      await page.keyboard.press("Escape");
      await dialog.getByRole("button", { name: /Rooms and guests/ }).click();
      assert.equal(await dialog.getByRole("button", { name: "Decrease rooms" }).isEnabled(), false, "Back discards counts");
      await dialog.getByRole("button", { name: "Increase guests" }).click();
      await page.getByRole("button", { name: "Done", exact: true }).click();
      await page.waitForURL(url => url.searchParams.get("guests") === "3", { waitUntil: "domcontentloaded" });
      await page.goto(page.url(), { waitUntil: "domcontentloaded" });
      await dialog.getByRole("button", { name: /^Dates/ }).click();
      await page.locator(`[data-mobile-calendar-day="${month}-22"] button`).click();
      await page.locator(`[data-mobile-calendar-day="${month}-29"] button`).click();
      await page.getByRole("button", { name: "Done", exact: true }).click();
      await page.waitForURL(url => url.searchParams.get("checkOut") === `${month}-29`, { waitUntil: "domcontentloaded" });
      await dialog.getByRole("button", { name: "Close stay editor" }).click();
      assert.equal(await dialog.count(), 0);
      assert.equal(await page.evaluate(() => document.body.style.position === "fixed"), false, "Closing releases scroll lock");
      assert.deepEqual(errors, []);
      console.log(`${engine.name()} ${width}px: results and details draft/commit, occupancy limits, and scroll restoration passed`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
