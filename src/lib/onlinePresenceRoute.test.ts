import assert from "node:assert/strict";
import test, {beforeEach,afterEach} from "node:test";
import { createHmac } from "node:crypto";
import { isWebsiteOnlinePresenceRoute } from "./onlinePresence";
import { createOnlinePresenceHandler, type OnlinePresenceHeartbeat } from "./onlinePresenceRoute";
import { hasConsistentWebsitePresenceOrigin, renewPresenceCredential } from "./onlinePresenceCredential";

const now = new Date("2026-11-18T12:00:00Z");
const secret = "qa-only-operational-presence-signing-material";
const automationSecret = "qa-only-trusted-edge-automation-signing-material";
const tokenHeader = "x-kt-presence-session";
const webPath = "/api/identity/online-presence";
const nativePath = "/api/mobile/v1/presence";
const origin = "https://kurioticket.example";
let savedPublicUrl:string|undefined,savedAuthUrl:string|undefined;
beforeEach(()=>{savedPublicUrl=process.env.NEXT_PUBLIC_APP_URL;savedAuthUrl=process.env.NEXTAUTH_URL;process.env.NEXT_PUBLIC_APP_URL=origin;process.env.NEXTAUTH_URL=origin;});
afterEach(()=>{if(savedPublicUrl===undefined)delete process.env.NEXT_PUBLIC_APP_URL;else process.env.NEXT_PUBLIC_APP_URL=savedPublicUrl;if(savedAuthUrl===undefined)delete process.env.NEXTAUTH_URL;else process.env.NEXTAUTH_URL=savedAuthUrl;});

function fixture() {
  const records: OnlinePresenceHeartbeat[] = [];
  const handler = (transport: "web" | "native", environment: "staging" | "production" = "production") =>
    createOnlinePresenceHandler(transport, {
      environment: () => environment,
      secret: () => secret,
      automationSecret: () => automationSecret,
      now: () => now,
      authenticate: async () => ({ id: "canonical-session", platform: transport === "native" ? "ios" : null }),
      admit: () => true,
      record: async (record) => { records.push(record); },
    });
  return { handler, records };
}

function web(headers: HeadersInit = {}, path = webPath) {
  return new Request(origin + path, { method: "POST", headers: { origin, "sec-fetch-site": "same-origin", ...headers } });
}

function native(headers: HeadersInit = {}) {
  return new Request(origin + nativePath, { method: "POST", headers: { "x-mobile-platform": "android", ...headers } });
}

test("a guest uses a memory-only signed web credential independently of optional analytics consent", async () => {
  const { handler, records } = fixture();
  const post = handler("web");
  const first = await post(web({ cookie: "kt_analytics_consent=declined", "sec-ch-ua-mobile": "?1" }));
  assert.equal(first.status, 202);
  assert.equal(records.length, 0);
  assert.equal((await post(web())).status, 202);
  assert.equal(records.length, 0, "an unreturned credential cannot contribute a guest");
  assert.equal(first.headers.get("set-cookie"), null, "presence must not create a new browser cookie");
  assert.match(first.headers.get("cache-control") ?? "", /no-store/);
  const credential = first.headers.get(tokenHeader);
  assert.ok(credential);
  assert.equal((await post(web({ [tokenHeader]: credential, "sec-ch-ua-mobile": "?1" }))).status, 204);
  const second = await post(web({ [tokenHeader]: credential, cookie: "__Secure-next-auth.session-token.0=jwt" }));
  assert.equal(second.status, 204);
  assert.equal(second.headers.get("set-cookie"), null);
  assert.equal(records[0].platform, "mobile_web");
  assert.equal(records[0].sourceId, records[1].sourceId);
  assert.deepEqual(records.map(record => record.accountSessionId), [null, "canonical-session"]);
  assert.equal(records[0].device, undefined, "anonymous activity never acquires a device identity");
  assert.equal(records[1].device?.deviceLabel, "Desktop device");
  assert.equal(records[1].device?.locationLabel, null);

});

