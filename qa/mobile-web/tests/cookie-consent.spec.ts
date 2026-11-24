import { expect, test } from "@playwright/test";

test("cookie preferences stay anchored, preserve refusal and never replay the banner on save", async ({ page }) => {
  // Isolate the UI without creating real consented identities on staging.
  await page.route("**/api/identity/visitor", async route => {
    const method = route.request().method();
    if (method !== "GET") await new Promise(resolve => setTimeout(resolve, 700));
    await route.fulfill({ json: { analyticsTracking: method === "POST" ? "enabled" : "disabled" } });
  });
  await page.route("**/api/identity/presence", route => route.fulfill({ json: {} }));
  await page.goto("/");
  const banner = page.locator("[data-cookie-consent-banner]");
  const preferences = page.locator("[data-cookie-consent-preferences]");
  await expect(banner).toBeVisible();
  await expect(banner.getByRole("button", { name: "Essential only" })).toHaveCount(0);
  await expect(banner.getByRole("button", { name: "Decline optional" })).toHaveCount(0);
  await expect(banner.getByRole("button", { name: "Continue without optional cookies" })).toBeVisible();
  await expect(banner.locator("[data-cookie-consent-actions]").getByRole("button")).toHaveCount(2);
  await expect(banner.getByRole("button", { name: "Reject optional" })).toHaveCount(0);
  await expect(banner.getByRole("link", { name: "Learn about our use of cookies" })).toHaveCount(0);
  const bounds = await banner.boundingBox();
  expect(bounds).not.toBeNull();
  const initialScroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  const viewport = page.viewportSize()!;
  const mobile = viewport.width < 640;
  expect(bounds!.y + bounds!.height).toBeCloseTo(viewport.height, 0);

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await banner.getByRole("button", { name: "Cookie preferences", exact: true }).click();
    await expect(preferences).toBeVisible();
    await expect(preferences.getByText("Manage your preferences")).toBeVisible();
    await expect(preferences.getByRole("button", { name: "Reject optional" })).toHaveCount(0);
    await expect(preferences.getByRole("link", { name: /Cookie Policy|Privacy Policy/ })).toHaveCount(0);
    const samples = await preferences.evaluate(async panel => {
      const frames: { top: number; bottom: number; left: number; right: number; scrollWidth: number; width: number }[] = [];
      for (let i = 0; i < 24; i++) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const rect = panel.getBoundingClientRect();
        frames.push({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, scrollWidth: document.documentElement.scrollWidth, width: innerWidth });
      }
      return frames;
    });
    const last = samples[samples.length - 1];
    for (const frame of samples) {
      expect(Math.abs(frame.top - last.top)).toBeLessThanOrEqual(12);
      expect(frame.left).toBeGreaterThanOrEqual(-1);
      expect(frame.right).toBeLessThanOrEqual(viewport.width + 1);
      expect(frame.scrollWidth).toBeLessThanOrEqual(frame.width + 1);
    }
    if (mobile) expect(last.bottom).toBeCloseTo(viewport.height, 0);
    else expect((last.top + last.bottom) / 2).toBeCloseTo(viewport.height / 2, 0);

    await expect(preferences.getByText("Performance cookies", { exact: true })).toBeVisible();
    await expect(preferences.getByText("Marketing cookies", { exact: true })).toBeVisible();
    await expect(preferences.getByText("Not available", { exact: true })).toHaveCount(2);
    await expect(preferences.getByRole("switch", { name: "Marketing cookies" })).toHaveCount(0);
    await expect(preferences.getByRole("button", { name: "Essential only" })).toHaveCount(0);
    await expect(preferences.getByRole("switch", { name: "Performance cookies" })).toHaveCount(0);
    const analytics = preferences.getByRole("switch", { name: "Analytics cookies" });
    await expect(analytics).toHaveAttribute("aria-checked", "false");
    await analytics.click();
    await expect(analytics).toHaveAttribute("aria-checked", "true");
    await preferences.getByRole("button", { name: /Essential cookies/ }).click();
    await preferences.getByRole("button", { name: /Analytics cookies/ }).click();
    await preferences.getByRole("button", { name: /Marketing cookies/ }).click();
    await expect(preferences.locator("#cookie-marketing-description")).toBeVisible();
    await expect(preferences.getByRole("button", { name: "Save preferences" })).toBeVisible();
    await preferences.getByRole("button", { name: "Close cookie preferences" }).click();
    await expect(preferences).toBeHidden();
    await expect(banner).toBeVisible();
    const restored = await banner.boundingBox();
    expect(restored!.y).toBeCloseTo(bounds!.y, 0);
  }
  await banner.getByRole("button", { name: "Cookie preferences", exact: true }).click();
  await expect(preferences.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  await preferences.getByRole("button", { name: "Save preferences" }).click();
  await expect(preferences).toBeHidden();
  await expect(banner).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kurioticket:analytics-consent:v1"))).toBe("declined");
  await expect(page.getByRole("region", { name: "Cookie preferences status" })).toBeHidden();
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(initialScroll);

  await page.reload();
  await expect(page.getByRole("button", { name: "Cookie preferences", exact: true })).toBeVisible();
  await expect(banner).toHaveCount(0);
  await page.getByRole("button", { name: "Cookie preferences", exact: true }).click();
  await expect(preferences.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  await preferences.getByRole("button", { name: "Close cookie preferences" }).click();
  await expect(preferences).toBeHidden();
  await expect(banner).toHaveCount(0);
});


test("direct continuation refuses analytics without granting consent", async ({ page }) => {
  const methods: string[] = [];
  await page.route("**/api/identity/visitor", async route => {
    methods.push(route.request().method());
    await route.fulfill({ json: { analyticsTracking: "disabled" } });
  });
  await page.route("**/api/identity/presence", route => route.fulfill({ json: {} }));
  await page.goto("/");
  const banner = page.locator("[data-cookie-consent-banner]");
  await banner.getByRole("button", { name: "Continue without optional cookies" }).click();
  await expect(banner).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kurioticket:analytics-consent:v1"))).toBe("declined");
  await expect(page.getByRole("region", { name: "Cookie preferences status" })).toBeHidden();
  expect(methods).not.toContain("POST");
  await page.reload();
  await expect(page.getByRole("button", { name: "Cookie preferences", exact: true })).toBeVisible();
  await expect(banner).toHaveCount(0);
});
