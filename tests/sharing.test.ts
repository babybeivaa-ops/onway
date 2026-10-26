import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {createSharingHandler} from '../public-api/sharing.mjs';
import {createGroup} from '../src/workspace.ts';
import {backupText,parseBackup,mergeBackup,recordsCsv} from '../src/backup.ts';
import {durationLabel} from '../src/duration.ts';
const admin='test-admin-code-012345678901234567890';
test('guide center messages reach admin and cannot overwrite or remove earlier messages',async t=>{
 const {handler:h}=fixture(t,true);const group=makeGroup();
 await request(h,'publish',admin,'POST',{group});
 const token=(await request(h,'link',admin,'POST',{groupId:group.id})).body.token;
 let read=(await request(h,'workspace',token)).body;
 const message={id:'message-one',text:'도착이 10분 늦어집니다.',at:new Date().toISOString()};
 read.workspace.groups[0].state.centerMessages=[message];
 const saved=await request(h,'workspace',token,'PUT',{workspace:read.workspace,revision:read.revision});
 assert.equal(saved.status,200);
 assert.deepEqual((await request(h,'workspace')).body.workspace.groups[0].state.centerMessages,[message]);
 read=(await request(h,'workspace',token)).body;
 const tampered=structuredClone(read.workspace);tampered.groups[0].state.centerMessages[0].text='덮어쓰기';
 assert.equal((await request(h,'workspace',token,'PUT',{workspace:tampered,revision:read.revision})).status,403);
 const removed=structuredClone(read.workspace);removed.groups[0].state.centerMessages=[];
 assert.equal((await request(h,'workspace',token,'PUT',{workspace:removed,revision:read.revision})).status,403);
 const invalid=structuredClone(read.workspace);invalid.groups[0].state.centerMessages.push({...message,id:'two',text:' '});
 assert.equal((await request(h,'workspace',token,'PUT',{workspace:invalid,revision:read.revision})).status,400);
 read.workspace.groups[0].state.centerMessages.push({...message,id:'message-two',text:'정문에 도착했습니다.'});
 assert.equal((await request(h,'workspace',token,'PUT',{workspace:read.workspace,revision:read.revision})).status,200);
 // Only the center can confirm receipt, including on newly added messages.
 read=(await request(h,'workspace',token)).body;
 const fake=structuredClone(read.workspace);fake.groups[0].state.centerMessages[0].acknowledgedAt=message.at;
 assert.equal((await request(h,'workspace',token,'PUT',{workspace:fake,revision:read.revision})).status,403);
 const fakeNew=structuredClone(read.workspace);fakeNew.groups[0].state.centerMessages.push({...message,id:'fake-confirmed',acknowledgedAt:message.at});
 assert.equal((await request(h,'workspace',token,'PUT',{workspace:fakeNew,revision:read.revision})).status,403);
 const center=(await request(h,'workspace')).body;
 center.workspace.groups[0].state.centerMessages[0].acknowledgedAt=message.at;
 assert.equal((await request(h,'workspace',admin,'PUT',{workspace:center.workspace,revision:center.revision})).status,200);
 read=(await request(h,'workspace',token)).body;
 assert.equal(read.workspace.groups[0].state.centerMessages[0].acknowledgedAt,message.at);
 const unconfirmed=structuredClone(read.workspace);delete unconfirmed.groups[0].state.centerMessages[0].acknowledgedAt;
 assert.equal((await request(h,'workspace',token,'PUT',{workspace:unconfirmed,revision:read.revision})).status,403);
 read.workspace.groups[0].state.centerMessages.push({...message,id:'after-confirmation',text:'추가 전달사항'});
 assert.equal((await request(h,'workspace',token,'PUT',{workspace:read.workspace,revision:read.revision})).status,200);
});
const makeGroup=()=>createGroup({name:'공유 학교',travelDate:'2099-01-01',origin:'학교',youth:30,leaders:3,ic:true,bridge:true});
function fixture(t,memory=false){if(memory){let db={revision:0,workspace:{version:2,view:'admin',activeGroupId:'',groups:[]},links:{}};const store={async load(){return structuredClone(db)},async save(next,revision){assert.equal(revision,db.revision);db=structuredClone(next)}};return {handler:createSharingHandler({adminToken:admin,store})};}fs.mkdirSync(path.resolve('work'),{recursive:true});const dir=fs.mkdtempSync(path.resolve('work/onway-sharing-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return {dir,handler:createSharingHandler({directory:dir,adminToken:admin})};}
async function request(h,endpoint,token=admin,method='GET',value,origin){let status,body;const req=Readable.from(value?[JSON.stringify(value)]:[]);req.method=method;req.headers={authorization:'Bearer '+token,host:'localhost',...(origin?{origin}:{})};await h(req,{writeHead(s){status=s},end(b){body=JSON.parse(b)}},new URL('/api/shared/'+endpoint,'http://localhost'));return {status,body};}
test('duration uses rounded minutes and hours without ETA countdown',()=>{assert.equal(durationLabel(3919),'1시간 6분');assert.equal(durationLabel(60),'1분');assert.equal(durationLabel(3600),'1시간');assert.equal(durationLabel(NaN),'')});
test('backup roundtrip validates corruption, merges without overwriting and CSV neutralizes formulas',()=>{const g=makeGroup();const w={version:2,view:'admin',activeGroupId:g.id,groups:[g]};assert.deepEqual(parseBackup(backupText(w)),w);assert.throws(()=>parseBackup('{bad'));const bad=structuredClone(w);bad.groups[0].state.counts.youth=-1;assert.throws(()=>parseBackup(backupText(bad)));const merged=mergeBackup(w,w);assert.equal(merged.groups.length,2);assert.deepEqual(merged.groups[0],g);assert.notEqual(merged.groups[1].id,g.id);g.state.organization.name='=HYPERLINK("example")';assert.ok(recordsCsv(w).includes("'="));assert.ok(recordsCsv(w).startsWith('\uFEFF'));});
test('shared publish persists across restart, rejects duplicates and unauthenticated access',async t=>{const {dir,handler:h}=fixture(t);assert.equal((await request(h,'workspace','wrong')).status,401);assert.equal((await request(h,'workspace',admin,'GET',undefined,'https://evil.test')).status,403);const group=makeGroup();assert.equal((await request(h,'publish',admin,'POST',{group})).status,200);assert.equal((await request(h,'publish',admin,'POST',{group})).status,409);const reloaded=createSharingHandler({directory:dir,adminToken:admin});assert.deepEqual((await request(reloaded,'workspace')).body.workspace.groups,[group]);});
test('guide link scopes reads/writes; rotation and revocation invalidate old tokens',async t=>{const {handler:h}=fixture(t,true);const a=makeGroup(),b=makeGroup();await request(h,'publish',admin,'POST',{group:a});await request(h,'publish',admin,'POST',{group:b});let link=await request(h,'link',admin,'POST',{groupId:a.id});const token=link.body.token;let read=await request(h,'workspace',token);assert.equal(read.body.role,'guide');assert.deepEqual(read.body.workspace.groups.map(g=>g.id),[a.id]);assert.equal((await request(h,'link',token,'POST',{groupId:b.id})).status,403);const other={...read.body.workspace,activeGroupId:b.id,groups:[b]};assert.equal((await request(h,'workspace',token,'PUT',{workspace:other,revision:read.body.revision})).status,403);const bad=structuredClone(read.body.workspace);bad.groups[0].travelDate='2099-02-01';assert.equal((await request(h,'workspace',token,'PUT',{workspace:bad,revision:read.body.revision})).status,403);await request(h,'link',admin,'POST',{groupId:a.id});assert.equal((await request(h,'workspace',token)).status,401);link=await request(h,'link',admin,'POST',{groupId:a.id});await request(h,'link',admin,'POST',{groupId:a.id,revoke:true});assert.equal((await request(h,'workspace',link.body.token)).status,401);});
test('guide changes shared records, stale versions cannot overwrite and backup snapshot exists',async t=>{const {handler:h,dir}=fixture(t);const group=makeGroup();await request(h,'publish',admin,'POST',{group});const token=(await request(h,'link',admin,'POST',{groupId:group.id})).body.token;const read=(await request(h,'workspace',token)).body;read.workspace.groups[0].state.confirmed=true;let saved=await request(h,'workspace',token,'PUT',{workspace:read.workspace,revision:read.revision});assert.equal(saved.status,200);assert.equal((await request(h,'workspace')).body.workspace.groups[0].state.confirmed,true);assert.equal((await request(h,'workspace',token,'PUT',{workspace:read.workspace,revision:read.revision})).status,409);assert.ok(fs.readdirSync(path.join(dir,'backups')).length);const all=(await request(h,'workspace')).body;all.workspace.groups=[];all.workspace.activeGroupId='';assert.equal((await request(h,'workspace',admin,'PUT',{workspace:all.workspace,revision:all.revision})).status,200);assert.equal((await request(h,'workspace',token)).status,401);});
test('expired guide links cannot be used',async t=>{const {dir}=fixture(t);let clock=Date.now();const h=createSharingHandler({directory:dir,adminToken:admin,now:()=>clock});const group=makeGroup();await request(h,'publish',admin,'POST',{group});const token=(await request(h,'link',admin,'POST',{groupId:group.id})).body.token;clock+=31*86400000;assert.equal((await request(h,'workspace',token)).status,401)});

test('retired viewer links cannot be created and guide links remain usable',async t=>{const {handler:h}=fixture(t,true);const group=makeGroup();await request(h,'publish',admin,'POST',{group});const token=(await request(h,'link',admin,'POST',{groupId:group.id})).body.token;assert.equal((await request(h,'link',admin,'POST',{groupId:group.id,role:'viewer'})).status,400);assert.equal((await request(h,'workspace',token)).status,200);});
import {createHash} from 'node:crypto';
test('previously issued viewer tokens are rejected without changing records',async()=>{const g=makeGroup(),token='retired-viewer-token';const db={revision:1,workspace:{version:2,view:'admin',activeGroupId:g.id,groups:[g]},links:{[createHash('sha256').update(token).digest('hex')]:{groupId:g.id,role:'viewer',expires:Date.now()+86400000}}};const h=createSharingHandler({adminToken:admin,store:{async load(){return structuredClone(db)},async save(){throw Error('unexpected write')}}});assert.equal((await request(h,'workspace',token)).status,401);assert.deepEqual((await request(h,'workspace')).body.workspace.groups,[g]);});

test('admin invitations grant workspace access but cannot issue more admin invitations',async t=>{
 const {handler:h}=fixture(t,true);const a=makeGroup(),b=makeGroup();await request(h,'publish',admin,'POST',{group:a});await request(h,'publish',admin,'POST',{group:b});
 const guide=(await request(h,'link',admin,'POST',{groupId:a.id})).body.token;
 assert.equal((await request(h,'admin-invite',guide,'POST',{})).status,403);
 const issued=await request(h,'admin-invite',admin,'POST',{});assert.equal(issued.status,200);assert.ok(!JSON.stringify(issued).includes(admin));const token=issued.body.token;
 const read=await request(h,'workspace',token);assert.equal(read.body.role,'admin');assert.equal(read.body.workspace.groups.length,2);
 assert.equal((await request(h,'admin-invite',token,'POST',{})).status,403);assert.equal((await request(h,'admin-invite',token)).status,403);
 const w=read.body.workspace;w.groups[0].state.counts.youth=29;
 assert.equal((await request(h,'workspace',token,'PUT',{workspace:w,revision:read.body.revision})).status,200);
 assert.equal((await request(h,'workspace',token)).status,200);
 assert.equal((await request(h,'admin-invite',admin,'POST',{revoke:true})).status,200);
 assert.equal((await request(h,'workspace',token)).status,401);assert.equal((await request(h,'workspace',guide)).status,200);
});
test('admin invitation survives storage reload and expires after 24 hours',async()=>{
 let clock=Date.now();let db={revision:0,workspace:{version:2,view:'admin',activeGroupId:'',groups:[]},links:{}};
 const store={async load(){return structuredClone(db)},async save(next){db=structuredClone(next)}};
 const h=createSharingHandler({adminToken:admin,store,now:()=>clock});const issued=(await request(h,'admin-invite',admin,'POST',{})).body;
 assert.equal(issued.expires,clock+86400000);assert.ok(!JSON.stringify(db).includes(issued.token));
 const reloaded=createSharingHandler({adminToken:admin,store,now:()=>clock});assert.equal((await request(reloaded,'workspace',issued.token)).status,200);
 clock+=86400000;assert.equal((await request(reloaded,'workspace',issued.token)).status,401);assert.equal((await request(reloaded,'workspace')).status,200);
});
test('admin invitation rotation invalidates previous invitation',async t=>{const {handler:h}=fixture(t,true);const first=(await request(h,'admin-invite',admin,'POST',{})).body.token;const second=(await request(h,'admin-invite',admin,'POST',{})).body.token;assert.equal((await request(h,'workspace',first)).status,401);assert.equal((await request(h,'workspace',second)).status,200)});

test('guide can update gender breakdown for own group; invalid totals are rejected',async t=>{const {handler:h}=fixture(t,true);const group=makeGroup();await request(h,'publish',admin,'POST',{group});const token=(await request(h,'link',admin,'POST',{groupId:group.id})).body.token;const read=(await request(h,'workspace',token)).body;read.workspace.groups[0].state.counts.youthDetails={rows:[{id:'a',level:'high',grade:'1',male:17,female:13}],unclassified:0};const saved=await request(h,'workspace',token,'PUT',{workspace:read.workspace,revision:read.revision});assert.equal(saved.status,200);const bad=structuredClone(saved.body.workspace);bad.groups[0].state.counts.youthDetails.rows[0].male=18;assert.equal((await request(h,'workspace',token,'PUT',{workspace:bad,revision:saved.body.revision})).status,400);const actual=(await request(h,'workspace',token)).body;assert.equal(actual.workspace.groups[0].state.counts.youthDetails.rows[0].male,17)});

test('guide count confirmation timestamp reaches admin and survives reload',async t=>{const {handler:h}=fixture(t,true);const group=makeGroup();await request(h,'publish',admin,'POST',{group});const token=(await request(h,'link',admin,'POST',{groupId:group.id})).body.token;const read=(await request(h,'workspace',token)).body;const at=new Date().toISOString();Object.assign(read.workspace.groups[0].state,{confirmed:true,countsConfirmedAt:at});assert.equal((await request(h,'workspace',token,'PUT',{workspace:read.workspace,revision:read.revision})).status,200);assert.equal((await request(h,'workspace',admin)).body.workspace.groups[0].state.countsConfirmedAt,at)});

test('planned arrival from guide reaches admin and allows admin correction',async t=>{const {handler:h}=fixture(t,true);const group=makeGroup();await request(h,'publish',admin,'POST',{group});const token=(await request(h,'link',admin,'POST',{groupId:group.id})).body.token;let read=(await request(h,'workspace',token)).body;read.workspace.groups[0].state.plannedArrival={date:group.travelDate,time:'14:30',actor:'guide',updatedAt:new Date().toISOString()};assert.equal((await request(h,'workspace',token,'PUT',{workspace:read.workspace,revision:read.revision})).status,200);read=(await request(h,'workspace',admin)).body;assert.equal(read.workspace.groups[0].state.plannedArrival.time,'14:30');read.workspace.groups[0].state.plannedArrival.time='15:00';read.workspace.groups[0].state.plannedArrival.actor='admin';assert.equal((await request(h,'workspace',admin,'PUT',{workspace:read.workspace,revision:read.revision})).status,200);assert.equal((await request(h,'workspace',token)).body.workspace.groups[0].state.plannedArrival.time,'15:00');});
