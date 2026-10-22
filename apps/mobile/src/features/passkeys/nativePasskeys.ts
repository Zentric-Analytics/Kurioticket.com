import { normalizePasskeyAssertion, type NormalizedPasskeyAssertion } from "./passkeyAssertion";
import { Platform } from "react-native";
import type { PasskeyRegistrationOptions } from "../../api/travelApi";
import { normalizeNativePasskeyCreationError } from "./nativePasskeyDiagnostics";

export { normalizeNativePasskeyCreationError } from "./nativePasskeyDiagnostics";

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

function androidPlatformRegistrationOptions(options: PasskeyRegistrationOptions): PasskeyRegistrationOptions {
  if (Platform.OS !== "android") return options;
  const currentSelection = options.authenticatorSelection;
  const authenticatorSelection = currentSelection && typeof currentSelection === "object" && !Array.isArray(currentSelection)
    ? currentSelection as Record<string, unknown>
    : {};
  return {
    ...options,
    authenticatorSelection: {
      ...authenticatorSelection,
      // Android passkeys should be created with the platform credential provider.
      // This avoids offering roaming USB/hybrid authenticators for this explicit
      // in-app passkey setup flow and keeps Google Password Manager eligible.
      authenticatorAttachment: "platform",
    },
  };
}

export async function createNativePasskey(
  options: PasskeyRegistrationOptions,
  signal?: AbortSignal,
): Promise<NormalizedPasskeyRegistration | null> {
  const module = await loadPasskeyModule();
  if (!module.isSupported()) return null;
  const requestOptions = androidPlatformRegistrationOptions(options);
  const credential = await module.create({
    ...(requestOptions as Parameters<PasskeyModule["create"]>[0]),
    signal,
  });
  return credential ? normalizePasskeyRegistration(credential) : null;
}

export function isPasskeyCancellation(error: unknown): boolean {
  return normalizeNativePasskeyCreationError(error).category === "USER_CANCELLED";
}

export function defaultPasskeyName(copy: { ios: string; android: string }): string {
  return Platform.OS === "ios" ? copy.ios : copy.android;
}

export type NativePasskeyAuthenticationOptions = Parameters<PasskeyModule["get"]>[0];
export { normalizePasskeyAssertion } from "./passkeyAssertion";
export type { NormalizedPasskeyAssertion } from "./passkeyAssertion";

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
