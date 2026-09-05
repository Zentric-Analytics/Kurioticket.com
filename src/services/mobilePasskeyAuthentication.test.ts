import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes, sign as signData } from "node:crypto";
import { readFileSync } from "node:fs";
import test, { afterEach } from "node:test";
import type { getPrisma } from "@/lib/prisma";
import { normalizePasskeyAssertion } from "../../apps/mobile/src/features/passkeys/passkeyAssertion";
import { b64url, sha256, userHandle } from "@/lib/passkeys";
import {
  createMobilePasskeyOptions,
  isValidAssertionCounter,
  MOBILE_PASSKEY_CHALLENGE_MS,
  MOBILE_PASSKEY_CHALLENGE_TYPE,
  MobilePasskeyAuthenticationError,
  type MobilePasskeyAuthenticationOverrides,
  verifyMobilePasskeyAssertion,
} from "./mobilePasskeyAuthentication";

const RP_ID = "staging.kurioticket.com";
const ORIGIN = `https://${RP_ID}`;
const NOW = new Date("2026-08-31T12:00:00.000Z");
const originalEnvironment = { ...process.env };
afterEach(() => { process.env = { ...originalEnvironment }; });

type PrismaClient = ReturnType<typeof getPrisma>;

type FixtureOptions = {
  storedCounter?: number;
  returnedCounter?: number;
  flags?: number;
  authenticatorRpId?: string;
  origin?: string;
  crossOrigin?: boolean;
  invalidSignature?: boolean;
  revoked?: boolean;
  twoFactorEnabled?: boolean;
};

function configureRelyingParty() {
  process.env.NEXT_PUBLIC_APP_URL = ORIGIN;
  process.env.NEXTAUTH_URL = ORIGIN;
  process.env.WEBAUTHN_RP_ID = RP_ID;
  process.env.WEBAUTHN_ORIGINS = ORIGIN;
}

function assertionFixture(options: FixtureOptions = {}) {
  configureRelyingParty();
  const userId = "user-passkey-1";
  const challenge = b64url(randomBytes(32));
  const credentialId = b64url(randomBytes(32));
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const clientDataJSON = b64url(Buffer.from(JSON.stringify({
    type: "webauthn.get",
    challenge,
    origin: options.origin ?? ORIGIN,
    crossOrigin: options.crossOrigin ?? false,
  })));
  const authenticatorData = Buffer.alloc(37);
  sha256(options.authenticatorRpId ?? RP_ID).copy(authenticatorData, 0);
  authenticatorData[32] = options.flags ?? 0x05;
  authenticatorData.writeUInt32BE(options.returnedCounter ?? 0, 33);
  const signedData = Buffer.concat([authenticatorData, sha256(Buffer.from(clientDataJSON, "base64url"))]);
  const signingKey = options.invalidSignature
    ? generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey
    : privateKey;
  const signature = b64url(signData("SHA256", signedData, signingKey));
  const assertion = {
    id: credentialId,
    rawId: credentialId,
    type: "public-key" as const,
    response: {
      clientDataJSON,
      authenticatorData: b64url(authenticatorData),
      signature,
      userHandle: userHandle(userId),
    },
    authenticatorAttachment: "platform",
    clientExtensionResults: {},
  };
  const passkey = {
    id: "passkey-1",
    userId,
    credentialId,
    publicKey: JSON.stringify(publicKey.export({ format: "jwk" })),
    counter: options.storedCounter ?? 0,
    revokedAt: options.revoked ? NOW : null,
    user: {
      id: userId,
      email: "tester@zentricanalytics.com",
      emailVerified: NOW,
      status: "ACTIVE",
      name: "Passkey Tester",
      securitySettings: { twoFactorEnabled: options.twoFactorEnabled ?? false },
    },
  };
  return { assertion, challenge, passkey };
}

