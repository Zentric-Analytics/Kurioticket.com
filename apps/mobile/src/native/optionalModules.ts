declare const require: ((moduleName: string) => unknown) | undefined;

export function loadOptionalModule<T>(moduleName: string): T | null {
  try {
    if (typeof require !== "function") return null;
    return require(moduleName) as T;
  } catch {
    return null;
  }
}
