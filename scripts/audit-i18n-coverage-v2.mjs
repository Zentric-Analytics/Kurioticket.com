#!/usr/bin/env node
import fs from 'node:fs';import { createJiti } from 'jiti'; const jiti=createJiti(import.meta.url);
const active=['en','ar','nl','es','fr','de','it','pt-br','zh-cn','ja','ko','hi','tr','pl','sv','id','th','vi'];
const map={en:'en-us',es:'es-es',de:'de',it:'it',ar:'ar',nl:'nl',fr:'fr','pt-br':'pt-br','zh-cn':'zh-cn',ja:'ja',ko:'ko',hi:'hi',tr:'tr',pl:'pl',sv:'sv',id:'id',th:'th',vi:'vi'};
const {getTranslations}=jiti('../src/lib/i18n/index.ts');
const {supportedLocales}=jiti('../src/lib/supportedLocales.ts');
const {normalizeLanguage,isAvailableLanguage}=jiti('../src/lib/language.ts');
function flat(o,p='',out={}){for(const [k,v] of Object.entries(o||{})){const q=p?`${p}.${k}`:k;if(v&&typeof v==='object'&&!Array.isArray(v))flat(v,q,out);else out[q]=v;}return out}
function placeholders(s){return [...String(s).matchAll(/\{\{?\w+\}?\}/g)].map(m=>m[0]).sort()}
const en=flat(getTranslations('en-us'));
const results={baseKeys:Object.keys(en).length,locales:{},registry:{},duplicates:{},sourceHits:[],localeEnglish:[]};
for(const file of active){const code=map[file];const obj=flat(getTranslations(code));const missing=[],placeholderMismatch=[],identical=[];for(const [k,v] of Object.entries(en)){if(!(k in obj)) missing.push(k); else {const ep=placeholders(v).join('|'), lp=placeholders(obj[k]).join('|'); if(ep!==lp) placeholderMismatch.push({key:k,en:ep,locale:lp}); if(file!=='en'&&typeof v==='string'&&v.length>4&&obj[k]===v&&!/Kurioticket|^[A-Z0-9 -]+$|^[\d.,$€£¥₹]+$/.test(v)) identical.push(k)}}results.locales[file]={code,keys:Object.keys(obj).length,missing,placeholderMismatch,identical:identical.slice(0,200),identicalCount:identical.length};
 const txt=fs.readFileSync(`src/lib/i18n/${file}.ts`,'utf8'); const re=/^\s*([A-Za-z_$][\w$]*|['\"][^'\"]+['\"])\s*:/gm; const counts={}; let m; while((m=re.exec(txt))){let key=m[1].replace(/^['\"]|['\"]$/g,'');counts[key]=(counts[key]||0)+1} results.duplicates[file]=Object.entries(counts).filter(([,c])=>c>1);
}
for(const loc of supportedLocales.filter(l=>l.status==='available')){results.registry[loc.code]={locale:loc.locale,label:loc.label,nativeLabel:loc.nativeLabel,direction:loc.direction,status:loc.status,normalize:normalizeLanguage(loc.code),available:isAvailableLanguage(loc.code)}}
results.special={plCloseFilters:(fs.readFileSync('src/lib/i18n/pl.ts','utf8').match(/closeFilters\s*:/g)||[]).length,idEmail:fs.readFileSync('src/lib/i18n/id.ts','utf8').includes('{{email}}'),vi:[normalizeLanguage('vi'),normalizeLanguage('vi-VN'),normalizeLanguage('vi-vn')],th:[normalizeLanguage('th'),normalizeLanguage('th-TH'),normalizeLanguage('th-th')],id:[normalizeLanguage('id'),normalizeLanguage('id-ID'),normalizeLanguage('id-id')],arDir:supportedLocales.find(l=>l.code==='ar')?.direction,nonArBad:supportedLocales.filter(l=>l.status==='available'&&l.code!=='ar'&&l.direction!=='ltr').map(l=>l.code)};
const files=[...fs.readdirSync('src/app',{recursive:true}),...fs.readdirSync('src/components',{recursive:true}).map(f=>'../components/'+f)].filter(f=>/\.(tsx|ts)$/.test(f));
for(const rel of files){const file=rel.startsWith('../')?'src/'+rel.slice(3):'src/app/'+rel;let txt;try{txt=fs.readFileSync(file,'utf8')}catch{continue}txt.split(/\n/).forEach((line,i)=>{if(/[>][A-Z][A-Za-z ,!?'/&-]{5,}[<]|(aria-label|placeholder|title)=['\"][A-Z][A-Za-z ,!?'/&-]{5,}/.test(line)&&!/Kurioticket|TODO|console|import /.test(line))results.sourceHits.push({file,line:i+1,text:line.trim().slice(0,180)})})}
if (process.env.AUDIT_I18N_WRITE_JSON === '1') fs.writeFileSync('i18n-audit-v2-results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({baseKeys:results.baseKeys, locales:Object.fromEntries(Object.entries(results.locales).map(([k,v])=>[k,{keys:v.keys,missing:v.missing.length,placeholderMismatch:v.placeholderMismatch.length,identical:v.identicalCount}])),special:results.special,sourceHits:results.sourceHits.length},null,2));
