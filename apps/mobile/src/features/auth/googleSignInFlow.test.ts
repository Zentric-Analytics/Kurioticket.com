import assert from "node:assert/strict";
import { test } from "node:test";
import { getInitialGoogleSignInOperation } from "./googleSignInFlow";

test("iOS normal authentication starts one explicit nonce-bearing flow", () => {
  assert.equal(getInitialGoogleSignInOperation("ios", false), "presentExplicitSignIn");
});

test("iOS forced account selection still starts one explicit flow", () => {
  assert.equal(getInitialGoogleSignInOperation("ios", true), "presentExplicitSignIn");
});

test("Android normal authentication retains the signIn flow", () => {
  assert.equal(getInitialGoogleSignInOperation("android", false), "signIn");
});

test("Android forced account selection retains the explicit flow", () => {
  assert.equal(getInitialGoogleSignInOperation("android", true), "presentExplicitSignIn");
});
