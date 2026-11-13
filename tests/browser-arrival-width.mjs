import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createGroup,today,WORKSPACE_KEY} from '../src/workspace.ts';
const {chromium}=createRequire(import.meta.url)(process.env.ONWAY_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage();
 await page.route('**/api/**',r=>r.fulfill({status:404,json:{}}));
 await page.goto('http://127.0.0.1:4185/');
 const g=createGroup({name:'동평초등학교',travelDate:today(),origin:'동평초등학교',youth:30,leaders:2,ic:true,bridge:true});
 await page.evaluate(({g,key})=>localStorage.setItem(key,JSON.stringify({version:2,view:'admin',activeGroupId:g.id,groups:[g]})),{g,key:WORKSPACE_KEY});
 await page.reload();
 const card=page.locator('.visit-date-arrival .planned-arrival-card');
 await card.waitFor();
 for(const width of [360,390,430,651,768,870,1024,1280,1366,1440]){
  await page.setViewportSize({width,height:900});
  await card.getByLabel('도착 예정 시',{exact:true}).fill('11');
  await card.getByLabel('도착 예정 분',{exact:true}).fill('59');
  const sizes=await card.evaluate(el=>{
   const form=el.querySelector('form'),b=form.getBoundingClientRect();
   return {oneLine:[...form.children].every(c=>Math.abs(c.getBoundingClientRect().top-b.top)<1),overflow:el.scrollWidth-el.clientWidth,inputs:[...el.querySelectorAll('input')].map(i=>i.getBoundingClientRect().width),fit:[...form.children].every(c=>{const r=c.getBoundingClientRect();return r.left>=b.left-1&&r.right<=b.right+1})};
  });
  assert(sizes.inputs.every(w=>w>=26),JSON.stringify({width,sizes}));assert(sizes.fit,JSON.stringify({width,sizes}));assert(sizes.overflow<=1);assert(sizes.oneLine);
  console.log(`PASS admin ${width}: two-digit input width and controls fit`);
 }
 await card.getByRole('button',{name:'저장',exact:true}).click();
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).groups[0].state.plannedArrival?.time==='23:59',WORKSPACE_KEY);
 await page.reload();assert.equal(await card.getByLabel('도착 예정 분',{exact:true}).inputValue(),'59');
 if(process.env.ONWAY_QA_OUTPUT)await card.screenshot({path:process.env.ONWAY_QA_OUTPUT+'/arrival-laptop-fixed.png'});
 console.log('PASS arrival save and reload');
}finally{await browser.close()}
