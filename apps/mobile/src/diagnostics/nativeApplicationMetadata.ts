type NativeApplication = { nativeApplicationVersion?: unknown; nativeBuildVersion?: unknown };
const clean = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9.+_-]{1,64}$/.test(value) ? value : null;
/** Read binary-owned ExpoApplication constants, never update-owned app configuration. */
export function nativeApplicationMetadata(load: () => NativeApplication | null, installedIosBuildNumber?: unknown) {
  // ExpoConstants still exports iOS CFBundleVersion directly from NSBundle.
  // Preserve that binary-owned capability on existing iOS builds without ExpoApplication.
  const iosBuild = clean(installedIosBuildNumber);
  try {
    const native = load();
    return { applicationVersion: clean(native?.nativeApplicationVersion), nativeBuildVersion: clean(native?.nativeBuildVersion) ?? iosBuild,
      nativeMetadataAvailable: native != null };
  } catch { return { applicationVersion: null, nativeBuildVersion: iosBuild, nativeMetadataAvailable: false }; }
}
