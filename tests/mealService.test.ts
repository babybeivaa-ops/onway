import test from 'node:test';
import assert from 'node:assert/strict';
import {mealServiceSummary,setArrivalLunch} from '../src/mealService.ts';
import {createGroup,copyJourney} from '../src/workspace.ts';
import {backupText,parseBackup} from '../src/backup.ts';
import {validGroup} from '../public-api/workspace-schema.mjs';
test('meal default and optional lunch; short visits do not imply overnight meals',()=>{
 assert.equal(mealServiceSummary('1박 2일'),'입소일 저녁부터 퇴소일 점심까지');
 assert.equal(mealServiceSummary('2박 3일',true),'입소일 점심부터 퇴소일 점심까지');
 assert(!mealServiceSummary('당일').includes('저녁'));
 assert(mealServiceSummary('당일',true).includes('점심 포함'));
});
test('meal selection persists only for the chosen group, survives backup, and resets for copied journeys',()=>{
 const a=createGroup({name:'A',travelDate:'2030-01-01',origin:'학교',youth:10,leaders:1,ic:true,bridge:true});
 const b=createGroup({name:'B',travelDate:'2030-01-01',origin:'학교',youth:10,leaders:1,ic:true,bridge:true});
 const workspace={version:2 as const,view:'admin' as const,activeGroupId:a.id,groups:[a,b]};
 const updated=setArrivalLunch(workspace,a.id,true);assert.equal(updated.groups[0].state.organization.arrivalLunch,true);assert.equal(updated.groups[1].state.organization.arrivalLunch,undefined);assert.equal(a.state.organization.arrivalLunch,undefined);
 assert.equal(parseBackup(backupText(updated)).groups[0].state.organization.arrivalLunch,true);
 assert.equal(setArrivalLunch(updated,a.id,false).groups[0].state.organization.arrivalLunch,false);
 const copied=copyJourney(updated,a.id,{name:'C',youth:10,leaders:1,travelDate:'2030-01-03'});assert.equal(copied.groups.at(-1)!.state.organization.arrivalLunch,undefined);
 assert(validGroup(updated.groups[0]));assert(!validGroup({...a,state:{...a.state,organization:{...a.state.organization,arrivalLunch:'yes'}}}));
});
