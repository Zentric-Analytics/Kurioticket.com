export const ONBOARDING_COMPLETED_KEY = "kurioticket.onboarding.completed.v1";
const COMPLETED_VALUE = "completed";
let memoryValue: string | null = null;

type StorageLike = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void };

function getStorage(): StorageLike | null {
  const candidate = (globalThis as { localStorage?: StorageLike }).localStorage;
  return candidate && typeof candidate.getItem === "function" && typeof candidate.setItem === "function" ? candidate : null;
}

export async function readOnboardingCompleted(): Promise<boolean> {
  const stored = getStorage()?.getItem(ONBOARDING_COMPLETED_KEY) ?? memoryValue;
  return stored === COMPLETED_VALUE;
}

export async function writeOnboardingCompleted(): Promise<void> {
  const storage = getStorage();
  if (storage) storage.setItem(ONBOARDING_COMPLETED_KEY, COMPLETED_VALUE);
  memoryValue = COMPLETED_VALUE;
}

export function resetOnboardingStorageForTests() { memoryValue = null; }
