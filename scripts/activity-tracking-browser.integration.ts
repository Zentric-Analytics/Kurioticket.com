import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import bcrypt from "bcryptjs";
import { chromium, devices, type BrowserContext, type Page } from "@playwright/test";
import { getPrisma } from "../src/lib/prisma";
import { createSearchJourneyService } from "../src/services/searchJourneyService";

// Start a local Kurioticket instance with the same freshly migrated disposable DB.
// Give that instance ACTIVITY_QA_ADMIN from this run in ADMIN_EMAILS.
const app = new URL(process.env.ACTIVITY_QA_URL || "http://invalid");
const database = new URL(process.env.DATABASE_URL || "http://invalid");
const adminEmail = process.env.ACTIVITY_QA_ADMIN || "";
assert.equal(app.protocol, "http:");
assert.equal(app.hostname, "127.0.0.1");
assert.equal(app.pathname, "/");
assert.equal(database.protocol, "postgresql:");
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.pathname, "/kurioticket_activity_qa");
assert.match(adminEmail, /^activity-qa-[a-z0-9-]+@example\.test$/);

const db = getPrisma();
const pageViewPath = "/api/activity/page-views";
const interactionsPath = "/api/activity/interactions";
const visitorPath = "/api/identity/visitor";
const mergePath = "/api/identity/merge";

async function recordedPage(eventId: string) {
  return db.analyticsEvent.findMany({ where: { type: "PAGE_VIEW", metadata: { path: ["eventId"], equals: eventId } } });
}

async function postActivity(page: Page, path: string, body: object, proof?: string) {
  return page.evaluate(async input => {
    const response = await fetch(input.path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(input.proof ? { "X-Kt-Analytics-Context": input.proof } : {}) },
      body: JSON.stringify(input.body),
    });
    return { status: response.status, body: await response.json() };
  }, { path, body, proof });
}

async function signIn(context: BrowserContext, email: string, password: string) {
  const csrfResponse = await context.request.get("/api/auth/csrf");
  assert.ok(csrfResponse.ok());
  const { csrfToken } = await csrfResponse.json();
  assert.equal(typeof csrfToken, "string");
  const response = await context.request.post("/api/auth/callback/credentials", {
    form: { csrfToken, email, password, callbackUrl: app.href, json: "true" },
  });
  assert.ok(response.ok());
  const sessionResponse = await context.request.get("/api/auth/session");
  assert.ok(sessionResponse.ok());
  const session = await sessionResponse.json();
  assert.equal(session.user?.email, email);
}

function consentPanel(page: Page) {
  return page.locator("[data-cookie-consent-preferences]");
}

async function disableAnalytics(page: Page) {
  const banner = page.locator("[data-cookie-consent-banner]");
  const settings = await banner.isVisible() ? banner.getByRole("button", { name: "Cookie preferences", exact: true })
    : page.getByRole("button", { name: "Cookie preferences", exact: true }).last();
  await settings.click();
  const analytics = consentPanel(page).getByRole("switch", { name: "Analytics cookies" });
  if (await analytics.getAttribute("aria-checked") === "true") await analytics.click();
  await consentPanel(page).getByRole("button", { name: "Save preferences", exact: true }).click();
}

type VisitPayload = { eventId: string; pageKey: string; previousPageKey?: string };

function eventPayload(request: { url(): string; method(): string; postDataJSON(): unknown }): VisitPayload | null {
  if (new URL(request.url()).pathname !== pageViewPath || request.method() !== "POST") return null;
  return request.postDataJSON() as VisitPayload;
}

