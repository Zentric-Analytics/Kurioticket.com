export type UpdateClient = {
  isEnabled: boolean;
  checkForUpdateAsync: () => Promise<{ isAvailable: boolean }>;
  fetchUpdateAsync: () => Promise<{ isNew: boolean }>;
  reloadAsync: () => Promise<void>;
};

export type UpdateCheckResult = "disabled" | "current" | "reloading" | "timeout" | "error";
export type UpdateAppState = "active" | "background" | "inactive" | "unknown" | "extension";

export async function ensureLatestUpdate(client: UpdateClient, timeoutMs = 8_000): Promise<UpdateCheckResult> {
  if (!client.isEnabled) return "disabled";

  let expired = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<UpdateCheckResult>((resolve) => {
    timeout = setTimeout(() => {
      expired = true;
      resolve("timeout");
    }, timeoutMs);
  });

  const update = (async (): Promise<UpdateCheckResult> => {
    try {
      const check = await client.checkForUpdateAsync();
      if (!check.isAvailable || expired) return expired ? "timeout" : "current";

      const fetched = await client.fetchUpdateAsync();
      if (!fetched.isNew || expired) return expired ? "timeout" : "current";

      await client.reloadAsync();
      return "reloading";
    } catch {
      return expired ? "timeout" : "error";
    }
  })();

  const result = await Promise.race([update, deadline]);
  if (timeout) clearTimeout(timeout);
  return result;
}

export function createForegroundUpdateHandler(
  runUpdate: () => Promise<unknown>,
  initialState: UpdateAppState | null,
) {
  let foregroundCheckArmed = initialState === "background" || initialState === "inactive";
  let inFlight = false;

  return (nextState: UpdateAppState) => {
    if (nextState === "background" || nextState === "inactive") {
      foregroundCheckArmed = true;
      return;
    }

    if (nextState !== "active" || !foregroundCheckArmed || inFlight) return;

    foregroundCheckArmed = false;
    inFlight = true;
    void runUpdate()
      .catch(() => undefined)
      .finally(() => {
        inFlight = false;
      });
  };
}
