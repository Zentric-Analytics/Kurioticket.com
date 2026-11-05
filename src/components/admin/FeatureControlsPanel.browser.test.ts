import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

const control = { key: "CAR_SEARCH_ENABLED", name: "Car Search", description: "Fixture control", category: "Travel Search", risk: "High", kind: "product", state: { enabled: true, updatedAt: null } };
const props = { initialControls: [control], environment: "STAGING", canControlProduction: false, operationsAvailable: true };
const bundle = () => componentBundle({ panel: "src/components/admin/FeatureControlsPanel.tsx" }, { "next/navigation": "exports.useRouter=()=>({refresh:()=>window.fixtureRefreshes++});" });
const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{FeatureControlsPanel}=require('panel');
  const root=createRoot(document.getElementById('root'));window.fixtureRequests=[];window.fixtureRefreshes=0;window.fixtureOk=false;
  window.fetch=async(url,options)=>{window.fixtureRequests.push({url,...options});return {ok:window.fixtureOk,json:async()=>window.fixtureOk?{enabled:false,updatedAt:'2030-01-01T00:00:00Z'}:{error:'Fixture denied'}};};
  window.fixtureRender=props=>root.render(React.createElement(FeatureControlsPanel,props));window.fixtureRender(${JSON.stringify(props)});`;

test("Feature Controls preserve same-data drafts and confirmation across refreshes, errors and cancellation", async () => {
  await withComponentBrowser(bundle(), setup, async page => {
    await page.getByRole("button", { name: "Disable Car Search", exact: true }).click();
    await page.getByRole("textbox", { name: "Reason (optional)" }).fill("local reason");
    await page.evaluate(p => (window as unknown as { fixtureRender: (p: object) => void }).fixtureRender(p), props);
    assert.equal(await page.getByRole("textbox").inputValue(), "local reason");
    await page.getByRole("button", { name: "Confirm change" }).click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByRole("alert").innerText(), "Fixture denied");
    assert.equal(await page.getByRole("textbox").inputValue(), "local reason");
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureRefreshes: number }).fixtureRefreshes), 0);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.getByRole("button", { name: "Disable Car Search", exact: true }).click();
    assert.equal(await page.getByRole("textbox").inputValue(), "");
    await page.getByRole("textbox").press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
  });
});

test("Feature Controls apply successful saves and reject stale confirmations after server or permission changes", async () => {
  await withComponentBrowser(bundle(), setup, async page => {
    await page.getByRole("button", { name: "Disable Car Search" }).click();
    await page.evaluate(() => { (window as unknown as { fixtureOk: boolean }).fixtureOk = true; });
    await page.getByRole("button", { name: "Confirm change" }).click();
    await page.getByRole("button", { name: "Enable Car Search" }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Enable Car Search" }).getAttribute("aria-pressed"), "false");
    const requests = await page.evaluate(() => (window as unknown as { fixtureRequests: Array<{ url: string; method: string; body: string }> }).fixtureRequests);
    assert.equal(requests.length, 1); assert.equal(requests[0].url, "/api/admin/feature-controls"); assert.equal(requests[0].method, "PATCH");
    assert.deepEqual(JSON.parse(requests[0].body), { key: control.key, enabled: false });
    await page.getByRole("button", { name: "Enable Car Search" }).click();
    await page.evaluate(p => (window as unknown as { fixtureRender: (p: object) => void }).fixtureRender(p), { ...props, initialControls: [{ ...control, state: { enabled: false, updatedAt: "2030-02-01" } }] });
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    await page.getByRole("button", { name: "Enable Car Search" }).click();
    await page.evaluate(p => (window as unknown as { fixtureRender: (p: object) => void }).fixtureRender(p), { ...props, environment: "PRODUCTION", canControlProduction: false });
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    assert.equal(await page.getByRole("button", { name: "Disable Car Search" }).isDisabled(), true);
  });
});

test("Feature Controls retain production reason requirement and read-only fallback", async () => {
  await withComponentBrowser(bundle(), setup, async page => {
    await page.evaluate(p => (window as unknown as { fixtureRender: (p: object) => void }).fixtureRender(p), { ...props, environment: "PRODUCTION", canControlProduction: true });
    await page.getByRole("button", { name: "Disable Car Search" }).click();
    assert.equal(await page.getByRole("button", { name: "Confirm change" }).isDisabled(), true);
    await page.getByRole("textbox", { name: "Reason (required)" }).fill("approved fixture reason");
    assert.equal(await page.getByRole("button", { name: "Confirm change" }).isDisabled(), false);
    await page.evaluate(p => (window as unknown as { fixtureRender: (p: object) => void }).fixtureRender(p), { ...props, operationsAvailable: false });
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    assert.equal(await page.getByRole("button", { name: "Disable Car Search" }).isDisabled(), true);
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureRequests: unknown[] }).fixtureRequests.length), 0);
  });
});

test("Feature Controls lock pending saves and discard a response from an obsolete server scope", async () => {
  await withComponentBrowser(bundle(), setup + `window.fetch=()=>new Promise(resolve=>window.fixtureComplete=()=>resolve({ok:true,json:async()=>({enabled:false})}));`, async page => {
    await page.getByRole("button", { name: "Disable Car Search" }).click();
    await page.getByRole("button", { name: "Confirm change" }).click();
    await page.getByRole("button", { name: "Saving…", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Cancel", exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole("textbox").isDisabled(), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 1);
    await page.evaluate(p => (window as unknown as { fixtureRender: (p: object) => void }).fixtureRender(p), { ...props, initialControls: [{ ...control, state: { enabled: true, updatedAt: "2030-03-01" } }] });
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    await page.evaluate(() => (window as unknown as { fixtureComplete: () => void }).fixtureComplete());
    await page.waitForFunction(() => (window as unknown as { fixtureRefreshes: number }).fixtureRefreshes === 1);
    assert.equal(await page.getByRole("button", { name: "Disable Car Search" }).getAttribute("aria-pressed"), "true");
    assert.equal(await page.getByRole("button", { name: "Disable Car Search" }).isDisabled(), false);
  });
});
