export type ApiBaseUrlResult =
  | { ok: true; baseUrl: string }
  | { ok: false; message: string };

export function normalizeApiBaseUrl(value: string | undefined): ApiBaseUrlResult {
  const trimmed = value?.trim();
  if (!trimmed) return { ok: false, message: "Kurioticket is unavailable right now." };
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, message: "Kurioticket is unavailable right now." };
    url.pathname = url.pathname.replace(/\/+$/, "");
    return { ok: true, baseUrl: url.toString().replace(/\/+$/, "") };
  } catch { return { ok: false, message: "Kurioticket is unavailable right now." }; }
}

export function getApiBaseUrl(platform?: string, isDevelopment = true): ApiBaseUrlResult {
  const result = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (!result.ok) return result;
  const url = new URL(result.baseUrl);
  if (platform === "android" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    return { ok: false, message: "The Android app cannot reach its configured API server." };
  }
  if (!isDevelopment && url.protocol !== "https:") {
    return { ok: false, message: "Kurioticket requires a secure API connection." };
  }
  return result;
}
