import { assertReleasePolicy, loadReleaseFiles } from "./release-policy.mjs";

const { policy, eas } = loadReleaseFiles();
assertReleasePolicy(policy, eas);
console.log("Mobile release policy is valid: Android Preview/Production and iOS Preview are supported; iOS Production is deferred.");
