import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyChangeSet } from './classifier.mjs';
for (const file of ['index.cjs','package.json']) {
  test(`vendored production decoder ${file} requires both native dependency evaluations`, () => {
    const result = classifyChangeSet([`apps/mobile/vendor/decode-uri-component/${file}`]);
    assert.equal(result.classification,'ANDROID_NATIVE+IOS_NATIVE');
    assert.equal(result.uncertainMobile,undefined);
  });
}
