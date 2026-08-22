import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PRODUCTION_PACKAGE = 'com.kurioticket.app';
const FULL_SHA = /^[0-9a-f]{40}$/;
const MAX_RELEVANT_HISTORY_COMMITS = 256;

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

function relevantHistoryGraph(approvedSha, historyPath, git) {
  const output = git([
    'rev-list',
    '--parents',
    '--simplify-merges',
    `--max-count=${MAX_RELEVANT_HISTORY_COMMITS + 1}`,
    approvedSha,
    '--',
    `:(top)${historyPath}`,
  ]).stdout.trim();
  const lines = output ? output.split(/\r?\n/) : [];
  if (lines.length > MAX_RELEVANT_HISTORY_COMMITS) {
    throw new Error('Reviewed release lineage exceeded the bounded relevant-history search.');
  }
  const graph = new Map();
  for (const line of lines) {
    const [commit, ...parents] = line.trim().split(/\s+/);
    if (!FULL_SHA.test(commit) || parents.some((parent) => !FULL_SHA.test(parent))) {
      throw new Error('Reviewed release lineage contains malformed parent metadata.');
    }
    if (parents.length > 2) throw new Error('Reviewed release lineage contains an unsupported multi-parent merge.');
    if (graph.has(commit)) throw new Error('Reviewed release lineage contains duplicate relevant commits.');
    graph.set(commit, parents);
  }
  if (graph.size === 0) throw new Error('Reviewed release lineage has no immutable prior Play history.');
  const referenced = new Set([...graph.values()].flat());
  const roots = [...graph.keys()].filter((commit) => !referenced.has(commit));
  if (roots.length < 1 || roots.length > 2) throw new Error('Reviewed release lineage has ambiguous relevant-history roots.');
  return { graph, roots };
}

function resolveRelevantNode(commit, currentCanonical, historyPath, git, graph, active = new Set()) {
  if (active.has(commit)) throw new Error('Reviewed release lineage contains a cycle.');
  const raw = historyAt(commit, historyPath, git);
  if (raw === null) throw new Error('Reviewed release lineage is missing prior Play history.');
  const evidence = evidenceAt(commit, raw, 'Prior reviewed Production');
  if (evidence.canonical !== currentCanonical) return { ...evidence, sourceCommits: [commit] };
  const parents = graph.get(commit);
  if (!parents || parents.length === 0) throw new Error('Reviewed release lineage has no immutable prior Play history.');
  if (parents.some((parent) => !graph.has(parent))) {
    throw new Error('Reviewed release lineage exceeded the bounded relevant-history search.');
  }
  const nextActive = new Set(active).add(commit);
  return convergeEvidence(parents.map((parent) =>
    resolveRelevantNode(parent, currentCanonical, historyPath, git, graph, nextActive),
  ));
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
  const { graph, roots } = relevantHistoryGraph(approvedSha, historyPath, git);
  const prior = convergeEvidence(roots.map((root) =>
    resolveRelevantNode(root, currentCanonical, historyPath, git, graph),
  ));
  for (const commit of prior.sourceCommits) {
    if (git(['merge-base', '--is-ancestor', commit, approvedSha], { allowFailure: true }).status !== 0) {
      throw new Error('Resolved prior Play history is not ancestral to the approved Production source.');
    }
  }
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
