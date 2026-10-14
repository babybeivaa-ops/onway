import type {ReactNode} from 'react';
import {durationLabel} from './duration';
import type {DemoState} from './types';
import {useRoadRoute} from './useRoadRoute';
export function CheckpointDistance({state,pointId,savedRecord,onLocate}:{state:DemoState;pointId:string;savedRecord?:ReactNode;onLocate:()=>void}){
 const route=useRoadRoute(state,undefined,true,pointId);
 return <div className="checkpoint-distance"><div className={"checkpoint-distance-main"+(!route.data&&!route.loading&&!route.key?" checkpoint-location-missing":"")}>{!route.data&&!route.loading&&!route.key?<button type="button" className="checkpoint-location-button" onClick={onLocate} aria-label="위치 등록 필요 · 장소 검색 열기">위치 등록 필요</button>:<span className="checkpoint-remaining" role="status" aria-label={route.data?route.points[0]?.name+'에서 국립청소년우주센터까지 약 '+(route.data.distanceMeters/1000).toFixed(1)+'킬로미터, 예상 주행 시간 '+durationLabel(route.data.durationSeconds):undefined}>{route.data?<><span>센터까지 약 {(route.data.distanceMeters/1000).toLocaleString('ko-KR',{maximumFractionDigits:1})} km</span><span>· 약 {durationLabel(route.data.durationSeconds)}</span></>:route.loading?'거리 계산 중…':route.key?'거리 조회 실패':'위치 등록 필요'}</span>}{route.error&&route.key&&<button type="button" className="text-button" onClick={route.retry}>다시 계산</button>}</div><div className="checkpoint-meta-row"><details className="checkpoint-distance-meta"><summary><span>계산 기준</span></summary><p>{route.error||'이 장소부터 국립청소년우주센터까지, 위치가 등록된 이후 경유지를 포함한 카카오 추천 도로 거리예요. 조회 시점의 자동차 경로 기준이며 식사·휴식시간은 제외해요. 현재 GPS 위치 기준은 아니에요.'}</p></details>{savedRecord}</div></div>;
}
