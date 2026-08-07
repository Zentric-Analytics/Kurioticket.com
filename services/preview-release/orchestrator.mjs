import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { classifyChangeSet } from "./classifier.mjs";
import { PREVIEW_IDENTITY, assertPreviewIdentity } from "./config.mjs";
import { reconcileBuilds, reconcileSubmissionHistory } from "./eas-state.mjs";
import { exactChangeSet, exactCheckout, EasClient, nativeFingerprints, prepareCheckout } from "./remote-clients.mjs";
import { inspectPreviewUpdateHistory, waitForStaging } from "../../apps/mobile/scripts/preview-ota-automation.mjs";
import { AppStoreConnectClient } from "./app-store-connect.mjs";

export class PreviewOrchestrator {
  constructor({ config, ledger, github, render, easFactory = (cwd) => new EasClient({ expoToken: config.expoToken, cwd }), appleFactory = () => new AppStoreConnectClient(config.appStoreConnect), stagingWait = waitForStaging, sleep = delay }) {
    this.config = config; this.ledger = ledger; this.github = github; this.render = render; this.easFactory = easFactory; this.appleFactory = appleFactory; this.stagingWait = stagingWait; this.sleep = sleep;
  }

  async cycle() {
    const currentDevSha = await retry(() => this.github.latestDevSha(), { attempts: 4, sleep: this.sleep });
    const previous = await this.ledger.lastSuccessful();
    const pendingDistribution = !this.config.iosNativeBackfillSha && typeof this.ledger.pendingIosDistribution === "function" ? await this.ledger.pendingIosDistribution() : null;
    const currentDevNeedsEvaluation = previous?.source_sha !== currentDevSha;
    const sourceSha = this.config.iosNativeBackfillSha ?? (!currentDevNeedsEvaluation ? pendingDistribution?.source_sha : null) ?? currentDevSha;
    if (sourceSha !== currentDevSha) await this.github.compare(sourceSha, currentDevSha);
    const iosNativeBackfill = Boolean(this.config.iosNativeBackfillSha);
    const deliveredNative = iosNativeBackfill ? {} : await this.deliveredNativeBaselines();
    const iosDistributionPending = !iosNativeBackfill && (pendingDistribution?.source_sha === sourceSha || (typeof this.ledger.requiresIosDistribution === "function" && await this.ledger.requiresIosDistribution(sourceSha)));
    const pendingNative = previous?.source_sha === sourceSha
      ? nativeDriftTargets(previous.evidence?.fingerprints, deliveredNative)
      : [];
    if (previous?.source_sha === sourceSha && !iosNativeBackfill && !pendingNative.length && !iosDistributionPending) return { state: "NO_CHANGE", sourceSha };
    const claim = { sourceSha, previousSha: previous?.source_sha ?? null, workerId: this.config.workerId, leaseMs: this.config.leaseMs, mode: this.config.mode };
    const record = iosNativeBackfill
      ? await this.ledger.claimIosNativeBackfill({ ...claim, identityKey: `${sourceSha}:${PREVIEW_IDENTITY.easProjectId}:ios:preview` })
      : iosDistributionPending
        ? await this.ledger.claimIosDistribution(claim)
      : pendingNative.length
        ? await this.ledger.claimNativeDrift(claim)
      : await this.ledger.claim(claim);
    if (!record) return { state: "LOCKED_OR_COMPLETE", sourceSha };
    const lease = maintainLease({ ledger: this.ledger, sourceSha, workerId: this.config.workerId, leaseMs: this.config.leaseMs });
    try {
      await this.github.report(sourceSha, "pending", `Preview release ${this.config.mode} evaluation started`);
      const classificationBaseline = iosNativeBackfill || iosDistributionPending ? null : previous;
      return await this.process(record, classificationBaseline, lease, deliveredNative, iosDistributionPending);
    } catch (error) {
      const safe = redact(error instanceof Error ? error.message : String(error));
      await this.ledger.transition(sourceSha, this.config.workerId, [record.state, "VALIDATING", "PLANNED", "DELIVERING"], "FAILED", { failure_reason: safe, recovery_action: "Retry the same ledger record after correcting the reported cause." }).catch(() => {});
      await this.github.report(sourceSha, "failure", `Preview release failed: ${safe}`).catch(() => {});
      throw error;
    } finally { await lease.stop(); }
  }

