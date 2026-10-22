import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const departure = new Date();
departure.setUTCMonth(departure.getUTCMonth() + 1, 13);
const returnDate = new Date(departure);
returnDate.setUTCDate(15);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const query = { tripType: "round-trip", origin: "SFO", destination: "LAX", departureDate: iso(departure), returnDate: iso(returnDate), adults: 1, children: 0, infants: 0, travelers: 1, cabinClass: "economy", currency: "USD" };
const resultsUrl = `/flights/results?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))}`;
type Alert = { id: string; type: string; mode: string; status: string; targetPrice: string; currency: string; origin: string; destination: string; query: typeof query };

test.beforeEach(async ({ page, request }) => {
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: { id: "alert-review", email: "review@example.test", name: "Review" }, expires: "2099-01-01T00:00:00.000Z" } }));
  await page.route("**/api/flights/search", async (route) => {
    const response = await request.post(process.env.QA_FLIGHT_FIXTURE_URL ?? "http://127.0.0.1:3011/api/flights/search");
    const fixture = (await response.text()).replaceAll("2026-11-13", query.departureDate).replaceAll("2026-11-15", query.returnDate);
    await route.fulfill({ status: response.status(), contentType: "application/json", body: fixture });
  });
  // Some local proxy environments truncate large JS chunks. This opt-in reads
  // the exact dev-server assets; it does not change application behavior.
  if (process.env.QA_LOCAL_CHUNKS) await page.route("**/_next/static/**/*.js*", async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const asset = path.join(process.cwd(), ".next/dev", pathname.replace("/_next/", ""));
    try { await route.fulfill({ contentType: "application/javascript", body: await readFile(asset) }); }
    catch { await route.continue(); }
  });
});

for (const width of [390, 1440]) {
  test(`${width}px target editing, cancellation, saving, pausing and resuming`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const alerts: Alert[] = [];
    const posts: Record<string, unknown>[] = [];
    const patches: string[] = [];
    await page.route("**/api/price-alerts", async (route) => {
      if (route.request().method() === "POST") {
        const payload = route.request().postDataJSON(); posts.push(payload);
        const alert = { ...payload, id: "target-1", mode: "TARGET", status: "ACTIVE", targetPrice: String(payload.targetPrice) } as Alert;
        alerts.push(alert); await route.fulfill({ json: { alert } });
      } else await route.fulfill({ json: { alerts } });
    });
    await page.route("**/api/price-alerts/*", async (route) => {
      const status = route.request().postDataJSON().status;
      patches.push(status); alerts[0].status = status;
      await route.fulfill({ json: { alert: alerts[0] } });
    });
    await page.goto(resultsUrl, { waitUntil: "domcontentloaded" });
    const control = page.getByRole("switch", { name: "Track this flight price" }).filter({ visible: true });
    await expect(control).toBeEnabled();
    await control.click();
    const dialog = page.getByRole("dialog", { name: "Track this flight price" });
    const slider = dialog.getByRole("slider", { name: "Price drop" });
    await expect(slider).toHaveAttribute("max", width === 390 ? "15" : "50");
    await expect(slider).toHaveValue("10");
    expect(posts).toHaveLength(0);
    await expect(control).toHaveAttribute("aria-checked", "false");
    if (width === 390) await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    else await dialog.getByRole("button", { name: "Close price alert" }).click();
    await expect(dialog).toBeHidden();
    expect(posts).toHaveLength(0);
    await control.click();
    await slider.fill(width === 390 ? "15" : "40");
    await dialog.getByRole("button", { name: "Save price alert" }).click();
    await expect(control).toHaveAttribute("aria-checked", "true");
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ type: "FLIGHT", targetPrice: width === 390 ? 126.65 : 89.4, currency: "USD", query });
    await control.click();
    await expect(control).toHaveAttribute("aria-checked", "false");
    expect(patches).toEqual(["PAUSED"]);
    await control.click();
    await expect(slider).toHaveValue(width === 390 ? "15" : "40");
    await page.screenshot({ path: `qa/mobile-web/artifacts/flight-price-alert-${width}.png`, fullPage: false });
    await dialog.getByRole("button", { name: "Save price alert" }).click();
    await expect(control).toHaveAttribute("aria-checked", "true");
    expect(posts).toHaveLength(1);
    expect(patches).toEqual(["PAUSED", "ACTIVE"]);
  });
}

test("mobile rejects an out-of-range paused target and keeps a failed save off", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const paused = { id: "old-target", mode: "TARGET", status: "PAUSED", type: "FLIGHT", origin: "SFO", destination: "LAX", currency: "USD", targetPrice: "119.2", query };
  await page.route("**/api/price-alerts", (route) => route.request().method() === "POST"
    ? route.fulfill({ status: 500, json: { error: "Temporary failure" } })
    : route.fulfill({ json: { alerts: [paused] } }));
  await page.goto(resultsUrl, { waitUntil: "domcontentloaded" });
  const control = page.getByRole("switch", { name: "Track this flight price" }).filter({ visible: true });
  await expect(control).toBeEnabled(); await control.click();
  const dialog = page.getByRole("dialog", { name: "Track this flight price" });
  await expect(dialog.getByRole("slider")).toHaveValue("10");
  await dialog.getByRole("button", { name: "Save price alert" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Couldn't save");
  await expect(control).toHaveAttribute("aria-checked", "false");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
});

test("mobile reconciles a duplicate target instead of claiming a failed save", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let duplicateCreated = false;
  const duplicate = { id: "duplicate-target", mode: "TARGET", status: "ACTIVE", type: "FLIGHT", origin: "SFO", destination: "LAX", currency: "USD", targetPrice: "134.1", query };
  await page.route("**/api/price-alerts", async (route) => {
    if (route.request().method() === "POST") {
      duplicateCreated = true;
      await route.fulfill({ status: 409, json: { error: "Already exists", alert: duplicate } });
    } else await route.fulfill({ json: { alerts: duplicateCreated ? [duplicate] : [] } });
  });
  await page.goto(resultsUrl, { waitUntil: "domcontentloaded" });
  const control = page.getByRole("switch", { name: "Track this flight price" }).filter({ visible: true });
  await expect(control).toBeEnabled(); await control.click();
  const dialog = page.getByRole("dialog", { name: "Track this flight price" });
  await dialog.getByRole("button", { name: "Save price alert" }).click();
  await expect(control).toHaveAttribute("aria-checked", "true");
  await expect(dialog).toBeHidden();
});
