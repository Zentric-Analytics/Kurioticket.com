import assert from "node:assert/strict";
import test from "node:test";
import { automationSignal, botAccess, botTarget, observeBot } from "./botPolicy";
import { trustedBotEdge } from "./botEdge";
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

test("only the authenticated edge can supply a correlatable Ray ID and automation observation", (t) => {
  const previous = process.env.BOT_EDGE_SECRET;
  const secret = "fixture".repeat(5);
  process.env.BOT_EDGE_SECRET = secret;
  t.after(() => {
    if (previous === undefined) delete process.env.BOT_EDGE_SECRET;
    else process.env.BOT_EDGE_SECRET = previous;
  });
  const headers = {
    "CF-Ray": "1234567890abcdef-LHR", "CF-Connecting-IP": "192.0.2.1",
    "CF-IPCountry": "GB", "X-Kurioticket-Edge-Bot": "automated",
  };
  assert.equal(trustedBotEdge(request("/", "Mozilla/5.0", "GET", headers)), null);
  assert.deepEqual(trustedBotEdge(request("/", "Mozilla/5.0", "GET", { ...headers, "X-Kurioticket-Edge-Auth": secret })), {
    ray: "1234567890abcdef", ip: "192.0.2.1", country: "GB", automated: true,
    networkAsn: null, networkOrganization: null,
  });
});

test("authenticated original network evidence is collected for every catalog category and unknown bots without changing policy", async (t) => {
  const previous = process.env.BOT_EDGE_SECRET;
  const secret = "fixture".repeat(5);
  process.env.BOT_EDGE_SECRET = secret;
  t.after(() => {
    if (previous === undefined) delete process.env.BOT_EDGE_SECRET;
    else process.env.BOT_EDGE_SECRET = previous;
  });
  const headers = {
    "X-Kurioticket-Edge-Auth": secret, "X-Kurioticket-Edge-Version": "1",
    "X-Kurioticket-Edge-IP": "192.0.2.1", "X-Kurioticket-Edge-Country": "GB",
    "X-Kurioticket-Edge-Ray": "1234567890abcdef-LHR", "X-Kurioticket-Edge-ASN": "64512",
    "X-Kurioticket-Edge-Organization": encodeURIComponent("Example Network"),
    "CF-Connecting-IP": "2a06:98c0:3600::103", "CF-IPCountry": "US",
  };
  // Search-engine DNS verification is covered independently; no external
  // DNS calls are needed to check the network evidence handoff.
  for (const entry of Object.values(crawlerCatalog).filter(entry => entry.category !== "search")) {
    const req = request("/", entry.agent, "GET", headers);
    const bot = await observeBot(req, automationSignal(req)!);
    assert.equal(bot.group, "OTHER_RECOGNIZED");
    assert.equal(bot.ip, "192.0.2.1");
    assert.equal(bot.country, "GB");
    assert.equal(bot.edgeRay, "1234567890abcdef");
    assert.equal(bot.networkAsn, "64512");
    assert.equal(bot.networkOrganization, "Example Network");
    assert.equal(bot.networkSource, "AUTHENTICATED_EDGE");
    assert.equal(botAccess(bot, botTarget(req)), null);
    assert.equal(botAccess(bot, botTarget(request("/api/flights/search", entry.agent, "POST"))), "SEARCH_NOT_ALLOWED");
  }
  for (const agent of ["MJ12bot", "python-requests/2.0"]) {
    const req = request("/robots.txt", agent, "GET", headers);
    const bot = await observeBot(req, automationSignal(req)!);
    assert.equal(bot.group, "UNKNOWN");
    assert.equal(bot.access, "BLOCKED");
    assert.equal(botAccess(bot, botTarget(req)), "UNAPPROVED_BOT");
    assert.equal(bot.ip, "192.0.2.1");
    assert.equal(bot.networkAsn, "64512");
    assert.equal(bot.networkOrganization, "Example Network");
    assert.equal(bot.userAgent, agent === "MJ12bot" ? "MJ12BOT" : null);
  }
  assert.equal(trustedBotEdge(request("/", "MJ12bot", "GET", { ...headers, "X-Kurioticket-Edge-Auth": "forged" })), null);
  assert.equal(trustedBotEdge(request("/", "MJ12bot", "GET", { ...headers, "X-Kurioticket-Edge-Version": "2" })), null);
  const incomplete = trustedBotEdge(request("/", "MJ12bot", "GET", { ...headers,
    "X-Kurioticket-Edge-IP": "", "X-Kurioticket-Edge-Country": "XX",
    "X-Kurioticket-Edge-ASN": "4294967296", "X-Kurioticket-Edge-Organization": "%00invalid",
  }));
  assert.equal(incomplete?.ip, null, "Never fall back to rewritten proxy IP");
  assert.equal(incomplete?.country, null);
  assert.equal(incomplete?.networkAsn, null);
  assert.equal(incomplete?.networkOrganization, null);
  assert.equal(automationSignal(request("/", "Mozilla/5.0 Chrome/133.0", "GET", headers)), null);
});

test("trusted edge detects browser-equivalent automation without relying on User-Agent", async (t) => {
  const previous = process.env.BOT_EDGE_SECRET;
  const secret = "fixture".repeat(5);
  process.env.BOT_EDGE_SECRET = secret;
  t.after(() => {
    if (previous === undefined) delete process.env.BOT_EDGE_SECRET;
    else process.env.BOT_EDGE_SECRET = previous;
  });
  const agent = "Mozilla/5.0 Chrome/133.0";
  const headers = {
    "X-Kurioticket-Edge-Auth": secret,
    "X-Kurioticket-Edge-Version": "1",
    "X-Kurioticket-Edge-IP": "192.0.2.42",
    "X-Kurioticket-Edge-Country": "GB",
    "X-Kurioticket-Edge-Ray": "1234567890abcdef",
    "X-Kurioticket-Edge-Bot": "automated",
  };
  for (const [path, method] of [["/", "GET"], ["/api/flights/search", "POST"]]) {
    const req = request(path, agent, method, headers);
    const signal = automationSignal(req);
    assert.ok(signal);
    assert.equal(signal.declared, null);
    const bot = await observeBot(req, signal);
    assert.equal(bot.group, "UNKNOWN");
    assert.equal(bot.access, "BLOCKED");
    assert.equal(bot.identityKey, "UNKNOWN:UNATTRIBUTED");
    assert.equal(bot.evidence, "TRUSTED_EDGE_AUTOMATION");
    assert.equal(bot.ip, "192.0.2.42");
    assert.equal(bot.country, "GB");
    assert.equal(botAccess(bot, botTarget(req)), "UNAPPROVED_BOT");
  }
  assert.equal(automationSignal(request("/", agent, "GET", { ...headers, "X-Kurioticket-Edge-Auth": "forged" })), null);
  for (const userAgent of [agent, "okhttp/4.12", "KurioticketPreview/33 CFNetwork"]) {
    const ordinary = request("/", userAgent, "GET", { ...headers, "X-Kurioticket-Edge-Bot": "" });
    assert.equal(automationSignal(ordinary), null);
  }
});
