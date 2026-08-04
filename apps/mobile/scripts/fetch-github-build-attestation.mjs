import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function args(values) {
  const out = {};
  for (let i = 0; i < values.length; i += 2) out[values[i].replace(/^--/, '')] = values[i + 1];
  return out;
}

async function request(url, token, binary = false) {
  const response = await fetch(url, {
    headers: {
      Accept: binary ? 'application/octet-stream' : 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) throw new Error(`GitHub attestation request failed with HTTP ${response.status}.`);
  return binary ? Buffer.from(await response.arrayBuffer()) : response.json();
}

export async function fetchGithubBuildAttestation({ manifest, token, outputDirectory }) {
  const source = manifest.sourceAttestation;
  if (manifest.schemaVersion !== 2 || source?.type !== 'github-actions-build') throw new Error('Reviewed manifest has no supported source attestation.');
  if (source.repository !== 'Zentric-Analytics/Kurioticket.com') throw new Error('Source attestation repository is not approved.');
  if (!token) throw new Error('GitHub Actions token is required for source attestation.');

  const api = `https://api.github.com/repos/${source.repository}`;
  const run = await request(`${api}/actions/runs/${source.workflowRunId}`, token);
  const artifact = await request(`${api}/actions/artifacts/${source.artifactId}`, token);
  const archive = await request(`${api}/actions/artifacts/${source.artifactId}/zip`, token, true);
  const digest = `sha256:${createHash('sha256').update(archive).digest('hex')}`;
  if (artifact.digest !== source.artifactDigest || digest !== source.artifactDigest) throw new Error('Build audit artifact digest mismatch.');

  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(resolve(outputDirectory, 'workflow-run.json'), `${JSON.stringify(run, null, 2)}\n`);
  writeFileSync(resolve(outputDirectory, 'artifact.json'), `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(resolve(outputDirectory, 'artifact.zip'), archive);
  return { run, artifact, digest };
}

if (process.argv[1]?.endsWith('fetch-github-build-attestation.mjs')) {
  const options = args(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(options.manifest, 'utf8'));
  await fetchGithubBuildAttestation({ manifest, token: process.env.GITHUB_TOKEN, outputDirectory: options.output });
}
