import assert from "node:assert/strict";
import test from "node:test";

import {
  customizationPreferenceDefaults,
  handleCustomizationPreferencesGet,
  handleCustomizationPreferencesPatch,
} from "@/app/api/account/customization-preferences/route";

type Preferences = typeof customizationPreferenceDefaults;

type StoredPreferences = Preferences & { userId: string };

function createFakePrisma(initialRows: StoredPreferences[] = []) {
  const rows = new Map<string, StoredPreferences>();

  for (const row of initialRows) {
    rows.set(row.userId, { ...row });
  }

  return {
    rows,
    prisma: {
      userCustomizationPreferences: {
        async findUnique(args: unknown) {
          const userId = (args as { where: { userId: string } }).where.userId;
          const row = rows.get(userId);
          if (!row) return null;

          return selectPreferences(row);
        },
        async upsert(args: unknown) {
          const upsertArgs = args as {
            where: { userId: string };
            create: StoredPreferences;
            update: Partial<Preferences>;
          };
          const current = rows.get(upsertArgs.where.userId);
          const next = current
            ? { ...current, ...upsertArgs.update }
            : { ...upsertArgs.create };

          rows.set(upsertArgs.where.userId, next);

          return selectPreferences(next);
        },
      },
    },
  };
}

function selectPreferences(row: StoredPreferences): Preferences {
  return {
    locale: row.locale,
    currency: row.currency,
    region: row.region,
    personalizeRecommendations: row.personalizeRecommendations,
  };
}

async function responseJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

test("customization preferences GET unauthenticated returns 401", async () => {
  const { prisma } = createFakePrisma();
  const response = await handleCustomizationPreferencesGet(null, prisma);

  assert.equal(response.status, 401);
});

test("customization preferences PATCH unauthenticated returns 401", async () => {
  const { prisma } = createFakePrisma();
  const response = await handleCustomizationPreferencesPatch(null, prisma, {
    locale: "fr",
  });

  assert.equal(response.status, 401);
});

test("customization preferences GET no row returns defaults", async () => {
  const { prisma } = createFakePrisma();
  const response = await handleCustomizationPreferencesGet("user-1", prisma);
  const body = await responseJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.hasPreferences, false);
  assert.deepEqual(body.preferences, customizationPreferenceDefaults);
});

test("customization preferences PATCH rejects unknown keys", async () => {
  const { prisma } = createFakePrisma();
  const response = await handleCustomizationPreferencesPatch("user-1", prisma, {
    locale: "fr",
    unknown: true,
  });

  assert.equal(response.status, 400);
});

test("customization preferences PATCH rejects empty payload", async () => {
  const { prisma } = createFakePrisma();
  const response = await handleCustomizationPreferencesPatch(
    "user-1",
    prisma,
    {},
  );

  assert.equal(response.status, 400);
});

test("customization preferences PATCH rejects invalid locale", async () => {
  const { prisma } = createFakePrisma();
  const response = await handleCustomizationPreferencesPatch("user-1", prisma, {
    locale: "not-a-locale",
  });

  assert.equal(response.status, 400);
});

test("customization preferences PATCH rejects unsupported currency", async () => {
  const { prisma } = createFakePrisma();
  const response = await handleCustomizationPreferencesPatch("user-1", prisma, {
    currency: "ZZZ",
  });

  assert.equal(response.status, 400);
});

test("customization preferences PATCH rejects unsupported region", async () => {
  const { prisma } = createFakePrisma();
  const response = await handleCustomizationPreferencesPatch("user-1", prisma, {
    region: "XX",
  });

  assert.equal(response.status, 400);
});

test("customization preferences PATCH rejects non-boolean personalization values", async () => {
  const { prisma } = createFakePrisma();
  const response = await handleCustomizationPreferencesPatch("user-1", prisma, {
    personalizeRecommendations: "false",
  });

  assert.equal(response.status, 400);
});

test("customization preferences PATCH creates row with defaults plus submitted values", async () => {
  const { prisma, rows } = createFakePrisma();
  const response = await handleCustomizationPreferencesPatch("user-1", prisma, {
    locale: "fr",
    currency: "eur",
    region: "fr",
    personalizeRecommendations: false,
  });
  const body = await responseJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body.preferences, {
    ...customizationPreferenceDefaults,
    locale: "fr",
    currency: "EUR",
    region: "FR",
    personalizeRecommendations: false,
  });
  assert.deepEqual(selectPreferences(rows.get("user-1")!), body.preferences);
});

test("customization preferences PATCH updates existing row and preserves omitted fields", async () => {
  const { prisma, rows } = createFakePrisma([
    {
      userId: "user-1",
      locale: "fr",
      currency: "EUR",
      region: "FR",
      personalizeRecommendations: false,
    },
  ]);

  const response = await handleCustomizationPreferencesPatch("user-1", prisma, {
    currency: "usd",
  });
  const body = await responseJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body.preferences, {
    locale: "fr",
    currency: "USD",
    region: "FR",
    personalizeRecommendations: false,
  });
  assert.deepEqual(selectPreferences(rows.get("user-1")!), body.preferences);
});

test("customization preferences GET returns saved normalized values", async () => {
  const { prisma } = createFakePrisma([
    {
      userId: "user-1",
      locale: "fr",
      currency: "EUR",
      region: "FR",
      personalizeRecommendations: true,
    },
  ]);
  const response = await handleCustomizationPreferencesGet("user-1", prisma);
  const body = await responseJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.hasPreferences, true);
  assert.deepEqual(body.preferences, {
    locale: "fr",
    currency: "EUR",
    region: "FR",
    personalizeRecommendations: true,
  });
});

test("customization preferences PATCH does not affect another user's row", async () => {
  const { prisma, rows } = createFakePrisma([
    {
      userId: "user-2",
      locale: "de",
      currency: "EUR",
      region: "DE",
      personalizeRecommendations: false,
    },
  ]);

  const response = await handleCustomizationPreferencesPatch("user-1", prisma, {
    locale: "ja",
  });

  assert.equal(response.status, 200);
  assert.equal(rows.get("user-1")?.locale, "ja");
  assert.deepEqual(rows.get("user-2"), {
    userId: "user-2",
    locale: "de",
    currency: "EUR",
    region: "DE",
    personalizeRecommendations: false,
  });
});
