export type InitialGoogleSignInOperation = "signIn" | "presentExplicitSignIn";

export function getInitialGoogleSignInOperation(
  platform: string,
  forceAccountSelection: boolean,
): InitialGoogleSignInOperation {
  return platform === "ios" || forceAccountSelection ? "presentExplicitSignIn" : "signIn";
}
