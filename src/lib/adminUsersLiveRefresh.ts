export const adminUsersRefreshIntervalMs = 15_000;
export const adminUsersRefreshProbeTimeoutMs = 8_000;
export const adminUsersRefreshQuietMs = 1_500;

export type AdminUsersRefreshAvailability = "ready" | "hidden" | "offline" | "interacting" | "pending";
export type AdminUsersRefreshState = "live" | "updating" | "offline" | "delayed" | "authorization";
export type AdminUsersRefreshProbe = "ready" | "unauthorized";

/** Online Users owns its presence poll; Bots are outside the Users refresh scope. */
export function isAdminUsersRefreshPath(pathname: string) {
  return (pathname === "/admin/users" || pathname.startsWith("/admin/users/"))
    && pathname !== "/admin/users/online"
    && pathname !== "/admin/users/bots" && !pathname.startsWith("/admin/users/bots/");
}

export async function probeAdminUsersRefresh(signal: AbortSignal, request: typeof fetch = fetch): Promise<AdminUsersRefreshProbe> {
  const response = await request("/api/admin/users/live-refresh", {
    credentials: "same-origin", cache: "no-store", referrerPolicy: "same-origin", signal,
    headers: { Accept: "application/json" },
  });
  if (response.status === 401 || response.status === 403) return "unauthorized";
  if (!response.ok || response.redirected) throw new Error("Users refresh unavailable");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || (body as { ok?: unknown }).ok !== true) {
    throw new Error("Invalid Users refresh response");
  }
  return "ready";
}

type Dependencies = {
  intervalMs?: number;
  availability: () => AdminUsersRefreshAvailability;
  probe: (signal: AbortSignal) => Promise<AdminUsersRefreshProbe>;
  /** Resolves after the current React server refresh settles, not when it starts. */
  refresh: () => Promise<void>;
  unauthorized: () => void;
  state: (state: AdminUsersRefreshState) => void;
  schedule?: (callback: () => void, milliseconds: number) => unknown;
  cancel?: (timer: unknown) => void;
};

/** One request/transition at a time. A late or aborted response cannot refresh a new route. */
export function createAdminUsersRefreshController(dependencies: Dependencies) {
  const intervalMs = dependencies.intervalMs ?? adminUsersRefreshIntervalMs;
  const schedule = dependencies.schedule ?? ((callback, delay) => setTimeout(callback, delay));
  const cancel = dependencies.cancel ?? (timer => clearTimeout(timer as ReturnType<typeof setTimeout>));
  let timer: unknown;
  let deadline: unknown;
  let inFlight: AbortController | null = null;
  let disposed = false;
  let blocked = false;
  let resumed = false;
  let failures = 0;

  function clearTimer() {
    if (timer !== undefined) cancel(timer);
    timer = undefined;
  }
  function clearDeadline() {
    if (deadline !== undefined) cancel(deadline);
    deadline = undefined;
  }
  function later(delay: number) {
    clearTimer();
    if (disposed || blocked || inFlight) return;
    const availability = dependencies.availability();
    if (availability === "hidden" || availability === "offline") {
      if (availability === "offline") dependencies.state("offline");
      return;
    }
    timer = schedule(() => { timer = undefined; void run(); }, delay);
  }
  async function run() {
    if (disposed || blocked || inFlight) return;
    clearTimer();
    const availability = dependencies.availability();
    if (availability !== "ready") {
      if (availability === "offline") dependencies.state("offline");
      if (availability === "interacting" || availability === "pending") later(1_000);
      return;
    }
    resumed = false;
    const controller = new AbortController();
    inFlight = controller;
    let timedOut = false;
    deadline = schedule(() => { timedOut = true; controller.abort(); }, adminUsersRefreshProbeTimeoutMs);
    let nextDelay = intervalMs;
    try {
      const response = await dependencies.probe(controller.signal);
      clearDeadline();
      if (disposed) return;
      if (controller.signal.aborted) {
        if (timedOut) throw new Error("Users refresh timed out");
        return;
      }
      if (response === "unauthorized") {
        blocked = true;
        dependencies.state("authorization");
        // Let the existing page/session guard handle the redirect exactly once.
        dependencies.unauthorized();
        return;
      }
      // Focus, navigation, visibility and connectivity can change during a probe.
      if (dependencies.availability() !== "ready") { nextDelay = 1_000; return; }
      dependencies.state("updating");
      await dependencies.refresh();
      if (!disposed && !controller.signal.aborted) {
        failures = 0;
        dependencies.state("live");
      }
    } catch {
      if (!disposed && (!controller.signal.aborted || timedOut)) {
        failures += 1;
        nextDelay = Math.min(60_000, intervalMs * 2 ** Math.min(failures, 2));
        dependencies.state(dependencies.availability() === "offline" ? "offline" : "delayed");
      }
    } finally {
      clearDeadline();
      if (inFlight === controller) inFlight = null;
      if (!disposed && !blocked) later(resumed ? 0 : nextDelay);
    }
  }
  return {
    start() { later(intervalMs); },
    /** Visibility/network recovery coalesces with any still-settling refresh. */
    resume() {
      if (disposed || blocked) return;
      clearTimer();
      const availability = dependencies.availability();
      if (availability === "hidden" || availability === "offline") {
        clearDeadline();
        inFlight?.abort();
        if (availability === "offline") dependencies.state("offline");
        return;
      }
      if (inFlight) { resumed = true; return; }
      void run();
    },
    dispose() { disposed = true; clearTimer(); clearDeadline(); inFlight?.abort(); },
  };
}
