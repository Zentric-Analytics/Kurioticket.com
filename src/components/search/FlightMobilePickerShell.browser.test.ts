import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

const bundle = () => componentBundle({
  dates: "src/components/search/MobileDateRangePicker.tsx",
  shell: "src/components/search/FlightMobilePickerShell.tsx",
}, { "@/components/layout/LocaleProvider": 'exports.useLocale=()=>({t:{back:"Back",cancel:"Cancel"}});' });

test("standalone Flight dates own initial focus, both keyboard boundaries and restoration without changing drafts", async () => {
  await withComponentBrowser(bundle(), `
    const React=require('react'),{createRoot}=require('react-dom/client'),{MobileDatePickerDialog}=require('dates');
    function Fixture(){const[open,setOpen]=React.useState(false),ref=React.useRef(null);return React.createElement(React.Fragment,null,
      React.createElement('button',{ref,onClick:()=>setOpen(true)},'Choose travel dates'),
      React.createElement('button',null,'Background travelers'),
      React.createElement(MobileDatePickerDialog,{open,title:'Choose travel dates',titleId:'date-title',launcherRef:ref,
        startDate:'2030-11-10',endDate:'2030-11-12',rangeRequired:true,firstMonth:new Date(2030,10,1),monthCount:2,
        locale:'en-US',weekdays:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
        labels:{selectDates:'Select dates',start:'Start',end:'End',done:'Done',selectDatePrefix:'Select date'},
        isDateDisabled:()=>false,onCommit:(...values)=>window.fixtureCommits.push(values),onClose:()=>setOpen(false)}));}
    window.fixtureCommits=[];createRoot(document.getElementById('root')).render(React.createElement(Fixture));
  `, async page => {
    const opener = page.getByRole("button", { name: "Choose travel dates", exact: true });
    await opener.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    const contained = () => page.evaluate(() => Boolean(document.activeElement?.closest('dialog[open]')));
    assert.equal(await contained(), true, "initial focus belongs to the native modal");
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
    const controls = dialog.locator('button:visible:not([disabled]),input:visible:not([disabled])');
    await controls.last().focus();
    await page.keyboard.press("Tab");
    assert.equal(await contained(), true, "forward boundary wraps inside");
    await controls.first().focus();
    await page.keyboard.press("Shift+Tab");
    assert.equal(await contained(), true, "reverse boundary wraps inside");
    await page.getByRole("button", { name: "Background travelers" }).evaluate(element => (element as HTMLElement).focus());
    assert.equal(await contained(), true, "native inert background rejects programmatic focus");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await opener.evaluate(element => element === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureCommits: unknown[] }).fixtureCommits), [], "Escape never commits a changed itinerary");
    await opener.click();
    await dialog.waitFor({ state: "visible" });
    await dialog.getByRole("button", { name: "Back", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => document.body.style.overflow), "", "pointer close restores scroll too");
    await opener.press("Enter");
    await dialog.waitFor({ state: "visible" });
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureCommits: unknown[] }).fixtureCommits), [["2030-11-10", "2030-11-12"]], "unchanged selected itinerary commits exactly once");
  }, 375);
});

test("withinDialog Flight picker leaves native modality and document locks to its parent", async () => {
  await withComponentBrowser(bundle(), `
    const React=require('react'),{createRoot}=require('react-dom/client'),{FlightMobilePickerShell}=require('shell');
    function Fixture(){const[parentOpen,setParentOpen]=React.useState(false),[open,setOpen]=React.useState(false),parent=React.useRef(null);
      React.useEffect(()=>{if(parentOpen)parent.current.showModal();},[parentOpen]);
      return React.createElement(React.Fragment,null,
        React.createElement('button',{onClick:()=>setParentOpen(true)},'Open parent'),
        React.createElement('dialog',{ref:parent},React.createElement('button',{onClick:()=>setOpen(true)},'Open nested'),
          React.createElement(FlightMobilePickerShell,{open,withinDialog:true,title:'Nested dates',titleId:'nested-title',onClose:()=>setOpen(false)},
            React.createElement('button',null,'Nested date'))));}
    createRoot(document.getElementById('root')).render(React.createElement(Fixture));
  `, async page => {
    await page.getByRole("button", { name: "Open parent", exact: true }).click();
    await page.getByRole("button", { name: "Open nested", exact: true }).click();
    await page.getByRole("button", { name: "Nested date", exact: true }).waitFor();
    assert.equal(await page.locator("dialog:modal").count(), 1);
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    await page.getByRole("button", { name: "Nested date", exact: true }).press("Escape");
    await page.getByRole("button", { name: "Nested date", exact: true }).waitFor({ state: "hidden" });
    assert.equal(await page.locator("dialog:modal").count(), 1, "nested dismissal must not dismiss parent");
  }, 375);
});
