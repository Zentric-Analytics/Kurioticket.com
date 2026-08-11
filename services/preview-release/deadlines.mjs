export const PROVIDER_REQUEST_TIMEOUT_MS = 30_000;
export const LOCAL_COMMAND_TIMEOUT_MS = 5 * 60_000;

export async function fetchWithDeadline(fetchImpl, url, init = {}, { timeoutMs = PROVIDER_REQUEST_TIMEOUT_MS, label = "Provider request" } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`${label} exceeded ${timeoutMs}ms.`)), timeoutMs);
  timer.unref?.();
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`${label} exceeded ${timeoutMs}ms.`, { cause: error });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function withDeadline(operation, timeoutMs, label) {
  let timer;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs}ms.`)), timeoutMs);
    timer.unref?.();
  });
  try { return await Promise.race([Promise.resolve().then(operation), expired]); }
  finally { clearTimeout(timer); }
}
