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

 const sharing=page.locator('.school-sharing');
 await sharing.locator('.center-access summary').click();
 await sharing.getByLabel('관리자 접속 코드').fill('test-admin');
 const calls=[];
 await page.route('**/api/shared/*',r=>{const p=new URL(r.request().url()).pathname;calls.push(p);return r.fulfill({status:200,json:p.endsWith('/link')?{token:'test-guide-token',expires:Date.now()+86400000}:{}})});
 await sharing.getByRole('button',{name:'링크·QR 생성',exact:true}).click();
 await sharing.getByRole('link',{name:'QR 이미지 저장'}).waitFor();
 assert.equal(await sharing.getByLabel('인솔교사 전용 링크').inputValue(),'http://127.0.0.1/#guide=test-guide-token');
 assert.deepEqual(calls,['/api/shared/publish','/api/shared/link']);
 assert.ok((await sharing.locator('.share-qr img').getAttribute('src')).startsWith('data:image/gif'));
 for(const width of [1236,390]){await page.setViewportSize({width,height:884});const b=await sharing.locator('.share-qr img').boundingBox();assert.ok(b.width<=200);}
 console.log('PASS publish + link generation, visible QR, download and mobile width');
} finally {await browser.close()}
