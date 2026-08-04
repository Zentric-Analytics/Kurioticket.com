import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PREVIEW = Object.freeze({
  packageName: 'com.kurioticket.app.preview',
  profile: 'preview',
  runtime: 'preview-0.3.0',
});
const UNINITIALIZED_MESSAGE = 'No remote versions are configured for this project.';

function parseBuilds(output) {
  let builds;
  try {
    builds = JSON.parse(output);
  } catch {
    throw new Error('Unable to parse the filtered EAS Preview build history.');
  }
  if (!Array.isArray(builds)) throw new Error('EAS Preview build history must be a JSON array.');
  return builds;
}

export function resolvePreviewVersionEvidence({
  versionOutput,
  versionExitCode,
  buildsOutput,
  buildsExitCode,
  packageName,
  profile,
  runtime,
}) {
  if (packageName !== PREVIEW.packageName || profile !== PREVIEW.profile || runtime !== PREVIEW.runtime) {
    throw new Error('First-binary version handling is restricted to the approved Preview identity.');
  }
  if (versionExitCode !== 0) throw new Error('EAS remote version query failed.');

  const output = versionOutput.trim();
  if (!output) throw new Error('EAS remote version query returned empty output.');

  const numericMatches = [...output.matchAll(/versionCode\s*(?:-|:|=)\s*(\d+)\b/gi)].map((match) => Number(match[1]));
  const numericValues = [...new Set(numericMatches)];
  const isUninitialized = output.includes(UNINITIALIZED_MESSAGE);

  if (isUninitialized && numericValues.length > 0) throw new Error('EAS remote version output is ambiguous.');
  if (numericValues.length > 1) throw new Error('EAS remote version output contains conflicting values.');

  if (numericValues.length === 1) {
    const current = numericValues[0];
    if (!Number.isInteger(current) || current < 0) throw new Error('EAS remote versionCode must be a non-negative integer.');
    return {
      currentRemoteVersionCode: current,
      proposedVersionCode: current + 1,
      remoteVersionStatus: 'configured',
      playRecordStatus: 'not-applicable-preview',
    };
  }

  if (!isUninitialized) throw new Error('Unrecognized EAS remote version response.');
  if (buildsExitCode !== 0) throw new Error('Filtered EAS Preview build-history query failed.');
  const builds = parseBuilds(buildsOutput);
  if (builds.length !== 0) {
    throw new Error('Cannot initialize Preview versionCode because an existing build uses this package/profile.');
  }

  return {
    currentRemoteVersionCode: null,
    proposedVersionCode: 1,
    remoteVersionStatus: 'uninitialized',
    playRecordStatus: 'not-applicable-preview',
  };
}

function readArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined) throw new Error('Invalid version-evidence arguments.');
    values[flag.slice(2)] = value;
  }
  return values;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = readArgs(process.argv.slice(2));
  const evidence = resolvePreviewVersionEvidence({
    versionOutput: readFileSync(args['version-output'], 'utf8'),
    versionExitCode: Number(args['version-exit-code']),
    buildsOutput: readFileSync(args['builds-output'], 'utf8'),
    buildsExitCode: Number(args['builds-exit-code']),
    packageName: args.package,
    profile: args.profile,
    runtime: args.runtime,
  });
  writeFileSync(args.output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Preview versionCode proposal: ${evidence.proposedVersionCode} (${evidence.remoteVersionStatus})`);
}
