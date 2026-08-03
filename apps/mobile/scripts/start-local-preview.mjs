import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(command, ["expo", "start", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, APP_VARIANT: "preview", APP_BUILD_MODE: "local", LOCAL_DEVELOPMENT: "true" },
});
child.on("exit", (code) => process.exit(code ?? 1));
