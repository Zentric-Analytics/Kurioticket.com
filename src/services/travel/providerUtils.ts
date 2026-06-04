import type {
  ProviderErrorCategory,
  ProviderErrorReason,
  ProviderResult,
} from "@/lib/types";

type ProviderErrorClassification = {
  category: ProviderErrorCategory;
  reason: ProviderErrorReason;
  message: string;
};

class ProviderHttpError extends Error {
  status: number;
  statusText: string;
  body: string;

  constructor(status: number, statusText: string, body: string) {
    super(`Provider HTTP ${status}`);
    this.name = "ProviderHttpError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 12000,
) {
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
      throw new ProviderHttpError(response.status, response.statusText, text);
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
    const classification = classifyProviderError(error);
    console.error(`[travel:${provider}]`, classification.message);
    return {
      provider,
      results: [],
      status: "failed",
      latencyMs: Date.now() - startedAt,
      error: classification.reason,
      errorCategory: classification.category,
      errorReason: classification.reason,
    };
  }
}

export function skippedProvider<T>(
  provider: string,
  reason: string,
): ProviderResult<T> {
  return {
    provider,
    results: [],
    status: "skipped",
    latencyMs: 0,
    error: reason,
  };
}

function classifyProviderError(error: unknown): ProviderErrorClassification {
  if (isAbortError(error)) {
    return {
      category: "timeout",
      reason: "provider_timeout",
      message: "Provider request timed out.",
    };
  }

  if (error instanceof ProviderHttpError) {
    return classifyProviderHttpError(error);
  }

  if (error instanceof SyntaxError) {
    return {
      category: "invalid_response",
      reason: "provider_invalid_response",
      message: "Provider returned an invalid response.",
    };
  }

  if (error instanceof TypeError) {
    return {
      category: "network",
      reason: "provider_network_error",
      message: "Provider request failed at the network layer.",
    };
  }

  return {
    category: "failed",
    reason: "provider_failed",
    message: "Provider request failed.",
  };
}

function classifyProviderHttpError(
  error: ProviderHttpError,
): ProviderErrorClassification {
  const body = error.body.toLowerCase();

  if (error.status === 401 || error.status === 403) {
    return {
      category: "auth",
      reason: "provider_auth_error",
      message: `Provider rejected authentication with HTTP ${error.status}.`,
    };
  }

  if (error.status >= 500) {
    return {
      category: "server",
      reason: "provider_server_error",
      message: `Provider returned HTTP ${error.status}.`,
    };
  }

  if (isNoInventoryProviderResponse(error.status, body)) {
    return {
      category: "no_inventory",
      reason: "provider_no_inventory",
      message: `Provider returned no available offers with HTTP ${error.status}.`,
    };
  }

  if (isRouteUnavailableProviderResponse(error.status, body)) {
    return {
      category: "route_unavailable",
      reason: "provider_route_unavailable",
      message: `Provider reported route unavailable with HTTP ${error.status}.`,
    };
  }

  return {
    category: "failed",
    reason: "provider_failed",
    message: `Provider returned HTTP ${error.status}.`,
  };
}

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function isNoInventoryProviderResponse(status: number, body: string) {
  if (!isClientProviderResponse(status)) return false;

  return (
    /\b(no|zero)\s+(offers?|availability|inventory|flights?|results?)\b/.test(
      body,
    ) ||
    /\b(offers?|availability|inventory|flights?|results?)\s+(not\s+found|unavailable|not\s+available)\b/.test(
      body,
    ) ||
    /\bno_offer(s)?\b/.test(body) ||
    /\bno_inventory\b/.test(body)
  );
}

function isRouteUnavailableProviderResponse(status: number, body: string) {
  if (!isClientProviderResponse(status)) return false;

  return (
    /\b(route|market|slice)\s+(not\s+found|unavailable|unsupported|not\s+supported|not\s+served)\b/.test(
      body,
    ) ||
    /\bunsupported\s+(route|market|slice)\b/.test(body) ||
    /\bno\s+(routes?|markets?)\b/.test(body) ||
    /\broute_unavailable\b/.test(body)
  );
}

function isClientProviderResponse(status: number) {
  return status === 400 || status === 404 || status === 422;
}
