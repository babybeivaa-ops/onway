import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGroup,today,WORKSPACE_KEY} from '../src/workspace.ts';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.ONWAY_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

const g=createGroup({name:'동명중학교',visitDuration:'1박 2일',travelDate:today(),origin:'동명중학교',youth:30,leaders:2,ic:true,bridge:true});
const second=createGroup({name:'울산 동평초등학교',travelDate:today(),origin:'울산 동평초등학교',youth:20,leaders:2,ic:true,bridge:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},hasTouch:true});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({status:503,json:{}});const f=path.join(root,'dist',u.pathname==='/'?'index.html':u.pathname);return r.fulfill({path:f,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg'})[path.extname(f)]||'application/octet-stream'})});

 await page.goto('http://127.0.0.1/');await page.evaluate(({g,second,key})=>localStorage.setItem(key,JSON.stringify({version:2,view:'admin',activeGroupId:g.id,groups:[g,second]})),{g,second,key:WORKSPACE_KEY});await page.reload();
 const selectedToggle=page.locator('.school-accordion:not([hidden]) .school-accordion-toggle');
 const waitExpanded=()=>page.locator('.school-accordion:not([hidden]) .school-accordion-toggle[aria-expanded=true]').waitFor();
 await waitExpanded();
 await selectedToggle.click();assert.equal(await selectedToggle.getAttribute('aria-expanded'),'false');
 await page.locator('[id="group-tab-'+g.id+'"]').click();await waitExpanded();
 await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
 await page.locator('[id="group-tab-'+second.id+'"]').click();await waitExpanded();
 await page.waitForFunction(()=>{const heading=document.querySelector('.school-selector-heading'),card=document.querySelector('.school-accordion:not([hidden])'),tabs=document.querySelector('.group-quick-tabs');const top=heading.getBoundingClientRect().top;return top>=10&&top<=14&&card.getBoundingClientRect().top>tabs.getBoundingClientRect().bottom});
 assert.equal(await page.locator('.school-accordion:not([hidden])').getAttribute('id'),'group-view-'+second.id);
 await page.reload();await waitExpanded();assert.equal(await page.locator('.school-accordion:not([hidden])').getAttribute('id'),'group-view-'+second.id);
 await page.locator('[id="group-tab-'+g.id+'"]').click();await waitExpanded();
 const card=page.locator('.planned-arrival-card');
 assert.equal(await card.locator('.planned-period-tabs button[aria-pressed=true]').textContent(),'오후');
 assert.equal(await card.getByLabel('도착 예정 분',{exact:true}).inputValue(),'00');
 await card.getByLabel('도착 예정 시',{exact:true}).fill('15');
 await card.getByRole('button',{name:'저장',exact:true}).click();
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).groups[0].state.plannedArrival?.time==='15:00',WORKSPACE_KEY);
 assert.equal(await card.getByLabel('도착 예정 시',{exact:true}).inputValue(),'03');
 const fillTime=async time=>{if(await card.locator('input[type=time]').count()){await card.locator('input[type=time]').fill(time);return;}const [h,m]=time.split(':');if(await card.locator('.planned-period-tabs').count()){await card.locator('.planned-period-tabs').getByRole('button',{name:Number(h)>=12?'오후':'오전',exact:true}).tap()}else{await card.getByLabel('도착 예정 오전/오후',{exact:true}).selectOption(Number(h)>=12?'PM':'AM');}await card.getByLabel('도착 예정 시',{exact:true}).fill(String(Number(h)%12||12).padStart(2,'0'));await card.getByLabel('도착 예정 분',{exact:true}).fill(m)};const readTime=async()=>{if(await card.locator('input[type=time]').count())return card.locator('input[type=time]').inputValue();const h=Number(await card.getByLabel('도착 예정 시',{exact:true}).inputValue()),m=await card.getByLabel('도착 예정 분',{exact:true}).inputValue(),p=await card.locator('.planned-period-tabs').count()?((await card.locator('.planned-period-tabs button[aria-pressed=true]').textContent())==='오후'?'PM':'AM'):await card.getByLabel('도착 예정 오전/오후',{exact:true}).inputValue();return String(h%12+(p==='PM'?12:0)).padStart(2,'0')+':'+m};await fillTime('14:30');await card.getByRole('button',{name:'저장',exact:true}).click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).groups[0].state.plannedArrival?.time==='14:30',WORKSPACE_KEY);
 async function view(view){const toolbar=page.locator('details.demo-toolbar');if(!await toolbar.evaluate(e=>e.open))await toolbar.locator('summary').click();await toolbar.getByRole('button',{name:view==='admin'?'관리자 화면':'인솔교사 화면',exact:true}).click();if(view==='admin')await waitExpanded();}
 await selectedToggle.click();assert.equal(await selectedToggle.getAttribute('aria-expanded'),'false');await view('guide');assert.equal(await readTime(),'14:30');assert.equal(await card.locator('.planned-arrival-meta').count(),0);assert.equal(await card.locator('.planned-arrival-hint').textContent(),'예상 도착 시각을 입력해주세요.');await page.setViewportSize({width:390,height:844});
 const guideHour=card.getByLabel('도착 예정 시',{exact:true}),guideMinute=card.getByLabel('도착 예정 분',{exact:true});
 await guideHour.tap();assert.deepEqual(await guideHour.evaluate(e=>[e.selectionStart,e.selectionEnd]),[0,2]);
 await guideHour.pressSequentially('3');assert.equal(await guideHour.inputValue(),'3');
 await guideMinute.tap();await guideMinute.pressSequentially('0');assert.equal(await guideMinute.inputValue(),'0');
 await card.getByRole('button',{name:'저장',exact:true}).tap();
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).groups[0].state.plannedArrival?.time==='15:00',WORKSPACE_KEY);
 assert.equal(await guideHour.inputValue(),'03');assert.equal(await guideMinute.inputValue(),'00');
 await fillTime('15:45');await card.getByRole('button',{name:'저장',exact:true}).click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).groups[0].state.plannedArrival?.time==='15:45',WORKSPACE_KEY);assert.equal(await card.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');const inputBox=await card.locator('.planned-clock-digits').boundingBox(),buttonBox=await card.getByRole('button',{name:'저장',exact:true}).boundingBox();assert.ok(Math.abs(buttonBox.y-inputBox.y)<1);assert.ok(Math.abs(inputBox.height-buttonBox.height)<1);for(const width of [320,360,375,390,412,430,480]){await page.setViewportSize({width,height:844});const controls=await card.locator('.planned-period-tabs,.planned-clock-digits,button[type=submit]').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));assert.ok(controls.every(c=>Math.abs(c.y-controls[0].y)<1));assert.ok(controls.every(c=>c.w>=44&&c.h>=44));assert.ok(await card.evaluate(e=>e.scrollWidth<=e.clientWidth));assert.equal(await page.locator('.center-arrival-confirmation').count(),0);assert.equal(await card.locator('.planned-arrival-hint').evaluate(e=>getComputedStyle(e).textAlign),'left');if(width<=430){const b=await card.boundingBox(),f=await card.locator('form').boundingBox(),h=await card.locator('.planned-arrival-heading').boundingBox();assert.ok(Math.abs(b.x+b.width/2-f.x-f.width/2)<1);assert.ok(Math.abs(b.x+b.width/2-h.x-h.width/2)<1);}assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'whole guide page fits '+width+'px');if(width===390)await page.screenshot({path:path.join(root,'../../인솔교사-모바일-390.png'),fullPage:true});await card.screenshot({path:path.join(root,'../../도착예정시각-'+width+'.png')});}assert.ok(await card.evaluate(e=>e.scrollWidth<=e.clientWidth));await view('admin');assert.equal(await readTime(),'15:45');assert.equal(await card.locator('.planned-arrival-author').textContent(),'인솔교사가 입력하였습니다.');assert.ok(await card.locator('.planned-arrival-meta time').getAttribute('datetime'));await page.setViewportSize({width:1280,height:900});await page.locator('.school-visit-facts').screenshot({path:path.join(root,'../../단체카드-최종확인.png')});console.log('PASS selected group automatic expansion, admin/guide arrival editing, guidance, persistence and mobile layout');
}finally{await browser.close()}
