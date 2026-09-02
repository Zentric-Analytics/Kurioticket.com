import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const keyForUser = (userId: string) => `kurioticket.profile-name.v1.${encodeURIComponent(userId)}`;
const memory = new Map<string, string | null>();

function webStorage() {
  return (globalThis as { localStorage?: Storage }).localStorage;
}

export function peekProfileName(userId: string): string | null | undefined {
  return memory.get(userId);
}

export async function readProfileName(userId: string): Promise<string | null> {
  if (memory.has(userId)) return memory.get(userId) ?? null;
  const key = keyForUser(userId);
  const value = Platform.OS === "web" ? webStorage()?.getItem(key) ?? null : await SecureStore.getItemAsync(key);
  const normalized = value?.trim() || null;
  memory.set(userId, normalized);
  return normalized;
}

export async function writeProfileName(userId: string, name: string | null): Promise<void> {
  const normalized = name?.trim() || null;
  memory.set(userId, normalized);
  const key = keyForUser(userId);
  if (Platform.OS === "web") {
    if (normalized) webStorage()?.setItem(key, normalized);
    else webStorage()?.removeItem(key);
    return;
  }
  if (normalized) await SecureStore.setItemAsync(key, normalized, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  else await SecureStore.deleteItemAsync(key);
}
