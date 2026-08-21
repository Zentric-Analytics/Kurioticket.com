import type { AppVariant } from "./environment.schema";
import releasePolicy from "../../release-policy.json";

export function googleIosUrlScheme(clientId: string): string {
  const match = /^(?<identifier>[A-Za-z0-9-]+)\.apps\.googleusercontent\.com$/.exec(clientId.trim());
  if (!match?.groups?.identifier) {
    throw new Error("[mobile-environment] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must be a valid Google iOS OAuth client ID.");
  }
  return `com.googleusercontent.apps.${match.groups.identifier}`;
}

export function approvedGoogleIosClientId(variant: AppVariant): string {
  return releasePolicy[variant].googleIosClientId;
}

export function validateGoogleIosClientId(clientId: string | undefined, variant: AppVariant): string {
  const configured = clientId?.trim();
  if (!configured) {
    throw new Error(`[mobile-environment] ${releasePolicy[variant].displayName} iOS builds require EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.`);
  }
  googleIosUrlScheme(configured);
  if (configured !== approvedGoogleIosClientId(variant)) {
    throw new Error(`[mobile-environment] ${releasePolicy[variant].displayName} iOS OAuth identity does not match the approved release identity.`);
  }
  return configured;
}
