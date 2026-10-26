// Offline integration checks against the production build in a fresh profile.
const {chromium}=require(process.env.ONWAY_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const dist=path.resolve(__dirname,'../dist');
async function context(browser,mode){
 const ctx=await browser.newContext();
 if(mode==='missing')await ctx.addInitScript(()=>Object.defineProperty(navigator,'locks',{value:undefined,configurable:true}));
 if(mode==='hanging')await ctx.addInitScript(()=>Object.defineProperty(navigator,'locks',{value:{request:()=>new Promise(()=>{})},configurable:true}));
 await ctx.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1')return route.abort();
  if(url.pathname==='/api/maps/search')return route.fulfill({json:{items:[]}});
  if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:'Offline QA'}});
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg'};
  const file=path.join(dist,url.pathname==='/'?'index.html':url.pathname);
  return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
 });return ctx;
}
async function page(ctx){const p=await ctx.newPage();await p.goto('http://127.0.0.1/');return p}
async function register(p,name){
 await p.getByRole('button',{name:'단체 등록',exact:true}).click();
 const dialog=p.getByRole('dialog',{name:'단체 등록',exact:true});
 await dialog.getByLabel('단체명',{exact:true}).fill(name);return dialog;
}
const saved=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('onway-workspace-v2')));
async function settled(p){await p.waitForFunction(()=>!document.querySelector('.workspace-edit-scope')?.disabled||!!document.querySelector('.save-failure-banner'))}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',timeout:20000});
 try{
  for(const mode of ['missing','hanging']){
   const ctx=await context(browser,mode),p=await page(ctx);
   const form=await register(p,'잠금없이 입력 '+mode);
   await form.getByRole('button',{name:'단체 등록하기',exact:true}).click();await settled(p);
   assert.ok((await saved(p)).groups.some(g=>g.state.organization.name==='잠금없이 입력 '+mode));
   await p.reload();assert.ok((await saved(p)).groups.some(g=>g.state.organization.name==='잠금없이 입력 '+mode));
   assert.equal(await p.getByText('읽기 전용',{exact:false}).count(),0);
   await ctx.close();console.log('PASS Web Locks '+mode+': editing, save and reload');
  }
  {
   const ctx=await context(browser),holder=await page(ctx);
   await holder.evaluate(()=>{navigator.locks.request('onway-workspace-writer-v2',()=>new Promise(()=>{}))});
   const p=await page(ctx),form=await register(p,'이전 잠금 복구');
   await form.getByRole('button',{name:'단체 등록하기',exact:true}).click();await settled(p);
   assert.ok((await saved(p)).groups.some(g=>g.state.organization.name==='이전 잠금 복구'));
   await ctx.close();console.log('PASS old lifetime lock does not block the new editor');
  }
  {
   const ctx=await context(browser,'missing'),a=await page(ctx),b=await page(ctx);
   const fa=await register(a,'첫 화면 저장'),fb=await register(b,'두 번째 입력');
   await Promise.all([fa.getByRole('button',{name:'단체 등록하기',exact:true}).click(),fb.getByRole('button',{name:'단체 등록하기',exact:true}).click()]);
   await Promise.all([settled(a),settled(b)]);
   const data=await saved(a),names=data.groups.map(g=>g.state.organization.name);
   assert.equal(names.filter(n=>['첫 화면 저장','두 번째 입력'].includes(n)).length,1,'only one conflicting save may win');
   const loser=names.includes('첫 화면 저장')?b:a,winner=loser===a?b:a;
   await loser.getByText('다른 화면에서 자료가 변경됐어요. 입력 내용은 보관했습니다.',{exact:false}).waitFor();
   assert.equal(await loser.getByRole('button',{name:'미저장 내용 백업',exact:true}).count(),1);
   await loser.getByRole('button',{name:'다시 저장',exact:true}).click();
   await loser.getByText('다른 화면에서 자료가 변경됐어요. 입력 내용은 보관했습니다.',{exact:false}).waitFor();
   assert.deepEqual(await saved(winner),data,'retry cannot overwrite the winning data');
   loser.once('dialog',dialog=>dialog.accept());
   await loser.getByRole('button',{name:'저장된 자료 다시 불러오기',exact:true}).click();
   await settled(loser);assert.equal(await loser.locator('.workspace-edit-scope').isDisabled(),false);
   assert.deepEqual(await saved(loser),data);
   await ctx.close();console.log('PASS simultaneous saves: one winner, conflict draft kept, retry protected, explicit reload recovers editing');
  }
  {
   const ctx=await context(browser,'missing'),p=await page(ctx);
   await p.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='onway-workspace-v2')throw new DOMException('quota','QuotaExceededError');return window.originalSetItem.call(this,k,v)}});
   const form=await register(p,'저장 실패 복구');await form.getByRole('button',{name:'단체 등록하기',exact:true}).click();
   await p.getByRole('button',{name:'미저장 내용 백업',exact:true}).waitFor();assert.equal(await saved(p),null);
   await p.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem});
   await p.getByRole('button',{name:'다시 저장',exact:true}).click();await settled(p);
   assert.ok((await saved(p)).groups.some(g=>g.state.organization.name==='저장 실패 복구'));
   await ctx.close();console.log('PASS storage failure preserves draft and retry saves it');
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
