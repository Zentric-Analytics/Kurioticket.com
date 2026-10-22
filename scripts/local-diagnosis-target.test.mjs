import assert from 'node:assert/strict';
import test from 'node:test';
import { localDiagnosisTarget } from './local-diagnosis-target.mjs';

test('diagnosis connection cannot be redirected by URL parameters', () => {
  const url = 'postgresql://test:synthetic@127.0.0.1:55439/kurioticket_diagnosis';
  assert.deepEqual(localDiagnosisTarget(url), { host: '127.0.0.1', port: 55439,
    database: 'kurioticket_diagnosis', user: 'test', password: 'synthetic', ssl: false });
  for (const suffix of ['?host=remote&port=5432', '?dbname=other', '?hostaddr=1.2.3.4', '?ssl=true', '#fragment']) {
    assert.throws(() => localDiagnosisTarget(url + suffix));
  }
  for (const altered of [url.replace('127.0.0.1','remote'), url.replace('55439','5432'), url.replace('kurioticket_diagnosis','production')]) {
    assert.throws(() => localDiagnosisTarget(altered));
  }
});
