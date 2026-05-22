type RateLimitOptions = {
  action: string;
  email?: string;
  limit: number;
  windowMs: number;
  request?: Request;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
const maxBuckets = 10000;

export class AuthRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many attempts. Please wait and try again.");
    this.name = "AuthRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function checkAuthRateLimit(options: RateLimitOptions) {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const keys = getRateLimitKeys(options);
  let retryAfterSeconds = 0;

  for (const key of keys) {
    const bucket = buckets.get(key);

    if (bucket && bucket.resetAt > now && bucket.count >= options.limit) {
      retryAfterSeconds = Math.max(retryAfterSeconds, Math.ceil((bucket.resetAt - now) / 1000));
    }
  }

  if (retryAfterSeconds > 0) {
    throw new AuthRateLimitError(retryAfterSeconds);
  }

  for (const key of keys) {
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    } else {
      bucket.count += 1;
    }
  }

  if (buckets.size > maxBuckets) {
    pruneOldestBuckets();
  }
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

function getRateLimitKeys(options: RateLimitOptions) {
  const keys: string[] = [];

  if (options.request) {
    keys.push(`${options.action}:ip:${getClientIp(options.request)}`);
  }

  if (options.email) {
    keys.push(`${options.action}:email:${options.email.toLowerCase().trim()}`);
  }

  return keys.length ? keys : [`${options.action}:global`];
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function pruneOldestBuckets() {
  const keysToDelete = Array.from(buckets.entries())
    .sort(([, a], [, b]) => a.resetAt - b.resetAt)
    .slice(0, Math.ceil(maxBuckets / 10))
    .map(([key]) => key);

  for (const key of keysToDelete) {
    buckets.delete(key);
  }
}
