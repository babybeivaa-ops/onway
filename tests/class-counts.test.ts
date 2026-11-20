import test from 'node:test';
import assert from 'node:assert/strict';
import {validCounts,validWorkspace} from '../public-api/workspace-schema.mjs';
import {normalizeCounts,insertClassRow,countYouth} from '../src/participantCounts.ts';
import {participantRows} from '../src/participantRows.ts';
import {countChangeDetails} from '../src/countChangeDetails.ts';
import {createGroup,editGroupDetails} from '../src/workspace.ts';
import {tripService} from '../src/services.ts';
import {backupText,parseBackup} from '../src/backup.ts';
import type {ParticipantCount} from '../src/types.ts';

const counts=():ParticipantCount=>({youth:50,leaders:2,youthDetails:{unclassified:0,rows:[
 {id:'c2',level:'elementary',grade:'6',classNumber:2,male:11,female:12},
 {id:'c1',level:'elementary',grade:'6',classNumber:1,male:13,female:14}
]}});
test('same grade accepts distinct classes, sorts numerically, rejects duplicates and invalid class numbers',()=>{
 const c=counts();assert.equal(validCounts(c),true);
 assert.deepEqual(participantRows(c).map(r=>r.classNumber),[1,2]);
 for(const n of [1,0,-1,1.5,1000,'2']){
  const invalid=counts();(invalid.youthDetails!.rows[0] as any).classNumber=n;
  assert.equal(validCounts(invalid),false);
 }
 const legacy=counts();for(const row of legacy.youthDetails!.rows)delete row.classNumber;
 legacy.youthDetails!.rows[1].grade='5';assert.equal(validCounts(legacy),true);
});
test('class addition uses same grade and first unused number; empty named classes survive saving',()=>{
 const c=counts(),added=insertClassRow(c.youthDetails!,'c2')!;
 assert.equal(added.rows[1].classNumber,3);assert.equal(added.rows[1].grade,'6');
 const saved=normalizeCounts({...c,youthDetails:added});assert.equal(saved.youthDetails!.rows.length,3);
 const removed={...added,rows:added.rows.filter(r=>r.id!=='c1')};
 assert.equal(countYouth(removed),23);assert.equal(insertClassRow(removed,'c2')!.rows[1].classNumber,1);
});
test('registration, admin edit, guide edit and backup retain class rows and identify the changed class',()=>{
 const c=counts(),g=createGroup({...c,name:'반별시험초',origin:'반별시험초',travelDate:'2099-01-01',ic:true,bridge:true});
 const w={version:2 as const,view:'admin' as const,activeGroupId:g.id,groups:[g]};
 const edited=editGroupDetails(w,g.id,{...c,name:'반별시험초'});
 const after=counts();after.youthDetails!.rows[0].female=11;after.youth=49;
 const state=tripService.changeCounts(edited.groups[0].state,after,'2반 여학생 1명 불참','guide');
 edited.groups[0].state=state;assert.equal(validWorkspace(edited),true);
 const restored=parseBackup(backupText(edited));
 assert.deepEqual(restored.groups[0].state.counts,normalizeCounts(after));
 assert.ok(countChangeDetails(c,after).some(d=>d.label==='초등 6학년 2반 여'&&d.before===12&&d.after===11));
 assert.equal(countChangeDetails(c,after).some(d=>d.label.includes('1반')),false);
});
