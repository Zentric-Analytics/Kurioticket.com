import Constants from "expo-constants";
import { Platform } from "react-native";
import { getApiBaseUrl } from "../../config/apiUrl";
import { applySessionRevocation, clearSession, readSession, readStoredSession, writeSession, type StoredSession } from "../../storage/sessionStorage";
import { completePreviewPasskeySignIn, isIOSPreviewPasskeyEnabled, safePasskeyFailureDetails, type PasskeyDiagnosticStage } from "./previewPasskeySignIn";

export const isPreviewPasskeySignIn = () => isIOSPreviewPasskeyEnabled(Platform.OS, Constants.expoConfig?.extra?.environment?.isPreview);
export function tracePreviewPasskey(stage: PasskeyDiagnosticStage, error?: unknown) {
  if (!isPreviewPasskeySignIn()) return;
  // No assertion bytes, credential IDs, user data, tokens or raw error messages.
  console.info("[passkey-sign-in]", { stage, ...(error instanceof AuthApiError ? safePasskeyFailureDetails(error.status, error.code) : {}) });
}

export type PasskeyAuthenticationOptions = { challenge: string; rpId: string; timeout: number; userVerification: "required" };
export type PasskeyAssertion = import("../passkeys/nativePasskeys").NormalizedPasskeyAssertion;

type AuthResult = { session: { token: string; expires: string; recovery?: { deadline: string } }; user: { id: string; email: string; name?: string | null } } | { requiresTwoFactor: true; challengeToken: string; expiresAt: string };
type SessionStatus = { user: { id: string }; expires: string; recovery?: { deadline: string } };

