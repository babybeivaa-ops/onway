import test from 'node:test';
import assert from 'node:assert/strict';
import {insertYouthRow,countYouth} from '../src/participantCounts.ts';
import {validCounts} from '../public-api/workspace-schema.mjs';
import type {YouthDetails} from '../src/types';
test('first elementary row defaults to grade six; additions insert below the selected row without duplicates',()=>{
 const empty:YouthDetails={rows:[],unclassified:2};
 const first=insertYouthRow(empty,'elementary')!;
 assert.equal(first.rows[0].grade,'6');
 first.rows[0].male=4;first.rows[0].female=2;
 const second=insertYouthRow(first,'elementary',first.rows[0].id)!;
 assert.deepEqual(second.rows.map(row=>row.grade),['6','5']);
 const third=insertYouthRow(second,'elementary',first.rows[0].id)!;
 assert.deepEqual(third.rows.map(row=>row.grade),['6','4','5']);
 assert.equal(countYouth(third),8);
 assert.deepEqual(second.rows.map(row=>row.grade),['6','5']);
 assert.equal(new Set(third.rows.map(row=>row.id)).size,3);
 let full=third;
 while(true){const next=insertYouthRow(full,'elementary');if(!next)break;full=next}
 assert.equal(full.rows.length,8);
 assert.deepEqual(full.rows.slice(3).map(row=>row.grade),['3','2','1','other','']);
 for(const grade of ['1','2','3']){
  const youthDetails={rows:[{id:'lower-grade',level:'elementary',grade,male:2,female:3}],unclassified:0};
  assert.equal(validCounts({youth:5,leaders:0,youthDetails}),true);
 }
 assert.equal(validCounts({youth:8,leaders:0,youthDetails:full}),true);
 assert.equal(insertYouthRow(full,'elementary'),null);
 const mixed=insertYouthRow(third,'middle')!;
 assert.equal(mixed.rows.at(-1)!.grade,'1');
 assert.deepEqual(mixed.rows.slice(0,3),third.rows);
 assert.equal(empty.rows.length,0);
});
