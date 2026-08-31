import { Platform } from "react-native";
import type { PasskeyRegistrationOptions } from "../../api/travelApi";

type PasskeyModule = typeof import("react-native-passkeys");
type NativeCreationResponse = NonNullable<Awaited<ReturnType<PasskeyModule["create"]>>>;

export type NormalizedPasskeyRegistration = {
  id: string;
  rawId: string;
  type: string;
  clientDataJSON: string;
  authenticatorData?: string;
  attestationObject: string;
  transports: string[];
  authenticatorAttachment: string | null;
  clientExtensionResults: Record<string, unknown>;
};

async function loadPasskeyModule(): Promise<PasskeyModule> {
  return import("react-native-passkeys");
}

export async function isNativePasskeySupported(): Promise<boolean> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
  try {
    return (await loadPasskeyModule()).isSupported();
  } catch {
    // Old binaries and Expo Go do not contain the native module.
    return false;
  }
}

export function normalizePasskeyRegistration(credential: NativeCreationResponse): NormalizedPasskeyRegistration {
  const response = credential.response as NativeCreationResponse["response"] & {
    authenticatorData?: string;
    attestationObject?: string;
    transports?: string[];
  };
  if (!credential.id || !credential.rawId || !response.clientDataJSON || !response.attestationObject) {
    throw new Error("Passkey registration returned an incomplete credential.");
  }
  return {
    id: credential.id,
    rawId: credential.rawId,
    type: credential.type,
    clientDataJSON: response.clientDataJSON,
    ...(response.authenticatorData ? { authenticatorData: response.authenticatorData } : {}),
    attestationObject: response.attestationObject,
    transports: Array.isArray(response.transports) ? response.transports : [],
    authenticatorAttachment: credential.authenticatorAttachment ?? null,
    clientExtensionResults: (credential.clientExtensionResults ?? {}) as Record<string, unknown>,
  };
}

export async function createNativePasskey(
  options: PasskeyRegistrationOptions,
  signal?: AbortSignal,
): Promise<NormalizedPasskeyRegistration | null> {
  const module = await loadPasskeyModule();
  if (!module.isSupported()) return null;
  const credential = await module.create({
    ...(options as Parameters<PasskeyModule["create"]>[0]),
    signal,
  });
  return credential ? normalizePasskeyRegistration(credential) : null;
}

export function isPasskeyCancellation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: unknown; message?: unknown; code?: unknown };
  const text = `${String(value.name ?? "")} ${String(value.message ?? "")} ${String(value.code ?? "")}`.toLowerCase();
  return text.includes("usercancelled") || text.includes("user canceled") || text.includes("user cancelled") || text.includes("aborterror") || text.includes("cancellation");
}

export function defaultPasskeyName(copy: { ios: string; android: string }): string {
  return Platform.OS === "ios" ? copy.ios : copy.android;
}

export type NativePasskeyAuthenticationOptions = Parameters<PasskeyModule["get"]>[0];
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

export async function getNativePasskey(
  options: NativePasskeyAuthenticationOptions,
  signal?: AbortSignal,
): Promise<NormalizedPasskeyAssertion | null> {
  if (signal?.aborted) return null;
  const module = await loadPasskeyModule();
  if (!module.isSupported() || signal?.aborted) return null;
  // react-native-passkeys@0.4.2 cannot actively cancel get(); callers use the
  // signal and generation guards to ignore a result after navigation or retry.
  const credential = await module.get(options);
  if (!credential || signal?.aborted) return null;
  return normalizePasskeyAssertion(credential);
}

export function isPasskeyNoCredential(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: unknown; message?: unknown; code?: unknown };
  const text = `${String(value.name ?? "")} ${String(value.message ?? "")} ${String(value.code ?? "")}`.toLowerCase();
  const compact = text.replace(/[^a-z]/g, "");
  return text.includes("notallowederror")
    || compact.includes("nocredential")
    || compact.includes("nomatchingcredential")
    || text.includes("no passkey")
    || text.includes("credential not found");
}
