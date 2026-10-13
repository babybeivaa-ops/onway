import type {DemoState} from './types';
import {useRoadRoute} from './useRoadRoute';
export function BaselineTimes({state:s,readOnly}:{state:DemoState;readOnly:boolean;onSave:(values:Record<string,string>)=>void}){
 const route=useRoadRoute(s,undefined,!readOnly);
 return <section className="baseline-times"><h3>출발지에서 센터까지 전체 도로 거리</h3><p className="fine">출발지와 경유지의 지도 위치를 지정하면 카카오 길찾기로 자동 계산해요. 위치나 방문 순서를 바꾸면 다시 계산해요.</p>{readOnly?<p className="fine">지난 일정은 경로를 새로 계산하지 않아요.{s.totalRoadDistanceKm!==undefined?' 기존 수동 등록 거리: '+s.totalRoadDistanceKm+' km':''}</p>:<>{route.notice&&<p className="fine road-route-message">{route.notice}</p>}{route.data?<strong className="road-distance-number">약 {(route.data.distanceMeters/1000).toLocaleString('ko-KR',{maximumFractionDigits:1})} km</strong>:<p className="fine road-route-message" role="status">{route.error||'도로 거리를 계산하고 있어요…'}</p>}{!!route.key&&<button type="button" className="secondary" disabled={route.loading} onClick={route.retry}>{route.loading?'계산 중…':'도로 거리 다시 계산'}</button>}<p className="fine">위치가 등록된 경유지를 순서대로 거치는 자동차 추천 경로 기준이에요. 실제 운행 경로에 따라 달라질 수 있어요.</p></>}</section>;
}
