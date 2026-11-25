import {useEffect,useState} from 'react';
function timeout<T>(promise:Promise<T>,label:string,ms=15000):Promise<T>{return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(label+' 시간이 오래 걸리고 있어요. 다시 시도해주세요.')),ms);promise.then(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)});});}
export function AdminPushSettings({token}:{token?:string}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[enabled,setEnabled]=useState(false);
 useEffect(()=>{let alive=true;setEnabled(false);if(!token||!('serviceWorker'in navigator)||!('Notification'in window)||Notification.permission!=='granted')return;void (async()=>{try{const reg=await navigator.serviceWorker.getRegistration('/');const sub=await reg?.pushManager.getSubscription();if(!sub)return;const r=await fetch('/api/shared/push-status',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({endpoint:sub.endpoint}),signal:AbortSignal.timeout(10000)});if(!r.ok)return;const data=await r.json();if(alive){setEnabled(data.registered===true);if(!data.registered)setMessage('이 기기의 알림 연결이 필요해요. 휴대폰 알림 켜기를 눌러주세요.');}}catch{} })();return()=>{alive=false};},[token]);
 async function enable(){
  if(busy)return;if(!token){setMessage('운영 관리자 화면에 로그인한 후 켤 수 있어요.');return;}
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone;
  if(ios&&!standalone){setMessage('Safari 공유 메뉴에서 홈 화면에 추가한 다음, 홈 화면의 ON:WAY 아이콘으로 열어주세요.');return;}
  if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)){setMessage('이 환경에서는 알림을 지원하지 않아요. 아이폰은 iOS 16.4 이상에서 홈 화면의 ON:WAY로 열어주세요.');return;}
  setBusy(true);setEnabled(false);setMessage('아이폰 또는 브라우저의 알림 허용을 확인하고 있어요…');
  try{
   const permission=await timeout(Notification.requestPermission(),'알림 권한 확인',30000);if(permission!=='granted')throw Error('아이폰 설정 → 알림 → ON:WAY에서 알림 허용을 켜주세요. 다른 기기는 브라우저 알림 설정을 확인해주세요.');
   const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
   setMessage('알림 서버에 연결하고 있어요…');
   const keyResponse=await fetch('/api/shared/push-key',{headers,signal:AbortSignal.timeout(15000)});if(!keyResponse.ok)throw Error('알림 설정을 불러오지 못했어요. 다시 로그인 후 시도해주세요.');const {publicKey}=await keyResponse.json();
   setMessage('이 기기의 알림 기능을 준비하고 있어요…');
   await timeout(navigator.serviceWorker.register('/push-sw.js'),'알림 기능 등록');const registration=await timeout(navigator.serviceWorker.ready,'알림 기능 준비');
   const bytes=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const subscription=await timeout(registration.pushManager.getSubscription(),'기기 확인')??await timeout(registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes}),'알림 구독',30000);
   setMessage('센터 알림을 받을 기기로 등록하고 있어요…');
   const result=await fetch('/api/shared/push-subscription',{method:'POST',headers,body:JSON.stringify({subscription:subscription.toJSON()}),signal:AbortSignal.timeout(15000)});if(!result.ok)throw Error('알림 기기 등록에 실패했어요. 다시 시도해주세요.');
   setEnabled(true);setMessage('이 기기에서 인솔교사의 새 채팅·이동·인원 확인 알림을 받아요.');
  }catch(e){setMessage((e as Error).name==='TimeoutError'?'서버 응답이 늦어지고 있어요. 다시 눌러주세요.':(e as Error).message)}finally{setBusy(false)}
 }
 return <div className="admin-push-settings"><button type="button" className="text-button" disabled={busy} onClick={()=>void enable()}>{busy?'알림 설정 중…':enabled?'휴대폰 알림 연결됨':'휴대폰 알림 켜기'}</button>{message&&<small role="status">{message}</small>}</div>;
}