test("staging preview observes only verified guest access, never production or authenticated access", async () => {
  const prior = process.env.GUEST_FIRST_ACCESS_PREVIEW;
  const edge = process.env.RENDER;
  try {
    process.env.GUEST_FIRST_ACCESS_PREVIEW = "true";
    process.env.RENDER = "true";
    const { handler, records } = fixture();
    const post = handler("web", "staging");
    const headers = {cookie:"kt_analytics_consent=declined","cf-ipcountry":"NG",
      "user-agent":"Mozilla/5.0 (Windows NT 10.0) Chrome/140.0.0.0"};
    const first = await post(web(headers));
    assert.equal(first.status,202);
    assert.equal(records.length,0);
    const token = first.headers.get(tokenHeader);
    assert.ok(token);
    const response = await post(web({...headers,[tokenHeader]:token}));
    assert.equal(response.status,204);
    assert.equal(response.headers.get("set-cookie"),null);
    assert.deepEqual(records[0].guestAccess,{countryCode:null,deviceLabel:"Windows computer",browser:"Chrome 140",os:"Windows"});
    await post(web({[tokenHeader]:token,cookie:"__Secure-next-auth.session-token.0=jwt"}));
    assert.equal(records[1].guestAccess,undefined);
    const production = handler("web","production");
    const prodToken = (await production(web(headers))).headers.get(tokenHeader);
    assert.ok(prodToken);
    await production(web({...headers,[tokenHeader]:prodToken}));
    assert.equal(records[2].guestAccess,undefined);
  } finally {
    if (prior === undefined) delete process.env.GUEST_FIRST_ACCESS_PREVIEW;
    else process.env.GUEST_FIRST_ACCESS_PREVIEW = prior;
    if (edge === undefined) delete process.env.RENDER; else process.env.RENDER = edge;
  }
});

test("native guest credentials are transport and environment bound and transition to verified account sessions", async () => {
  const { handler, records } = fixture();
  const post = handler("native");
  const first = await post(native());
  assert.equal(first.status, 202);
  const token = first.headers.get(tokenHeader);
  assert.ok(token);
  assert.equal(records.length, 0);
  assert.equal(first.headers.get("set-cookie"), null);
  assert.equal((await post(native({ [tokenHeader]: token }))).status, 204);
  assert.equal((await post(native({ [tokenHeader]: token, authorization: "Bearer valid" }))).status, 204);
  const staging = handler("native", "staging");
  const staged = await staging(native({ [tokenHeader]: token }));
  assert.equal(staged.status, 202);
  const stagingToken = staged.headers.get(tokenHeader);
  assert.ok(stagingToken);
  assert.equal((await staging(native({ [tokenHeader]: stagingToken }))).status, 204);
  const website = handler("web");
  const issued = await website(web({ [tokenHeader]: token }));
  assert.equal(issued.status, 202);
  const webCredential = issued.headers.get(tokenHeader);
  assert.ok(webCredential);
  assert.equal(issued.headers.get("set-cookie"), null);
  assert.equal((await website(web({ [tokenHeader]: webCredential }))).status, 204);
  assert.equal(records[0].platform, "android");
  assert.equal(records[1].platform, "ios");
  assert.equal(records[0].sourceId, records[1].sourceId);
  assert.equal(records[1].accountSessionId, "canonical-session");
  assert.equal(new Set(records.map(record => record.sourceId)).size, 3);
});

test("a temporary credential renews the source before expiration and cannot be tampered with or replayed after expiry", () => {
  const input = { environment: "production", transport: "web", secret } as const;
  const first = renewPresenceCredential(null, { ...input, now: now.getTime() });
  const renewal = renewPresenceCredential(first.token, { ...input, now: now.getTime() + 26 * 60_000 });
  assert.equal(renewal.sourceId, first.sourceId);
  assert.notEqual(renewal.token, first.token);
  const expired = renewPresenceCredential(first.token, { ...input, now: now.getTime() + 30 * 60_000 });
  assert.notEqual(expired.sourceId, first.sourceId);
  const tampered = renewPresenceCredential(first.token.slice(0, -2) + "AB", { ...input, now: now.getTime() });
  assert.notEqual(tampered.sourceId, first.sourceId);
});

