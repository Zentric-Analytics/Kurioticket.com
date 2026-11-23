import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
import assert from "node:assert/strict";
const output = process.env.ADMIN_IDENTITY_QA_OUTPUT;
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const url = process.env.ADMIN_IDENTITY_QA_URL + "/admin/users";
  const report = [];
  const check = async (name, fn) => {
    await fn();
    report.push(name);
    console.log("PASS", name);
  };
  await page.goto(url, { waitUntil: "networkidle" });
  await expect(
    page.getByRole("columnheader", { name: "Actions", exact: true }),
  ).toBeVisible();
  for (const width of [1280, 1366, 1440, 1920, 768, 390, 320])
    await check(`layout ${width}px`, async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url, { waitUntil: "networkidle" });
      // Verify genuine branding is always next to the header title and never in the nav strip.
      const brand = page.getByRole("link", { name: "Kurioticket Admin overview" });
      await expect(brand).toHaveCount(1);
      await expect(brand).toBeVisible();
      const mark = brand.locator('img[src="/brand/kurioticket-icon-blue.svg"]');
      await expect(mark).toBeVisible();
      assert.equal(await mark.evaluate(img => img.complete && img.naturalWidth > 0), true, "Official logo loads");
      const iconBox = await mark.boundingBox();
      const titleBox = await page.getByText("Kurioticket Admin", { exact: true }).boundingBox();
      assert.ok(iconBox && titleBox);
      const gap = titleBox.x - iconBox.x - iconBox.width;
      assert.ok(iconBox.x < titleBox.x && gap >= 4 && gap <= 20, "Logo sits immediately left of Admin title");
      assert.ok(iconBox.x >= 0, "Logo remains inside the viewport");
      await expect(page.locator('nav[aria-label="Admin navigation"] img')).toHaveCount(0);
      const metrics = await page.evaluate(() => {
        const region = document.querySelector('[role="region"]');
        return {
          page: document.documentElement.scrollWidth,
          viewport: innerWidth,
          table: region.scrollWidth,
          region: region.clientWidth,
        };
      });
      assert.ok(metrics.page <= width + 1, JSON.stringify(metrics));
      if (width >= 1280)
        assert.ok(metrics.table <= metrics.region + 1, JSON.stringify(metrics));
      await page.screenshot({
        path: `${output}/after-${width}.png`,
        fullPage: true,
      });
    });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(url + "?version=before", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${output}/before-1280.png`, fullPage: true });
  await page.goto(url, { waitUntil: "networkidle" });
  await check("six columns, protected accounts and guests", async () => {
    await expect(page.getByRole("columnheader")).toHaveCount(6);
    for (const text of ["Current admin", "Protected admin"]) {
      const row = page.getByRole("row").filter({ hasText: text });
      await expect(
        row.getByRole("button", { name: /Manage account/ }),
      ).toHaveCount(0);
    }
    const guest = page.getByRole("row").filter({ hasText: "qa-guest-00-" });
    await expect(
      guest.getByRole("button", { name: /Manage account/ }),
    ).toHaveCount(0);
  });
  await check("copy full guest and user IDs", async () => {
    for (const kind of ["guest", "user"]) {
      const copy = page
        .getByRole("button", { name: new RegExp(`Copy ${kind} ID:`) })
        .first();
      const name = await copy.getAttribute("aria-label");
      await copy.click();
      assert.equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        name.split("ID: ")[1],
      );
    }
  });
  let trigger = page.getByRole("button", { name: /Manage account/ }).first();
  await check(
    "keyboard menu, focus restoration and unclipped portal",
    async () => {
      await trigger.focus();
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("menu")).toBeVisible();
      await expect(page.getByRole("menuitem").first()).toBeFocused();
      await page.keyboard.press("End");
      await expect(page.getByRole("menuitem").last()).toBeFocused();
      await page.keyboard.press("Home");
      await expect(page.getByRole("menuitem").first()).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await expect(page.getByRole("menu")).toHaveCount(0);
      await trigger.click();
      assert.equal(
        await page.getByRole("menu").evaluate((el) => el.parentElement.tagName),
        "BODY",
      );
      const anchor = await trigger.boundingBox();
      const menu = await page.getByRole("menu").boundingBox();
      const gap = Math.min(
        Math.abs(menu.y + menu.height - anchor.y),
        Math.abs(menu.y - anchor.y - anchor.height),
      );
      assert.ok(gap <= 8, "Menu stays adjacent to its trigger in either direction");
      await page.screenshot({
        path: `${output}/after-menu-1280.png`,
        fullPage: false,
      });
      await page.keyboard.press("Tab");
      await expect(page.getByRole("menu")).toHaveCount(0);
      await trigger.click();
      await page.evaluate(() => window.dispatchEvent(new Event("resize")));
      await expect(page.getByRole("menu")).toHaveCount(0);
      await expect(trigger).toBeFocused();
    },
  );
  await check(
    "status actions retain confirm, request payload and server errors",
    async () => {
      const row = page
        .getByRole("row")
        .filter({
          hasText:
            "QA registered identity with a deliberately long display name",
        });
      let requests = [];
      await page.route("**/api/admin/users/*/status", async (route) => {
        requests.push(route.request().postDataJSON());
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ error: "QA denied by server" }),
        });
      });
      let confirm = false;
      const handler = async (d) => {
        if (confirm) await d.accept();
        else await d.dismiss();
      };
      page.on("dialog", handler);
      await row.getByRole("button", { name: /Manage/ }).click();
      await page
        .getByRole("menuitem", { name: "Suspend", exact: true })
        .click();
      assert.equal(requests.length, 0);
      confirm = true;
      for (const name of ["Suspend", "Soft delete"]) {
        await row.getByRole("button", { name: /Manage/ }).click();
        await page.getByRole("menuitem", { name, exact: true }).click();
        await expect(row.getByRole("status").last()).toContainText(
          "QA denied by server",
        );
      }
      assert.deepEqual(requests, [
        { status: "SUSPENDED" },
        { status: "DELETED" },
      ]);
      page.off("dialog", handler);
      await page.unroute("**/api/admin/users/*/status");
    },
  );
  await check(
    "reactivation and network failure release loading state",
    async () => {
      const row = page
        .getByRole("row")
        .filter({ hasText: "QA registered identity 05" });
      await page.route("**/api/admin/users/*/status", (route) => route.abort());
      await row.getByRole("button", { name: /Manage/ }).click();
      await page
        .getByRole("menuitem", { name: "Reactivate", exact: true })
        .click();
      await expect(row.getByRole("status").last()).toContainText(
        "Action failed. Please try again.",
      );
      await expect(row.getByRole("button", { name: /Manage/ })).toBeEnabled();
      await page.unroute("**/api/admin/users/*/status");
    },
  );
  await check(
    "admin role actions only, confirmation and endpoint",
    async () => {
      const row = page
        .getByRole("row")
        .filter({ hasText: "QA registered identity 07" });
      await row.getByRole("button", { name: /Manage/ }).click();
      await expect(page.getByRole("menuitem")).toHaveText([
        "Demote to User",
        "Make Support",
      ]);
      let body;
      await page.route("**/api/admin/users/*/role", async (route) => {
        body = route.request().postDataJSON();
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ error: "QA role change denied" }),
        });
      });
      page.once("dialog", (d) => d.accept());
      await page
        .getByRole("menuitem", { name: "Make Support", exact: true })
        .click();
      assert.deepEqual(body, { role: "SUPPORT" });
      await expect(row.getByRole("status").last()).toContainText(
        "QA role change denied",
      );
      await page.unroute("**/api/admin/users/*/role");
    },
  );
  await check("permanent deletion typed email and ID safeguards", async () => {
    for (const search of ["qa-user-10", "qa-user-14"]) {
      await page.goto(url + "?q=" + search, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /Manage account/ }).click();
      await page.getByRole("menuitem", { name: "Permanent delete…" }).click();
      const dialog = page.getByRole("dialog", {
        name: "Permanently delete account",
      });
      await expect(dialog).toBeVisible();
      const submit = dialog.getByRole("button", {
        name: "Confirm permanent delete",
      });
      await expect(submit).toBeDisabled();
      const target = await dialog.locator("code").textContent();
      await dialog.getByRole("textbox").fill("wrong");
      await expect(submit).toBeDisabled();
      await dialog.getByRole("textbox").fill(target);
      await expect(submit).toBeEnabled();
      let body;
      await page.route("**/api/admin/users/*/permanent", async (route) => {
        body = route.request().postDataJSON();
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "QA audited deletion required" }),
        });
      });
      await submit.click();
      assert.equal(
        body[target.includes("@") ? "confirmEmail" : "confirmUserId"],
        target,
      );
      await expect(dialog.getByRole("status")).toContainText(
        "QA audited deletion required",
      );
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /Manage account/ }),
      ).toBeFocused();
      await page.unroute("**/api/admin/users/*/permanent");
    }
  });
  await check("search by name, email, user ID and guest ID", async () => {
    for (const query of [
      "deliberately",
      "qa-04-long-email",
      "qa-user-04",
      "qa-guest-00-",
    ]) {
      await page.goto(url + "?q=" + query, { waitUntil: "networkidle" });
      await expect(page.locator("tbody tr")).toHaveCount(1);
      await expect(
        page.getByRole("heading", { name: "Identities (1)", exact: true }),
      ).toBeVisible();
    }
  });
  await check("identity, role, and status filters", async () => {
    for (const [filter, value, label] of [
      ["identity", "GUEST", "Guest"],
      ["identity", "REGISTERED", "Registered"],
      ["role", "SUPPORT", "Registered · Support"],
      ["status", "SUSPENDED", "Suspended"],
    ]) {
      await page.goto(url + `?${filter}=${value}`, {
        waitUntil: "networkidle",
      });
      const rows = page.locator("tbody tr");
      for (const row of await rows.all())
        await expect(row).toContainText(label);
    }
  });
  await check(
    "pagination mixed identities, filters retained and newest first",
    async () => {
      const visited = [];
      for (const p of [1, 2, 3]) {
        await page.goto(url + "?q=qa-&page=" + p, { waitUntil: "networkidle" });
        const ids = await page
          .getByRole("button", { name: /Copy (user|guest) ID:/ })
          .evaluateAll((els) =>
            els.map((el) => el.getAttribute("aria-label").split("ID: ")[1]),
          );
        visited.push(...ids);
        const next = page.getByRole("link", { name: "Next", exact: true });
        if (p < 3) {
          const href = await next.getAttribute("href");
          assert.ok(href.includes("q=qa-"));
          assert.ok(href.includes("page=" + (p + 1)));
        }
      }
      assert.equal(visited.length, 31);
      assert.equal(new Set(visited).size, 31);
      assert.ok(visited[0].startsWith("qa-guest-00"));
      assert.equal(visited[1], "qa-self");
    },
  );
  await check("empty state", async () => {
    await page.goto(url + "?q=no-such-fixture", { waitUntil: "networkidle" });
    await expect(
      page.getByText("No identities match these filters."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Next", exact: true }),
    ).toHaveCount(0);
  });
  await check("registered and guest activity views", async () => {
    for (const query of ["qa-user-04", "qa-guest-00-"]) {
      await page.goto(url + "?q=" + query, { waitUntil: "networkidle" });
      await page.getByRole("link", { name: /View Activity for/ }).click();
      await expect(
        page.getByRole("dialog", { name: "Identity activity" }),
      ).toBeVisible();
      await expect(
        page.getByText("No recorded activity is available for this identity."),
      ).toBeVisible();
    }
  });
  await check("touch menu stays inside mobile viewport", async () => {
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const touch = await mobile.newPage();
    await touch.goto(url + "?q=qa-user-04", { waitUntil: "networkidle" });
    const button = touch.getByRole("button", { name: /Manage account/ });
    await button.tap();
    await expect(touch.getByRole("menu")).toBeVisible();
    const box = await touch.getByRole("menu").boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390);
    await touch.screenshot({
      path: `${output}/after-menu-390.png`,
      fullPage: true,
    });
    await mobile.close();
  });
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    `${output}/browser-results.json`,
    JSON.stringify({ passed: report, errors }, null, 2),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
