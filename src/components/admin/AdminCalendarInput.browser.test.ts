import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

const bundle = () => componentBundle({ calendar: "src/components/admin/AdminCalendarInput.tsx" });

test("shared Admin calendar uses inline month/year arrows and immediately closes after choosing a valid day", async () => {
  const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{AdminCalendarInput}=require('calendar');
    const root=createRoot(document.getElementById('root'));
    window.changes=[];window.filterApplies=0;
    const Screen=()=>{const [value,setValue]=React.useState('2026-11-19');
      return React.createElement('div',null,
        React.createElement(AdminCalendarInput,{
          value,min:'2026-10-01',max:'2026-11-30',ariaLabel:'From (UTC)',
          onValueChange:date=>{window.changes.push(date);setValue(date);}
        }),
        React.createElement('button',{type:'button',onClick:()=>window.filterApplies++},'Apply filters')
      );};
    root.render(React.createElement(Screen));`;
  await withComponentBrowser(bundle(), setup, async page => {
    const trigger = page.getByRole("button", { name: "From (UTC)" });
    await trigger.click();
    const popup = page.getByRole("dialog", { name: "From (UTC)" });
    await popup.waitFor();
    assert.equal(await popup.getByRole("combobox").count(), 0);
    assert.equal(await popup.getByRole("button", { name: "Apply date" }).count(), 0);
    assert.equal(await popup.getByRole("heading").innerText(), "November 2026");
    await popup.getByRole("button", { name: "Previous year" }).click();
    assert.equal(await popup.getByRole("heading").innerText(), "November 2025");
    await popup.getByRole("button", { name: "Next year" }).click();
    assert.equal(await popup.getByRole("heading").innerText(), "November 2026");
    await popup.getByRole("button", { name: "Previous month" }).click();
    assert.equal(await popup.getByRole("heading").innerText(), "October 2026");
    await popup.getByRole("gridcell", { name: "Thursday, October 15, 2026" }).click();
    assert.equal(await popup.count(), 0, "Selecting a day immediately closes the popup");
    assert.match(await trigger.innerText(), /10\/15\/2026/);
    assert.deepEqual(await page.evaluate("window.changes"), ["2026-10-15"]);
    assert.equal(await page.evaluate("window.filterApplies"), 0, "Choosing a date never applies the page filters");
    await page.getByRole("button", { name: "Apply filters" }).click();
    assert.equal(await page.evaluate("window.filterApplies"), 1);
  }, 390);
});

test("datetime calendar preserves time controls, clamps to strict UTC bounds and closes on day click", async () => {
  const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{AdminCalendarInput}=require('calendar');
    const root=createRoot(document.getElementById('root'));
    window.changes=[];const Screen=()=>{const [value,setValue]=React.useState('2026-11-19T09:00');
      return React.createElement(AdminCalendarInput,{
        mode:'datetime-local', value, min:'2026-11-19T08:30',max:'2026-11-20T10:00',
        ariaLabel:'To (UTC)',onValueChange:next=>{window.changes.push(next);setValue(next);}
      });};root.render(React.createElement(Screen));`;
  await withComponentBrowser(bundle(), setup, async page => {
    const trigger = page.getByRole("button", { name: "To (UTC)" });
    await trigger.click();
    const popup = page.getByRole("dialog", { name: "To (UTC)" });
    await popup.getByRole("spinbutton", { name: "Hour" }).fill("23");
    await popup.getByRole("spinbutton", { name: "Minute" }).fill("45");
    await popup.getByRole("gridcell", { name: "Friday, November 20, 2026" }).click();
    assert.equal(await popup.count(), 0);
    assert.deepEqual(await page.evaluate("window.changes"), ["2026-11-20T10:00"]);
    assert.match(await trigger.innerText(), /11\/20\/2026 10:00 AM/);
  });
});
