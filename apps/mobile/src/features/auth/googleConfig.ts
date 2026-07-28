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
