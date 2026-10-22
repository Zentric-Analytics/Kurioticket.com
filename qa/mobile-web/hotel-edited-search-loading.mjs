import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
const base = process.env.HOTEL_PREVIEW_URL || 'http://localhost:3004';
for (const engine of [chromium, webkit]) {
 const browser = await engine.launch();
 let release;
 try {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  let requested;
  const requestStarted = new Promise(resolve => { requested = resolve; });
  const responseGate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/hotels/destinations?*', route => route.fulfill({ json: { suggestions: [{ id: 'place:france', name: 'France', searchValue: 'France', country: 'France', countryCode: 'FR', region: '', kind: 'city' }] } }));
  await page.route('**/api/hotels/search', async route => {
   if (route.request().postDataJSON().destination === 'France') {
    requested();
    await responseGate;
   }
   await route.continue();
  });
  await page.goto(`${base}/hotels/results?destination=New%20York&checkIn=2030-10-01&checkOut=2030-10-08&guests=1&rooms=1&sort=cheapest`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByRole('heading', { name: 'Pod Times Square', exact: true }).first().waitFor({ timeout: 90000 });
  await page.locator('[data-hotel-mobile-sticky-search] button').click();
  // Submitting the current search must keep its valid cards visible.
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('dialog', { name: 'Edit hotel search', exact: true }).waitFor({ state: 'hidden' });
  assert.equal(await page.getByRole('heading', { name: 'Finding the best stays for you', exact: true }).isVisible(), false);
  assert.equal(await page.getByRole('heading', { name: 'Pod Times Square', exact: true }).first().isVisible(), true);
  await page.locator('[data-hotel-mobile-sticky-search] button').click();
  await page.locator('[data-hotel-mobile-edit-row="destination"] button').click();
  await page.getByRole('combobox', { name: 'City, area, or landmark', exact: true }).fill('France');
  await page.getByRole('option').filter({ hasText: 'France' }).first().click();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('heading', { name: 'Finding the best stays for you', exact: true }).waitFor();
  await requestStarted;
  assert.equal(await page.getByRole('heading', { name: 'Pod Times Square', exact: true }).count(), 0, 'Old destination cards must be removed during the new request');
  assert.equal(await page.locator('a[href*="/hotels/details/"]').count(), 0);
  const response = page.waitForResponse(r => r.url().includes('/api/hotels/search') && r.request().postDataJSON()?.destination === 'France');
  release();
  assert.equal((await response).status(), 200);
  await page.locator('a[href*="/hotels/details/"]').first().waitFor({ timeout: 90000 });
  await page.getByRole('heading', { name: 'Finding the best stays for you', exact: true }).waitFor({ state: 'hidden' });
  assert.equal(new URL(page.url()).searchParams.get('destination'), 'France');
  assert.equal(await page.getByRole('heading', { name: 'Pod Times Square', exact: true }).count(), 0);
  console.log(`${engine.name()}: edited search shows branded loading until new results arrive, without stale cards`);
 } finally {
  release?.();
  await browser.close();
 }
}
