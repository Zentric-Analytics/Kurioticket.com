import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "kurioticket.auth.session.v1";
type StoredSession = { token: string; expires: string; user: { id: string; email: string; name?: string | null } };

function webStorage() { return (globalThis as { localStorage?: Storage }).localStorage; }
export async function writeSession(session: StoredSession) {
  const value = JSON.stringify(session);
  if (Platform.OS === "web") webStorage()?.setItem(SESSION_KEY, value);
  else await SecureStore.setItemAsync(SESSION_KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
export async function readSession(): Promise<StoredSession | null> {
  const value = Platform.OS === "web" ? webStorage()?.getItem(SESSION_KEY) : await SecureStore.getItemAsync(SESSION_KEY);
  if (!value) return null;
  try {
    const session = JSON.parse(value) as StoredSession;
    if (!session.token || new Date(session.expires) <= new Date()) return null;
    return session;
  } catch { return null; }
}
export async function clearSession() {
  if (Platform.OS === "web") webStorage()?.removeItem(SESSION_KEY);
  else await SecureStore.deleteItemAsync(SESSION_KEY);
}
