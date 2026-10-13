declare global {interface Window {kakao:any}}
let library:Promise<any>|null=null;
export function loadKakaoMap():Promise<any>{
 if(window.kakao?.maps?.Map)return Promise.resolve(window.kakao.maps);
 if(library)return library;
 library=(async()=>{
  const r=await fetch('/api/maps/config',{signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('지도 설정을 불러오지 못했어요.');
  const {javascriptKey}=await r.json();if(!javascriptKey)throw Error('카카오 지도 JavaScript 키 설정이 필요해요.');
  return new Promise((resolve,reject)=>{
   const script=document.createElement('script');const timeout=setTimeout(()=>fail(),15000);
   const fail=()=>{clearTimeout(timeout);script.remove();reject(Error('카카오 지도를 불러오지 못했어요. 키와 웹 도메인 등록을 확인해주세요.'));};
   script.src='https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey='+encodeURIComponent(javascriptKey);
   script.onload=()=>{if(!window.kakao?.maps?.load){fail();return;}window.kakao.maps.load(()=>{clearTimeout(timeout);resolve(window.kakao.maps);});};script.onerror=fail;document.head.append(script);
  });
 })().catch(e=>{library=null;throw e;});return library;
}
