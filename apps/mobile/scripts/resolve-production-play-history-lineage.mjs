import { execFileSync, spawnSync } from 'node:child_process';
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

function findPriorHistory(releaseParent, currentCanonical, historyPath, git) {
  let cursor = releaseParent;
  for (let depth = 0; depth < 500; depth += 1) {
    const parents = parentsOf(cursor, git);
    if (parents.length === 0) throw new Error('Reviewed release lineage has no immutable prior Play history.');
    if (parents.length > 1) throw new Error('Reviewed release lineage is ambiguous before the prior Play history.');
    const [parent] = parents;
    const raw = historyAt(parent, historyPath, git);
    if (raw === null) throw new Error('Reviewed release lineage is missing prior Play history.');
    const canonical = canonicalManifest(raw, 'Prior reviewed Production');
    if (canonical !== currentCanonical) return { commit: parent, raw };
    cursor = parent;
  }
  throw new Error('Reviewed release lineage exceeded the bounded prior-history search.');
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

  if (parents.length === 1) {
    const previousRaw = historyAt(parents[0], historyPath, git);
    if (previousRaw === null) throw new Error('Single-parent Production source is missing immutable prior Play history.');
    canonicalManifest(previousRaw, 'Prior reviewed Production');
    return { releaseParent: parents[0], previousCommit: parents[0], previousRaw, sourceType: 'single-parent' };
  }
  if (parents.length !== 2) throw new Error('Production release source must have one parent or one normal two-parent merge.');

  const candidates = parents.filter((parent) => {
    const raw = historyAt(parent, historyPath, git);
    return raw !== null && canonicalManifest(raw, 'Merge-parent Production') === currentCanonical;
  });
  if (candidates.length !== 1) throw new Error('Production release-parent identity is ambiguous or missing.');
  const releaseParent = candidates[0];
  const prior = findPriorHistory(releaseParent, currentCanonical, historyPath, git);
  return { releaseParent, previousCommit: prior.commit, previousRaw: prior.raw, sourceType: 'normal-merge' };
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = readArgs(process.argv.slice(2));
  const resolved = resolveTrustedPreviousPlayHistory({ approvedSha: args['approved-sha'], historyPath: args['history-path'] });
  writeFileSync(args.output, resolved.previousRaw.endsWith('\n') ? resolved.previousRaw : `${resolved.previousRaw}\n`);
  console.log(`Resolved immutable Production Play history from ${resolved.sourceType} release lineage.`);
}
