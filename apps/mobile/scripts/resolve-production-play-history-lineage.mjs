import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PRODUCTION_PACKAGE = 'com.kurioticket.app';
const FULL_SHA = /^[0-9a-f]{40}$/;

function parseManifest(raw, label) {
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    throw new Error(`${label} Play history is malformed.`);
  }
  if (manifest?.schemaVersion !== 2 || manifest.package !== PRODUCTION_PACKAGE) {
    throw new Error(`${label} Play history is package-mismatched.`);
  }
  return manifest;
}

function canonicalManifest(raw, label) {
  const manifest = parseManifest(raw, label);
  return JSON.stringify(manifest, Object.keys(manifest).sort());
}

function evidenceAt(commit, raw, label) {
  const canonical = canonicalManifest(raw, label);
  return {
    commit,
    raw,
    canonical,
    digest: createHash('sha256').update(canonical).digest('hex'),
  };
}

function defaultGit(args, { allowFailure = false } = {}) {
  if (allowFailure) {
    const result = spawnSync('git', args, { encoding: 'utf8' });
    return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  }
  return { status: 0, stdout: execFileSync('git', args, { encoding: 'utf8' }), stderr: '' };
}

function parentsOf(commit, git) {
  const output = git(['show', '-s', '--format=%P', commit]).stdout.trim();
  if (!output) return [];
  const parents = output.split(/\s+/);
  if (parents.some((parent) => !FULL_SHA.test(parent))) throw new Error('Approved source contains malformed parent metadata.');
  return parents;
}

function historyAt(commit, historyPath, git) {
  const result = git(['show', `${commit}:${historyPath}`], { allowFailure: true });
  return result.status === 0 ? result.stdout : null;
}

function convergeEvidence(evidence) {
  const [first, ...rest] = evidence;
  if (!first || rest.some((entry) => entry.digest !== first.digest || entry.canonical !== first.canonical)) {
    throw new Error('Production parent paths resolve to conflicting prior Play history.');
  }
  return {
    ...first,
    sourceCommits: [...new Set(evidence.flatMap((entry) => entry.sourceCommits ?? [entry.commit]))].sort(),
  };
}

function resolveParentSet(parents, currentCanonical, historyPath, git, depth, active) {
  if (parents.length === 0) throw new Error('Reviewed release lineage has no immutable prior Play history.');
  if (parents.length > 2) throw new Error('Reviewed release lineage contains an unsupported multi-parent merge.');
  const inspected = parents.map((commit) => {
    const raw = historyAt(commit, historyPath, git);
    return raw === null ? { commit, raw: null, evidence: null } : { commit, raw, evidence: evidenceAt(commit, raw, 'Prior reviewed Production') };
  });
  const continuing = inspected.filter((entry) => entry.evidence?.canonical === currentCanonical);
  if (continuing.length > 0) {
    return convergeEvidence(continuing.map((entry) => resolveParentPath(entry.commit, currentCanonical, historyPath, git, depth, active)));
  }
  if (inspected.some((entry) => entry.evidence === null)) throw new Error('Reviewed release lineage is missing prior Play history.');
  return convergeEvidence(inspected.map((entry) => ({ ...entry.evidence, sourceCommits: [entry.commit] })));
}

function resolveParentPath(commit, currentCanonical, historyPath, git, depth = 0, active = new Set()) {
  if (depth >= 500) throw new Error('Reviewed release lineage exceeded the bounded prior-history search.');
  if (active.has(commit)) throw new Error('Reviewed release lineage contains a cycle.');
  const raw = historyAt(commit, historyPath, git);
  if (raw === null) throw new Error('Reviewed release lineage is missing prior Play history.');
  const evidence = evidenceAt(commit, raw, 'Prior reviewed Production');
  if (evidence.canonical !== currentCanonical) return { ...evidence, sourceCommits: [commit] };
  const parents = parentsOf(commit, git);
  const nextActive = new Set(active).add(commit);
  return resolveParentSet(parents, currentCanonical, historyPath, git, depth + 1, nextActive);
}

export function resolveTrustedPreviousPlayHistory({ approvedSha, historyPath, git = defaultGit }) {
  if (!FULL_SHA.test(approvedSha)) throw new Error('Approved Production source must be a full commit SHA.');
  if (historyPath !== 'apps/mobile/release-baselines/android/production-play-history.json') {
    throw new Error('Production Play-history path is not the repository-owned reviewed manifest.');
  }
  if (git(['merge-base', '--is-ancestor', approvedSha, 'refs/remotes/origin/main'], { allowFailure: true }).status !== 0) {
    throw new Error('Approved Production source is not reachable from protected main.');
  }
  const currentRaw = historyAt(approvedSha, historyPath, git);
  if (currentRaw === null) throw new Error('Approved Production source is missing reviewed Play history.');
  const currentCanonical = canonicalManifest(currentRaw, 'Current reviewed Production');
  const parents = parentsOf(approvedSha, git);
  if (parents.length < 1 || parents.length > 2) throw new Error('Production source must have one parent or one normal two-parent merge.');
  const prior = resolveParentSet(parents, currentCanonical, historyPath, git, 0, new Set([approvedSha]));
  return {
    previousCommit: prior.commit,
    previousCommits: prior.sourceCommits,
    previousDigest: prior.digest,
    previousRaw: prior.raw,
    sourceType: parents.length === 1 ? 'single-parent' : 'convergent-merge',
  };
}

function readArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined) throw new Error('Invalid Production Play-history lineage arguments.');
    values[flag.slice(2)] = value;
  }
  return values;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = readArgs(process.argv.slice(2));
  const resolved = resolveTrustedPreviousPlayHistory({ approvedSha: args['approved-sha'], historyPath: args['history-path'] });
  writeFileSync(args.output, resolved.previousRaw.endsWith('\n') ? resolved.previousRaw : `${resolved.previousRaw}\n`);
  console.log(`Resolved immutable Production Play history from ${resolved.sourceType} release lineage.`);
}
