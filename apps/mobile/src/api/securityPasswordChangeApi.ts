import { Platform } from "react-native";
import { getApiBaseUrl } from "../config/apiUrl";
import { readSession } from "../storage/sessionStorage";
import { TravelApiError } from "./travelApi";

export type PasswordChangeChallenge = {
  kind: "issued";
  challengeId: string;
  maskedEmail: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

export type PasswordChangeStatus = {
  failureCount: number;
  recoveryAvailable: boolean;
};

async function request<T>(method: "GET" | "PATCH", body?: Record<string, unknown>): Promise<T> {
  const base = getApiBaseUrl(Platform.OS, __DEV__);
  if (!base.ok) throw new TravelApiError(base.message, 0, "configuration");
  const session = await readSession().catch(() => null);
  const response = await fetch(`${base.baseUrl}/api/mobile/v1/security/password`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Mobile-Platform": Platform.OS,
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : "Kurioticket could not complete this request.";
    const error = new TravelApiError(
      message,
      response.status,
      response.status === 400 ? "validation" : response.status === 429 ? "rate-limit" : response.status >= 500 ? "server" : "network",
      data,
    );
    (error as TravelApiError & { retryAfterSeconds?: number }).retryAfterSeconds = Number(response.headers.get("retry-after") || 0) || undefined;
    throw error;
  }
  return data as T;
}

export const securityPasswordChangeApi = {
  status: () => request<PasswordChangeStatus>("GET"),
  start: (body: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    request<PasswordChangeChallenge>("PATCH", { action: "start", ...body }),
  resend: (body: { challengeId: string; newPassword: string }) =>
    request<PasswordChangeChallenge>("PATCH", { action: "resend", ...body }),
  confirm: (body: { challengeId: string; code: string; newPassword: string; confirmPassword: string }) =>
    request<{ success: true }>("PATCH", { action: "confirm", ...body }),
};
