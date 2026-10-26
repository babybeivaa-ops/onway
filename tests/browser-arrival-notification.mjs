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
 await page.goto('http://127.0.0.1/');const original={version:2,view:'guide',activeGroupId:g.id,groups:[g]};await page.evaluate(({w,key})=>localStorage.setItem(key,JSON.stringify(w)),{w:original,key:WORKSPACE_KEY});await page.reload();await page.getByRole('button',{name:'센터에 도착했어요',exact:true}).click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).groups[0].state.trip.status==='도착',WORKSPACE_KEY);const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),WORKSPACE_KEY);
 assert.equal(saved.groups[0].state.counts.youth,30);
 await page.evaluate(({w,key})=>localStorage.setItem(key,JSON.stringify({...w,view:'admin'})),{w:original,key:WORKSPACE_KEY});await page.reload();await page.getByRole('button',{name:/알림/}).first().waitFor();
 await page.evaluate(({w,key})=>{const oldValue=localStorage.getItem(key),newValue=JSON.stringify({...w,view:'admin'});localStorage.setItem(key,newValue);window.dispatchEvent(new StorageEvent('storage',{key,oldValue,newValue}))},{w:saved,key:WORKSPACE_KEY});
 const toast=page.locator('.admin-notification-toast');await toast.getByText('동명중이 센터에 도착하였습니다.',{exact:true}).waitFor();assert.equal(await toast.count(),1);await page.screenshot({path:path.join(root,'..','센터도착-알림확인.png')});
 await toast.getByRole('button',{name:'팝업 닫기'}).click();await page.getByRole('button',{name:/알림 1/}).click();await page.getByRole('region',{name:'관리자 알림'}).getByText('동명중이 센터에 도착하였습니다.',{exact:true}).waitFor();await page.reload();assert.equal(await toast.count(),0);console.log('PASS guide arrival button, saved arrival, admin popup, inbox, no reload duplicate');
}finally{await browser.close()}
