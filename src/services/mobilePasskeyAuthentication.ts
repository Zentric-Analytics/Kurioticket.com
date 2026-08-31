import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { canAuthenticateAccount } from "@/lib/account-security-policy";
import { issueMobileSession } from "@/lib/account-session";
import {
  assertAllowedOrigin,
  b64url,
  fromB64url,
  getWebAuthnConfig,
  newChallenge,
  parseAuthenticatorData,
  parseClientData,
  sha256,
  userHandle,
  verifyAssertionSignature,
} from "@/lib/passkeys";

export const MOBILE_PASSKEY_CHALLENGE_TYPE = "mobile-passkey-authentication";
export const MOBILE_PASSKEY_CHALLENGE_MS = 5 * 60_000;
export const MOBILE_PASSKEY_GENERIC_ERROR = "Passkey sign-in could not be completed. Use Email or Google to sign in.";

const encoded = (max: number) => z.string().min(1).max(max).regex(/^[A-Za-z0-9_-]+$/);
const assertionSchema = z.object({
  id: encoded(2048),
  rawId: encoded(2048),
  type: z.literal("public-key"),
  response: z.object({
    clientDataJSON: encoded(8192),
    authenticatorData: encoded(4096),
    signature: encoded(4096),
    userHandle: encoded(2048).nullable().optional(),
  }).strict(),
  authenticatorAttachment: z.string().max(64).nullable().optional(),
  clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
}).strict();

type ParsedAssertion = z.infer<typeof assertionSchema>;
type PrismaClient = ReturnType<typeof getPrisma>;

type AuthenticationDependencies = {
  prisma: PrismaClient;
  now: () => Date;
  canAuthenticate: typeof canAuthenticateAccount;
  issueSession: typeof issueMobileSession;
};

export type MobilePasskeyAuthenticationOverrides = Partial<AuthenticationDependencies>;

export function isValidAssertionCounter(stored: number, returned: number) {
  return (stored === 0 && returned === 0) || returned > stored;
}

function sameBytes(left: string, right: string) {
  try {
    const a = fromB64url(left);
    const b = fromB64url(right);
    return a.length > 0 && a.length === b.length && a.equals(b);
  } catch {
    return false;
  }
}

export async function createMobilePasskeyOptions(now = new Date(), prisma: PrismaClient = getPrisma()) {
  const challenge = newChallenge();
  await prisma.webAuthnChallenge.create({
    data: {
      challenge,
      type: MOBILE_PASSKEY_CHALLENGE_TYPE,
      expiresAt: new Date(now.getTime() + MOBILE_PASSKEY_CHALLENGE_MS),
    },
  });
  return {
    challenge,
    rpId: getWebAuthnConfig().rpID,
    timeout: 60_000,
    userVerification: "required" as const,
  };
}

export class MobilePasskeyAuthenticationError extends Error {
  constructor(public code: "INVALID_ASSERTION" | "CHALLENGE_EXPIRED" | "AUTHENTICATION_FAILED") {
    super(MOBILE_PASSKEY_GENERIC_ERROR);
    this.name = "MobilePasskeyAuthenticationError";
  }
}

export function verifyMobilePasskeyProof(input: {
  assertion: ParsedAssertion;
  publicKey: string;
  storedCounter: number;
  rpID: string;
}) {
  const { assertion, publicKey, storedCounter, rpID } = input;
  const auth = parseAuthenticatorData(assertion.response.authenticatorData);
  if (!auth.rpIdHash.equals(sha256(rpID))) throw new Error("rp-id");
  if (!(auth.flags & 0x01) || !(auth.flags & 0x04)) throw new Error("flags");
  if (!isValidAssertionCounter(storedCounter, auth.counter)) throw new Error("counter");
  if (!verifyAssertionSignature({ publicKey, ...assertion.response })) throw new Error("signature");
  return auth.counter;
}

