import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const decoder = require('decode-uri-component');
// Resolve the actual router dependency, which need not be hoisted.
const routerRequire = createRequire(require.resolve('expo-router/package.json'));
const queryModule = routerRequire('query-string');
const query = queryModule.default ?? queryModule;
const metroRequire = createRequire(require.resolve('metro/package.json'));
const metro = metroRequire('./src/Assets.js');
const mobile = fileURLToPath(new URL('..', import.meta.url));

for (const [input, expected] of [['hello%20world','hello world'],['%E2%9C%93','✓'],['a+b%2Bc','a b+c'],['%','%'],['%GG','%GG'],['%E0%A4%A','%E0%A4%A'],['%FE%FF','��'],['%C2','�'],['%41%FF%42','A%FFB'],['%2541','%41']]) {
  test(`URI compatibility: ${input}`, () => assert.equal(decoder(input), expected));
}
test('decoder rejects non-string input', () => assert.throws(() => decoder(null), TypeError));
test('query string round trip retains callback, duplicate arrays and unicode', () => {
  const values = { callback: 'kurioticket-preview://auth/callback?code=a+b&state=%2F', city: 'São Paulo', tags: ['a','b'] };
  assert.deepEqual({...query.parse(query.stringify(values))}, values);
  assert.deepEqual(query.parse('q=a+b&bad=%E0%A4%A').q, 'a b');
});
for (const platform of ['ios','android']) {
  test(`${platform} deep-link query and nested route parameters`, () => {
    const url = 'kurioticket-preview://flight/details?returnTo=%2Fsearch%3Ffrom%3DSFO&code=abc%2B123&state=%252Fhome';
    const result = query.parseUrl(url);
    assert.equal(result.url, 'kurioticket-preview://flight/details');
    assert.equal(result.query.returnTo, '/search?from=SFO');
    assert.equal(result.query.code, 'abc+123');
    assert.equal(result.query.state, '%2Fhome');
    assert.deepEqual(query.parseUrl(query.stringifyUrl(result)), result);
  });
}
test('hostile decoder input finishes within an isolated process deadline', () => {
  const result = spawnSync(process.execPath, ['-e', `const d=require('decode-uri-component'); for(const x of ['%FF'.repeat(10000),Array.from({length:5000},(_,i)=>'%41'.repeat(i%10+1)+'%FF').join('-')]) { const y=d(x); if(!y.includes('%FF'))process.exit(2); }`], {cwd:mobile, timeout:5000, encoding:'utf8'});
  assert.equal(result.error, undefined); assert.equal(result.status,0,result.stderr);
});
test('retained Metro uses its internal image parser instead of the removed image-size dependency', () => {
  const metadata = metroRequire('./package.json');
  assert.equal(metadata.version, '0.83.8');
  assert.equal(metadata.dependencies['image-size'], undefined);
});
for (const name of ['kurioticket-icon-ios.png','kurioticket-adaptive-foreground.png']) {
  test(`Metro static asset metadata and internal parser: ${name}`, async () => {
    const path = fileURLToPath(new URL(`../assets/${name}`, import.meta.url));
    const bytes = readFileSync(path); const info = metro.getAssetSize('png', bytes, path);
    assert.ok(info.width > 0 && info.height > 0);
    assert.deepEqual(metro.getAssetSize('png',bytes,path),{width:info.width,height:info.height});
    for (const platform of ['ios','android']) {
      const data = await metro.getAssetData(path,`assets/${name}`,[],platform,'/assets');
      assert.equal(data.width,info.width); assert.equal(data.height,info.height); assert.ok(data.hash);
    }
  });
}
test('valid SVG, GIF, ICNS and unsupported/empty asset handling', () => {
  assert.deepEqual(metro.getAssetSize('svg',Buffer.from('<svg width="17" height="23"></svg>'),'test.svg'),{width:17,height:23});
  const gif=Buffer.from('47494638396111001700','hex'); assert.deepEqual(metro.getAssetSize('gif', gif, 'test.gif'), { width: 17, height: 23 });
  assert.equal(metro.getAssetSize('icns', Buffer.from('icns'), 'test.icns'), null);
  assert.equal(metro.getAssetSize('txt',Buffer.from('text'),'test.txt'),null);
  assert.throws(()=>metro.getAssetSize('png',Buffer.alloc(0),'empty.png'),/empty/);
});
for (const kind of ['icns','heif','jxl']) {
  test(`malformed ${kind} zero/undersized boxes cannot hang the parser`, () => {
    const program = `const metro=require(${JSON.stringify(metroRequire.resolve('./src/Assets.js'))});const kind=${JSON.stringify(kind)};for(const len of [0,1,2,7,8,0xffffffff]) {const b=Buffer.alloc(64);b.write(kind==='icns'?'icns':kind==='heif'?'ftyp':'JXL ');b.writeUInt32BE(len,4);const info=metro.getAssetSize(kind,b,'fixture.'+kind);if(info!==null)process.exit(2);}`;

    const result = spawnSync(process.execPath,['-e',program],{cwd:mobile,timeout:5000,encoding:'utf8'});
    assert.equal(result.error,undefined); assert.equal(result.status,0,result.stderr);
  });
}
