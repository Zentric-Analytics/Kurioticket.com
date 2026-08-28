import { Platform } from "react-native";
import { getApiBaseUrl } from "../config/apiUrl";
import { readSession } from "../storage/sessionStorage";
import { TravelApiError } from "./travelApi";

async function request<T>(body: Record<string, unknown>): Promise<T> {
  const base = getApiBaseUrl(Platform.OS, __DEV__);
  if (!base.ok) throw new TravelApiError(base.message, 0, "configuration");
  const session = await readSession().catch(() => null);
  const response = await fetch(`${base.baseUrl}/api/mobile/v1/security/password-reset`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Mobile-Platform": Platform.OS,
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : "Kurioticket could not complete this request.";
    throw new TravelApiError(message, response.status, response.status === 400 ? "validation" : response.status === 429 ? "rate-limit" : response.status >= 500 ? "server" : "network", data);
  }
  return data as T;
}

export const securityPasswordResetApi = {
  sendCode: () => request<{ ok: true; expiresInMinutes: number }>({ action: "send-code" }),
  reset: (body: { code: string; newPassword: string; confirmPassword: string }) => request<{ success: true }>({ action: "reset", ...body }),
};