function harness(
  fixture: ReturnType<typeof assertionFixture>,
  options: { accountAllowed?: boolean; expired?: boolean } = {},
) {
  const challenge = {
    id: "challenge-1",
    challenge: fixture.challenge,
    type: MOBILE_PASSKEY_CHALLENGE_TYPE,
    expiresAt: new Date(NOW.getTime() + (options.expired ? -1 : 60_000)),
    consumedAt: null as Date | null,
    userId: null as string | null,
  };
  const passkey = { ...fixture.passkey };
  const issued: Array<{ userId: string; method: string; assurance: string }> = [];

  const transactionClient = {
    webAuthnChallenge: {
      updateMany: async (args: any) => {
        if (challenge.id !== args.where.id || challenge.consumedAt || challenge.expiresAt <= args.where.expiresAt.gt) return { count: 0 };
        challenge.consumedAt = args.data.consumedAt;
        challenge.userId = args.data.userId;
        return { count: 1 };
      },
    },
    userPasskey: {
      updateMany: async (args: any) => {
        if (passkey.id !== args.where.id || passkey.revokedAt || passkey.counter !== args.where.counter) return { count: 0 };
        passkey.counter = args.data.counter;
        (passkey as typeof passkey & { lastUsedAt?: Date }).lastUsedAt = args.data.lastUsedAt;
        return { count: 1 };
      },
    },
  };
  const prisma = {
    webAuthnChallenge: {
      findUnique: async ({ where }: any) => where.challenge === challenge.challenge ? { ...challenge } : null,
    },
    userPasskey: {
      findUnique: async ({ where }: any) => where.credentialId === passkey.credentialId
        ? { ...passkey, user: { ...passkey.user } }
        : null,
    },
    $transaction: async (operation: (tx: typeof transactionClient) => Promise<unknown>) => operation(transactionClient),
  } as unknown as PrismaClient;

  const overrides: MobilePasskeyAuthenticationOverrides = {
    prisma,
    now: () => NOW,
    canAuthenticate: async () => options.accountAllowed !== false,
    issueSession: async (userId, method, assurance) => {
      issued.push({ userId, method, assurance });
      return { token: "ktm1.test.secret", expires: new Date(NOW.getTime() + 86_400_000).toISOString() };
    },
  };
  return { challenge, passkey, issued, overrides };
}

async function expectFailure(promise: Promise<unknown>, code: MobilePasskeyAuthenticationError["code"] = "AUTHENTICATION_FAILED") {
  await assert.rejects(promise, (error: unknown) => error instanceof MobilePasskeyAuthenticationError && error.code === code);
}

test("mobile passkey challenge and counter rules are strict", () => {
  assert.equal(MOBILE_PASSKEY_CHALLENGE_TYPE, "mobile-passkey-authentication");
  assert.ok(MOBILE_PASSKEY_CHALLENGE_MS <= 5 * 60_000);
  assert.equal(isValidAssertionCounter(0, 0), true);
  assert.equal(isValidAssertionCounter(0, 1), true);
  assert.equal(isValidAssertionCounter(4, 5), true);
  assert.equal(isValidAssertionCounter(4, 4), false);
  assert.equal(isValidAssertionCounter(4, 3), false);
});

test("options are username-less, short-lived, and reveal no account selector", async () => {
  configureRelyingParty();
  const writes: any[] = [];
  const prisma = {
    webAuthnChallenge: { create: async (input: any) => { writes.push(input); return input.data; } },
  } as unknown as PrismaClient;
  const options = await createMobilePasskeyOptions(NOW, prisma);
  assert.equal(options.rpId, RP_ID);
  assert.equal(options.userVerification, "required");
  assert.equal("allowCredentials" in options, false);
  assert.equal(writes[0].data.type, MOBILE_PASSKEY_CHALLENGE_TYPE);
  assert.equal(writes[0].data.expiresAt.getTime() - NOW.getTime(), MOBILE_PASSKEY_CHALLENGE_MS);
});

test("a valid signed assertion updates usage and creates a phishing-resistant passkey session", async () => {
  const fixture = assertionFixture({ twoFactorEnabled: true });
  const state = harness(fixture);
  const result = await verifyMobilePasskeyAssertion(fixture.assertion, state.overrides);

  assert.equal(result.user.id, fixture.passkey.userId);
  assert.equal(state.challenge.userId, fixture.passkey.userId);
  assert.equal(state.challenge.consumedAt?.toISOString(), NOW.toISOString());
  assert.equal((state.passkey as typeof state.passkey & { lastUsedAt?: Date }).lastUsedAt?.toISOString(), NOW.toISOString());
  assert.deepEqual(state.issued, [{ userId: fixture.passkey.userId, method: "PASSKEY", assurance: "PHISHING_RESISTANT" }]);
});

