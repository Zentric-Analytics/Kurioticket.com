import test from "node:test";
import assert from "node:assert/strict";
import {
  KayakError,
  KayakSandboxClient,
  isKayakSandboxEnabled,
  kayakSearchSchema,
  normalizeSandboxOffers,
  sandboxBookingUrl,
} from "./kayakSandbox";

const click = "https://affiliates.kayak.com/sandbox-clickout";

test("hotel guest scores preserve the provider rating without inventing unrated scores", () => {
  for (const guestRating of [8.6, 0, 10, -1, 11, NaN, Infinity, "8.6", undefined]) {
    const [offer] = normalizeSandboxOffers("hotels", {currencyCode:"USD",results:[{
      name:"Hotel",guestRating,numberOfReviews:3118,starRating:4,
      rates:[{totalRate:100,bookUri:click}],
    }]});
    const valid = typeof guestRating === "number" && Number.isFinite(guestRating) && guestRating >= 0 && guestRating <= 10;
    assert.equal(offer.hotelReviewScore, valid ? guestRating : undefined);
    assert.equal(offer.hotelReviewCount,3118);
    assert.equal(offer.hotelStars,4);
  }
});

test("hotel search retrieves official amenity names and survives dictionary failure", async () => {
  for (const unavailable of [false,true]) {
    let dictionaryRequests = 0;
    const client = new KayakSandboxClient("key", (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/4.0/constants-mapping") {
        dictionaryRequests++;
        assert.equal(url.searchParams.get("types"),"facility");
        return unavailable ? new Response("",{status:503}) : Response.json({facility:{features:[{id:3,name:"Conference facilities"}]}});
      }
      return Response.json({isComplete:true,currencyCode:"USD",results:[{name:"Hotel",features:[3,99],rates:[{roomName:"Room",totalRate:100,bookUri:click}]}]});
    }) as typeof fetch);
    const offers = await client.search({vertical:"hotels",destination:"kplace:58075",departure:"2099-10-12",returnDate:"2099-10-15",adults:1},"test");
    assert.equal(dictionaryRequests,1);
    assert.deepEqual(offers[0].amenities,unavailable ? [] : ["Conference facilities"]);
    assert.match(offers[0].attributes?.find(a=>a.label === "Amenity information")?.value || "",/descriptions unavailable/);
    assert.equal(offers[0].price,100);
  }
});
const flight = {
  vertical: "flights" as const,
  origin: "BOS",
  destination: "JFK",
  departure: "2099-10-12",
  adults: 1,
};
const response = {
  status: "complete",
  currency: "USD",
  priceMode: "perPerson",
  results: [
    {
      id: "one",
      bookingOptions: [
        {
          type: "regular",
          displayPrice: { price: 125 },
          bookingUrl: click,
          providerCode: "TEST",
        },
      ],
    },
  ],
};
const fake = (
  fn: (url: URL, init: RequestInit) => Response | Promise<Response>,
) =>
  (async (url, init) => fn(new URL(String(url)), init || {})) as typeof fetch;

