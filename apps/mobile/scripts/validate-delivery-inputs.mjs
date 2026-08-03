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
let isDispatchRefTag = false;
let tagResolvesToSha = false;
let tagName;
let tagObjectType;
let tagSignatureValid = false;
if (variant === "preview") {
  git("merge-base", "--is-ancestor", sha, "origin/dev");
  isReachableFromApprovedBranch = true;
} else if (refType === "tag") {
  isDispatchRefTag = Boolean(process.env.GITHUB_REF?.startsWith("refs/tags/"));
  tagResolvesToSha = isDispatchRefTag && git("rev-list", "-n", "1", process.env.GITHUB_REF) === sha;
  tagName = process.env.GITHUB_REF?.replace('refs/tags/', '');
  tagObjectType = isDispatchRefTag ? git('cat-file', '-t', process.env.GITHUB_REF) : undefined;
  if (isDispatchRefTag) {
    try { git('verify-tag', process.env.GITHUB_REF); tagSignatureValid = true; } catch { tagSignatureValid = false; }
  }
} else {
  git("merge-base", "--is-ancestor", sha, "origin/main");
  isReachableFromApprovedBranch = true;
}
validateSourcePolicy({ variant, isReachableFromApprovedBranch, refType, isDispatchRefTag, tagResolvesToSha, tagName, tagObjectType, tagSignatureValid });
console.log(`${variant} delivery inputs are valid for ${sha}.`);
