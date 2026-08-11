import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { classifyChangeSet } from "./classifier.mjs";
import { PREVIEW_IDENTITY, assertPreviewIdentity } from "./config.mjs";
import { reconcileBuilds, reconcileSubmissionHistory } from "./eas-state.mjs";
import { exactChangeSet, exactCheckout, EasClient, EasRemoteObjectUnavailableError, nativeFingerprints, prepareCheckout } from "./remote-clients.mjs";
import { inspectPreviewUpdateHistory, waitForStaging } from "../../apps/mobile/scripts/preview-ota-automation.mjs";
import { AppStoreConnectClient } from "./app-store-connect.mjs";
import { unexpectedBuilds, validateAdoptableBuild, validateAdoptableIosSubmission } from "./native-ownership.mjs";

export class PreviewOrchestrator {
  constructor({ config, ledger, github, render, easFactory = (cwd) => new EasClient({ expoToken: config.expoToken, cwd }), appleFactory = () => new AppStoreConnectClient(config.appStoreConnect), checkoutFactory = exactCheckout, prepareCheckoutFactory = prepareCheckout, identityFactory = resolvedIdentity, fingerprintsFactory = (directory) => nativeFingerprints(directory, { expoToken: config.expoToken }), stagingWait = waitForStaging, sleep = delay }) {
    this.config = config; this.ledger = ledger; this.github = github; this.render = render; this.easFactory = easFactory; this.appleFactory = appleFactory; this.checkoutFactory = checkoutFactory; this.prepareCheckoutFactory = prepareCheckoutFactory; this.identityFactory = identityFactory; this.fingerprintsFactory = fingerprintsFactory; this.stagingWait = stagingWait; this.sleep = sleep;
  }

