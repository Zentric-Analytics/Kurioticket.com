import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { classifyChangeSet } from "./classifier.mjs";
import { PREVIEW_IDENTITY, assertPreviewIdentity } from "./config.mjs";
import { reconcileBuilds, reconcileSubmission } from "./eas-state.mjs";
import { exactChangeSet, exactCheckout, EasClient, nativeFingerprints, prepareCheckout } from "./remote-clients.mjs";
import { inspectPreviewUpdateHistory, waitForStaging } from "../../apps/mobile/scripts/preview-ota-automation.mjs";

export class PreviewOrchestrator {
  constructor({ config, ledger, github, render, easFactory = (cwd) => new EasClient({ expoToken: config.expoToken, cwd }), stagingWait = waitForStaging, sleep = delay }) {
    this.config = config; this.ledger = ledger; this.github = github; this.render = render; this.easFactory = easFactory; this.stagingWait = stagingWait; this.sleep = sleep;
  }

  async cycle() {
    const sourceSha = await retry(() => this.github.latestDevSha(), { attempts: 4, sleep: this.sleep });
    const previous = await this.ledger.lastSuccessful();
    if (previous?.source_sha === sourceSha) return { state: "NO_CHANGE", sourceSha };
    const record = await this.ledger.claim({ sourceSha, previousSha: previous?.source_sha ?? null, workerId: this.config.workerId, leaseMs: this.config.leaseMs, mode: this.config.mode });
    if (!record) return { state: "LOCKED_OR_COMPLETE", sourceSha };
    const lease = maintainLease({ ledger: this.ledger, sourceSha, workerId: this.config.workerId, leaseMs: this.config.leaseMs });
    try {
      await this.github.report(sourceSha, "pending", `Preview release ${this.config.mode} evaluation started`);
      return await this.process(record, previous, lease);
    } catch (error) {
      const safe = redact(error instanceof Error ? error.message : String(error));
      await this.ledger.transition(sourceSha, this.config.workerId, [record.state, "VALIDATING", "PLANNED", "DELIVERING"], "FAILED", { failure_reason: safe, recovery_action: "Retry the same ledger record after correcting the reported cause." }).catch(() => {});
      await this.github.report(sourceSha, "failure", `Preview release failed: ${safe}`).catch(() => {});
      throw error;
    } finally { await lease.stop(); }
  }

  async process(record, previous, lease) {
    const sha = record.source_sha;
    await this.ledger.transition(sha, this.config.workerId, [record.state], "VALIDATING", { validation_state: "IN_PROGRESS" });
    const checkout = await exactCheckout({ repository: this.config.repository, token: this.config.githubReadToken, sha });
    try {
      const files = previous ? await exactChangeSet({ directory: checkout.directory, repository: this.config.repository, token: this.config.githubReadToken, previousSha: previous.source_sha, targetSha: sha }) : [];
      let classification = previous ? classifyChangeSet(files) : { classification: "NO_DELIVERY", reason: "initial-baseline", files: [] };
      classification = applyCutoverBaseline({ classification, files, sha, config: this.config });
      if (classification.classification === "UNSAFE") throw new Error(`Release classification failed closed: ${classification.reason}.`);
      await prepareCheckout(checkout.directory);
      const identity = await resolvedIdentity(checkout.directory);
      assertPreviewIdentity(identity);
      const fingerprints = await nativeFingerprints(checkout.directory);
      await lease.checkpoint();
      if (classification.classification.includes("OTA")) {
        const prior = previous?.evidence?.fingerprints;
        if (!prior || prior.ios !== fingerprints.ios || prior.android !== fingerprints.android) {
          classification = { ...classification, classification: classification.classification.replace("OTA", "ANDROID_NATIVE+IOS_NATIVE"), reason: prior ? "native-fingerprint-changed" : "native-fingerprint-baseline-missing" };
        }
      }
      const planned = await this.ledger.transition(sha, this.config.workerId, ["VALIDATING"], "PLANNED", { classification: classification.classification, validation_state: "PASSED", evidence: { files, identity, fingerprints } });
      if (this.config.mode === "dry-run" || classification.classification === "NO_DELIVERY") {
        const complete = await this.ledger.transition(sha, this.config.workerId, [planned.state], "COMPLETE", { evidence: { files, identity, fingerprints, plan: classification, submissionPerformed: false } });
        await this.github.report(sha, "success", `Preview ${this.config.mode} plan: ${classification.classification}`);
        return complete;
      }
      await this.ledger.transition(sha, this.config.workerId, [planned.state], "DELIVERING");
      const evidence = { files, identity, fingerprints, classification };
      if (classification.classification.includes("WEB")) evidence.web = await this.deliverWeb(sha, lease);
      if (classification.classification.includes("OTA")) evidence.ota = await this.deliverOta(sha, checkout.directory, lease);
      if (classification.classification.includes("IOS_NATIVE")) evidence.ios = await this.deliverIos(sha, checkout.directory, lease);
      if (classification.classification.includes("ANDROID_NATIVE")) evidence.android = await this.deliverAndroid(sha, checkout.directory, lease);
      const complete = await this.ledger.transition(sha, this.config.workerId, ["DELIVERING"], "COMPLETE", { evidence });
      await this.github.report(sha, "success", `Preview delivery complete: ${classification.classification}`);
      return complete;
    } finally { await checkout.cleanup(); }
  }

