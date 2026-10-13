import {useEffect,useState} from 'react';
import type {DemoState} from './types';
import {roadRoutePlan} from './roadRoute';
import type {RoadRoute} from './roadRoute';
const cache=new Map<string,{at:number;data:RoadRoute}>();
const pending=new Map<string,Promise<RoadRoute>>();
function request(key:string){
 const saved=cache.get(key);if(saved&&Date.now()-saved.at<300000)return Promise.resolve(saved.data);
 const running=pending.get(key);if(running)return running;
 const job=fetch('/api/routes/directions?points='+encodeURIComponent(key),{signal:AbortSignal.timeout(30000)}).then(async r=>{
  const d=await r.json();if(!r.ok)throw Error(d.error||'도로 경로를 불러오지 못했어요.');
  if(!Number.isFinite(d.distanceMeters)||!Number.isFinite(d.durationSeconds)||!Array.isArray(d.paths))throw Error('도로 경로 응답을 확인하지 못했어요.');
  if(cache.size>=40)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),data:d});return d as RoadRoute;
 }).catch(e=>{throw Error(e instanceof Error&&!['TypeError','TimeoutError','SyntaxError'].includes(e.name)?e.message:'도로 경로에 연결하지 못했어요. 잠시 후 다시 시도해주세요.');}).finally(()=>pending.delete(key));
 pending.set(key,job);return job;
}
export function useRoadRoute(s:DemoState,travelDate?:string,enabled=true,fromId?:string){
 const plan=roadRoutePlan(s,travelDate,fromId);const key=plan.key;
 const [state,setState]=useState<{key:string;data?:RoadRoute;error?:string}>({key:''});const [attempt,setAttempt]=useState(0);
 useEffect(()=>{if(!enabled||!key)return;let alive=true;setState({key});request(key).then(data=>{if(alive)setState({key,data})},e=>{if(alive)setState({key,error:e.message})});return()=>{alive=false};},[key,enabled,attempt]);
 const current=state.key===key?state:undefined;
 return {...plan,data:enabled?current?.data:undefined,error:plan.error||current?.error||'',loading:enabled&&!!key&&!current?.data&&!current?.error,retry:()=>{cache.delete(key);setAttempt(v=>v+1)}};
}
