import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { publishSession, getSessionRevision, subscribeSession as subscribeStoredSession } from "./sessionEvents";

const SESSION_KEY = "kurioticket.auth.session.v1";
export type StoredSession = { token: string; expires: string; recovery?: { deadline: string }; user: { id: string; email: string; name?: string | null } };
export { subscribeStoredSession };

let writes = Promise.resolve();
let restrictedSession: StoredSession | null | undefined;

function serializeWrite<T>(action: () => Promise<T>): Promise<T> {
  const operation = writes.then(action);
  writes = operation.then(() => undefined, () => undefined);
  return operation;
}

function webStorage() { return (globalThis as { localStorage?: Storage }).localStorage; }

async function persistSession(session: StoredSession | null) {
  if (session) {
    const value = JSON.stringify(session);
    if (Platform.OS === "web") webStorage()?.setItem(SESSION_KEY, value);
    else await SecureStore.setItemAsync(SESSION_KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  } else if (Platform.OS === "web") webStorage()?.removeItem(SESSION_KEY);
  else await SecureStore.deleteItemAsync(SESSION_KEY);
}

export function writeSession(session: StoredSession) {
  return serializeWrite(async () => {
    await persistSession(session);
    restrictedSession = undefined;
    publishSession(session);
  });
}

export async function readStoredSession(): Promise<StoredSession | null> {
  if (restrictedSession !== undefined) return restrictedSession;
  const revision = getSessionRevision();
  const value = Platform.OS === "web" ? webStorage()?.getItem(SESSION_KEY) : await SecureStore.getItemAsync(SESSION_KEY);
  if (revision !== getSessionRevision()) return readStoredSession();
  if (!value) return null;
  try {
    const session = JSON.parse(value) as StoredSession;
    // Keep the restricted view available after credential expiry so it can
    // offer fresh sign-in without restoring the ordinary navigation.
    return session.token ? session : null;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<StoredSession | null> {
  const session = await readStoredSession();
  return session && !session.recovery && Date.parse(session.expires) > Date.now() ? session : null;
}

export function subscribeSession(listener: (session: StoredSession | null) => void) {
  return subscribeStoredSession(session => listener(session?.recovery ? null : session));
}

export function clearSession(expectedOrdinaryToken?: string) {
  return serializeWrite(async () => {
    if (expectedOrdinaryToken && (await readSession())?.token !== expectedOrdinaryToken) return;
    await persistSession(null);
    restrictedSession = undefined;
    publishSession(null);
  });
}

/** Apply revocation to the bearer that made the request. Keep a restricted
 * candidate only for the recovery endpoint to verify independently. */
export function applySessionRevocation(token: string, recovery?: StoredSession["recovery"]) {
  return serializeWrite(async () => {
    const session = await readStoredSession();
    if (!session || session.token !== token || session.recovery) return session;
    const next = recovery ? { ...session, recovery } : null;
    // Mask ordinary access before doing asynchronous native storage work.
    restrictedSession = next;
    publishSession(next, session.user.id);
    try {
      await persistSession(next);
      restrictedSession = undefined;
    } catch {
      // The process still denies ordinary access and bootstrap verifies the
      // persisted bearer server-side if secure storage cannot be updated.
      await persistSession(null).catch(() => undefined);
    }
    return next;
  });
}

function updateOrdinarySession(expectedUserId: string, update: (session: StoredSession) => StoredSession) {
  return serializeWrite(async () => {
    const session = await readSession();
    if (!session || session.user.id !== expectedUserId) return;
    const next = update(session);
    await persistSession(next);
    publishSession(next);
  });
}

export async function updateStoredSessionName(name: string | null, expectedUserId?: string) {
  if (!expectedUserId) return;
  await updateOrdinarySession(expectedUserId, session => ({ ...session, user: { ...session.user, name } }));
}

export async function updateStoredSessionEmail(email: string, expectedUserId: string) {
  await updateOrdinarySession(expectedUserId, session => ({ ...session, user: { ...session.user, email } }));
}
