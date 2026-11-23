import {useState} from 'react';
export function AdminPushSettings({token}:{token?:string}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[enabled,setEnabled]=useState(false);
 async function enable(){
  if(!token){setMessage('운영 관리자 화면에 로그인한 후 켤 수 있어요.');return;}
  if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)){setMessage('아이폰은 Safari에서 홈 화면에 추가한 뒤, 홈 화면의 ON:WAY를 열어주세요.');return;}
  setBusy(true);setMessage('');
  try{
   const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('휴대폰 또는 브라우저 설정에서 알림을 허용해주세요.');
   const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
   const keyResponse=await fetch('/api/shared/push-key',{headers});if(!keyResponse.ok)throw Error('알림 설정을 불러오지 못했어요. 다시 로그인 후 시도해주세요.');const {publicKey}=await keyResponse.json();
   await navigator.serviceWorker.register('/push-sw.js');const registration=await navigator.serviceWorker.ready;
   const bytes=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const subscription=await registration.pushManager.getSubscription()??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
   const result=await fetch('/api/shared/push-subscription',{method:'POST',headers,body:JSON.stringify({subscription:subscription.toJSON()})});if(!result.ok)throw Error('알림 기기 등록에 실패했어요. 다시 시도해주세요.');
   setEnabled(true);setMessage('이 기기에서 새 채팅·이동·인원 확인 알림을 받아요.');
  }catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 }
 return <div className="admin-push-settings"><button type="button" className="text-button" disabled={busy} onClick={enable}>{busy?'알림 설정 중…':enabled?'휴대폰 알림 연결됨':'휴대폰 알림 켜기'}</button>{message&&<small role="status">{message}</small>}</div>;
}
