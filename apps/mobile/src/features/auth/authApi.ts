import { getApiBaseUrl } from "../../config/apiUrl";
import { readSession, writeSession } from "../../storage/sessionStorage";

export class AuthApiError extends Error {
  constructor(message: string, public status = 0, public code = "") { super(message); }
}
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBaseUrl();
  if (!base.ok) throw new AuthApiError(base.message);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${base.baseUrl}/api/mobile/v1/auth/${path}`, {
      ...options, signal: controller.signal, headers: { Accept: "application/json", "Content-Type": "application/json", ...options.headers },
    });
    const json = await response.json().catch(() => ({})) as { error?: string; code?: string };
    if (!response.ok) throw new AuthApiError(json.error || "Something went wrong. Please try again.", response.status, json.code || "");
    return json as T;
  } catch (error) {
    if (error instanceof AuthApiError) throw error;
    throw new AuthApiError("Check your connection and try again.");
  } finally { clearTimeout(timer); }
}
export const authApi = {
  requestCode: (email: string) => request<{ cooldownSeconds: number }>("request-code", { method: "POST", body: JSON.stringify({ email }) }),
  verifyCode: (email: string, code: string) => request<{ accountType: "existing" | "new"; verificationToken: string }>("verify-code", { method: "POST", body: JSON.stringify({ email, code }) }),
  password: async (email: string, password: string) => {
    const result = await request<{ session: { token: string; expires: string }; user: { id: string; email: string; name?: string | null } }>("password", { method: "POST", body: JSON.stringify({ email, password }) });
    await writeSession({ ...result.session, user: result.user }); return result;
  },
  register: async (input: { email: string; name: string; phone?: string; verificationToken: string }) => {
    const result = await request<{ session: { token: string; expires: string }; user: { id: string; email: string; name?: string | null } }>("register", { method: "POST", body: JSON.stringify(input) });
    await writeSession({ ...result.session, user: result.user }); return result;
  },
  google: async (idToken: string, nonce: string) => {
    const result = await request<{ session: { token: string; expires: string }; user: { id: string; email: string; name?: string | null } }>("google", { method: "POST", body: JSON.stringify({ idToken, nonce }) });
    await writeSession({ ...result.session, user: result.user }); return result;
  },
  forgotPassword: (email: string) => request<{ ok: true }>("forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
};
export async function restoreAuthenticatedSession() {
  const session = await readSession();
  if (!session) return false;
  try {
    await request("session", { headers: { Authorization: `Bearer ${session.token}` } });
    return true;
  } catch { return false; }
}
