// Run with ONWAY_PLAYWRIGHT_MODULE pointing to an installed Playwright package.
// All browser requests are served from disk or mocked; no live APIs or user profile.
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require(process.env.ONWAY_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const dist=path.resolve(process.argv[2]||path.join(root,'dist'));
async function prepare(browser,viewport){
 const page=await browser.newPage({viewport});
 page.on('pageerror',error=>console.error('Browser error:',error.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='127.0.0.1')return route.abort();
  if(url.pathname==='/api/maps/search')return route.fulfill({json:{items:[url.searchParams.get('q').includes('나로')?{id:'qa-space',provider:'kakao',name:'나로우주센터 우주과학관',address:'전남 고흥 테스트 주소',lat:34.453408084334384,lng:127.51774103712972}:url.searchParams.get('q').startsWith('새학교')?{id:'qa-middle',provider:'kakao',name:'새학교중학교',address:'변경할 테스트 주소',lat:35.1,lng:127.7,category:'교육 > 학교 > 중학교'}:{id:'qa-high',provider:'kakao',name:'효천고등학교',address:'테스트용 주소',lat:34.9,lng:127.5,category:'교육 > 학교 > 고등학교'}]}});
  if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:'Offline QA'}});
  const file=path.join(dist,url.pathname==='/'?'index.html':url.pathname);
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg'};
  return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
 });
 await page.goto('http://127.0.0.1/');
 await page.getByRole('button',{name:'단체 등록',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'단체 등록',exact:true});
 return {page,dialog};
}
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{for(const viewport of [{width:1360,height:1000},{width:390,height:844}]){
 const {page,dialog}=await prepare(browser,viewport);assert.equal(await dialog.getByRole('combobox',{name:'출발지 설정',exact:true}).inputValue(),'school');
 await dialog.getByLabel('단체명',{exact:true}).fill('효천고');await dialog.getByRole('button',{name:/효천고등학교.*이 주소로 출발지 등록/}).click();await dialog.getByLabel('고등 1학년 남 (명)',{exact:true}).fill('12');
 await dialog.getByRole('combobox',{name:'출발지 설정',exact:true}).selectOption('other');await dialog.getByRole('button',{name:'단체 등록하기',exact:true}).click();await dialog.getByRole('alert').filter({hasText:'출발 장소를 선택'}).waitFor();
 await dialog.getByLabel('출발 장소 검색',{exact:true}).fill('나로우주센터 우주과학관');await dialog.getByRole('button',{name:/나로우주센터.*이 주소로 출발지 등록/}).click();assert.equal(await dialog.getByLabel('단체명',{exact:true}).inputValue(),'효천고');assert.equal(await dialog.getByLabel('고등 1학년 남 (명)',{exact:true}).inputValue(),'12');
 if(viewport.width===390)await dialog.screenshot({path:path.join(root,'..','출발지-선택-모바일.png')});
 await dialog.getByRole('button',{name:'단체 등록하기',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'));const read=()=>page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>{try{return JSON.parse(localStorage[k])?.version===2&&JSON.parse(localStorage[k]).groups?.length}catch{return false}});return JSON.parse(localStorage[k]).groups.find(g=>g.state.organization.name==="효천고")});await page.reload();let g=await read();assert.equal(g.state.organization.name,'효천고');assert.equal(g.state.organization.originMode,'other');assert.equal(g.state.trip.origin,'나로우주센터 우주과학관');assert.equal(g.state.counts.youth,12);
 if(!await page.getByRole('button',{name:'단체 정보 수정',exact:true}).count()){if(!await page.locator('details.demo-toolbar').evaluate(el=>el.open))await page.locator('details.demo-toolbar > summary').click();await page.getByRole('button',{name:'관리자 화면',exact:true}).click();}await page.getByRole('button',{name:'단체 정보 수정',exact:true}).click();let edit=page.getByRole('dialog',{name:'단체 정보 수정',exact:true});assert.equal(await edit.getByRole('combobox',{name:'출발지 설정',exact:true}).inputValue(),'other');await edit.getByRole('region',{name:'현재 출발지',exact:true}).getByText('나로우주센터 우주과학관',{exact:true}).waitFor();assert.equal(await edit.getByLabel('출발 장소 검색',{exact:true}).count(),0);assert.equal(await edit.locator('.place-results').count(),0);await edit.getByRole('button',{name:'출발지 변경',exact:true}).click();assert.equal(await edit.getByLabel('출발 장소 검색',{exact:true}).inputValue(),'나로우주센터 우주과학관');await edit.getByRole('button',{name:/나로우주센터.*이 주소로 출발지 변경/}).waitFor();await edit.getByRole('button',{name:'기존 출발지 유지',exact:true}).click();assert.equal(await edit.locator('.place-results').count(),0);await edit.getByRole('button',{name:'수정 저장',exact:true}).click();await page.reload();assert.equal((await read()).state.trip.origin,'나로우주센터 우주과학관');
 if(!await page.getByRole('button',{name:'단체 정보 수정',exact:true}).count()){if(!await page.locator('details.demo-toolbar').evaluate(el=>el.open))await page.locator('details.demo-toolbar > summary').click();await page.getByRole('button',{name:'관리자 화면',exact:true}).click();}await page.getByRole('button',{name:'단체 정보 수정',exact:true}).click();edit=page.getByRole('dialog',{name:'단체 정보 수정',exact:true});await edit.getByRole('combobox',{name:'출발지 설정',exact:true}).selectOption('school');assert.equal(await edit.getByRole('region',{name:'현재 출발지',exact:true}).count(),0);await edit.getByRole('button',{name:/효천고등학교.*이 주소로 출발지 변경/}).click();await edit.getByRole('button',{name:'수정 저장',exact:true}).click();await page.reload();g=await read();assert.equal(g.state.organization.originMode,'school');assert.equal(g.state.trip.origin,'효천고등학교');assert.deepEqual(g.state.waypoints.filter(p=>p.included).sort((a,b)=>a.order-b.order).map(p=>p.name),['효천고등학교','고흥IC','나로1대교','국립청소년우주센터']);assert.deepEqual(g.checkpoints,{ic:true,bridge:true});assert.equal(g.state.counts.youth,12);console.log('PASS origin selection, required place, preserved school/counts, save/reload, edit school return',viewport.width);await page.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
