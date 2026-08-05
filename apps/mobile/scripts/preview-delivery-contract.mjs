import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PROJECT_ID = "89f6fd88-c0d7-495a-9e2b-8301b09f407d";
const APP_ID = "com.kurioticket.app.preview";
const RUNTIME = "preview-0.3.0";
const CHANNEL = "preview";
const VERSION = "0.3.0";
const FULL_SHA = /^[0-9a-f]{40}$/;

const PLATFORM_RULES = {
  android: {
    easPlatform: "ANDROID",
    distribution: "INTERNAL",
    artifact: /\.apk(?:\?|$)/i,
    nativePaths: [
      /^apps\/mobile\/android\//,
      /(^|\/)AndroidManifest\.xml$/,
      /(^|\/)(build|settings)\.gradle$/,
      /(^|\/)gradle\.properties$/,
    ],
  },
  ios: {
    easPlatform: "IOS",
    distribution: "STORE",
    artifact: /(?:\.ipa(?:\?|$)|^https:\/\/)/i,
    nativePaths: [
      /^apps\/mobile\/ios\//,
      /(^|\/)Info\.plist$/,
      /(^|\/).*\.entitlements$/,
      /(^|\/)Podfile(?:\.lock)?$/,
    ],
  },
};

const SHARED_NATIVE_PATHS = [
  /^apps\/mobile\/(?:app\.config\.(?:js|ts)|app\.json|eas\.json|package\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/,
  /^apps\/mobile\/(?:plugins?|config-plugins?)\//,
  /^apps\/mobile\/assets\/.*(?:icon|splash|adaptive|notification|font)/i,
];

function requireValue(value, message) {
  if (!value) throw new Error(message);
}

function normalizedPath(value) {
  requireValue(typeof value === "string" && value.length > 0 && !value.includes("\0"), "Changed path is malformed.");
  const path = value.replaceAll("\\", "/").replace(/^\.\//, "");
  requireValue(!path.startsWith("/") && !/^[A-Za-z]:\//.test(path) && !path.split("/").includes(".."), "Changed path is untrusted.");
  return path;
}

function artifactUrl(build) {
  return build?.artifacts?.applicationArchiveUrl ?? build?.artifacts?.buildUrl ?? null;
}

export function resolveLatestPreviewBaseline({ builds, platform, targetSha, isAncestor = () => true }) {
  const rules = PLATFORM_RULES[platform];
  requireValue(rules, "Preview platform is unsupported.");
  requireValue(FULL_SHA.test(targetSha ?? ""), "Preview target SHA is malformed.");
  requireValue(Array.isArray(builds), "EAS Preview build history must be an array.");

  const candidates = builds.filter((build) => {
    requireValue(build && typeof build === "object" && !Array.isArray(build), "EAS Preview build entry is malformed.");
    if (build.platform !== rules.easPlatform || build.buildProfile !== "preview") return false;
    if (build.status !== "FINISHED") return false;
    const identifier = build.applicationIdentifier ?? build.appIdentifier;
    const url = artifactUrl(build);
    const valid = build.project?.id === PROJECT_ID
      && identifier === APP_ID
      && build.runtimeVersion === RUNTIME
      && build.channel === CHANNEL
      && build.appVersion === VERSION
      && build.distribution === rules.distribution
      && FULL_SHA.test(build.gitCommitHash ?? "")
      && typeof url === "string"
      && /^https:\/\//.test(url)
      && rules.artifact.test(url);
    requireValue(valid, `Matching ${platform} Preview build metadata is malformed or identity-mismatched.`);
    return isAncestor(build.gitCommitHash, targetSha);
  });

  requireValue(candidates.length > 0, `No finished ${platform} Preview baseline is an ancestor of the target dev SHA.`);
  const sorted = [...candidates].sort((a, b) => String(b.completedAt ?? b.createdAt ?? "").localeCompare(String(a.completedAt ?? a.createdAt ?? "")));
  const selected = sorted[0];
  const sameTime = sorted.filter((build) => String(build.completedAt ?? build.createdAt ?? "") === String(selected.completedAt ?? selected.createdAt ?? ""));
  requireValue(sameTime.length === 1, `Latest ${platform} Preview baseline is ambiguous.`);
  return {
    platform,
    easBuildId: selected.id,
    commitSha: selected.gitCommitHash,
    buildNumber: Number(selected.appBuildVersion),
    runtime: selected.runtimeVersion,
    channel: selected.channel,
    artifactUrlPresent: true,
  };
}

export function classifyPreviewPlatform({ platform, files, baselineFingerprint, targetFingerprint }) {
  const rules = PLATFORM_RULES[platform];
  requireValue(rules, "Preview platform is unsupported.");
  requireValue(Array.isArray(files), "Preview changed-file range is malformed.");
  const normalized = files.map(normalizedPath);
  const nativeFiles = normalized.filter((file) => [...SHARED_NATIVE_PATHS, ...rules.nativePaths].some((pattern) => pattern.test(file)));
  if (!baselineFingerprint || !targetFingerprint) return { platform, decision: "INVALID", reason: "fingerprint-missing", nativeFiles };
  if (baselineFingerprint !== targetFingerprint) return { platform, decision: "NATIVE_BUILD_REQUIRED", reason: "fingerprint-changed", nativeFiles };
  if (nativeFiles.length > 0) return { platform, decision: "NATIVE_BUILD_REQUIRED", reason: "native-sensitive-range", nativeFiles };
  return { platform, decision: "OTA_COMPATIBLE", reason: "fingerprint-and-range-compatible", nativeFiles };
}

export function combinePreviewDecisions({ mobileRelevant, android, ios }) {
  if (!mobileRelevant) return { outcome: "WEB_ONLY_SUCCESS", android: "NOT_APPLICABLE", ios: "NOT_APPLICABLE" };
  requireValue(android?.decision && ios?.decision, "Both Preview platform decisions are required.");
  requireValue(android.decision !== "INVALID" && ios.decision !== "INVALID", "Invalid Preview evidence blocks delivery.");
  const native = [android, ios].filter((item) => item.decision === "NATIVE_BUILD_REQUIRED").map((item) => item.platform);
  if (native.length === 2) return { outcome: "BOTH_NATIVE_BUILDS_REQUIRED", android: "BUILD", ios: "BUILD" };
  if (native[0] === "android") return { outcome: "ANDROID_NATIVE_BUILD_REQUIRED", android: "BUILD", ios: "OTA" };
  if (native[0] === "ios") return { outcome: "IOS_NATIVE_BUILD_REQUIRED", android: "OTA", ios: "BUILD" };
  return { outcome: "OTA_SUCCESS", android: "OTA", ios: "OTA" };
}

function args(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    requireValue(values[index]?.startsWith("--") && values[index + 1] !== undefined, "Invalid Preview delivery arguments.");
    result[values[index].slice(2)] = values[index + 1];
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, ...values] = process.argv.slice(2);
  const options = args(values);
  if (command === "baseline") {
    const builds = JSON.parse(readFileSync(options.input, "utf8"));
    const ancestors = new Set(JSON.parse(readFileSync(options.ancestors, "utf8")));
    const result = resolveLatestPreviewBaseline({ builds, platform: options.platform, targetSha: options.target, isAncestor: (sha) => ancestors.has(sha) });
    writeFileSync(options.output, `${JSON.stringify(result, null, 2)}\n`);
  } else if (command === "classify") {
    const files = JSON.parse(readFileSync(options.files, "utf8"));
    const baseline = JSON.parse(readFileSync(options.baseline, "utf8"));
    const target = JSON.parse(readFileSync(options.target, "utf8"));
    const result = classifyPreviewPlatform({ platform: options.platform, files, baselineFingerprint: baseline.hash, targetFingerprint: target.hash });
    writeFileSync(options.output, `${JSON.stringify(result, null, 2)}\n`);
  } else if (command === "combine") {
    const result = combinePreviewDecisions({
      mobileRelevant: options["mobile-relevant"] === "true",
      android: JSON.parse(readFileSync(options.android, "utf8")),
      ios: JSON.parse(readFileSync(options.ios, "utf8")),
    });
    writeFileSync(options.output, `${JSON.stringify(result, null, 2)}\n`);
    if (process.env.GITHUB_OUTPUT) {
      writeFileSync(process.env.GITHUB_OUTPUT, `outcome=${result.outcome}\nandroid=${result.android}\nios=${result.ios}\n`, { flag: "a" });
    }
  } else {
    throw new Error("Unknown Preview delivery contract command.");
  }
}
