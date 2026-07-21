import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export const ONBOARDING_COMPLETED_KEY = "kurioticket.onboarding.completed.v1";
const COMPLETED_VALUE = "completed";

type WebStorageLike = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void };

function getWebStorage(): WebStorageLike | null {
  const candidate = (globalThis as { localStorage?: WebStorageLike }).localStorage;
  return candidate && typeof candidate.getItem === "function" && typeof candidate.setItem === "function" ? candidate : null;
}

export async function readOnboardingCompleted(): Promise<boolean> {
  if (Platform.OS === "web") {
    return getWebStorage()?.getItem(ONBOARDING_COMPLETED_KEY) === COMPLETED_VALUE;
  }

  const stored = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
  return stored === COMPLETED_VALUE;
}

export async function writeOnboardingCompleted(): Promise<void> {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(ONBOARDING_COMPLETED_KEY, COMPLETED_VALUE);
    return;
  }

  await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, COMPLETED_VALUE);
}

export function resetOnboardingStorageForTests() {
  getWebStorage()?.setItem(ONBOARDING_COMPLETED_KEY, "");
}
