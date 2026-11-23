import {FittedSpeech} from './FittedSpeech';
import {useEffect,useState} from 'react';
import type {DemoState} from './types';
import {routeService} from './services';
import {requestRoadRoute} from './useRoadRoute';
export function ArrivalTimeSpeech({state,children,enabled=false}:{state:DemoState;children:string;enabled?:boolean}){
 const points=routeService.points(state);
 const ic=points.find(p=>p.id==='ic'||p.name.replace(/\s/g,'').toLowerCase()==='고흥ic');
 const bridge=points.find(p=>p.id==='bridge'||p.name.replace(/\s/g,'')==='나로1대교');
 const segment=ic&&bridge&&bridge.order>ic.order?points.filter(p=>p.order>=ic.order&&p.order<=bridge.order):[];
 const key=enabled&&segment.length>=2&&segment.every(p=>p.place)&&!segment.some(p=>p.kind==='meal'||/휴게소|휴식/.test(p.name))?JSON.stringify(segment.map(p=>[p.place!.lng,p.place!.lat])):'';
 const [result,setResult]=useState<{key:string;seconds:number}|null>(null);
 useEffect(()=>{if(!key)return;let alive=true;requestRoadRoute(key).then(r=>{if(alive)setResult({key,seconds:r.durationSeconds})},()=>{if(alive)setResult(null)});return()=>{alive=false}},[key]);
 const minutes=key&&result?.key===key?Math.max(1,Math.round(result.seconds/60)):null;
 return <FittedSpeech>{minutes?'고흥IC에서 나로1대교까지\n약 '+minutes+'분 걸려요!':children}</FittedSpeech>;
}
