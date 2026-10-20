import test from 'node:test';
import assert from 'node:assert/strict';
import {countChangeDetails,guideCountChanges} from '../src/countChangeDetails.ts';
import type {ParticipantCount,ParticipantChange} from '../src/types.ts';
const original:ParticipantCount={youth:165,leaders:14,youthDetails:{unclassified:0,rows:[{id:'old',level:'elementary',grade:'6',male:83,female:82}]},leaderDetails:{male:7,female:7,unclassified:0}};
test('shows exact changed grade/gender counts and ignores regenerated row ids',()=>{
 const after=structuredClone(original);
 after.youth=163;after.youthDetails!.rows[0].male=81;after.youthDetails!.rows[0].id='new';
 assert.deepEqual(countChangeDetails(original,after),[{label:'청소년 합계',before:165,after:163},{label:'초등 6학년 남',before:83,after:81}]);
 assert.equal(original.youth,165);
});
test('captures gender-only changes, removed grades and unclassified counts',()=>{
 const after=structuredClone(original);
 after.leaderDetails={male:6,female:8,unclassified:0};
 assert.deepEqual(countChangeDetails(original,after),[{label:'인솔교사 남',before:7,after:6},{label:'인솔교사 여',before:7,after:8}]);
 const legacy={youth:165,leaders:14};
 assert.ok(countChangeDetails(original,legacy).some(d=>d.label==='청소년 미분류'&&d.after===165));
 assert.ok(countChangeDetails(original,legacy).some(d=>d.label==='초등 6학년 남'&&d.after===0));
});
test('filters administrator changes and orders guide records without mutating input',()=>{
 const record=(id:string,actor?:'guide'|'admin',reason=''):ParticipantChange=>({id,actor,reason,before:original,after:original,at:`2026-10-${id}T07:00:00Z`});
 const changes=[record('19','guide'),record('20','admin'),record('18',undefined,'관리자 등록 정보 수정'),record('21','guide')];
 assert.deepEqual(guideCountChanges(changes).map(c=>c.id),['21','19']);
 assert.equal(changes[0].id,'19');
 assert.equal(guideCountChanges([record('17')]).length,1);
});
