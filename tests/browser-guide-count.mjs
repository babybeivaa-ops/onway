import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {createGroup,today,WORKSPACE_KEY} from '../src/workspace.ts';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/COMTREE/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd();const g=createGroup({name:'테스트초등학교',travelDate:today(),origin:'테스트초등학교',youth:105,leaders:10,ic:true,bridge:true,youthDetails:{rows:[{id:'grade6',level:'elementary',grade:'6',male:53,female:52}],unclassified:0},leaderDetails:{male:5,female:5,unclassified:0}});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:600},{width:1440,height:1000},{width:390,height:400}]){
 const page=await browser.newPage({viewport});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({status:503,json:{}});const f=path.join(root,'dist',u.pathname==='/'?'index.html':u.pathname);return r.fulfill({path:f,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg'})[path.extname(f)]||'application/octet-stream'})});
 await page.goto('http://127.0.0.1/');await page.evaluate(({g,key})=>localStorage.setItem(key,JSON.stringify({version:2,view:'guide',activeGroupId:g.id,groups:[g]})),{g,key:WORKSPACE_KEY});await page.reload();
 await page.getByRole('button',{name:'인원 변경',exact:true}).click();const d=page.getByRole('dialog',{name:'인원 변경',exact:true});await d.waitFor();
 const metrics=await d.evaluate(el=>{const r=el.getBoundingClientRect(),b=el.querySelector('form>.primary').getBoundingClientRect(),s=el.querySelector('.guide-count-scroll');return {x:r.x,y:r.y,width:r.width,bottom:r.bottom,saveBottom:b.bottom,saveTop:b.top,overflow:s.scrollWidth-s.clientWidth,tables:[...el.querySelectorAll('.count-entry-scroll')].map(e=>e.scrollWidth-e.clientWidth)}});
 assert(metrics.x>=0&&metrics.y>=0&&metrics.bottom<=viewport.height+1);assert(metrics.saveBottom<=metrics.bottom&&metrics.saveTop>=metrics.y);assert(metrics.overflow<=1);assert(metrics.tables.every(n=>n<=1));
 await d.getByLabel('초등 6학년 남 (명)',{exact:true}).fill('54');
 if(viewport.width===390&&viewport.height===844)await page.screenshot({path:path.resolve('..','인솔교사-인원변경-모바일.png')});
 await d.getByRole('button',{name:'변경 저장하기'}).click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).groups[0].state.counts.youth===106,WORKSPACE_KEY);
 console.log('PASS',viewport,metrics);await page.close();
}}finally{await browser.close()}
