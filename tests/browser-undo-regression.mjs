import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createGroup,today,WORKSPACE_KEY} from '../src/workspace.ts';
import {checkpointService,confirmCenterArrival} from '../src/services.ts';
import {toggleAdminCheckpointCheck} from '../src/adminAcknowledgment.ts';
const {chromium}=createRequire(import.meta.url)(process.env.ONWAY_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Seoul'});page.setDefaultTimeout(10000);
 await page.route('**/api/**',r=>r.fulfill({status:404,json:{}}));
 const g=createGroup({name:'고흥청소년문화의집',travelDate:today(),origin:'고흥청소년문화의집',youth:3,leaders:2,ic:false,bridge:true});
 g.state=checkpointService.save(g.state,'start');g.state=toggleAdminCheckpointCheck(g.state,'bridge');g.state=confirmCenterArrival(g.state);
 await page.goto('http://127.0.0.1:4186/');await page.evaluate(({key,g})=>localStorage.setItem(key,JSON.stringify({version:2,view:'guide',activeGroupId:g.id,groups:[g]})),{key:WORKSPACE_KEY,g});await page.reload();
 const action=page.locator('.action-card');await action.waitFor();
 await action.getByRole('button',{name:/기록 되돌리기/}).click();
 await action.getByRole('button',{name:'출발했어요',exact:true}).click();
 await action.getByRole('heading',{name:'나로1대교',exact:true}).waitFor();
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).groups[0].state.trip.status==='이동 중',WORKSPACE_KEY);
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).groups[0].state,WORKSPACE_KEY);
 assert.equal((await state()).trip.status,'이동 중');assert.equal((await state()).adminCheckpointChecks.length,0);
 assert((await state()).reports.filter(r=>r.waypointId==='arrival').every(r=>r.status==='cancelled'));
 await page.reload();await action.getByRole('heading',{name:'나로1대교',exact:true}).waitFor();
 await action.getByRole('button',{name:/기록 되돌리기/}).waitFor();
 await action.getByRole('button',{name:/기록 되돌리기/}).click();await action.getByRole('button',{name:'출발했어요',exact:true}).click();
 await action.getByRole('button',{name:'나로1대교 통과했어요',exact:true}).click();
 await action.getByText('마지막 확인 지점까지 기록했어요.',{exact:false}).waitFor();
 assert.equal((await state()).trip.status,'이동 중');
 await action.getByRole('button',{name:/기록 되돌리기/}).click();await action.getByRole('heading',{name:'나로1대교',exact:true}).waitFor();
 if(process.env.ONWAY_QA_OUTPUT)await action.screenshot({path:process.env.ONWAY_QA_OUTPUT+'/undo-bridge-fixed.png'});
 console.log('PASS arrived → undo → departure → bridge, admin confirmation cleared, undo survives reload, final checkpoint does not imply arrival');
}finally{await browser.close()}

