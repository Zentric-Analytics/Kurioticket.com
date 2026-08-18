export const FLIGHT_LOADING_DEADLINE_MS = 22_000;

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
