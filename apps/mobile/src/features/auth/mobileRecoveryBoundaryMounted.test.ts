import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test, { type TestContext } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { StoredSession } from "../../storage/sessionStorage";

const rootRequire = createRequire(resolve("../../package.json"));
const React: typeof import("react") = rootRequire("react");
const { JSDOM }: typeof import("jsdom") = rootRequire("jsdom");
const component = ts.transpileModule(readFileSync("src/features/auth/MobileRecoveryBoundary.tsx", "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const deadline = new Date(Date.now() + 60_000).toISOString();
const ordinary: StoredSession = { token: "ordinary", expires: deadline, user: { id: "owner", email: "owner@example.test" } };
const recovery = { ...ordinary, recovery: { deadline } };

function deferred<T>() {
  let resolveValue!: (value: T) => void;
  const promise = new Promise<T>(resolve => { resolveValue = resolve; });
  return { promise, resolve: resolveValue };
}

function mountBoundary(context: TestContext) {
  const { window } = new JSDOM("<main></main>");
  const values = { window, document: window.document, IS_REACT_ACT_ENVIRONMENT: true };
  for (const [key, value] of Object.entries(values)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    context.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  context.after(() => window.close());

  type Listener = (session: StoredSession | null, revokedUserId?: string) => void;
  const listeners = new Set<Listener>();
  let stored: StoredSession | null = ordinary;
  let onAppState = (_state: string) => {};
  const publish = (session: StoredSession | null, revokedUserId?: string) => {
    stored = session;
    for (const listener of listeners) listener(session, revokedUserId);
  };
  const commands: string[] = [];
  const cancellations: string[] = [];
  const cacheClears: string[] = [];
  const initialVerification = deferred<StoredSession | null>();
  const recoveryVerification = deferred<{ expires: string; recovery: { deadline: string } }>();
  const auth = { reconcileOrdinarySession: () => initialVerification.promise };
  const view = ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children);
  const mocks: Record<string, unknown> = {
    react: React,
    "react/jsx-runtime": rootRequire("react/jsx-runtime"),
    "react-native": {
      View: view, ActivityIndicator: view, ScrollView: view, Text: view,
      Pressable: ({ children, onPress, disabled }: { children: React.ReactNode; onPress: () => void; disabled: boolean }) =>
        React.createElement("button", { onClick: onPress, disabled }, children),
      AppState: { addEventListener: (_event: string, listener: typeof onAppState) => { onAppState = listener; return { remove() {} }; } },
    },
    "react-native-safe-area-context": { SafeAreaView: view },
    "expo-router": { router: { replace: (route: string) => commands.push(route) } },
    "expo-splash-screen": { hideAsync: async () => undefined },
    "./authApi": {
      authApi: { recoveryStatus: () => recoveryVerification.promise },
      reconcileOrdinarySession: () => auth.reconcileOrdinarySession(),
    },
    "../../api/travelApi": { travelApi: { reactivateDeletion: async (token: string) => { cancellations.push(token); } } },
    "../../storage/sessionStorage": {
      readStoredSession: async () => stored,
      clearSession: async () => publish(null),
      subscribeStoredSession: (listener: Listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    },
    "../../storage/profileNameCache": { writeProfileName: async (userId: string) => { cacheClears.push(userId); } },
    "../../storage/savedRepository": { discardSavedCache: async () => undefined },
    "../../theme/AppTheme": { useAppTheme: () => ({ theme: {} }) },
    "../launch/LaunchScreens": { RecoveryScreen: view },
  };
  const exports: { MobileRecoveryBoundary?: React.ComponentType<{ children: React.ReactNode }> } = {};
  runInNewContext(component, {
    exports,
    require: (name: string) => { assert.ok(name in mocks, name); return mocks[name]; },
    Date, setTimeout, clearTimeout,
  });
  const { MobileRecoveryBoundary } = exports;
  assert.ok(MobileRecoveryBoundary);
  const { createRoot }: typeof import("react-dom/client") = rootRequire("react-dom/client");
  const root = createRoot(window.document.querySelector("main")!);
  const unmount = async () => { await React.act(async () => root.unmount()); };
  const render = async () => {
    await React.act(async () => root.render(React.createElement(MobileRecoveryBoundary, {
      children: React.createElement("div", { "data-private-stack": true }, "Ordinary stack"),
    })));
  };
  const privateStack = () => window.document.querySelector("[data-private-stack]");
  const button = (label: string) => {
    const match = [...window.document.querySelectorAll("button")].find(element => element.textContent === label);
    assert.ok(match, label);
    return match;
  };
  return { render, unmount, privateStack, button, publish, initialVerification, recoveryVerification,
    auth, resume: () => onAppState("active"), commands, cancellations, cacheClears };
}

test("pending deletion unmounts the ordinary stack and only verified cancellation leads to sign-in", async context => {
  const app = mountBoundary(context);
  try {
    await app.render();
    assert.equal(app.privateStack(), null);
    await React.act(async () => app.initialVerification.resolve(ordinary));
    assert.ok(app.privateStack());

    await React.act(async () => app.publish(recovery, ordinary.user.id));
    assert.equal(app.privateStack(), null);
    assert.deepEqual(app.cacheClears, [ordinary.user.id]);
    assert.equal(app.button("Keep account").disabled, true);
    await React.act(async () => app.recoveryVerification.resolve({ expires: deadline, recovery: { deadline } }));
    assert.equal(app.button("Keep account").disabled, false);

    await React.act(async () => app.button("Keep account").click());
    assert.deepEqual(app.cancellations, [ordinary.token]);
    assert.equal(app.privateStack(), null);
    await React.act(async () => app.button("Sign in to continue").click());
    assert.deepEqual(app.commands, ["/email-auth"]);
  } finally {
    await app.unmount();
  }
});

test("a primary session revoked elsewhere discards the retained stack and returns to sign-in", async context => {
  const app = mountBoundary(context);
  try {
    await app.render();
    await React.act(async () => app.initialVerification.resolve(ordinary));
    const previousStack = app.privateStack();
    assert.ok(previousStack?.isConnected);

    app.auth.reconcileOrdinarySession = async () => {
      app.publish(null, ordinary.user.id);
      return null;
    };
    await React.act(async () => app.resume());
    assert.equal(previousStack.isConnected, false);
    assert.deepEqual(app.commands, ["/email-auth"]);
    assert.deepEqual(app.cacheClears, [ordinary.user.id]);
  } finally {
    await app.unmount();
  }
});