export class AuthApiError extends Error {
  constructor(message: string, public status = 0, public code = "") { super(message); }
}
async function request<T>(path: string, options: RequestInit = {}, externalSignal?: AbortSignal): Promise<T> {
  const base = getApiBaseUrl();
  if (!base.ok) throw new AuthApiError(base.message);
  const controller = new AbortController();
  const abort = () => controller.abort();
  externalSignal?.addEventListener("abort", abort, { once: true });
  if (externalSignal?.aborted) controller.abort();
  const timer = setTimeout(abort, 12000);
  try {
    const response = await fetch(`${base.baseUrl}/api/mobile/v1/auth/${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Mobile-Platform": Platform.OS,
        "X-Mobile-Recovery-Protocol": "1",
        ...(Constants.expoConfig?.version ? { "X-Mobile-App-Version": Constants.expoConfig.version } : {}),
        ...options.headers,
      },
    });
    const json = await response.json().catch(() => ({})) as { error?: string; code?: string };
    if (!response.ok) throw new AuthApiError(json.error || "Something went wrong. Please try again.", response.status, json.code || "");
    return json as T;
  } catch (error) {
    if (error instanceof AuthApiError) throw error;
    throw new AuthApiError("Check your connection and try again.");
  } finally { clearTimeout(timer); externalSignal?.removeEventListener("abort", abort); }
}
export const authApi = {
  recoveryStatus: async (expectedToken: string) => {
    const session = await readStoredSession();
    if (!session?.recovery || session.token !== expectedToken) throw new AuthApiError("Recovery sign-in expired. Sign in again.", 401);
    return checkSessionStatus(session);
  },
  passkeyOptions: (signal?: AbortSignal) => request<{ options: PasskeyAuthenticationOptions }>("passkey/options", { method: "POST", body: "{}" }, signal),
  passkeyVerify: async (assertion: PasskeyAssertion, signal?: AbortSignal) => {
    if (isPreviewPasskeySignIn()) {
      return completePreviewPasskeySignIn(assertion, {
        trace: tracePreviewPasskey,
        verify: (normalized) => request("passkey/verify", { method: "POST", body: JSON.stringify(normalized) }, signal),
        persist: async (result) => {
          if (signal?.aborted) throw new AuthApiError("Passkey sign-in cancelled.", 0, "ABORTED");
          await writeSession({ ...result.session, user: result.user });
          if (signal?.aborted) {
            await clearSession();
            throw new AuthApiError("Passkey sign-in cancelled.", 0, "ABORTED");
          }
        },
      });
    }
    const result = await request<{ session: { token: string; expires: string }; user: { id: string; email: string; name?: string | null } }>("passkey/verify", { method: "POST", body: JSON.stringify(assertion) }, signal);
    if (signal?.aborted) throw new AuthApiError("Passkey sign-in cancelled.", 0, "ABORTED");
    await writeSession({ ...result.session, user: result.user });
    if (signal?.aborted) {
      await clearSession();
      throw new AuthApiError("Passkey sign-in cancelled.", 0, "ABORTED");
    }
    return result;
  },
  requestCode: (email: string) => request<{ cooldownSeconds: number }>("request-code", { method: "POST", body: JSON.stringify({ email }) }),
  verifyCode: (email: string, code: string) => request<{ accountType: "existing" | "new"; verificationToken: string }>("verify-code", { method: "POST", body: JSON.stringify({ email, code }) }),
  password: async (email: string, password: string) => {
    const result = await request<AuthResult>("password", { method: "POST", body: JSON.stringify({ email, password }) });
    if ("session" in result) await writeSession({ ...result.session, user: result.user }); return result;
  },
  register: async (input: { email: string; name: string; phone?: string; verificationToken: string }) => {
    const result = await request<{ session: { token: string; expires: string }; user: { id: string; email: string; name?: string | null } }>("register", { method: "POST", body: JSON.stringify(input) });
    await writeSession({ ...result.session, user: result.user }); return result;
  },
  google: async (idToken: string, nonce: string) => {
    const result = await request<AuthResult>("google", { method: "POST", body: JSON.stringify({ idToken, nonce }) });
    if ("session" in result) await writeSession({ ...result.session, user: result.user }); return result;
  },
  twoFactor: async (challengeToken: string, code: string) => {
    const result = await request<{ session: { token: string; expires: string }; user: { id: string; email: string; name?: string | null } }>("two-factor", { method: "POST", body: JSON.stringify({ challengeToken, code }) });
    await writeSession({ ...result.session, user: result.user }); return result;
  },
  sendForgotPasswordCode: (email: string, verificationToken: string) => request<{ ok: true; expiresInMinutes: number }>("forgot-password", { method: "POST", body: JSON.stringify({ action: "send-code", email, verificationToken }) }),
  resetForgotPassword: (input: { email: string; code: string; newPassword: string; confirmPassword: string }) => request<{ success: true }>("forgot-password", { method: "POST", body: JSON.stringify({ action: "reset", ...input }) }),
  logout: async () => {
    const session = await readSession();
    if (!session) return;
    try { await request<{ ok: true }>("logout", { method: "POST", headers: { Authorization: `Bearer ${session.token}` } }); }
    finally { await clearSession(session.token); }
  },
};
async function checkSessionStatus(session: StoredSession) {
  const result = await request<SessionStatus>("session", { headers: { Authorization: `Bearer ${session.token}` } });
  if (result.user?.id !== session.user.id || !(Date.parse(result.expires) > Date.now()) ||
    (result.recovery && !(Date.parse(result.recovery.deadline) > Date.now()))) {
    throw new AuthApiError("Unable to verify sign-in.");
  }
  return result;
}

async function validateOrdinarySession(session: StoredSession): Promise<StoredSession | null> {
  if (!(Date.parse(session.expires) > Date.now())) return applySessionRevocation(session.token);
  try {
    const result = await checkSessionStatus(session);
    if (result.recovery) return applySessionRevocation(session.token, result.recovery);
    return session;
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 401) return applySessionRevocation(session.token);
    throw error;
  }
}

const sessionChecks = new Map<string, Promise<StoredSession | null>>();

export function reconcileOrdinarySession(session: StoredSession) {
  const existing = sessionChecks.get(session.token);
  if (existing) return existing;
  const pending = validateOrdinarySession(session).finally(() => sessionChecks.delete(session.token));
  sessionChecks.set(session.token, pending);
  return pending;
}

export async function restoreAuthenticatedSession() {
  const session = await readStoredSession();
  if (!session || session.recovery) return false;
  const verified = await reconcileOrdinarySession(session).catch(() => null);
  return Boolean(verified && !verified.recovery && verified.token === session.token);
}
