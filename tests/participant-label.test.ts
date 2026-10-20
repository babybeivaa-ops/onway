import test from 'node:test';
import assert from 'node:assert/strict';
import {participantCountLabel} from '../src/participantCountLabel.ts';
import {countChangeDetails} from '../src/countChangeDetails.ts';
import type {ParticipantCount,YouthLevel} from '../src/types.ts';

function counts(level:YouthLevel,male=2):ParticipantCount{
 return {youth:male,leaders:1,youthDetails:{unclassified:0,rows:[{id:level,level,grade:level==='adult'||level==='preschool'?'':'1',male,female:0}]}};
}
test('adult, preschool and mixed groups use participant labels only for populated rows',()=>{
 for(const level of ['adult','preschool'] as const){
  assert.equal(participantCountLabel(counts(level)),'참가자');
  assert.equal(participantCountLabel(counts(level,0)),'청소년');
  assert.equal(participantCountLabel({...counts('elementary'),youth:4,youthDetails:{unclassified:0,rows:[...counts('elementary').youthDetails!.rows,...counts(level).youthDetails!.rows]}}),'참가자');
 }
 assert.equal(participantCountLabel(counts('elementary')),'청소년');
 assert.equal(participantCountLabel({youth:3,leaders:1}),'청소년');
});
test('change details avoid youth wording when adult or preschool participants change or are removed',()=>{
 for(const level of ['adult','preschool'] as const){
  const differences=countChangeDetails(counts(level),counts(level,3));
  assert.ok(differences.some(d=>d.label==='참가자 합계'));
  assert.ok(differences.every(d=>!d.label.includes('청소년')));
  assert.equal(participantCountLabel(counts(level),counts('elementary')),'참가자');
 }
});