test("customer page delivery, actor, idempotency, and Admin history in a running application", { timeout: 300_000 }, async () => {
  const password = `${randomUUID()}Aa1!`;
  const admin = await db.user.create({ data: {
    email: adminEmail, role: "ADMIN", name: "Activity QA Admin", emailVerified: new Date(), onboardedAt: new Date(),
    passwordHash: await bcrypt.hash(password, 10),
  } });
  const browser = await chromium.launch({ executablePath: process.env.ACTIVITY_QA_CHROMIUM });
  try {
    const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL: app.href });
    context.setDefaultTimeout(60_000);
    // Keep browser traffic local and avoid the image optimizer's external fetches.
    await context.route(url => url.origin !== app.origin || url.pathname === "/_next/image", route => route.abort());
    await signIn(context, adminEmail, password);
    const page = await context.newPage();
    const observed: VisitPayload[] = [];
    page.on("request", request => { const payload = eventPayload(request); if (payload) observed.push(payload); });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const packageSubmission = { action: "package_search_submitted", mode: "hotel-flight", eventId: randomUUID() };
    const beforeConsent = await postActivity(page, interactionsPath, packageSubmission);
    assert.equal(beforeConsent.status, 202);
    assert.equal(beforeConsent.body.accepted, false);
    const banner = page.locator("[data-cookie-consent-banner]");
    await banner.getByRole("button", { name: "Cookie preferences", exact: true }).click();
    assert.equal(await consentPanel(page).getByRole("switch", { name: "Analytics cookies" }).getAttribute("aria-checked"), "true");
    assert.equal(observed.length, 0, "an unsaved suggestion did not send a page observation");
    await consentPanel(page).getByRole("button", { name: "Close cookie preferences", exact: true }).click();
    const [registered, merged, home] = await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === visitorPath && response.request().method() === "POST"),
      page.waitForResponse(response => new URL(response.url()).pathname === mergePath && response.request().method() === "POST"),
      page.waitForResponse(response => eventPayload(response.request())?.pageKey === "home"),
      banner.getByRole("button", { name: "Accept all", exact: true }).click(),
    ]);
    assert.equal((await registered.json()).analyticsTracking, "enabled");
    assert.equal((await merged.json()).merged, true);
    assert.equal(home.status(), 202);
    const homePayload = eventPayload(home.request())!;
    const homeRows = await recordedPage(homePayload.eventId);
    assert.equal(homeRows.length, 1);
    assert.equal(homeRows[0].userId, admin.id);
    const actorVisitor = homeRows[0].visitorId;
    assert.ok(actorVisitor);
    const proof = await home.request().headerValue("x-kt-analytics-context");
    assert.ok(proof, "the actual page request uses server-confirmed actor context");
    assert.equal((await postActivity(page, pageViewPath, homePayload, proof)).body.accepted, true);

    const packageRows = () => db.analyticsEvent.findMany({ where: {
      name: packageSubmission.action, metadata: { path: ["eventId"], equals: packageSubmission.eventId },
    } });
    assert.equal((await packageRows()).length, 0);
    const packageResponses = await Promise.all([
      postActivity(page, interactionsPath, packageSubmission, proof), postActivity(page, interactionsPath, packageSubmission, proof),
    ]);
    assert.ok(packageResponses.every(response => response.status === 202 && response.body.accepted === true));
    const submitted = await packageRows();
    assert.equal(submitted.length, 1);
    const [packageRow] = submitted;
    assert.equal(packageRow.userId, admin.id);
    assert.equal(packageRow.visitorId, actorVisitor);
    assert.equal(packageRow.type, "SEARCH");
    assert.equal((packageRow.metadata as { product?: string } | null)?.product, "PACKAGE");

    const share = { action: "share_link_copied", product: "FLIGHT", resultId: "synthetic-flight-offer",
      eventId: randomUUID(), requestId: randomUUID() };
    const initialShare = await postActivity(page, interactionsPath, share, proof);
    assert.equal(initialShare.status, 202);
    assert.deepEqual(initialShare.body, { accepted: true, retryable: true });
    const { recordSearchHistory } = createSearchJourneyService(() => db);
    const search = await recordSearchHistory({
      userId: admin.id, visitorId: actorVisitor, requestId: share.requestId, type: "FLIGHT",
      query: { environment: "production" }, resultCount: 1, latencyMs: 1, status: "SUCCESS",
    });
    assert.ok(search);
    const enrichedShare = await postActivity(page, interactionsPath, share, proof);
    assert.deepEqual(enrichedShare.body, { accepted: true });
    const shareRows = await db.analyticsEvent.findMany({ where: {
      name: share.action, metadata: { path: ["eventId"], equals: share.eventId },
    } });
    assert.equal(shareRows.length, 1);
    assert.equal((shareRows[0].metadata as { linkedSearchHistoryId?: string } | null)?.linkedSearchHistoryId, search.id);

    let failed: VisitPayload | undefined;
    await page.route(`**${pageViewPath}`, route => {
      const payload = eventPayload(route.request());
      if (!failed && payload?.pageKey === "hotels") {
        failed = payload;
        return route.fulfill({ status: 503, contentType: "application/json", body: '{"accepted":false}' });
      }
      return route.continue();
    });
    const hotelsResponse = page.waitForResponse(response => eventPayload(response.request())?.pageKey === "hotels");
    const retryResponse = page.waitForResponse(response => {
      const payload = eventPayload(response.request());
      return Boolean(failed && payload?.eventId === failed.eventId && response.status() !== 503);
    }, { timeout: 75_000 });
    const [firstAttempt, retry] = await Promise.all([
      hotelsResponse, retryResponse, page.locator('a[href="/hotels"]').filter({ visible: true }).first().click(),
    ]);
    assert.equal(firstAttempt.status(), 503);
    assert.ok(failed);
    await page.waitForURL("**/hotels");
    assert.equal(retry.status(), 202);
    assert.equal(failed.previousPageKey, "home");
    assert.equal((await recordedPage(failed.eventId)).length, 1);

    const replay = await Promise.all([postActivity(page, pageViewPath, failed, proof), postActivity(page, pageViewPath, failed, proof)]);
    assert.ok(replay.every(item => item.body.accepted === true));
    assert.equal((await recordedPage(failed.eventId)).length, 1);

    const historyPath = `/admin/users/user/${admin.id}/pages?range=all`;
    const viewer = await context.newPage();
    const adminPageRequests: VisitPayload[] = [];
    viewer.on("request", request => { const payload = eventPayload(request); if (payload) adminPageRequests.push(payload); });
    assert.equal((await viewer.goto(historyPath, { waitUntil: "domcontentloaded" }))?.status(), 200);
    await viewer.getByRole("heading", { name: "Pages Visited History" }).waitFor();
    const history = viewer.getByRole("region", { name: "Full pages visited history" });
    await history.getByText("Hotels", { exact: true }).first().waitFor();
    await viewer.goto(`/admin/users/user/${admin.id}/activity/all?range=all&product=PACKAGE&interface=customer`, { waitUntil: "domcontentloaded" });
    await viewer.getByText("Package search submitted", { exact: true }).first().waitFor();
    assert.equal(adminPageRequests.length, 0, "Admin history navigation did not emit a customer page observation");

    const withdrawal = page.waitForResponse(response => new URL(response.url()).pathname === visitorPath && response.request().method() === "DELETE");
    await page.bringToFront();
    await disableAnalytics(page);
    assert.equal((await (await withdrawal).json()).analyticsTracking, "disabled");
    assert.equal((await postActivity(page, interactionsPath, { ...packageSubmission, eventId: randomUUID() }, proof)).body.accepted, false);
    const beforeNavigation = observed.length;
    await page.goto("/faq", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Cookie preferences", exact: true }).first().waitFor();
    await delay(750);
    assert.equal(observed.length, beforeNavigation, "withdrawal stopped the next page observation");
    assert.equal((await recordedPage(failed.eventId)).length, 1, "the stored observation was retained");
    await viewer.goto(historyPath, { waitUntil: "domcontentloaded" });
    await viewer.getByText("No recorded page visits", { exact: false }).first().waitFor();
  } finally {
    await browser.close();
    await db.$disconnect();
  }
});

