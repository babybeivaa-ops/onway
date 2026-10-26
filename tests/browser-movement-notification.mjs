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

 await page.goto('http://127.0.0.1/');const original={version:2,view:'admin',activeGroupId:g.id,groups:[g]};await page.evaluate(({w,key})=>localStorage.setItem(key,JSON.stringify(w)),{w:original,key:WORKSPACE_KEY});await page.reload();await page.getByRole('button',{name:/알림/}).first().waitFor();
 async function report(status,at){await page.evaluate(({key,status,at})=>{const oldValue=localStorage.getItem(key),w=JSON.parse(oldValue);w.groups[0].state.reports=[{id:'qa-report',waypointId:'bridge',at,status,revisions:[]}];const newValue=JSON.stringify(w);localStorage.setItem(key,newValue);window.dispatchEvent(new StorageEvent('storage',{key,oldValue,newValue}))},{key:WORKSPACE_KEY,status,at})}
 await report('saved',new Date().toISOString());const toast=page.locator('.admin-notification-toast');await toast.getByText('동명중이 나로1대교를 통과하였습니다.',{exact:true}).waitFor();assert.equal(await toast.count(),1);assert.equal(await toast.locator('.notification-group-name').innerText(),'동명중');assert.equal(await toast.locator('.notification-group-name').evaluate(e=>getComputedStyle(e).color),'rgb(24, 88, 184)');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'..','이동알림-모바일.png')});const box=await toast.boundingBox();assert(box.x>=0&&box.x+box.width<=390);
 await report('cancelled',new Date().toISOString());await toast.waitFor({state:'hidden'});await page.reload();assert.equal(await toast.count(),0);console.log('PASS admin movement popup, highlighted name, mobile fit, cancellation and reload');
}finally{await browser.close()}