test("transport guards reject cross-site web requests and native requests with browser metadata", async () => {
  const { handler, records } = fixture();
  assert.equal((await handler("web")(web({ origin: "https://foreign.example" }))).status, 403);
  assert.equal((await handler("web")(web({ "sec-fetch-site": "cross-site" }))).status, 403);
  assert.equal((await handler("native")(native({ origin }))).status, 403);
  assert.equal((await handler("native")(native({ "x-mobile-platform": "web" }))).status, 403);
  assert.equal(records.length, 0);
});

test("only authenticated ingress automation evidence suppresses an otherwise eligible heartbeat", async () => {
  const { handler, records } = fixture();
  const stamp = String(now.getTime());
  const sign = (timestamp: string) =>
    timestamp + "." + createHmac("sha256", automationSecret).update(["verified-automation-v1", "production", webPath, timestamp].join("\n")).digest("base64url");
  const post = handler("web");
  const verified = await post(web({ "x-kt-verified-automation": sign(stamp) }));
  assert.equal(verified.status, 204);
  assert.equal(verified.headers.get(tokenHeader), null);
  assert.equal(verified.headers.get("set-cookie"), null);
  assert.equal(records.length, 0);
  const token = (await post(web())).headers.get(tokenHeader);
  assert.ok(token);
  const untrusted = await post(web({ [tokenHeader]: token, "user-agent": "Googlebot", "cf-verified-bot": "true", "x-kt-verified-automation": stamp + ".spoofer" }));
  assert.equal(untrusted.status, 204);
  await post(web({ [tokenHeader]: token, "x-kt-verified-automation": sign(String(now.getTime() - 61_000)) }));
  assert.equal(records.length, 2);
});

test("invalid authorization is not counted as a guest and storage failures never return success", async () => {
  const never = () => { throw new Error("must not run"); };
  const failures: string[] = [];
  const deps = { environment: () => "production" as const, now: () => now, secret: () => secret,
    automationSecret: () => undefined, admit: () => true, authenticate: async () => null, record: async () => {},
    onFailure: (environment: string) => failures.push(environment) };
  const invalid = createOnlinePresenceHandler("native", { ...deps, record: never });
  assert.equal((await invalid(native({ authorization: "Bearer invalid" }))).status, 401);
  const invalidWeb = createOnlinePresenceHandler("web", { ...deps, record: never });
  assert.equal((await invalidWeb(web({ cookie: "next-auth.session-token=expired" }))).status, 401);
  const down = createOnlinePresenceHandler("native", { ...deps, record: never });
  const credential = (await down(native())).headers.get(tokenHeader);
  assert.ok(credential);
  const unavailable = await down(native({ [tokenHeader]: credential }));
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get(tokenHeader), null);
  const limited = createOnlinePresenceHandler("native", { ...deps, admit: () => false, record: never });
  assert.equal((await limited(native())).status, 429);

  const disabled = createOnlinePresenceHandler("web", { ...deps, enabled: () => false, record: never });
  const disabledResponse = await disabled(web());
  assert.equal(disabledResponse.status, 503);
  assert.equal(disabledResponse.headers.get(tokenHeader), null);
  assert.deepEqual(failures, ["production"], "expected rejections do not signal an outage");
});

test("signed-in administrators contribute web presence; blocked admin guests never do", () => {
  for (const path of ["/", "/flights", "/hotels", "/cars", "/admin-guide"]) {
    assert.equal(isWebsiteOnlinePresenceRoute(path, false), true);
    assert.equal(isWebsiteOnlinePresenceRoute(path, true), true);
  }
  for (const path of ["/admin", "/admin/users", "/admin/platforms/devices", "/admin/platform-health"]) {
    assert.equal(isWebsiteOnlinePresenceRoute(path, false), false);
    assert.equal(isWebsiteOnlinePresenceRoute(path, true), true);
  }
  for (const path of ["/api", "/api/admin", "/mobile", "/mobile/legal", null]) {
    assert.equal(isWebsiteOnlinePresenceRoute(path, true), false);
    assert.equal(isWebsiteOnlinePresenceRoute(path, false), false);
  }
});

