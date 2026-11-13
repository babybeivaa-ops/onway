import test from 'node:test';
import assert from 'node:assert/strict';
import {adminNotices,newAdminNotices} from '../src/adminNotificationModel.ts';
import type {DemoGroup} from '../src/workspace';
const group=(id:string):DemoGroup=>({id,state:{organization:{name:id},changes:[],centerMessages:[],reports:[]}} as unknown as DemoGroup);
const change=(id:string,actor?:'admin'|'guide',reason='변경')=>({id,actor,reason,at:'2026-10-20T01:00:00Z',before:{youth:10,leaders:1},after:{youth:9,leaders:1}});
test('guide changes and messages appear, admin edits and legacy admin edits do not',()=>{
 const g=group('A');
 g.state.changes=[change('guide','guide'),change('admin','admin'),change('legacy-admin',undefined,'관리자 등록 정보 수정'),change('legacy-guide')];
 g.state.centerMessages=[{id:'message',at:'2026-10-20T02:00:00Z',text:'도착 늦어요'}];
 const events=adminNotices([g]);
 assert.equal(events.length,3);
 assert.equal(events[0].kind,'message');
 assert.ok(events.some(e=>e.id==='A:counts:guide'&&e.text.includes('10 → 9')));
});
test('initial history is quiet, repeated snapshots and acknowledgments do not duplicate popups',()=>{
 const g=group('A');g.state.changes=[change('one','guide')];
 const initial=adminNotices([g]),seen=new Set(initial.map(e=>e.id));
 assert.deepEqual(newAdminNotices(initial,null),[]);
 assert.deepEqual(newAdminNotices(initial,seen),[]);
 g.state.centerMessages=[{id:'new',at:'2026-10-20T02:00:00Z',text:'확인 요청'}];
 const next=adminNotices([g]);
 assert.equal(newAdminNotices(next,seen).length,1);
 g.state.centerMessages[0].acknowledgedAt='2026-10-20T03:00:00Z';
 assert.deepEqual(newAdminNotices(adminNotices([g]),seen),[]);
});
test('same record ids across groups remain separate, removed groups leave no stale notices',()=>{
 const a=group('A'),b=group('B');
 a.state.changes=[change('same','guide')];b.state.changes=[change('same','guide')];
 const events=adminNotices([a,b]);
 assert.equal(new Set(events.map(e=>e.id)).size,2);
 assert.equal(adminNotices([b]).length,1);
 assert.deepEqual(adminNotices([]),[]);
});

test('guide arrival entry and changes notify once; administrator and legacy entries stay quiet',()=>{
 const g=group('A');
 const base={date:'2026-10-30',actor:'guide' as const,at:'2026-10-30T04:00:00Z'};
 g.state.arrivalChanges=[{...base,id:'first',after:'14:30'}];
 const first=adminNotices([g]);
 assert.equal(first[0].kind,'arrival');
 assert.match(first[0].text,/14:30 입력/);
 assert.equal(newAdminNotices(first,new Set()).length,1);
 const seen=new Set(first.map(e=>e.id));
 assert.equal(newAdminNotices(first,seen).length,0);
 g.state.arrivalChanges.push({...base,id:'changed',before:'14:30',after:'15:00'}, {...base,id:'admin',actor:'admin',after:'16:00'}, {...base,id:'legacy',legacy:true,after:'13:00'});
 const fresh=newAdminNotices(adminNotices([g]),seen);
 assert.equal(fresh.length,1);
 assert.match(fresh[0].text,/14:30 → 15:00 변경/);
});
