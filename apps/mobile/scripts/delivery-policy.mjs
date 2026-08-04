export function validateStaticDeliveryInputs({ variant, sha, runtime, packageName, channel, profile, apiBaseUrl, confirmation, action, releaseReason, baselineBuildId, policy, eas }) {
  if (variant !== "preview" && variant !== "production") throw new Error("Invalid variant.");
  if (!/^[a-f0-9]{40}$/.test(sha ?? "")) throw new Error("Commit SHA must be an exact 40-character lowercase SHA.");
  const release = policy[variant];
  if (!['build', 'update'].includes(action)) throw new Error("Unsupported delivery action.");
  if (!(releaseReason ?? '').trim()) throw new Error("Release reason must not be empty.");
  if (action === 'build' && baselineBuildId !== 'NONE') throw new Error("Build actions must use baseline build ID NONE.");
  if (action === 'update' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(baselineBuildId ?? '')) throw new Error("Update actions require an approved EAS build ID.");
  const expectedConfirmation = variant === "preview" ? "DELIVER ANDROID PREVIEW" : "DELIVER ANDROID PRODUCTION";
  const checks = [
    [runtime === release.runtimeVersion, "Runtime mismatch."],
    [packageName === release.androidPackage, "Package mismatch."],
    [channel === release.channel, "Channel mismatch."],
    [profile === release.profile, "Profile mismatch."],
    [apiBaseUrl === release.apiBaseUrl, "API origin mismatch."],
    [confirmation === expectedConfirmation, "Confirmation phrase mismatch."],
    [eas.build[variant].env.APP_VARIANT === variant, "EAS variant mismatch."],
    [packageName !== 'com.kurioticket.mobile', "Legacy package is forbidden."],
    [runtime !== policy.legacyRuntime, "Legacy runtime is forbidden."],
  ];
  for (const [valid, message] of checks) if (!valid) throw new Error(message);
}

export function validateSourcePolicy({ variant, isReachableFromApprovedBranch, refType }) {
  if (variant === "preview" && !isReachableFromApprovedBranch) throw new Error("Preview SHA is not reachable from dev.");
  if (variant === "production" && refType !== "main") throw new Error("Production delivery requires an exact commit reachable from protected main; tags are disabled.");
  if (variant === "production" && !isReachableFromApprovedBranch) throw new Error("Production SHA is not reachable from main.");
}
