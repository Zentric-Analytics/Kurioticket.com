export type MobileApiSuccessBody<TData, TMeta = never> = [TMeta] extends [never]
  ? { data: TData }
  : { data: TData; meta: TMeta };

export type MobileApiError = {
  code: string;
  message: string;
  retryAfterSeconds?: number;
};

export type MobileApiErrorBody = {
  error: MobileApiError;
};

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

type JsonResponseInit = ResponseInit & {
  headers?: HeadersInit;
};

function withDefaultNoStoreHeaders(init?: JsonResponseInit): JsonResponseInit {
  const headers = new Headers(init?.headers);

  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", NO_STORE_HEADERS["Cache-Control"]);
  }

  return {
    ...init,
    headers,
  };
}

export function mobileApiSuccess<TData>(data: TData, init?: JsonResponseInit): Response;
export function mobileApiSuccess<TData, TMeta>(
  data: TData,
  init: JsonResponseInit | undefined,
  meta: TMeta,
): Response;
export function mobileApiSuccess<TData, TMeta>(
  data: TData,
  init?: JsonResponseInit,
  meta?: TMeta,
): Response {
  const body = meta === undefined ? { data } : { data, meta };

  return Response.json(body, withDefaultNoStoreHeaders({ status: 200, ...init }));
}

export function mobileApiError(error: MobileApiError, init?: JsonResponseInit): Response {
  const safeError: MobileApiError = {
    code: error.code,
    message: error.message,
  };

  if (error.retryAfterSeconds !== undefined) {
    safeError.retryAfterSeconds = error.retryAfterSeconds;
  }

  return Response.json(
    { error: safeError } satisfies MobileApiErrorBody,
    withDefaultNoStoreHeaders({ status: 500, ...init }),
  );
}
