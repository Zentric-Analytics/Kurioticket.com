import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

const from = "2026-11-24T23:30:00.000Z";
const to = "2026-11-25T23:00:00.000Z";

test("Trips keep exact bookmark bounds when applying other filters and replace only an edited date", async () => {
  const bundle = componentBundle({ filters: "src/components/admin/TripFilterControls.tsx" });
  const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{TripFilterControls}=require('filters');
    window.submitted=[];
    document.addEventListener('submit',event=>{
      event.preventDefault();
      window.submitted.push(Object.fromEntries(new FormData(event.target)));
    });
    createRoot(document.getElementById('root')).render(React.createElement(TripFilterControls,{
      filters:{q:'',provider:'',product:'all',status:'all',identity:'all',from:${JSON.stringify(from)},to:${JSON.stringify(to)}},
      range:'custom',providerNames:[],timeZone:'Africa/Lagos',timeZoneLabel:'WAT (UTC+1)',today:'2026-11-27'
    }));`;
  await withComponentBrowser(bundle, setup, async page => {
    const form = page.getByRole("form", { name: "Filter trip directory" });
    const inputs = form.locator('input[type="date"]');
    assert.equal(await inputs.nth(0).inputValue(), "2026-11-25");
    assert.equal(await inputs.nth(1).inputValue(), "2026-11-25");
    await form.getByRole("searchbox").fill("Lagos");
    await form.getByRole("button", { name: "Apply", exact: true }).click();
    const dateTrigger = form.locator("label").filter({ hasText: "From (WAT (UTC+1))" }).getByRole("button");
    await dateTrigger.click();
    await page.getByRole("gridcell", { name: "Tuesday, November 24, 2026" }).click();
    await form.getByRole("button", { name: "Apply", exact: true }).click();
    const submitted: { q: string; from: string; to: string }[] = await page.evaluate("window.submitted");
    assert.deepEqual(submitted.map(record => [record.q, record.from, record.to]), [
      ["Lagos", from, to],
      ["Lagos", "2026-11-24", to],
    ]);
  }, 390);
});

test("legacy trip records keep their exact end until its calendar field is edited", async () => {
  const bundle = componentBundle({ calendar: "src/components/admin/AdminCalendarInput.tsx" });
  const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{AdminUncontrolledCalendarInput}=require('calendar');
    createRoot(document.getElementById('root')).render(React.createElement('form',{'aria-label':'Trip records'},
      React.createElement(AdminUncontrolledCalendarInput,{
        name:'to',defaultValue:'2026-11-25',defaultSubmitValue:${JSON.stringify(to)},timeZone:'Africa/Lagos',ariaLabel:'Trip records end date'
      }))); `;
  await withComponentBrowser(bundle, setup, async page => {
    const trigger = page.getByRole("button", { name: "Trip records end date" });
    await trigger.waitFor();
    const submittedEnd = () => page.locator("form").evaluate(form => new FormData(form as HTMLFormElement).get("to"));
    assert.equal(await submittedEnd(), to);
    await trigger.click();
    await page.getByRole("gridcell", { name: "Thursday, November 26, 2026" }).click();
    assert.equal(await submittedEnd(), "2026-11-26");
  });
});
