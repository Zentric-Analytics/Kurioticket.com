import assert from "node:assert/strict"; import test from "node:test";
import { defaultProtectedRoute, protectedRoutes, validateSignInIntent } from "./signInIntent";
for (const route of protectedRoutes) test(`allows ${route}`, () => assert.equal(validateSignInIntent(route), route));
for (const value of ["https://example.com", "//example.com", "javascript:alert(1)", "/settings", "/%2e%2e/settings", "/%252e%252e/settings"])
  test(`rejects ${value}`, () => assert.equal(validateSignInIntent(value), defaultProtectedRoute));
