import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";
test("mounted sandbox cards revoke on OFF and read failure, never resurrect an old revision, and leave live actions available", async () => {
    const bundle = componentBundle({ hook: "src/components/results/useSandboxResults.ts", action: "src/components/results/sandboxCardActions.ts" });
    await withComponentBrowser(bundle, `const React=require('react'),{createRoot}=require('react-dom/client'),{useSandboxResults}=require('hook'),{sandboxCardAction}=require('action');
  window.policy={controlled:true,enabled:true,revision:'r1'};window.fail=false;window.calls=[];window.clicks=[];
  window.fetch=async(url,options)=>{window.calls.push({url,cache:options.cache});if(window.fail)throw Error('unavailable');return {ok:true,json:async()=>window.policy}};
  function Screen(){const rows=useSandboxResults([{id:'live'}, {id:'test',sandboxDisplayOnly:true,sandboxRevision:'r1'}]);return React.createElement('div',null,rows.map(row=>React.createElement('div',{key:row.id,onClickCapture:e=>sandboxCardAction(row,e),onKeyDownCapture:e=>sandboxCardAction(row,e)},React.createElement('p',null,row.id+' inventory'),React.createElement('button',{onClick:()=>window.clicks.push(row.id)},row.id+' action'))));}
  createRoot(document.getElementById('root')).render(React.createElement(Screen));`, async (page) => {
        await page.getByText("test inventory", { exact: true }).waitFor();
        await page.getByRole("button", { name: "test action" }).click();
        await page.getByRole("button", { name: "test action" }).focus();
        await page.keyboard.press("Enter");
        assert.deepEqual(await page.evaluate("window.clicks"), []);
        await page.getByRole("button", { name: "live action" }).click();
        assert.deepEqual(await page.evaluate("window.clicks"), ["live"]);
        await page.evaluate("window.policy={controlled:true,enabled:false,revision:'r2'};window.dispatchEvent(new Event('focus'))");
        await page.getByText("test inventory", { exact: true }).waitFor({ state: "detached" });
        assert.equal(await page.getByText("live inventory", { exact: true }).count(), 1);
        await page.evaluate("window.policy={controlled:true,enabled:true,revision:'r3'};window.dispatchEvent(new Event('focus'))");
        await page.getByText("live inventory", { exact: true }).waitFor();
        assert.equal(await page.getByText("test inventory", { exact: true }).count(), 0);
        await page.evaluate("window.fail=true;window.dispatchEvent(new Event('focus'))");
        assert.equal(await page.getByText("test inventory", { exact: true }).count(), 0);
        const calls = await page.evaluate<Array<{
            url: string;
            cache: string;
        }>>("window.calls");
        assert.ok(calls.length >= 2);
        assert.ok(calls.every(c => c.cache === 'no-store' && c.url === '/api/provider-management/availability'));
    });
});
