import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadReleaseFiles } from './release-policy.mjs';

const EXPECTED = Object.freeze({ projectId: '89f6fd88-c0d7-495a-9e2b-8301b09f407d', package: 'com.kurioticket.app', profile: 'production', runtime: 'production-0.3.0', channel: 'production', api: 'https://kurioticket.com' });
function args(values) { const out = {}; for (let i = 0; i < values.length; i += 2) { if (!values[i]?.startsWith('--') || values[i + 1] === undefined) throw new Error('Invalid Production dry-run arguments.'); out[values[i].slice(2)] = values[i + 1]; } return out; }

export function validateProductionDryRun({ approvedSha, headSha, mainContainsSha, versionEvidence, credential, workflow, policy, eas }) {
  const checks = [
    [/^[0-9a-f]{40}$/.test(approvedSha) && headSha === approvedSha && mainContainsSha, 'Approved Production SHA is not the exact protected-main checkout.'],
    [policy.production.androidPackage === EXPECTED.package && policy.production.runtimeVersion === EXPECTED.runtime && policy.production.channel === EXPECTED.channel && policy.production.apiBaseUrl === EXPECTED.api, 'Production release policy mismatch.'],
    [eas.build.production.distribution === 'store' && eas.build.production.channel === EXPECTED.channel, 'Production EAS profile mismatch.'],
    [credential?.schemaVersion === 1 && credential.projectId === EXPECTED.projectId && credential.package === EXPECTED.package && credential.profile === EXPECTED.profile && credential.management === 'eas-managed' && credential.status === 'complete' && credential.buildPolicy === 'freeze-credentials', 'Reviewed Production credential evidence is incomplete or mismatched.'],
    [versionEvidence?.proposedVersionCode === 1 && versionEvidence.remoteVersionStatus === 'uninitialized' && versionEvidence.playRecordStatus === 'present' && versionEvidence.uploadedVersionCodes?.length === 0, 'Production version/Play evidence is not the approved first-build state.'],
    [/build:version:get --platform android --profile production --json --non-interactive/.test(workflow), 'Structured EAS version command is missing.'],
    [/build:list --platform android --build-profile production --app-identifier com\.kurioticket\.app --limit 1 --json --non-interactive/.test(workflow), 'Filtered Production build-history command is missing.'],
    [/build --platform android --profile production --non-interactive --freeze-credentials --json/.test(workflow), 'Frozen Production build command is missing.'],
    [/verify-production-eas-result\.mjs --kind build/.test(workflow), 'Strict Production build-result verification is missing.'],
    [!/EAS_NO_VCS|--auto-submit|eas-cli@[^\n]*submit/.test(workflow), 'Production workflow contains forbidden VCS or submission behavior.'],
  ];
  for (const [ok, message] of checks) if (!ok) throw new Error(message);
  return { kind: 'dry-run', status: 'READY_TO_SUBMIT_PRODUCTION_BUILD', approvedSha, package: EXPECTED.package, projectId: EXPECTED.projectId, profile: EXPECTED.profile, runtime: EXPECTED.runtime, channel: EXPECTED.channel, proposedVersionCode: 1, credentialResolution: 'reviewed-complete-and-frozen', submissionPerformed: false };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = args(process.argv.slice(2));
  const { policy, eas, root } = loadReleaseFiles();
  const repository = resolve(root, '../..');
  const git = (...values) => execFileSync('git', values, { cwd: repository, encoding: 'utf8' }).trim();
  const headSha = git('rev-parse', 'HEAD');
  let mainContainsSha = true;
  try { execFileSync('git', ['merge-base', '--is-ancestor', a['approved-sha'], 'origin/main'], { cwd: repository }); } catch { mainContainsSha = false; }
  const result = validateProductionDryRun({ approvedSha: a['approved-sha'], headSha, mainContainsSha, versionEvidence: JSON.parse(readFileSync(a['version-evidence'], 'utf8')), credential: JSON.parse(readFileSync(a.credential, 'utf8')), workflow: readFileSync(a.workflow, 'utf8'), policy, eas });
  writeFileSync(a.output, `${JSON.stringify(result, null, 2)}\n`);
  console.log('READY TO SUBMIT PRODUCTION BUILD');
}