test("website monitoring detects invalid or conflicting public origins", () => {
  assert.equal(hasConsistentWebsitePresenceOrigin(), true);
  assert.equal(hasConsistentWebsitePresenceOrigin(undefined, "http://localhost:3000"), true);
  assert.equal(hasConsistentWebsitePresenceOrigin("https://staging.kurioticket.com/", "https://staging.kurioticket.com"), true);
  assert.equal(hasConsistentWebsitePresenceOrigin("https://kurioticket.com", "https://staging.kurioticket.com"), false);
  assert.equal(hasConsistentWebsitePresenceOrigin("https://name@kurioticket.com", undefined), false);
  assert.equal(hasConsistentWebsitePresenceOrigin("not a URL", undefined), false);
  assert.equal(hasConsistentWebsitePresenceOrigin("http://staging.kurioticket.com", "http://staging.kurioticket.com",
    "https://staging.kurioticket.com"), false);
});

test("independent live-country capture requires an authenticated edge and returned presence credential on all transports",async()=>{
  const keys=["GUEST_FIRST_ACCESS_PREVIEW","GUEST_LIVE_COUNTRY_ENABLED","BOT_EDGE_SECRET","RENDER"] as const;
  const before=keys.map(key=>process.env[key]);
  try {
    delete process.env.GUEST_FIRST_ACCESS_PREVIEW;
    process.env.GUEST_LIVE_COUNTRY_ENABLED="true";
    process.env.BOT_EDGE_SECRET="qa-only-country-edge-assertion-material";
    process.env.RENDER="true";
    const {handler,records}=fixture();
    for(const platform of ["desktop_web","mobile_web","ios","android"] as const){
      const isNative=platform==="ios"||platform==="android";
      const post=handler(isNative?"native":"web","staging");
      const send=(headers:Record<string,string>)=>post(isNative?native({"x-mobile-platform":platform,...headers}):web({"sec-ch-ua-mobile":platform==="mobile_web"?"?1":"?0",cookie:"kt_analytics_consent=declined",...headers}));
      const edge={"cf-ipcountry":"NG","cf-ipcity":"Lagos","cf-connecting-ip":"203.0.113.10","x-kurioticket-edge-auth":process.env.BOT_EDGE_SECRET!};
      const count=records.length;
      const first=await send(edge);
      assert.equal(first.status,202);
      assert.equal(records.length,count);
      const token=first.headers.get(tokenHeader);
      assert.ok(token);
      const response=await send({...edge,[tokenHeader]:token});
      assert.equal(response.status,204);
      assert.equal(response.headers.get("set-cookie"),null);
      assert.equal(records.at(-1)?.platform,platform);
      assert.equal(records.at(-1)?.guestLiveCountryCode,"NG");
      assert.equal(records.at(-1)?.guestAccess,undefined);
      assert.doesNotMatch(JSON.stringify(records.at(-1)),/Lagos|203\.0\.113|qa-only-country-edge/);
      await send({"cf-ipcountry":"NG",[tokenHeader]:token});
      assert.equal(records.at(-1)?.guestLiveCountryCode,null);
      await send({...edge,"cf-ipcountry":"XX",[tokenHeader]:token});
      assert.equal(records.at(-1)?.guestLiveCountryCode,null);
      const signedIn=isNative?{authorization:"Bearer valid"}:{cookie:"next-auth.session-token=jwt"};
      await send({...edge,...signedIn,[tokenHeader]:token});
      assert.equal(records.at(-1)?.accountSessionId,"canonical-session");
      assert.equal(records.at(-1)?.guestLiveCountryCode,undefined);
    }
    const prod=handler("web","production");
    const token=(await prod(web())).headers.get(tokenHeader)!;
    await prod(web({[tokenHeader]:token,"cf-ipcountry":"NG","x-kurioticket-edge-auth":process.env.BOT_EDGE_SECRET!}));
    assert.equal(records.at(-1)?.guestLiveCountryCode,undefined);
    delete process.env.GUEST_LIVE_COUNTRY_ENABLED;
    const disabled=handler("web","staging");
    const disabledToken=(await disabled(web())).headers.get(tokenHeader)!;
    await disabled(web({[tokenHeader]:disabledToken,"cf-ipcountry":"NG","x-kurioticket-edge-auth":process.env.BOT_EDGE_SECRET!}));
    assert.equal(records.at(-1)?.guestLiveCountryCode,undefined);
  } finally {keys.forEach((key,index)=>{if(before[index]===undefined)delete process.env[key];else process.env[key]=before[index];});}
});
