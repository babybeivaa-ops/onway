import {durationLabel} from './duration';
import {nextDistancePoint} from './roadRoute';
import type {DemoGroup} from './workspace';
import {useRoadRoute} from './useRoadRoute';
export function ArrivalEstimateCard({group}:{group:DemoGroup}){
 const next=nextDistancePoint(group.state,group.travelDate);
 const destinationNext=next?.kind==='destination';
 const route=useRoadRoute(group.state,group.travelDate,!destinationNext,next?.id);
 return <section className="arrival-card compact-distance" aria-label="센터까지 도로 거리">
  <div className="compact-distance-row"><span className="compact-distance-title">국립청소년우주센터까지</span>{route.data&&<strong className="compact-distance-value"><small>약 </small>{(route.data.distanceMeters/1000).toLocaleString('ko-KR',{maximumFractionDigits:1})}<small> km · 약 {durationLabel(route.data.durationSeconds)}</small></strong>}</div>
  <p className="compact-distance-basis">{destinationNext?'다음은 도착지예요':(next?.name??'출발지')+' 기준 · 다음 확인할 지점'}</p>
  {!route.data&&<p className="fine road-route-message" role="status">{destinationNext?'경유지 확인을 마쳤어요. 센터 도착 여부는 별도로 확인해주세요.':route.error||'도로 거리 계산 중…'}</p>}
  {!destinationNext&&route.error&&!!route.key&&<button className="text-button" onClick={route.retry}>다시 계산</button>}
  <details className="compact-distance-details"><summary>{route.notice?'미등록 경유지 '+route.missing.length+'곳 제외 · 계산 기준':'거리 계산 기준'}</summary>{route.notice&&<p>{route.notice}</p>}<p>다음 확인할 지점부터 센터까지의 거리예요. 현재 위치에서 다음 지점까지의 거리는 포함하지 않아요. 위치가 등록된 남은 경유지를 포함한 카카오 자동차 추천 경로예요. 지점을 확인할 때 갱신하며, 현재 위치를 추적하지 않아요. 소요시간은 조회 시점 기준이며 식사·휴식시간은 제외해요.</p></details>
 </section>;
}
