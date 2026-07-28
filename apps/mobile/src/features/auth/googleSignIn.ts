import * as Crypto from "expo-crypto";
import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
  type OneTapResponse,
} from "react-native-nitro-google-signin";

export type NativeGoogleResult =
  | { status: "cancelled" }
  | { status: "success"; idToken: string; nonce: string };

export class NativeGoogleSignInError extends Error {
  constructor(message: string, public code = "unknown") {
    super(message);
    this.name = "NativeGoogleSignInError";
  }
}

function getClientId() {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || "";
}

async function createNonce() {
  const random = await Crypto.getRandomBytesAsync(32);
  const raw = Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
}

async function resolveInteractiveResponse(response: OneTapResponse) {
  if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.createAccount();
  if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.presentExplicitSignIn();
  return response;
}

export async function startNativeGoogleSignIn(): Promise<NativeGoogleResult> {
  const webClientId = getClientId();
  if (!webClientId) {
    throw new NativeGoogleSignInError(
      "Google sign-in is not configured for this build. Please use email sign-in.",
      "configuration",
    );
  }

  const nonce = await createNonce();
  GoogleOneTapSignIn.configure({
    webClientId,
    nonce,
    autoSelectOnSignIn: false,
    offlineAccess: false,
  });

  try {
    await GoogleOneTapSignIn.checkPlayServices(true);
    const response = await resolveInteractiveResponse(await GoogleOneTapSignIn.signIn());
    if (isCancelledResponse(response)) return { status: "cancelled" };
    if (!isSuccessResponse(response) || !response.data.idToken) {
      throw new NativeGoogleSignInError("Google did not return a valid identity token.", "invalid_response");
    }
    return { status: "success", idToken: response.data.idToken, nonce };
  } catch (error) {
    if (error instanceof NativeGoogleSignInError) throw error;
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown";
    if (code === statusCodes.SIGN_IN_CANCELLED) return { status: "cancelled" };
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new NativeGoogleSignInError("Google Play services must be installed and up to date.", code);
    }
    if (code === statusCodes.DEVELOPER_ERROR) {
      throw new NativeGoogleSignInError("Google sign-in is not configured for this Android build.", code);
    }
    if (code === statusCodes.IN_PROGRESS) {
      throw new NativeGoogleSignInError("Google sign-in is already in progress.", code);
    }
    throw new NativeGoogleSignInError("Google sign-in could not be completed. Please try again.", code);
  }
}
