import { Client } from "pg";

import { DatabaseUnavailableError, getDatabaseUrl } from "@/lib/prisma";

const HOMEPAGE_FARE_REFRESH_LOCK_KEY = "kurioticket-homepage-fare-refresh-v1";

type RefreshLockClient = {
  connect(): Promise<void>;
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Array<{ acquired?: boolean }> }>;
  end(): Promise<void>;
};

type RefreshLockClientFactory = (connectionString: string) => RefreshLockClient;

export class HomepageFareRefreshInProgressError extends Error {
  constructor() {
    super("Homepage fare refresh is already running.");
    this.name = "HomepageFareRefreshInProgressError";
  }
}

export async function withHomepageFareRefreshLock<T>(
  task: () => Promise<T>,
  clientFactory: RefreshLockClientFactory = (connectionString) =>
    new Client({ connectionString }) as unknown as RefreshLockClient,
): Promise<T> {
  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING?.trim() || getDatabaseUrl();
  if (!connectionString) {
    throw new DatabaseUnavailableError(
      "Homepage fare refresh requires an available database.",
    );
  }

  const client = clientFactory(connectionString);
  let acquired = false;

  await client.connect();

  try {
    const result = await client.query(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS acquired",
      [HOMEPAGE_FARE_REFRESH_LOCK_KEY],
    );
    acquired = result.rows[0]?.acquired === true;

    if (!acquired) {
      throw new HomepageFareRefreshInProgressError();
    }

    return await task();
  } finally {
    if (acquired) {
      try {
        await client.query(
          "SELECT pg_advisory_unlock(hashtext($1))",
          [HOMEPAGE_FARE_REFRESH_LOCK_KEY],
        );
      } catch (error) {
        console.error("[homepage-fares:refresh-lock-release]", {
          errorName: error instanceof Error ? error.name : "unknown",
        });
      }
    }

    try {
      await client.end();
    } catch (error) {
      console.error("[homepage-fares:refresh-lock-close]", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
    }
  }
}
