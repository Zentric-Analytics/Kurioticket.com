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
