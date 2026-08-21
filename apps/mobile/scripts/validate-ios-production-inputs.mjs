import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { loadReleaseFiles } from "./release-policy.mjs";

const [sha, runtime, bundleIdentifier, channel, confirmation, action, releaseReason, baselineBuildId] = process.argv.slice(2);
const { policy, eas, root } = loadReleaseFiles();
const production = policy.production;
const fail = (message) => { throw new Error(message); };

if (!/^[a-f0-9]{40}$/.test(sha ?? "")) fail("Commit SHA must be an exact lowercase 40-character SHA.");
if (!["dry-run", "build"].includes(action)) fail("First iOS Production delivery supports dry-run or build only.");
if (!(releaseReason ?? "").trim()) fail("Release reason must not be empty.");
if (baselineBuildId !== "NONE") fail("iOS Production OTA remains disabled until a reviewed binary baseline exists.");
if (confirmation !== "DELIVER IOS PRODUCTION") fail("Confirmation phrase mismatch.");
if (runtime !== production.runtimeVersion) fail("Runtime mismatch.");
if (bundleIdentifier !== production.bundleIdentifier) fail("Bundle identifier mismatch.");
if (channel !== production.channel) fail("Channel mismatch.");
if (!production.supportedPlatforms.includes("ios")) fail("Production policy does not support iOS.");
if (eas.build.production.ios?.distribution !== "store" || eas.build.production.ios?.autoIncrement !== true) fail("Production iOS EAS profile mismatch.");
if (eas.build.production.env.EXPO_PUBLIC_API_BASE_URL !== production.apiBaseUrl) fail("Production API origin mismatch.");

const repository = resolve(root, "../..");
const git = (...args) => execFileSync("git", args, { cwd: repository, encoding: "utf8" }).trim();
if (git("rev-parse", "HEAD") !== sha) fail("Checked-out HEAD does not equal the approved SHA.");
git("merge-base", "--is-ancestor", sha, "origin/main");
console.log(`iOS Production delivery inputs are valid for ${sha}.`);
