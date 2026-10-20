import {createPortal} from 'react-dom';
import {MapReadingCloudIcon} from './CloudMascot';
import {nextDistancePoint} from './roadRoute';
import {localDate} from './arrivalEstimate';
import {useRoadRoute} from './useRoadRoute';
import {MapPin,ChevronDown} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import type {DemoState} from './types';
import type {PublicPlace} from './places';
import {setWaypointPlace} from './places';
import {routeService,activeReports} from './services';
import {JourneyMap} from './Visuals';
import './public-map.css';

import {loadKakaoMap} from './kakaoMap';
type CurrentPosition={lat:number;lng:number;accuracy:number;measuredAt:string};
function ActualMap({s,travelDate,onFail,onFindPlace,currentPosition}:{currentPosition:CurrentPosition|null;s:DemoState;travelDate:string;onFail:()=>void;onFindPlace:(id:string,name:string)=>void}){
 const host=useRef<HTMLDivElement>(null);
 const liveMap=useRef<any>(null);const sdk=useRef<any>(null);const [mapVersion,setMapVersion]=useState(0);
 useEffect(()=>{if(!currentPosition||!liveMap.current||!sdk.current)return;const K=sdk.current,map=liveMap.current,pos=new K.LatLng(currentPosition.lat,currentPosition.lng);const label=document.createElement('div');label.className='current-position-pin';label.setAttribute('role','img');label.setAttribute('aria-label','조회한 내 위치');label.innerHTML='<svg viewBox="0 0 64 76" width="48" height="57" aria-hidden="true"><ellipse cx="32" cy="70" rx="18" ry="5" fill="#244b7126"/><path d="M24 56v10m16-10v10" stroke="#254b70" stroke-width="8" stroke-linecap="round"/><path d="M17 51q0-17 15-17t15 17v8H17Z" fill="#61b9ed" stroke="white" stroke-width="3"/><path d="m17 43-7 10m37-10 7 10" stroke="#ffceaa" stroke-width="7" stroke-linecap="round"/><circle cx="32" cy="23" r="17" fill="#ffdbb8" stroke="white" stroke-width="3"/><path d="M15 21Q14 3 32 4q18 0 17 17l-9-8q-8 9-25 8" fill="#4c526d"/><circle cx="26" cy="24" r="2" fill="#37455f"/><circle cx="38" cy="24" r="2" fill="#37455f"/><path d="M28 30q4 4 8 0" fill="none" stroke="#a65c50" stroke-width="2" stroke-linecap="round"/><ellipse cx="21" cy="29" rx="3" ry="2" fill="#f7aa9e"/><ellipse cx="43" cy="29" rx="3" ry="2" fill="#f7aa9e"/><path d="m29 43 3 4 3-4" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/></svg><span>내 위치</span>';const marker=new K.CustomOverlay({map,position:pos,content:label,yAnchor:1,zIndex:50});const circle=new K.Circle({map,center:pos,radius:currentPosition.accuracy,strokeWeight:1,strokeColor:'#2166f3',strokeOpacity:.4,fillColor:'#2166f3',fillOpacity:.1});map.setCenter(pos);map.setLevel(4);return()=>{marker.setMap(null);circle.setMap(null)}},[currentPosition,mapVersion]);
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
   map=new K.Map(container,{center:new K.LatLng(36.1,127.5),level:12,scrollwheel:true,draggable:true});map.addControl(new K.ZoomControl(),K.ControlPosition.LEFT);liveMap.current=map;sdk.current=K;setMapVersion(v=>v+1);
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
export function PublicJourneyMap({s,travelDate,onChange,onEditReport,browsingOther=false,information,routeAction,shared=false}:{routeAction?:import('react').ReactNode;shared?:boolean;information?:import('react').ReactNode;s:DemoState;travelDate:string;onEditReport:(pointId:string,reportId:string)=>void;onChange:Dispatch<SetStateAction<DemoState>>;browsingOther?:boolean}){
 const [locationSlot,setLocationSlot]=useState<HTMLElement|null>(null);useEffect(()=>{setLocationSlot(document.getElementById('guide-location-action'))},[]);
 const [showReal,setShowReal]=useState(false);
 const [currentPosition,setCurrentPosition]=useState<CurrentPosition|null>(null);const [locating,setLocating]=useState(false);const [locationMessage,setLocationMessage]=useState('');const locationRequest=useRef(0);
 useEffect(()=>()=>{locationRequest.current++},[]);
 function locateMe(){
  if(locating)return;
  if(!window.isSecureContext){setLocationMessage('내 위치는 HTTPS 주소로 접속한 화면에서 사용할 수 있어요.');return}
  if(!navigator.geolocation){setLocationMessage('이 브라우저에서는 위치 조회를 지원하지 않아요.');return}
  const request=++locationRequest.current;setLocating(true);setLocationMessage('위치 권한을 허용하면 현재 위치를 보여드려요.');
  navigator.geolocation.getCurrentPosition(position=>{if(request!==locationRequest.current)return;setLocating(false);setCurrentPosition({lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy,measuredAt:new Date(position.timestamp).toISOString()});setShowReal(true);setLocationMessage('조회한 내 위치예요. 오차 약 '+Math.round(position.coords.accuracy)+'m · 계속 추적하지 않아요.');},error=>{if(request!==locationRequest.current)return;setLocating(false);setLocationMessage(error.code===1?'위치 권한이 허용되지 않았어요. 브라우저의 사이트 설정에서 위치 권한을 확인해주세요.':error.code===3?'위치 조회 시간이 초과됐어요. 다시 눌러주세요.':'현재 위치를 찾지 못했어요. 휴대폰 위치 설정을 확인해주세요.');},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 }

 const searchPanel=useRef<HTMLElement>(null);const searchInput=useRef<HTMLInputElement>(null);
 const [available,setAvailable]=useState(false);const [searchAvailable,setSearchAvailable]=useState(false);const [checked,setChecked]=useState(false);const [failed,setFailed]=useState(false);const [attempt,setAttempt]=useState(0);
 const points=routeService.points(s);const [target,setTarget]=useState<string|null>(null);const selected=points.find(p=>p.id===target);
 const [query,setQuery]=useState('');const [items,setItems]=useState<PublicPlace[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');const controller=useRef<AbortController|null>(null);
 useEffect(()=>{
  if(location.protocol==='file:'){setChecked(true);return;}
  const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),10000);
  fetch('/api/maps/status',{signal:abort.signal}).then(r=>r.ok?r.json():null).then(d=>{if(!abort.signal.aborted){setAvailable(d?.available===true);setSearchAvailable(d?.searchAvailable===true);}}).catch(()=>{setAvailable(false);}).finally(()=>{clearTimeout(timer);setChecked(true);});
  return()=>{clearTimeout(timer);abort.abort();controller.current?.abort();};
 },[attempt]);
 const cancel=()=>{controller.current?.abort();setBusy(false);setItems([]);setError('');setMessage('');};
 const search=async(text:string)=>{
  cancel();const q=text.trim();if(q.length<2){setError('장소명을 두 글자 이상 입력해주세요.');return;}
  const abort=new AbortController();controller.current=abort;setBusy(true);
  try{const r=await fetch('/api/maps/search?q='+encodeURIComponent(q),{signal:abort.signal});const d=await r.json();if(!r.ok)throw Error('장소를 검색하지 못했어요. 잠시 후 다시 시도해주세요.');if(abort.signal.aborted)return;setItems(d.items);setMessage(d.notice||'');if(!d.items.length)setMessage('찾는 장소가 없어요. 지역명을 함께 입력해 보세요.');}
  catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'검색하지 못했어요.');}finally{if(!abort.signal.aborted)setBusy(false);}
 };
 const openSearch=(id:string,name:string)=>{setTarget(id);const text=name==='점심식사 장소'?'':name;setQuery(text);if(text)void search(text);else cancel();requestAnimationFrame(()=>{searchPanel.current?.scrollIntoView({behavior:'smooth',block:'center'});searchInput.current?.focus({preventScroll:true});});};
 const row=(p:typeof points[number])=><div key={p.id} className="location-place-row"><div><strong>{p.name}</strong>{p.place&&<small>{p.place.address||'지도에 표시 중'}</small>}</div><button type="button" aria-label={p.name+(p.place?' 지도 위치 수정':' 지도 위치 찾기')} disabled={!searchAvailable} onClick={()=>openSearch(p.id,p.name)}>{p.place?'위치 수정':'위치 찾기'}</button></div>;
 return <div className="public-journey"><div className="current-location-actions">{locationSlot?createPortal(<button type="button" className="current-location-button" disabled={locating} onClick={locateMe}><MapReadingCloudIcon/>{locating?'내 위치 찾는 중…':'내 위치 보기'}</button>,locationSlot):<button type="button" className="current-location-button" disabled={locating} onClick={locateMe}><MapReadingCloudIcon/>{locating?'내 위치 찾는 중…':'내 위치 보기'}</button>}{currentPosition&&<button type="button" className="secondary" disabled={locating} onClick={()=>{try{onChange(prev=>({...prev,sharedPosition:{...currentPosition,sentAt:new Date().toISOString()}}));setLocationMessage(shared?'위치 전송을 요청했어요. 상단 동기화 상태에서 결과를 확인해주세요.':'시연용 위치를 저장했어요. 같은 브라우저의 관리자 화면에서 확인할 수 있어요. 실제 센터 전송은 없어요.')}catch{setLocationMessage('위치를 저장하지 못했어요. 다시 시도해주세요.')}}}>{shared?'센터에 위치 전송':'센터에 위치 전송 (시연)'}</button>}{currentPosition&&<button type="button" className="text-button" onClick={()=>{locationRequest.current++;setLocating(false);setCurrentPosition(null);setLocationMessage('내 위치 표시를 지웠어요.')}}>위치 표시 지우기</button>}</div>{locationMessage&&<p className="fine current-location-note" role="status">{locationMessage}</p>}<div className="map-mode-switch" role="tablist" aria-label="여정 보기"><button type="button" role="tab" id="journey-overview-tab" aria-controls="journey-map-panel" aria-selected={!showReal} aria-pressed={!showReal} onClick={()=>{cancel();setTarget(null);setShowReal(false);}}>이동 순서</button><button type="button" role="tab" id="journey-real-tab" aria-controls="journey-map-panel" aria-selected={showReal} aria-pressed={showReal} onClick={()=>{cancel();setTarget(null);setShowReal(true);}}>실제 지도</button></div><div id="journey-map-panel" role="tabpanel" aria-labelledby={showReal?'journey-real-tab':'journey-overview-tab'}>
 {showReal&&browsingOther&&<p className="map-browsing-note" role="status">위에서 다른 지점을 보고 있어요. 지도는 마지막 확인 기록 기준으로 유지돼요.</p>}
 {!showReal?<><JourneyMap state={s} travelDate={travelDate} onEditReport={onEditReport}/></>:available&&!failed?<ActualMap currentPosition={currentPosition} s={s} travelDate={travelDate} onFail={()=>setFailed(true)} onFindPlace={openSearch}/>:checked?<><JourneyMap state={s} travelDate={travelDate} onEditReport={onEditReport}/><p className="fine" role="status">실제 지도를 불러오지 못해 이동 순서를 보여드려요.</p>{location.protocol!=='file:'&&<button type="button" className="text-button" onClick={()=>{setFailed(false);setChecked(false);setAttempt(n=>n+1);}}>지도 다시 불러오기</button>}</>:<p className="fine" role="status">지도를 불러오는 중이에요…</p>}

 <div className="journey-information-row"><div className="route-edit-actions">{routeAction}</div><details className="journey-information" open={selected?true:undefined}><summary>지도 및 경로 정보</summary>{information}<p className="fine">작은 표시를 누르면 선택한 장소의 이름과 확인 시각이 보여요.<br/>파란 선은 카카오 자동차 추천 경로예요. 실제 운행 경로와 다를 수 있으며 GPS 위치는 표시하지 않아요.</p>{<section className="location-setup" aria-label="장소 검색 및 위치 변경"><details className="located-places"><summary className="place-search-entry"><span className="place-search-entry-icon"><MapPin size={21} aria-hidden="true"/></span><span className="place-search-entry-copy"><strong>지도 위치 확인·수정</strong><small>여정에 등록한 지점의 지도 위치를 확인하거나 수정해요.</small></span><ChevronDown className="place-search-entry-chevron" size={20} aria-hidden="true"/></summary><p className="fine">아래 여정 지점을 선택한 뒤, 장소 종류와 주소를 확인해 지도에 표시할 위치를 골라주세요.</p>{!searchAvailable&&<p role="status" className="fine">{checked?'장소 검색 서버에 연결되지 않았어요. 지도 서버 연결 후 다시 열어주세요.':'장소 검색 연결을 확인하고 있어요.'}</p>}{points.map(row)}</details>
 {selected&&<section ref={searchPanel} className="place-search-panel" aria-label={selected.name+' 위치 검색'}><div className="place-search-heading"><strong>{selected.name} 위치 찾기</strong><button type="button" aria-label="장소 검색 닫기" onClick={()=>{cancel();setTarget(null);}}>닫기</button></div><form onSubmit={e=>{e.preventDefault();search(query);}}><div className="place-search-input"><input ref={searchInput} autoFocus aria-label="장소 검색어" value={query} maxLength={100} placeholder="지역명 또는 장소명" onChange={e=>{cancel();setQuery(e.target.value);}}/><button type="submit" disabled={busy}>{busy?'검색 중…':'검색'}</button></div></form><p className="fine">장소 종류와 주소를 보고 골라주세요. 교량과 버스정류장은 다른 장소예요.</p><ul className="place-results">{items.map(place=><li key={place.id}><button type="button" onClick={()=>{try{onChange(prev=>setWaypointPlace(prev,selected.id,place));cancel();setTarget(null);setMessage('지도에 '+place.name+'을 표시했어요.');}catch(e){setError((e as Error).message);}}}><strong>{place.name}</strong><span className="place-category">{place.category?.split('>').map(part=>part.trim()).filter(Boolean).join(' · ')||'종류 정보 없음'}</span><span>{place.address||'주소 정보 없음'}</span><small>여기가 맞아요</small></button></li>)}</ul>{error&&<p role="alert" className="form-error">{error}</p>}<p className="fine">검색 정보: 카카오맵</p></section>}
 <p role="status" className="fine">{message}</p></section>}</details></div>
 </div></div>;
}
