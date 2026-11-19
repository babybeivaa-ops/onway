import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createSharingHandler} from '../public-api/sharing.mjs';
import {createGroup} from '../src/workspace.ts';
const master='test-master-token-01234567890123456789',code='Test-Center-Code-2026';
function fixture(){let clock=Date.now();let db:any={revision:0,workspace:{version:2,view:'admin',activeGroupId:'',groups:[]},links:{}};const h=createSharingHandler({adminToken:master,now:()=>clock,store:{async load(){return structuredClone(db)},async save(next:any,revision:number){assert.equal(revision,db.revision);db=structuredClone(next)}}});return {h,data:()=>db,advance:()=>clock+=16*60_000};}
async function request(h:any,endpoint:string,token='',value:any={}){let status=0,body:any;const req:any=Readable.from([JSON.stringify(value)]);req.method='POST';req.headers={authorization:'Bearer '+token,host:'localhost'};await h(req,{writeHead(s:number){status=s},end(b:string){body=JSON.parse(b)}},new URL('/api/shared/'+endpoint,'http://localhost'));return {status,body};}
test('owner setup, hashed code login, group link issuance and rotation',async()=>{
 const {h,data}=fixture();assert.equal((await request(h,'admin-code','',{code})).status,401);
 const setup=(await request(h,'admin-setup-link',master)).body.token;
 assert.equal((await request(h,'publish',setup,{group:{}})).status,403);
 assert.equal((await request(h,'admin-code',setup,{code})).status,200);
 assert.ok(!JSON.stringify(data()).includes(code));
 assert.equal((await request(h,'admin-code',setup,{code})).status,401);
 const login=await request(h,'admin-login','',{code});assert.equal(login.status,200);
 const group=createGroup({name:'시험학교',travelDate:'2026-11-19',origin:'학교',youth:10,leaders:2,ic:true,bridge:true});
 assert.equal((await request(h,'publish',login.body.token,{group})).status,200);
 const link=await request(h,'link',login.body.token,{groupId:group.id});assert.equal(link.status,200);
 assert.equal((await request(h,'admin-code',link.body.token,{code:'Other-Code-2026'})).status,403);
 assert.equal((await request(h,'admin-code',login.body.token,{code:'Other-Code-2026'})).status,200);
 assert.equal((await request(h,'link',login.body.token,{groupId:group.id})).status,401);
 assert.equal((await request(h,'admin-login','',{code})).status,401);
 assert.equal((await request(h,'admin-login','',{code:'Other-Code-2026'})).status,200);
 assert.equal(Object.values(data().links).filter((v:any)=>v.groupId===group.id).length,1);
});
test('failed login is limited and setup links expire',async()=>{
 const {h,advance}=fixture();const setup=(await request(h,'admin-setup-link',master)).body.token;
 await request(h,'admin-code',master,{code});for(let n=0;n<5;n++)assert.equal((await request(h,'admin-login','',{code:'wrong'})).status,401);
 assert.equal((await request(h,'admin-login','',{code})).status,429);advance();
 assert.equal((await request(h,'admin-login','',{code})).status,200);
 assert.equal((await request(h,'admin-code',setup,{code})).status,401);
});