  async deliverWeb(sha, lease) {
    await lease.checkpoint();
    const recorded = await this.ledger.getAction("WEB", sha);
    const remoteMatches = recorded?.remote_id ? [] : await this.render.findDeploysBySha(sha);
    let deploy = recorded?.remote_id
      ? await this.render.getDeploy(recorded.remote_id)
      : remoteMatches[0] ?? await this.render.createDeploy(sha);
    if (!deploy?.id || (recorded?.remote_id && deploy.id !== recorded.remote_id)) throw new Error("Recorded Render deployment identity is malformed or mismatched.");
    const initialStatus = String(deploy.status ?? "CREATED").toUpperCase();
    if (["BUILD_FAILED", "UPDATE_FAILED", "CANCELED", "DEACTIVATED"].includes(initialStatus)) {
      await this.ledger.recordAction({ sourceSha: sha, kind: "WEB", identityKey: sha, remoteId: deploy.id, state: initialStatus, evidence: deploy });
      await lease.checkpoint();
      const existingReplacements = (await this.render.findDeploysBySha(sha)).filter(({ id }) => id !== deploy.id);
      const replacement = existingReplacements[0] ?? await this.render.createDeploy(sha, { excludeIds: [deploy.id] });
      if (!replacement?.id || replacement.id === deploy.id) throw new Error("Replacement Render deployment identity is malformed or unchanged.");
      await this.ledger.replaceTerminalAction({ sourceSha: sha, kind: "WEB", identityKey: sha, expectedRemoteId: deploy.id, remoteId: replacement.id, state: replacement.status ?? "CREATED", evidence: replacement });
      deploy = replacement;
    } else {
      await this.ledger.recordAction({ sourceSha: sha, kind: "WEB", identityKey: sha, remoteId: deploy.id, state: initialStatus, evidence: deploy });
    }
    for (let attempt = 0; attempt < 120; attempt += 1) {
      await lease.checkpoint();
      const current = await retry(() => this.render.getDeploy(deploy.id), { attempts: 3, sleep: this.sleep });
      const status = String(current.status ?? "").toLowerCase();
      if (["live", "succeeded"].includes(status)) {
        const deployedSha = current.commit?.id ?? current.commitId;
        if (deployedSha !== sha) throw new Error("Render deployed SHA does not match the requested SHA.");
        const health = await this.stagingWait({ origin: PREVIEW_IDENTITY.apiOrigin, targetSha: sha, attempts: 20, delayMs: 5_000, sleep: this.sleep });
        await this.ledger.recordAction({ sourceSha: sha, kind: "WEB", identityKey: sha, remoteId: deploy.id, state: status.toUpperCase(), evidence: current });
        return { deployId: deploy.id, deployedSha, status, health };
      }
      if (["build_failed", "update_failed", "canceled", "deactivated"].includes(status)) throw new Error(`Render deployment ${deploy.id} ended in ${status}.`);
      await this.sleep(15_000);
    }
    throw new Error(`Render deployment ${deploy.id} exceeded its bounded polling window.`);
  }

