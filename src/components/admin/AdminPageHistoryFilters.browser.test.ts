import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";
import { parsePageHistoryQuery } from "../../lib/adminPageHistory";

const at = new Date("2026-11-27T10:00:00.000Z");
const first = parsePageHistoryQuery({ range: "all", q: "Support", platform: "android", page: "2" }, at);
assert.ok(first.ok);
const props = {
  path: "/admin/users/guest/qa-guest-0001/pages", query: first.query, timeZone: "UTC",
  returnHref: "/admin/users/guest/qa-guest-0001/activity/all?range=all&usersReturn=%2Fadmin%2Fusers%2Fonline%3Fpage%3D3",
};

test("Page History refresh preserves draft text, input identity and focus; Apply and Back restore applied scope", async () => {
  const bundle = componentBundle({
    filters: "src/components/admin/AdminPageHistoryFilters.tsx",
    navigation: "src/lib/adminPageHistory.ts",
  });
  const setup = `const React=require('react'),{createRoot}=require('react-dom/client');
    const {AdminPageHistoryFilters}=require('filters'),{pageHistoryFiltersKey}=require('navigation');
    const root=createRoot(document.getElementById('root'));
    window.fixtureRender=props=>root.render(React.createElement('div',{'data-observed-cutoff':props.query.filters.to},
      React.createElement(AdminPageHistoryFilters,{...props,key:pageHistoryFiltersKey(props.query,props.timeZone)})));
    window.fixtureRender(${JSON.stringify(props)});`;
  await withComponentBrowser(bundle, setup, async page => {
    const input = page.getByRole("textbox", { name: "Search page or route", exact: true });
    await input.fill("unfinished route search");
    await input.evaluate(element => { (window as unknown as { fixtureInput: Element }).fixtureInput = element; });
    const nextCutoff = new Date(+at + 60_000).toISOString();
    const refreshed = { ...props, query: { ...props.query, filters: { ...props.query.filters, to: nextCutoff } } };
    await page.evaluate(next => (window as unknown as { fixtureRender: (next: object) => void }).fixtureRender(next), refreshed);
    await page.waitForFunction(to => document.querySelector("[data-observed-cutoff]")?.getAttribute("data-observed-cutoff") === to, nextCutoff);
    assert.equal(await input.inputValue(), "unfinished route search");
    assert.equal(await input.evaluate(element => element === (window as unknown as { fixtureInput: Element }).fixtureInput), true);
    assert.equal(await input.evaluate(element => document.activeElement === element), true);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation), []);

    await page.getByRole("button", { name: "Apply filters", exact: true }).click();
    const urls = await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation);
    const applied = new URL(urls.at(-1)!, "http://fixture.local");
    assert.equal(applied.searchParams.get("q"), "unfinished route search");
    assert.equal(applied.searchParams.get("page"), "1");
    assert.equal(applied.searchParams.get("range"), "all");
    assert.equal(applied.searchParams.get("platform"), "android");
    assert.equal(applied.searchParams.has("from"), false);
    assert.equal(applied.searchParams.has("to"), false);
    assert.equal(applied.searchParams.get("activityReturn"), props.returnHref);

    const committed = { ...refreshed, query: { ...refreshed.query, page: 1, filters: { ...refreshed.query.filters, q: "unfinished route search" } } };
    await page.evaluate(next => (window as unknown as { fixtureRender: (next: object) => void }).fixtureRender(next), committed);
    await input.fill("another unsaved edit");
    await page.evaluate(next => (window as unknown as { fixtureRender: (next: object) => void }).fixtureRender(next), props);
    await page.waitForFunction(() => (document.querySelector('[aria-label="Search page or route"]') as HTMLInputElement)?.value === "Support");
    assert.equal(await input.inputValue(), "Support", "a restored applied history scope replaces its unsubmitted draft");
  });
});
