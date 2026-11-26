import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const base=process.env.ADMIN_ACTIVITY_QA_URL,output=process.env.ADMIN_ACTIVITY_QA_OUTPUT;
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  for(const width of [1536,1280,1024,390,320]){
    await page.setViewportSize({width,height:900});
    await page.goto(base+"/admin/users/online");
    const rows=page.getByTestId("online-user-row");
    await expect(rows).toHaveCount(3);
    const guest=rows.filter({hasText:"Desktop web"});
    const noDetails=rows.filter({hasText:"iOS app"});
    await expect(guest.getByTestId("online-user-location")).toHaveText("Nigeria");
    await expect(noDetails.getByTestId("online-user-location")).toHaveText("Unavailable");
    await expect(rows.filter({hasText:"Android app"})).toHaveCount(0);
    const guestHref=await guest.getByRole("link",{name:"View Activity"}).getAttribute("href");
    const otherHref=await noDetails.getByRole("link",{name:"View Activity"}).getAttribute("href");
    assert.notEqual(guestHref,otherHref);
    assert.match(guestHref,/\/guest\/[A-Za-z0-9_-]{43}$/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:output+"/online-users-"+width+".png",fullPage:true});
    await guest.getByRole("link",{name:"View Activity"}).click();
    await expect(page.getByRole("heading",{name:"Guest activity · Live access"})).toBeVisible();
    await expect(page.getByText("Nigeria",{exact:true})).toBeVisible();
    await expect(page.getByText("Windows computer",{exact:true})).toBeVisible();
    await expect(page.getByText("First verified access",{exact:true})).toBeVisible();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:output+"/live-guest-activity-"+width+".png",fullPage:true});
    await page.getByRole("link",{name:"Back to Online Users"}).click();
    await page.goto(base+otherHref);
    await expect(page.getByText("Not recorded",{exact:true})).toBeVisible();
    await page.goto(base+"/admin/users/online/guest/"+"Z".repeat(43));
    await expect(page.getByText("This live guest session is no longer available or cannot be verified.")).toBeVisible();
  }
  assert.deepEqual(errors,[]);
  console.log("PASS online roster, verified guest location, missing preview, scoped links and responsive layout");
} finally { await browser.close(); }
