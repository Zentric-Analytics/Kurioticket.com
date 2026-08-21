const WEB_PREFIXES = ["src/", "public/", "prisma/", "scripts/"];
const MOBILE_PREFIX = "apps/mobile/";
const DOC_PATTERNS = [/^docs\//, /\/docs\//, /\.md$/i];
const NATIVE_COMMON = [
  /^(?:package|package-lock)\.json$/,
  /^apps\/mobile\/(?:app\.config\.(?:js|ts)|app\.json|eas\.json|release-policy\.json)$/,
  /^apps\/mobile\/(?:package|package-lock)\.json$/,
  /^apps\/mobile\/(?:plugins?|config-plugins?)\//,
  /^apps\/mobile\/assets\/.*(?:icon|splash|adaptive|notification|font)/i,
];
const IOS_NATIVE = [/^apps\/mobile\/ios\//, /(?:^|\/)Podfile(?:\.lock)?$/, /\.entitlements$/];
const ANDROID_NATIVE = [/^apps\/mobile\/android\//, /(?:AndroidManifest\.xml|build\.gradle|settings\.gradle|gradle\.properties)$/];
const OTA_SAFE = [
  /^apps\/mobile\/(?:app|src|components|hooks|lib|utils)\//,
  /^apps\/mobile\/assets\/(?!.*(?:icon|splash|adaptive|notification|font))/i,
];
// apps/mobile maps @/* to the repository's src/* tree. Keep this allowlist in
// sync with the shared runtime dependency graph rooted at CarSearchPanel so a
// web-path change that ships inside the Metro bundle cannot be classified as
// web-only.
const MOBILE_SHARED_RUNTIME = [
  /^src\/lib\/cars\/carLocationSuggestions\.ts$/,
  /^src\/lib\/geo\/(?:context|distance)\.ts$/,
  /^src\/lib\/region\/countryDisplayNames\.ts$/,
  /^src\/lib\/supportedLocales\.ts$/,
  /^src\/(?:data\/(?:airports|carRentalAreas)|shared\/airports)\.ts$/,
];
const MOBILE_TOOLING = [
  /^apps\/mobile\/scripts\//,
  /^apps\/mobile\/src\/__tests__\//,
  /^apps\/mobile\/src\/.*\.(?:test|spec)\.[cm]?[jt]sx?$/,
];

export function classifyChangeSet(files) {
  if (!Array.isArray(files) || files.some((file) => typeof file !== "string" || !file || file.includes("\\"))) {
    return result("UNSAFE", "malformed-change-set", files ?? []);
  }
  const unique = [...new Set(files)].sort();
  if (!unique.length) return result("NO_DELIVERY", "no-changes", unique);

  const iosNative = unique.filter((file) => NATIVE_COMMON.concat(IOS_NATIVE).some((pattern) => pattern.test(file)));
  const androidNative = unique.filter((file) => NATIVE_COMMON.concat(ANDROID_NATIVE).some((pattern) => pattern.test(file)));
  const mobile = unique.filter((file) => file.startsWith(MOBILE_PREFIX));
  const docsOnly = unique.every((file) => DOC_PATTERNS.some((pattern) => pattern.test(file)));
  const web = unique.filter((file) => WEB_PREFIXES.some((prefix) => file.startsWith(prefix)) || ["package.json", "package-lock.json", "next.config.ts"].includes(file));
  const mobileTooling = mobile.filter((file) => MOBILE_TOOLING.some((pattern) => pattern.test(file)));
  const otaCandidates = [
    ...mobile.filter((file) => !mobileTooling.includes(file) && OTA_SAFE.some((pattern) => pattern.test(file))),
    ...unique.filter((file) => MOBILE_SHARED_RUNTIME.some((pattern) => pattern.test(file))),
  ];
  const uncertainMobile = mobile.filter((file) => !iosNative.includes(file) && !androidNative.includes(file) && !otaCandidates.includes(file) && !mobileTooling.includes(file) && !DOC_PATTERNS.some((pattern) => pattern.test(file)));

  if (uncertainMobile.length) return result("UNSAFE", "uncertain-mobile-change", unique, { uncertainMobile });
  const targets = new Set();
  if (web.length) targets.add("WEB");
  if (iosNative.length) targets.add("IOS_NATIVE");
  if (androidNative.length) targets.add("ANDROID_NATIVE");
  if (otaCandidates.length && !iosNative.length && !androidNative.length) targets.add("OTA");
  if (!targets.size && docsOnly) return result("NO_DELIVERY", "documentation-only", unique);
  if (!targets.size) return result("NO_DELIVERY", "repository-only", unique);
  return result([...targets].sort().join("+"), "classified", unique, { iosNative, androidNative, otaCandidates, mobileTooling, web });
}

function result(classification, reason, files, details = {}) {
  return { classification, reason, files, ...details };
}
