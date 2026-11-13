import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCounts,insertYouthRow} from '../src/participantCounts.ts';
import {validCounts} from '../public-api/workspace-schema.mjs';
for(const level of ['adult','preschool'] as const){
 test(level+' accepts optional age and keeps age through normalization',()=>{
  for(const age of [undefined,0,6,40,120]){
   const input={youth:3,leaders:0,youthDetails:{rows:[{id:'a',level,grade:'',age,male:1,female:2}],unclassified:0}};
   assert(validCounts(input));assert.equal(normalizeCounts(input).youthDetails?.rows[0].age,age);
  }
  for(const age of [-1,121,1.5,'6'])assert.equal(validCounts({youth:3,leaders:0,youthDetails:{rows:[{id:'a',level,grade:'',age,male:1,female:2}],unclassified:0}}),false);
 });
 test(level+' allows another age row and rejects duplicate ages',()=>{
  const details={rows:[{id:'a',level,grade:'',age:6,male:1,female:2}],unclassified:0};
  const added=insertYouthRow(details,level)!;assert.equal(added.rows.length,2);assert(validCounts({youth:3,leaders:0,youthDetails:added}));
  added.rows[1].age=6;assert.equal(validCounts({youth:3,leaders:0,youthDetails:added}),false);
 });
}
