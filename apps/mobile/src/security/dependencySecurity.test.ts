import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
const require=createRequire(import.meta.url);
const from=(name: string)=>createRequire(require.resolve(name+'/package.json'));

test('patched routing decoders preserve provider/offer identity and malformed input on both callers',()=>{
  for(const caller of ['expo-router','@react-navigation/core']){
    const query=from(caller)('query-string').default;
    const input={provider:'KAYAK',offer:'BOS/a+b?c=1',currency:'USD',price:'1234.56',redirect:'https://supplier.example/book?offer=A&B=2'};
    assert.deepEqual({...query.parse(query.stringify(input))},input);
    assert.deepEqual({...query.parse('provider=Duffel&provider=KAYAK&offer=%E0%A4%A&plus=a+b&empty')},{provider:['Duffel','KAYAK'],offer:'%E0%A4%A',plus:'a b',empty:null});
    assert.equal(query.parse('offer='+('%FF'.repeat(50_000))).offer.length,150_000);
    assert.equal(query.parseUrl('https://supplier.example/deal?offer=one%2Ftwo#terms').url,'https://supplier.example/deal');
    assert.equal(query.stringify({offer:'same',skip:null},{skipNull:true}),'offer=same');
  }
});

test('Metro consumes the patched image parser through its actual default import',()=>{
  const metro=from('@expo/metro')('metro/private/Assets');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  assert.deepEqual(metro.getAssetSize('png',png,'fixture.png'),{width:1,height:1});
  assert.equal(metro.getAssetSize('txt',png,'fixture.txt'),null);
  assert.throws(()=>metro.getAssetSize('png',Buffer.alloc(0),'empty.png'),/empty/);
  assert.throws(()=>metro.getAssetSize('png',Buffer.alloc(16),'malformed.png'));
  assert.equal(metro.getAssetSize('icns',Buffer.alloc(16),'untrusted.icns'),null);
  const assetPath=require.resolve('expo-router/assets/unmatched.png');
  return metro.getAssetData(assetPath,'unmatched.png',[],null,'/assets').then((data: {width:number;height:number})=>{assert.ok(data.width>0);assert.ok(data.height>0);});
});

test('scoped Expo globs preserve native project discovery and reject cancelled traversal',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'kt-dependency-'));
  try{
    mkdirSync(path.join(dir,'ios','Preview.xcodeproj'),{recursive:true});mkdirSync(path.join(dir,'android','app'),{recursive:true});
    writeFileSync(path.join(dir,'ios','AppDelegate.swift'),'fixture');writeFileSync(path.join(dir,'android','app','build.gradle'),'fixture');
    for(const caller of ['@expo/config','@expo/config-plugins','@expo/fingerprint','expo-updates']){
      const glob=from(caller)('glob');
      assert.deepEqual(glob.globSync('ios/**/*.xcodeproj',{cwd:dir}).map((p: string)=>p.split(path.sep).join('/')).sort(),['ios/Preview.xcodeproj']);
      assert.deepEqual(glob.globSync('android/**/*.gradle',{cwd:dir}).map((p: string)=>p.split(path.sep).join('/')).sort(),['android/app/build.gradle']);
      await assert.rejects(glob.glob('**/*',{cwd:dir,signal:AbortSignal.abort()}),{name:'AbortError'});
    }
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('Xcode project UUID generation retains its 24-uppercase-hex identity contract',()=>{
  const project=require('xcode').project('fixture.pbxproj');project.hash={project:{objects:{}}};
  const ids=new Set(Array.from({length:100},()=>project.generateUuid()));assert.equal(ids.size,100);for(const id of ids)assert.match(id,/^[A-F0-9]{24}$/);
});

test('Metro PostCSS accepts real styles without unrequested source-map reads',()=>{
  const configRequire=from('expo');
  const metroConfigRequire=createRequire(configRequire.resolve('@expo/metro-config/package.json'));
  const postcss=metroConfigRequire('postcss');
  const css='.notice { color: navy; }\n/*# sourceMappingURL=file:///nonexistent-private-source.map */';
  assert.equal(postcss.parse(css,{map:false}).first.selector,'.notice');
});

test('shell-quote rejects command-injection line terminators after a comment token',()=>{
  const quote=require('shell-quote');
  for(const line of ['\n','\r','\u2028','\u2029'])assert.throws(()=>quote.quote([{comment:'fixture'},line+'echo injected']),/line terminators/);
  assert.deepEqual(quote.parse(quote.quote(['safe value','offer=a&b','https://supplier.example/offer-1'])),['safe value','offer=a&b','https://supplier.example/offer-1']);
});
