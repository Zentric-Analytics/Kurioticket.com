import { requirePreviewEnvironment } from "./config.mjs";
import { PreviewLedger } from "./ledger.mjs";
import { PreviewOrchestrator } from "./orchestrator.mjs";
import { GitHubClient } from "./remote-clients.mjs";

const config = requirePreviewEnvironment();
const ledger = new PreviewLedger(config.databaseUrl);

try {
  const github = new GitHubClient({ readToken: config.githubReadToken, statusToken: null, repository: config.repository });
  const orchestrator = new PreviewOrchestrator({ config, ledger, github, render: null });
  const decision = await orchestrator.deriveDecision();
  process.stdout.write(`${JSON.stringify({ event: "PREVIEW_DECISION_TRACE", mutationPerformed: false, ...decision.trace }, null, 2)}\n`);
} finally {
  await ledger.close();
}
