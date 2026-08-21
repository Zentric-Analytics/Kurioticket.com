import * as assert from "node:assert/strict";
import { test } from "node:test";
import {
  createForegroundUpdateHandler,
  ensureLatestUpdate,
  type UpdateClient,
} from "./ensureLatestUpdate";

function client(overrides: Partial<UpdateClient> = {}): UpdateClient {
  return {
    isEnabled: true,
    checkForUpdateAsync: async () => ({ isAvailable: false }),
    fetchUpdateAsync: async () => ({ isNew: false }),
    reloadAsync: async () => undefined,
    ...overrides,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("skips update checks when expo-updates is disabled", async () => {
  let checked = false;
  const result = await ensureLatestUpdate(client({
    isEnabled: false,
    checkForUpdateAsync: async () => {
      checked = true;
      return { isAvailable: false };
    },
  }));
  assert.equal(result, "disabled");
  assert.equal(checked, false);
});

test("continues startup when the installed update is current", async () => {
  assert.equal(await ensureLatestUpdate(client()), "current");
});

test("downloads and reloads exactly once when a new update exists", async () => {
  let fetched = 0;
  let reloaded = 0;
  const result = await ensureLatestUpdate(client({
    checkForUpdateAsync: async () => ({ isAvailable: true }),
    fetchUpdateAsync: async () => {
      fetched += 1;
      return { isNew: true };
    },
    reloadAsync: async () => {
      reloaded += 1;
    },
  }));
  assert.equal(result, "reloading");
  assert.equal(fetched, 1);
  assert.equal(reloaded, 1);
});

test("continues startup safely when update services fail", async () => {
  const result = await ensureLatestUpdate(client({
    checkForUpdateAsync: async () => {
      throw new Error("offline");
    },
  }));
  assert.equal(result, "error");
});

test("does not reload after the startup deadline expires", async () => {
  let reloaded = false;
  const result = await ensureLatestUpdate(client({
    checkForUpdateAsync: async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { isAvailable: true };
    },
    reloadAsync: async () => {
      reloaded = true;
    },
  }), 5);
  assert.equal(result, "timeout");
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(reloaded, false);
});

test("checks for an update when the app returns to the foreground", async () => {
  let checks = 0;
  const handleStateChange = createForegroundUpdateHandler(async () => {
    checks += 1;
  }, "active");

  handleStateChange("background");
  assert.equal(checks, 0);

  handleStateChange("active");
  await flush();
  assert.equal(checks, 1);
});

test("does not duplicate the cold-start check when initial app state is unresolved", async () => {
  let checks = 0;
  const handleStateChange = createForegroundUpdateHandler(async () => {
    checks += 1;
  }, "unknown");

  handleStateChange("active");
  await flush();
  assert.equal(checks, 0);

  handleStateChange("background");
  handleStateChange("active");
  await flush();
  assert.equal(checks, 1);
});

test("does not start parallel update checks across rapid foreground transitions", async () => {
  let checks = 0;
  let releaseFirstCheck: (() => void) | undefined;
  const firstCheck = new Promise<void>((resolve) => {
    releaseFirstCheck = resolve;
  });
  const handleStateChange = createForegroundUpdateHandler(async () => {
    checks += 1;
    if (checks === 1) await firstCheck;
  }, "active");

  handleStateChange("background");
  handleStateChange("active");
  handleStateChange("inactive");
  handleStateChange("active");
  await flush();
  assert.equal(checks, 1);

  releaseFirstCheck?.();
  await flush();

  handleStateChange("background");
  handleStateChange("active");
  await flush();
  assert.equal(checks, 2);
});

test("foreground update failures do not block later resume checks", async () => {
  let checks = 0;
  const handleStateChange = createForegroundUpdateHandler(async () => {
    checks += 1;
    if (checks === 1) throw new Error("offline");
  }, "background");

  handleStateChange("active");
  await flush();
  assert.equal(checks, 1);

  handleStateChange("background");
  handleStateChange("active");
  await flush();
  assert.equal(checks, 2);
});
