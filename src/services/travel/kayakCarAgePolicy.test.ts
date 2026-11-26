import assert from "node:assert/strict";
import test from "node:test";
import { allowsGenericStagingCarInventory, sandboxCarDriverAgeAllowed } from "./kayakCarAgePolicy";

const staging = { NEXT_PUBLIC_APP_URL: "https://staging.kurioticket.com", TRAVEL_PROVIDER_MODE: "staging" };
const production = { NEXT_PUBLIC_APP_URL: "https://kurioticket.com", TRAVEL_PROVIDER_MODE: "production" };

test("explicit staging admits every existing valid age choice for generic previews", () => {
  assert.equal(allowsGenericStagingCarInventory(staging), true);
  for (const age of ["18-70", ...Array.from({ length: 53 }, (_, i) => String(i + 18))])
    assert.equal(sandboxCarDriverAgeAllowed(age, staging), true, age);
});
test("production, unknown and inconsistent configuration retain the prior restriction", () => {
  for (const env of [production, {}, { ...production, TRAVEL_PROVIDER_MODE: "staging" },
    { ...staging, TRAVEL_PROVIDER_MODE: "production" }, { ...staging, NEXT_PUBLIC_APP_URL: "https://staging.kurioticket.com.evil.example" },
    { ...staging, NEXT_PUBLIC_APP_URL: "http://staging.kurioticket.com" },
    { ...staging, NEXT_PUBLIC_APP_URL: "https://user:password@staging.kurioticket.com" },
    { ...staging, NEXT_PUBLIC_APP_URL: "https://staging.kurioticket.com:8443" }]) {
    assert.equal(allowsGenericStagingCarInventory(env), false);
    for (const age of ["18", "20", "21", "30", "70", "18-70"])
      assert.equal(sandboxCarDriverAgeAllowed(age, env), false);
    assert.equal(sandboxCarDriverAgeAllowed("25", env), true);
    assert.equal(sandboxCarDriverAgeAllowed(undefined, env), true);
    assert.equal(sandboxCarDriverAgeAllowed("", env), true);
  }
});
test("only explicit local development staging mode permits generic previews", () => {
  const local = { ...staging, NEXT_PUBLIC_APP_URL: "http://localhost:3000", NODE_ENV: "development" };
  assert.equal(sandboxCarDriverAgeAllowed("18", local), true);
  assert.equal(sandboxCarDriverAgeAllowed("18", { ...local, NODE_ENV: "production" }), false);
  assert.equal(sandboxCarDriverAgeAllowed("18", { ...local, TRAVEL_PROVIDER_MODE: "production" }), false);
});
test("invalid ages remain invalid even in staging", () => {
  for (const age of ["17", "71", "-20", "025", "18.5", "20 years", "18-71", " 20 ", "unknown"])
    assert.equal(sandboxCarDriverAgeAllowed(age, staging), false, age);
});
