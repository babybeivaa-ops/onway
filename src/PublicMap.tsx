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

declare global {interface Window {L:any}}
let library:Promise<any>|null=null;
export function loadLibrary(){
 if(window.L)return Promise.resolve(window.L);
 if(library)return library;
 library=new Promise((resolve,reject)=>{
  if(!document.querySelector('link[data-leaflet]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/vendor/leaflet.css';css.dataset.leaflet='true';document.head.append(css);}
  const script=document.createElement('script');script.src='/vendor/leaflet.js';script.onload=()=>resolve(window.L);script.onerror=()=>{script.remove();library=null;reject(Error('지도 도구를 불러오지 못했어요.'));};document.head.append(script);
 });return library;
}
function ActualMap({s,travelDate,onFail,onFindPlace}:{s:DemoState;travelDate:string;onFail:()=>void;onFindPlace:(id:string,name:string)=>void}){
 const host=useRef<HTMLDivElement>(null);
 const [fullView,setFullView]=useState(true);
 const next=nextDistancePoint(s,travelDate);
 const route=useRoadRoute(s,fullView?undefined:travelDate,fullView||next?.kind!=='destination',fullView?undefined:next?.id);
 const ordered=routeService.points(s);
 const focusPoints=ordered.slice(Math.max(0,ordered.findIndex(p=>p.id===next?.id))).filter(p=>p.place).slice(0,2);
 const connection=route.points;const points=connection.filter(p=>p.place);
 const reports=activeReports(s).filter(r=>localDate(r.at)===travelDate);
 const signature=JSON.stringify([connection.map(p=>[p.id,p.name,p.place,reports.find(r=>r.waypointId===p.id)?.at]),route.data,fullView,next?.id]);
 useEffect(()=>{
  let disposed=false;let map:any;const timeout=setTimeout(()=>{if(!disposed)onFail();},15000);
  loadLibrary().then(L=>{
   if(disposed||!host.current)return;
   map=L.map(host.current,{scrollWheelZoom:false,minZoom:6,maxZoom:19,zoomControl:false}).setView([36.1,127.5],7);
   L.control.zoom({zoomInTitle:'확대',zoomOutTitle:'축소'}).addTo(map);
   L.tileLayer('/api/maps/tiles/{z}/{x}/{y}.png',{minZoom:6,maxZoom:19,attribution:'지도: <a href="https://www.vworld.kr/" target="_blank" rel="noopener">국토교통부 · 브이월드</a>'}).on('tileload',()=>clearTimeout(timeout)).on('tileerror',()=>{if(!disposed)onFail();}).addTo(map);
   const bounds:number[][]=[];
   
   for(const p of points){const place=p.place!;const pos=[place.lat,place.lng];bounds.push(pos);const report=reports.find(r=>r.waypointId===p.id);const index=routeService.points(s).findIndex(point=>point.id===p.id);
    const label=document.createElement('div');label.className='journey-map-label';const title=document.createElement('strong');title.textContent=p.name;label.append(title);
    const status=document.createElement('span');status.textContent=report?(p.kind==='start'||p.kind==='meal'?'출발 ':'통과 ')+new Date(report.at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}):p.kind==='destination'?'도착지':'확인 전';if(!(fullView&&!report&&p.kind!=='destination'))label.append(status);
    const badge=document.createElement('span');badge.className='journey-map-number'+(report?' is-confirmed':'');badge.textContent=report?'✓':'';if(p.kind==='destination'||p.kind==='start'){badge.textContent='';badge.className='journey-center-icon'+(p.kind==='start'?' journey-start-icon':'');const icon=document.createElement('img');icon.src=p.kind==='start'?'/icons/journey-heart-face.svg':'/icons/space-center-color.svg';icon.alt='';icon.width=28;icon.height=28;badge.append(icon);}
    const marker=L.marker(pos,{icon:L.divIcon({html:badge,className:'journey-map-pin',iconSize:[28,28],iconAnchor:[14,14]}),title:p.name,alt:p.name+' 상세 보기',keyboard:true,zIndexOffset:p.kind==='destination'?10000:0}).bindPopup(label,{className:'journey-place-popup',maxWidth:220,autoPan:false,autoClose:true,closeOnClick:true}).addTo(map);
    
   }
   if(route.data){for(const line of route.data.paths){L.polyline(line,{color:'#2166f3',weight:3,opacity:.75,interactive:false}).addTo(map);bounds.push(...line);}}
   const viewBounds=fullView?bounds:focusPoints.map(p=>[p.place!.lat,p.place!.lng]);
   if(viewBounds.length===1)map.setView(viewBounds[0],14);else if(viewBounds.length>1)map.fitBounds(viewBounds,{padding:[45,65],maxZoom:14});
  }).catch(()=>{if(!disposed)onFail();});
  return()=>{disposed=true;clearTimeout(timeout);map?.remove();};
 },[signature]);
 return <><p className="fine map-record-basis">다음 확인 지점과 그다음 지점을 중심으로 보여드려요.</p><div className="map-leg-heading"><div><span>{fullView?'출발지':'다음 확인'}</span><strong className="map-leg-place">{(fullView?connection[0]:next)?.kind==='start'?<img src="/icons/journey-heart-face.svg" alt=""/>:<MapPin size={22} aria-hidden="true"/>}<span>{fullView?connection[0]?.name:next?.name}</span></strong></div><b aria-hidden="true">→</b><div><span>도착지</span><strong className="map-leg-place"><img src="/icons/space-center-color.svg" alt=""/><span>국립청소년우주센터</span></strong></div></div>{route.error&&<p className="fine road-route-message" role="status">{route.error} {route.missing.map(p=><button key={p.id} type="button" className="map-find-place" onClick={()=>onFindPlace(p.id,p.name)}>{p.name} 위치 찾기</button>)}{!!route.key&&<button type="button" className="map-find-place" onClick={route.retry}>경로 다시 계산</button>}</p>}{route.loading&&<p className="fine" role="status">도로 경로를 불러오고 있어요…</p>}<div className="map-view-controls"><button type="button" aria-pressed={fullView} onClick={()=>setFullView(true)}>전체 경로</button><button type="button" aria-pressed={!fullView} onClick={()=>setFullView(false)}>다음 지점 중심</button></div><div className="journey-map-frame"><div ref={host} className="public-map-canvas" aria-label="여정 지점과 추천 도로 경로 지도"/><span className="journey-map-badge">{fullView?'전체 경로':'다음 지점 중심'}</span></div></>;
}
export function PublicJourneyMap({s,travelDate,onChange,onEditReport,browsingOther=false,information}:{information?:import('react').ReactNode;s:DemoState;travelDate:string;onEditReport:(pointId:string,reportId:string)=>void;onChange:Dispatch<SetStateAction<DemoState>>;browsingOther?:boolean}){
 const [showReal,setShowReal]=useState(false);
 const searchPanel=useRef<HTMLElement>(null);const searchInput=useRef<HTMLInputElement>(null);
 const [available,setAvailable]=useState(false);const [checked,setChecked]=useState(false);const [failed,setFailed]=useState(false);const [attempt,setAttempt]=useState(0);
 const points=routeService.points(s);const [target,setTarget]=useState<string|null>(null);const selected=points.find(p=>p.id===target);
 const [query,setQuery]=useState('');const [items,setItems]=useState<PublicPlace[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');const controller=useRef<AbortController|null>(null);
 useEffect(()=>{
  if(location.protocol==='file:'){setChecked(true);return;}
  const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),10000);
  fetch('/api/maps/status',{signal:abort.signal}).then(r=>r.ok?r.json():null).then(d=>{if(!abort.signal.aborted)setAvailable(d?.available===true);}).catch(()=>{setAvailable(false);}).finally(()=>{clearTimeout(timer);setChecked(true);});
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
 const row=(p:typeof points[number])=><div key={p.id} className="location-place-row"><div><strong>{p.name}</strong>{p.place&&<small>{p.place.address||'지도에 표시 중'}</small>}</div><button type="button" aria-label={p.name+(p.place?' 지도 위치 수정':' 지도 위치 찾기')} disabled={!available} onClick={()=>openSearch(p.id,p.name)}>{p.place?'위치 수정':'위치 찾기'}</button></div>;
 return <div className="public-journey"><div className="map-mode-switch" role="tablist" aria-label="여정 보기"><button type="button" role="tab" id="journey-overview-tab" aria-controls="journey-map-panel" aria-selected={!showReal} aria-pressed={!showReal} onClick={()=>{cancel();setTarget(null);setShowReal(false);}}>여정 개요</button><button type="button" role="tab" id="journey-real-tab" aria-controls="journey-map-panel" aria-selected={showReal} aria-pressed={showReal} onClick={()=>{cancel();setTarget(null);setShowReal(true);}}>실제 지도</button></div><div id="journey-map-panel" role="tabpanel" aria-labelledby={showReal?'journey-real-tab':'journey-overview-tab'}>
 {showReal&&browsingOther&&<p className="map-browsing-note" role="status">위에서 다른 지점을 보고 있어요. 지도는 마지막 확인 기록 기준으로 유지돼요.</p>}
 {!showReal?<><JourneyMap state={s} travelDate={travelDate} onEditReport={onEditReport}/></>:available&&!failed?<ActualMap s={s} travelDate={travelDate} onFail={()=>setFailed(true)} onFindPlace={openSearch}/>:checked?<><JourneyMap state={s} travelDate={travelDate} onEditReport={onEditReport}/><p className="fine" role="status">실제 지도를 불러오지 못해 여정 개요를 보여드려요.</p>{location.protocol!=='file:'&&<button type="button" className="text-button" onClick={()=>{setFailed(false);setChecked(false);setAttempt(n=>n+1);}}>지도 다시 불러오기</button>}</>:<p className="fine" role="status">지도를 불러오는 중이에요…</p>}

 <details className="journey-information" open={selected?true:undefined}><summary>지도 및 경로 정보</summary>{information}<p className="fine">작은 표시를 누르면 선택한 장소의 이름과 확인 시각이 보여요.<br/>파란 선은 카카오 자동차 추천 경로예요. 실제 운행 경로와 다를 수 있으며 GPS 위치는 표시하지 않아요.</p>{<section className="location-setup" aria-label="장소 검색 및 위치 변경"><details className="located-places"><summary className="place-search-entry"><span className="place-search-entry-icon"><MapPin size={21} aria-hidden="true"/></span><span className="place-search-entry-copy"><strong>지도 위치 확인·수정</strong><small>여정에 등록한 지점의 지도 위치를 확인하거나 수정해요.</small></span><ChevronDown className="place-search-entry-chevron" size={20} aria-hidden="true"/></summary><p className="fine">아래 여정 지점을 선택한 뒤, 장소 종류와 주소를 확인해 지도에 표시할 위치를 골라주세요.</p>{!available&&<p role="status" className="fine">{checked?'장소 검색 서버에 연결되지 않았어요. 지도 서버 연결 후 다시 열어주세요.':'장소 검색 연결을 확인하고 있어요.'}</p>}{points.map(row)}</details>
 {selected&&<section ref={searchPanel} className="place-search-panel" aria-label={selected.name+' 위치 검색'}><div className="place-search-heading"><strong>{selected.name} 위치 찾기</strong><button type="button" aria-label="장소 검색 닫기" onClick={()=>{cancel();setTarget(null);}}>닫기</button></div><form onSubmit={e=>{e.preventDefault();search(query);}}><div className="place-search-input"><input ref={searchInput} autoFocus aria-label="장소 검색어" value={query} maxLength={100} placeholder="지역명 또는 장소명" onChange={e=>{cancel();setQuery(e.target.value);}}/><button type="submit" disabled={busy}>{busy?'검색 중…':'검색'}</button></div></form><p className="fine">장소 종류와 주소를 보고 골라주세요. 교량과 버스정류장은 다른 장소예요.</p><ul className="place-results">{items.map(place=><li key={place.id}><button type="button" onClick={()=>{try{onChange(prev=>setWaypointPlace(prev,selected.id,place));cancel();setTarget(null);setMessage('지도에 '+place.name+'을 표시했어요.');}catch(e){setError((e as Error).message);}}}><strong>{place.name}</strong><span className="place-category">{place.category?.split('>').map(part=>part.trim()).filter(Boolean).join(' · ')||'종류 정보 없음'}</span><span>{place.address||'주소 정보 없음'}</span><small>여기가 맞아요</small></button></li>)}</ul>{error&&<p role="alert" className="form-error">{error}</p>}<p className="fine">검색 정보: 국토교통부 브이월드</p></section>}
 <p role="status" className="fine">{message}</p></section>}</details>
 </div></div>;
}
