import {useEffect,useState} from 'react';
import type {DemoGroup} from './workspace';
import {adminRoadPlan} from './adminArrivalOrder';
import {requestRoadRoute} from './useRoadRoute';
export function useAdminRoadDistances(groups:DemoGroup[],enabled:boolean){
 const plans=groups.map(g=>({id:g.id,plan:adminRoadPlan(g)}));
 const keys=JSON.stringify([...new Set(plans.map(p=>p.plan?.key).filter((k):k is string=>!!k))].sort());
 const [results,setResults]=useState<Record<string,{distance?:number;error?:boolean}>>({});
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{if(!enabled)return;let alive=true;const queue:string[]=JSON.parse(keys);setResults({});
 async function worker(){while(alive&&queue.length){const key=queue.shift()!;try{const data=await requestRoadRoute(key);if(alive)setResults(prev=>({...prev,[key]:{distance:data.distanceMeters}}));}catch{if(alive)setResults(prev=>({...prev,[key]:{error:true}}));}}}
 void worker();void worker();return()=>{alive=false};},[keys,enabled,attempt]);
 const distances:Record<string,number>={};let failed=0,loading=false;
 for(const {id,plan} of plans){if(!plan)continue;const result=results[plan.key];if(result?.distance!==undefined)distances[id]=result.distance;else if(!plan.key||result?.error)failed++;else loading=true;}
 return {distances,failed,loading:enabled&&loading,retry:()=>setAttempt(v=>v+1)};
}