test("sandbox is disabled by default and on production even with a key", () => {
  assert.equal(isKayakSandboxEnabled({}), false);
  assert.equal(
    isKayakSandboxEnabled({
      KAYAK_SANDBOX_ENABLED: "true",
      KAYAK_SANDBOX_API_KEY: "test",
      NEXT_PUBLIC_APP_URL: "https://kurioticket.com",
      NODE_ENV: "production",
    }),
    false,
  );
  assert.equal(
    isKayakSandboxEnabled({
      KAYAK_SANDBOX_ENABLED: "true",
      KAYAK_SANDBOX_API_KEY: "test",
      NEXT_PUBLIC_APP_URL: "https://staging.kurioticket.com",
      NODE_ENV: "production",
    }),
    true,
  );
});
test("validation rejects bad airports, past dates, reverse dates and identical airports", () => {
  for (const patch of [
    { origin: "bad" },
    { departure: "2000-01-01" },
    { returnDate: "2099-10-11" },
    { destination: "BOS" },
  ])
    assert.equal(
      kayakSearchSchema.safeParse({ ...flight, ...patch }).success,
      false,
    );
  assert.equal(kayakSearchSchema.safeParse(flight).success, true);
});
test("only verified sandbox click destinations survive normalization", () => {
  assert.equal(sandboxBookingUrl(click), click);
  for (const url of [
    "https://evil.test/in",
    "javascript:alert(1)",
    "https://affiliates.kayak.com/sandbox-clickout?next=https://evil.test",
    "https://sandbox-en-us.kayakaffiliates.com/in?apiKey=secret",
    "https://user:secret@sandbox-en-us.kayakaffiliates.com/in",
  ])
    assert.equal(sandboxBookingUrl(url), null);
});
test("polling preserves search id, cluster and user identity until complete", async () => {
  const calls: { url: URL; init: RequestInit }[] = [];
  const client = new KayakSandboxClient(
    "secret",
    fake((url, init) => {
      calls.push({ url, init });
      return Response.json(
        calls.length === 1
          ? { status: "first-phase", searchId: "search-one", cluster: "4" }
          : response,
      );
    }),
    async () => {},
  );
  assert.equal((await client.search(flight, "session-one")).length, 1);
  assert.equal(calls.length, 2);
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
    searchId: "search-one",
  });
  assert.equal(calls[1].url.searchParams.get("cluster"), "4");
  assert.ok(
    calls.every(
      (call) => call.url.searchParams.get("userTrackId") === "session-one",
    ),
  );
  assert.ok(
    calls.every(
      (call) =>
        call.init.redirect === "error" && call.init.cache === "no-store",
    ),
  );
});
test("errors never expose request credentials or upstream response bodies", async () => {
  for (const status of [400, 401, 403, 429, 500]) {
    const c = new KayakSandboxClient(
      "very-secret",
      fake(() => new Response("very-secret", { status })),
    );
    await assert.rejects(
      c.search(flight, "session"),
      (error) =>
        error instanceof KayakError && !error.message.includes("very-secret"),
    );
  }
  const c = new KayakSandboxClient(
    "very-secret",
    fake(() => {
      throw new Error("https://example.test/?apiKey=very-secret");
    }),
  );
  await assert.rejects(
    c.search(flight, "session"),
    (error) =>
      error instanceof KayakError && !error.message.includes("very-secret"),
  );
});
test("polling is bounded and rejects malformed search state", async () => {
  let count = 0;
  const c = new KayakSandboxClient(
    "key",
    fake(() => {
      count++;
      return Response.json({
        status: "second-phase",
        searchId: "id",
        cluster: "4",
      });
    }),
    async () => {},
  );
  await assert.rejects(c.search(flight, "session"), { code: "timeout" });
  assert.equal(count, 12);
  await assert.rejects(
    new KayakSandboxClient(
      "key",
      fake(() => Response.json({ status: "unknown" })),
    ).search(flight, "session"),
    { code: "invalid_response" },
  );
});
test("empty results stay empty and do not fall back to fabricated offers", async () => {
  const c = new KayakSandboxClient(
    "key",
    fake((_url, init) => {
      assert.equal(new Headers(init.headers).get("sandbox-api-empty"), "true");
      return Response.json({ ...response, results: [] });
    }),
  );
  assert.deepEqual(await c.search(flight, "session", undefined, true), []);
});
test("cancellation stops polling before another provider call", async () => {
  const controller = new AbortController();
  controller.abort();
  const c = new KayakSandboxClient(
    "key",
    fake(() => {
      assert.fail("Must not call provider");
    }),
  );
  await assert.rejects(c.search(flight, "session", controller.signal), {
    code: "timeout",
  });
});
test("hotel and car requests map dates and guests without inventing inventory", async () => {
  const c = new KayakSandboxClient(
    "key",
    fake((url, init) => {
      if (url.pathname === "/api/4.0/constants-mapping") {
        return Response.json({facility:{features:[{id:3,name:"Conference facilities"}]}});
      }
      if (url.pathname === "/api/3.0/hotels") {
        assert.equal(url.searchParams.get("rooms"), "2");
        return Response.json({
          isComplete: true,
          currencyCode: "USD",
          results: [
            {
              name: "Test hotel",
              features: [3],
              rates: [
                { roomName: "Test room", totalRate: 300, bookUri: click },
              ],
            },
          ],
        });
      }
      assert.equal(
        JSON.parse(String(init.body)).searchStartParameters.pickup.location
          .value,
        "BOS",
      );
      return Response.json({
        status: "complete",
        currency: "USD",
        priceMode: "total",
        results: [
          {
            id: "car",
            bookingOptions: [
              {
                car: { brand: "Test car" },
                price: { price: 90 },
                bookingUrl: click,
              },
            ],
          },
        ],
      });
    }),
  );
  assert.equal(
    (
      await c.search(
        {
          vertical: "hotels",
          destination: "kplace:58075",
          departure: "2099-10-12",
          returnDate: "2099-10-15",
          adults: 2,
        },
        "session",
      )
    )[0].priceBasis,
    "total stay",
  );
  assert.equal(
    (
      await c.search(
        {
          vertical: "cars",
          origin: "BOS",
          departure: "2099-10-12",
          returnDate: "2099-10-15",
        },
        "session",
      )
    )[0].price,
    90,
  );
});
test("public offers exclude raw URLs, hidden credentials and unsupported split fares", () => {
  const publicOffers = normalizeSandboxOffers("flights", {
    ...response,
    secret: "hidden",
    results: [
      {
        id: "one",
        bookingOptions: [
          ...response.results[0].bookingOptions,
          { type: "split", displayPrice: { price: 1 }, bookingUrl: click },
        ],
      },
    ],
  });
  assert.equal(publicOffers.length, 1);
  assert.ok(!JSON.stringify(publicOffers).includes("hidden"));
});
test("car daily prices are not mislabeled as trip totals", () => {
  const car = {
    currency: "USD",
    priceMode: "perDayTotal",
    results: [
      {
        bookingOptions: [
          {
            car: { brand: "Test car" },
            price: { price: 50 },
            bookingUrl: click,
          },
        ],
      },
    ],
  };
  assert.equal(normalizeSandboxOffers("cars", car)[0].priceBasis, "per day");
  assert.throws(
    () => normalizeSandboxOffers("cars", { ...car, priceMode: "unknown" }),
    { code: "invalid_response" },
  );
});

test("malformed completed payloads are not reported as an empty search", async () => {
  assert.throws(
    () =>
      normalizeSandboxOffers("flights", {
        status: "complete",
        currency: "USD",
        priceMode: "total",
      }),
    { code: "invalid_response" },
  );
  const client = new KayakSandboxClient("test-key", async () =>
    Response.json({}),
  );
  await assert.rejects(client.places("flights", "Boston", "session"), {
    code: "invalid_response",
  });
});
