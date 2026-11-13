import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/COMTREE/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {for(const width of [390,1280]){
const page=await browser.newPage({viewport:{width,height:844}});
await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({status:u.pathname==='/api/demo-workspace'?404:503,json:{}});return r.fulfill({path:path.join(process.cwd(),'dist',u.pathname==='/'?'index.html':u.pathname),contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2'})[path.extname(u.pathname==='/'?'index.html':u.pathname)]||'application/octet-stream'});});
await page.goto('http://127.0.0.1/');await page.getByRole('button',{name:'단체 등록',exact:true}).click();const d=page.getByRole('dialog',{name:'단체 등록',exact:true});const tabs=d.locator('.participant-editor > .participant-level-tabs > button');
await d.getByLabel('단체명',{exact:true}).fill('동명중학교');await page.waitForFunction(()=>document.querySelector('.participant-editor > .participant-level-tabs > button')?.dataset.level==='middle');assert.equal(await tabs.count(),1);assert.equal(await d.locator('.mixed-count-table tbody tr').count(),1);
await d.getByRole('button',{name:'교급 추가',exact:true}).click();await d.getByRole('group',{name:'추가할 참가자 구분',exact:true}).getByRole('button',{name:'대학생',exact:true}).click();assert.equal(await tabs.count(),2);
await d.getByLabel('단체명',{exact:true}).fill('동원고등학교');await page.waitForFunction(()=>document.querySelector('.participant-editor > .participant-level-tabs > button')?.dataset.level==='high');assert.equal(await tabs.count(),1);assert.equal(await d.locator('.mixed-count-table tbody tr').count(),1);
await page.evaluate(async()=>{await document.fonts.load('14px "Pretendard Variable"');await document.fonts.ready});const loaded=await page.evaluate(()=>[...document.fonts].some(f=>f.family.includes('Pretendard')&&f.status==='loaded'));assert(loaded);
console.log('PASS school-level visibility, manual add, school change, font',width);await page.close();
}}finally{await browser.close()}
