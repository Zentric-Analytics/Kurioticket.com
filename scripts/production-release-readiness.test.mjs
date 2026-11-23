import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('production candidates receive delivery-free web, native and PostgreSQL 18 checks before merge', () => {
  const workflow = readFileSync('.github/workflows/production-release-readiness.yml', 'utf8');
  const parity = readFileSync('.github/workflows/pr-required-gates.yml', 'utf8');
  assert.match(workflow, /pull_request:\s+branches: \[main\]/);
  assert.match(parity, /branches:\s+- dev\s+- main/);
  for (const command of ['next typegen', 'tsc --noEmit', 'npm run lint', 'npm test -- --test-concurrency=4', 'npm run build', 'npm run test:release-pipeline', 'expo export --platform all', 'postgres:18-alpine']) {
    assert.ok(workflow.includes(command), command);
  }
  assert.ok(workflow.indexOf('run: npm run build') < workflow.indexOf('run: npm test'), 'geometry checks require compiled production CSS');
  assert.ok(workflow.indexOf('next typegen') < workflow.indexOf('tsc --noEmit'));
  assert.match(workflow, /DATABASE_URL: postgresql:\/\/postgres:postgres@127\.0\.0\.1:5432\/kurioticket_release_ci/);
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.doesNotMatch(workflow, /secrets\.|EXPO_TOKEN|RENDER_API_KEY|eas(?:-cli)? (?:build|update|submit)|git push|mobile-production/);
});
