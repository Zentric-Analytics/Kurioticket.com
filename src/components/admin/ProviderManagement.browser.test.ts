import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";
test("production sandbox control defaults OFF, requires a reason, uses the audited existing endpoint and displays ON only after success", async () => {
    const control = { key: "ALLOW_SANDBOX_RESULTS_IN_PRODUCTION", name: "Allow Sandbox Results in Production", description: "Display only", category: "Provider Management", risk: "Critical", kind: "product", state: { enabled: false, updatedAt: null } };
    const bundle = componentBundle({ panel: "src/components/admin/FeatureControlsPanel.tsx" }, { "next/navigation": "exports.useRouter=()=>({refresh:()=>window.refreshed++});" });
    await withComponentBrowser(bundle, `const React=require('react'),{createRoot}=require('react-dom/client'),{FeatureControlsPanel}=require('panel');window.requests=[];window.refreshed=0;window.fetch=async(url,options)=>{window.requests.push({url,options});return {ok:true,json:async()=>({enabled:true,updatedAt:'2030-01-01T00:00:00.000Z'})}};createRoot(document.getElementById('root')).render(React.createElement(FeatureControlsPanel,{initialControls:[${JSON.stringify(control)}],environment:'PRODUCTION',canControlProduction:true,operationsAvailable:true}));`, async (page) => {
        const name = "Enable Allow Sandbox Results in Production";
        assert.equal(await page.getByRole("switch", { name, exact: true }).getAttribute("aria-checked"), "false");
        await page.getByRole("switch", { name, exact: true }).click();
        assert.equal(await page.getByRole("button", { name, exact: true }).isDisabled(), true);
        await page.getByRole("textbox", { name: "Reason for change (required)" }).fill("Approved display-only provider testing");
        await page.getByRole("button", { name, exact: true }).click();
        await page.getByRole("switch", { name: "Disable Allow Sandbox Results in Production", exact: true }).waitFor();
        assert.equal(await page.getByText("ON", { exact: true }).count(), 1);
        const requests = await page.evaluate<Array<{
            url: string;
            options: {
                method: string;
                body: string;
            };
        }>>("window.requests");
        assert.equal(requests.length, 1);
        assert.equal(requests[0].url, "/api/admin/feature-controls");
        assert.equal(requests[0].options.method, "PATCH");
        assert.deepEqual(JSON.parse(requests[0].options.body), { key: control.key, enabled: true, reason: "Approved display-only provider testing" });
    });
});
