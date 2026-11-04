import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const root = process.env.ADMIN_SYSTEM_QA_URL;
const output = process.env.ADMIN_SYSTEM_QA_OUTPUT;
const variant = process.env.ADMIN_SYSTEM_QA_VARIANT;
if (!root || !output || !["before", "after"].includes(variant)) throw new Error("Missing QA fixture configuration");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const routes = ["system", "logs", "system/cms-health", "email-delivery", "notifications", "settings"];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, timezoneId: "UTC" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const route of routes) {
      await page.goto(`${root}/admin/${route}`, { waitUntil: "networkidle", timeout: 120_000 });
      await expect(page.locator("[data-qa-label]")).toBeVisible();
      await expect(page.getByRole("link", { name: /unread admin alerts/ })).toBeVisible();
      const main = page.locator("main");
      await expect(main).toBeVisible();
      if (variant === "after") {
        if (["system", "logs", "system/cms-health", "email-delivery"].includes(route)) {
          const tabs = page.getByRole("navigation", { name: "System sections" });
          await expect(tabs.getByRole("link")).toHaveText(["System Status", "Logs", "CMS Health", "Email Delivery"]);
        } else {
          await expect(page.getByRole("navigation", { name: "System sections" })).toHaveCount(0);
        }
        for (const name of ["View operational alerts", "Open Alerts", "Back to System", "View audit logs", "Audit logs", "System health", "View system status", "View admin configuration status"]) {
          await expect(main.getByRole("link", { name, exact: true })).toHaveCount(0);
        }
        if (route === "system") {
          await expect(main.getByRole("heading", { name: "Issues Requiring Attention" })).toBeVisible();
          await expect(main.getByRole("link", { name: "View email diagnostics" })).toHaveAttribute("href", "/admin/email-delivery");
          await expect(main.getByRole("link", { name: "Review provider readiness" })).toHaveAttribute("href", "/admin/providers");
          await expect(main.locator('a[href="/admin/settings"],a[href="/admin/notifications"]')).toHaveCount(0);
          await expect(main.getByText(/Managed in deployment configuration/).first()).toBeVisible();
        }
        if (route === "email-delivery") await expect(main.getByRole("button", { name: "Send test email to me" })).toBeDisabled();
        if (route === "settings") await expect(main.getByRole("link", { name: "Open fare operations" })).toHaveAttribute("href", "/admin/homepage-fares");
        if (route === "notifications") {
          await expect(main.locator('a[href="/admin/notifications"]')).toHaveCount(0);
          await expect(main.getByRole("link", { name: "Open source", exact: true })).toHaveCount(3);
          await expect(main.getByRole("button", { name: "Acknowledge", exact: true })).toHaveCount(2);
          await expect(main.getByText("Acknowledgement is unavailable until monitoring-state storage recovers.")).toBeVisible();
        }
        const dimensions = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, screen: innerWidth }));
        expect(dimensions.page).toBeLessThanOrEqual(dimensions.screen + 1);
      }
      await page.evaluate(() => document.fonts.ready);
      const file = `${variant}-${route.replaceAll("/", "-")}-${width}.png`;
      await page.screenshot({ path: path.join(output, file), fullPage: true });
      results.push({ route, width, file });
    }
    expect(errors).toEqual([]);
    if (variant === "after") {
      await page.goto(`${root}/admin/system`, { waitUntil: "networkidle" });
      await page.getByRole("navigation", { name: "System sections" }).getByRole("link", { name: "Logs", exact: true }).click();
      await expect(page).toHaveURL(`${root}/admin/logs`);
      await page.getByRole("link", { name: /unread admin alerts/ }).click();
      await expect(page).toHaveURL(`${root}/admin/notifications`);
      await expect(page.getByRole("navigation", { name: "System sections" })).toHaveCount(0);
      const requestPromise = page.waitForRequest(request => request.url().includes("/api/admin/notifications/acknowledge") && request.method() === "POST");
      await page.getByRole("button", { name: "Acknowledge", exact: true }).first().click();
      const request = await requestPromise;
      expect(request.postDataJSON()).toMatchObject({ alertKey: "qa.support", signalToken: "qa-support" });
    }
    await context.close();
  }
  await writeFile(path.join(output, `${variant}-results.json`), JSON.stringify(results, null, 2));
  console.log(`${variant}: ${results.length} real-component page/viewport captures passed`);
} finally { await browser.close(); }
