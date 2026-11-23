import {useEffect,useRef,useState} from 'react';
import {loadKakaoMap} from './kakaoMap';
import type {DemoGroup} from './workspace';

type Position=NonNullable<DemoGroup['state']['sharedPosition']>;

function PositionMap({position}:{position:Position}){
 const host=useRef<HTMLDivElement>(null);
 const [address,setAddress]=useState('주소 확인 중…');
 const [mapError,setMapError]=useState(false);
 useEffect(()=>{
  let disposed=false;
  let cleanup=()=>{};
  setAddress('주소 확인 중…');setMapError(false);
  const timeout=setTimeout(()=>{if(!disposed)setAddress('주소를 확인하지 못했어요. 지도에서 위치를 확인해주세요.');},12000);
  loadKakaoMap().then(K=>{
   if(disposed||!host.current)return;
   const center=new K.LatLng(position.lat,position.lng);
   const map=new K.Map(host.current,{center,level:4,scrollwheel:false});
   const marker=new K.Marker({map,position:center,title:'인솔교사 전송 위치'});
   map.addControl(new K.ZoomControl(),K.ControlPosition.RIGHT);
   const resize=new ResizeObserver(()=>{map.relayout();map.setCenter(center)});
   resize.observe(host.current);
   cleanup=()=>{resize.disconnect();marker.setMap(null);host.current?.replaceChildren()};
   if(!K.services?.Geocoder)throw Error('주소 서비스 없음');
   new K.services.Geocoder().coord2Address(position.lng,position.lat,(results:any[],status:string)=>{
    if(disposed)return;
    clearTimeout(timeout);
    const result=status===K.services.Status.OK?results[0]:null;
    setAddress(result?.road_address?.address_name||result?.address?.address_name||'주소를 확인하지 못했어요. 지도에서 위치를 확인해주세요.');
   });
  }).catch(()=>{if(!disposed){clearTimeout(timeout);setAddress('주소를 확인하지 못했어요. 지도 링크에서 확인해주세요.');setMapError(true)}});
  return()=>{disposed=true;clearTimeout(timeout);cleanup()};
 },[position.lat,position.lng]);
 return <div className="received-position-layout">
  <div className="received-position-copy">
   <strong className="received-position-address" aria-live="polite">{address}</strong>
   <span>최근 전송 <time dateTime={position.sentAt}>{new Date(position.sentAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</time></span>
   <span className="received-position-detail">위치 측정 {new Date(position.measuredAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} · 오차 약 {Math.round(position.accuracy)}m</span>
   <small>마지막으로 전송한 위치입니다. 실시간 이동 위치가 아니에요.</small>
   <a className="received-position-external" href={`https://map.kakao.com/link/map/${encodeURIComponent('인솔교사 전송 위치')},${position.lat},${position.lng}`} target="_blank" rel="noreferrer">카카오맵에서 보기</a>
  </div>
  <div className="received-position-map-area">
   <div ref={host} className="received-position-map-canvas" role="region" aria-label="인솔교사가 마지막으로 전송한 위치 지도"/>
   {mapError&&<p className="received-position-map-error">지도를 불러오지 못했어요.<br/>지도 링크를 이용해주세요.</p>}
  </div>
 </div>;
}

export function ReceivedPosition({position,archived=false}:{position:DemoGroup['state']['sharedPosition'];archived?:boolean}){
 return <section className="received-position" aria-label="인솔교사 전송 위치">
  <div className="received-position-heading"><strong>인솔교사 전송 위치</strong><span className="received-position-status">{position?'수신됨':'수신 대기'}</span></div>
  {position?<PositionMap key={`${position.lat},${position.lng}`} position={position}/>:<p className="received-position-empty">{archived?'이 방문에서 전송받은 위치가 없어요.':'인솔교사가 ‘센터에 위치 전송’을 누르면 여기에 표시돼요.'}</p>}
 </section>;
}
