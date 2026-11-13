import type {DemoState} from './types';
import {adminJourney} from './adminJourney.ts';

export function toggleAdminCheckpointCheck(state:DemoState,waypointId:string,at=new Date().toISOString()):DemoState {
 if(!adminJourney(state).steps.some(p=>p.id===waypointId))throw Error('확인할 지점을 찾을 수 없어요.');
 if(!Number.isFinite(Date.parse(at)))throw Error('확인 시각을 확인해주세요.');
 const checks=state.adminCheckpointChecks??[];
 return {...state,adminCheckpointChecks:checks.some(c=>c.waypointId===waypointId)?checks.filter(c=>c.waypointId!==waypointId):[...checks,{waypointId,confirmedAt:at}]};
}

export function editAdminCheckpointTime(state:DemoState,waypointId:string,time:string):DemoState {
 const check=state.adminCheckpointChecks?.find(c=>c.waypointId===waypointId);
 if(!check||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('시각을 HH:mm 형식으로 입력해주세요.');
 const date=new Date(Date.parse(check.confirmedAt)+9*60*60*1000).toISOString().slice(0,10);
 const confirmedAt=new Date(date+'T'+time+':00+09:00').toISOString();
 return {...state,adminCheckpointChecks:state.adminCheckpointChecks!.map(c=>c.waypointId===waypointId?{...c,confirmedAt}:c)};
}
