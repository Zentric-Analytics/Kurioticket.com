// Next's CommonJS lint plugin requires this synchronous CommonJS adapter.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { isAbsolute } = require("node:path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { globSync: discover } = require("tinyglobby");

// This adapter supports only Next ESLint's getRootDirs call, not fast-glob's full API.
// Refuse new call shapes so a future plugin upgrade cannot silently change behavior.
exports.globSync = (pattern, options) => {
  if (typeof pattern !== "string" || options?.onlyDirectories !== true ||
      Object.keys(options).some((key) => key !== "onlyDirectories")) {
    throw new TypeError("Unsupported Next lint directory-discovery contract");
  }
  return discover(pattern, {
    onlyDirectories: true,
    absolute: isAbsolute(pattern),
    expandDirectories: false,
  }).map((directory) => directory.replace(/\/$/, ""));
};
