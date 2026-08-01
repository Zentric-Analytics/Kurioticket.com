const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const repositoryRoot = path.resolve(projectRoot, "../..");

/** @type {import("expo/metro-config").MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Explore consumes platform-neutral plain data from the repository-level shared/
// directory. The repository is not declared as an npm workspace, so Expo cannot
// infer this extra source root automatically.
config.watchFolders = Array.from(new Set([
  ...(config.watchFolders ?? []),
  repositoryRoot,
]));

// Keep native dependency resolution anchored to apps/mobile/node_modules. The
// root application intentionally uses different React versions and must not be
// selected while Metro bundles the mobile app.
config.resolver.nodeModulesPaths = Array.from(new Set([
  path.resolve(projectRoot, "node_modules"),
  ...(config.resolver.nodeModulesPaths ?? []),
]));

module.exports = config;
