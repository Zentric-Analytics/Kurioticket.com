import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const API_ACCEPT = 'application/vnd.github+json';
const API_VERSION = '2022-11-28';
const MAX_ARCHIVE_BYTES = 5 * 1024 * 1024;
const MAX_AUDIT_BYTES = 1024 * 1024;
const ALLOWED_ARCHIVE_TYPES = new Set(['application/zip', 'application/octet-stream', 'application/x-zip-compressed']);

function args(values) {
  const out = {};
  for (let i = 0; i < values.length; i += 2) out[values[i].replace(/^--/, '')] = values[i + 1];
  return out;
}

function apiHeaders(token) {
  return {
    Accept: API_ACCEPT,
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': API_VERSION,
  };
}

async function requestJson(url, token, fetchImpl) {
  const response = await fetchImpl(url, { headers: apiHeaders(token), redirect: 'error' });
  if (!response.ok) throw new Error(`GitHub attestation request failed with HTTP ${response.status}.`);
  return response.json();
}

export async function downloadArtifactArchive(url, token, fetchImpl = fetch) {
  const redirect = await fetchImpl(url, { headers: apiHeaders(token), redirect: 'manual' });
  if (redirect.status !== 302) throw new Error(`GitHub artifact archive request failed with HTTP ${redirect.status}.`);

  const location = redirect.headers.get('location');
  if (!location) throw new Error('GitHub artifact archive redirect is missing.');
  const signedUrl = new URL(location);
  if (signedUrl.protocol !== 'https:') throw new Error('GitHub artifact archive redirect is not HTTPS.');

  // The short-lived storage URL is already signed. Never forward GITHUB_TOKEN off api.github.com.
  const response = await fetchImpl(signedUrl, { redirect: 'follow' });
  if (!response.ok) throw new Error(`GitHub artifact download failed with HTTP ${response.status}.`);
  const contentType = (response.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  if (!ALLOWED_ARCHIVE_TYPES.has(contentType)) throw new Error(`GitHub artifact download returned unexpected content type ${contentType || 'missing'}.`);
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_ARCHIVE_BYTES) throw new Error('GitHub artifact archive exceeds the size limit.');

  const archive = Buffer.from(await response.arrayBuffer());
  if (archive.length === 0) throw new Error('GitHub artifact archive is empty.');
  if (archive.length > MAX_ARCHIVE_BYTES) throw new Error('GitHub artifact archive exceeds the size limit.');
  if (archive.length < 4 || archive.readUInt32LE(0) !== 0x04034b50) throw new Error('GitHub artifact response is not a ZIP archive.');
  return archive;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function findEndOfCentralDirectory(archive) {
  const minimum = Math.max(0, archive.length - 65_557);
  for (let offset = archive.length - 22; offset >= minimum; offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error('GitHub artifact ZIP central directory is missing.');
}

export function extractReviewedAudit(archive, outputDirectory) {
  const eocd = findEndOfCentralDirectory(archive);
  const disk = archive.readUInt16LE(eocd + 4);
  const centralDisk = archive.readUInt16LE(eocd + 6);
  const diskEntries = archive.readUInt16LE(eocd + 8);
  const totalEntries = archive.readUInt16LE(eocd + 10);
  const centralSize = archive.readUInt32LE(eocd + 12);
  const centralOffset = archive.readUInt32LE(eocd + 16);
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries) throw new Error('Multi-disk artifact ZIP is not supported.');
  if (totalEntries !== 1) throw new Error('Build audit artifact contains unexpected or duplicate files.');
  if ([centralSize, centralOffset].includes(0xffffffff) || totalEntries === 0xffff) throw new Error('ZIP64 artifact archives are not supported.');
  if (centralOffset + centralSize > eocd || centralOffset + 46 > archive.length) throw new Error('GitHub artifact ZIP central directory is invalid.');

  const offset = centralOffset;
  if (archive.readUInt32LE(offset) !== 0x02014b50) throw new Error('GitHub artifact ZIP entry is invalid.');
  const flags = archive.readUInt16LE(offset + 8);
  const compression = archive.readUInt16LE(offset + 10);
  const expectedCrc = archive.readUInt32LE(offset + 16);
  const compressedSize = archive.readUInt32LE(offset + 20);
  const uncompressedSize = archive.readUInt32LE(offset + 24);
  const nameLength = archive.readUInt16LE(offset + 28);
  const extraLength = archive.readUInt16LE(offset + 30);
  const commentLength = archive.readUInt16LE(offset + 32);
  const externalAttributes = archive.readUInt32LE(offset + 38);
  const localOffset = archive.readUInt32LE(offset + 42);
  const centralEnd = offset + 46 + nameLength + extraLength + commentLength;
  if (centralEnd !== centralOffset + centralSize || centralEnd > archive.length) throw new Error('GitHub artifact ZIP central directory length is invalid.');
  if (flags & 0x1) throw new Error('Encrypted artifact ZIP entries are not supported.');
  if (![0, 8].includes(compression)) throw new Error('Unsupported artifact ZIP compression method.');
  if (compressedSize > MAX_ARCHIVE_BYTES || uncompressedSize > MAX_AUDIT_BYTES) throw new Error('Build audit artifact content exceeds the size limit.');

  const nameBytes = archive.subarray(offset + 46, offset + 46 + nameLength);
  let name;
  try { name = new TextDecoder('utf-8', { fatal: true }).decode(nameBytes); } catch { throw new Error('Artifact ZIP filename is not valid UTF-8.'); }
  const normalized = name.replaceAll('\\', '/');
  if (normalized !== 'release-audit.json' || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized) || normalized.split('/').some((part) => part === '..' || part === '.')) {
    throw new Error('Build audit artifact contains an unexpected or unsafe path.');
  }
  const unixMode = externalAttributes >>> 16;
  if ((unixMode & 0o170000) === 0o120000) throw new Error('Build audit artifact contains a symbolic link.');

  if (localOffset + 30 > archive.length || archive.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('Artifact ZIP local entry is invalid.');
  const localNameLength = archive.readUInt16LE(localOffset + 26);
  const localExtraLength = archive.readUInt16LE(localOffset + 28);
  const localName = archive.subarray(localOffset + 30, localOffset + 30 + localNameLength);
  if (!localName.equals(nameBytes)) throw new Error('Artifact ZIP entry names do not match.');
  const dataStart = localOffset + 30 + localNameLength + localExtraLength;
  const dataEnd = dataStart + compressedSize;
  if (dataEnd > centralOffset || dataEnd > archive.length) throw new Error('Artifact ZIP entry data is truncated.');
  const compressed = archive.subarray(dataStart, dataEnd);
  let content;
  try { content = compression === 0 ? Buffer.from(compressed) : inflateRawSync(compressed, { maxOutputLength: MAX_AUDIT_BYTES }); } catch { throw new Error('Build audit artifact ZIP is corrupted.'); }
  if (content.length !== uncompressedSize || crc32(content) !== expectedCrc) throw new Error('Build audit artifact ZIP integrity check failed.');
  try { JSON.parse(content.toString('utf8')); } catch { throw new Error('Build audit artifact is not valid JSON.'); }

  const auditDirectory = resolve(outputDirectory, 'audit');
  mkdirSync(auditDirectory, { recursive: true });
  const auditPath = resolve(auditDirectory, 'release-audit.json');
  writeFileSync(auditPath, content, { flag: 'wx' });
  return auditPath;
}

export async function fetchGithubBuildAttestation({ manifest, token, outputDirectory, fetchImpl = fetch }) {
  const source = manifest.sourceAttestation;
  if (manifest.schemaVersion !== 2 || source?.type !== 'github-actions-build') throw new Error('Reviewed manifest has no supported source attestation.');
  if (source.repository !== 'Zentric-Analytics/Kurioticket.com') throw new Error('Source attestation repository is not approved.');
  if (!token) throw new Error('GitHub Actions token is required for source attestation.');

  const api = `https://api.github.com/repos/${source.repository}`;
  const run = await requestJson(`${api}/actions/runs/${source.workflowRunId}`, token, fetchImpl);
  const artifact = await requestJson(`${api}/actions/artifacts/${source.artifactId}`, token, fetchImpl);
  if (artifact.expired === true) throw new Error('Reviewed build audit artifact is expired.');
  const archive = await downloadArtifactArchive(`${api}/actions/artifacts/${source.artifactId}/zip`, token, fetchImpl);
  const digest = `sha256:${createHash('sha256').update(archive).digest('hex')}`;
  if (artifact.digest !== source.artifactDigest || digest !== source.artifactDigest) throw new Error('Build audit artifact digest mismatch.');

  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(resolve(outputDirectory, 'workflow-run.json'), `${JSON.stringify(run, null, 2)}\n`);
  writeFileSync(resolve(outputDirectory, 'artifact.json'), `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(resolve(outputDirectory, 'artifact.zip'), archive);
  extractReviewedAudit(archive, outputDirectory);
  return { run, artifact, digest };
}

if (process.argv[1]?.endsWith('fetch-github-build-attestation.mjs')) {
  const options = args(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(options.manifest, 'utf8'));
  await fetchGithubBuildAttestation({ manifest, token: process.env.GITHUB_TOKEN, outputDirectory: options.output });
}
