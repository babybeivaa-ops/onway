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
  if(url.pathname==='/api/maps/search')return route.fulfill({json:{items:[url.searchParams.get('q').startsWith('새학교')?{id:'qa-middle',provider:'kakao',name:'새학교중학교',address:'변경할 테스트 주소',lat:35.1,lng:127.7,category:'교육 > 학교 > 중학교'}:{id:'qa-high',provider:'kakao',name:'햇살지역아동센터',address:'테스트용 주소',lat:34.9,lng:127.5,category:'사회,공공기관 > 아동복지시설'}]}});
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
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{for(const viewport of [{width:1360,height:1000},{width:390,height:844}]){const {page,dialog}=await prepare(browser,viewport);await dialog.getByLabel('단체명',{exact:true}).fill('순천 햇살지역');await dialog.getByRole('button',{name:/햇살지역아동센터.*이 주소로 출발지 등록/}).click();await dialog.locator('.youth-count-editor input').first().fill('8');await dialog.getByRole('button',{name:'단체 등록하기',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'));await page.waitForFunction(()=>Object.keys(localStorage).some(k=>{try{return JSON.parse(localStorage[k])?.groups?.some(g=>g.state.organization.name==='순천 햇살지역아동센터')}catch{return false}}));await page.reload();await page.getByRole('heading',{name:'순천 햇살지역아동센터',exact:true}).waitFor();assert.equal(await page.getByText('순천 햇살지역초',{exact:true}).count(),0);if(!await page.locator('details.demo-toolbar').evaluate(e=>e.open))await page.locator('details.demo-toolbar > summary').click();await page.getByRole('button',{name:'관리자 화면',exact:true}).click();await page.getByRole('button',{name:'단체 정보 수정',exact:true}).click();const edit=page.getByRole('dialog',{name:'단체 정보 수정',exact:true});assert.equal(await edit.getByLabel('단체명',{exact:true}).inputValue(),'순천 햇살지역아동센터');await edit.getByRole('button',{name:'출발지 변경',exact:true}).click();await edit.getByLabel('단체명',{exact:true}).fill('순천 햇살지역');await edit.getByRole('button',{name:/햇살지역아동센터.*이 주소로 출발지 변경/}).click();await edit.getByRole('button',{name:'수정 저장',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'));await page.getByRole('tab',{name:/순천 햇살지역아동센터/}).waitFor();console.log('PASS institution name registration, reload, guide display, edit and admin tab',viewport.width);await page.close()}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});