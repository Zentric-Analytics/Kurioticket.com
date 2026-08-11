import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { requirePreviewEnvironment } from "./config.mjs";
import { PreviewLedger } from "./ledger.mjs";
import { PreviewOrchestrator } from "./orchestrator.mjs";
import { GitHubClient, RenderClient } from "./remote-clients.mjs";

const values = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, args) => value.startsWith("--") ? [...pairs, [value.slice(2), args[index + 1]]] : pairs, []));
const platform = values.platform;
const sourceSha = values.sha;
if (!['ios', 'android'].includes(platform) || !/^[0-9a-f]{40}$/.test(sourceSha ?? "")) throw new Error("Usage: npm run preview-release:recover-native -- --platform <ios|android> --sha <current-dev-sha>");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const config = requirePreviewEnvironment();
if (config.mode !== "active") throw new Error("Canonical native recovery requires PREVIEW_RELEASE_MODE=active.");
const ledger = new PreviewLedger(config.databaseUrl);
try {
  for (const migration of (await readdir(resolve(root, "services/preview-release/sql"))).filter((name) => /^\d+_.+\.sql$/.test(name)).sort()) {
    await ledger.migrate(await readFile(resolve(root, "services/preview-release/sql", migration), "utf8"));
  }
  const github = new GitHubClient({ readToken: config.githubReadToken, statusToken: config.githubStatusToken, repository: config.repository });
  const orchestrator = new PreviewOrchestrator({ config, ledger, github, render: new RenderClient({ apiKey: config.renderApiKey, serviceId: config.renderServiceId }) });
  const result = await orchestrator.recoverCanonicalNativeBuild({ sourceSha, platform });
  console.log(JSON.stringify({ event: "canonical-native-recovery-complete", platform, sourceSha, ...result }));
} finally { await ledger.close(); }
