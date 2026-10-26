import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGroup,today,WORKSPACE_KEY} from '../src/workspace.ts';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.ONWAY_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const date=today();
function group(name,point){const g=createGroup({name,travelDate:date,origin:name,youth:10,leaders:1,ic:true,bridge:true});g.id=name;g.state.reports=[{id:name,waypointId:point,at:date+'T13:47:00+09:00',status:'saved',revisions:[]}];return g}
const groups=[group('효천고','ic'),group('이반성초','start'),group('울산 동평초','bridge')];
const {adminRoadPlan}=await import('../src/adminArrivalOrder.ts');
const distances=new Map(groups.map((g,i)=>{g.state.trip.status='이동 중';return [adminRoadPlan(g)?.key,[20000,50000,10000][i]]}));
const browser=await chromium.launch({headless:true,channel:'chrome',timeout:60000});
try{
 const context=await browser.newContext({viewport:{width:1360,height:1000}});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1')return route.abort();
  if(url.pathname==='/api/routes/directions')return route.fulfill({json:{distanceMeters:distances.get(url.searchParams.get('points'))??10000,durationSeconds:600,paths:[],provider:'kakao',calculatedAt:new Date().toISOString()}});
  if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:'Offline QA'}});
  const file=path.join(root,'dist',url.pathname==='/'?'index.html':url.pathname);
  return route.fulfill({path:file,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream'});
 });
 const page=await context.newPage();await page.goto('http://127.0.0.1/');
 await page.evaluate(({groups,key})=>localStorage.setItem(key,JSON.stringify({version:2,view:'admin',activeGroupId:groups[0].id,groups})),{groups,key:WORKSPACE_KEY});
 await page.reload();await page.getByRole('tab',{name:/효천고/}).waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('.remaining-road-distance')].some(e=>e.textContent.includes('20.0 km')));
 const order=()=>page.locator('.group-quick-tabs button > strong').allTextContents();
 assert.deepEqual(await order(),['울산 동평초','효천고','이반성초']);
 assert.equal(await page.getByRole('tab',{name:/효천고/}).getAttribute('aria-selected'),'true');
 await page.getByRole('tab',{name:/효천고/}).press('ArrowLeft');
 await page.waitForFunction(()=>document.querySelector('[role="tab"][aria-selected="true"] strong')?.textContent==='울산 동평초');
 await page.waitForFunction(()=>!document.querySelector('.workspace-edit-scope')?.disabled);
 assert.equal(await page.locator('.selected-cloud-icon').count(),1);
 for(const width of [390,1360]){await page.setViewportSize({width,height:1000});const tab=page.locator('[role=tab][aria-selected=true]');assert.equal(await tab.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');const icon=await tab.locator('svg.selected-cloud-icon').boundingBox();const card=await tab.boundingBox();assert.ok(icon.y<card.y&&icon.y+icon.height>card.y);await page.locator('.group-quick-tabs').screenshot({path:path.join(root,'../../단체카드-'+width+'.png')});}
 if(process.env.ONWAY_QA_SCREENSHOT)await page.locator('.group-quick-tabs').screenshot({path:process.env.ONWAY_QA_SCREENSHOT});
 // A report update through the same storage-event path used by another view.
 await page.evaluate(key=>{
  const old=localStorage.getItem(key),data=JSON.parse(old),g=data.groups.find(g=>g.id==='이반성초');
  g.state.reports=[{id:'new',waypointId:'bridge',at:g.travelDate+'T13:40:00+09:00',status:'saved',revisions:[]}];
  const next=JSON.stringify(data);localStorage.setItem(key,next);window.dispatchEvent(new StorageEvent('storage',{key,oldValue:old,newValue:next}));
 },WORKSPACE_KEY);
 await page.waitForFunction(()=>document.querySelector('.group-quick-tabs button > strong')?.textContent==='이반성초');
 assert.deepEqual(await order(),['이반성초','울산 동평초','효천고']);
 assert.equal(await page.getByRole('tab',{name:/울산 동평초/}).getAttribute('aria-selected'),'true');
 console.log('PASS: screenshot order, active selection, arrow navigation, report-driven reorder and selected school preservation');
}finally{await browser.close()}
