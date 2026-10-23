import assert from "node:assert/strict";
import test from "node:test";

import {
  HomepageFareRefreshInProgressError,
  withHomepageFareRefreshLock,
} from "@/services/homepageFareRefreshLock";

test("homepage fare refresh lock is database-backed and released after the task", async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://example.invalid/db";

  const queries: string[] = [];
  let ended = false;
  let taskRuns = 0;

  try {
    const result = await withHomepageFareRefreshLock(
      async () => {
        taskRuns += 1;
        return "ok";
      },
      () => ({
        async connect() {},
        async query(text) {
          queries.push(text);
          if (text.includes("pg_try_advisory_lock")) {
            return { rows: [{ acquired: true }] };
          }
          return { rows: [] };
        },
        async end() {
          ended = true;
        },
      }),
    );

    assert.equal(result, "ok");
    assert.equal(taskRuns, 1);
    assert.equal(queries.some((query) => query.includes("pg_try_advisory_lock")), true);
    assert.equal(queries.some((query) => query.includes("pg_advisory_unlock")), true);
    assert.equal(ended, true);
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});

test("homepage fare refresh lock rejects an overlapping run without executing the task", async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://example.invalid/db";
  let taskRuns = 0;
  let ended = false;

  try {
    await assert.rejects(
      () =>
        withHomepageFareRefreshLock(
          async () => {
            taskRuns += 1;
          },
          () => ({
            async connect() {},
            async query(text) {
              if (text.includes("pg_try_advisory_lock")) {
                return { rows: [{ acquired: false }] };
              }
              return { rows: [] };
            },
            async end() {
              ended = true;
            },
          }),
        ),
      (error: unknown) => error instanceof HomepageFareRefreshInProgressError,
    );

    assert.equal(taskRuns, 0);
    assert.equal(ended, true);
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});
