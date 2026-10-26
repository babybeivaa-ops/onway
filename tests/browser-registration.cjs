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
  if(url.pathname==='/api/maps/search')return route.fulfill({json:{items:[url.searchParams.get('q').startsWith('새학교')?{id:'qa-middle',provider:'kakao',name:'새학교중학교',address:'변경할 테스트 주소',lat:35.1,lng:127.7,category:'교육 > 학교 > 중학교'}:{id:'qa-high',provider:'kakao',name:'효천고등학교',address:'테스트용 주소',lat:34.9,lng:127.5,category:'교육 > 학교 > 고등학교'}]}});
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
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',timeout:20000});
 try{
  for(const viewport of [{width:1440,height:1200},{width:390,height:844}]){
   const {page,dialog}=await prepare(browser,viewport);
   await dialog.getByLabel('단체명',{exact:true}).fill('효천');
   // Leader input must not disable school inference.
   await dialog.getByLabel('인솔자 남 (명)',{exact:true}).fill('2');
   await dialog.getByRole('button',{name:/효천고등학교.*이 주소로 출발지 등록/}).click();
   await dialog.getByLabel('고등 1학년 남 (명)',{exact:true}).fill('12');
   await dialog.getByLabel('고등 1학년 여 (명)',{exact:true}).fill('9');
   assert.match(await dialog.locator('.participant-level-tabs [aria-pressed="true"]').innerText(),/^고등/);
   assert.equal(await dialog.getByLabel('고등 1학년 총인원',{exact:true}).innerText(),'21');
   assert.equal(await dialog.getByLabel('인솔자 남 (명)',{exact:true}).inputValue(),'2');
   if(process.env.ONWAY_QA_SCREENSHOT&&viewport.width===1440)await dialog.screenshot({path:process.env.ONWAY_QA_SCREENSHOT});
   await dialog.getByRole('button',{name:'중등 0명',exact:true}).click();
   await dialog.getByLabel('중등 1학년 남 (명)',{exact:true}).fill('4');
   await dialog.getByRole('button',{name:'고등 21명',exact:true}).click();
   assert.equal(await dialog.getByLabel('고등 1학년 남 (명)',{exact:true}).inputValue(),'12');
   await dialog.getByRole('button',{name:'고등 1학년 아래에 행 추가',exact:true}).click();
   assert.equal(await dialog.getByLabel('고등 2학년 남 (명)',{exact:true}).count(),1);
   await dialog.getByRole('button',{name:'고등 2학년 행 삭제',exact:true}).click();
   assert.equal(await dialog.locator('.youth-count-editor tbody tr').count(),1);
   await dialog.getByRole('button',{name:'성인 0명',exact:true}).click();
   assert.equal(await dialog.locator('.youth-count-editor tbody tr').count(),1);
   await dialog.getByRole('button',{name:'성인 학년 구분 없음 행 삭제',exact:true}).click();
   await dialog.getByRole('button',{name:'성인 0명',exact:true}).click();
   assert.equal(await dialog.locator('.youth-count-editor tbody tr').count(),1);
   await dialog.getByRole('button',{name:'단체 등록하기',exact:true}).click();
   await page.waitForFunction(()=>!document.querySelector('dialog.registration-dialog[open]'));
   await page.reload();
   const group=await page.evaluate(()=>{
    for(const key of Object.keys(localStorage)){try{const data=JSON.parse(localStorage.getItem(key));const g=data?.groups?.find(g=>g.state?.organization?.name==='효천');if(g)return g}catch{}}
   });
   assert.ok(group,'registration survives reload');
   assert.equal(group.state.counts.youth,25);
   assert.equal(group.state.counts.leaders,2);
   assert.deepEqual(group.state.counts.youthDetails.rows.map(r=>[r.level,r.grade,r.male,r.female]),[['high','1',12,9],['middle','1',4,0]]);
   const readGroup=()=>page.evaluate(id=>JSON.parse(localStorage.getItem('onway-workspace-v2')).groups.find(g=>g.id===id),group.id);
   for(const save of [false,true]){
    if(!await page.locator('details.demo-toolbar').evaluate(el=>el.open))await page.locator('details.demo-toolbar > summary').click();
    await page.getByRole('button',{name:'관리자 화면',exact:true}).click();
    await page.getByRole('button',{name:'단체 정보 수정',exact:true}).click();
    const edit=page.getByRole('dialog',{name:'단체 정보 수정',exact:true});
    assert.equal(await edit.getByRole('region',{name:'현재 출발지',exact:true}).count(),1);assert.equal(await edit.locator('.place-results').count(),0);await edit.getByRole('button',{name:'출발지 변경',exact:true}).click();await edit.getByLabel('단체명',{exact:true}).fill('새학교');
    await edit.getByRole('button',{name:/새학교중학교.*이 주소로 출발지 변경/}).click();
    assert.equal(await edit.getByLabel('중등 1학년 남 (명)',{exact:true}).inputValue(),'4');
    assert.match(await edit.locator('.participant-level-tabs [aria-pressed="true"]').innerText(),/^중등/);
    assert.equal((await readGroup()).state.trip.origin,'효천고등학교','selection is only a draft');
    if(process.env.ONWAY_QA_SCREENSHOT&&viewport.width===1440&&save)await edit.screenshot({path:path.join(path.dirname(process.env.ONWAY_QA_SCREENSHOT),'수정화면-주소검색확인.png')});
    await edit.getByRole('button',{name:save?'수정 저장':'단체 정보 창 닫기',exact:true}).click();
    await page.reload();
    assert.equal((await readGroup()).state.trip.origin,save?'새학교중학교':'효천고등학교');
   }
   const edited=await readGroup();
   assert.deepEqual(edited.state.counts,group.state.counts);
   assert.equal(edited.state.waypoints.find(p=>p.id==='start').place.id,'qa-middle');
   if(!await page.locator('details.demo-toolbar').evaluate(el=>el.open))await page.locator('details.demo-toolbar > summary').click();
    await page.getByRole('button',{name:'관리자 화면',exact:true}).click();
    await page.getByRole('button',{name:'단체 정보 수정',exact:true}).click();
   const rename=page.getByRole('dialog',{name:'단체 정보 수정',exact:true});
   await rename.getByLabel('단체명',{exact:true}).fill('이름만 변경');
   await rename.getByRole('button',{name:'수정 저장',exact:true}).click();
   await page.reload();
   assert.equal((await readGroup()).state.trip.origin,'새학교중학교','unselected search must preserve saved address');
   console.log(`PASS ${viewport.width}px: school selection, automatic row, totals, preserved counts, add/delete, save/reload, empty-row cleanup`);
   console.log(`PASS ${viewport.width}px: edit address search, school level, cancel, save/reload, counts retained, name-only edit preserves address`);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
