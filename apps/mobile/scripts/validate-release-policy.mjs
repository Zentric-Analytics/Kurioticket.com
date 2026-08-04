import { assertReleasePolicy, loadReleaseFiles } from "./release-policy.mjs";

const { policy, eas } = loadReleaseFiles();
assertReleasePolicy(policy, eas);
console.log("Android release policy is valid.");
