import assert from "node:assert/strict";
import test from "node:test";
import { automationSignal, botAccess, botTarget, observeBot } from "./botPolicy";
import { trustedBotEdge, trustedBotIngress, trustedRenderWorkspaceIngress } from "./botEdge";
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
    assert.equal(bot.group, "SEARCH_ENGINE");
    assert.equal(bot.access, "CRAWL_ONLY");
    assert.equal(botAccess(bot, botTarget(request("/", entry.agent))), null);
    assert.equal(botAccess(bot, botTarget(req)), "SEARCH_NOT_ALLOWED");
    const verified = { ...bot, access: "CRAWL_AND_LIMITED_SEARCH", name };
    for (const product of ["flights", "hotels", "cars", "packages"]) {
      assert.equal(botAccess(verified, botTarget(request("/api/" + product + "/search", entry.agent, "POST"))), null);
    }
    assert.equal(botAccess(verified, botTarget(request("/guides/city-guide", entry.agent))), null);
  }
});

test("other recognized bots can read approved pages only", async () => {
  for (const agent of ["MJ12bot", "OAI-SearchBot", "AASA-Bot", "PerplexityBot", "GPTBot", "Meta-ExternalAgent", "GoogleOther", "AhrefsBot", "ia_archiver"]) {
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
  t.mock.method(globalThis, "fetch", async () => Response.json({ prefixes: [{ ipv4Prefix: "192.0.2.0/24" }] }));
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
    if (entry.agent === "GPTBot") {
      assert.equal(bot.verification, "VERIFIED");
      assert.equal(bot.evidence, "OFFICIAL_CRAWLER_NETWORK");
      assert.equal(bot.access, "CRAWL_ONLY");
    }
    assert.equal(bot.ip, "192.0.2.1");
    assert.equal(bot.country, "GB");
    assert.equal(bot.edgeRay, "1234567890abcdef");
    assert.equal(bot.networkAsn, "64512");
    assert.equal(bot.networkOrganization, "Example Network");
    assert.equal(bot.networkSource, "AUTHENTICATED_EDGE");
    assert.equal(botAccess(bot, botTarget(req)), null);
    assert.equal(botAccess(bot, botTarget(request("/api/flights/search", entry.agent, "POST"))), "SEARCH_NOT_ALLOWED");
  }
  for (const agent of ["NovelSpider", "python-requests/2.0"]) {
    const req = request("/robots.txt", agent, "GET", headers);
    const bot = await observeBot(req, automationSignal(req)!);
    assert.equal(bot.group, "UNKNOWN");
    assert.equal(bot.access, "BLOCKED");
    assert.equal(botAccess(bot, botTarget(req)), "UNAPPROVED_BOT");
    assert.equal(bot.ip, "192.0.2.1");
    assert.equal(bot.networkAsn, "64512");
    assert.equal(bot.networkOrganization, "Example Network");
    assert.equal(bot.userAgent, agent === "NovelSpider" ? "NOVELSPIDER" : null);
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
  const empty = request("/", "NovelSpider", "GET", {
    "X-Kurioticket-Edge-Auth": secret, "X-Kurioticket-Edge-Version": "1",
  });
  const emptyObservation = await observeBot(empty, automationSignal(empty)!);
  assert.equal(emptyObservation.networkSource, null);
  assert.equal(emptyObservation.evidence, "USER_AGENT");
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

test("explicit staging workspace trust enables genuine crawler search eligibility without changing quotas or unknown/other-bot policy", async t => {
  const config = {
    RENDER: "true",
    RENDER_SERVICE_ID: "srv-dabmo50jo6nc73881d60",
    TRAVEL_PROVIDER_MODE: "staging",
    NEXT_PUBLIC_APP_URL: "https://staging.kurioticket.com",
    NEXTAUTH_URL: "https://staging.kurioticket.com",
    BOT_TRUST_RENDER_WORKSPACE_INGRESS: "false",
    GUEST_LIVE_RENDER_INGRESS_VERIFIED: "true",
    BOT_REQUIRE_EDGE: "false",
    BOT_EDGE_SECRET: "fixture".repeat(5),
  };
  const prior = Object.fromEntries(Object.keys(config).map(key => [key, process.env[key]]));
  Object.assign(process.env, config);
  t.after(() => {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const req = (agent: string, extra: Record<string, string> = {}, path = "/api/flights/search", url = "https://staging.kurioticket.com") =>
    new Request(url + path, {
      method: "POST",
      headers: { "User-Agent": agent, "CF-Connecting-IP": "52.167.144.161", "CF-IPCountry": "US", "Rndr-Id": "render-request-fixture", ...extra },
    });
  const bing = req("Bingbot");
  assert.equal(trustedBotIngress(bing), null, "Reporting approval cannot enable search");
  let observed = await observeBot(bing, automationSignal(bing)!);
  assert.equal(botAccess(observed, botTarget(bing)), "SEARCH_NOT_ALLOWED");
  // Test the explicitly accepted workspace boundary. These headers are not
  // an independent proof of public ingress; private workloads must be trusted.
  process.env.BOT_TRUST_RENDER_WORKSPACE_INGRESS = "true";
  assert.equal(trustedRenderWorkspaceIngress(bing)?.source, "RENDER_TRUSTED_WORKSPACE");
  assert.equal(trustedBotEdge(bing), null);
  t.mock.method(globalThis, "fetch", async () => Response.json({ prefixes: [{ ipv4Prefix: "52.167.144.0/24" }] }));
  observed = await observeBot(bing, automationSignal(bing)!);
  assert.equal(observed.verification, "VERIFIED");
  assert.equal(observed.identityKey, "SEARCH_ENGINE:BINGBOT");
  assert.equal(observed.networkSource, "RENDER_TRUSTED_WORKSPACE");
  assert.equal(observed.ip, "52.167.144.161");
  for (const product of ["flights", "hotels", "cars", "packages"]) {
    assert.equal(botAccess(observed, botTarget(req("Bingbot", {}, "/api/" + product + "/search"))), null);
  }
  assert.equal(botAccess(observed, botTarget(req("Bingbot", {}, "/api/flights/nearby-fare"))), "SEARCH_NOT_ALLOWED");
  const other = req("GPTBot");
  assert.equal(botAccess(await observeBot(other, automationSignal(other)!), botTarget(other)), "SEARCH_NOT_ALLOWED");
  const unknown = req("NovelSpider");
  assert.equal(botAccess(await observeBot(unknown, automationSignal(unknown)!), botTarget(unknown)), "UNAPPROVED_BOT");
  assert.equal(automationSignal(req("Mozilla/5.0 Chrome/130")), null);
  const invalidHeaders: Record<string, string>[] = [
    { "CF-Connecting-IP": "10.0.0.1" },
    { "CF-Connecting-IP": "2a06:98c0:3600:0:0:0:0:103" },
    { "CF-Connecting-IP": "52.167.144.161, 8.8.8.8" },
    { "CF-Connecting-IP": "52.167.144.161:443" },
    { "CF-Connecting-IP": "", "X-Forwarded-For": "52.167.144.161" },
    { "CF-Worker": "example.com" },
    { "Rndr-Id": "" },
    { "X-Kurioticket-Edge-Auth": "forged" },
  ];
  for (const headers of invalidHeaders) assert.equal(trustedBotIngress(req("Bingbot", headers)), null);
  assert.equal(trustedBotIngress(req("Bingbot", {}, "/", "http://internal-service")), null);
  assert.equal(trustedBotIngress(req("Bingbot", {}, "/", "https://kurioticket.com")), null);
  for (const [key, value] of [
    ["RENDER", "false"], ["RENDER_SERVICE_ID", "another-service"],
    ["TRAVEL_PROVIDER_MODE", "production"], ["NEXTAUTH_URL", "https://kurioticket.com"],
    ["BOT_REQUIRE_EDGE", "true"], ["BOT_TRUST_RENDER_WORKSPACE_INGRESS", "false"],
  ]) {
    const original = process.env[key];
    process.env[key] = value;
    assert.equal(trustedRenderWorkspaceIngress(bing), null, key);
    process.env[key] = original;
  }
  const signed = req("Bingbot", {
    "X-Kurioticket-Edge-Auth": config.BOT_EDGE_SECRET,
    "X-Kurioticket-Edge-Version": "1",
    "X-Kurioticket-Edge-IP": "66.249.66.9",
  });
  assert.equal(trustedBotIngress(signed)?.source, "AUTHENTICATED_EDGE");
  assert.equal(trustedBotIngress(signed)?.ip, "66.249.66.9");
});
