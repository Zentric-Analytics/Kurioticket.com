import assert from "node:assert/strict";
import test from "node:test";
import { NativeOwnershipViolation, unexpectedBuilds, validateAdoptableBuild, validateAdoptableIosSubmission } from "./native-ownership.mjs";

const sha = "a".repeat(40);
const fingerprint = "b".repeat(40);
const build = (overrides = {}) => ({
  id: "build-29", platform: "ANDROID", status: "FINISHED", buildProfile: "preview",
  applicationIdentifier: "com.kurioticket.app.preview", gitCommitHash: sha,
  fingerprint: { hash: fingerprint }, appVersion: "0.3.0", appBuildVersion: "29",
  project: { id: "89f6fd88-c0d7-495a-9e2b-8301b09f407d" },
  artifacts: { buildUrl: "https://expo.dev/artifacts/eas/build-29.apk" }, ...overrides,
});

test("strict ownership validation accepts an exact Preview build", () => {
  assert.equal(validateAdoptableBuild({ build: build(), platform: "android", sourceSha: sha, fingerprint }).buildId, "build-29");
});

for (const [name, overrides] of [
  ["wrong project", { project: { id: "wrong" } }],
  ["wrong profile", { buildProfile: "production" }],
  ["wrong package", { applicationIdentifier: "com.kurioticket.app" }],
  ["wrong SHA", { gitCommitHash: "c".repeat(40) }],
  ["wrong fingerprint", { fingerprint: { hash: "d".repeat(40) } }],
]) test(`strict ownership validation rejects ${name}`, () => {
  assert.throws(() => validateAdoptableBuild({ build: build(overrides), platform: "android", sourceSha: sha, fingerprint }), NativeOwnershipViolation);
});

test("strict ownership validation rejects durable and delivered-number conflicts", () => {
  assert.throws(() => validateAdoptableBuild({ build: build(), platform: "android", sourceSha: sha, fingerprint, existingAction: { remote_id: "other" } }), /durable-remote-id-conflict/);
  assert.throws(() => validateAdoptableBuild({ build: build(), platform: "android", sourceSha: sha, fingerprint, delivered: { build_number: 29, eas_build_id: "other" } }), /delivered-build-number-conflict/);
});

test("iOS adoption requires the exact submission relationship", () => {
  const submission = { id: "submission-1", platform: "IOS", status: "FINISHED", app: { id: "89f6fd88-c0d7-495a-9e2b-8301b09f407d" }, submittedBuild: { id: "ios-build" } };
  assert.equal(validateAdoptableIosSubmission({ submission, buildId: "ios-build" }).id, "submission-1");
  assert.throws(() => validateAdoptableIosSubmission({ submission, buildId: "other" }), /submitted-build/);
});

test("unowned exact-Preview builds are never silently ignored", () => {
  assert.deepEqual(unexpectedBuilds([build(), build({ id: "owned" })], ["owned"]).map(({ id }) => id), ["build-29"]);
});

test("audited incident fingerprints fail closed", () => {
  assert.throws(() => validateAdoptableBuild({
    build: build({ id: "9a769546-6c5f-4131-9cc3-30e580e78622", fingerprint: { hash: "fb4426eeccb77c850aa443f5d510058c45b7ca5a" } }),
    platform: "android", sourceSha: sha, fingerprint: "0611047bc680d734009a024e83da8331026c953f",
  }), /native-fingerprint/);
});
