import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { validateSourcePolicy, validateStaticDeliveryInputs } from "./delivery-policy.mjs";
import { loadReleaseFiles } from "./release-policy.mjs";

const [variant, sha, runtime, packageName, channel, profile, apiBaseUrl, confirmation, refType = "branch", action, releaseReason, baselineBuildId] = process.argv.slice(2);
const { policy, eas, root } = loadReleaseFiles();
validateStaticDeliveryInputs({ variant, sha, runtime, packageName, channel, profile, apiBaseUrl, confirmation, action, releaseReason, baselineBuildId, policy, eas });

const repository = resolve(root, "../..");
const git = (...args) => execFileSync("git", args, { cwd: repository, encoding: "utf8" }).trim();
if (git("rev-parse", "HEAD") !== sha) throw new Error("Checked-out HEAD does not equal the approved SHA.");
let isReachableFromApprovedBranch = false;
if (variant === "preview") {
  git("merge-base", "--is-ancestor", sha, "origin/dev");
  isReachableFromApprovedBranch = true;
} else {
  git("merge-base", "--is-ancestor", sha, "origin/main");
  isReachableFromApprovedBranch = true;
}
validateSourcePolicy({ variant, isReachableFromApprovedBranch, refType });
console.log(`${variant} delivery inputs are valid for ${sha}.`);
