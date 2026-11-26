type NativeApplication = { nativeApplicationVersion?: unknown; nativeBuildVersion?: unknown };
/** Read binary-owned ExpoApplication constants, never update-owned app configuration. */
export function nativeApplicationMetadata(load: () => NativeApplication | null) {
  try {
    const native = load();
    const clean = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9.+_-]{1,64}$/.test(value) ? value : null;
    return { applicationVersion: clean(native?.nativeApplicationVersion), nativeBuildVersion: clean(native?.nativeBuildVersion),
      nativeMetadataAvailable: native != null };
  } catch { return { applicationVersion: null, nativeBuildVersion: null, nativeMetadataAvailable: false }; }
}
