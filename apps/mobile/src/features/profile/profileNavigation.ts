import type { ProfileDestination, ProfileNativeHref } from "./profileModel";

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
    actions.push(destination.fallbackHref);
    return;
  }

  const previewOrigin = runtime.apiBaseUrl.replace(/\/$/, "");
  try {
    await actions.openBrowser(`${previewOrigin}${destination.path}`);
  } catch {
    actions.push(destination.fallbackHref);
  }
}
