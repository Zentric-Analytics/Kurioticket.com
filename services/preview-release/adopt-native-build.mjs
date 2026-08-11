import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { requirePreviewEnvironment } from "./config.mjs";
import { PreviewLedger } from "./ledger.mjs";
import { PreviewOrchestrator } from "./orchestrator.mjs";
import { EasClient, GitHubClient, RenderClient } from "./remote-clients.mjs";

const argumentsByName = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => value.startsWith("--") ? [...pairs, [value.slice(2), values[index + 1]]] : pairs, []));
const platform = argumentsByName.platform;
const sourceSha = argumentsByName.sha;
const buildId = argumentsByName["build-id"];
const submissionId = argumentsByName["submission-id"] ?? null;
if (!['android', 'ios'].includes(platform) || !/^[0-9a-f]{40}$/.test(sourceSha ?? '') || !buildId || (platform === 'ios' && !submissionId)) {
  throw new Error("Usage: npm run preview-release:adopt-native -- --platform <android|ios> --sha <source-sha> --build-id <build-id> [--submission-id <submission-id>]");
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const config = requirePreviewEnvironment();
if (config.mode !== "active") throw new Error("Native adoption requires PREVIEW_RELEASE_MODE=active.");
const ledger = new PreviewLedger(config.databaseUrl);
try {
  for (const migration of (await readdir(resolve(root, "services/preview-release/sql"))).filter((name) => /^\d+_.+\.sql$/.test(name)).sort()) {
    await ledger.migrate(await readFile(resolve(root, "services/preview-release/sql", migration), "utf8"));
  }
  const github = new GitHubClient({ readToken: config.githubReadToken, statusToken: null, repository: config.repository });
  if (await github.latestDevSha() !== sourceSha) throw new Error("Strict adoption is limited to the exact current dev SHA.");
  const orchestrator = new PreviewOrchestrator({
    config, ledger, github,
    render: new RenderClient({ apiKey: config.renderApiKey, serviceId: config.renderServiceId }),
    easFactory: (cwd) => new EasClient({ expoToken: config.expoToken, cwd }),
  });
  const result = await orchestrator.adoptNativeBuild({ sourceSha, platform, buildId, submissionId });
  console.log(JSON.stringify({ event: "preview-native-adoption-complete", platform, sourceSha, buildId, submissionId: result.submission?.id ?? null }));
} finally { await ledger.close(); }