function resolveDependencies(overrides: MobilePasskeyAuthenticationOverrides): AuthenticationDependencies {
  return {
    prisma: overrides.prisma ?? getPrisma(),
    now: overrides.now ?? (() => new Date()),
    canAuthenticate: overrides.canAuthenticate ?? canAuthenticateAccount,
    issueSession: overrides.issueSession ?? issueMobileSession,
  };
}

export async function verifyMobilePasskeyAssertion(
  input: unknown,
  overrides: MobilePasskeyAuthenticationOverrides = {},
) {
  const parsed = assertionSchema.safeParse(input);
  if (!parsed.success || !sameBytes(parsed.data.id, parsed.data.rawId)) {
    throw new MobilePasskeyAuthenticationError("INVALID_ASSERTION");
  }
  const body = parsed.data;

  let clientData: {
    type?: unknown;
    challenge?: unknown;
    origin?: unknown;
    crossOrigin?: unknown;
    androidPackageName?: unknown;
  };
  try {
    clientData = parseClientData(body.response.clientDataJSON);
  } catch {
    throw new MobilePasskeyAuthenticationError("INVALID_ASSERTION");
  }
  if (
    clientData.type !== "webauthn.get"
    || typeof clientData.challenge !== "string"
    || typeof clientData.origin !== "string"
    || clientData.crossOrigin === true
  ) {
    throw new MobilePasskeyAuthenticationError("INVALID_ASSERTION");
  }
  try {
    assertAllowedOrigin(clientData.origin, clientData.androidPackageName);
  } catch {
    throw new MobilePasskeyAuthenticationError("AUTHENTICATION_FAILED");
  }

  const dependencies = resolveDependencies(overrides);
  const { prisma } = dependencies;
  const now = dependencies.now();
  const challenge = await prisma.webAuthnChallenge.findUnique({ where: { challenge: clientData.challenge } });
  if (
    !challenge
    || challenge.type !== MOBILE_PASSKEY_CHALLENGE_TYPE
    || challenge.consumedAt
    || challenge.expiresAt <= now
  ) {
    throw new MobilePasskeyAuthenticationError("CHALLENGE_EXPIRED");
  }

  const canonicalCredentialId = b64url(fromB64url(body.rawId));
  const passkey = await prisma.userPasskey.findUnique({
    where: { credentialId: canonicalCredentialId },
    include: { user: true },
  });
  if (
    !passkey
    || passkey.revokedAt
    || !passkey.user.email
    || !(await dependencies.canAuthenticate(passkey.user, "passkey"))
  ) {
    throw new MobilePasskeyAuthenticationError("AUTHENTICATION_FAILED");
  }
  if (body.response.userHandle && !sameBytes(body.response.userHandle, userHandle(passkey.userId))) {
    throw new MobilePasskeyAuthenticationError("AUTHENTICATION_FAILED");
  }

  let returnedCounter: number;
  try {
    returnedCounter = verifyMobilePasskeyProof({
      assertion: body,
      publicKey: passkey.publicKey,
      storedCounter: passkey.counter,
      rpID: getWebAuthnConfig().rpID,
    });
  } catch {
    throw new MobilePasskeyAuthenticationError("AUTHENTICATION_FAILED");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.webAuthnChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now, userId: passkey.userId },
      });
      if (consumed.count !== 1) throw new Error("replay");

      const updated = await tx.userPasskey.updateMany({
        where: { id: passkey.id, revokedAt: null, counter: passkey.counter },
        data: { counter: returnedCounter, lastUsedAt: now },
      });
      if (updated.count !== 1) throw new Error("replay");
    });
  } catch {
    throw new MobilePasskeyAuthenticationError("AUTHENTICATION_FAILED");
  }

  const session = await dependencies.issueSession(passkey.userId, "PASSKEY", "PHISHING_RESISTANT");
  return {
    session,
    user: { id: passkey.user.id, email: passkey.user.email, name: passkey.user.name },
  };
}