  async cycle() {
    const decision = await this.deriveDecision();
    console.log(JSON.stringify({ event: "PREVIEW_DECISION", ...decision.trace }));
    if (decision.noChange) return { state: "NO_CHANGE", sourceSha: decision.sourceSha };
    const { sourceSha, previous, deliveredNative, pendingNative, iosNativeBackfill, iosDistributionPending } = decision;
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
      if (iosDistributionPending) return await this.reconcileIosDistribution(record, lease);
      return await this.process(record, iosNativeBackfill ? null : previous, lease, deliveredNative, pendingNative);
    } catch (error) {
      const safe = redact(error instanceof Error ? error.message : String(error));
      await this.ledger.transition(sourceSha, this.config.workerId, [record.state, "VALIDATING", "PLANNED", "DELIVERING"], "FAILED", { failure_reason: safe, recovery_action: "Retry the same ledger record after correcting the reported cause." }).catch(() => {});
      await this.github.report(sourceSha, "failure", `Preview release failed: ${safe}`).catch(() => {});
      throw error;
    } finally { await lease.stop(); }
  }

  async reconcileNativeOwnership() {
    const sourceSha = await this.github.latestDevSha();
    const release = await this.ledger.releaseBySha(sourceSha);
    const fingerprints = release?.evidence?.fingerprints;
    if (!fingerprints?.ios || !fingerprints?.android) return { sourceSha, inspected: 0, violations: 0 };
    const eas = this.easFactory(join(process.cwd(), "apps/mobile"));
    const owned = await this.ledger.nativeBuildRemoteIdsForSource(sourceSha);
    let inspected = 0;
    let violations = 0;
    for (const platform of ["android", "ios"]) {
      const builds = platform === "android" ? await eas.listAndroidBuilds(sourceSha) : await eas.listIosBuilds(sourceSha);
      for (const build of unexpectedBuilds(builds, owned)) {
        inspected += 1;
        const common = { platform, buildId: build.id, sourceSha, buildNumber: build.appBuildVersion ?? null, fingerprint: build.fingerprint?.hash ?? null };
        console.warn(JSON.stringify({ event: "unexpected-native-build-detected", ...common }));
        try {
          const delivered = await this.ledger.currentDeliveredNative(platform);
          validateAdoptableBuild({ build, platform, sourceSha, fingerprint: fingerprints[platform], delivered });
          await this.ledger.recordNativeOwnershipIncident({ platform, buildId: build.id, sourceSha, state: "DETECTED", reason: "strictly-valid-build-requires-explicit-operator-adoption", evidence: common });
        } catch (error) {
          violations += 1;
          const reason = String(error?.message ?? error).slice(0, 500);
          await this.ledger.recordNativeOwnershipIncident({ platform, buildId: build.id, sourceSha, state: "REJECTED", reason, evidence: { ...common, problems: error?.evidence?.problems ?? [] } });
          console.error(JSON.stringify({ event: "ownership-violation-rejected", ...common, reason }));
        }
      }
    }
    return { sourceSha, inspected, violations };
  }

  async adoptNativeBuild({ sourceSha, platform, buildId, submissionId = null }) {
    const release = await this.ledger.releaseBySha(sourceSha);
    const fingerprint = release?.evidence?.fingerprints?.[platform];
    if (!fingerprint) throw new Error(`Release ${sourceSha} has no durable ${platform} fingerprint.`);
    const eas = this.easFactory(join(process.cwd(), "apps/mobile"));
    const build = await eas.viewBuild(buildId);
    const existingAction = await this.ledger.getAction(platform === "ios" ? "IOS_BUILD" : "ANDROID_BUILD", nativeBuildIdentityKey(platform, fingerprint));
    const delivered = await this.ledger.currentDeliveredNative(platform);
    validateAdoptableBuild({ build, platform, sourceSha, fingerprint, existingAction, delivered });

    let submission = null;
    if (platform === "ios") {
      const matches = (await eas.listIosSubmissions()).filter((item) => item?.id === submissionId && item?.submittedBuild?.id === buildId);
      if (matches.length !== 1) throw new Error("Strict iOS adoption requires one exact EAS submission relationship.");
      submission = validateAdoptableIosSubmission({ submission: matches[0], buildId });
      const apple = this.appleFactory();
      await apple.previewContext();
      const appleBuild = await apple.resolveBuild({ version: build.appVersion, buildNumber: build.appBuildVersion });
      if (appleBuild.state !== "VALID" || !appleBuild.build?.id) throw new Error("Strict iOS adoption requires one valid exact App Store Connect build mapping.");
    }
    const action = await this.ledger.adoptNativeBuild({ platform, sourceSha, fingerprint, build });
    if (submission) await this.ledger.recordAction({ sourceSha, kind: "IOS_SUBMISSION", identityKey: `ios-submission:${buildId}`, remoteId: submission.id, state: submission.status, evidence: { ...submission, ownershipSource: "SAFE_VERIFIED_ADOPTION" } });
    if (platform === "android" && String(build.status).toUpperCase() === "FINISHED") {
      await this.ledger.advanceDeliveredNative({ platform, sourceSha, fingerprint, buildId, appVersion: build.appVersion, buildNumber: build.appBuildVersion });
    }
    console.log(JSON.stringify({ event: "native-build-safely-adopted", sourceSha, platform, fingerprint, buildId, buildNumber: build.appBuildVersion, submissionId: submission?.id ?? null }));
    return { action, submission };
  }

  async recoverCanonicalNativeBuild({ sourceSha, platform }) {
    if (!['ios', 'android'].includes(platform)) throw new Error("Canonical recovery platform is invalid.");
    if (await this.github.latestDevSha() !== sourceSha) throw new Error("Canonical recovery is restricted to the exact current dev SHA.");
    const release = await this.ledger.releaseBySha(sourceSha);
    let plannedFingerprint = release?.evidence?.fingerprints?.[platform];
    if (!plannedFingerprint) throw new Error(`Release ${sourceSha} has no durable ${platform} fingerprint.`);
    const rejected = await this.ledger.rejectedNativeOwnershipIncidents({ platform, sourceSha });
    if (!rejected.length) throw new Error(`Canonical ${platform} replacement requires a rejected ownership incident.`);

    const checkout = await this.checkoutFactory({ repository: this.config.repository, token: this.config.githubReadToken, sha: sourceSha });
    try {
      await this.prepareCheckoutFactory(checkout.directory, { allowRootScriptDrift: true });
      assertPreviewIdentity(await this.identityFactory(checkout.directory));
      const currentFingerprints = await this.fingerprintsFactory(checkout.directory);
      if (currentFingerprints[platform] !== plannedFingerprint) {
        await this.ledger.correctPlannedNativeFingerprint({ platform, sourceSha, expectedFingerprint: plannedFingerprint, canonicalFingerprint: currentFingerprints[platform] });
        console.warn(JSON.stringify({ event: "canonical-native-fingerprint-corrected", platform, sourceSha, previousFingerprint: plannedFingerprint, canonicalFingerprint: currentFingerprints[platform], cause: "planning-did-not-load-eas-preview-environment" }));
        plannedFingerprint = currentFingerprints[platform];
      }

      const identityKey = nativeBuildIdentityKey(platform, plannedFingerprint);
      const reservation = await this.ledger.reserveNativeBuild({ sourceSha, platform, identityKey });
      let action = reservation.action;
      const eas = this.easFactory(join(checkout.directory, "apps/mobile"));
      if (!action.remote_id) {
        const created = platform === "ios" ? await eas.createIosBuild() : await eas.createAndroidBuild();
        action = await this.ledger.recordAction({ sourceSha, kind: platform === "ios" ? "IOS_BUILD" : "ANDROID_BUILD", identityKey, remoteId: created.id, state: "CREATED", evidence: { ...created, nativeFingerprint: plannedFingerprint, nativeArtifactSourceSha: sourceSha, latestCompatibleSourceSha: sourceSha, ownershipSource: "CANONICAL_INCIDENT_REPLACEMENT", rejectedIncidentBuildIds: rejected.map(({ build_id }) => build_id) } });
        console.log(JSON.stringify({ event: "canonical-native-replacement-created", platform, sourceSha, fingerprint: plannedFingerprint, buildId: created.id }));
      }
      const lease = { checkpoint: async () => {} };
      const result = platform === "ios"
        ? await this.deliverIos(sourceSha, checkout.directory, lease, plannedFingerprint)
        : await this.deliverAndroid(sourceSha, checkout.directory, lease, plannedFingerprint);
      const finished = await eas.viewBuild(result.buildId);
      const fingerprintComparison = await eas.compareBuildFingerprint(result.buildId, plannedFingerprint);
      validateAdoptableBuild({ build: { ...finished, fingerprintHash: fingerprintComparison.buildHash }, platform, sourceSha, fingerprint: plannedFingerprint, existingAction: action, delivered: null });
      console.log(JSON.stringify({ event: "canonical-native-replacement-verified", platform, sourceSha, fingerprint: plannedFingerprint, buildId: result.buildId, buildNumber: result.buildNumber }));
      return { ...result, fingerprint: plannedFingerprint };
    } finally { await checkout.cleanup(); }
  }

  async deriveDecision() {
    const currentDevSha = await retry(() => this.github.latestDevSha(), { attempts: 4, sleep: this.sleep });
    let previous = await this.ledger.lastSuccessful();
    if (previous?.source_sha !== currentDevSha
      && typeof this.ledger.completedCurrentDevProgressionCandidate === "function"
      && typeof this.ledger.reconcileCompletedCurrentDevProgression === "function") {
      const candidate = await this.ledger.completedCurrentDevProgressionCandidate(currentDevSha);
      if (candidate) {
        if (!candidate.previous_sha || !previous?.source_sha) throw new Error("Completed current dev progression repair lacks immutable ancestry anchors.");
        if (candidate.previous_sha === currentDevSha) throw new Error("Completed current dev progression repair has a self-referential stored baseline.");
        await this.github.compare(candidate.previous_sha, currentDevSha);
        await this.github.compare(previous.source_sha, currentDevSha);
        const reconciled = await this.ledger.reconcileCompletedCurrentDevProgression({
          sourceSha: currentDevSha,
          storedPreviousSha: candidate.previous_sha,
          latestProgressionSha: previous.source_sha,
        });
        if (reconciled) previous = reconciled;
      }
    }
    const deliveredNative = await this.deliveredNativeBaselines();
    const currentRecord = typeof this.ledger.releaseBySha === "function"
      ? await this.ledger.releaseBySha(currentDevSha)
      : previous?.source_sha === currentDevSha ? previous : null;
    const currentFingerprints = currentRecord?.evidence?.fingerprints ?? null;
    const deliveredChangeTargets = previous?.source_sha === currentDevSha
      ? await this.nativeChangeTargets(currentDevSha, deliveredNative)
      : [];
    const pendingNative = previous?.source_sha === currentDevSha
      ? [...new Set([...nativeDriftTargets(currentFingerprints, deliveredNative), ...deliveredChangeTargets])]
      : [];
    const pendingDistribution = !this.config.iosNativeBackfillSha && typeof this.ledger.pendingIosDistribution === "function" ? await this.ledger.pendingIosDistribution() : null;
    const currentDevNeedsEvaluation = previous?.source_sha !== currentDevSha;
    // Current repository progression and its platform-native requirements always
    // outrank delayed historical side effects. Historical distribution recovery
    // is selected only when current dev is fully evaluated against both canonical
    // delivered-platform pointers.
    const currentDevHasPriority = currentDevNeedsEvaluation || pendingNative.length > 0;
    const sourceSha = this.config.iosNativeBackfillSha ?? (!currentDevHasPriority ? pendingDistribution?.source_sha : null) ?? currentDevSha;
    if (sourceSha !== currentDevSha) await this.github.compare(sourceSha, currentDevSha);
    const iosNativeBackfill = Boolean(this.config.iosNativeBackfillSha);
    const iosDistributionPending = !iosNativeBackfill && (pendingDistribution?.source_sha === sourceSha || (typeof this.ledger.requiresIosDistribution === "function" && await this.ledger.requiresIosDistribution(sourceSha)));
    const noChange = previous?.source_sha === sourceSha && !iosNativeBackfill && !pendingNative.length && !iosDistributionPending;
    const selectedOperation = noChange ? "NO_CHANGE" : iosDistributionPending ? "IOS_DISTRIBUTION_RECONCILIATION" : pendingNative.length ? "CURRENT_NATIVE_RECONCILIATION" : "CURRENT_RELEASE_EVALUATION";
    const claimEligibility = !noChange && typeof this.ledger.claimEligibility === "function" ? await this.ledger.claimEligibility(sourceSha, selectedOperation) : null;
    return {
      sourceSha, previous, deliveredNative, pendingNative, iosNativeBackfill, iosDistributionPending, noChange,
      trace: {
        currentDevSha,
        ordinaryProgressionSha: previous?.source_sha ?? null,
        iosDeliveredSha: deliveredNative.ios?.sourceSha ?? null,
        iosBuildId: deliveredNative.ios?.buildId ?? null,
        iosBuildNumber: deliveredNative.ios?.buildNumber ?? null,
        iosFingerprint: deliveredNative.ios?.fingerprint ?? null,
        androidDeliveredSha: deliveredNative.android?.sourceSha ?? null,
        androidBuildId: deliveredNative.android?.buildId ?? null,
        androidBuildNumber: deliveredNative.android?.buildNumber ?? null,
        androidFingerprint: deliveredNative.android?.fingerprint ?? null,
        currentFingerprints,
        sourceRangeNativeTargets: deliveredChangeTargets,
        fingerprintNativeTargets: nativeDriftTargets(currentFingerprints, deliveredNative),
        requiredNativeTargets: pendingNative,
        pendingHistoricalDistributionSha: pendingDistribution?.source_sha ?? null,
        selectedSourceSha: sourceSha,
        selectedOperation,
        claimEligibility,
      },
    };
  }

  async process(record, previous, lease, deliveredNative = null, requiredNativeTargets = []) {
    const sha = record.source_sha;
    await this.ledger.transition(sha, this.config.workerId, [record.state], "VALIDATING", { validation_state: "IN_PROGRESS" });
    const checkout = await exactCheckout({ repository: this.config.repository, token: this.config.githubReadToken, sha });
    try {
      const files = previous ? await exactChangeSet({ directory: checkout.directory, repository: this.config.repository, token: this.config.githubReadToken, previousSha: previous.source_sha, targetSha: sha }) : [];
      let classification = previous ? classifyChangeSet(files) : { classification: "NO_DELIVERY", reason: "initial-baseline", files: [] };
      classification = applyCutoverBaseline({ classification, files, sha, config: this.config });
      classification = applyIosNativeBackfill({ classification, files, sha, config: this.config });
      if (classification.classification === "UNSAFE") throw new Error(`Release classification failed closed: ${classification.reason}.`);
      await prepareCheckout(checkout.directory);
      const identity = await resolvedIdentity(checkout.directory);
      assertPreviewIdentity(identity);
      const fingerprints = await nativeFingerprints(checkout.directory);
      await lease.checkpoint();
      const nativeBaselines = deliveredNative ?? await this.deliveredNativeBaselines();
      classification = enforceDeliveredNativeBaseline({ classification, fingerprints, deliveredNative: nativeBaselines, requiredNativeTargets });
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
      const deliveries = {};
      if (classification.classification.includes("WEB")) deliveries.web = () => this.deliverWeb(sha, lease);
      if (classification.classification.includes("OTA")) deliveries.ota = () => this.deliverOta(sha, checkout.directory, lease);
      if (classification.classification.includes("IOS_NATIVE")) deliveries.ios = () => this.deliverIos(sha, checkout.directory, lease, fingerprints.ios);
      if (classification.classification.includes("ANDROID_NATIVE")) deliveries.android = () => this.deliverAndroid(sha, checkout.directory, lease, fingerprints.android);
      Object.assign(evidence, await runDeliveries(deliveries));
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
      if (record) result[platform] = { sourceSha: record.source_sha, buildId: record.native_build_id, buildNumber: String(record.build_number), fingerprint: record.native_fingerprint };
    }
    return result;
  }

  async nativeChangeTargets(sourceSha, deliveredNative) {
    const targets = [];
    for (const [platform, target] of [["ios", "IOS_NATIVE"], ["android", "ANDROID_NATIVE"]]) {
      const deliveredSha = deliveredNative?.[platform]?.sourceSha;
      if (!deliveredSha || deliveredSha === sourceSha) continue;
      const files = await this.github.compare(deliveredSha, sourceSha);
      const classification = classifyChangeSet(files).classification;
      if (classification === "UNSAFE") throw new Error(`Native delivery baseline comparison failed closed for ${platform}.`);
      if (classification.split("+").includes(target)) targets.push(target);
    }
    return targets;
  }

  async reconcileIosDistribution(record, lease) {
    const sha = record.source_sha;
    const checkout = await this.checkoutFactory({ repository: this.config.repository, token: this.config.githubReadToken, sha });
    try {
      await this.prepareCheckoutFactory(checkout.directory);
      assertPreviewIdentity(await this.identityFactory(checkout.directory));
      const fingerprints = await this.fingerprintsFactory(checkout.directory);
      await lease.checkpoint();

      const eas = this.easFactory(join(checkout.directory, "apps/mobile"));
      const buildAction = typeof this.ledger.getNativeBuildActionForRelease === "function"
        ? await this.ledger.getNativeBuildActionForRelease(sha, "ios", fingerprints.ios)
        : await this.ledger.getAction("IOS_BUILD", `${sha}:${PREVIEW_IDENTITY.easProjectId}:ios:preview`);
      if (!buildAction?.remote_id) throw new Error("Pending TestFlight distribution is missing its durable iOS build identity.");
      let remoteBuild;
      try { remoteBuild = await eas.viewBuild(buildAction.remote_id); }
      catch (error) {
        if (!(error instanceof EasRemoteObjectUnavailableError)) throw error;
        await this.ledger.markRemoteObjectUnavailable({ kind: "IOS_BUILD", identityKey: buildAction.identity_key, remoteId: buildAction.remote_id, reason: error.message });
        await this.ledger.transition(sha, this.config.workerId, [record.state, "DETECTED"], "FAILED", { failure_reason: error.message, recovery_action: "Historical EAS object is unavailable; strict adoption or an owner-approved replacement is required. Unrelated reconciliation continues." });
        console.error(JSON.stringify({ event: "remote-object-unavailable", platform: "ios", sourceSha: sha, buildId: buildAction.remote_id }));
        console.warn(JSON.stringify({ event: "historical-action-isolated", platform: "ios", sourceSha: sha, buildId: buildAction.remote_id }));
        return { state: "OPERATOR_ATTENTION_REQUIRED", sourceSha: sha, buildId: buildAction.remote_id };
      }
      const buildDecision = reconcileBuilds([remoteBuild], sha);
      if (buildDecision.decision !== "FINISHED_MATCH") {
        throw new Error(`Pending TestFlight distribution requires one finished exact-SHA iOS build; found ${buildDecision.decision}.`);
      }

      const build = buildDecision.build;
      const submissionAction = await this.ledger.getAction("IOS_SUBMISSION", `ios-submission:${build.id}`);
      if (!submissionAction?.remote_id) throw new Error("Pending TestFlight distribution is missing its durable iOS submission identity.");
      const submission = reconcileSubmissionHistory(await eas.listIosSubmissions(), build.id);
      if (submission.state !== "FINISHED" || submission.submission.id !== submissionAction.remote_id) {
        throw new Error("Pending TestFlight distribution requires its exact finished durable iOS submission.");
      }

      const distribution = await this.distributeIosToInternalGroup({ sha, build, current: build, submission: submission.submission, lease });
      if (typeof this.ledger.advanceDeliveredNative === "function") await this.ledger.advanceDeliveredNative({
        platform: "ios", sourceSha: sha, fingerprint: fingerprints.ios, buildId: build.id,
        appVersion: build.appVersion, buildNumber: build.appBuildVersion,
        submissionId: submission.submission.id, appleBuildId: distribution.appleBuildId,
        distributionId: `${distribution.appleBuildId}:${distribution.betaGroupId}`,
      });
      const complete = await this.ledger.completeIosDistribution({ sourceSha: sha, workerId: this.config.workerId });
      await this.github.report(sha, "success", "Preview TestFlight internal distribution reconciliation complete");
      return { ...complete, distribution };
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

  async deliverIos(sha, cwd, lease, fingerprint) {
    const eas = this.easFactory(join(cwd, "apps/mobile"));
    const buildIdentityKey = fingerprint ? nativeBuildIdentityKey("ios", fingerprint) : `${sha}:${PREVIEW_IDENTITY.easProjectId}:ios:preview`;
    const reservation = typeof this.ledger.reserveNativeBuild === "function"
      ? await this.ledger.reserveNativeBuild({ sourceSha: sha, platform: "ios", identityKey: buildIdentityKey })
      : null;
    let recordedBuildAction = reservation?.action ?? await this.ledger.getAction("IOS_BUILD", buildIdentityKey);
    const artifactSourceSha = recordedBuildAction?.source_sha ?? sha;
    console.log(JSON.stringify({ event: reservation?.created ? "native-build-created" : recordedBuildAction ? "native-build-coalesced" : "native-build-reconciled", platform: "ios", sourceSha: sha, nativeArtifactSourceSha: artifactSourceSha, fingerprint, buildId: recordedBuildAction?.remote_id ?? null }));
    if (recordedBuildAction && !recordedBuildAction.remote_id && artifactSourceSha !== sha) {
      for (let attempt = 0; attempt < 120 && !recordedBuildAction.remote_id; attempt += 1) {
        await lease.checkpoint();
        await this.sleep(1_000);
        recordedBuildAction = await this.ledger.getAction("IOS_BUILD", buildIdentityKey);
      }
      if (!recordedBuildAction?.remote_id) throw new Error("Equivalent iOS native build reservation has not published its durable EAS build ID yet.");
    }
    let decision;
    if (recordedBuildAction?.remote_id) {
      decision = reconcileBuilds([await eas.viewBuild(recordedBuildAction.remote_id)], artifactSourceSha);
      if (!["ACTIVE_MATCH", "FINISHED_MATCH"].includes(decision.decision)) {
        throw new Error(`Persisted iOS build ${recordedBuildAction.remote_id} failed identity reconciliation: ${decision.decision}.`);
      }
    } else {
      decision = reconcileBuilds(await eas.listIosBuilds(artifactSourceSha), artifactSourceSha);
    }
    if (["CONFLICT", "MALFORMED_RESPONSE"].includes(decision.decision)) throw new Error(`EAS iOS reconciliation failed closed: ${decision.decision}.`);
    if (["FAILED_MATCH", "CANCELED_MATCH"].includes(decision.decision)) {
      await lease.checkpoint();
      const replacement = await eas.createIosBuild();
      if (recordedBuildAction?.remote_id && typeof this.ledger.replaceTerminalAction === "function") {
        await this.ledger.replaceTerminalAction({ sourceSha: artifactSourceSha, kind: "IOS_BUILD", identityKey: buildIdentityKey, expectedRemoteId: recordedBuildAction.remote_id, remoteId: replacement.id, state: "CREATED", evidence: replacement });
      }
      decision = { decision: "CREATED", build: replacement };
    }
    let build = decision.build;
    if (decision.decision === "NONE") {
      await lease.checkpoint();
      build = await eas.createIosBuild();
      decision = { decision: "CREATED", build };
    }
    await this.ledger.recordAction({ sourceSha: artifactSourceSha, kind: "IOS_BUILD", identityKey: buildIdentityKey, remoteId: build.id, state: decision.decision, evidence: { ...build, nativeFingerprint: fingerprint, nativeArtifactSourceSha: artifactSourceSha, latestCompatibleSourceSha: sha } });
    for (let attempt = 0; attempt < 240; attempt += 1) {
      await lease.checkpoint();
      const current = await eas.viewBuild(build.id);
      const status = String(current.status ?? "").toUpperCase();
      await this.ledger.recordAction({ sourceSha: artifactSourceSha, kind: "IOS_BUILD", identityKey: buildIdentityKey, remoteId: build.id, state: status, evidence: { ...current, nativeFingerprint: fingerprint, nativeArtifactSourceSha: artifactSourceSha, latestCompatibleSourceSha: sha } });
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
          if (typeof this.ledger.advanceDeliveredNative === "function") await this.ledger.advanceDeliveredNative({
            platform: "ios", sourceSha: artifactSourceSha, fingerprint, buildId: build.id,
            appVersion: current.appVersion, buildNumber: current.appBuildVersion,
            submissionId: submission.submission.id, appleBuildId: distribution.appleBuildId,
            distributionId: `${distribution.appleBuildId}:${distribution.betaGroupId}`,
          });
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

  async deliverAndroid(sha, cwd, lease, fingerprint) {
    const eas = this.easFactory(join(cwd, "apps/mobile"));
    const identityKey = fingerprint ? nativeBuildIdentityKey("android", fingerprint) : `${sha}:${PREVIEW_IDENTITY.easProjectId}:android:preview`;
    const reservation = typeof this.ledger.reserveNativeBuild === "function"
      ? await this.ledger.reserveNativeBuild({ sourceSha: sha, platform: "android", identityKey })
      : null;
    let recordedBuildAction = reservation?.action ?? await this.ledger.getAction("ANDROID_BUILD", identityKey);
    const artifactSourceSha = recordedBuildAction?.source_sha ?? sha;
    console.log(JSON.stringify({ event: reservation?.created ? "native-build-created" : recordedBuildAction ? "native-build-coalesced" : "native-build-reconciled", platform: "android", sourceSha: sha, nativeArtifactSourceSha: artifactSourceSha, fingerprint, buildId: recordedBuildAction?.remote_id ?? null }));
    if (recordedBuildAction && !recordedBuildAction.remote_id && artifactSourceSha !== sha) {
      for (let attempt = 0; attempt < 120 && !recordedBuildAction.remote_id; attempt += 1) {
        await lease.checkpoint();
        await this.sleep(1_000);
        recordedBuildAction = await this.ledger.getAction("ANDROID_BUILD", identityKey);
      }
      if (!recordedBuildAction?.remote_id) throw new Error("Equivalent Android native build reservation has not published its durable EAS build ID yet.");
    }
    let decision = recordedBuildAction?.remote_id
      ? reconcileBuilds([await eas.viewBuild(recordedBuildAction.remote_id)], artifactSourceSha, "android")
      : reconcileBuilds(await eas.listAndroidBuilds(artifactSourceSha), artifactSourceSha, "android");
    if (["CONFLICT", "MALFORMED_RESPONSE"].includes(decision.decision)) throw new Error(`EAS Android reconciliation failed closed: ${decision.decision}.`);
    if (["FAILED_MATCH", "CANCELED_MATCH"].includes(decision.decision)) {
      await lease.checkpoint();
      const replacement = await eas.createAndroidBuild();
      if (recordedBuildAction?.remote_id && typeof this.ledger.replaceTerminalAction === "function") {
        await this.ledger.replaceTerminalAction({ sourceSha: artifactSourceSha, kind: "ANDROID_BUILD", identityKey, expectedRemoteId: recordedBuildAction.remote_id, remoteId: replacement.id, state: "CREATED", evidence: replacement });
      }
      decision = { decision: "CREATED", build: replacement };
    }
    let build = decision.build;
    if (decision.decision === "NONE") {
      await lease.checkpoint();
      build = await eas.createAndroidBuild();
      decision = { decision: "CREATED", build };
    }
    await this.ledger.recordAction({ sourceSha: artifactSourceSha, kind: "ANDROID_BUILD", identityKey, remoteId: build.id, state: decision.decision, evidence: { ...build, nativeFingerprint: fingerprint, nativeArtifactSourceSha: artifactSourceSha, latestCompatibleSourceSha: sha } });
    for (let attempt = 0; attempt < 240; attempt += 1) {
      await lease.checkpoint();
      const current = await eas.viewBuild(build.id);
      const status = String(current.status ?? "").toUpperCase();
      await this.ledger.recordAction({ sourceSha: artifactSourceSha, kind: "ANDROID_BUILD", identityKey, remoteId: build.id, state: status, evidence: { ...current, nativeFingerprint: fingerprint, nativeArtifactSourceSha: artifactSourceSha, latestCompatibleSourceSha: sha } });
      if (status === "FINISHED") {
        if (typeof this.ledger.advanceDeliveredNative === "function") await this.ledger.advanceDeliveredNative({ platform: "android", sourceSha: artifactSourceSha, fingerprint, buildId: build.id, appVersion: current.appVersion, buildNumber: current.appBuildVersion });
        return { buildId: build.id, buildNumber: current.appBuildVersion, status };
      }
      if (["ERRORED", "FAILED", "CANCELED"].includes(status)) throw new Error(`EAS Android build ${build.id} ended in ${status}.`);
      await this.sleep(30_000);
    }
    throw new Error(`EAS Android build ${build.id} exceeded its bounded monitoring window.`);
  }
}

export function nativeBuildIdentityKey(platform, fingerprint) {
  if (!['ios', 'android'].includes(platform) || !/^[a-z0-9._-]{3,128}$/i.test(String(fingerprint ?? ''))) throw new Error('Native build fingerprint identity is malformed.');
  return `native-build:${platform}:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}`;
}

async function resolvedIdentity(root) {
  const policy = JSON.parse(await readFile(join(root, "apps/mobile/release-policy.json"), "utf8"));
  const eas = JSON.parse(await readFile(join(root, "apps/mobile/eas.json"), "utf8"));
  return { appName: policy.preview.displayName, bundleIdentifier: policy.preview.bundleIdentifier, scheme: policy.preview.scheme, projectId: "89f6fd88-c0d7-495a-9e2b-8301b09f407d", profile: "preview", channel: eas.build.preview.channel, runtime: policy.preview.runtimeVersion, apiOrigin: eas.build.preview.env.EXPO_PUBLIC_API_BASE_URL };
}

export async function runDeliveries(deliveries) {
  const entries = Object.entries(deliveries);
  if (!entries.length) return {};
  const settled = await Promise.allSettled(entries.map(([, deliver]) => Promise.resolve().then(deliver)));
  const results = {};
  const failures = [];
  for (let index = 0; index < entries.length; index += 1) {
    const [target] = entries[index];
    const outcome = settled[index];
    if (outcome.status === "fulfilled") results[target] = outcome.value;
    else failures.push({ target, error: outcome.reason });
  }
  if (failures.length === 1) throw failures[0].error;
  if (failures.length > 1) {
    const details = failures.map(({ target, error }) => `${target}: ${error instanceof Error ? error.message : String(error)}`).join("; ");
    throw new AggregateError(failures.map(({ error }) => error), `Parallel delivery failed for ${failures.map(({ target }) => target).join(", ")}: ${details}`);
  }
  return results;
}

export const runNativeDeliveries = runDeliveries;

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

export function enforceDeliveredNativeBaseline({ classification, fingerprints, deliveredNative, requiredNativeTargets = [] }) {
  const drift = [...new Set([...nativeDriftTargets(fingerprints, deliveredNative), ...requiredNativeTargets])];
  if (!drift.length) return classification;
  const targets = new Set(String(classification.classification).split("+").filter((value) => value && value !== "NO_DELIVERY"));
  for (const target of drift) targets.add(target);
  return { ...classification, classification: [...targets].sort().join("+"), reason: "delivered-native-fingerprint-changed", deliveredNative, nativeDrift: drift };
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const redact = (message) => message.replace(/(?:Bearer|token|password|secret)\s*[:=]?\s*[^\s,;]+/gi, "$1 [REDACTED]").slice(0, 500);
