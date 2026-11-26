import assert from "node:assert/strict";
import test from "node:test";
import { automationSignal, botAccess, botTarget, observeBot } from "./botPolicy";
import { crawlerCatalog } from "./botRegistry";

const request = (path: string, agent: string, method = "GET", headers = {}) =>
  new Request("https://kurioticket.com" + path, { method, headers: { "User-Agent": agent, ...headers } });

test("all seven search engines have one policy and declared claims cannot reach search", async () => {
  const search = Object.entries(crawlerCatalog).filter(([, entry]) => entry.category === "search");
  assert.equal(search.length, 7);
  for (const [name, entry] of search) {
    const req = request("/api/flights/search", entry.agent, "POST", {
      "X-Forwarded-For": "66.249.66.1", "CF-Connecting-IP": "66.249.66.1",
      "Authorization": "Bearer invalid", "X-Mobile-Platform": "ios",
      "Cookie": "__Secure-next-auth.session-token=forged",
    });
    const bot = await observeBot(req, automationSignal(req)!);
    assert.equal(bot.group, "UNKNOWN");
    assert.equal(botAccess(bot, botTarget(req)), "UNAPPROVED_BOT");
    const verified = { ...bot, group: "SEARCH_ENGINE", name };
    for (const product of ["flights", "hotels", "cars", "packages"]) {
      assert.equal(botAccess(verified, botTarget(request("/api/" + product + "/search", entry.agent, "POST"))), null);
    }
    assert.equal(botAccess(verified, botTarget(request("/guides/city-guide", entry.agent))), null);
  }
});

test("other recognized bots can read approved pages only", async () => {
  for (const agent of ["PerplexityBot", "GPTBot", "Meta-ExternalAgent", "GoogleOther", "AhrefsBot", "ia_archiver"]) {
    const req = request("/flights/results", agent);
    const bot = await observeBot(req, automationSignal(req)!);
    assert.equal(bot.group, "OTHER_RECOGNIZED");
    assert.equal(botAccess(bot, botTarget(req)), null);
    for (const path of ["/admin", "/account", "/api/account/profile", "/flights/details", "/packages/journey/hotel", "/_next/image?url=%2Fapi%2Faccount%2Fprofile"]) {
      assert.equal(botAccess(bot, botTarget(request(path, agent))), "PATH_NOT_ALLOWED", path);
    }
    for (const path of ["/api/flights/search", "/api/flights/nearby-fare", "/api/mobile/v1/hotels/progressive",
      "/api/deals/v2/flights/inventory", "/api/flights/destination-prices"]) {
      assert.equal(botAccess(bot, botTarget(request(path, agent, "POST"))), "SEARCH_NOT_ALLOWED", path);
    }
  }
});

test("browser and native clients without cookies and consent keep their identity flow", () => {
  for (const agent of ["", "Mozilla/5.0 Mobile Safari/604.1", "Mozilla/5.0 Chrome/133.0", "okhttp/4.12", "KurioticketPreview/33 CFNetwork"]) {
    assert.equal(automationSignal(request("/", agent, "GET", { "x-kurioticket-edge-bot": "automated" })), null);
  }
});

test("activity paths do not retain query strings or arbitrary request parameters", () => {
  assert.equal(botTarget(request("/api/account/security/passkeys/private-id?token=secret", "GPTBot")).endpoint, "/api/:restricted");
  assert.equal(botTarget(request("/guides/private-slug?token=secret", "GPTBot")).endpoint, "/guides/:slug");
  assert.equal(botTarget(request("/images/private-path.jpg?token=secret", "GPTBot")).endpoint, "/images/:resource");
});
