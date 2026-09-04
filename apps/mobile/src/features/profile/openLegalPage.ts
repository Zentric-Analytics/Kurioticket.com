import * as WebBrowser from "expo-web-browser";
import { Alert } from "react-native";
import { PRIVACY_URL, TERMS_URL } from "../../config/legalUrls";

export const LEGAL_URLS = {
  terms: TERMS_URL,
  privacy: PRIVACY_URL,
} as const;

export type LegalPage = keyof typeof LEGAL_URLS;

let browserOpen = false;

export async function openLegalPage(page: LegalPage): Promise<void> {
  if (browserOpen) return;

  browserOpen = true;
  try {
    await WebBrowser.openBrowserAsync(LEGAL_URLS[page]);
  } catch {
    Alert.alert("Couldn't open this page", "Please try again.");
  } finally {
    browserOpen = false;
  }
}
