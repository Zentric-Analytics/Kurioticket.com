import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GET } from "./route";

test("liveness responds without requiring a database connection", async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    ok: true,
    service: "kurioticket",
    check: "liveness",
  });
});

test("liveness and strict database readiness remain separate endpoints", () => {
  const liveness = readFileSync("src/app/api/health/live/route.ts", "utf8");
  const readiness = readFileSync("src/app/api/health/route.ts", "utf8");
  const blueprint = readFileSync("render.yaml", "utf8");

  assert.doesNotMatch(liveness, /getOptionalPrisma|\$queryRaw|DATABASE_URL/);
  assert.match(readiness, /await db\.\$queryRaw`SELECT 1`/);
  assert.match(readiness, /status: database\.configured && database\.connected \? 200 : 503/);
  const staging = blueprint.slice(blueprint.indexOf("name: kurioticket-web-staging"));
  assert.match(staging, /healthCheckPath: \/api\/health\/live/);
  const production = blueprint.slice(blueprint.indexOf("name: kurioticket-web\n"), blueprint.indexOf("name: kurioticket-web-staging"));
  assert.match(production, /healthCheckPath: \/api\/health\n/);
});
