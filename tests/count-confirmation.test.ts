import {guideEditedCurrentCounts} from '../src/participantConfirmation.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {tripService} from '../src/services.ts';
import {createGroup,saveWorkspace,loadWorkspace} from '../src/workspace.ts';
import {adminNotices,newAdminNotices} from '../src/adminNotificationModel.ts';
import {validGroup} from '../public-api/workspace-schema.mjs';
const make=()=>createGroup({name:'동명중학교',origin:'동명중학교',travelDate:'2099-01-01',youth:30,leaders:2,ic:true,bridge:true});
test('confirmation produces a distinct notice without modifying counts or departure',()=>{const g=make(),before=structuredClone(g.state);g.state=tripService.confirm(g.state);assert.deepEqual(g.state.counts,before.counts);assert.deepEqual(g.state.reports,before.reports);assert.deepEqual(g.state.changes,before.changes);assert.equal(g.state.trip.status,before.trip.status);assert(validGroup(g));const events=adminNotices([g]);assert.equal(events.length,1);assert.equal(events[0].text,'동명중학교가 인원 변동없음을 확인하였습니다.');assert.equal(events[0].kind,'confirmation');assert.equal(newAdminNotices(events,new Set()).length,1);assert.equal(newAdminNotices(events,new Set([events[0].id])).length,0);assert.equal(newAdminNotices(events,null).length,0);assert.equal(tripService.confirm(g.state),g.state)});
test('legacy confirmed records do not invent new confirmation alerts; cancellation removes current notice',()=>{const g=make();g.state.confirmed=true;assert.equal(adminNotices([g]).length,0);g.state.confirmed=false;g.state=tripService.confirm(g.state);g.state={...g.state,confirmed:false,countsConfirmedAt:undefined};assert.equal(adminNotices([g]).length,0)});
test('confirmation survives save/reload and invalid timestamps are rejected',()=>{const g=make();g.state=tripService.confirm(g.state);const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};saveWorkspace(storage,{version:2,view:'admin',activeGroupId:g.id,groups:[g]});assert.equal(adminNotices(loadWorkspace(storage).groups)[0].at,g.state.countsConfirmedAt);g.state.countsConfirmedAt='bad';assert.equal(validGroup(g),false)});


test('guide edits remain pending until checked and produce a corrected-count confirmation',()=>{
 const g=make();g.state=tripService.confirm(g.state);
 assert.equal(guideEditedCurrentCounts(g.state),false);
 assert.equal(tripService.changeCounts(g.state,g.state.counts,'','guide'),g.state);
 g.state=tripService.changeCounts(g.state,{youth:31,leaders:2},'추가 인원','guide');
 assert.equal(g.state.confirmed,false);assert.equal(guideEditedCurrentCounts(g.state),true);
 assert.equal(adminNotices([g]).filter(e=>e.kind==='confirmation').length,0);
 g.state=tripService.confirm(g.state);
 const notice=adminNotices([g]).find(e=>e.kind==='confirmation');
 assert.equal(notice?.countsEdited,true);assert.equal(notice?.text,'동명중학교가 수정한 인원을 확인하였습니다.');
 assert.equal(guideEditedCurrentCounts(JSON.parse(JSON.stringify(g.state))),true);
});
test('latest admin changes and unmatched current counts are not labeled as guide corrections',()=>{
 const g=make();g.state=tripService.changeCounts(g.state,{youth:31,leaders:2},'','guide');
 const older=g.state.changes[0];older.at='2026-10-25T01:00:00.000Z';
 assert.equal(guideEditedCurrentCounts({...g.state,counts:{youth:40,leaders:2}}),false);
 g.state=tripService.changeCounts(g.state,{youth:32,leaders:2},'관리자 등록 정보 수정','admin');
 assert.equal(guideEditedCurrentCounts(g.state),false);
 const legacy={...older,actor:undefined};
 assert.equal(guideEditedCurrentCounts({counts:legacy.after,changes:[legacy]}),true);
 assert.equal(guideEditedCurrentCounts({counts:legacy.after,changes:[{...legacy,reason:'관리자 등록 정보 수정'}]}),false);
});
