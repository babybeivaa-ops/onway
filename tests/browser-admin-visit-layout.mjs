import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGroup,today,WORKSPACE_KEY} from '../src/workspace.ts';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.ONWAY_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const group=createGroup({name:'동명중학교',travelDate:today(),origin:'동명중학교',youth:30,leaders:2,ic:true,bridge:true});
group.state.organization.visitDuration='2박 3일';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();if(u.pathname==='/api/demo-workspace')return r.fulfill({status:404,json:{}});if(u.pathname.startsWith('/api/'))return r.fulfill({status:503,json:{}});const f=path.join(root,'dist',u.pathname==='/'?'index.html':u.pathname);return r.fulfill({path:f,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(f)]||'application/octet-stream'})});
 await page.goto('http://127.0.0.1/');
 await page.evaluate(({group,key})=>localStorage.setItem(key,JSON.stringify({version:2,view:'guide',activeGroupId:group.id,groups:[group]})),{group,key:WORKSPACE_KEY});
 await page.reload();

 page.setDefaultTimeout(10000);
 const toolbar=page.locator('details.demo-toolbar');
 if(!await toolbar.evaluate(e=>e.open))await toolbar.locator('summary').click();
 await toolbar.getByRole('button',{name:'관리자 화면',exact:true}).click();
 const checks=page.locator('.admin-checkpoint-checks');await checks.locator('summary').click();
 const step=checks.getByRole('checkbox').nth(1);await step.click();assert.equal(await step.getAttribute('aria-checked'),'true');
 await step.click();const popup=page.getByRole('dialog',{name:'관리자 확인 해제'});await popup.getByRole('button',{name:'취소',exact:true}).click();assert.equal(await step.getAttribute('aria-checked'),'true');
 await step.click();await popup.getByRole('button',{name:'확인 해제',exact:true}).click();assert.equal(await step.getAttribute('aria-checked'),'false');
 assert.ok(!(await page.locator('.visit-date-value').innerText()).includes('('));
 for(const width of [1236,390,320]){
 await page.setViewportSize({width,height:884});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
 const metrics=await page.locator('.visit-date-arrival form').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,button:e.querySelector('button.secondary')?.getBoundingClientRect().height}));
 assert.ok(metrics.scroll<=metrics.width+1,JSON.stringify({width,metrics}));assert.equal(metrics.button,40);
 console.log('PASS layout',width,metrics);
 }
 console.log('PASS original dates and ONWAY confirmation accept/cancel');
} finally {await browser.close()}
