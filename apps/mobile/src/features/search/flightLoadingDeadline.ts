// The API owns a 35-second metasearch deadline. Keep a small UI settlement
// margin so the view, rather than an individual provider, remains bounded.
export const FLIGHT_LOADING_DEADLINE_MS = 37_000;

/** Keeps the results UI terminal even when a transport ignores cancellation. */
export function withinFlightLoadingDeadline<T>(
  task: Promise<T>,
  onTimeout: () => void,
  deadlineMs = FLIGHT_LOADING_DEADLINE_MS,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      onTimeout();
      reject(new Error("flight_loading_deadline"));
    }, deadlineMs);
  });
  return Promise.race([task, deadline]).finally(() => clearTimeout(timeout!));
}
