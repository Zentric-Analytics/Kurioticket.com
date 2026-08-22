import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

export function createLocalPreviewInvocation({
  args = [],
  environment = process.env,
  nodePath = process.execPath,
  expoCliPath = require.resolve("expo/bin/cli"),
} = {}) {
  if (args.includes("--web") || args.includes("-w")) {
    throw new Error("Expo Web is not a supported Kurioticket mobile platform.");
  }
  return {
    command: nodePath,
    args: [expoCliPath, "start", ...args],
    options: {
      stdio: "inherit",
      env: { ...environment, APP_VARIANT: "preview", APP_BUILD_MODE: "local", LOCAL_DEVELOPMENT: "true" },
    },
  };
}

export function runLocalPreview({ args = process.argv.slice(2), spawnImpl = spawn, exitImpl = process.exit } = {}) {
  const invocation = createLocalPreviewInvocation({ args });
  const child = spawnImpl(invocation.command, invocation.args, invocation.options);
  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    exitImpl(code ?? 1);
  });
  child.on("error", () => exitImpl(1));
  return child;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  runLocalPreview();
}
