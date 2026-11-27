import assert from "node:assert/strict";
import test from "node:test";
import { expect } from "@playwright/test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

const bundle = (selector = false) => componentBundle({
  // Share the selector's production import IDs so each context is instantiated once.
  "@/components/layout/LocaleProvider": "src/components/layout/LocaleProvider.tsx",
  "@/components/region/RegionProvider": "src/components/region/RegionProvider.tsx",
  ...(selector ? { selector: "src/components/region/CountryCurrencySelector.tsx" } : {}),
});

const mount = (before = "", props = "{}", selector = false) => `
  ${before}
  const React=require('react'), {createRoot}=require('react-dom/client');
  const {LocaleProvider,useLocale}=require('@/components/layout/LocaleProvider'), {RegionProvider,useRegion}=require('@/components/region/RegionProvider');
  const props=${props};
  function Selection() {
    const locale=useLocale(), region=useRegion();
    return React.createElement('main',null,
      React.createElement('output',{'data-testid':'selection'},[locale.locale,region.mode,region.selectedCurrency,locale.storageResolutionComplete?'ready':'pending'].join('/')),
      React.createElement('button',{onClick:()=>locale.setLocale('fr')},'Select French'),
      React.createElement('button',{onClick:()=>region.setMode('JP')},'Select Japan'),
      React.createElement('button',{onClick:()=>region.setCurrency('EUR')},'Select euros'),
      ${selector ? "React.createElement(require('selector').CountryCurrencySelector)" : "null"});
  }
  createRoot(document.getElementById('root')).render(React.createElement(LocaleProvider,props.locale||{},
    React.createElement(RegionProvider,{initialMode:'US',...props.region},React.createElement(Selection))));
`;

const blockStorage = `Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Fixture storage denied','SecurityError')}});`;

test("mounted preferences resolve and stay usable when localStorage access is denied", async () => {
  await withComponentBrowser(bundle(), mount(blockStorage), async page => {
    const selected = page.getByTestId("selection");
    await expect(selected).toHaveText("en-us/US/USD/ready");
    await page.getByRole("button", { name: "Select French" }).click();
    await expect(selected).toHaveText("fr/US/USD/ready");
    await page.getByRole("button", { name: "Select euros" }).click();
    await page.getByRole("button", { name: "Select Japan" }).click();
    await expect(selected).toHaveText("fr/JP/EUR/ready");
    assert.equal(await page.locator("html").getAttribute("lang"), "fr");
    const cookies = await page.context().cookies();
    assert.equal(cookies.find(cookie => cookie.name === "kurioticket_locale")?.value, "fr");
    assert.equal(cookies.find(cookie => cookie.name === "kurioticket_currency")?.value, "EUR");
    assert.equal(cookies.find(cookie => cookie.name === "kurioticket_region_override")?.value, "JP");
  });
});

test("mounted preferences ignore malformed region and currency cookies and use valid stored choices", async () => {
  await withComponentBrowser(bundle(), mount(`
    document.cookie='kurioticket_region_override=%E0%A4%A; Path=/';
    document.cookie='kurioticket_currency=%E0%A4%A; Path=/';
    localStorage.setItem('kurioticket_locale','fr');
    localStorage.setItem('kurioticket_region_override','JP');
    localStorage.setItem('kurioticket_currency','EUR');
  `), async page => {
    await expect(page.getByTestId("selection")).toHaveText("fr/JP/EUR/ready");
    await page.getByRole("button", { name: "Select euros" }).click();
    assert.equal((await page.context().cookies()).find(cookie => cookie.name === "kurioticket_currency")?.value, "EUR");
  });
});

test("explicit server preferences retain priority over older local values", async () => {
  await withComponentBrowser(bundle(), mount(`
    localStorage.setItem('kurioticket_locale','fr');
    localStorage.setItem('ct_language','de');
    localStorage.setItem('kurioticket_region_override','BR');
    localStorage.setItem('kurioticket_currency','JPY');
  `, `{locale:{initialLocale:'en-us',initialLocaleIsExplicit:true},region:{initialMode:'JP',initialModeIsExplicit:true,initialCurrency:'EUR'}}`), async page => {
    await expect(page.getByTestId("selection")).toHaveText("en-us/JP/EUR/ready");
    assert.deepEqual(await page.evaluate(() => [localStorage.getItem("kurioticket_locale"), localStorage.getItem("ct_language")]), ["en-us", "en-us"]);
  });
});

test("mounted preferences keep current-document choices when both cookies and storage are denied", async () => {
  await withComponentBrowser(bundle(), mount(blockStorage + `
    Object.defineProperty(document,'cookie',{configurable:true,get(){throw new DOMException('Fixture cookies denied','SecurityError')},set(){throw new DOMException('Fixture cookies denied','SecurityError')}});
  `), async page => {
    await expect(page.getByTestId("selection")).toHaveText("en-us/US/USD/ready");
    await page.getByRole("button", { name: "Select French" }).click();
    await page.getByRole("button", { name: "Select Japan" }).click();
    await expect(page.getByTestId("selection")).toHaveText("fr/JP/JPY/ready");
    await page.getByRole("button", { name: "Select euros" }).click();
    await expect(page.getByTestId("selection")).toHaveText("fr/JP/EUR/ready");
    assert.equal((await page.context().cookies()).length, 0);
  });
});

test("the actual country and currency control opens when its optional debug storage is blocked", async () => {
  await withComponentBrowser(bundle(true), mount(blockStorage, "{}", true), async page => {
    await expect(page.getByTestId("selection")).toHaveText("en-us/US/USD/ready");
    await page.locator('button[aria-haspopup="dialog"]').click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
