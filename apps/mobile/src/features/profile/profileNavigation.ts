import type { ProfileDestination, ProfileNativeHref } from "./profileModel";

type LegalBrowser = Pick<typeof import("expo-web-browser"), "openAuthSessionAsync" | "openBrowserAsync">;

export function openPreviewLegalBrowser(url: string, platform: string, browser: LegalBrowser) {
  if (platform === "ios") {
    // Use the native authentication-session presentation only for Preview legal
    // links. There is no completion redirect; the reader closes the session.
    return browser.openAuthSessionAsync(url, null);
  }
  return browser.openBrowserAsync(url);
}

type ProfileNavigationRuntime = {
  isPreview: boolean;
  apiBaseUrl: string;
};

type ProfileNavigationActions = {
  push: (href: ProfileNativeHref) => void;
  openBrowser: (url: string) => Promise<unknown>;
};

export async function navigateProfileDestination(
  destination: ProfileDestination,
  runtime: ProfileNavigationRuntime,
  actions: ProfileNavigationActions,
) {
  if (destination.kind === "native") {
    actions.push(destination.href);
    return;
  }

  if (!runtime.isPreview) {
    actions.push(destination.productionHref);
    return;
  }

  const previewOrigin = runtime.apiBaseUrl.replace(/\/$/, "");
  try {
    await actions.openBrowser(`${previewOrigin}${destination.path}`);
  } catch {
    // Do not redirect legal links to the old native screen when the
    // system in-app browser fails to open. Preview should use one
    // consistent browser experience rather than silently changing UI.
  }
}
