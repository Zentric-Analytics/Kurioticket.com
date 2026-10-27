import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.ADMIN_ACTIVITY_QA_URL;
const output = process.env.ADMIN_ACTIVITY_QA_OUTPUT;
await mkdir(output, {recursive: true});
const browser = await chromium.launch({headless:true,args:["--no-sandbox"]});
const context = await browser.newContext({viewport:{width:1280,height:900}, permissions:["clipboard-read","clipboard-write"]});
const page = await context.newPage();
page.setDefaultTimeout(25000);
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
const url=base+"/admin/users/guest/qa-guest-activity-0001/activity";

try {
  for (const width of [1536,390]) {
    await page.setViewportSize({width,height:900});
    await page.goto(base+"/before");
    await expect(page.getByTestId("fixture-label")).toContainText("synthetic activity");
    await page.screenshot({path:output+"/before-view-activity-"+width+".png",fullPage:true});
  }

  for(const width of [1536,1280,1024,768,390,320]) {
    await page.setViewportSize({width,height:900});
    await page.goto(url);
    await expect(page.getByRole("heading",{name:"Visitor",exact:true})).toBeVisible();
    await expect(page.getByRole("heading",{name:"Activity history"})).toBeVisible();
    await expect(page.getByRole("heading",{name:"Activity summary"})).toBeVisible();
    await expect(page.getByRole("heading",{name:"Related records"})).toBeVisible();
    await expect(page.getByRole("button",{name:"Manage guest qa-guest-activity-0001"})).toBeVisible();
    await expect(page.getByRole("button",{name:"Apply Filter"})).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Date range: All dates"})).toBeVisible();
    await expect(page.getByRole("button",{name:"Activity product: All products"})).toBeVisible();
    await expect(page.getByRole("button",{name:"Activity type: All activity types"})).toBeVisible();
    await expect(page.getByRole("button",{name:/Sort activity/})).toHaveCount(0);
    await expect(page.getByRole("textbox",{name:"Search activity"})).toBeVisible();
    await expect(page.getByRole("button",{name:"Show all"})).toBeVisible();
    const widths=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    assert.ok(widths.document <= widths.viewport+1, "No horizontal drift "+JSON.stringify(widths));
    if([1536,1280,390,320].includes(width))
      await page.screenshot({path:output+"/after-view-activity-"+width+".png",fullPage:true});
    console.log("PASS responsive activity page",width);
  }

  await page.setViewportSize({width:1280,height:900});
  await page.goto(url+"?directory=sort%3Dname_asc%26identity%3DGUEST%26page%3D2");
  const show=page.getByRole("button",{name:"Show all"}).first();
  await show.click();
  await expect(page.getByRole("button",{name:"Hide all"})).toBeVisible();
  for(const stamp of ["5:59","5:58","5:57","5:56"]) await expect(page.getByRole("main")).toContainText(stamp);
  await page.screenshot({path:output+"/after-expanded-selections-1280.png",fullPage:true});
  await page.getByRole("button",{name:"Hide all"}).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button",{name:"Show all"})).toBeVisible();
  const back=await page.getByRole("link",{name:"Users",exact:true}).last().getAttribute("href");
  assert.ok(back.includes("sort=name_asc") && back.includes("identity=GUEST") && back.includes("page=2"));
  await page.getByRole("button",{name:/Copy guest ID:/}).click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),"qa-guest-activity-0001");
  console.log("PASS disclosure and identity");

  await page.goto(url);
  await page.getByRole("navigation",{name:"Activity tabs"}).getByRole("link",{name:"Searches",exact:true}).click();
  await expect(page).toHaveURL(/tab=searches/);
  const search=page.getByRole("textbox",{name:"Search activity"});
  await search.fill("LOS");
  await expect(page).toHaveURL(/q=LOS/);
  await page.getByRole("button",{name:/Activity product:/}).click();
  await page.getByRole("listbox",{name:"Activity product"}).getByRole("option",{name:"Flights"}).click();
  await expect(page).toHaveURL(/product=FLIGHT/);
  await page.getByRole("button",{name:/Activity type:/}).click();
  await page.getByRole("listbox",{name:"Activity type"}).getByRole("option",{name:"Search completed"}).click();
  await expect(page).toHaveURL(/stage=SEARCH_COMPLETED/);
  await expect(page.getByRole("button",{name:"Clear filters"})).toHaveCount(0);
  await page.screenshot({path:output+"/after-filtered-activity-1280.png",fullPage:true});
  await page.getByRole("button",{name:/Activity product:/}).click();
  await page.getByRole("listbox",{name:"Activity product"}).getByRole("option",{name:"All products"}).click();
  await expect(page).not.toHaveURL(/product=FLIGHT/);
  await page.getByRole("button",{name:/Date range:/}).click();
  await page.getByRole("listbox",{name:"Date range"}).getByRole("option",{name:"Custom range"}).click();
  await expect(page.getByLabel("Custom start date UTC")).toBeVisible();
  await expect(page.getByLabel("Custom end date UTC")).toBeVisible();
  console.log("PASS immediate URL filters");

  await page.goto(url+"?order=oldest");
  await expect(page).toHaveURL(/order=oldest/);
  await page.getByRole("link",{name:"Load newer activity"}).click();
  await expect(page).toHaveURL(/cursor=/);
  console.log("PASS sort and paging");

  await page.goto(base+"/admin/users/guest/qa-no-events-0001/activity");
  await expect(page.getByText("No activity matches your filters")).toBeVisible();
  await page.screenshot({path:output+"/after-approved-empty-state-1536.png",fullPage:true});
  await page.goto(url+"?cursor=bad");
  await expect(page.getByText("Activity page link expired")).toBeVisible();
  await expect(page.getByRole("link",{name:"Return to newest activity"})).toBeVisible();
  console.log("PASS empty and invalid cursor");

  await page.goto(base+"/admin/users/user/qa-registered-0001/activity");
  await expect(page.getByRole("heading",{name:"QA registered customer"})).toBeVisible();
  await expect(page.getByText("customer.qa@example.invalid",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Related records"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Manage account for customer.qa@example.invalid"})).toBeVisible();
  await page.screenshot({path:output+"/after-registered-activity-1280.png",fullPage:true});
  assert.deepEqual(errors,[],"No browser exceptions");
  console.log("PASS registered identity and browser errors");
} finally {
  await browser.close();
}
