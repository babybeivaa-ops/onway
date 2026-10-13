import {useEffect,useState} from 'react';
import {Wind,RefreshCw} from 'lucide-react';
type Forecast={provider:'kma';place:string;issuedAt:string;fetchedAt:string;hours:{at:string;temperature:number;rainProbability:number;windSpeed?:number|null;condition:string}[]};
const stamp=(at:string)=>new Date(at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hour12:false});
function WeatherIcon({condition,small=false}:{condition:string;small?:boolean}){
 const sunny=condition==='맑음',partly=condition==='구름 많음',rain=condition==='비'||condition==='소나기'||condition==='비/눈',snow=condition==='눈'||condition==='비/눈';
 return <svg className="weather-condition-icon" width={small?18:30} height={small?18:30} viewBox="0 0 32 32" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
 {(sunny||partly)&&<g stroke="#d79819" strokeWidth="1.7"><circle cx={sunny?16:11} cy={sunny?16:10} r={sunny?7:5} fill="#ffd66b"/>{sunny?<path d="M16 2v3m0 22v3M2 16h3m22 0h3M6 6l2 2m16 16 2 2M6 26l2-2M24 8l2-2"/>:<path d="M11 1v2M2 10h2m1-7 2 2m11-2-2 2"/>}</g>}
 {!sunny&&<path d="M9 23h15a6 6 0 0 0 0-12 8 8 0 0 0-15-1 6.5 6.5 0 0 0 0 13Z" fill={condition==='흐림'?'#d5dfea':'#d1eafa'} stroke={condition==='흐림'?'#76899e':'#548daf'} strokeWidth="1.7"/>}
 {rain&&<path d={snow?'M10 25l-1 4M16 25l-1 4':'M10 25l-1 4M17 25l-1 5M24 25l-1 4'} stroke="#2680d4" strokeWidth="2"/>}
 {snow&&<g stroke="#168baf" strokeWidth="1.5">{!rain&&<path d="M10 25v6m-3-3h6m-5-2 4 4m0-4-4 4"/>}<path d="M24 25v6m-3-3h6m-5-2 4 4m0-4-4 4"/></g>}
 </svg>;
}
function WeatherMascot(){return <svg className="weather-heading-mascot" viewBox="0 0 80 56" aria-hidden="true" fill="none">
 <g stroke="#d89b25" strokeWidth="1.8" strokeLinecap="round"><circle cx="66" cy="12" r="6" fill="#ffd66b"/><path d="M66 2V0m0 24v-2M56 12h-2m24 0h-2M59 5l-2-2m16 16 2 2m-16-2-2 2M73 5l2-2"/></g>
 <path d="M14 47C2 47 0 32 11 28C7 14 25 7 34 19C46 7 60 20 56 31C70 36 62 50 51 50H16Z" fill="var(--cloud-body, #9bd7ff)"/>
 <path d="M13 29h17l-2 10H17Zm22 0h17l-4 10H37Z" fill="#23476c" stroke="#23476c" strokeWidth="2" strokeLinejoin="round"/>
 <path d="M29 31h7m-24-2-4-2m44 2 5-2" stroke="#23476c" strokeWidth="2" strokeLinecap="round"/>
 <path d="m18 31 5 5m16-5 5 5" stroke="#71b8d9" strokeWidth="2" strokeLinecap="round"/>
 <path d="M28 43q5 5 10 0" stroke="#205799" strokeWidth="2" strokeLinecap="round"/>
 <path d="M57 38q9-1 9-11" stroke="var(--cloud-body, #9bd7ff)" strokeWidth="6" strokeLinecap="round"/><path d="M66 29v-7" stroke="var(--cloud-body, #9bd7ff)" strokeWidth="4" strokeLinecap="round"/>
 </svg>}
export function CenterWeather(){
 const [data,setData]=useState<Forecast|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let alive=true;const controller=new AbortController();
  const load=async()=>{setBusy(true);try{
   const r=await fetch('/api/weather/center',{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});const d=await r.json();
   if(!r.ok)throw Error(d.error||'날씨를 불러오지 못했어요.');
   if(d.provider!=='kma'||!Array.isArray(d.hours)||!d.hours.length||!d.hours.every((h:Forecast['hours'][number])=>Number.isFinite(h.temperature)&&Number.isFinite(h.rainProbability)&&Number.isFinite(Date.parse(h.at))))throw Error('날씨 응답을 확인하지 못했어요.');
   if(alive){setData(d);setError('');}
  }catch(e){if(alive){setError(e instanceof Error&&!['TypeError','SyntaxError','TimeoutError'].includes(e.name)?e.message:'날씨 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.')}}finally{if(alive)setBusy(false)}};
  void load();const timer=setInterval(()=>void load(),600000);return()=>{alive=false;controller.abort();clearInterval(timer)};
 },[attempt]);
 const first=data?.hours[0];
 return <section className="section center-weather" aria-label="날씨 예보"><div className="section-heading"><h2><WeatherMascot/>날씨 예보</h2><button className="text-button" type="button" disabled={busy} onClick={()=>setAttempt(a=>a+1)} aria-label="센터 날씨 다시 조회"><RefreshCw size={14}/>{busy?'조회 중':'새로고침'}</button></div><p className="fine">고흥 · 국립청소년우주센터</p><div aria-live="polite">{error&&<p className="weather-error" role="status">{first?<>최신 예보 갱신에 실패했어요. 마지막으로 조회한 예보예요.<br/>마지막 조회 {stamp(data!.fetchedAt)}</>:error}</p>}{first?<><p className="weather-forecast-time">{stamp(first.at)} 예보</p><p className="weather-summary"><WeatherIcon condition={first.condition}/><strong>{first.temperature}°C</strong><span>{first.condition} · 강수확률 <b>{first.rainProbability}%</b></span><span className="weather-wind"><Wind size={15} aria-hidden="true"/>풍속 {first.windSpeed!=null?`${first.windSpeed} m/s`:'정보 없음'}</span></p><p className="fine">현재 관측값이 아니에요.</p><details><summary>시간대별 예보</summary><ul className="weather-hours">{data!.hours.map(h=><li key={h.at}><time dateTime={h.at}>{stamp(h.at)}</time><span className="weather-hour-condition"><WeatherIcon condition={h.condition} small/><span>{h.condition}</span></span><span className="weather-hour-temperature">{h.temperature}°C</span><span className="weather-hour-rain">강수 {h.rainProbability}%</span><span className="weather-hour-wind">바람 {h.windSpeed!=null?`${h.windSpeed} m/s`:'—'}</span></li>)}</ul><p className="fine">발표 {stamp(data!.issuedAt)} · 조회 {stamp(data!.fetchedAt)}</p></details></>:!error&&<p className="fine">센터 날씨를 불러오고 있어요…</p>}</div><p className="weather-source">출처: <a href="https://www.weather.go.kr/" target="_blank" rel="noreferrer">기상청</a> 단기예보 · 센터 인근 격자 기준</p></section>;
}
