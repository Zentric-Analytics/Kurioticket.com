import * as Crypto from "expo-crypto";
import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
  type OneTapResponse,
} from "react-native-nitro-google-signin";
import { Platform } from "react-native";
import { getRuntimeEnvironment } from "../../config/environment";
import { getGoogleIosClientId, requireGoogleWebClientId } from "./googleConfig";
import {
  formatNativeGoogleError,
  getNativeGoogleErrorCode,
  type GoogleSignInOperation,
} from "./googleSignInDiagnostics";

export type NativeGoogleResult =
  | { status: "cancelled" }
  | { status: "success"; idToken: string; nonce: string };

export type NativeGoogleSignInOptions = {
  forceAccountSelection?: boolean;
};

export class NativeGoogleSignInError extends Error {
  constructor(message: string, public code = "unknown") {
    super(message);
    this.name = "NativeGoogleSignInError";
  }
}

async function createNonce() {
  const random = await Crypto.getRandomBytesAsync(32);
  const raw = Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
}

async function resolveInteractiveResponse(
  response: OneTapResponse,
  run: (operation: GoogleSignInOperation, task: () => Promise<OneTapResponse>) => Promise<OneTapResponse>,
) {
  if (isNoSavedCredentialFoundResponse(response)) {
    response = await run("createAccount", () => GoogleOneTapSignIn.createAccount());
  }
  if (isNoSavedCredentialFoundResponse(response)) {
    response = await run("presentExplicitSignIn", () => GoogleOneTapSignIn.presentExplicitSignIn());
  }
  return response;
}

export async function resetNativeGoogleSignInSelection() {
  await GoogleOneTapSignIn.signOut();
}

export async function startNativeGoogleSignIn(
  { forceAccountSelection = false }: NativeGoogleSignInOptions = {},
): Promise<NativeGoogleResult> {
  const webClientId = requireGoogleWebClientId();
  const iosClientId = getGoogleIosClientId();

  const nonce = await createNonce();
  let operation: GoogleSignInOperation = "configure";
  const run = async (nextOperation: GoogleSignInOperation, task: () => Promise<OneTapResponse>) => {
    operation = nextOperation;
    return task();
  };

  try {
    GoogleOneTapSignIn.configure({
      webClientId,
      iosClientId: iosClientId || undefined,
      nonce,
      autoSelectOnSignIn: false,
      offlineAccess: false,
    });
    operation = "checkPlayServices";
    await GoogleOneTapSignIn.checkPlayServices(true);
    const initialResponse = forceAccountSelection
      ? await run("presentExplicitSignIn", () => GoogleOneTapSignIn.presentExplicitSignIn())
      : await run("signIn", () => GoogleOneTapSignIn.signIn());
    const response = forceAccountSelection
      ? initialResponse
      : await resolveInteractiveResponse(initialResponse, run);
    if (isCancelledResponse(response)) return { status: "cancelled" };
    if (!isSuccessResponse(response) || !response.data.idToken) {
      throw new NativeGoogleSignInError("Google did not return a valid identity token.", "invalid_response");
    }
    return { status: "success", idToken: response.data.idToken, nonce };
  } catch (error) {
    if (error instanceof NativeGoogleSignInError) throw error;
    const code = getNativeGoogleErrorCode(error);
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
    throw new NativeGoogleSignInError(formatNativeGoogleError({
      error,
      isPreview: getRuntimeEnvironment().isPreview,
      operation,
      platform: Platform.OS,
    }), code);
  }
}
