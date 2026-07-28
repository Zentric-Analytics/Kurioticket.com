export type HomepageFareStatusLoadState<T> = {
  data: T | null;
  loading: boolean;
  error: string;
  stale: boolean;
  lastSuccessfulLoadAt: string | null;
};

export function markHomepageFareStatusRequestStarted<T>(
  state: HomepageFareStatusLoadState<T>,
): HomepageFareStatusLoadState<T> {
  return { ...state, loading: true, error: "" };
}

export function markHomepageFareStatusRequestSucceeded<T>(
  data: T,
  loadedAt: string,
): HomepageFareStatusLoadState<T> {
  return {
    data,
    loading: false,
    error: "",
    stale: false,
    lastSuccessfulLoadAt: loadedAt,
  };
}

export function markHomepageFareStatusRequestFailed<T>(
  state: HomepageFareStatusLoadState<T>,
  error: string,
): HomepageFareStatusLoadState<T> {
  return {
    ...state,
    loading: false,
    error,
    stale: state.data !== null,
  };
}

type StatusRequestCallbacks<T> = {
  request: (signal: AbortSignal) => Promise<T>;
  onStart: () => void;
  onSuccess: (value: T) => void;
  onError: () => void;
};

export function createHomepageFareStatusRequestCoordinator() {
  let active = true;
  let requestId = 0;
  let controller: AbortController | null = null;

  return {
    activate() {
      active = true;
    },
    isRequestActive() {
      return controller !== null;
    },
    async run<T>({
      request,
      onStart,
      onSuccess,
      onError,
    }: StatusRequestCallbacks<T>) {
      if (!active) return;

      const currentRequestId = ++requestId;
      controller?.abort();
      const currentController = new AbortController();
      controller = currentController;
      onStart();

      try {
        const value = await request(currentController.signal);
        if (
          active &&
          currentRequestId === requestId &&
          !currentController.signal.aborted
        ) {
          onSuccess(value);
        }
      } catch (error) {
        if (
          active &&
          currentRequestId === requestId &&
          !currentController.signal.aborted &&
          !isAbortError(error)
        ) {
          onError();
        }
      } finally {
        if (currentRequestId === requestId) controller = null;
      }
    },
    dispose() {
      active = false;
      requestId += 1;
      controller?.abort();
      controller = null;
    },
  };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
