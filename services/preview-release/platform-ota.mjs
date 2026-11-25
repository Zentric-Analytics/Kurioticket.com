const platforms = ["ios", "android"];

// Root manifests trigger conservative native evaluation, but do not by
// themselves prove a new mobile binary is necessary. Only resolve this narrow
// case after canonical fingerprints match the delivered platform binary.
export function resolveRootDependencyEvaluation(classification, fingerprints, deliveredNative) {
  const targets = new Set(classification.classification.split("+"));
  const resolved = [];
  for (const platform of platforms) {
    const target = `${platform.toUpperCase()}_NATIVE`;
    const candidates = classification[`${platform}Native`];
    const current = fingerprints?.[platform];
    if (!targets.has(target) || !candidates?.length || candidates.some((file) => !/^(?:package|package-lock)\.json$/.test(file))) continue;
    if (!/^[0-9a-f]{40,128}$/.test(current ?? "") || current !== deliveredNative?.[platform]?.fingerprint) continue;
    targets.delete(target);
    resolved.push(...candidates);
  }
  if (!resolved.length) return classification;
  targets.add("OTA");
  return { ...classification, classification: [...targets].sort().join("+"), otaCandidates: [...new Set([...(classification.otaCandidates ?? []), ...resolved])], dependencyOnlyNativeEvaluationResolved: true };
}

// A completed aggregate release is not proof that both platforms received JS.
export function pendingOtaPlatforms(previous) {
  const evidence = previous?.evidence;
  if (!evidence) return [];
  const needsJs = evidence.classification?.otaCandidates?.length > 0;
  const carried = evidence.pendingOtaPlatforms ?? [];
  return platforms.filter((platform) => {
    if (!needsJs && !carried.includes(platform)) return false;
    if (evidence[platform]?.buildId) return false;
    if (evidence.ota?.updateIds?.length && evidence.ota?.runtimes?.[platform]) return false;
    return !evidence.ota?.updates?.some((update) => update.platform === platform || update.platforms?.includes(platform));
  });
}

export function planPlatformOta({ classification, fingerprints, deliveredNative, previous, pendingOta = [] }) {
  const pending = [...new Set([...pendingOtaPlatforms(previous), ...pendingOta])];
  const wantsJs = classification.otaCandidates?.length > 0 || classification.classification.split("+").includes("OTA");
  const targets = new Set(classification.classification.split("+").filter((target) => target !== "NO_DELIVERY" && target !== "OTA"));
  const otaPlatforms = [];
  for (const platform of platforms) {
    if (!wantsJs && !pending.includes(platform)) continue;
    const nativeTarget = `${platform.toUpperCase()}_NATIVE`;
    if (targets.has(nativeTarget)) continue;
    const current = fingerprints?.[platform];
    const delivered = deliveredNative?.[platform]?.fingerprint;
    if (!current || !delivered || current !== delivered) targets.add(nativeTarget);
    else otaPlatforms.push(platform);
  }
  if (otaPlatforms.length) targets.add("OTA");
  return { classification: { ...classification, classification: [...targets].sort().join("+") || "NO_DELIVERY" }, otaPlatforms, pendingOtaPlatforms: pending };
}
