import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type * as SessionStorage from "../../storage/sessionStorage";
import type * as Auth from "./authApi";
import type { travelApi as TravelApi } from "../../api/travelApi";

const ordinary = {
  token: "ordinary-fixture",
  expires: "2099-01-02T12:00:00.000Z",
  user: { id: "account", email: "account@example.test" },
};
const deadline = "2099-01-08T12:00:00.000Z";
const pending = { request: { id: "deletion", status: "PENDING", deletionScheduledAt: deadline } };
const deletionPath = "/api/mobile/v1/security/deletion-request";
const recoveryPath = `${deletionPath}/reactivate`;
const sessionPath = "/api/mobile/v1/auth/session";
const profilePath = "/api/mobile/v1/profile";

const files = ["storage/sessionEvents.ts", "storage/sessionStorage.ts", "features/auth/authApi.ts", "api/travelApi.ts"];
const compiled = new Map(files.map(file => [file, ts.transpileModule(readFileSync(`src/${file}`, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText]));

function native(
  platform: "ios" | "android",
  disk: Map<string, string>,
  respond: (path: string, init: RequestInit) => Response | Promise<Response>,
  beforeWrite?: (session: SessionStorage.StoredSession) => Promise<void>,
) {
  function load<T>(file: string, modules: Record<string, unknown> = {}): T {
    const exports = {};
    runInNewContext(compiled.get(file)!, {
      exports,
      require: (name: string) => {
        assert.ok(name in modules, `Unexpected dependency ${name}`);
        return modules[name];
      },
      fetch: (url: string, init: RequestInit) => respond(new URL(url).pathname, init),
      __DEV__: false, AbortController, Date, performance, setTimeout, clearTimeout, console,
    });
    return exports as T;
  }
  const config = { getApiBaseUrl: () => ({ ok: true, baseUrl: "https://kurioticket.test" }) };
  const reactNative = { Platform: { OS: platform } };
  const constants = { default: { expoConfig: { version: "0.3.0" } } };
  const storage = load<typeof SessionStorage>("storage/sessionStorage.ts", {
    "react-native": reactNative,
    "expo-secure-store": {
      getItemAsync: async (key: string) => disk.get(key) ?? null,
      setItemAsync: async (key: string, data: string) => { await beforeWrite?.(JSON.parse(data)); disk.set(key, data); },
      deleteItemAsync: async (key: string) => { disk.delete(key); },
    },
    "./sessionEvents": load("storage/sessionEvents.ts"),
  });
  const auth = load<typeof Auth>("features/auth/authApi.ts", {
    "expo-constants": constants,
    "react-native": reactNative,
    "../../config/apiUrl": config,
    "../../storage/sessionStorage": storage,
    "./previewPasskeySignIn": {},
  });
  const { travelApi } = load<{ travelApi: typeof TravelApi }>("api/travelApi.ts", {
    "../config/apiUrl": config,
    "../storage/sessionStorage": storage,
    "react-native": reactNative,
    "expo-constants": constants,
    "expo-crypto": {},
    "./exploreCatalogueContract": {},
    "../features/search/flightSearchDiagnostics": {},
    "../features/privacy/visitorIdentity": {
      visitorIdentity: { headers: async () => ({}), trackingContext: () => null },
    },
    "../features/privacy/journeyResponseContext": {},
    "../features/auth/authApi": auth,
    "../../../../src/lib/providerHandoffClient": {},
  });
  return { storage, auth, travelApi };
}

for (const platform of ["ios", "android"] as const) {
  test(`${platform} confirms deletion, removes ordinary scope immediately and keeps recovery across restart`, async () => {
    const disk = new Map<string, string>();
    const calls: Array<[string, string | null]> = [];
    const respond = (path: string, init: RequestInit) => {
      calls.push([path, new Headers(init.headers).get("Authorization")]);
      if (path === deletionPath) {
        assert.deepEqual(JSON.parse(String(init.body)), { confirmed: true });
        return Response.json(pending, { status: 201 });
      }
      if (path === sessionPath) return Response.json({ user: ordinary.user, expires: ordinary.expires, recovery: { deadline } });
      if (path === recoveryPath) return Response.json({ success: true, request: { status: "CANCELLED" } });
      return Response.json({ error: "Authentication required." }, { status: 401 });
    };
    const app = native(platform, disk, respond);
    await app.storage.writeSession(ordinary);
    const observed: Array<string | null> = [];
    app.storage.subscribeSession(session => observed.push(session?.token ?? null));
    await app.travelApi.requestDeletion();
    assert.deepEqual(observed, [null]);
    assert.equal(await app.storage.readSession(), null);
    assert.equal((await app.storage.readStoredSession())?.recovery?.deadline, deadline);
    await assert.rejects(app.travelApi.profile(), /Authentication required/);

    const reopened = native(platform, disk, respond);
    assert.equal(await reopened.auth.restoreAuthenticatedSession(), false);
    assert.equal(await reopened.storage.readSession(), null);
    assert.equal((await reopened.auth.authApi.recoveryStatus(ordinary.token)).recovery?.deadline, deadline);
    await reopened.travelApi.reactivateDeletion(ordinary.token);
    assert.equal(await reopened.storage.readSession(), null);
    const fresh = { ...ordinary, token: "newly-authenticated" };
    await reopened.storage.writeSession(fresh);
    assert.equal((await reopened.storage.readSession())?.token, fresh.token);
    assert.deepEqual(calls, [
      [deletionPath, `Bearer ${ordinary.token}`], [profilePath, null],
      [sessionPath, `Bearer ${ordinary.token}`], [recoveryPath, `Bearer ${ordinary.token}`],
    ]);
  });
}

test("failed or unconfirmed deletion preserves the active session and cannot authorize recovery", async () => {
  let offline = true;
  let requests = 0;
  const app = native("ios", new Map(), () => {
    requests++;
    if (offline) throw new Error("offline");
    return Response.json({ request: { ...pending.request, status: "CANCELLED" } });
  });
  await app.storage.writeSession(ordinary);
  await assert.rejects(app.travelApi.requestDeletion(), /Check your connection/);
  offline = false;
  await assert.rejects(app.travelApi.requestDeletion(), /Unable to confirm/);
  await assert.rejects(app.travelApi.reactivateDeletion(ordinary.token), /expired/);
  assert.equal(requests, 2);
  assert.equal((await app.storage.readSession())?.token, ordinary.token);
});

test("revocation on another device is reconciled from a protected API response", async () => {
  for (const eligible of [true, false]) {
    const app = native("android", new Map(), (path, init) => {
      assert.equal(new Headers(init.headers).get("Authorization"), `Bearer ${ordinary.token}`);
      return path === sessionPath && eligible
        ? Response.json({ user: ordinary.user, expires: ordinary.expires, recovery: { deadline } })
        : Response.json({ error: "Session expired." }, { status: 401 });
    });
    await app.storage.writeSession(ordinary);
    await assert.rejects(app.travelApi.profile(), /Account changed/);
    assert.equal(await app.storage.readSession(), null);
    assert.equal((await app.storage.readStoredSession())?.recovery?.deadline, eligible ? deadline : undefined);
  }
});

test("an expired recovery credential stays restricted and cannot request cancellation", async () => {
  const app = native("android", new Map(), () => { throw new Error("Unexpected network request"); });
  await app.storage.writeSession({ ...ordinary, expires: "2000-01-01T00:00:00.000Z", recovery: { deadline } });
  assert.equal(await app.storage.readSession(), null);
  assert.equal(await app.auth.restoreAuthenticatedSession(), false);
  await assert.rejects(app.travelApi.reactivateDeletion(ordinary.token), /expired/);
});

test("ordinary access stops before secure storage finishes and stays off if persisting recovery fails", async () => {
  const disk = new Map<string, string>();
  let began!: () => void;
  let finish!: () => void;
  const storing = new Promise<void>(resolve => { began = resolve; });
  const blocked = new Promise<void>(resolve => { finish = resolve; });
  const respond = () => Response.json(pending);
  const app = native("ios", disk, respond, async session => {
    if (!session.recovery) return;
    began();
    await blocked;
    throw new Error("Secure storage unavailable");
  });
  await app.storage.writeSession(ordinary);
  const operation = app.travelApi.requestDeletion();
  await storing;
  assert.equal(await app.storage.readSession(), null);
  finish();
  await operation;
  assert.equal((await app.storage.readStoredSession())?.recovery?.deadline, deadline);
  const reopened = native("ios", disk, respond);
  assert.equal(await reopened.storage.readSession(), null);
});

test("an invalid session-status response cannot verify stored ordinary identity", async () => {
  const app = native("android", new Map(), () => Response.json({ expires: ordinary.expires, user: { id: "another-user" } }));
  await app.storage.writeSession(ordinary);
  assert.equal(await app.auth.restoreAuthenticatedSession(), false);
});

test("a stale cancellation response cannot act as confirmation for another recovery sign-in", async () => {
  let started!: () => void;
  let finish!: (response: Response) => void;
  const requested = new Promise<void>(resolve => { started = resolve; });
  const response = new Promise<Response>(resolve => { finish = resolve; });
  const app = native("android", new Map(), path => {
    assert.equal(path, recoveryPath);
    started();
    return response;
  });
  await app.storage.writeSession({ ...ordinary, recovery: { deadline } });
  const cancellation = app.travelApi.reactivateDeletion(ordinary.token);
  await requested;
  await app.storage.writeSession({ ...ordinary, token: "replacement", recovery: { deadline } });
  finish(Response.json({ success: true, request: { status: "CANCELLED" } }));
  await assert.rejects(cancellation, /Account changed/);
  assert.equal((await app.storage.readStoredSession())?.token, "replacement");
});

test("stale revocation leaves another account alone and delayed profile writes cannot restore an ordinary bearer", async () => {
  const app = native("ios", new Map(), () => { throw new Error("Unexpected network request"); });
  const other = { ...ordinary, token: "other", user: { id: "other", email: "other@example.test" } };
  await app.storage.writeSession(other);
  await app.storage.applySessionRevocation(ordinary.token, { deadline });
  assert.equal((await app.storage.readSession())?.token, other.token);
  await app.storage.writeSession(ordinary);
  await Promise.all([
    app.storage.applySessionRevocation(ordinary.token, { deadline }),
    app.storage.updateStoredSessionName("Stale name", ordinary.user.id),
    app.storage.updateStoredSessionEmail("old@example.test", ordinary.user.id),
  ]);
  assert.equal(await app.storage.readSession(), null);
  assert.equal((await app.storage.readStoredSession())?.user.email, ordinary.user.email);
});
