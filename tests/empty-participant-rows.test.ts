import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCounts,sameCounts} from '../src/participantCounts.ts';
import {participantRows} from '../src/participantRows.ts';
import {participantCountLabel} from '../src/participantCountLabel.ts';
import {formatSchoolGroupName} from '../src/groupName.ts';
import {createGroup,editGroupDetails} from '../src/workspace.ts';
import type {ParticipantCount,YouthCountRow} from '../src/types.ts';

const high:YouthCountRow={id:'high',level:'high',grade:'1',male:3,female:2};
const empty:YouthCountRow={id:'university',level:'university',grade:'1',male:0,female:0};
const value=():ParticipantCount=>({youth:5,leaders:1,youthDetails:{rows:[high,empty,{...empty,id:'adult',level:'adult',grade:''}],unclassified:0}});
test('save omits zero rows without changing totals, nonempty rows, or input drafts',()=>{
 const draft=value(),original=structuredClone(draft),saved=normalizeCounts(draft);
 assert.deepEqual(saved.youthDetails?.rows,[high]);
 assert.equal(saved.youth,5);assert.equal(saved.leaders,1);
 assert.deepEqual(draft,original);
 assert.equal(sameCounts(draft,saved),true);
 assert.deepEqual(normalizeCounts({youth:0,leaders:0,youthDetails:{rows:[empty],unclassified:0}}).youthDetails?.rows,[]);
 assert.deepEqual(normalizeCounts({youth:2,leaders:0,youthDetails:{rows:[empty],unclassified:2}}).youthDetails,{rows:[],unclassified:2});
 assert.throws(()=>normalizeCounts({youth:0,leaders:0,youthDetails:{rows:[{...empty,male:-1,female:1}],unclassified:0}}));
});
test('legacy empty rows are hidden and cannot alter group category or participant label',()=>{
 assert.deepEqual(participantRows(value()),[high]);
 assert.equal(participantCountLabel(value()),'청소년');
 assert.equal(formatSchoolGroupName('한빛',value()),'한빛고');
 assert.equal(participantRows({...value(),youthDetails:{rows:[{...high,male:0,female:2}],unclassified:0}}).length,1);
});
test('both registration and group edits discard accidentally added empty categories',()=>{
 const input={...value(),name:'한빛고',travelDate:'2099-01-01',origin:'한빛고',ic:true,bridge:true};
 const group=createGroup(input);
 assert.deepEqual(group.state.counts.youthDetails?.rows,[high]);
 const workspace={version:2 as const,view:'admin' as const,activeGroupId:group.id,groups:[group]};
 const updated=editGroupDetails(workspace,group.id,input);
 assert.deepEqual(updated.groups[0].state.counts.youthDetails?.rows,[high]);
});
