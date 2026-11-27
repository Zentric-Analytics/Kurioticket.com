import assert from "node:assert/strict";
import test from "node:test";
import { expect } from "@playwright/test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";
import { decodeActivityJourneyReturn } from "../../lib/adminActivityJourneyNavigation";

const bundle = () => componentBundle({ list: "src/components/admin/AdminUnifiedActivityList.tsx" });
const setup = `
  const React=require('react'),{createRoot}=require('react-dom/client'),{AdminUnifiedActivityList}=require('list');
  const root=createRoot(document.getElementById('root'));
  const at=new Date('2026-11-27T10:00:00Z');
  window.fixtureEvents=[
    {id:'s-guest-search',at,stage:'SEARCH_COMPLETED',label:'Search completed',detail:'CAR · CDG → CDG · FAILED',product:'CAR',resultCount:0,
      searchHistoryId:'original-guest-search-0001',originalSearchIdentity:'guest',searchOutcome:'FAILED',platform:'WEB',platformSource:'search'},
    {id:'e-saved',at:new Date(+at-1000),stage:'ACCOUNT_ACTIVITY',label:'Save confirmed',detail:'Flight · Web · Reference: result-0123456789',product:'FLIGHT',platform:'WEB',platformSource:'action'},
    {id:'e-page',at:new Date(+at-2000),stage:'PAGE_VIEW',label:'Homepage',detail:'/ · Desktop web',pageView:{path:'/',previousPath:'/cars',transport:'web',platform:'Desktop web',href:'https://staging.kurioticket.com/'}},
    {id:'e-unlabelled',at:new Date(+at-3000),stage:'SEARCH_COMPLETED',label:'Search completed',detail:'HOTEL · Lagos',product:'HOTEL',resultCount:0},
    {id:'e-old',at:new Date(+at-4000),stage:'RESULTS_VIEWED',label:'Results viewed',detail:'FLIGHT · LOS → LHR',product:'FLIGHT'}
  ];
  window.fixtureRender=()=>root.render(React.createElement(AdminUnifiedActivityList,{
    events:window.fixtureEvents,environment:'staging',timeZone:'UTC',overview:true,
    returnHref:'/admin/users/user/account-0001/activity/all?range=today&tab=searches',
    allHref:'/admin/users/user/account-0001/activity/all?range=today'
  }));
  window.fixtureRender();
`;

for (const width of [390, 1280]) test(`activity details open by keyboard, retain identity and stay open across inserted records at ${width}px`, async () => {
  await withComponentBrowser(bundle(), setup, async page => {
    const guest = page.locator('[data-activity-id="s-guest-search"]');
    const saved = page.locator('[data-activity-id="e-saved"]');
    await expect(guest.locator("summary")).toContainText("Search failed");
    await expect(guest.locator("summary")).toContainText("Search originally recorded as guest");
    await expect(guest.getByRole("link", { name: "View original search" })).not.toBeVisible();
    await expect(saved.locator("code")).not.toBeVisible();
    await expect(page.getByRole("link", { name: "View pages visited" })).toHaveCount(0);
    await expect(page.locator('[data-activity-id="e-unlabelled"] summary')).not.toContainText("guest");
    await expect(page.locator('[data-activity-id="e-unlabelled"] summary')).not.toContainText("Search failed");
    const initialUrl = page.url();
    await guest.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(guest.locator("details")).toHaveAttribute("open", "");
    const link = guest.getByRole("link", { name: "View original search" });
    await expect(link).toBeVisible();
    const target = new URL((await link.getAttribute("href"))!, "https://admin.invalid");
    assert.equal(target.pathname, "/admin/searches/original-guest-search-0001");
    const returnPath = new URL(decodeActivityJourneyReturn(target.searchParams.get("activityReturn"))!, "https://admin.invalid");
    assert.equal(returnPath.pathname, "/admin/users/user/account-0001/activity/all");
    assert.equal(returnPath.searchParams.get("range"), "today");
    assert.equal(returnPath.searchParams.get("tab"), "searches");
    await saved.locator("summary").focus();
    await page.keyboard.press("Space");
    await expect(saved.locator("code")).toHaveText("result-0123456789");
    await expect(saved.locator("code")).toBeVisible();
    await page.evaluate(() => {
      const fixture = window as unknown as { fixtureEvents: unknown[]; fixtureRender: () => void };
      fixture.fixtureEvents = [{ id: "e-arrived", at: new Date("2026-11-27T10:01:00Z"), stage: "ACCOUNT_ACTIVITY", label: "Price alert paused", detail: "Flight", product: "FLIGHT" }, ...fixture.fixtureEvents];
      fixture.fixtureRender();
    });
    await expect(page.locator("[data-activity-id]")).toHaveCount(5);
    await expect(page.locator("[data-activity-id]").first()).toHaveAttribute("data-activity-id", "e-arrived");
    await expect(saved.locator("details")).toHaveAttribute("open", "");
    await expect(guest.locator("details")).toHaveAttribute("open", "");
    await expect(page.locator('[data-activity-id="e-old"]')).toHaveCount(0);
    assert.equal(page.url(), initialUrl, "expanding an action must not leave the selected profile");
    await saved.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(saved.locator("code")).not.toBeVisible();
    const viewportGeometry = () => page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      mode: document.compatMode,
      outside: [...document.querySelectorAll("[data-testid='unified-activity-list'], [data-testid='unified-activity-list'] *")]
        .map(node => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return { tag: node.tagName, classes: node.getAttribute("class"), activity: node.closest("[data-activity-id]")?.getAttribute("data-activity-id"),
            left: rect.left, right: rect.right, width: rect.width, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
            rotate: style.rotate, transform: style.transform };
        }).filter(rect => rect.left < -1 || rect.right > window.innerWidth + 1),
    }));
    const closing = await viewportGeometry();
    assert.ok(closing.document <= closing.viewport + 1, "the action list must not overflow the viewport: " + JSON.stringify(closing));

    // A square has its widest transformed bounds at 45 degrees. Pause the
    // real disclosure icon there to cover every intermediate animation frame
    // without relying on wall-clock timing or removing its transition.
    await saved.locator("summary .lucide-chevron-right").evaluate(node => {
      const animation = node.animate([{ rotate: "45deg" }, { rotate: "45deg" }], { duration: 1000, fill: "both" });
      animation.pause();
      animation.currentTime = 500;
    });
    const midpoint = await viewportGeometry();
    assert.ok(midpoint.document <= midpoint.viewport + 1, "the disclosure animation must not overflow the viewport at 45 degrees: " + JSON.stringify(midpoint));
    await saved.locator("summary .lucide-chevron-right").evaluate(node => node.getAnimations().forEach(animation => animation.cancel()));
  }, width);
});
