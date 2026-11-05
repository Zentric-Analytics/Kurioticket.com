import { expect } from "@playwright/test";
import path from "node:path";

// Runs only against the isolated QA app. Never acknowledges a live alert.
export async function verifyNotificationPanel({ page, root, output, width }) {
  const bell = page.getByRole("button", { name: /^(?:\d+ admin alerts need attention|Admin notifications)$/ });
  const dialog = page.getByRole("dialog", { name: "Notifications", exact: true });
  const startingUrl = page.url();
  const posts = [];
  const watch = request => { if (request.method() === "POST" && request.url().includes("/api/admin/notifications/acknowledge")) posts.push(request); };
  page.on("request", watch);

  await bell.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("li")).toHaveCount(4);
  await expect(page).toHaveURL(startingUrl);
  await expect(dialog.getByRole("link", { name: /see all|view all/i })).toHaveCount(0);
  await expect(dialog.locator('a[href="/admin/notifications"]')).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Acknowledge", exact: true })).toHaveCount(2);
  expect(posts).toHaveLength(0);

  const verifyBounds = async () => {
    const result = await page.evaluate(() => {
      const box = document.querySelector('[role="dialog"]').getBoundingClientRect();
      const header = document.querySelector("header").getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, headerBottom: header.bottom, width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth, locked: document.body.style.overflow === "hidden" };
    });
    expect(Math.abs(result.top - result.headerBottom)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.bottom - result.height)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.right - result.width)).toBeLessThanOrEqual(2);
    expect(result.left).toBeGreaterThanOrEqual(0);
    expect(result.overflow).toBeLessThanOrEqual(result.width + 1);
    expect(result.locked).toBe(false);
  };
  await verifyBounds();
  if (width === 1440) {
    await page.locator("main").click({ position: { x: 8, y: 20 } });
    await expect(dialog).toBeVisible();
    for (const nextWidth of [320, 768, 1100, 1440]) {
      await page.setViewportSize({ width: nextWidth, height: 1000 });
      await expect.poll(async () => page.evaluate(() => Math.abs(document.querySelector('[role="dialog"]').getBoundingClientRect().top - document.querySelector("header").getBoundingClientRect().bottom))).toBeLessThanOrEqual(2);
      await verifyBounds();
    }
  }
  await page.getByRole("button", { name: "Admin profile", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Admin settings", exact: true })).toBeVisible();
  await bell.click();
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("link", { name: "Admin settings", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(bell).toBeFocused();
  await bell.click();
  await dialog.getByRole("button", { name: "Close notifications", exact: true }).click();
  await expect(bell).toBeFocused();

  const makeSnapshot = count => ({
    activeCount: count, unreadCount: count, criticalCount: 0, warningCount: count,
    alerts: Array.from({ length: count }, (_, index) => ({
      id: "panel-qa-" + index, key: "panel.qa." + index, signalToken: "signal-" + index,
      title: "Synthetic notification " + (index + 1), severity: "WARNING", source: "SUPPORT",
      message: "Isolated QA notification. Full details remain available inside the scrollable panel.",
      signalAt: "2026-11-05T12:00:00.000Z", acknowledged: false, actionHref: "/admin/support",
    })),
  });
  let snapshot = makeSnapshot(105);
  let mode = "normal";
  let holdNextPanel = false;
  let heldStarted;
  let releaseHeld;
  const heldRequest = new Promise(resolve => { heldStarted = resolve; });
  const heldResponse = new Promise(resolve => { releaseHeld = resolve; });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const routePattern = /\/api\/admin\/notifications(?:\?.*)?$/;
  const handler = async route => {
    if (holdNextPanel && route.request().url().includes("panel=1")) {
      holdNextPanel = false;
      const captured = snapshot;
      heldStarted();
      await heldResponse;
      return route.fulfill({ json: captured });
    }
    if (mode === "loading" && route.request().url().includes("panel=1")) await gate;
    if (mode === "error") return route.fulfill({ status: 503, json: { error: "Synthetic QA failure" } });
    const { alerts, ...summary } = snapshot;
    return route.fulfill({ json: route.request().url().includes("summary=1") ? summary : snapshot });
  };
  await page.route(routePattern, handler);
  await bell.click();
  await expect(dialog.locator("li")).toHaveCount(105);
  await expect(bell).toContainText("99+");
  const scroller = dialog.locator("[data-notification-scroll]");
  expect(await scroller.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  await page.screenshot({ path: path.join(output, "notification-panel-" + width + ".png") });
  await scroller.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(dialog.getByText("Synthetic notification 105", { exact: true })).toBeInViewport();
  expect(posts).toHaveLength(0);

  mode = "error";
  await dialog.getByRole("button", { name: "Refresh notifications" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Showing last loaded alerts.");
  await expect(dialog.locator("li")).toHaveCount(105);
  await expect(bell).toContainText("99+");
  mode = "normal";
  snapshot = makeSnapshot(0);
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.getByText("You’re all caught up", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(bell).not.toContainText("99+");
  await dialog.getByRole("button", { name: "Close notifications" }).click();

  mode = "error";
  await page.reload({ waitUntil: "networkidle" });
  await bell.click();
  await expect(dialog.getByRole("alert")).toContainText("Unable to load notifications.");
  await expect(dialog.getByText("You’re all caught up", { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Close notifications" })).toBeEnabled();
  mode = "normal";
  snapshot = makeSnapshot(1);
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.locator("li")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Close notifications" }).click();

  await page.reload({ waitUntil: "networkidle" });
  mode = "loading";
  await bell.click();
  await expect(dialog.getByRole("status")).toContainText("Loading notifications");
  await expect(dialog.getByRole("button", { name: "Close notifications" })).toBeEnabled();
  release();
  mode = "normal";
  await expect(dialog.locator("li")).toHaveCount(1);
  expect(posts).toHaveLength(0);

  const ackPattern = /\/api\/admin\/notifications\/acknowledge$/;
  await page.route(ackPattern, async route => {
    const body = route.request().postDataJSON();
    expect(body).toEqual({ alertKey: "panel.qa.0", signalToken: "signal-0" });
    snapshot = { ...snapshot, unreadCount: 0, alerts: snapshot.alerts.map(alert => ({ ...alert, acknowledged: true })) };
    await route.fulfill({ json: { ok: true } });
  });
  // An older poll must not swallow an acknowledgement invalidation.
  holdNextPanel = true;
  await page.evaluate(() => window.dispatchEvent(new Event("admin-alerts-updated")));
  await heldRequest;
  await expect(dialog.getByRole("button", { name: "Refresh notifications" })).toBeDisabled();
  await page.evaluate(() => {
    window.__notificationQaAckUpdated = false;
    window.addEventListener("admin-alerts-updated", () => { window.__notificationQaAckUpdated = true; }, { once: true });
  });
  await dialog.getByRole("button", { name: "Acknowledge", exact: true }).click();
  await page.waitForFunction(() => window.__notificationQaAckUpdated === true);
  releaseHeld();
  await expect(dialog.getByText("Acknowledged for 24 hours", { exact: true })).toBeVisible();
  await expect(bell).toHaveAttribute("aria-label", "Admin notifications");
  expect(posts).toHaveLength(1);
  await dialog.getByRole("button", { name: "Close notifications" }).click();
  await page.unroute(ackPattern);
  await page.unroute(routePattern, handler);
  page.off("request", watch);
  console.log("Notification panel: full list, viewport bounds, menus, loading, errors, retry and explicit acknowledgement passed at " + width);
}