test("Preview Fabric payload fails strict verification until event metadata is stripped without changing signed bytes", async () => {
  const fixture = assertionFixture();
  const state = harness(fixture);
  const nativeEvent = { ...fixture.assertion, target: 73 };
  await expectFailure(verifyMobilePasskeyAssertion(nativeEvent, state.overrides), "INVALID_ASSERTION");
  assert.equal(state.issued.length, 0);
  assert.equal(state.challenge.consumedAt, null);
  const normalized = normalizePasskeyAssertion(nativeEvent);
  assert.deepEqual(normalized, fixture.assertion);
  const result = await verifyMobilePasskeyAssertion(JSON.parse(JSON.stringify(normalized)), state.overrides);
  assert.equal(result.user.id, fixture.passkey.userId);
  assert.equal(state.issued.length, 1);
});

test("valid zero counters and increasing non-zero counters succeed", async () => {
  const synced = assertionFixture({ storedCounter: 0, returnedCounter: 0 });
  await verifyMobilePasskeyAssertion(synced.assertion, harness(synced).overrides);

  const hardware = assertionFixture({ storedCounter: 4, returnedCounter: 5 });
  const state = harness(hardware);
  await verifyMobilePasskeyAssertion(hardware.assertion, state.overrides);
  assert.equal(state.passkey.counter, 5);
});

test("invalid signatures, RP IDs, UV flags, and non-increasing counters are rejected", async () => {
  for (const fixture of [
    assertionFixture({ invalidSignature: true }),
    assertionFixture({ authenticatorRpId: "attacker.example" }),
    assertionFixture({ flags: 0x01 }),
    assertionFixture({ storedCounter: 4, returnedCounter: 4 }),
    assertionFixture({ storedCounter: 4, returnedCounter: 3 }),
  ]) {
    await expectFailure(verifyMobilePasskeyAssertion(fixture.assertion, harness(fixture).overrides));
  }
});

test("credential ownership, revocation, account policy, origin, and expiry fail closed", async () => {
  const wrongHandle = assertionFixture();
  wrongHandle.assertion.response.userHandle = userHandle("different-user");
  await expectFailure(verifyMobilePasskeyAssertion(wrongHandle.assertion, harness(wrongHandle).overrides));

  const revoked = assertionFixture({ revoked: true });
  await expectFailure(verifyMobilePasskeyAssertion(revoked.assertion, harness(revoked).overrides));

  const blocked = assertionFixture();
  await expectFailure(verifyMobilePasskeyAssertion(blocked.assertion, harness(blocked, { accountAllowed: false }).overrides));

  const wrongOrigin = assertionFixture({ origin: "https://attacker.example" });
  await expectFailure(verifyMobilePasskeyAssertion(wrongOrigin.assertion, harness(wrongOrigin).overrides));

  const expired = assertionFixture();
  await expectFailure(verifyMobilePasskeyAssertion(expired.assertion, harness(expired, { expired: true }).overrides), "CHALLENGE_EXPIRED");
});

test("concurrent replay can consume a challenge and issue a session only once", async () => {
  const fixture = assertionFixture();
  const state = harness(fixture);
  const results = await Promise.allSettled([
    verifyMobilePasskeyAssertion(fixture.assertion, state.overrides),
    verifyMobilePasskeyAssertion(fixture.assertion, state.overrides),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(state.issued.length, 1);
});

test("routes stream-limit bodies, rate limit with Retry-After, and keep authentication failures generic", () => {
  const options = readFileSync("src/app/api/mobile/v1/auth/passkey/options/route.ts", "utf8");
  const verify = readFileSync("src/app/api/mobile/v1/auth/passkey/verify/route.ts", "utf8");
  assert.match(options, /request, limit:/);
  assert.match(options, /"Retry-After"/);
  assert.match(verify, /readBoundedJsonBody/);
  assert.doesNotMatch(verify, /request\.json\(/);
  assert.match(verify, /MOBILE_PASSKEY_GENERIC_ERROR/);
  assert.match(verify, /"Retry-After"/);
});
