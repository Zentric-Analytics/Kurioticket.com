import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getApiBaseUrl } from "../../config/apiUrl";
import { readSession, subscribeSession } from "../../storage/sessionStorage";
import { VisitorIdentityCoordinator, type IdentitySession, type StoredVisitorIdentity } from "./visitorIdentityCoordinator";

const STORAGE_KEY = "kurioticket.analytics-visitor.v1";
const POLICY_VERSION = "analytics-visitor-v1";
const webStorage = () => (globalThis as { localStorage?: Storage }).localStorage;

async function readIdentity() {
  const value = Platform.OS === "web" ? webStorage()?.getItem(STORAGE_KEY) : await SecureStore.getItemAsync(STORAGE_KEY);
  return value ? JSON.parse(value) : null;
}

async function writeIdentity(value: StoredVisitorIdentity) {
  const encoded = JSON.stringify(value);
  if (Platform.OS === "web") {
    const storage = webStorage();
    if (!storage) throw new Error("Storage unavailable.");
    storage.setItem(STORAGE_KEY, encoded);
  } else await SecureStore.setItemAsync(STORAGE_KEY, encoded, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

async function identityRequest(path: "visitor" | "merge", method: "POST" | "DELETE", token: string | null, session: IdentitySession = null) {
  const base = getApiBaseUrl(Platform.OS, __DEV__);
  if (!base.ok) throw new Error("Analytics connection unavailable.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${base.baseUrl}/api/mobile/v1/identity/${path}`, {
      method,
      credentials: "omit",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Mobile-Platform": Platform.OS,
        ...(token ? { "x-kt-visitor": token } : {}),
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      ...(path === "visitor" && method === "POST" ? { body: JSON.stringify({ analytics: true, policyVersion: POLICY_VERSION }) } : {}),
    });
    if (!response.ok) throw new Error("Analytics connection unavailable.");
    return await response.json() as { visitorToken?: string; merged?: boolean; analyticsTracking?: string };
  } finally { clearTimeout(timeout); }
}

export const visitorIdentity = new VisitorIdentityCoordinator({
  read: readIdentity,
  write: writeIdentity,
  grant: async (token, session) => {
    const result = await identityRequest("visitor", "POST", token, session);
    if (result.analyticsTracking !== "enabled" || !result.visitorToken) throw new Error("Analytics connection unavailable.");
    return result.visitorToken;
  },
  merge: async (token, session) => {
    const result = await identityRequest("merge", "POST", token, session);
    return { merged: result.merged === true, visitorToken: result.visitorToken };
  },
  withdraw: async token => {
    const result = await identityRequest("visitor", "DELETE", token);
    if (result.analyticsTracking !== "disabled") throw new Error("Analytics withdrawal is pending.");
  },
});

export function startVisitorIdentity() {
  let sessionEvents = 0;
  let active = true;
  const unsubscribe = subscribeSession(session => { sessionEvents += 1; void visitorIdentity.transition(session); });
  const refresh = async () => {
    const revision = sessionEvents;
    const session = await readSession().catch(() => null);
    if (!active || revision !== sessionEvents) return;
    await visitorIdentity.transition(session);
    await visitorIdentity.refresh();
  };
  void refresh();
  const subscription = AppState.addEventListener("change", state => { if (state === "active") void refresh(); });
  return () => { active = false; unsubscribe(); subscription.remove(); };
}
