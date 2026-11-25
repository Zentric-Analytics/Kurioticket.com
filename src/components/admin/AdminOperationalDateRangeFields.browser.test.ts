import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

type FixtureWindow = Window & {
  fixtureRender: (from: string, to: string) => void;
  fixtureSubmissions: { prevented: boolean; from: string; to: string }[];
};

const bundle = () => componentBundle({ fields: "src/components/admin/AdminOperationalDateRangeFields.tsx" });
const setup = (from: string, to: string, now = "2026-11-06T00:00:00Z") => `
  const React = require("react"), {createRoot} = require("react-dom/client");
  const {AdminOperationalDateRangeFields} = require("fields");
  const root = createRoot(document.getElementById("root"));
  window.fixtureSubmissions = [];
  window.fixtureRender = (initialFrom, initialTo) => root.render(React.createElement("form", null,
    React.createElement(AdminOperationalDateRangeFields, {
      initialRange:"custom", initialFrom, initialTo, now:${JSON.stringify(now)},
      timeZone:"America/New_York",testId:"reporting-range"
    }), React.createElement("button", {type:"submit"}, "Apply filters")));
  document.addEventListener("submit", event => {
    const form = new FormData(event.target);
    window.fixtureSubmissions.push({prevented:event.defaultPrevented, from:form.get("from"), to:form.get("to")});
    event.preventDefault();
  });
  window.fixtureRender(${JSON.stringify(from)}, ${JSON.stringify(to)});
`;

test("operational calendar ranges count 90 local dates across the fall clock change", async () => {
  await withComponentBrowser(bundle(), setup("2026-08-07", "2026-11-04"), async (page) => {
    const apply = page.getByRole("button", { name: "Apply filters" });
    await apply.click();
    await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRender("2026-08-06", "2026-11-04"));
    await page.getByRole("alert").waitFor();
    await apply.click();
    assert.deepEqual(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureSubmissions), [
      { prevented: false, from: "2026-08-07", to: "2026-11-04" },
      { prevented: true, from: "2026-08-06", to: "2026-11-04" },
    ]);
  });
});

test("a partial final day still counts toward the operational calendar limit", async () => {
  await withComponentBrowser(bundle(), setup("2026-01-01", "2026-04-01", "2026-04-01T04:30:00Z"), async (page) => {
    await page.getByRole("alert").waitFor();
    await page.getByRole("button", { name: "Apply filters" }).click();
    assert.deepEqual(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureSubmissions), [
      { prevented: true, from: "2026-01-01", to: "2026-04-01" },
    ]);
  });
});

test("operational clock ranges keep the elapsed 90-day limit and explicit timestamp values", async () => {
  const from = "2026-08-07T04:00:00.000Z";
  const exactLimit = "2026-11-05T04:00:00.000Z";
  const beyondLimit = "2026-11-05T05:00:00.000Z";
  await withComponentBrowser(bundle(), setup(from, exactLimit), async (page) => {
    const apply = page.getByRole("button", { name: "Apply filters" });
    await apply.click();
    await page.evaluate(([from, to]) => (window as unknown as FixtureWindow).fixtureRender(from, to), [from, beyondLimit]);
    await page.getByRole("alert").waitFor();
    await apply.click();
    assert.deepEqual(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureSubmissions), [
      { prevented: false, from, to: exactLimit },
      { prevented: true, from, to: beyondLimit },
    ]);
  });
});

test("legacy open-bound bookmark keeps its submitted bound", async () => {
  await withComponentBrowser(bundle(), setup("2026-11-04", ""), async (page) => {
    assert.equal(await page.getByRole("alert").count(), 0);
    await page.locator("form").dispatchEvent("submit", { cancelable: true, bubbles: true });
    assert.deepEqual(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureSubmissions), [
      { prevented: false, from: "2026-11-04", to: "" },
    ]);
  });
});
