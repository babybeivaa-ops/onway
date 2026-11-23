import {useState} from 'react';
import type {DemoGroup,GroupDetails} from './workspace';
import type {PublicPlace} from './places';
import {OriginSettings} from './OriginSettings';
import type {OriginMode} from './OriginSettings';
import {CheckpointEditor} from './CheckpointEditor';


export function AdminRouteEditor({group,onSaveOrigin,onLocate,onChange,onRename}:{group:DemoGroup;onSaveOrigin:(input:GroupDetails)=>void;onLocate:(id:string)=>void;onChange:(points:{id:string;name:string}[])=>void;onRename:(id:string,name:string)=>void}){
 const initialMode=group.state.organization.originMode??'school';
 const [mode,setMode]=useState<OriginMode>(initialMode);
 const [place,setPlace]=useState<PublicPlace>();
 const [error,setError]=useState('');
 const current=group.state.waypoints.find(p=>p.id==='start');
 const pending=mode!==initialMode||!!place;
 return <>
  <form className="admin-route-origin" onSubmit={e=>{e.preventDefault();try{if(!place)throw Error('검색 결과에서 출발 장소를 선택해주세요.');onSaveOrigin({name:group.state.organization.name,...group.state.counts,originMode:mode,originPlace:place});setError('');setPlace(undefined)}catch(e){setError((e as Error).message)}}}>
   <h3>1. 출발지 선택</h3>
   <p className="fine">학교·단체에서 출발하는지, 다른 장소에서 출발하는지 먼저 확인해주세요.</p>
   <OriginSettings name={group.state.organization.name} mode={mode} onMode={setMode} onSelect={setPlace} editing currentPlace={current?.place} currentName={current?.name||group.state.trip.origin}/>
   {mode==='school'&&initialMode==='other'&&<p className="fine">저장하면 학교·단체 → 고흥IC → 나로1대교 → 국립청소년우주센터로 변경돼요. 기존 중간 지점은 경로에서 제외돼요.</p>}
   {pending&&<button className="secondary" type="submit" disabled={!place}>출발지 저장 후 지점 편집</button>}
   {error&&<p className="form-error" role="alert">{error}</p>}
  </form>
  <h3 className="route-edit-step">2. 지점 추가 · 순서 편집</h3>
  {pending&&<p className="fine" role="status">변경한 출발지를 먼저 저장해주세요.</p>}
  {!pending&&<p className="fine">현재 출발지를 기준으로 지점을 추가하거나 이동 순서를 수정해주세요.</p>}
  {!pending&&<fieldset className="admin-route-checkpoints">
   <CheckpointEditor showIntro={false} group={group} onLocate={onLocate} onChange={onChange} onRename={onRename}/>
  </fieldset>}
 </>;
}