  async deliverOta(sha, cwd, lease) {
    const eas = this.easFactory(join(cwd, "apps/mobile"));
    const message = `Independent Preview all OTA for ${sha}`;
    const history = await eas.listUpdates();
    const iosReplay = inspectPreviewUpdateHistory(history, sha, "ios");
    const androidReplay = inspectPreviewUpdateHistory(history, sha, "android");
    if (iosReplay.matchingUpdates > 1 || androidReplay.matchingUpdates > 1) throw new Error("EAS update history contains conflicting exact-SHA groups.");
    const alreadyPublished = iosReplay.alreadyPublished && androidReplay.alreadyPublished;
    if (iosReplay.alreadyPublished !== androidReplay.alreadyPublished) throw new Error("EAS update history has an incomplete cross-platform exact-SHA publication.");
    if (!alreadyPublished) await lease.checkpoint();
    const updates = alreadyPublished ? history.filter((entry) => entry.message.includes(sha)) : await eas.publishUpdate(message);
    const ids = updates.map((entry) => entry.id ?? entry.group);
    const identityKey = `${sha}:${PREVIEW_IDENTITY.runtime}:${PREVIEW_IDENTITY.channel}`;
    await this.ledger.recordAction({ sourceSha: sha, kind: "OTA", identityKey, remoteId: ids.join(","), state: "PUBLISHED", evidence: updates });
    return { updateIds: ids, runtime: PREVIEW_IDENTITY.runtime, channel: PREVIEW_IDENTITY.channel };
  }

  async deliverIos(sha, cwd, lease) {
    const eas = this.easFactory(join(cwd, "apps/mobile"));
    let decision = reconcileBuilds(await eas.listIosBuilds(sha), sha);
    if (["CONFLICT", "MALFORMED_RESPONSE"].includes(decision.decision)) throw new Error(`EAS iOS reconciliation failed closed: ${decision.decision}.`);
    if (["FAILED_MATCH", "CANCELED_MATCH"].includes(decision.decision)) throw new Error(`Existing exact-SHA EAS build is ${decision.decision}; explicit retry policy is required.`);
    let build = decision.build;
    if (decision.decision === "NONE") {
      await lease.checkpoint();
      build = await eas.createIosBuild();
      decision = { decision: "CREATED", build };
    }
    await this.ledger.recordAction({ sourceSha: sha, kind: "IOS_BUILD", identityKey: `${sha}:${PREVIEW_IDENTITY.easProjectId}:ios:preview`, remoteId: build.id, state: decision.decision, evidence: build });
    for (let attempt = 0; attempt < 240; attempt += 1) {
      await lease.checkpoint();
      const current = await eas.viewBuild(build.id);
      const status = String(current.status ?? "").toUpperCase();
      await this.ledger.recordAction({ sourceSha: sha, kind: "IOS_BUILD", identityKey: `${sha}:${PREVIEW_IDENTITY.easProjectId}:ios:preview`, remoteId: build.id, state: status, evidence: current });
      if (status === "FINISHED") {
        const submission = reconcileSubmission(current);
        if (["CONFLICT", "UNKNOWN"].includes(submission.state)) throw new Error(`TestFlight auto-submit state is ${submission.state}; no duplicate recovery submission was attempted.`);
        if (submission.state === "NOT_CREATED") {
          if (current.autoSubmit !== false) throw new Error("TestFlight submission is absent but auto-submit disposition is not explicitly false; recovery failed closed.");
          const identityKey = `ios-submission:${build.id}`;
          await lease.checkpoint();
          const recovered = await eas.submitIosBuild(build.id);
          await this.ledger.recordAction({ sourceSha: sha, kind: "IOS_SUBMISSION", identityKey, remoteId: recovered.id, state: "CREATED", evidence: recovered });
          return { buildId: build.id, buildNumber: current.appBuildVersion, submissionState: "CREATED", submissionId: recovered.id, recovery: true };
        }
        await this.ledger.recordAction({ sourceSha: sha, kind: "IOS_SUBMISSION", identityKey: `ios-submission:${build.id}`, remoteId: submission.submission?.id ?? null, state: submission.state, evidence: submission.submission ?? {} });
        return { buildId: build.id, buildNumber: current.appBuildVersion, submissionState: submission.state, submissionId: submission.submission?.id ?? null };
      }
      if (["ERRORED", "FAILED", "CANCELED"].includes(status)) throw new Error(`EAS iOS build ${build.id} ended in ${status}.`);
      await this.sleep(30_000);
    }
    throw new Error(`EAS iOS build ${build.id} exceeded its bounded monitoring window.`);
  }

