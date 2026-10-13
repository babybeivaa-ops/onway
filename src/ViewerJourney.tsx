import {RoadTraffic} from './RoadTraffic';
import type {DemoGroup} from './workspace';
import {CenterCallButton,CenterInfo} from './CenterInfo';
import {CenterWeather} from './CenterWeather';
import {PublicJourneyMap} from './PublicMap';
import {activeReports,routeService} from './services';
export function ViewerJourney({group,error}:{group?:DemoGroup;error:string}){
 if(!group)return <main className="app"><h1>공유된 여정을 찾지 못했어요.</h1><p>{error||'공유한 담당자에게 링크를 확인해주세요.'}</p></main>;
 const s=group.state;
 return <main className="app viewer-journey"><header><strong>ON:WAY</strong><CenterCallButton/></header><p className="shared-status">보기 전용 · 기록을 변경하지 않고 여정을 확인해요.</p>{error&&<p role="alert">{error}</p>}<h1>{s.organization.name}</h1><p>{group.travelDate} · {s.trip.status}</p><p>청소년 {s.counts.youth}명 · 인솔자 {s.counts.leaders}명</p><section className="section"><h2>상세 여정</h2><PublicJourneyMap s={s} travelDate={group.travelDate} onChange={()=>{}} onEditReport={()=>{}}/><ol>{routeService.points(s).map(p=>{const r=activeReports(s).find(r=>r.waypointId===p.id);return <li key={p.id}>{p.name} · {r?new Date(r.at).toLocaleString('ko-KR'):'확인 전'}</li>})}</ol></section><CenterWeather/><RoadTraffic state={s} travelDate={group.travelDate}/><CenterInfo/></main>;
}
