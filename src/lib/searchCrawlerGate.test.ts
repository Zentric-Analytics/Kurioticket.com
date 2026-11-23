import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import type { VerifiedSearchCrawler } from "./verifiedSearchCrawler";

type Identity = { name: string; evidence: "VERIFIED_DNS" | "DECLARED_USER_AGENT" };
function identification(verified: VerifiedSearchCrawler | null) {
  const checked: Request[] = [];
  const exported: {
    identifySearchCrawler: (request: Request) => Promise<Identity | null>;
    declaredSearchCrawler: (userAgent: string | null) => string | null;
    searchCrawlerMetadata: (identity: Identity | null) => Record<string, string>;
  } = {} as never;
  const compiled = ts.transpileModule(readFileSync(new URL("./searchCrawlerGate.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(compiled, {
    exports: exported, require: (key: string) => {
      assert.equal(key, "@/lib/verifiedSearchCrawler");
      return { verifySearchCrawler: async (request: Request) => {
        checked.push(request);
        return verified;
      } };
    },
  });
  return { ...exported, checked };
}
function botRequest(agent: string, extra: Record<string, string> = {}) {
  return new Request("https://staging.kurioticket.com/api/flights/search", {
    method: "POST", headers: { "user-agent": agent, ...extra },
  });
}

test("Googlebot and Bingbot preserve DNS verification, without blocking execution", async () => {
  for (const name of ["GOOGLEBOT", "BINGBOT"] as const) {
    const f = identification(name);
    const request = botRequest(name === "GOOGLEBOT" ? "Googlebot/2.1" : "bingbot/2.0");
    const observed = await f.identifySearchCrawler(request);
    assert.deepEqual(JSON.parse(JSON.stringify(observed)), { name, evidence: "VERIFIED_DNS" });
    assert.deepEqual(f.checked, [request]);
    assert.deepEqual(JSON.parse(JSON.stringify(f.searchCrawlerMetadata(observed))), {
      identifiedCrawler: name, crawlerEvidence: "VERIFIED_DNS", verifiedCrawler: name,
    });
  }
});

test("Perplexity, Meta, GoogleOther and other declared crawlers are Bots without pretending DNS proof", async () => {
  const agents: Array<[string, string]> = [
    ["PerplexityBot/1.0", "PERPLEXITYBOT"],
    ["Perplexity-User/1.0", "PERPLEXITY_USER"],
    ["meta-webindexer/1.1", "META_WEBINDEXER"],
    ["Meta-ExternalAgent/1.1", "META_EXTERNALAGENT"],
    ["Meta-ExternalFetcher/1.0", "META_EXTERNALFETCHER"],
    ["facebookexternalhit/1.1", "FACEBOOKEXTERNALHIT"],
    ["GoogleOther", "GOOGLEOTHER"],
    ["GPTBot/1.0", "GPTBOT"],
    ["ChatGPT-User/1.0", "CHATGPT_USER"],
    ["ClaudeBot/1.0", "CLAUDEBOT"],
    ["Claude-User", "CLAUDE_USER"],
    ["Applebot/0.1", "APPLEBOT"],
    ["DuckDuckBot/1.0", "DUCKDUCKBOT"],
    ["Twitterbot", "TWITTERBOT"],
    ["OtherCrawler/3.2", "OTHERCRAWLER"],
    ["AnotherSpider/1.0", "ANOTHERSPIDER"],
  ];
  const f = identification(null);
  for (const [agent, name] of agents) {
    const observed = await f.identifySearchCrawler(botRequest(agent));
    assert.deepEqual(JSON.parse(JSON.stringify(observed)), { name, evidence: "DECLARED_USER_AGENT" }, agent);
    assert.deepEqual(JSON.parse(JSON.stringify(f.searchCrawlerMetadata(observed))), {
      identifiedCrawler: name, crawlerEvidence: "DECLARED_USER_AGENT",
    }, agent);
  }
  assert.equal(f.checked.length, agents.length);
});

test("real web and native clients never become Bots from unknown or incidental headers", async () => {
  const f = identification(null);
  for (const agent of [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130",
    "KurioticketPreview/62 CFNetwork/3896.100.1.2.1 Darwin/27.0.0",
    "okhttp/4.12.0",
  ]) assert.equal(await f.identifySearchCrawler(botRequest(agent)), null);
  for (const headers of [
    { authorization: "Bearer customer", "user-agent": "PerplexityBot/1.0" },
    { "x-mobile-platform": "android", "user-agent": "Googlebot/2.1" },
    { cookie: "authjs.session-token=signed-customer-session", "user-agent": "meta-webindexer/1.1" },
    { cookie: "__Secure-next-auth.session-token=signed-customer-session", "user-agent": "GoogleOther" },
  ]) assert.equal(await f.identifySearchCrawler(botRequest(headers["user-agent"], headers)), null);
  assert.deepEqual(f.checked, []);
  assert.equal(f.declaredSearchCrawler("Mozilla/5.0 Chrome/130"), null);
  assert.equal(f.declaredSearchCrawler("x".repeat(2049)), null);
  assert.deepEqual(JSON.parse(JSON.stringify(f.searchCrawlerMetadata(null))), {});
});
