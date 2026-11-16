import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const decoder = require('decode-uri-component');
const query = require('query-string');
const metroRequire = createRequire(require.resolve('metro/package.json'));
const imagePath = metroRequire.resolve('image-size');
const size = metroRequire('image-size');
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
test('image-size remains the callable 1.x API used by Metro', () => {
  assert.equal(typeof size, 'function');
  for (const name of ['imageSize','disableFS','disableTypes','setConcurrency']) assert.equal(typeof size[name], 'function');
  assert.equal(size.default, size); assert.ok(size.types.includes('png'));
});
for (const name of ['kurioticket-icon-ios.png','kurioticket-adaptive-foreground.png']) {
  test(`Metro static asset metadata and buffer/path/callback APIs: ${name}`, async () => {
    const path = fileURLToPath(new URL(`../assets/${name}`, import.meta.url));
    const bytes = readFileSync(path); const info = size(bytes);
    assert.ok(info.width > 0 && info.height > 0);
    assert.deepEqual(size(path), info);
    assert.deepEqual(await new Promise((resolve,reject)=>size(path,(err,value)=>err?reject(err):resolve(value))),info);
    assert.deepEqual(metro.getAssetSize('png',bytes,path),{width:info.width,height:info.height});
    for (const platform of ['ios','android']) {
      const data = await metro.getAssetData(path,`assets/${name}`,[],platform,'/assets');
      assert.equal(data.width,info.width); assert.equal(data.height,info.height); assert.ok(data.hash);
    }
  });
}
test('valid SVG, GIF, ICNS and unsupported/empty asset handling', () => {
  assert.deepEqual(metro.getAssetSize('svg',Buffer.from('<svg width="17" height="23"></svg>'),'test.svg'),{width:17,height:23});
  const gif=Buffer.from('47494638396111001700','hex'); assert.equal(size(gif).width,17); assert.equal(size(gif).height,23);
  const icns=Buffer.from('69636e73000000106963703100000008','hex'); icns.write('icp4',8); assert.equal(size(icns).width,16);
  assert.equal(metro.getAssetSize('txt',Buffer.from('text'),'test.txt'),null);
  assert.throws(()=>metro.getAssetSize('png',Buffer.alloc(0),'empty.png'),/empty/);
});
for (const kind of ['icns','heif','jxl']) {
  test(`malformed ${kind} zero/undersized boxes cannot hang the parser`, () => {
    const program = `const size=require(${JSON.stringify(imagePath)}); const kind=${JSON.stringify(kind)}; for(const len of [0,1,2,7,8,0xffffffff]) { let b; if(kind==='icns'){b=Buffer.alloc(32);b.write('icns');b.writeUInt32BE(32,4);b.write('icp4',8);b.writeUInt32BE(8,12);b.write('icp4',16);b.writeUInt32BE(len,20);}else{b=Buffer.alloc(64); if(kind==='heif'){b.writeUInt32BE(16);b.write('ftyp',4);b.write('heic',8);b.writeUInt32BE(len,16);b.write('meta',20);}else{b.writeUInt32BE(12);b.write('JXL ',4);b.writeUInt32BE(16,12);b.write('ftyp',16);b.write('jxl ',20);b.writeUInt32BE(len,28);b.write('jxlp',32);}} try{size(b)}catch(e){if(!(e instanceof Error))process.exit(3);} }`;
    const result = spawnSync(process.execPath,['-e',program],{cwd:mobile,timeout:5000,encoding:'utf8'});
    assert.equal(result.error,undefined); assert.equal(result.status,0,result.stderr);
  });
}
