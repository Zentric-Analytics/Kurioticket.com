import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "./route";

test("empty-test flag reaches every upstream search and empty responses survive the API route", async (t) => {
  const settings = {
    KAYAK_SANDBOX_ENABLED: "true", KAYAK_SANDBOX_API_KEY: "test-credential",
    NEXT_PUBLIC_APP_URL: "https://staging.kurioticket.com", NODE_ENV: "test",
  };
  const saved = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  const paths: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    if (url.pathname === "/api/4.0/constants-mapping") return Response.json({facility:{features:[]}});
    paths.push(url.pathname);
    assert.equal(new Headers(init.headers).get("sandbox-api-empty"), "true");
    return Response.json({status:"complete",isComplete:true,currency:"USD",priceMode:"total",results:[]});
  });
  try {
    for (const vertical of ["flights", "hotels", "cars"]) {
      const response = await POST(new NextRequest("https://staging.kurioticket.com/api/sandbox/kayak", {
        method:"POST", headers:{"content-type":"application/json",origin:"https://staging.kurioticket.com","x-forwarded-for":"192.0.2.60"},
        body:JSON.stringify({vertical,origin:"BOS",destination:vertical === "hotels" ? "kplace:58075" : "JFK",
          departure:"2099-10-20",returnDate:"2099-10-24",adults:1,empty:true}),
      }));
      assert.equal(response.status,200);
      assert.deepEqual(await response.json(),{results:[],sandbox:true,status:"empty"});
    }
    assert.deepEqual(paths,["/i/api/affiliate/search/flight/v1/poll","/api/3.0/hotels","/i/api/affiliate/search/car/v1/poll"]);
  } finally {
    for (const [key,value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("sandbox route enforces environment, validation, origin, session continuity and redaction", async (t) => {
  const names = [
    "KAYAK_SANDBOX_ENABLED",
    "KAYAK_SANDBOX_API_KEY",
    "NEXT_PUBLIC_APP_URL",
    "NODE_ENV",
    "KAYAK_LOCAL_TEST_CLIENT_IP",
  ];
  const saved = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  Object.assign(process.env, {
    KAYAK_SANDBOX_ENABLED: "true",
    KAYAK_SANDBOX_API_KEY: "test-credential",
    NEXT_PUBLIC_APP_URL: "https://staging.kurioticket.com",
    NODE_ENV: "test",
  });
  delete process.env.KAYAK_LOCAL_TEST_CLIENT_IP;
  const body = {
    vertical: "flights",
    origin: "BOS",
    destination: "JFK",
    departure: "2099-10-12",
    adults: 1,
  };
  const req = (payload: unknown, headers: Record<string, string> = {}) =>
    new NextRequest("https://staging.kurioticket.com/api/sandbox/kayak", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "192.0.2.10",
        origin: "https://staging.kurioticket.com",
        ...headers,
      },
      body: JSON.stringify(payload),
    });
  const tracks: string[] = [];
  const upstream = t.mock.method(globalThis, "fetch", async (url: URL) => {
    tracks.push(url.searchParams.get("userTrackId")!);
    return Response.json({
      status: "complete",
      currency: "USD",
      priceMode: "perPerson",
      results: [],
    });
  });
  try {
    process.env.NEXT_PUBLIC_APP_URL = "https://kurioticket.com";
    assert.equal((await POST(req(body))).status, 404);
    process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
    assert.equal(
      (await POST(req(body, { origin: "https://evil.test" }))).status,
      403,
    );
    assert.equal((await POST(req({ ...body, origin: "bad" }))).status, 400);
    assert.equal((await POST(req(null))).status, 400);
    assert.equal((await POST(req({ large: "x".repeat(5000) }))).status, 413);
    assert.equal((await POST(req(body, { origin: "" }))).status, 403);
    assert.equal(tracks.length, 0);
    const first = await POST(req(body));
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("cache-control"), "no-store");
    const cookie = first.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=strict/i);
    assert.match(cookie, /Secure/i);
    const next = await POST(req(body, { cookie: cookie.split(";")[0] }));
    assert.equal(next.status, 200);
    assert.equal(tracks[0], tracks[1]);
    assert.ok(!JSON.stringify(await next.json()).includes("test-credential"));
    const regular = await POST(req({ action: "regular-search", vertical: "flights", criteria: {
      origin: "BOS", destination: "JFK", departureDate: "2099-10-12", tripType: "one-way", currency: "JPY",
    } }));
    assert.equal(regular.status, 200);
    assert.deepEqual((await regular.json()).results, []);
    const unsupported = await POST(req({ action: "regular-search", vertical: "flights", criteria: {
      origin: "BOS", destination: "JFK", departureDate: "2099-10-12", tripType: "one-way", cabinClass: "business",
    } }));
    assert.equal(unsupported.status, 422);
    upstream.mock.mockImplementation(async () => {
      throw new Error("apiKey=test-credential");
    });
    const failure = await POST(req(body));
    assert.equal(failure.status, 502);
    assert.match(failure.headers.get("set-cookie")!, /kayak-sandbox-session=/);
    assert.ok(!(await failure.text()).includes("test-credential"));
  } finally {
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
});
