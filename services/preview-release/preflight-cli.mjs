import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { requirePreviewEnvironment } from "./config.mjs";
import { PreviewLedger } from "./ledger.mjs";
import { GitHubClient, RenderClient, EasClient } from "./remote-clients.mjs";
import { redactPreflightError, runPreviewPreflight } from "./preflight.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const config = requirePreviewEnvironment();
const ledger = new PreviewLedger(config.databaseUrl);
try {
  await ledger.migrate(await readFile(resolve(root, "services/preview-release/sql/001_init.sql"), "utf8"));
  const result = await runPreviewPreflight({
    config,
    ledger,
    github: new GitHubClient({ readToken: config.githubReadToken, repository: config.repository }),
    render: new RenderClient({ apiKey: config.renderApiKey, serviceId: config.renderServiceId }),
    eas: new EasClient({ expoToken: config.expoToken, cwd: resolve(root, "apps/mobile") }),
  });
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(JSON.stringify({ status: "FAIL", error: redactPreflightError(error, [config.githubReadToken, config.renderApiKey, config.expoToken, config.databaseUrl]) }));
  process.exitCode = 1;
} finally {
  await ledger.close();
}