  async process(record, previous, lease, deliveredNative = null, iosDistributionPending = false) {
    const sha = record.source_sha;
    await this.ledger.transition(sha, this.config.workerId, [record.state], "VALIDATING", { validation_state: "IN_PROGRESS" });
    const checkout = await exactCheckout({ repository: this.config.repository, token: this.config.githubReadToken, sha });
    try {
      const files = previous ? await exactChangeSet({ directory: checkout.directory, repository: this.config.repository, token: this.config.githubReadToken, previousSha: previous.source_sha, targetSha: sha }) : [];
      let classification = previous ? classifyChangeSet(files) : { classification: "NO_DELIVERY", reason: "initial-baseline", files: [] };
      classification = applyCutoverBaseline({ classification, files, sha, config: this.config });
      classification = applyIosNativeBackfill({ classification, files, sha, config: this.config });
      if (iosDistributionPending) classification = { classification: "IOS_NATIVE", reason: "pending-testflight-internal-distribution", files };
      if (classification.classification === "UNSAFE") throw new Error(`Release classification failed closed: ${classification.reason}.`);
      await prepareCheckout(checkout.directory);
      const identity = await resolvedIdentity(checkout.directory);
      assertPreviewIdentity(identity);
      const fingerprints = await nativeFingerprints(checkout.directory);
      await lease.checkpoint();
      const nativeBaselines = deliveredNative ?? await this.deliveredNativeBaselines();
      classification = enforceDeliveredNativeBaseline({ classification, fingerprints, deliveredNative: nativeBaselines });
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

  async deliveredNativeBaselines() {
    const result = {};
    if (typeof this.ledger.lastSuccessfulNative !== "function") return result;
    for (const platform of ["ios", "android"]) {
      const record = await this.ledger.lastSuccessfulNative(platform);
      if (record) result[platform] = { sourceSha: record.source_sha, buildId: record.native_build_id, fingerprint: record.native_fingerprint };
    }
    return result;
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
    const history = await eas.listUpdates();
    const updates = [];
    for (const platform of ["ios", "android"]) {
      const replay = inspectPreviewUpdateHistory(history, sha, platform);
      if (replay.matchingUpdates > 1) throw new Error(`EAS update history contains conflicting exact-SHA ${platform} groups.`);
      if (replay.alreadyPublished) {
        updates.push(...history.filter((entry) => entry.message.includes(sha) && entry.platforms.includes(platform)));
        continue;
      }
      await lease.checkpoint();
      const message = `Automatic Preview ${platform === "ios" ? "iOS" : "Android"} OTA for ${sha}; audit run 0`;
      const published = await eas.publishUpdate(message, platform);
      updates.push(...published);
    }
    const ids = updates.map((entry) => entry.id ?? entry.group);
    const identityKey = `${sha}:${PREVIEW_IDENTITY.runtime}:${PREVIEW_IDENTITY.channel}`;
    await this.ledger.recordAction({ sourceSha: sha, kind: "OTA", identityKey, remoteId: ids.join(","), state: "PUBLISHED", evidence: updates });
    return { updateIds: ids, runtime: PREVIEW_IDENTITY.runtime, channel: PREVIEW_IDENTITY.channel };
  }

  async deliverIos(sha, cwd, lease) {
    const eas = this.easFactory(join(cwd, "apps/mobile"));
    const buildIdentityKey = `${sha}:${PREVIEW_IDENTITY.easProjectId}:ios:preview`;
    const recordedBuildAction = await this.ledger.getAction("IOS_BUILD", buildIdentityKey);
    let decision;
    if (recordedBuildAction?.remote_id) {
      decision = reconcileBuilds([await eas.viewBuild(recordedBuildAction.remote_id)], sha);
      if (!["ACTIVE_MATCH", "FINISHED_MATCH"].includes(decision.decision)) {
        throw new Error(`Persisted iOS build ${recordedBuildAction.remote_id} failed identity reconciliation: ${decision.decision}.`);
      }
    } else {
      decision = reconcileBuilds(await eas.listIosBuilds(sha), sha);
    }
    if (["CONFLICT", "MALFORMED_RESPONSE"].includes(decision.decision)) throw new Error(`EAS iOS reconciliation failed closed: ${decision.decision}.`);
    if (["FAILED_MATCH", "CANCELED_MATCH"].includes(decision.decision)) throw new Error(`Existing exact-SHA EAS build is ${decision.decision}; explicit retry policy is required.`);
    let build = decision.build;
    if (decision.decision === "NONE") {
      await lease.checkpoint();
      build = await eas.createIosBuild();
      decision = { decision: "CREATED", build };
    }
    await this.ledger.recordAction({ sourceSha: sha, kind: "IOS_BUILD", identityKey: buildIdentityKey, remoteId: build.id, state: decision.decision, evidence: build });
    for (let attempt = 0; attempt < 240; attempt += 1) {
      await lease.checkpoint();
      const current = await eas.viewBuild(build.id);
      const status = String(current.status ?? "").toUpperCase();
      await this.ledger.recordAction({ sourceSha: sha, kind: "IOS_BUILD", identityKey: `${sha}:${PREVIEW_IDENTITY.easProjectId}:ios:preview`, remoteId: build.id, state: status, evidence: current });
      if (status === "FINISHED") {
        const submission = reconcileSubmissionHistory(await eas.listIosSubmissions(), build.id);
        if (["CONFLICT", "UNKNOWN", "FAILED"].includes(submission.state)) throw new Error(`TestFlight auto-submit state is ${submission.state}; no duplicate recovery submission was attempted.`);
        if (submission.state === "NOT_CREATED") {
          await this.sleep(15_000);
          continue;
        }
        await this.ledger.recordAction({ sourceSha: sha, kind: "IOS_SUBMISSION", identityKey: `ios-submission:${build.id}`, remoteId: submission.submission.id, state: submission.state, evidence: submission.submission });
        if (submission.state === "FINISHED") {
          const distribution = await this.distributeIosToInternalGroup({ sha, build, current, submission: submission.submission, lease });
          return { buildId: build.id, buildNumber: current.appBuildVersion, submissionState: submission.state, submissionId: submission.submission.id, distribution };
        }
        await this.sleep(15_000);
        continue;
      }
      if (["ERRORED", "FAILED", "CANCELED"].includes(status)) throw new Error(`EAS iOS build ${build.id} ended in ${status}.`);
      await this.sleep(30_000);
    }
    throw new Error(`EAS iOS build ${build.id} exceeded its bounded monitoring window.`);
  }

  async distributeIosToInternalGroup({ sha, build, current, submission, lease }) {
    const apple = this.appleFactory();
    const context = await apple.previewContext();
    const version = String(current.appVersion ?? build.appVersion ?? "");
    const buildNumber = String(current.appBuildVersion ?? build.appBuildVersion ?? "");
    for (let attempt = 0; attempt < 240; attempt += 1) {
      await lease.checkpoint();
      const resolved = await apple.resolveBuild({ version, buildNumber });
      if (resolved.state === "PROCESSING") { await this.sleep(30_000); continue; }
      const appleBuildId = resolved.build.id;
      const identityKey = `${appleBuildId}:${context.group.id}`;
      const associated = await apple.isAssociated(appleBuildId);
      if (!associated) {
        await this.ledger.recordAction({ sourceSha: sha, kind: "IOS_TESTFLIGHT_DISTRIBUTION", identityKey, remoteId: appleBuildId, state: "PLANNED", evidence: { appleBuildId, betaGroupId: context.group.id, version, buildNumber, processingState: resolved.state, easBuildId: build.id, easSubmissionId: submission.id } });
        try { await apple.associate(appleBuildId); } catch (error) {
          if (!await apple.isAssociated(appleBuildId)) throw error;
        }
      }
      if (!await apple.isAssociated(appleBuildId)) throw new Error("Apple accepted TestFlight association but read-back verification failed.");
      await this.ledger.recordAction({ sourceSha: sha, kind: "IOS_TESTFLIGHT_DISTRIBUTION", identityKey, remoteId: appleBuildId, state: "FINISHED", evidence: { appleBuildId, betaGroupId: context.group.id, betaGroupName: context.group.attributes.name, appId: context.app.id, bundleIdentifier: context.app.attributes.bundleId, version, buildNumber, processingState: resolved.state, easBuildId: build.id, easSubmissionId: submission.id, associated: true } });
      return { appleBuildId, betaGroupId: context.group.id, state: "FINISHED", associated: true };
    }
    throw new Error("Apple build processing exceeded its bounded polling window.");
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

export function applyIosNativeBackfill({ classification, files, sha, config }) {
  if (config.iosNativeBackfillSha !== sha) return classification;
  if (config.mode !== "active") throw new Error("iOS native backfill requires active Preview release mode.");
  return { classification: "IOS_NATIVE", reason: "approved-ios-native-backfill", files };
}

export function nativeDriftTargets(fingerprints, deliveredNative) {
  if (!fingerprints || typeof fingerprints !== "object") return [];
  const targets = [];
  for (const [platform, target] of [["ios", "IOS_NATIVE"], ["android", "ANDROID_NATIVE"]]) {
    const current = fingerprints[platform];
    const delivered = deliveredNative?.[platform]?.fingerprint;
    if (current && delivered && current !== delivered) targets.push(target);
  }
  return targets;
}

export function enforceDeliveredNativeBaseline({ classification, fingerprints, deliveredNative }) {
  const drift = nativeDriftTargets(fingerprints, deliveredNative);
  if (!drift.length) return classification;
  const targets = new Set(String(classification.classification).split("+").filter((value) => value && value !== "NO_DELIVERY"));
  for (const target of drift) targets.add(target);
  return { ...classification, classification: [...targets].sort().join("+"), reason: "delivered-native-fingerprint-changed", deliveredNative, nativeDrift: drift };
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const redact = (message) => message.replace(/(?:Bearer|token|password|secret)\s*[:=]?\s*[^\s,;]+/gi, "$1 [REDACTED]").slice(0, 500);