test("mobile web guest page capture observes explicit consent, refusal, and reported platform", { timeout: 150_000 }, async () => {
  const browser = await chromium.launch({ executablePath: process.env.ACTIVITY_QA_CHROMIUM });
  try {
    const guest = await browser.newContext({ ...devices["Pixel 7"], baseURL: app.href });
    await guest.route(url => url.origin !== app.origin || url.pathname === "/_next/image", route => route.abort());
    const page = await guest.newPage();
    await page.goto("/faq", { waitUntil: "domcontentloaded" });
    const declinedEvent = { eventId: randomUUID(), pageKey: "faq" };
    await page.locator("[data-cookie-consent-banner]").waitFor();
    await disableAnalytics(page);
    assert.equal((await postActivity(page, pageViewPath, declinedEvent)).body.accepted, false);
    assert.equal((await recordedPage(declinedEvent.eventId)).length, 0);

    await page.getByRole("button", { name: "Cookie preferences", exact: true }).last().click();
    const analytics = consentPanel(page).getByRole("switch", { name: "Analytics cookies" });
    assert.equal(await analytics.getAttribute("aria-checked"), "false");
    await analytics.click();
    const [consent, visit] = await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === visitorPath && response.request().method() === "POST"),
      page.waitForResponse(response => eventPayload(response.request())?.pageKey === "faq"),
      consentPanel(page).getByRole("button", { name: "Save preferences", exact: true }).click(),
    ]);
    assert.equal((await consent.json()).analyticsTracking, "enabled");
    assert.equal(visit.status(), 202);
    const rows = await recordedPage(eventPayload(visit.request())!.eventId);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].userId, null);
    assert.ok(rows[0].visitorId);
    const metadata = rows[0].metadata as { originalIdentity?: string; platform?: string } | null;
    assert.equal(metadata?.platform, "Mobile web (reported)");
    assert.equal(metadata?.originalIdentity, "guest");
  } finally {
    await browser.close();
    await db.$disconnect();
  }
});