  async deliverAndroid(sha, cwd, lease) {
    const eas = this.easFactory(join(cwd, "apps/mobile"));
    let decision = reconcileBuilds(await eas.listAndroidBuilds(sha), sha, "android");
    if (["CONFLICT", "MALFORMED_RESPONSE"].includes(decision.decision)) throw new Error(`EAS Android reconciliation failed closed: ${decision.decision}.`);
    if (["FAILED_MATCH", "CANCELED_MATCH"].includes(decision.decision)) throw new Error(`Existing exact-SHA EAS Android build is ${decision.decision}; explicit retry policy is required.`);
    let build = decision.build;
    if (decision.decision === "NONE") {
      await lease.checkpoint();
      build = await eas.createAndroidBuild();
      decision = { decision: "CREATED", build };
    }
    const identityKey = `${sha}:${PREVIEW_IDENTITY.easProjectId}:android:preview`;
    await this.ledger.recordAction({ sourceSha: sha, kind: "ANDROID_BUILD", identityKey, remoteId: build.id, state: decision.decision, evidence: build });
    for (let attempt = 0; attempt < 240; attempt += 1) {
      await lease.checkpoint();
      const current = await eas.viewBuild(build.id);
      const status = String(current.status ?? "").toUpperCase();
      await this.ledger.recordAction({ sourceSha: sha, kind: "ANDROID_BUILD", identityKey, remoteId: build.id, state: status, evidence: current });
      if (status === "FINISHED") return { buildId: build.id, buildNumber: current.appBuildVersion, status };
      if (["ERRORED", "FAILED", "CANCELED"].includes(status)) throw new Error(`EAS Android build ${build.id} ended in ${status}.`);
      await this.sleep(30_000);
    }
    throw new Error(`EAS Android build ${build.id} exceeded its bounded monitoring window.`);
  }
}

async function resolvedIdentity(root) {
  const policy = JSON.parse(await readFile(join(root, "apps/mobile/release-policy.json"), "utf8"));
  const eas = JSON.parse(await readFile(join(root, "apps/mobile/eas.json"), "utf8"));
  return { appName: policy.preview.displayName, bundleIdentifier: policy.preview.bundleIdentifier, scheme: policy.preview.scheme, projectId: "89f6fd88-c0d7-495a-9e2b-8301b09f407d", profile: "preview", channel: eas.build.preview.channel, runtime: policy.preview.runtimeVersion, apiOrigin: eas.build.preview.env.EXPO_PUBLIC_API_BASE_URL };
}

export async function retry(operation, { attempts, sleep, baseMs = 1_000 }) {
  let last;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await operation(); } catch (error) { last = error; if (attempt + 1 < attempts) await sleep(baseMs * 2 ** attempt); }
  }
  throw last;
}

export function maintainLease({ ledger, sourceSha, workerId, leaseMs }) {
  let stopped = false;
  let lost = null;
  let renewing = Promise.resolve();
  const renew = () => {
    renewing = renewing.then(() => ledger.heartbeat(sourceSha, workerId, leaseMs)).catch((error) => { lost = error; });
    return renewing;
  };
  const timer = setInterval(renew, Math.max(5_000, Math.floor(leaseMs / 3)));
  timer.unref?.();
  return {
    async checkpoint() {
      if (stopped) throw new Error("Preview release lease keeper is stopped.");
      if (lost) throw new Error(`Preview release lease renewal failed: ${lost.message ?? lost}`);
      await renew();
      if (lost) throw new Error(`Preview release lease renewal failed: ${lost.message ?? lost}`);
    },
    async stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      await renewing;
    },
  };
}

export function applyCutoverBaseline({ classification, files, sha, config }) {
  if (config.cutoverBaselineSha !== sha) return classification;
  if (config.mode !== "dry-run") throw new Error("Cutover baseline may only be established in dry-run mode.");
  return { classification: "NO_DELIVERY", reason: "approved-cutover-baseline", files };
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const redact = (message) => message.replace(/(?:Bearer|token|password|secret)\s*[:=]?\s*[^\s,;]+/gi, "$1 [REDACTED]").slice(0, 500);
