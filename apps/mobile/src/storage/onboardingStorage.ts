import { loadOptionalModule } from "../native/optionalModules";

export const ONBOARDING_COMPLETED_KEY = "kurioticket.onboarding.completed.v1";
const COMPLETED_VALUE = "completed";
let memoryValue: string | null = null;

type SecureStoreLike = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
};

type WebStorageLike = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void };

function getSecureStore(): SecureStoreLike | null {
  return loadOptionalModule<SecureStoreLike>("expo-secure-store");
}

function getWebStorage(): WebStorageLike | null {
  const candidate = (globalThis as { localStorage?: WebStorageLike }).localStorage;
  return candidate && typeof candidate.getItem === "function" && typeof candidate.setItem === "function" ? candidate : null;
}

export async function readOnboardingCompleted(): Promise<boolean> {
  const secureStore = getSecureStore();
  if (secureStore) {
    const stored = await secureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
    return stored === COMPLETED_VALUE;
  }

  const stored = getWebStorage()?.getItem(ONBOARDING_COMPLETED_KEY) ?? memoryValue;
  return stored === COMPLETED_VALUE;
}

export async function writeOnboardingCompleted(): Promise<void> {
  const secureStore = getSecureStore();
  if (secureStore) await secureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, COMPLETED_VALUE);
  else getWebStorage()?.setItem(ONBOARDING_COMPLETED_KEY, COMPLETED_VALUE);
  memoryValue = COMPLETED_VALUE;
}

export function resetOnboardingStorageForTests() { memoryValue = null; }
