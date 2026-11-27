import assert from "node:assert/strict";
import test from "node:test";
import { expect } from "@playwright/test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

const bundle = () => componentBundle({ saved: "src/components/results/useSavedFlightResult.ts" }, {
  "next-auth/react": "exports.useSession=()=>({status:'unauthenticated',data:null});",
});

const mount = (saved: boolean) => `
  window.fixtureStorage=new Map([['kurioticket:analytics-consent:v1','granted'],['kurioticket_saved_items_v1',${JSON.stringify(JSON.stringify(saved ? ["fixture-flight"] : []))}]]);
  window.fixtureBlocked=false; window.fixtureQuota=false; window.fixtureActions=[];
  Object.defineProperty(window,'localStorage',{configurable:true,get(){
    if(window.fixtureBlocked)throw new DOMException('Fixture storage denied','SecurityError');
    return {getItem:key=>window.fixtureStorage.get(key)||null,setItem(key,value){
      if(window.fixtureQuota)throw new DOMException('Fixture quota full','QuotaExceededError');
      window.fixtureStorage.set(key,value);
    },removeItem:key=>window.fixtureStorage.delete(key)};
  }});
  let fixtureEvent=0;
  Object.defineProperty(window.crypto,'randomUUID',{configurable:true,value:()=> '00000000-0000-4000-8000-'+String(++fixtureEvent).padStart(12,'0')});
  window.fetch=async(url,init)=>{
    if(url!=='/api/activity/interactions')throw Error('Unexpected fixture request '+url);
    window.fixtureActions.push(JSON.parse(init.body).action);
    return new Response('{}',{status:200});
  };
  const React=require('react'),{createRoot}=require('react-dom/client'),{useSavedFlightResult}=require('saved');
  function Card(){const save=useSavedFlightResult({id:'fixture-flight',price:100,currency:'USD',airlineName:'Fixture Airline',provider:'Fixture Provider'},'/flights/details/fixture-flight');
    return React.createElement('main',null,
      React.createElement('button',{onClick:save.toggleSavedFlight,disabled:save.pending},save.isSaved?'Remove saved flight':'Save flight'),
      React.createElement('output',{'data-testid':'save-error'},save.savedFlightError||''));
  }
  createRoot(document.getElementById('root')).render(React.createElement(Card));
`;

for (const failure of ["quota", "blocked"] as const) for (const saved of [false, true]) {
  test(`actual guest flight ${saved ? "removal" : "save"} reports ${failure} storage without a successful action`, async () => {
    await withComponentBrowser(bundle(), mount(saved), async page => {
      const name = saved ? "Remove saved flight" : "Save flight";
      await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
      await page.evaluate(mode => {
        const fixture = window as unknown as { fixtureQuota: boolean; fixtureBlocked: boolean };
        fixture.fixtureQuota = mode === "quota";
        fixture.fixtureBlocked = mode === "blocked";
      }, failure);
      await page.getByRole("button", { name, exact: true }).click();
      await expect(page.getByTestId("save-error")).toContainText("Unable to update saved flight");
      await expect(page.getByRole("button", { name, exact: true })).toBeEnabled();
      const outcome = await page.evaluate(() => {
        const fixture = window as unknown as { fixtureActions: string[]; fixtureStorage: Map<string, string> };
        return { actions: fixture.fixtureActions, stored: fixture.fixtureStorage.get("kurioticket_saved_items_v1") };
      });
      assert.deepEqual(outcome.actions, []);
      assert.equal(outcome.stored, JSON.stringify(saved ? ["fixture-flight"] : []));
    });
  });
}

test("actual guest flight save and removal record success only after normal persistence", async () => {
  await withComponentBrowser(bundle(), mount(false), async page => {
    await page.getByRole("button", { name: "Save flight", exact: true }).click();
    await expect(page.getByRole("button", { name: "Remove saved flight", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Remove saved flight", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save flight", exact: true })).toBeVisible();
    await expect(page.getByTestId("save-error")).toBeEmpty();
    const outcome = await page.evaluate(() => {
      const fixture = window as unknown as { fixtureActions: string[]; fixtureStorage: Map<string, string> };
      return { actions: fixture.fixtureActions, stored: fixture.fixtureStorage.get("kurioticket_saved_items_v1") };
    });
    assert.deepEqual(outcome.actions, ["local_saved", "local_unsaved"]);
    assert.equal(outcome.stored, "[]");
  });
});
