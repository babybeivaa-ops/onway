import type {DemoState,ParticipantActor} from './types';
export function setPlannedArrival(s:DemoState,date:string,time:string,actor:ParticipantActor):DemoState{if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('방문일을 확인해주세요.');if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('도착 예정 시각을 확인해주세요.');const previous=s.plannedArrival;
 if(previous?.date===date&&previous.time===time)return s;
 if(!previous&&!time)return s;
 const at=new Date().toISOString();
 const history=[...(s.arrivalChanges??[])];
 if(!history.length&&previous)history.push({id:crypto.randomUUID(),date:previous.date,after:previous.time,actor:previous.actor,at:previous.updatedAt,legacy:true});
 history.push({id:crypto.randomUUID(),date,before:previous?.date===date?previous.time:undefined,after:time||undefined,actor,at});
 return {...s,arrivalChanges:history,plannedArrival:time?{date,time,actor,updatedAt:at}:undefined};}
