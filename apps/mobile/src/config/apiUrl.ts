export type ApiBaseUrlResult =
  | { ok: true; baseUrl: string }
  | { ok: false; message: string };

export function normalizeApiBaseUrl(value: string | undefined): ApiBaseUrlResult {
  const trimmed = value?.trim();
  if (!trimmed) {
    return {
      ok: false,
      message:
        "Missing EXPO_PUBLIC_API_BASE_URL. Add it to apps/mobile/.env before starting Expo.",
    };
  }

  return { ok: true, baseUrl: trimmed.replace(/\/+$/, "") };
}

export function getApiBaseUrl(): ApiBaseUrlResult {
  return normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
}
