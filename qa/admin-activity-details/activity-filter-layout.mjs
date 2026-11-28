import assert from "node:assert/strict";
import { expect } from "@playwright/test";

/** Measure the full-width search and the visible filter controls. */
export async function expectActivityFilterLayout(page, context = "All activity", { showInterface = false } = {}) {
  const search = page.getByRole("textbox", { name: "Search activity", exact: true });
  if (!await search.isVisible()) {
    const toggle = page.getByRole("button", { name: "Filters", exact: true });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
  }
  await expect(search).toBeVisible();
  const geometry = await page.getByTestId("activity-filters-row").evaluate(grid => {
    const rect = element => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
    };
    return {
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      grid: rect(grid),
      controls: Array.from(grid.children).map(child => {
        const control = child.matches("button") ? child : child.querySelector("button:not([role=option]),input:not([type=hidden])");
        return { ...rect(control ?? child), label: control?.getAttribute("aria-label") ?? control?.textContent?.trim() };
      }),
    };
  });
  const evidence = context + ": " + JSON.stringify(geometry);
  assert.equal(geometry.controls.length, showInterface ? 6 : 5, evidence);
  const [searchBox, ...filters] = geometry.controls;
  assert.equal(searchBox.label, "Search activity", evidence);
  assert.match(filters[0].label, /^Date range:/, evidence);
  assert.match(filters[1].label, /^Activity product:/, evidence);
  assert.match(filters[2].label, /^Activity type:/, evidence);
  if (showInterface) assert.match(filters[3].label, /^Activity interface:/, evidence);
  assert.equal(filters.at(-1).label, "Apply filters", evidence);
  assert.ok(Math.abs(searchBox.left - geometry.grid.left) <= 1
    && Math.abs(searchBox.right - geometry.grid.right) <= 1, "Search fills its own row. " + evidence);
  assert.ok(filters.every(box => box.top >= searchBox.bottom + 6), "The filter controls follow the search row. " + evidence);
  // Chromium reports 43.993px for declared 44px controls at 90% tab zoom.
  // Permit subpixel layout rounding while still rejecting a 43px target.
  assert.ok(geometry.controls.every(box => box.height >= 44 - 0.1 && box.width > 0
    && box.left >= geometry.grid.left - 1 && box.right <= geometry.grid.right + 1), "Every control stays inside the grid and retains its touch target. " + evidence);
  const columns = geometry.viewport >= 1024 ? filters.length : geometry.viewport >= 640 ? 2 : 1;
  for (let index = 0; index < filters.length; index++) {
    const rowStart = Math.floor(index / columns) * columns;
    assert.ok(Math.abs(filters[index].top - filters[rowStart].top) <= 1
      && Math.abs(filters[index].height - filters[0].height) <= 1, "Filter controls align within each responsive row. " + evidence);
    if (index % columns) assert.ok(filters[index].left >= filters[index - 1].right + 6, "Adjacent filters have a gap and do not overlap. " + evidence);
    if (index >= columns) assert.ok(filters[index].top >= filters[index - columns].bottom + 6, "Wrapped rows do not overlap. " + evidence);
  }
  assert.ok(geometry.documentWidth <= geometry.viewport + 1, "The page does not overflow horizontally. " + evidence);
  return geometry;
}
