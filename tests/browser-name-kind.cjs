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
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{const {page,dialog}=await prepare(browser,{width:390,height:844});await dialog.getByLabel('단체명',{exact:true}).fill('여명학교');const kind=dialog.getByRole('combobox',{name:'학교·기관 구분',exact:true});for(const [value,label] of [['elementary','여명초'],['middle','여명중'],['high','여명고'],['organization','여명학교']]){await kind.selectOption(value);await dialog.locator('.group-name-kind strong').filter({hasText:label}).waitFor()}await kind.selectOption('middle');await dialog.getByRole('button',{name:'단체 등록하기',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'));await page.waitForFunction(()=>Object.keys(localStorage).some(k=>{try{return JSON.parse(localStorage[k])?.groups?.some(g=>g.state.organization.name==='여명학교'&&g.state.organization.nameKind==='middle')}catch{return false}}));await page.reload();await page.getByRole('heading',{name:'여명중',exact:true}).waitFor();if(!await page.locator('details.demo-toolbar').evaluate(e=>e.open))await page.locator('details.demo-toolbar > summary').click();await page.getByRole('button',{name:'관리자 화면',exact:true}).click();await page.getByRole('button',{name:'단체 정보 수정',exact:true}).click();const edit=page.getByRole('dialog',{name:'단체 정보 수정',exact:true});assert.equal(await edit.getByRole('combobox',{name:'학교·기관 구분',exact:true}).inputValue(),'middle');await edit.getByLabel('단체명',{exact:true}).fill('예수의 집');await edit.getByRole('combobox',{name:'학교·기관 구분',exact:true}).selectOption('organization');await edit.getByRole('button',{name:'수정 저장',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'));await page.getByRole('tab',{name:/예수의 집/}).waitFor();console.log('PASS manual school type, preview, persistence, guide/admin names, organization override')}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});