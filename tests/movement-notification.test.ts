import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroup} from '../src/workspace.ts';
import {adminNotices,newAdminNotices} from '../src/adminNotificationModel.ts';
const group=()=>createGroup({name:'동명중학교',origin:'동명중학교',travelDate:'2099-01-01',youth:10,leaders:1,ic:true,bridge:true});
const report=(id:string)=>({id,waypointId:id,at:'2099-01-01T10:00:00+09:00',status:'saved' as const,revisions:[]});
test('departure and checkpoint notices use displayed school names and stable report identities',()=>{const g=group();g.state.reports=[report('start'),report('bridge')];const events=adminNotices([g]);assert.equal(events.find(e=>e.id.endsWith(':bridge'))?.text,'동명중이 나로1대교를 통과하였습니다.');assert.equal(events.find(e=>e.id.endsWith(':start'))?.text,'동명중이 동명중학교에서 출발하였습니다.');assert.equal(newAdminNotices(events,null).length,0);assert.equal(newAdminNotices(events,new Set()).length,2);g.state.reports[0]={...g.state.reports[0],status:'edited',at:'2099-01-01T10:01:00+09:00'};assert.equal(newAdminNotices(adminNotices([g]),new Set(events.map(e=>e.id))).length,0)});
test('cancelled and excluded checkpoints do not notify; organizations retain their full name',()=>{const g=group();g.state.organization.name='햇살지역아동센터';g.state.reports=[report('start'),{...report('ic'),status:'cancelled'},report('bridge')];g.state.waypoints.find(p=>p.id==='bridge')!.included=false;const events=adminNotices([g]);assert.equal(events.length,1);assert.equal(events[0].groupName,'햇살지역아동센터');assert.match(events[0].text,/^햇살지역아동센터가 /)});
