import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

const bundle = () => componentBundle({
  alert: "src/components/admin/AdminAlertAcknowledgeButton.tsx",
  trips: "src/components/admin/ConfirmedTripsBreakdowns.tsx",
}, { "next/navigation": "exports.useRouter=()=>({refresh:()=>window.fixtureRefreshes++});" });

test("Global Alerts acknowledgement sends the exact scoped signal, preserves failure, and refreshes only on success", async () => {
  const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{AdminAlertAcknowledgeButton}=require('alert');
    window.fixtureRefreshes=0;window.fixtureRequests=[];window.fixtureEvents=0;window.fixtureOk=false;
    window.addEventListener('admin-alerts-updated',()=>window.fixtureEvents++);
    window.fetch=async (url,options)=>{window.fixtureRequests.push({url,...options});return {ok:window.fixtureOk,json:async()=>({error:'Signal changed. Refresh before acknowledging.'})};};
    createRoot(document.getElementById('root')).render(React.createElement(AdminAlertAcknowledgeButton,{alertKey:'fixture-provider-flight',signalToken:'fixture-signal-only',acknowledged:false}));`;
  await withComponentBrowser(bundle(), setup, async page => {
    await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
    await page.getByText("Signal changed. Refresh before acknowledging.", { exact: true }).waitFor();
    const first = await page.evaluate(() => ({ requests: (window as unknown as { fixtureRequests: Array<{url: string; method: string; credentials: string; body: string}> }).fixtureRequests, refreshes: (window as unknown as { fixtureRefreshes: number }).fixtureRefreshes }));
    assert.equal(first.requests.length, 1);
    assert.equal(first.requests[0].url, "/api/admin/notifications/acknowledge");
    assert.equal(first.requests[0].method, "POST");
    assert.equal(first.requests[0].credentials, "include");
    assert.deepEqual(JSON.parse(first.requests[0].body), { alertKey: "fixture-provider-flight", signalToken: "fixture-signal-only" });
    assert.equal(first.refreshes, 0);
    await page.evaluate(() => { (window as unknown as { fixtureOk: boolean }).fixtureOk = true; });
    await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
    await page.waitForFunction(() => (window as unknown as { fixtureRefreshes: number }).fixtureRefreshes === 1);
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureEvents: number }).fixtureEvents), 1);
    assert.equal(await page.getByText("Signal changed. Refresh before acknowledging.", { exact: true }).count(), 0);
  });
});

test("acknowledged alerts expose no repeat mutation control", async () => {
  const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{AdminAlertAcknowledgeButton}=require('alert');
    window.fetch=()=>{throw Error('Unexpected acknowledged mutation');};
    createRoot(document.getElementById('root')).render(React.createElement(AdminAlertAcknowledgeButton,{alertKey:'fixture-only',signalToken:'fixture-only',acknowledged:true}));`;
  await withComponentBrowser(bundle(), setup, async page => {
    await page.getByText("Acknowledged for 24 hours", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button").count(), 0);
  });
});

test("Trips monitoring distinguishes unavailable, empty and populated supplier data in a narrow browser", async () => {
  const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{ConfirmedTripsBreakdowns}=require('trips');
    const root=createRoot(document.getElementById('root'));window.fixtureRender=operations=>root.render(React.createElement(ConfirmedTripsBreakdowns,{operations}));window.fixtureRender(null);`;
  await withComponentBrowser(bundle(), setup, async page => {
    await page.getByText("Product breakdown unavailable", { exact: true }).waitFor();
    assert.equal(await page.getByText("No confirmed trips yet.", { exact: true }).count(), 0);
    await page.evaluate(() => (window as unknown as { fixtureRender: (data: unknown) => void }).fixtureRender({ byProduct: [], byProvider: [] }));
    await page.getByText("No confirmed trips yet.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("status").count(), 2);
    await page.evaluate(() => (window as unknown as { fixtureRender: (data: unknown) => void }).fixtureRender({ byProduct: [{ tripType: "CAR", count: 2 }], byProvider: [{ provider: "Fixture supplier only", count: 2, lastConfirmationAt: null }] }));
    await page.getByText("Fixture supplier only", { exact: true }).waitFor();
    assert.equal(await page.getByLabel("2 provider-confirmed trips", { exact: true }).count(), 2);
    assert.equal(await page.getByRole("status").count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }, 375);
});
