import {chromium} from 'playwright';import path from 'node:path';import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
const __dirname=path.dirname(fileURLToPath(import.meta.url));process.chdir(path.resolve(__dirname,'../../..'));
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:900},deviceScaleFactor:2});let errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message)});
fs.mkdirSync('qa/native-flight-results-parity/images',{recursive:true});
for(const [state,params] of [['results',''],['selected-filters','&selected=1'],['airlines-sheet','&sheet=airlines&selected=1'],['full-filters','&sheet=all&selected=1'],['sort-sheet','&sheet=sort']]){
for(const v of ['before','after']){await page.goto(`http://127.0.0.1:${process.env.PREVIEW_PORT??3063}/?v=${v}${params}`);await page.waitForTimeout(900);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`qa/native-flight-results-parity/images/${state}-${v}.png`});console.log(state,v,(await page.locator('body').innerText()).slice(-350));}}
console.log('Runtime errors:',errors);await browser.close();if(errors.length)process.exitCode=1})();
