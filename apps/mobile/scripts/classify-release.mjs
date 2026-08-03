import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadReleaseFiles } from "./release-policy.mjs";

const NATIVE_PATTERNS = [
  /(^|\/)android\//,
  /(^|\/)ios\//,
  /(^|\/)(app\.config\.(?:js|ts)|app\.json|eas\.json|release-policy\.json)$/,
  /(^|\/)(package|npm-shrinkwrap)\.json$/,
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/,
  /(^|\/)(plugins?|config-plugins?)\//,
  /(^|\/)(assets\/.*(?:icon|splash|adaptive|notification|font))/i,
  /(^|\/)(AndroidManifest\.xml|build\.gradle|settings\.gradle|gradle\.properties)$/,
];

export function classifyRelease({ files, baselineFingerprint, currentFingerprint, expectedRuntime, actualRuntime, expectedChannel, actualChannel }) {
  const nativeFiles = files.filter((file) => NATIVE_PATTERNS.some((pattern) => pattern.test(file)));
  if (!baselineFingerprint || !currentFingerprint) return { classification: "native-build-required", reason: "uncertain-fingerprint", nativeFiles };
  if (baselineFingerprint !== currentFingerprint) return { classification: "native-build-required", reason: "fingerprint-changed", nativeFiles };
  if (!expectedRuntime || !actualRuntime || expectedRuntime !== actualRuntime) return { classification: "native-build-required", reason: "runtime-uncertain-or-mismatched", nativeFiles };
  if (!expectedChannel || !actualChannel || expectedChannel !== actualChannel) return { classification: "native-build-required", reason: "channel-uncertain-or-mismatched", nativeFiles };
  if (nativeFiles.length) return { classification: "native-build-required", reason: "native-sensitive-files", nativeFiles };
  if (!files.length) return { classification: "native-build-required", reason: "empty-or-uncertain-diff", nativeFiles };
  return { classification: "ota-compatible", reason: "fingerprint-runtime-channel-and-files-compatible", nativeFiles };
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    if (!values[index]?.startsWith("--") || values[index + 1] === undefined) throw new Error(`Invalid argument ${values[index] ?? ""}`);
    result[values[index].slice(2)] = values[index + 1];
  }
  return result;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = parseArgs(process.argv.slice(2));
  const { policy, root } = loadReleaseFiles();
  const variant = args.variant;
  if (variant !== "preview" && variant !== "production") throw new Error("--variant must be preview or production");
  const files = args.files
    ? args.files.split(",").map((file) => file.trim()).filter(Boolean)
    : execFileSync("git", ["diff", "--name-only", args.base, args.head, "--", "apps/mobile"], { cwd: resolve(root, "../.."), encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
  const result = classifyRelease({
    files,
    baselineFingerprint: args["baseline-fingerprint"],
    currentFingerprint: args["current-fingerprint"],
    expectedRuntime: policy[variant].runtimeVersion,
    actualRuntime: args.runtime,
    expectedChannel: policy[variant].channel,
    actualChannel: args.channel,
  });
  console.log(JSON.stringify({ variant, files, ...result }, null, 2));
  if (args.action === "update" && result.classification !== "ota-compatible") process.exitCode = 2;
}
