import {useEffect,useState} from 'react';
import {TriangleAlert,RefreshCw,Wrench,CloudRain,CloudFog,Snowflake,Wind,Construction} from 'lucide-react';
import {trafficIcon,trafficLabel} from './trafficIcon';
const trafficIcons={breakdown:[Wrench,'차량 고장'],accident:[TriangleAlert,'사고'],fog:[CloudFog,'안개'],rain:[CloudRain,'빗길'],snow:[Snowflake,'눈길·결빙'],wind:[Wind,'강풍'],construction:[Construction,'공사'],warning:[TriangleAlert,'도로 주의']} as const;
function TrafficIcon({kind,message}:{kind:string;message:string}){const category=trafficIcon(kind,message);const [Icon]=trafficIcons[category];const label=trafficLabel(kind,message);return <span className={"traffic-event-icon is-"+category} role="img" aria-label={label} title={label}><Icon size={18} aria-hidden="true"/></span>}
import type {DemoState} from './types';
import {useRoadRoute} from './useRoadRoute';
import {nearRoute} from './trafficGeometry';
type Event={lat:number;lng:number;kind:string;road:string;message:string;direction:string;blocked:string;start:string;end:string};
export function RoadTraffic({state,travelDate}:{state:DemoState;travelDate:string}){
 const route=useRoadRoute(state,travelDate);const paths=route.data?.paths;
 const [result,setResult]=useState<{events:Event[];fetchedAt:string}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{setResult(null);setError('');if(!paths?.length)return;let alive=true;let quotaPaused=false;const c=new AbortController();
 const load=async()=>{setBusy(true);try{let minX=132,maxX=124,minY=39.5,maxY=33;for(const line of paths)for(const [lat,lng] of line){minX=Math.min(minX,lng);maxX=Math.max(maxX,lng);minY=Math.min(minY,lat);maxY=Math.max(maxY,lat)}const q=new URLSearchParams({minX:String(Math.max(124,minX-.02)),maxX:String(Math.min(132,maxX+.02)),minY:String(Math.max(33,minY-.02)),maxY:String(Math.min(39.5,maxY+.02))});const r=await fetch('/api/traffic/events?'+q,{signal:AbortSignal.any([c.signal,AbortSignal.timeout(20000)])});const d=await r.json();if(!r.ok){if(d.code==='ITS_MONTHLY_QUOTA'){quotaPaused=true;if(alive){setResult(null);setError('도로 상황은 현재 조회할 수 없어요. 지도와 길찾기는 계속 이용할 수 있어요.')}return;}if(alive){setResult(null);setError((d.error||'도로 조회 실패')+(typeof d.code==='string'&&/^ITS_[A-Z_]+$/.test(d.code)?' ('+d.code+')':''))}return;}if(d.provider!=='its'||!Array.isArray(d.events))throw Error('도로 응답을 확인하지 못했어요.');const now=Date.now();const events=d.events.filter((e:Event)=>{const end=/^\d{14}$/.test(e.end)?Date.parse(e.end.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,'$1-$2-$3T$4:$5:$6+09:00')):NaN;return (!Number.isFinite(end)||end>now)&&nearRoute(e.lat,e.lng,paths)});if(alive){setResult({events,fetchedAt:d.fetchedAt});setError('')}}catch{if(alive){setResult(null);setError('도로 정보를 조회하지 못했어요. 사고가 없다는 뜻은 아니에요.')}}finally{if(alive)setBusy(false)}};
 void load();const timer=setInterval(()=>{if(!quotaPaused&&document.visibilityState==='visible')void load()},600000);return()=>{alive=false;c.abort();clearInterval(timer)};
 },[paths,attempt]);
 return <section className="section road-traffic"><div className="section-heading"><h2><BusCloudIcon/>도로 안내</h2><button className="text-button" disabled={busy||route.loading} onClick={()=>route.error?route.retry():setAttempt(v=>v+1)}><RefreshCw size={14}/>새로고침</button></div><p className="fine">추천 경로 1km 이내 · 반대 방향 도로가 포함될 수 있어요.</p><div aria-live="polite">{route.error||error?<p className="weather-error">{route.error||error}</p>:!result?<p className="fine">도로 정보를 조회하고 있어요…</p>:<>{result.events.length?result.events.map((e,i)=><details className="traffic-event" key={i}><summary><TrafficIcon kind={e.kind} message={e.message}/><span>{e.road} · {trafficLabel(e.kind,e.message)}</span></summary><p>{e.message}</p>{e.blocked&&<p className="fine">{e.blocked}</p>}{e.direction&&<p className="fine">제공 방향: {e.direction}</p>}</details>):<p className="fine">현재 조회된 경로 주변 돌발정보가 없어요.</p>}<p className="fine">조회 {new Date(result.fetchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</p></>}</div><p className="weather-source">출처: <a href="https://www.its.go.kr/" target="_blank" rel="noreferrer">ITS 국가교통정보센터</a> · 현재 GPS 위치 기준이 아니에요.</p></section>;
}

function BusCloudIcon(){return <svg className="road-bus-mascot" viewBox="0 0 80 56" aria-hidden="true" fill="none">
 <rect x="5" y="9" width="69" height="37" rx="9" fill="#fbd575" stroke="#d4a847" strokeWidth="1.5"/>
 <rect x="12" y="14" width="39" height="22" rx="5" fill="#eaf7ff"/>
 <path d="M57 14h7q5 0 5 5v12H57Z" fill="#cdeaf8"/><path d="M57 35v8" stroke="#d4a847" strokeWidth="2"/>
 <path d="M21 33C12 33 12 24 19 22C17 14 27 11 32 17C39 10 49 17 46 23C54 26 50 34 43 34Z" fill="var(--cloud-body, #9bd7ff)"/>
 <circle cx="27" cy="24" r="1.8" fill="#285a80"/><circle cx="39" cy="24" r="1.8" fill="#285a80"/>
 <path d="M30 29q3 3 6 0" stroke="#285a80" strokeWidth="1.7" strokeLinecap="round"/>
 <ellipse cx="22" cy="28" rx="3" ry="1.5" fill="var(--cloud-cheek, #7ec5fb)"/><ellipse cx="44" cy="28" rx="3" ry="1.5" fill="var(--cloud-cheek, #7ec5fb)"/>
 <path d="M12 39h34" stroke="#edb649" strokeWidth="2" strokeLinecap="round"/>
 <rect x="68" y="36" width="5" height="4" rx="1" fill="#fff9de"/>
 <circle cx="21" cy="46" r="6" fill="#496680"/><circle cx="61" cy="46" r="6" fill="#496680"/><circle cx="21" cy="46" r="2.5" fill="#cfe2ee"/><circle cx="61" cy="46" r="2.5" fill="#cfe2ee"/>
 </svg>}
