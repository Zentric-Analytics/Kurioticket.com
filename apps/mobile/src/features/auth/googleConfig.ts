import { validateGoogleIosClientId } from "../../config/googleIosIdentity";
import type { AppVariant } from "../../config/environment.schema";

export class GoogleSignInConfigurationError extends Error {
  constructor() {
    super("Google sign-in is not configured for this build. Please use email sign-in.");
    this.name = "NativeGoogleSignInError";
  }
}

export function getGoogleWebClientId() {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || "";
}

export function requireGoogleWebClientId() {
  const clientId = getGoogleWebClientId();
  if (!clientId) throw new GoogleSignInConfigurationError();
  return clientId;
}

export function resolveGoogleIosClientId(clientId: string | undefined, variant: AppVariant, platform: string) {
  const configured = clientId?.trim() || "";
  if (platform !== "ios") return configured;
  return validateGoogleIosClientId(configured, variant);
}

export function getGoogleIosClientId(variant: AppVariant, platform: string) {
  return resolveGoogleIosClientId(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    variant,
    platform,
  );
}
