import { Platform } from "react-native";
import type { PasskeyRegistrationOptions } from "../../api/travelApi";

type PasskeyModule = typeof import("react-native-passkeys");
type NativeCreationResponse = NonNullable<Awaited<ReturnType<PasskeyModule["create"]>>>;

export type NormalizedPasskeyRegistration = {
  id: string;
  rawId: string;
  type: string;
  clientDataJSON: string;
  authenticatorData: string;
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
  if (!credential.id || !credential.rawId || !response.clientDataJSON || !response.authenticatorData || !response.attestationObject) {
    throw new Error("Passkey registration returned an incomplete credential.");
  }
  return {
    id: credential.id,
    rawId: credential.rawId,
    type: credential.type,
    clientDataJSON: response.clientDataJSON,
    authenticatorData: response.authenticatorData,
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
