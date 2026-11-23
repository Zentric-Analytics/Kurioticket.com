import assert from 'node:assert/strict';

export function localDiagnosisTarget(value) {
  const target = new URL(value || 'http://invalid');
  assert.equal(target.protocol, 'postgresql:');
  assert.equal(target.hostname, '127.0.0.1');
  assert.equal(target.port, '55439');
  assert.equal(target.pathname, '/kurioticket_diagnosis');
  assert.equal(target.search, '', 'Connection query overrides are forbidden');
  assert.equal(target.hash, '');
  return { host: '127.0.0.1', port: 55439, database: 'kurioticket_diagnosis',
    user: decodeURIComponent(target.username), password: decodeURIComponent(target.password), ssl: false };
}
