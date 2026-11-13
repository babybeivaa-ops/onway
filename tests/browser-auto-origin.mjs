import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.ONWAY_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{for(const width of [360,390,430,870]){
 const page=await browser.newPage({viewport:{width,height:844}});page.setDefaultTimeout(10000);
 const queries=[];
 await page.route('**/api/**',async r=>{const u=new URL(r.request().url());if(u.pathname==='/api/demo-workspace')return r.fulfill({status:404,json:{}});if(u.pathname==='/api/maps/search'){const q=u.searchParams.get('q');queries.push(q);await new Promise(resolve=>setTimeout(resolve,300));return r.fulfill({json:{items:q.includes('없는단체')?[]:[{id:'test-place',provider:'kakao',name:q.includes('군청')?'진도군청':'동평초등학교',address:'테스트 주소',lat:35,lng:127}]}})}return r.fulfill({status:503,json:{}})});
 await page.goto('http://127.0.0.1:4185/');await page.getByRole('button',{name:'단체 등록',exact:true}).click();
 const d=page.getByRole('dialog',{name:'단체 등록',exact:true});const name=d.getByLabel('단체명',{exact:true});
 assert.equal(await d.getByLabel('출발 장소 검색',{exact:true}).count(),0);
 await name.fill('동평초');await d.getByText('출발지를 자동으로 찾고 있어요…',{exact:true}).waitFor();
 assert.equal(await d.getByLabel('출발 장소 검색',{exact:true}).count(),0);
 await d.getByRole('button',{name:/동평초등학교.*이 주소로 출발지 등록/}).waitFor();assert(queries.includes('동평초'));
 if(process.env.ONWAY_QA_OUTPUT)await d.screenshot({path:`${process.env.ONWAY_QA_OUTPUT}/auto-origin-${width}.png`});
 await d.getByRole('button',{name:'다른 장소 검색',exact:true}).click();assert(await d.getByLabel('출발 장소 검색',{exact:true}).isVisible());
 await name.fill('없는단체 드림스타트');await d.getByText(/검색 결과가 없어요/).waitFor();
 const manual=d.getByLabel('출발 장소 검색',{exact:true});await manual.waitFor();await manual.fill('진도군청');
 await d.getByRole('button',{name:/진도군청.*이 주소로 출발지 등록/}).click();assert.equal(await name.inputValue(),'없는단체 드림스타트');
 await name.fill('동평초');await d.getByRole('button',{name:/동평초등학교.*이 주소로 출발지 등록/}).waitFor();assert.equal(await manual.count(),0);
 assert.equal(await d.evaluate(e=>e.scrollWidth-e.clientWidth),0);
 console.log(`PASS ${width}: automatic search, loading message, results, empty-result fallback, manual override, reset`);await page.close();
}}finally{await browser.close()}
