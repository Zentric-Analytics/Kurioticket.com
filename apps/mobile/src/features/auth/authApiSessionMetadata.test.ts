import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const authApi = readFileSync("src/features/auth/authApi.ts", "utf8");

test("authentication requests send canonical mobile session metadata headers", () => {
  assert.match(authApi, /import Constants from "expo-constants"/);
  assert.match(authApi, /import \{ Platform \} from "react-native"/);
  assert.match(authApi, /"X-Mobile-Platform": Platform\.OS/);
  assert.match(authApi, /"X-Mobile-App-Version": Constants\.expoConfig\.version/);
});

test("all session-creating auth methods use the shared metadata-bearing request helper", () => {
  for (const method of ["password", "register", "google", "twoFactor", "passkeyVerify"]) {
    assert.match(authApi, new RegExp(`${method}:[\\s\\S]*?request<`), method);
  }
});
import ts from "typescript";
import { runInNewContext } from "node:vm";
import type { authApi as AuthApi } from "./authApi";

for (const platform of ["ios", "android"]) test(`${platform} auth requests negotiate recovery and never persist an unsupported-client response`, async () => {
  const writes: unknown[] = [], requests: RequestInit[] = [];
  const bindings: Record<string, unknown> = {
    "expo-constants": { default: { expoConfig: { version: "0.3.0" } } },
    "react-native": { Platform: { OS: platform } },
    "../../config/apiUrl": { getApiBaseUrl: () => ({ ok: true, baseUrl: "https://staging.kurioticket.com" }) },
    "../../storage/sessionStorage": { writeSession: async (session: unknown) => { writes.push(session); }, readSession: async () => null, clearSession: async () => {} },
    "./previewPasskeySignIn": { isIOSPreviewPasskeyEnabled: () => false },
  };
  const exports: { authApi?: typeof AuthApi } = {};
  const output = ts.transpileModule(authApi, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(output, { exports, require: (name: string) => { assert.ok(name in bindings, `Unexpected auth dependency: ${name}`); return bindings[name]; }, AbortController, setTimeout, clearTimeout,
    fetch: async (_url: string, options: RequestInit) => { requests.push(options); return { ok: false, status: 409, json: async () => ({ code: "RECOVERY_CLIENT_UPDATE_REQUIRED", error: "Sign in securely in your browser." }) }; },
  });
  assert.ok(exports.authApi);
  await assert.rejects(exports.authApi.password("fixture@example.invalid", "fixture-password"), (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === "RECOVERY_CLIENT_UPDATE_REQUIRED"));
  assert.equal(new Headers(requests[0].headers).get("X-Mobile-Recovery-Protocol"), "1");
  assert.equal(new Headers(requests[0].headers).get("X-Mobile-Platform"), platform);
  assert.equal(writes.length, 0);
});
