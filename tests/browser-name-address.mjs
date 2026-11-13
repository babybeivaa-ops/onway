// Run against the local built server with ONWAY_PLAYWRIGHT_MODULE set.
// A fresh browser context and mocked external APIs keep this test isolated.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {WORKSPACE_KEY} from '../src/workspace.ts';
const {chromium}=createRequire(import.meta.url)(process.env.ONWAY_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const origin=process.env.ONWAY_TEST_URL||'http://127.0.0.1:4185';
try{for(const width of [360,390,430,1280]){
 const page=await browser.newPage({viewport:{width,height:900},locale:'ko-KR',timezoneId:'Asia/Seoul'});page.setDefaultTimeout(12000);
 const requests=[];
 await page.route('**/api/**',r=>{const u=new URL(r.request().url());if(u.pathname==='/api/demo-workspace')return r.fulfill({status:404,json:{}});if(u.pathname==='/api/maps/search'){requests.push(u.searchParams.get('q'));return r.fulfill({json:{items:[{id:'qa-office',name:u.searchParams.get('q').includes('궁동')?'청소년문화의집':'진도군청',address:'전남 진도군 테스트 주소',lat:34.486,lng:126.263,provider:'kakao'}]}})}return r.fulfill({status:503,json:{}})});
 await page.goto(origin);await page.getByRole('button',{name:'단체 등록',exact:true}).click();
 let dialog=page.getByRole('dialog',{name:'단체 등록',exact:true});
 await dialog.getByLabel('단체명',{exact:true}).fill('진도군 드림스타트');
 await dialog.getByLabel('단체명',{exact:true}).press('Enter');assert(await dialog.isVisible());
 await dialog.getByRole('button',{name:'다른 장소 검색',exact:true}).click();const query=dialog.getByLabel('출발 장소 검색',{exact:true});await query.fill('진도군청');await query.press('Enter');assert(await dialog.isVisible());
 await dialog.getByRole('button',{name:/진도군청.*이 주소로 출발지 등록/}).click();
 assert.equal(await dialog.getByLabel('단체명',{exact:true}).inputValue(),'진도군 드림스타트');
 await dialog.getByRole('button',{name:'단체 등록하기',exact:true}).click();
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'{}').groups?.some(g=>g.state.organization.name==='진도군 드림스타트'),WORKSPACE_KEY);
 const read=()=>page.evaluate(key=>{const w=JSON.parse(localStorage.getItem(key));return {groups:[w.groups.find(g=>g.id===w.activeGroupId)]}},WORKSPACE_KEY);
 let saved=await read();assert.equal(saved.groups[0].state.waypoints.find(p=>p.id==='start').place.name,'진도군청');
 await page.evaluate(key=>{const w=JSON.parse(localStorage.getItem(key));localStorage.setItem(key,JSON.stringify({...w,view:'admin'}))},WORKSPACE_KEY);await page.reload();
 await page.getByRole('button',{name:'단체 정보 수정',exact:true}).click();dialog=page.getByRole('dialog',{name:'단체 정보 수정',exact:true});
 const name=dialog.getByLabel('단체명',{exact:true});await name.fill('궁동 청소년 문화의 집');await name.press('Enter');assert(await dialog.isVisible());
 const composition=await name.evaluate(el=>{el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));const event=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',isComposing:true,bubbles:true,cancelable:true});el.dispatchEvent(event);el.dispatchEvent(new CompositionEvent('compositionend',{data:'집',bubbles:true}));return event.defaultPrevented});assert(composition);assert(await dialog.isVisible());
 assert.equal((await read()).groups[0].state.organization.name,'진도군 드림스타트');
 await dialog.getByRole('button',{name:'다른 장소 검색',exact:true}).click();await dialog.getByLabel('출발 장소 검색',{exact:true}).fill('궁동 청소년문화의집 주소');
 await dialog.getByRole('button',{name:/청소년문화의집.*이 주소로 출발지 변경/}).click();assert.equal(await name.inputValue(),'궁동 청소년 문화의 집');
 await name.fill('궁동 청소년 문화의 집 본관');await dialog.getByRole('button',{name:/청소년문화의집.*이 주소로 출발지 변경/}).waitFor();
 await name.fill('궁동 청소년 문화의 집');await dialog.getByRole('button',{name:/청소년문화의집.*이 주소로 출발지 변경/}).click();
 assert.equal((await read()).groups[0].state.organization.name,'진도군 드림스타트');
 if(process.env.ONWAY_QA_OUTPUT)await dialog.screenshot({path:`${process.env.ONWAY_QA_OUTPUT}/name-address-${width}.png`});
 await dialog.getByRole('button',{name:'수정 저장',exact:true}).click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).groups.some(g=>g.state.organization.name==='궁동 청소년 문화의 집'),WORKSPACE_KEY);
 saved=await read();assert.equal(saved.groups[0].state.waypoints.find(p=>p.id==='start').place.name,'청소년문화의집');
 await page.evaluate(key=>{const w=JSON.parse(localStorage.getItem(key));localStorage.setItem(key,JSON.stringify({...w,view:'guide'}))},WORKSPACE_KEY);await page.reload();await page.getByRole('heading',{name:'궁동 청소년 문화의 집',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);assert(requests.includes('진도군청'));assert(requests.includes('궁동 청소년문화의집 주소'));
 console.log(`PASS ${width}: independent address, original name, explicit save, Enter/IME, persistence, guide heading`);await page.close();
}}finally{await browser.close()}
