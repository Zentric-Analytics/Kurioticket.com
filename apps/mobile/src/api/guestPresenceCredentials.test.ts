import assert from "node:assert/strict";
import test from "node:test";
import { nativeTravelApiHarness } from "./testsupport/travelApiHarness";

const staging = "https://staging.kurioticket.com";
const credential = (platform = "ios", environment = "staging", expiresAt = Date.now() + 60_000) =>
  `v2.00000000-0000-4000-8000-000000000001.${expiresAt}.${environment}.${platform}.${"A".repeat(43)}`;
const response = (token: string) => Response.json({ results: [], status: "empty" }, { headers: { "X-Kt-Search-Session": token } });

test("presence reads the exact existing guest search credential without making another request", async () => {
  for (const platform of ["ios", "android"]) {
    const token = credential(platform);
    const h = nativeTravelApiHarness(platform, "0.3.0", staging, undefined, { registered: false, signedSearchCredential: token });
    const changes: Array<string | null> = [];
    const unsubscribe = h.subscribeOperationalCredential(() => { changes.push(h.existingOperationalCredential()); });
    assert.equal(h.existingOperationalCredential(), null);
    assert.equal(h.calls.length, 0);
    await h.api.searchFlights({});
    assert.equal(h.existingOperationalCredential(), token);
    assert.equal(h.existingOperationalCredential(), token);
    assert.equal(h.calls.length, 1);
    await h.api.searchHotels({});
    assert.equal(new Headers(h.calls[1].init.headers).get("x-kt-search-session"), token);
    assert.deepEqual(changes, [token], "unchanged credentials do not cause additional presence notifications");
    h.setSession({ user: { id: "account-a" }, token: "account-a" });
    assert.equal(h.existingOperationalCredential(), null);
    assert.deepEqual(changes, [token, null]);
    h.setSession(null);
    assert.equal(h.existingOperationalCredential(), null, "logout cannot restore a previous search credential");
    unsubscribe();
  }
});

test("presence cannot reuse production, legacy, expired, account-owned or wrong-platform credentials", async () => {
  const valid = credential();
  const cases = [
    { base: "https://kurioticket.com", token: valid, registered: false },
    { base: staging, token: credential("ios", "production"), registered: false },
    { base: staging, token: credential("android"), registered: false },
    { base: staging, token: credential("ios", "staging", Date.now() - 1), registered: false },
    { base: staging, token: credential("ios", "staging", Date.now() + 31 * 60_000), registered: false },
    { base: staging, token: valid.replace(/^v2\./, "v1.").replace(".ios.", "."), registered: false },
    { base: staging, token: valid, registered: true },
  ];
  for (const item of cases) {
    const h = nativeTravelApiHarness("ios", "0.3.0", item.base, undefined, { registered: item.registered, signedSearchCredential: item.token });
    await h.api.searchFlights({});
    assert.equal(h.existingOperationalCredential(), null);
  }
});

test("a stale native search response cannot restore presence ownership after an account transition", async () => {
  let resolve!: (value: Response) => void;
  const token = credential();
  const h = nativeTravelApiHarness("ios", "0.3.0", staging,
    async () => new Promise<Response>(done => { resolve = done; }), { registered: false });
  const changes: Array<string | null> = [];
  h.subscribeOperationalCredential(() => { changes.push(h.existingOperationalCredential()); });
  const pending = h.api.searchFlights({});
  await new Promise<void>(done => setImmediate(done));
  h.setSession({ user: { id: "account-a" }, token: "account-a" });
  h.setSession(null);
  resolve(response(token));
  await pending;
  assert.equal(h.existingOperationalCredential(), null);
  assert.deepEqual(changes, []);
});
