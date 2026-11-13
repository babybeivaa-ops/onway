import test from 'node:test';
import assert from 'node:assert/strict';
import {compareParticipantRows,participantRows} from '../src/participantRows.ts';
import type {YouthCountRow,YouthLevel} from '../src/types.ts';
const row=(level:YouthLevel,grade:string,age?:number):YouthCountRow=>({id:level+grade+age,level,grade,age,male:2,female:3});
test('sorts each school level by ascending grade without altering counts or source rows',()=>{
 for(const level of ['elementary','middle','high','university'] as YouthLevel[]){
  const grades=level==='elementary'?['6','4','5']:level==='university'?['4','2','1','3']:['3','1','2'];
  const rows=grades.map(g=>row(level,g));const original=structuredClone(rows);
  const sorted=participantRows({youth:rows.length*5,leaders:0,youthDetails:{rows,unclassified:0}});
  assert.deepEqual(sorted.map(r=>r.grade),[...grades].sort());assert.deepEqual(rows,original);
  assert.ok(sorted.every(r=>r.male===2&&r.female===3));
 }
});
test('sorts ages ascending, puts unknown age last, and includes empty editor rows',()=>{
 const rows=[row('adult',''),row('adult','',52),row('adult','',24),row('preschool','',5),{...row('elementary','6'),male:0,female:0},row('elementary','4')];
 assert.deepEqual([...rows].sort(compareParticipantRows).map(r=>[r.level,r.grade,r.age]),[
 ['preschool','',5],['elementary','4',undefined],['elementary','6',undefined],['adult','',24],['adult','',52],['adult','',undefined]]);
});
