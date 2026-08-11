export async function runWorkerCycle({ mode, github, orchestrator, reconcileNotifications, log = console }) {
  let sourceSha = null;
  if (mode === "active") await runIsolated("native-ownership-reconciliation", () => orchestrator.reconcileNativeOwnership(), log);
  let releaseResult = null;
  try {
    sourceSha = await github.latestDevSha();
    releaseResult = await orchestrator.cycle();
    const resolvedSha = releaseResult?.source_sha ?? releaseResult?.sourceSha ?? sourceSha;
    log.log(JSON.stringify({ event: "preview-release-cycle", sourceSha: resolvedSha, state: releaseResult?.state }));
  } catch (error) {
    log.error(JSON.stringify({ event: "preview-release-cycle-failed", error: safeError(error) }));
  }
  if (mode === "active") await runIsolated("native-notification-reconciliation", reconcileNotifications, log);
  return { sourceSha, releaseResult };
}

export async function runIsolated(stage, operation, log = console) {
  try { return await operation(); }
  catch (error) {
    log.error(JSON.stringify({ event: "preview-release-stage-failed", stage, error: safeError(error) }));
    return null;
  }
}

function safeError(error) { return String(error?.message ?? error).slice(0, 500); }
