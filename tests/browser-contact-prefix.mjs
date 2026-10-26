import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGroup,today,WORKSPACE_KEY} from '../src/workspace.ts';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.ONWAY_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

const g=createGroup({name:'동명중학교',travelDate:today(),origin:'동명중학교',youth:30,leaders:2,ic:true,bridge:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({status:503,json:{}});const f=path.join(root,'dist',u.pathname==='/'?'index.html':u.pathname);return r.fulfill({path:f,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg'})[path.extname(f)]||'application/octet-stream'})});

 await page.goto('http://127.0.0.1/');await page.evaluate(({g,key})=>localStorage.setItem(key,JSON.stringify({version:2,view:'admin',activeGroupId:g.id,groups:[g]})),{g,key:WORKSPACE_KEY});await page.reload();await page.locator('.school-accordion-toggle[aria-expanded=true]').waitFor();let phone=page.getByRole('textbox',{name:'연락처',exact:true});await phone.waitFor();assert.equal(await phone.inputValue(),'061-830-');await phone.press('End');await phone.pressSequentially('1234');await page.getByRole('heading',{name:'담당자 정보',exact:true}).click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).groups[0].state.organization.arrival.phone==='061-830-1234',WORKSPACE_KEY);await page.reload();await page.locator('.school-accordion-toggle[aria-expanded=true]').waitFor();assert.equal(await phone.inputValue(),'061-830-1234');const name=page.getByRole('textbox',{name:'담당자 이름',exact:true});await name.fill('황은결');await name.press('Tab');await page.waitForFunction(()=>{const e=document.activeElement;return e instanceof HTMLInputElement&&e.type==='tel'&&e.selectionStart===8});await phone.pressSequentially('1587');assert.equal(await phone.inputValue(),'061-830-1587');assert.equal(await phone.evaluate(e=>document.activeElement===e),true);await phone.press('Tab');const dropoff=page.getByRole('textbox',{name:'버스 하차 위치',exact:true});assert.equal(await dropoff.evaluate(e=>document.activeElement===e),true);await dropoff.press('Shift+Tab');assert.equal(await phone.evaluate(e=>document.activeElement===e),true);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).groups[0].state.organization.arrival.contactName==='황은결',WORKSPACE_KEY);assert.equal(await page.getByRole('button',{name:'저장',exact:true}).count(),1);console.log('PASS default phone prefix, suffix entry, save/reload and existing number preservation');
}finally{await browser.close()}
