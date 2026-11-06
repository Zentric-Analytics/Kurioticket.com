import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyNotificationPanel } from "./notifications.mjs";
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
      await expect(page.getByRole("button", { name: /admin alerts need attention|Admin notifications/ })).toBeVisible();
      const main = page.locator("main");
      await expect(main).toBeVisible();
      if (variant === "after") {
        await expect(page.getByRole("navigation", { name: "System sections" })).toHaveCount(0);
        for (const name of ["View operational alerts", "Open Alerts", "View audit logs", "Audit logs", "System health", "View system status", "View admin configuration status"]) {
          await expect(main.getByRole("link", { name, exact: true })).toHaveCount(0);
        }
        const backToSystem = main.getByRole("link", { name: "Back to System", exact: true });
        if (route === "system/cms-health" || route === "email-delivery") {
          await expect(backToSystem).toHaveAttribute("href", "/admin/system");
        } else {
          await expect(backToSystem).toHaveCount(0);
        }
        if (route === "system") {
          await expect(main.getByRole("heading", { name: "System snapshot", exact: true })).toHaveCount(0);
          await expect(main.getByRole("heading", { name: "Configuration", exact: true })).toHaveCount(0);
          await expect(main.getByRole("heading", { name: "Issues Requiring Attention", exact: true })).toBeVisible();
          await expect(main.getByRole("heading", { name: "System areas", exact: true })).toBeVisible();

          const summary = main.locator('section[aria-label="System summary"]');
          await expect(summary).toBeVisible();
          for (const label of ["Environment", "Monitored areas", "Issues requiring attention", "Database"]) {
            await expect(summary.getByText(label, { exact: true })).toBeVisible();
          }
          if (width === 1440) {
            const boxes = await Promise.all(
              ["Environment", "Monitored areas", "Issues requiring attention", "Database"].map(async label =>
                summary.getByText(label, { exact: true }).boundingBox()
              )
            );
            expect(boxes.every(Boolean)).toBeTruthy();
            const tops = boxes.map(box => box.y);
            expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);
          }

          await expect(main.getByRole("link", { name: "View email diagnostics" })).toHaveAttribute("href", "/admin/email-delivery");
          await expect(main.getByRole("link", { name: "Review provider readiness" })).toHaveAttribute("href", "/admin/providers");
          await expect(main.getByText("Live connectivity check", { exact: true })).toBeVisible();
          await expect(main.getByText("Configuration only", { exact: true }).first()).toBeVisible();
          await expect(main.getByText("CMS diagnostics", { exact: true })).toBeVisible();
          await expect(main.getByText("Separate check", { exact: true })).toBeVisible();

          const connectedStatus = main.getByText("Connected", { exact: true }).first();
          await expect(connectedStatus).toHaveClass(/inline-flex/);
          await expect(connectedStatus).toHaveClass(/text-\[12px\]/);
          await expect(connectedStatus).toHaveClass(/font-medium/);
          await expect(connectedStatus.locator("span").first()).toHaveClass(/h-1\.5/);
          await expect(connectedStatus.locator("span").first()).toHaveClass(/w-1\.5/);
          await expect(connectedStatus.locator("span").first()).toHaveClass(/rounded-full/);

          const databaseRow = main.locator('[data-system-area="database"]');
          const authenticationRow = main.locator('[data-system-area="authentication"]');
          await expect(databaseRow).not.toHaveAttribute("open", "");
          await expect(authenticationRow).not.toHaveAttribute("open", "");
          await expect(databaseRow.getByText("View ›", { exact: true })).toHaveCount(0);
          await expect(authenticationRow.getByText("View ›", { exact: true })).toHaveCount(0);

          const configurationStatus = authenticationRow.getByText("Not configured", { exact: true });
          await expect(configurationStatus).toHaveClass(/text-amber-700/);
          await expect(configurationStatus.locator("span").first()).toHaveClass(/bg-amber-500/);
          await expect(main.getByText("Expand a row for what is actually verified.", { exact: true })).toHaveCount(0);
          await expect(main.locator("details")).toHaveCount(1);
          await expect(main.getByText("Meaning", { exact: true })).toHaveCount(0);

          const emailRow = main.locator('[data-system-area="email"]');
          const cmsRow = main.locator('[data-system-area="cms"]');
          await expect(emailRow.getByRole("link", { name: "Open Email Delivery ›", exact: true })).toHaveAttribute("href", "/admin/email-delivery");
          await expect(cmsRow.getByRole("link", { name: "Open CMS Health ›", exact: true })).toHaveAttribute("href", "/admin/system/cms-health");
          await expect(main.locator('[data-system-area="providers"]')).toHaveCount(0);
          await expect(main.getByRole("link", { name: "Open Providers ›", exact: true })).toHaveCount(0);
          await expect(emailRow.getByText("View ›", { exact: true })).toHaveCount(0);
          await expect(cmsRow.getByText("View ›", { exact: true })).toHaveCount(0);

          const adminAccess = main.locator('details[data-system-area="admin-access"]');
          await expect(adminAccess).toBeVisible();
          await adminAccess.locator("summary").click();
          await expect(adminAccess.getByText("Administrator allowlist", { exact: true })).toBeVisible();
          await expect(adminAccess.getByText("Configured administrators", { exact: true })).toBeVisible();
          await expect(adminAccess.getByText("Verification", { exact: true })).toBeVisible();

          await expect(main.locator('a[href="/admin/settings"],a[href="/admin/notifications"]')).toHaveCount(0);
          await expect(main.getByText(/deployment configuration/).first()).toBeVisible();
        }
        if (route === "logs") {
          await expect(main.getByRole("heading", { name: "Audit Logs", exact: true })).toBeVisible();
          await expect(main.getByRole("heading", { name: "Audit records", exact: true })).toBeVisible();
          await expect(main.getByText("CMS alert state changed", { exact: true })).toBeVisible();
          await expect(main.getByText("CMS content published", { exact: true })).toBeVisible();
          await expect(main.getByText("User role updated", { exact: true })).toBeVisible();
          await expect(main.getByText("ADMIN_ALERT_CMS_STATE", { exact: true })).toBeVisible();
          await expect(main.getByText("CMS_CONTENT_PUBLISHED", { exact: true })).toBeVisible();
          await expect(main.getByRole("combobox", { name: "Date range" })).toBeVisible();
          await expect(main.getByRole("combobox", { name: "Action" })).toBeVisible();
          await expect(main.getByRole("combobox", { name: "Target type" })).toBeVisible();
          await expect(main.getByPlaceholder("Search admin email")).toBeVisible();
          await expect(main.getByPlaceholder("Search target email")).toBeVisible();
          await expect(main.getByRole("link", { name: "Clear filters", exact: true })).toHaveAttribute("href", "/admin/logs?range=7d");
          await expect(main.getByRole("link", { name: "Older records ›", exact: true })).toBeVisible();

          const auditRegion = main.getByRole("region", { name: "Audit log records" });
          await expect(auditRegion).toBeVisible();
          await expect(auditRegion.locator("[data-audit-header]").getByText("Target email", { exact: true })).toHaveCount(0);
          const userRow = auditRegion.locator('[data-audit-row="audit-user"]');
          await expect(userRow.getByText("View ›", { exact: true })).toBeVisible();
          await expect(userRow.getByText("traveler@example.invalid", { exact: true })).not.toBeVisible();
          await userRow.locator("summary").click();
          await expect(userRow.getByText("Target email", { exact: true })).toBeVisible();
          await expect(userRow.getByText("traveler@example.invalid", { exact: true })).toBeVisible();
        }
        if (route === "email-delivery") {
          await expect(main.getByRole("heading", { name: "Email Delivery", exact: true })).toBeVisible();
          await expect(main.getByRole("combobox", { name: "Date range" })).toBeVisible();

          const summary = main.locator('section[aria-label="Email delivery summary"]');
          await expect(summary).toBeVisible();
          for (const label of ["Email deliveries", "Delivered", "Delayed", "Failed"]) {
            await expect(summary.getByText(label, { exact: true })).toBeVisible();
          }
          await expect(summary.getByText("15", { exact: true })).toBeVisible();
          await expect(summary.getByText("14", { exact: true })).toBeVisible();
          await expect(summary.getByText("Last 24 hours", { exact: true })).toHaveCount(0);

          await expect(main.getByRole("heading", { name: "Current setup", exact: true })).toBeVisible();
          await expect(main.getByText("Suppressed addresses", { exact: true })).toBeVisible();
          await expect(main.getByText("53", { exact: true })).toBeVisible();
          await expect(main.getByText("Configured", { exact: true })).toHaveCount(0);
          await expect(main.getByRole("heading", { name: "Test email delivery", exact: true })).toBeVisible();
          await expect(main.getByText("Send a test to your admin email.", { exact: true })).toBeVisible();
          await expect(main.getByRole("button", { name: "Send test email", exact: true })).toBeDisabled();
          await expect(main.getByText(/Safety: only the current signed-in admin/)).toHaveCount(0);

          await expect(main.getByRole("heading", { name: "Delivery history", exact: true })).toBeVisible();
          await expect(main.getByText(/Latest 10 in/)).toHaveCount(0);
          await expect(main.getByText("Showing 1–15 of 15 deliveries in last 24 hours", { exact: true })).toBeVisible();
          const deliveries = main.getByRole("region", { name: "Delivery history" });
          await expect(deliveries.getByText("bi***@zentricanalytics.com", { exact: true })).toBeVisible();
          const delivered = deliveries.locator("tbody").getByText("Delivered", { exact: true }).first();
          await expect(delivered).toHaveClass(/inline-flex/);
          await expect(delivered.locator("span").first()).toHaveClass(/rounded-full/);

          if (width === 1440) {
            const boxes = await Promise.all(
              ["Email deliveries", "Delivered", "Delayed", "Failed"].map(async label =>
                summary.getByText(label, { exact: true }).boundingBox()
              )
            );
            expect(boxes.every(Boolean)).toBeTruthy();
            const tops = boxes.map(box => box.y);
            expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);

            await page.goto(`${root}/admin/email-delivery?range=7d`, { waitUntil: "networkidle" });
            await expect(page.getByRole("heading", { name: "Email Delivery", exact: true })).toBeVisible();
            await expect(page.getByText("Showing 1–15 of 15 deliveries in last 7 days", { exact: true })).toBeVisible();
            await expect(page.locator('section[aria-label="Email delivery summary"]').getByText("Email deliveries", { exact: true })).toBeVisible();
          }
        }
        if (route === "settings") {
          await expect(main.getByRole("link", { name: "Open fare operations" })).toHaveCount(0);
          const adminNav = page.getByRole("navigation", { name: "Admin navigation" });
          if (width === 1440) {
            await expect(adminNav.getByRole("link", { name: "Homepage Fares", exact: true })).toHaveCount(0);
          } else {
            const openMenu = page.getByRole("button", { name: "Open admin navigation" });
            await expect(openMenu).toBeVisible();
            await openMenu.click();
            await expect(adminNav.getByRole("link", { name: "Homepage Fares", exact: true })).toHaveCount(0);
            await page.getByRole("button", { name: "Close admin navigation" }).click();
          }
        }
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
      await page.getByRole("button", { name: "Admin profile" }).click();
      await page.getByRole("link", { name: "Audit Logs", exact: true }).click();
      await expect(page).toHaveURL(`${root}/admin/logs`);
      await expect(page.getByRole("navigation", { name: "System sections" })).toHaveCount(0);
      await verifyNotificationPanel({ page, root, output, width });
    }
    await context.close();
  }
  await writeFile(path.join(output, `${variant}-results.json`), JSON.stringify(results, null, 2));
  console.log(`${variant}: ${results.length} real-component page/viewport captures passed`);
} finally { await browser.close(); }
