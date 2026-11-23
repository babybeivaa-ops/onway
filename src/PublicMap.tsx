import {requestCurrentLocation} from './currentLocation';
import {AdminLocationPicker} from './AdminLocationPicker';
import {createPortal} from 'react-dom';
import {MapReadingCloudIcon} from './CloudMascot';
import {nextDistancePoint} from './roadRoute';
import {localDate} from './arrivalEstimate';
import {useRoadRoute} from './useRoadRoute';
import {MapPin} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import type {DemoState} from './types';
import {routeService,activeReports} from './services';
import {JourneyMap} from './Visuals';
import './public-map.css';

import {loadKakaoMap} from './kakaoMap';
type CurrentPosition={lat:number;lng:number;accuracy:number;measuredAt:string;manual?:boolean};
function ActualMap({s,travelDate,onFail,onFindPlace,currentPosition}:{currentPosition:CurrentPosition|null;s:DemoState;travelDate:string;onFail:()=>void;onFindPlace:(id:string,name:string)=>void}){
 const host=useRef<HTMLDivElement>(null);
 const liveMap=useRef<any>(null);const sdk=useRef<any>(null);const [mapVersion,setMapVersion]=useState(0);
 useEffect(()=>{if(!currentPosition||!liveMap.current||!sdk.current)return;const K=sdk.current,map=liveMap.current,pos=new K.LatLng(currentPosition.lat,currentPosition.lng);const label=document.createElement('div');label.className='current-position-pin';label.setAttribute('role','img');label.setAttribute('aria-label',currentPosition.manual?'직접 선택한 위치':'조회한 내 위치');label.innerHTML='<svg viewBox="0 0 64 76" width="24" height="28.5" aria-hidden="true"><ellipse cx="32" cy="70" rx="18" ry="5" fill="#244b7126"/><path d="M24 56v10m16-10v10" stroke="#254b70" stroke-width="8" stroke-linecap="round"/><path d="M17 51q0-17 15-17t15 17v8H17Z" fill="#61b9ed" stroke="white" stroke-width="3"/><path d="m17 43-7 10m37-10 7 10" stroke="#ffceaa" stroke-width="7" stroke-linecap="round"/><circle cx="32" cy="23" r="17" fill="#ffdbb8" stroke="white" stroke-width="3"/><path d="M15 21Q14 3 32 4q18 0 17 17l-9-8q-8 9-25 8" fill="#4c526d"/><circle cx="26" cy="24" r="2" fill="#37455f"/><circle cx="38" cy="24" r="2" fill="#37455f"/><path d="M28 30q4 4 8 0" fill="none" stroke="#a65c50" stroke-width="2" stroke-linecap="round"/><ellipse cx="21" cy="29" rx="3" ry="2" fill="#f7aa9e"/><ellipse cx="43" cy="29" rx="3" ry="2" fill="#f7aa9e"/><path d="m29 43 3 4 3-4" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/></svg><span>내 위치</span>';label.querySelector('span')!.textContent=currentPosition.manual?'직접 선택한 위치':'내 위치';const marker=new K.CustomOverlay({map,position:pos,content:label,yAnchor:1,zIndex:50});const circle=new K.Circle({map:currentPosition.manual?null:map,center:pos,radius:currentPosition.accuracy,strokeWeight:1,strokeColor:'#2166f3',strokeOpacity:.4,fillColor:'#2166f3',fillOpacity:.1});map.setCenter(pos);map.setLevel(4);return()=>{marker.setMap(null);circle.setMap(null)}},[currentPosition,mapVersion]);
 const [fullView,setFullView]=useState(true);
 const next=nextDistancePoint(s,travelDate);
 const route=useRoadRoute(s,fullView?undefined:travelDate,fullView||next?.kind!=='destination',fullView?undefined:next?.id);
 const ordered=routeService.points(s);
 const focusPoints=ordered.slice(Math.max(0,ordered.findIndex(p=>p.id===next?.id))).filter(p=>p.place).slice(0,2);
 const connection=route.points;const points=connection.filter(p=>p.place);
 const reports=activeReports(s).filter(r=>localDate(r.at)===travelDate);
 const signature=JSON.stringify([connection.map(p=>[p.id,p.name,p.place,reports.find(r=>r.waypointId===p.id)?.at]),route.data,fullView,next?.id]);
 useEffect(()=>{
  let disposed=false;let map:any;const overlays:any[]=[];const listeners:Array<()=>void>=[];const container=host.current;
  const timeout=setTimeout(()=>{if(!disposed)onFail()},20000);
  loadKakaoMap().then(K=>{
   if(disposed||!container)return;
   map=new K.Map(container,{center:new K.LatLng(36.1,127.5),level:12,scrollwheel:true,draggable:true});map.addControl(new K.ZoomControl(),K.ControlPosition.LEFT);const resize=new ResizeObserver(()=>{map.relayout()});resize.observe(container);listeners.push(()=>resize.disconnect());liveMap.current=map;sdk.current=K;setMapVersion(v=>v+1);
   const loaded=()=>clearTimeout(timeout);K.event.addListener(map,'tilesloaded',loaded);listeners.push(()=>K.event.removeListener(map,'tilesloaded',loaded));
   const bounds=new K.LatLngBounds();let count=0;let popup:any;
   const extend=(lat:number,lng:number)=>{bounds.extend(new K.LatLng(lat,lng));count++};
   for(const p of points){const place=p.place!;const pos=new K.LatLng(place.lat,place.lng);extend(place.lat,place.lng);const report=reports.find(r=>r.waypointId===p.id);
    const button=document.createElement('button');button.type='button';button.className='kakao-journey-pin';button.setAttribute('aria-label',p.name+' 상세 보기');
    const badge=document.createElement('span');badge.className='journey-map-number'+(report?' is-confirmed':'');badge.textContent=report?'✓':'';
    if(p.kind==='start'||p.kind==='destination'){badge.className='journey-center-icon'+(p.kind==='start'?' journey-start-icon':'');badge.textContent='';const img=document.createElement('img');img.src=p.kind==='start'?'/icons/journey-heart-face.svg':'/icons/space-center-color.svg';img.width=28;img.height=28;img.alt='';badge.append(img);}button.append(badge);
    const pin=new K.CustomOverlay({position:pos,content:button,xAnchor:.5,yAnchor:.5,zIndex:p.kind==='destination'?10:2});pin.setMap(map);overlays.push(pin);
    button.onclick=()=>{K.event.preventMap();popup?.setMap(null);const label=document.createElement('div');label.className='journey-map-label kakao-place-popup';const title=document.createElement('strong');title.textContent=p.name;label.append(title);const status=document.createElement('span');status.textContent=report?(p.kind==='start'||p.kind==='meal'?'출발 ':'통과 ')+new Date(report.at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}):p.kind==='destination'?'도착지':'확인 전';label.append(status);popup=new K.CustomOverlay({position:pos,content:label,yAnchor:1.4,zIndex:20});popup.setMap(map);overlays.push(popup);};
   }
   if(route.data)for(const line of route.data.paths){const poly=new K.Polyline({map,path:line.map(([lat,lng])=>new K.LatLng(lat,lng)),strokeColor:'#2166f3',strokeWeight:3,strokeOpacity:.75});overlays.push(poly);for(const [lat,lng] of line)extend(lat,lng);}
   const close=()=>popup?.setMap(null);K.event.addListener(map,'click',close);listeners.push(()=>K.event.removeListener(map,'click',close));
   if(!fullView&&focusPoints.length){const focus=new K.LatLngBounds();for(const p of focusPoints)focus.extend(new K.LatLng(p.place!.lat,p.place!.lng));if(focusPoints.length===1){map.setCenter(new K.LatLng(focusPoints[0].place!.lat,focusPoints[0].place!.lng));map.setLevel(5)}else map.setBounds(focus,65,45,65,45);}
   else if(count>1)map.setBounds(bounds,65,45,65,45);else if(points.length){map.setCenter(new K.LatLng(points[0].place!.lat,points[0].place!.lng));map.setLevel(5);}
  }).catch(()=>{if(!disposed)onFail()});
  return()=>{disposed=true;liveMap.current=null;clearTimeout(timeout);listeners.forEach(remove=>remove());overlays.forEach(o=>o.setMap(null));container?.replaceChildren();};
 },[signature]);
 return <><p className="fine map-record-basis">다음 확인 지점과 그다음 지점을 중심으로 보여드려요.</p><div className="map-leg-heading"><div><span>{fullView?'출발지':'다음 확인'}</span><strong className="map-leg-place">{(fullView?connection[0]:next)?.kind==='start'?<img src="/icons/journey-heart-face.svg" alt=""/>:<MapPin size={22} aria-hidden="true"/>}<span>{fullView?connection[0]?.name:next?.name}</span></strong></div><b aria-hidden="true">→</b><div><span>도착지</span><strong className="map-leg-place"><img src="/icons/space-center-color.svg" alt=""/><span>국립청소년우주센터</span></strong></div></div>{route.error&&<p className="fine road-route-message" role="status">{route.error} {route.missing.map(p=><button key={p.id} type="button" className="map-find-place" onClick={()=>onFindPlace(p.id,p.name)}>{p.name} 위치 찾기</button>)}{!!route.key&&<button type="button" className="map-find-place" onClick={route.retry}>경로 다시 계산</button>}</p>}{route.loading&&<p className="fine" role="status">도로 경로를 불러오고 있어요…</p>}<div className="map-view-controls"><button type="button" aria-pressed={fullView} onClick={()=>setFullView(true)}>전체 경로</button><button type="button" aria-pressed={!fullView} onClick={()=>setFullView(false)}>다음 지점 중심</button></div><p className="fine map-touch-help">두 손가락으로 확대·축소하고, 드래그해서 지도를 이동할 수 있어요.</p><div className="journey-map-frame"><div ref={host} className="public-map-canvas" aria-label="여정 지점과 추천 도로 경로 지도"/><span className="journey-map-badge">{fullView?'전체 경로':'다음 지점 중심'}</span></div></>;
}
export function PublicJourneyMap({saving=false,saveFailed=false,s,travelDate,onChange,onEditReport,onLocate,onShowMap,browsingOther=false,information,routeAction,shared=false}:{saving?:boolean;saveFailed?:boolean;onShowMap:()=>void;onLocate:(id:string)=>void;routeAction?:import('react').ReactNode;shared?:boolean;information?:import('react').ReactNode;s:DemoState;travelDate:string;onEditReport:(pointId:string,reportId:string)=>void;onChange:Dispatch<SetStateAction<DemoState>>;browsingOther?:boolean}){
 const [locationSlot,setLocationSlot]=useState<HTMLElement|null>(null);useEffect(()=>{setLocationSlot(document.getElementById('guide-location-action'))},[]);
 const [showReal,setShowReal]=useState(false);
 const [positionSent,setPositionSent]=useState(false);
 const [sendingAt,setSendingAt]=useState<string|null>(null);
 useEffect(()=>{if(!sendingAt||saving)return;if(saveFailed){setSendingAt(null);setLocationMessage('위치를 저장하지 못했어요. 상단 저장 상태를 확인해주세요.');return;}if(s.sharedPosition?.sentAt===sendingAt){setSendingAt(null);setPositionSent(true);setLocationMessage('');requestAnimationFrame(()=>document.getElementById(showReal?'journey-real-tab':'journey-overview-tab')?.focus({preventScroll:true}));}},[sendingAt,saving,saveFailed,s.sharedPosition?.sentAt,showReal]);

 const [currentPosition,setCurrentPosition]=useState<CurrentPosition|null>(null);const [locating,setLocating]=useState(false);const [locationMessage,setLocationMessage]=useState('');const locationRequest=useRef(0);
 const locationCancel=useRef<(()=>void)|null>(null);
 const [locationFailed,setLocationFailed]=useState(false);const [manualOpen,setManualOpen]=useState(false);
 useEffect(()=>()=>{locationRequest.current++;locationCancel.current?.()},[]);
 function cancelLocation(){locationRequest.current++;locationCancel.current?.();setLocating(false);}
 function locateMe(){
  if(locating)return;
  onShowMap();
  setPositionSent(false);
  setLocationFailed(false);
  if(!window.isSecureContext||!navigator.geolocation){setLocationFailed(true);setLocationMessage('이 브라우저에서는 자동 위치 조회를 사용할 수 없어요. Chrome 또는 Edge에서 열거나 지도에서 직접 선택해주세요.');return;}
  locationCancel.current?.();const request=++locationRequest.current;setLocating(true);setLocationMessage('브라우저의 위치 권한을 허용해주세요. 최대 25초 동안 위치를 확인해요.');
  locationCancel.current=requestCurrentLocation(navigator.geolocation,position=>{
   if(request!==locationRequest.current)return;
   setLocating(false);setLocationFailed(false);setCurrentPosition({lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy,measuredAt:new Date(position.timestamp).toISOString()});setShowReal(true);
   setLocationMessage('조회한 내 위치예요. 오차 약 '+Math.round(position.coords.accuracy)+'m · 계속 추적하지 않아요.');
  },code=>{if(request!==locationRequest.current)return;setLocating(false);setLocationFailed(true);setLocationMessage(code===1?'위치 권한이 허용되지 않았어요. 아래 설정 안내를 확인하거나 지도에서 직접 선택해주세요.':'PC 또는 브라우저에서 위치 정보를 받지 못했어요. 다시 조회하거나 지도에서 직접 선택해주세요.');},()=>{if(request===locationRequest.current)setLocationMessage('다른 위치 조회 방식으로 다시 확인하고 있어요…');});
 }

 const [available,setAvailable]=useState(false);const [checked,setChecked]=useState(false);const [failed,setFailed]=useState(false);const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(location.protocol==='file:'){setChecked(true);return;}
  const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),10000);
  fetch('/api/maps/status',{signal:abort.signal}).then(r=>r.ok?r.json():null).then(d=>{if(!abort.signal.aborted)setAvailable(d?.available===true);}).catch(()=>setAvailable(false)).finally(()=>{clearTimeout(timer);setChecked(true);});
  return()=>{clearTimeout(timer);abort.abort();};
 },[attempt]);
 return <div className="public-journey"><div className="current-location-actions">{locating&&<button type="button" className="text-button" onClick={()=>{cancelLocation();setLocationMessage('위치 조회를 취소했어요.')}}>조회 취소</button>}{locationSlot?createPortal(<button type="button" className="current-location-button" disabled={locating} onClick={locateMe}><MapReadingCloudIcon/>{locating?'내 위치 찾는 중…':'내 위치 보기'}</button>,locationSlot):<button type="button" className="current-location-button" disabled={locating} onClick={locateMe}><MapReadingCloudIcon/>{locating?'내 위치 찾는 중…':'내 위치 보기'}</button>}{currentPosition&&!currentPosition.manual&&!positionSent&&<button type="button" className="secondary" disabled={locating} onClick={()=>{try{const sentAt=new Date().toISOString();onChange(prev=>({...prev,sharedPosition:{...currentPosition,sentAt}}));setSendingAt(sentAt);setLocationMessage('')}catch{setLocationMessage('위치를 저장하지 못했어요. 다시 시도해주세요.')}}}>{shared?'센터에 위치 전송':'센터에 위치 전송 (시연)'}</button>}</div>{locationMessage&&<p className="fine current-location-note" role="status">{locationMessage}</p>}{locationFailed&&<div className="location-recovery"><button type="button" className="secondary" onClick={()=>{cancelLocation();setManualOpen(true)}}>지도에서 내 위치 직접 선택</button></div>}{manualOpen&&<AdminLocationPicker purpose="current-location" name="내 위치" onClose={()=>setManualOpen(false)} onSave={place=>{setCurrentPosition({lat:place.lat,lng:place.lng,accuracy:0,measuredAt:new Date().toISOString(),manual:true});setShowReal(true);setLocationMessage('지도에서 직접 선택한 위치예요. 자동 측정이나 센터 전송은 하지 않았어요.')}}/>}<div className="map-mode-switch" role="tablist" aria-label="여정 보기"><button type="button" role="tab" id="journey-overview-tab" aria-controls="journey-map-panel" aria-selected={!showReal} aria-pressed={!showReal} onClick={()=>{setShowReal(false);}}>이동 순서</button><button type="button" role="tab" id="journey-real-tab" aria-controls="journey-map-panel" aria-selected={showReal} aria-pressed={showReal} onClick={()=>{setShowReal(true);}}>실제 지도</button></div><div id="journey-map-panel" role="tabpanel" aria-labelledby={showReal?'journey-real-tab':'journey-overview-tab'}>
 {showReal&&browsingOther&&<p className="map-browsing-note" role="status">위에서 다른 지점을 보고 있어요. 지도는 마지막 확인 기록 기준으로 유지돼요.</p>}
 {!showReal?<><JourneyMap state={s} travelDate={travelDate} onEditReport={onEditReport}/></>:available&&!failed?<ActualMap currentPosition={currentPosition} s={s} travelDate={travelDate} onFail={()=>setFailed(true)} onFindPlace={onLocate}/>:checked?<><JourneyMap state={s} travelDate={travelDate} onEditReport={onEditReport}/><p className="fine" role="status">실제 지도를 불러오지 못해 이동 순서를 보여드려요.</p>{location.protocol!=='file:'&&<button type="button" className="text-button" onClick={()=>{setFailed(false);setChecked(false);setAttempt(n=>n+1);}}>지도 다시 불러오기</button>}</>:<p className="fine" role="status">지도를 불러오는 중이에요…</p>}

 <div className="journey-information-row"><div className="route-edit-actions">{routeAction}</div><details className="journey-information"><summary>지도 및 경로 정보</summary>{information}<p className="fine">표시를 누르면 장소·확인 시각을 볼 수 있어요.<br/>파란 선은 추천 경로로, 실제 운행과 다를 수 있어요.</p></details></div>
 </div></div>;
}
