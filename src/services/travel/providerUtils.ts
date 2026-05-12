import type { ProviderResult } from "@/lib/types";

export async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 240)}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function runProvider<T>(
  provider: string,
  task: () => Promise<T[]>,
): Promise<ProviderResult<T>> {
  const startedAt = Date.now();

  try {
    const results = await task();
    return {
      provider,
      results,
      status: "success",
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    console.error(`[travel:${provider}]`, message);
    return {
      provider,
      results: [],
      status: "failed",
      latencyMs: Date.now() - startedAt,
      error: message,
    };
  }
}

export function skippedProvider<T>(provider: string, reason: string): ProviderResult<T> {
  return {
    provider,
    results: [],
    status: "skipped",
    latencyMs: 0,
    error: reason,
  };
}
