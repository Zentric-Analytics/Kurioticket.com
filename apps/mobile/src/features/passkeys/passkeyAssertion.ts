export type NormalizedPasskeyAssertion = {
  id: string;
  rawId: string;
  type: "public-key";
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle: string | null;
  };
  authenticatorAttachment: string | null;
  clientExtensionResults: Record<string, unknown>;
};

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value) throw new Error(`Passkey authentication returned an invalid ${field}.`);
  return value;
}

export function normalizePasskeyAssertion(credential: unknown): NormalizedPasskeyAssertion {
  if (!credential || typeof credential !== "object") throw new Error("Passkey authentication returned an incomplete credential.");
  const value = credential as Record<string, unknown>;
  const response = value.response;
  if (!response || typeof response !== "object") throw new Error("Passkey authentication returned an incomplete credential.");
  const assertion = response as Record<string, unknown>;
  const type = requiredString(value.type, "type");
  if (type !== "public-key") throw new Error("Passkey authentication returned an invalid type.");
  const userHandle = assertion.userHandle;
  if (userHandle !== undefined && userHandle !== null && typeof userHandle !== "string") throw new Error("Passkey authentication returned an invalid user handle.");
  const attachment = value.authenticatorAttachment;
  if (attachment !== undefined && attachment !== null && typeof attachment !== "string") throw new Error("Passkey authentication returned an invalid attachment.");
  const extensions = value.clientExtensionResults;
  if (extensions !== undefined && extensions !== null && (typeof extensions !== "object" || Array.isArray(extensions))) {
    throw new Error("Passkey authentication returned invalid extensions.");
  }
  return {
    id: requiredString(value.id, "id"), rawId: requiredString(value.rawId, "rawId"), type,
    response: {
      clientDataJSON: requiredString(assertion.clientDataJSON, "client data"),
      authenticatorData: requiredString(assertion.authenticatorData, "authenticator data"),
      signature: requiredString(assertion.signature, "signature"),
      userHandle: (userHandle as string | null | undefined) ?? null,
    },
    authenticatorAttachment: (attachment as string | null | undefined) ?? null,
    clientExtensionResults: (extensions ?? {}) as Record<string, unknown>,
  };
}
