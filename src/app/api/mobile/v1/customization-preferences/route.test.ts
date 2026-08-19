import assert from "node:assert/strict";
import test from "node:test";
import { createCustomizationHandlers } from "./route";

const request = (body?: unknown) =>
  new Request("https://x/api/mobile/v1/customization-preferences", {
    method: body === undefined ? "GET" : "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const json = (status: number, payload: unknown) =>
  Response.json(payload, { status });

type TestPrisma = { source: "test" };

function createDependencies(
  session: () => Promise<{
    user: { id: string; status: string };
  } | null>,
) {
  const prisma: TestPrisma = { source: "test" };
  const calls: Array<{
    method: "GET" | "PATCH";
    userId: string | null;
    prisma: TestPrisma;
    payload?: unknown;
  }> = [];

  return {
    prisma,
    calls,
    dependencies: {
      session,
      prisma,
      get: async (userId: string | null, injectedPrisma: TestPrisma) => {
        calls.push({ method: "GET", userId, prisma: injectedPrisma });
        return json(userId ? 200 : 401, { userId });
      },
      patch: async (
        userId: string | null,
        injectedPrisma: TestPrisma,
        payload: unknown,
      ) => {
        calls.push({
          method: "PATCH",
          userId,
          prisma: injectedPrisma,
          payload,
        });
        const preference = payload as { locale?: string } | null;
        return !preference || preference.locale === "xx"
          ? json(400, { error: "invalid" })
          : json(userId ? 200 : 401, { preferences: payload });
      },
    },
  };
}

test("missing mobile session returns 401", async () => {
  const fixture = createDependencies(async () => null);
  const response = await createCustomizationHandlers(
    fixture.dependencies,
  ).GET(request());

  assert.equal(response.status, 401);
  assert.equal(fixture.calls[0]?.userId, null);
});

test("inactive user returns 401", async () => {
  const fixture = createDependencies(async () => ({
    user: { id: "inactive-user", status: "SUSPENDED" },
  }));
  const response = await createCustomizationHandlers(
    fixture.dependencies,
  ).GET(request());

  assert.equal(response.status, 401);
  assert.equal(fixture.calls[0]?.userId, null);
});

test("active user ID and lightweight Prisma dependency are passed to GET", async () => {
  const fixture = createDependencies(async () => ({
    user: { id: "active-user", status: "ACTIVE" },
  }));
  const response = await createCustomizationHandlers(
    fixture.dependencies,
  ).GET(request());

  assert.equal(response.status, 200);
  assert.equal(fixture.calls[0]?.userId, "active-user");
  assert.equal(fixture.calls[0]?.prisma, fixture.prisma);
});

test("active user ID, Prisma dependency, and body are passed to PATCH", async () => {
  const fixture = createDependencies(async () => ({
    user: { id: "active-user", status: "ACTIVE" },
  }));
  const payload = { locale: "es-es", currency: "EUR" };
  const response = await createCustomizationHandlers(
    fixture.dependencies,
  ).PATCH(request(payload));

  assert.equal(response.status, 200);
  assert.equal(fixture.calls[0]?.userId, "active-user");
  assert.equal(fixture.calls[0]?.prisma, fixture.prisma);
  assert.deepEqual(fixture.calls[0]?.payload, payload);
});

test("invalid preference behavior remains delegated", async () => {
  const fixture = createDependencies(async () => ({
    user: { id: "active-user", status: "ACTIVE" },
  }));
  const response = await createCustomizationHandlers(
    fixture.dependencies,
  ).PATCH(request({ locale: "xx" }));

  assert.equal(response.status, 400);
  assert.deepEqual(fixture.calls[0]?.payload, { locale: "xx" });
});
