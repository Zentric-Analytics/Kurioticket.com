import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PREVIEW_IDENTITY, requirePreviewEnvironment } from "./config.mjs";
import { PreviewLedger } from "./ledger.mjs";
import { GitHubClient, RenderClient, EasClient } from "./remote-clients.mjs";
import { redactPreflightError, runPreviewPreflight } from "./preflight.mjs";
import { AppStoreConnectClient } from "./app-store-connect.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const config = requirePreviewEnvironment();
const ledger = new PreviewLedger(config.databaseUrl);
try {
for (const migration of (await readdir(resolve(root, "services/preview-release/sql"))).filter((name) => /^\d+_.+\.sql$/.test(name)).sort()) {
  await ledger.migrate(await readFile(resolve(root, "services/preview-release/sql", migration), "utf8"));
}
  const result = await runPreviewPreflight({
    config,
    ledger,
    github: new GitHubClient({ readToken: config.githubReadToken, repository: config.repository }),
    render: new RenderClient({ apiKey: config.renderApiKey, serviceId: config.renderServiceId }),
    renderWorker: new RenderClient({ apiKey: config.renderApiKey, serviceId: PREVIEW_IDENTITY.renderWorkerServiceId }),
    eas: new EasClient({ expoToken: config.expoToken, cwd: resolve(root, "apps/mobile") }),
    apple: new AppStoreConnectClient(config.appStoreConnect),
  });
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(JSON.stringify({ status: "FAIL", error: redactPreflightError(error, [config.githubReadToken, config.renderApiKey, config.expoToken, config.databaseUrl, config.appStoreConnect.privateKey, config.appStoreConnect.issuerId, config.appStoreConnect.keyId]) }));
  process.exitCode = 1;
} finally {
  await ledger.close();
}
