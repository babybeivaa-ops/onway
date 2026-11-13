import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createGroup,today,WORKSPACE_KEY} from '../src/workspace.ts';
import {setPlannedArrival} from '../src/plannedArrival.ts';
const {chromium}=createRequire(import.meta.url)(process.env.ONWAY_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:870,height:668},timezoneId:'Asia/Seoul'});
 const page=await context.newPage();page.setDefaultTimeout(10000);await page.route('**/api/**',r=>r.fulfill({status:404,json:{}}));
 const groups=['도착알림초등학교','다른학교'].map(name=>createGroup({name,travelDate:today(),origin:name,youth:3,leaders:2,ic:true,bridge:true}));
 await page.goto('http://127.0.0.1:4186/');await page.evaluate(({key,groups})=>localStorage.setItem(key,JSON.stringify({version:2,view:'guide',groups,activeGroupId:groups[0].id})),{key:WORKSPACE_KEY,groups});await page.reload();
 const card=page.locator('.planned-arrival-card');await card.getByLabel('도착 예정 시',{exact:true}).fill('14');await card.getByLabel('도착 예정 분',{exact:true}).fill('');await card.getByRole('button',{name:'저장',exact:true}).click();
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).groups[0].state.plannedArrival?.time==='14:00',WORKSPACE_KEY);
 await card.getByLabel('도착 예정 시',{exact:true}).fill('');await card.getByLabel('도착 예정 분',{exact:true}).fill('');await card.getByRole('button',{name:'저장',exact:true}).click();
 await page.waitForFunction(key=>!JSON.parse(localStorage.getItem(key)).groups[0].state.plannedArrival,WORKSPACE_KEY);
 await page.evaluate(key=>{const w=JSON.parse(localStorage.getItem(key));w.view='admin';w.activeGroupId=w.groups[1].id;localStorage.setItem(key,JSON.stringify(w))},WORKSPACE_KEY);await page.reload();await page.locator('.admin-page').waitFor();
 const writer=await context.newPage();await writer.route('**/api/**',r=>r.fulfill({status:404,json:{}}));await writer.goto('http://127.0.0.1:4186/');
 const changed=setPlannedArrival(groups[0].state,today(),'14:05','guide');
 await writer.evaluate(({key,changed})=>{const w=JSON.parse(localStorage.getItem(key));w.groups[0].state=changed;localStorage.setItem(key,JSON.stringify(w))},{key:WORKSPACE_KEY,changed});
 const toast=page.locator('.admin-notification-toast').filter({hasText:'도착 예정 시각'});await toast.waitFor();await toast.getByRole('button',{name:'확인',exact:true}).click();
 const target=page.locator('[id="school-panel-'+groups[0].id+'"] .planned-arrival-card');await target.waitFor({state:'visible'});
 assert.equal(await target.getByLabel('도착 예정 시',{exact:true}).inputValue(),'02');assert.equal(await target.getByLabel('도착 예정 분',{exact:true}).inputValue(),'05');
 await page.waitForFunction(id=>{const e=document.querySelector('[id="school-panel-'+id+'"] .planned-arrival-card');const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight},groups[0].id);
 assert.equal(await toast.count(),0);
 console.log('PASS empty minutes save as 00, clearing both clears arrival, notification Confirm selects correct group and scrolls to arrival card');
}finally{await browser.close()}
